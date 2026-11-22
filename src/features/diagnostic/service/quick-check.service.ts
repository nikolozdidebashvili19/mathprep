import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import { loadDiagnosticItemsService } from '@/features/diagnostic/service/diagnostic-items.service';
import { toQuestionView } from '@/features/diagnostic/service/diagnostic.service';
import { nextAbility, pickQuestion, planTopicOrder, PlannerQuestion } from '@/features/diagnostic/service/quick-check-planner';
import { relatedSkills, toSkillResults } from '@/features/diagnostic/service/quick-check-result';
import { computeSkillEvidence } from '@/features/diagnostic/service/skill-evidence';
import { QuickCheckResult, QuickCheckSummary, QuickCheckView } from '@/features/diagnostic/types/diagnostic.types';
import { FinishDiagnosticType, QuickAnswerType } from '@/features/diagnostic/validations/diagnostic.validation';
import { examRepository } from '@/features/exam/repository/exam.repository';
import {
  analyzeWorkPhotoService,
  findWorkPhotoService,
  listSessionWorkPhotosService,
  saveWorkPhotoService,
} from '@/features/handwriting/service/handwriting.service';
import { UploadWorkPhotoType } from '@/features/handwriting/validations/handwriting.validation';
import { rebuildMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { QUICK_CHECK_LENGTH, QUICK_CHECK_START_ABILITY } from '@/shared/const/domain.const';
import { ServiceResult } from '@/shared/types/common';
import { hasBrokenLetters } from '@/shared/utils/text-quality';

type Planning = { skills: SkillDocument[]; pool: QuestionDocument[]; topics: string[] };

/** Skills + the question pool. Exams reserved for the full mock and questions with broken text are left out. */
async function loadPlanning(): Promise<Planning> {
  const [skills, reserved] = await Promise.all([skillRepository.findAll(), examRepository.findUsableForDiagnostic()]);
  const all = await questionRepository.findQuickCheckPool(reserved.map((e) => e._id.toString()));
  const pool = all.filter((q) => ![q.text, ...q.options.map((o) => o.text)].some(hasBrokenLetters));
  return { skills, pool, topics: planTopicOrder(skills, QUICK_CHECK_LENGTH) };
}

const toPlannerQuestion = (q: QuestionDocument): PlannerQuestion => ({ id: q._id.toString(), primarySkill: q.primarySkill ?? '', difficulty: q.difficulty });

function pickNext(planning: Planning, position: number, ability: number, used: Set<string>): QuestionDocument | null {
  const choice = pickQuestion(planning.pool.map(toPlannerQuestion), planning.skills, planning.topics[position], ability, used);
  return choice ? planning.pool.find((q) => q._id.toString() === choice.id) ?? null : null;
}

/** The current question is the last one appended and not yet answered. */
const currentQuestionId = (session: DiagnosticSessionDocument): string | null =>
  session.answers.length < session.questionIds.length ? session.questionIds[session.questionIds.length - 1].toString() : null;

async function toView(session: DiagnosticSessionDocument): Promise<QuickCheckView> {
  const currentId = currentQuestionId(session);
  const [question] = currentId ? await questionRepository.findByIds([currentId]) : [];
  return {
    id: session._id.toString(),
    total: QUICK_CHECK_LENGTH,
    answeredCount: session.answers.length,
    current: question ? toQuestionView(question) : null,
  };
}

async function loadOwnOpenQuick(userId: string, sessionId: string): Promise<ServiceResult<DiagnosticSessionDocument>> {
  const session = await diagnosticSessionRepository.findById(sessionId);
  if (!session || session.userId.toString() !== userId || session.kind !== 'quick') return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (session.status !== 'in_progress') return { data: { error: 'SESSION_COMPLETED' }, status: 409 };
  return { data: session, status: 200 };
}

/** Resumes the student's open quick check or starts one with the first planned question. */
export async function startQuickCheckService(userId: string): Promise<ServiceResult<QuickCheckView>> {
  const open = await diagnosticSessionRepository.findQuickInProgress(userId);
  if (open) return { data: await toView(open), status: 200 };

  const planning = await loadPlanning();
  const first = pickNext(planning, 0, QUICK_CHECK_START_ABILITY, new Set());
  if (!first) return { data: { error: 'NO_QUESTIONS' }, status: 404 };
  const session = await diagnosticSessionRepository.createQuick(userId, first._id.toString(), QUICK_CHECK_START_ABILITY);
  return { data: await toView(session), status: 200 };
}

/** Stores the photo of the working for the current question (a retake replaces it). */
export async function uploadQuickPhotoService(
  userId: string,
  input: UploadWorkPhotoType,
  file: { mimeType: string; data: Buffer }
): Promise<ServiceResult<{ photoId: string }>> {
  const loaded = await loadOwnOpenQuick(userId, input.sessionId);
  if ('error' in loaded.data) return { data: loaded.data, status: loaded.status };
  if (currentQuestionId(loaded.data) !== input.questionId) return { data: { error: 'NOT_CURRENT_QUESTION' }, status: 409 };
  return saveWorkPhotoService({ userId, ...input, ...file });
}

/**
 * Records the answer (final: the next question depends on it), moves the ability estimate and appends the next
 * question. A real answer needs a photo of the working first; "I don't know" ('') does not.
 */
export async function submitQuickAnswerService(
  userId: string,
  input: QuickAnswerType
): Promise<ServiceResult<{ view: QuickCheckView; photoId: string | null }>> {
  const loaded = await loadOwnOpenQuick(userId, input.sessionId);
  if ('error' in loaded.data) return { data: loaded.data, status: loaded.status };
  const session = loaded.data;
  if (currentQuestionId(session) !== input.questionId) return { data: { error: 'NOT_CURRENT_QUESTION' }, status: 409 };

  const photo = await findWorkPhotoService(input.sessionId, input.questionId);
  if (input.answer !== '' && !photo) return { data: { error: 'PHOTO_REQUIRED' }, status: 400 };

  const [question] = await questionRepository.findByIds([input.questionId]);
  if (!question) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const ability = nextAbility(session.ability ?? QUICK_CHECK_START_ABILITY, gradeAnswer(question, input.answer).correct);

  const position = session.answers.length + 1;
  const used = new Set(session.questionIds.map((id) => id.toString()));
  const next = position < QUICK_CHECK_LENGTH ? pickNext(await loadPlanning(), position, ability, used) : null;

  const matched = await diagnosticSessionRepository.recordQuickAnswer(input.sessionId, {
    questionId: input.questionId,
    answer: input.answer,
    ability,
    nextQuestionId: next ? next._id.toString() : null,
  });
  if (matched === 0) return { data: { error: 'ALREADY_ANSWERED' }, status: 409 };

  return {
    data: {
      view: { id: input.sessionId, total: QUICK_CHECK_LENGTH, answeredCount: position, current: next ? toQuestionView(next) : null },
      photoId: input.answer !== '' && photo ? photo.id : null,
    },
    status: 200,
  };
}

/** Runs the vision analysis for one answered question's photo. Called after the response (route `after`) and at finish. */
export async function analyzeQuickPhotoService(sessionId: string, questionId: string): Promise<void> {
  const [session, photo, [question], skills] = await Promise.all([
    diagnosticSessionRepository.findById(sessionId),
    findWorkPhotoService(sessionId, questionId),
    questionRepository.findByIds([questionId]),
    skillRepository.findAll(),
  ]);
  const answer = session?.answers.find((a) => a.questionId.toString() === questionId)?.answer;
  if (!photo || !question || !answer) return;

  const skillByCode = new Map(skills.map((s) => [s.code, s]));
  await analyzeWorkPhotoService(photo.id, {
    question,
    studentAnswer: answer,
    correct: gradeAnswer(question, answer).correct,
    skills: relatedSkills(question.skills.map((s) => s.skillCode), skillByCode).map((s) => ({ code: s.code, nameKa: s.nameKa, nameEn: s.nameEn })),
  });
}

/** Waits for outstanding photo analyses, grades, works out weak/strong skills and closes the session. */
export async function finishQuickCheckService(userId: string, input: FinishDiagnosticType): Promise<ServiceResult<QuickCheckResult>> {
  const loaded = await loadOwnOpenQuick(userId, input.sessionId);
  if ('error' in loaded.data) return { data: loaded.data, status: loaded.status };
  const session = loaded.data;
  if (session.answers.length === 0 || session.answers.length < session.questionIds.length) {
    return { data: { error: 'NOT_FINISHED' }, status: 409 };
  }

  const outstanding = (await listSessionWorkPhotosService(input.sessionId)).filter((p) => p.analysis.status !== 'done');
  await Promise.all(outstanding.map((p) => analyzeQuickPhotoService(input.sessionId, p.questionId)));

  const [graded, photos, skills] = await Promise.all([
    loadDiagnosticItemsService(session),
    listSessionWorkPhotosService(input.sessionId),
    skillRepository.findAll(),
  ]);
  const skillByCode = new Map(skills.map((s) => [s.code, s]));
  const evidence = computeSkillEvidence(graded, new Map(skills.map((s) => [s.code, s.prerequisites])));

  const score = graded.reduce((sum, g) => sum + g.points, 0);
  const maxScore = graded.reduce((sum, g) => sum + g.question.maxPoints, 0);
  const correctCount = graded.filter((g) => g.correct).length;
  const closed = await diagnosticSessionRepository.complete(input.sessionId, { score, maxScore, correctCount, skillSummary: evidence });
  if (closed === 0) return { data: { error: 'SESSION_COMPLETED' }, status: 409 };

  await attemptRepository.insertMany(
    graded.map((g) => ({
      userId,
      questionId: g.question._id.toString(),
      context: 'diagnostic' as const,
      contextId: input.sessionId,
      answer: g.answer,
      points: g.points,
      maxPoints: g.question.maxPoints,
      gradingStatus: 'graded' as const,
    }))
  );
  await rebuildMasteryService(userId);

  const startedAt = session.createdAt ? new Date(session.createdAt).getTime() : Date.now();
  return {
    data: {
      sessionId: input.sessionId,
      score,
      maxScore,
      correctCount,
      total: graded.length,
      durationMinutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
      ...toSkillResults(evidence, skillByCode),
      photosAnalysed: photos.filter((p) => p.analysis.status === 'done').length,
      photosTotal: photos.length,
    },
    status: 200,
  };
}

/** For the diagnostic page card: open quick check progress and the last result. */
export async function getQuickCheckSummaryService(userId: string): Promise<QuickCheckSummary> {
  const [open, last] = await Promise.all([
    diagnosticSessionRepository.findQuickInProgress(userId),
    diagnosticSessionRepository.findLatestCompletedQuick(userId),
  ]);
  return {
    inProgress: open ? { answered: open.answers.length, total: QUICK_CHECK_LENGTH } : null,
    lastResult: last ? { correctCount: last.correctCount ?? 0, total: last.questionIds.length } : null,
  };
}

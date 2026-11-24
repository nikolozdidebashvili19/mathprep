import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import { toQuestionView } from '@/features/diagnostic/service/diagnostic.service';
import { toSkillResults } from '@/features/diagnostic/service/quick-check-result';
import {
  DiagnosticHistoryItem,
  DiagnosticReview,
  KnowledgeMap,
  KnowledgeMapTopic,
  ReviewAnalysis,
  SkillLevel,
} from '@/features/diagnostic/types/diagnostic.types';
import { examRepository } from '@/features/exam/repository/exam.repository';
import { listSessionWorkPhotosService } from '@/features/handwriting/service/handwriting.service';
import { WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { STRONG_SCORE_FROM, WEAK_SCORE_BELOW } from '@/shared/const/domain.const';
import { WORK_PHOTO_ROUTE } from '@/shared/const/routes.const';
import { TOPICS } from '@/shared/const/topics.const';
import { ServiceResult } from '@/shared/types/common';

type SkillScore = { skillCode: string; score: number };

export function levelFor(score: number | undefined): SkillLevel {
  if (score === undefined) return 'untested';
  if (score < WEAK_SCORE_BELOW) return 'weak';
  return score >= STRONG_SCORE_FROM ? 'strong' : 'mixed';
}

/** Every skill grouped by topic (TOPICS order), with its level from the quick-check evidence. Pure. */
export function buildKnowledgeMapTopics(skills: Pick<SkillDocument, 'code' | 'topic' | 'nameKa'>[], summary: SkillScore[]): KnowledgeMapTopic[] {
  const scoreBy = new Map(summary.map((s) => [s.skillCode, s.score]));
  return TOPICS.map((topic) => ({
    code: topic.code,
    nameKa: topic.nameKa,
    skills: skills
      .filter((s) => s.topic === topic.code)
      .map((s) => ({ code: s.code, nameKa: s.nameKa, level: levelFor(scoreBy.get(s.code)) })),
  })).filter((t) => t.skills.length > 0);
}

async function toHistoryItems(sessions: DiagnosticSessionDocument[]): Promise<DiagnosticHistoryItem[]> {
  const examIds = [...new Set(sessions.map((s) => s.examId?.toString()).filter((id): id is string => !!id))];
  const exams = await Promise.all(examIds.map((id) => examRepository.findById(id)));
  const codeById = new Map(exams.filter((e) => e !== null).map((e) => [e._id.toString(), e.code]));
  return sessions.map((s) => ({
    id: s._id.toString(),
    kind: s.kind === 'quick' ? 'quick' : 'full',
    examCode: s.examId ? codeById.get(s.examId.toString()) ?? null : null,
    completedAt: (s.completedAt ?? s.updatedAt ?? new Date()).toISOString(),
    correctCount: s.correctCount ?? 0,
    total: s.questionIds.length,
    score: s.score ?? 0,
    maxScore: s.maxScore ?? 0,
  }));
}

/** Knowledge map from the latest finished quick check (null if there is none) and the list of finished diagnostics. */
export async function getReportService(userId: string): Promise<{ map: KnowledgeMap | null; history: DiagnosticHistoryItem[] }> {
  const sessions = await diagnosticSessionRepository.findCompletedByUser(userId);
  const latestQuick = sessions.find((s) => s.kind === 'quick');
  const history = await toHistoryItems(sessions);
  if (!latestQuick) return { map: null, history };

  const skills = await skillRepository.findAll();
  return {
    map: {
      sessionId: latestQuick._id.toString(),
      completedAt: (latestQuick.completedAt ?? new Date()).toISOString(),
      topics: buildKnowledgeMapTopics(skills, latestQuick.skillSummary ?? []),
    },
    history,
  };
}

/** Weak skills of the latest quick check, for the dashboard card. */
export async function getLatestWeakSkillsService(userId: string): Promise<{ sessionId: string; weak: { code: string; nameKa: string }[] } | null> {
  const sessions = await diagnosticSessionRepository.findCompletedByUser(userId);
  const latestQuick = sessions.find((s) => s.kind === 'quick');
  if (!latestQuick) return null;
  const skills = await skillRepository.findAll();
  const { weak } = toSkillResults(latestQuick.skillSummary ?? [], new Map(skills.map((s) => [s.code, s])));
  return { sessionId: latestQuick._id.toString(), weak: weak.slice(0, 3).map(({ code, nameKa }) => ({ code, nameKa })) };
}

function toReviewAnalysis(photo: WorkPhotoSummary | undefined, skillName: (code: string) => string): ReviewAnalysis | null {
  if (!photo) return null;
  const a = photo.analysis;
  return {
    status: a.status,
    readable: a.readable ?? null,
    approach: a.approach ?? null,
    feedback: a.feedback ?? null,
    mistakes: a.mistakes.map((m) => ({ type: m.type, skillName: skillName(m.skillCode), description: m.description })),
  };
}

/** A finished diagnostic question by question, with the key, the student's photo and what the analysis found. */
export async function getDiagnosticReviewService(userId: string, sessionId: string): Promise<ServiceResult<DiagnosticReview>> {
  const session = await diagnosticSessionRepository.findById(sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (session.status !== 'completed') return { data: { error: 'NOT_FINISHED' }, status: 409 };

  const ids = session.questionIds.map((id) => id.toString());
  const [questions, photos, skills, [header]] = await Promise.all([
    questionRepository.findByIds(ids),
    listSessionWorkPhotosService(sessionId),
    skillRepository.findAll(),
    toHistoryItems([session]),
  ]);
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  const photoBy = new Map(photos.map((p) => [p.questionId, p]));
  const answers = new Map(session.answers.map((a) => [a.questionId.toString(), a.answer ?? '']));
  const skillByCode = new Map(skills.map((s) => [s.code, s]));
  const skillName = (code: string) => skillByCode.get(code)?.nameKa ?? code;

  const items = ids.flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    const given = answers.get(id) ?? '';
    const photo = photoBy.get(id);
    return [
      {
        question: toQuestionView(q),
        correctAnswer: q.answer ?? '',
        givenAnswer: given,
        correct: gradeAnswer(q, given).correct,
        photoUrl: photo ? `${WORK_PHOTO_ROUTE}/${photo.id}` : null,
        analysis: toReviewAnalysis(photo, skillName),
        solution: (q.solutionSteps ?? []).length > 0 ? { steps: [...q.solutionSteps], commonMistake: q.commonMistakes?.[0] ?? null } : null,
      },
    ];
  });

  return { data: { ...header, ...toSkillResults(session.skillSummary ?? [], skillByCode), items }, status: 200 };
}

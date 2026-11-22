import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import {
  DiagnosticExamSummary,
  DiagnosticQuestion,
  DiagnosticResult,
  DiagnosticSessionView,
} from '@/features/diagnostic/types/diagnostic.types';
import { FinishDiagnosticType, SaveAnswerType } from '@/features/diagnostic/validations/diagnostic.validation';
import { examRepository } from '@/features/exam/repository/exam.repository';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { AUTO_GRADED_TYPES } from '@/shared/const/domain.const';
import { QUESTION_IMAGE_ROUTE } from '@/shared/const/routes.const';
import { ServiceResult } from '@/shared/types/common';

const IMAGE_PREFIX = 'content/images/';

export function toQuestionView(q: QuestionDocument): DiagnosticQuestion {
  return {
    id: q._id.toString(),
    number: q.number ?? 0,
    type: q.type,
    text: q.text,
    options: q.options.map((o) => ({ key: o.key, text: o.text })),
    imageUrls: q.images.map((path) => `${QUESTION_IMAGE_ROUTE}/${path.replace(IMAGE_PREFIX, '')}`),
    maxPoints: q.maxPoints,
  };
}

function answersOf(session: DiagnosticSessionDocument): Record<string, string> {
  return Object.fromEntries(session.answers.map((a) => [a.questionId.toString(), a.answer ?? '']));
}

/** Questions in the session's saved order (findByIds does not keep order). */
async function loadSessionQuestions(session: DiagnosticSessionDocument): Promise<QuestionDocument[]> {
  const ids = session.questionIds.map((id) => id.toString());
  const byId = new Map((await questionRepository.findByIds(ids)).map((q) => [q._id.toString(), q]));
  return ids.map((id) => byId.get(id)).filter((q): q is QuestionDocument => q !== undefined);
}

/** Exams the diagnostic can use, with this student's in-progress and last finished session. */
export async function listDiagnosticExamsService(userId: string): Promise<ServiceResult<DiagnosticExamSummary[]>> {
  const [exams, sessions] = await Promise.all([
    examRepository.findUsableForDiagnostic(),
    diagnosticSessionRepository.findByUser(userId),
  ]);

  const summaries = await Promise.all(
    exams.map(async (exam): Promise<DiagnosticExamSummary> => {
      const examId = exam._id.toString();
      const questions = await questionRepository.findByExamIdAndTypes(examId, AUTO_GRADED_TYPES);
      const mine = sessions.filter((s) => s.examId?.toString() === examId);
      const open = mine.find((s) => s.status === 'in_progress');
      const done = mine.find((s) => s.status === 'completed');
      return {
        code: exam.code,
        year: exam.year,
        variant: exam.variant,
        questionCount: questions.length,
        maxScore: questions.reduce((sum, q) => sum + q.maxPoints, 0),
        inProgress: open ? { answered: open.answers.length } : null,
        lastResult: done ? { score: done.score ?? 0, maxScore: done.maxScore ?? 0 } : null,
      };
    })
  );
  return { data: summaries.filter((s) => s.questionCount > 0), status: 200 };
}

/** Resumes the student's open session for this exam, or starts a new one. */
export async function startDiagnosticService(
  userId: string,
  examCode: string
): Promise<ServiceResult<DiagnosticSessionView>> {
  const exam = await examRepository.findByCode(examCode);
  if (!exam || !exam.usableForDiagnostic) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const examId = exam._id.toString();

  let session = await diagnosticSessionRepository.findInProgress(userId, examId);
  if (!session) {
    // Auto-gradable questions only until photo grading (T-014/T-015) handles written answers.
    const questions = await questionRepository.findByExamIdAndTypes(examId, AUTO_GRADED_TYPES);
    if (questions.length === 0) return { data: { error: 'NO_QUESTIONS' }, status: 404 };
    session = await diagnosticSessionRepository.create(
      userId,
      examId,
      questions.map((q) => q._id.toString())
    );
  }

  const questions = await loadSessionQuestions(session);
  return {
    data: {
      id: session._id.toString(),
      examCode: exam.code,
      year: exam.year,
      questions: questions.map(toQuestionView),
      answers: answersOf(session),
    },
    status: 200,
  };
}

export async function saveDiagnosticAnswerService(
  userId: string,
  input: SaveAnswerType
): Promise<ServiceResult<{ saved: true }>> {
  const session = await diagnosticSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (session.status !== 'in_progress') return { data: { error: 'SESSION_COMPLETED' }, status: 409 };
  if (!session.questionIds.some((id) => id.toString() === input.questionId)) {
    return { data: { error: 'QUESTION_NOT_IN_SESSION' }, status: 400 };
  }

  await diagnosticSessionRepository.setAnswer(input.sessionId, input.questionId, input.answer);
  return { data: { saved: true }, status: 200 };
}

/** Grades every question, writes one Attempt per question and closes the session. */
export async function finishDiagnosticService(
  userId: string,
  input: FinishDiagnosticType
): Promise<ServiceResult<DiagnosticResult>> {
  const session = await diagnosticSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (session.status !== 'in_progress') return { data: { error: 'SESSION_COMPLETED' }, status: 409 };

  const questions = await loadSessionQuestions(session);
  const answers = answersOf(session);
  const graded = questions.map((q) => {
    const answer = answers[q._id.toString()] ?? '';
    return { question: q, answer, ...gradeAnswer(q, answer) };
  });

  const score = graded.reduce((sum, g) => sum + g.points, 0);
  const maxScore = questions.reduce((sum, q) => sum + q.maxPoints, 0);
  const correctCount = graded.filter((g) => g.correct).length;

  // Close first: a second "finish" click then gets 409 instead of writing duplicate attempts.
  const closed = await diagnosticSessionRepository.complete(input.sessionId, { score, maxScore, correctCount });
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
  // TODO(T-016): update skill mastery from these attempts.

  const startedAt = session.createdAt ? new Date(session.createdAt).getTime() : Date.now();
  return {
    data: {
      score,
      maxScore,
      correctCount,
      total: questions.length,
      durationMinutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
    },
    status: 200,
  };
}

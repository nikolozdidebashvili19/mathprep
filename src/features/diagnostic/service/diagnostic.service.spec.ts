import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: {
    findById: vi.fn(),
    findInProgress: vi.fn(),
    findByUser: vi.fn(),
    create: vi.fn(),
    setAnswer: vi.fn(),
    complete: vi.fn(),
  },
}));
vi.mock('@/features/exam/repository/exam.repository', () => ({
  examRepository: { findByCode: vi.fn(), findUsableForDiagnostic: vi.fn() },
}));
vi.mock('@/features/question/repository/question.repository', () => ({
  questionRepository: { findByExamIdAndTypes: vi.fn(), findByIds: vi.fn() },
}));
vi.mock('@/features/attempt/repository/attempt.repository', () => ({
  attemptRepository: { insertMany: vi.fn() },
}));

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import {
  finishDiagnosticService,
  listDiagnosticExamsService,
  saveDiagnosticAnswerService,
  startDiagnosticService,
} from '@/features/diagnostic/service/diagnostic.service';
import { examRepository } from '@/features/exam/repository/exam.repository';
import { ExamDocument } from '@/features/exam/schema/exam.schema';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';

const sessions = vi.mocked(diagnosticSessionRepository);
const exams = vi.mocked(examRepository);
const questions = vi.mocked(questionRepository);
const attempts = vi.mocked(attemptRepository);

const USER = new Types.ObjectId();
const OTHER_USER = new Types.ObjectId();
const EXAM = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();
const Q2 = new Types.ObjectId();

const exam = { _id: EXAM, code: '2026-V1', year: 2026, variant: 1, usableForDiagnostic: true } as ExamDocument;

const question = (id: Types.ObjectId, number: number, answer: string) =>
  ({
    _id: id,
    number,
    type: 'multiple_choice',
    text: `კითხვა ${number}`,
    options: [
      { key: 'ა', text: '$1$' },
      { key: 'ბ', text: '$2$' },
    ],
    images: number === 2 ? ['content/images/2026-V1/q02.png'] : [],
    answer,
    maxPoints: 1,
  }) as QuestionDocument;

// Lean documents carry plain arrays, so overrides take a plain answers array.
type SessionOverrides = Omit<Partial<DiagnosticSessionDocument>, 'answers'> & {
  answers?: { questionId: Types.ObjectId; answer: string }[];
};

const openSession = (overrides: SessionOverrides = {}) =>
  ({
    _id: SESSION,
    userId: USER,
    examId: EXAM,
    status: 'in_progress',
    questionIds: [Q1, Q2],
    answers: [{ questionId: Q1, answer: 'ა' }],
    createdAt: new Date(Date.now() - 10 * 60000),
    ...overrides,
  }) as DiagnosticSessionDocument;

describe('diagnostic service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // findByIds returns documents out of order on purpose: the service must restore session order.
    questions.findByIds.mockResolvedValue([question(Q2, 2, 'ბ'), question(Q1, 1, 'ა')]);
  });

  describe('startDiagnosticService', () => {
    it('404s for an unknown or non-diagnostic exam', async () => {
      exams.findByCode.mockResolvedValueOnce(null);
      expect((await startDiagnosticService(USER.toString(), 'nope')).status).toBe(404);
      exams.findByCode.mockResolvedValueOnce({ ...exam, usableForDiagnostic: false });
      expect((await startDiagnosticService(USER.toString(), '2015-V1')).status).toBe(404);
    });

    it('resumes an open session without creating a new one', async () => {
      exams.findByCode.mockResolvedValueOnce(exam);
      sessions.findInProgress.mockResolvedValueOnce(openSession());

      const { data, status } = await startDiagnosticService(USER.toString(), '2026-V1');

      expect(status).toBe(200);
      expect(sessions.create).not.toHaveBeenCalled();
      if ('error' in data) throw new Error('expected a session');
      expect(data.questions.map((q) => q.number)).toEqual([1, 2]);
      expect(data.answers).toEqual({ [Q1.toString()]: 'ა' });
      expect(data.questions[1].imageUrls).toEqual(['/api/question-images/2026-V1/q02.png']);
      // The answer key must never reach the browser.
      expect(JSON.stringify(data)).not.toContain('"answer"');
    });

    it('creates a session from the auto-gradable questions', async () => {
      exams.findByCode.mockResolvedValueOnce(exam);
      sessions.findInProgress.mockResolvedValueOnce(null);
      questions.findByExamIdAndTypes.mockResolvedValueOnce([question(Q1, 1, 'ა'), question(Q2, 2, 'ბ')]);
      sessions.create.mockResolvedValueOnce(openSession({ answers: [] }));

      const { status } = await startDiagnosticService(USER.toString(), '2026-V1');

      expect(status).toBe(200);
      expect(questions.findByExamIdAndTypes).toHaveBeenCalledWith(EXAM.toString(), ['multiple_choice', 'numeric']);
      expect(sessions.create).toHaveBeenCalledWith(USER.toString(), EXAM.toString(), [Q1.toString(), Q2.toString()]);
    });
  });

  describe('saveDiagnosticAnswerService', () => {
    const input = { sessionId: SESSION.toString(), questionId: Q2.toString(), answer: 'ბ' };

    it("rejects another student's session", async () => {
      sessions.findById.mockResolvedValueOnce(openSession({ userId: OTHER_USER }));
      expect((await saveDiagnosticAnswerService(USER.toString(), input)).status).toBe(404);
      expect(sessions.setAnswer).not.toHaveBeenCalled();
    });

    it('rejects a finished session and a question outside the session', async () => {
      sessions.findById.mockResolvedValueOnce(openSession({ status: 'completed' }));
      expect((await saveDiagnosticAnswerService(USER.toString(), input)).status).toBe(409);
      sessions.findById.mockResolvedValueOnce(openSession());
      const foreign = { ...input, questionId: new Types.ObjectId().toString() };
      expect((await saveDiagnosticAnswerService(USER.toString(), foreign)).status).toBe(400);
    });

    it('saves the answer', async () => {
      sessions.findById.mockResolvedValueOnce(openSession());
      expect((await saveDiagnosticAnswerService(USER.toString(), input)).status).toBe(200);
      expect(sessions.setAnswer).toHaveBeenCalledWith(SESSION.toString(), Q2.toString(), 'ბ');
    });
  });

  describe('finishDiagnosticService', () => {
    it('grades, closes the session and writes one attempt per question', async () => {
      // Q1 answered correctly, Q2 never answered.
      sessions.findById.mockResolvedValueOnce(openSession());
      sessions.complete.mockResolvedValueOnce(1);

      const { data, status } = await finishDiagnosticService(USER.toString(), { sessionId: SESSION.toString() });

      expect(status).toBe(200);
      expect(data).toMatchObject({ score: 1, maxScore: 2, correctCount: 1, total: 2, durationMinutes: 10 });
      expect(sessions.complete).toHaveBeenCalledWith(SESSION.toString(), { score: 1, maxScore: 2, correctCount: 1 });
      const written = attempts.insertMany.mock.calls[0][0];
      expect(written).toHaveLength(2);
      expect(written[0]).toMatchObject({ questionId: Q1.toString(), answer: 'ა', points: 1, context: 'diagnostic' });
      expect(written[1]).toMatchObject({ questionId: Q2.toString(), answer: '', points: 0 });
    });

    it('does not write attempts twice when the session was already closed', async () => {
      sessions.findById.mockResolvedValueOnce(openSession());
      sessions.complete.mockResolvedValueOnce(0);

      const { status } = await finishDiagnosticService(USER.toString(), { sessionId: SESSION.toString() });

      expect(status).toBe(409);
      expect(attempts.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('listDiagnosticExamsService', () => {
    it('summarises each exam with the student progress', async () => {
      exams.findUsableForDiagnostic.mockResolvedValueOnce([exam]);
      sessions.findByUser.mockResolvedValueOnce([
        openSession(),
        openSession({ status: 'completed', score: 30, maxScore: 37, answers: [] }),
      ]);
      questions.findByExamIdAndTypes.mockResolvedValueOnce([question(Q1, 1, 'ა'), question(Q2, 2, 'ბ')]);

      const { data } = await listDiagnosticExamsService(USER.toString());

      expect(data).toEqual([
        {
          code: '2026-V1',
          year: 2026,
          variant: 1,
          questionCount: 2,
          maxScore: 2,
          inProgress: { answered: 1 },
          lastResult: { score: 30, maxScore: 37 },
        },
      ]);
    });
  });
});

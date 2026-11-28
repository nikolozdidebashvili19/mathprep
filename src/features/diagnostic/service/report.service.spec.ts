import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: { findById: vi.fn(), findCompletedByUser: vi.fn() },
}));
vi.mock('@/features/exam/repository/exam.repository', () => ({ examRepository: { findById: vi.fn() } }));
vi.mock('@/features/question/repository/question.repository', () => ({ questionRepository: { findByIds: vi.fn() } }));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn() } }));
vi.mock('@/features/handwriting/service/handwriting.service', () => ({ listSessionWorkPhotosService: vi.fn() }));

import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import {
  buildKnowledgeMapTopics,
  getDiagnosticReviewService,
  getReportService,
  levelFor,
} from '@/features/diagnostic/service/report.service';
import { DiagnosticReview } from '@/features/diagnostic/types/diagnostic.types';
import { listSessionWorkPhotosService } from '@/features/handwriting/service/handwriting.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';

const sessions = vi.mocked(diagnosticSessionRepository);
const USER = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();

const skills = [
  { code: 'N2', topic: 'N', nameKa: 'წილადები', examWeight: 1.4, prerequisites: [] },
  { code: 'A7', topic: 'A', nameKa: 'კვადრატული განტოლებები', examWeight: 1.3, prerequisites: ['N2'] },
  { code: 'A4', topic: 'A', nameKa: 'წრფივი განტოლებები', examWeight: 2.6, prerequisites: [] },
] as SkillDocument[];

const completed = (overrides: Partial<DiagnosticSessionDocument> = {}) =>
  ({
    _id: SESSION,
    userId: USER,
    kind: 'quick',
    status: 'completed',
    questionIds: [Q1],
    answers: [{ questionId: Q1, answer: 'ა' }],
    score: 0,
    maxScore: 1,
    correctCount: 0,
    completedAt: new Date('2026-11-22T10:00:00Z'),
    skillSummary: [{ skillCode: 'A7', score: -0.5, reasons: ['ფესვი დაკარგა'] }, { skillCode: 'N2', score: 0.4, reasons: [] }],
    ...overrides,
  }) as DiagnosticSessionDocument;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(skillRepository.findAll).mockResolvedValue(skills);
});

describe('levelFor / buildKnowledgeMapTopics', () => {
  it('maps evidence scores to levels', () => {
    expect([levelFor(undefined), levelFor(-0.5), levelFor(0), levelFor(0.4)]).toEqual(['untested', 'weak', 'mixed', 'strong']);
  });

  it('groups every skill under its topic in display order, untested where there is no evidence', () => {
    const topics = buildKnowledgeMapTopics(skills, [{ skillCode: 'A7', score: -0.5 }]);
    expect(topics.map((t) => t.code)).toEqual(['N', 'A']);
    expect(topics[1].skills).toEqual([
      { code: 'A7', nameKa: 'კვადრატული განტოლებები', level: 'weak' },
      { code: 'A4', nameKa: 'წრფივი განტოლებები', level: 'untested' },
    ]);
  });
});

describe('getReportService', () => {
  it('returns no map before the first quick check, but still the history', async () => {
    sessions.findCompletedByUser.mockResolvedValue([completed({ kind: 'full' })]);
    const report = await getReportService(USER.toString());
    expect(report.map).toBeNull();
    expect(report.history).toHaveLength(1);
  });

  it('builds the map from the latest quick check', async () => {
    sessions.findCompletedByUser.mockResolvedValue([completed()]);
    const report = await getReportService(USER.toString());
    expect(report.map?.sessionId).toBe(SESSION.toString());
    expect(report.history[0]).toMatchObject({ kind: 'quick', examCode: null, correctCount: 0, total: 1 });
  });
});

describe('getDiagnosticReviewService', () => {
  it('is only for the owner and only for finished sessions', async () => {
    sessions.findById.mockResolvedValue(completed());
    expect((await getDiagnosticReviewService(new Types.ObjectId().toString(), SESSION.toString())).status).toBe(404);
    sessions.findById.mockResolvedValue(completed({ status: 'in_progress' }));
    expect((await getDiagnosticReviewService(USER.toString(), SESSION.toString())).status).toBe(409);
  });

  it('shows each question with the key, the photo and the analysis with skill names', async () => {
    sessions.findById.mockResolvedValue(completed());
    vi.mocked(questionRepository.findByIds).mockResolvedValue([
      { _id: Q1, number: 4, type: 'multiple_choice', text: 'x', options: [{ key: 'ა', text: '1' }], images: [] as string[], answer: 'ბ', maxPoints: 1 } as QuestionDocument,
    ]);
    vi.mocked(listSessionWorkPhotosService).mockResolvedValue([
      {
        id: 'p1',
        questionId: Q1.toString(),
        mode: null,
        uploads: 0,
        analysis: { status: 'done', readable: true, approach: 'ფესვი', feedback: 'გაიმეორე', mistakes: [{ type: 'conceptual', skillCode: 'A7', description: 'ნიშანი დაკარგა' }], skillsShown: [] },
      },
    ]);

    const review = (await getDiagnosticReviewService(USER.toString(), SESSION.toString())).data as DiagnosticReview;
    expect(review.items[0]).toMatchObject({
      correctAnswer: 'ბ',
      givenAnswer: 'ა',
      correct: false,
      photoUrl: '/api/diagnostic/photos/p1',
      analysis: { feedback: 'გაიმეორე', mistakes: [{ type: 'conceptual', skillName: 'კვადრატული განტოლებები', description: 'ნიშანი დაკარგა' }] },
    });
    expect(review.weak[0].code).toBe('A7');
    expect(review.strong[0].code).toBe('N2');
  });
});

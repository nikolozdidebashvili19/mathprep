import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: {
    findById: vi.fn(),
    findQuickInProgress: vi.fn(),
    findLatestCompletedQuick: vi.fn(),
    createQuick: vi.fn(),
    recordQuickAnswer: vi.fn(),
    complete: vi.fn(),
  },
}));
vi.mock('@/features/exam/repository/exam.repository', () => ({
  examRepository: { findUsableForDiagnostic: vi.fn() },
}));
vi.mock('@/features/question/repository/question.repository', () => ({
  questionRepository: { findByIds: vi.fn(), findQuickCheckPool: vi.fn() },
}));
vi.mock('@/features/skill/repository/skill.repository', () => ({
  skillRepository: { findAll: vi.fn() },
}));
vi.mock('@/features/attempt/repository/attempt.repository', () => ({
  attemptRepository: { insertMany: vi.fn() },
}));
vi.mock('@/features/mastery/service/mastery.service', () => ({ rebuildMasteryService: vi.fn() }));
vi.mock('@/features/handwriting/service/handwriting.service', () => ({
  analyzeWorkPhotoService: vi.fn(),
  findWorkPhotoService: vi.fn(),
  listSessionWorkPhotosService: vi.fn(),
  saveWorkPhotoService: vi.fn(),
}));

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { DiagnosticSessionDocument } from '@/features/diagnostic/schema/diagnostic-session.schema';
import {
  finishQuickCheckService,
  startQuickCheckService,
  submitQuickAnswerService,
  uploadQuickPhotoService,
} from '@/features/diagnostic/service/quick-check.service';
import { QuickCheckResult, QuickCheckView } from '@/features/diagnostic/types/diagnostic.types';
import { examRepository } from '@/features/exam/repository/exam.repository';
import {
  findWorkPhotoService,
  listSessionWorkPhotosService,
  saveWorkPhotoService,
} from '@/features/handwriting/service/handwriting.service';
import { WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { rebuildMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';

const sessions = vi.mocked(diagnosticSessionRepository);
const questions = vi.mocked(questionRepository);
const photos = { find: vi.mocked(findWorkPhotoService), list: vi.mocked(listSessionWorkPhotosService), save: vi.mocked(saveWorkPhotoService) };

const USER = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();
const Q2 = new Types.ObjectId();

const skill = (code: string, topic: string, prerequisites: string[] = []) =>
  ({ code, topic, nameKa: `უნარი ${code}`, nameEn: code, examWeight: 1, prerequisites }) as SkillDocument;

const question = (id: Types.ObjectId, primarySkill: string, answer = 'ა') =>
  ({
    _id: id,
    code: `Q-${primarySkill}`,
    source: 'naec',
    status: 'draft',
    offProgram: false,
    number: 1,
    type: 'multiple_choice',
    text: 'იპოვეთ $x$',
    options: [{ key: 'ა', text: '$1$' }, { key: 'ბ', text: '$2$' }],
    images: [] as string[],
    answer,
    maxPoints: 1,
    difficulty: 3,
    primarySkill,
  }) as QuestionDocument;

type SessionOverrides = Omit<Partial<DiagnosticSessionDocument>, 'answers'> & {
  answers?: { questionId: Types.ObjectId; answer: string }[];
};

const quickSession = (overrides: SessionOverrides = {}) =>
  ({
    _id: SESSION,
    userId: USER,
    kind: 'quick',
    status: 'in_progress',
    ability: 2.5,
    questionIds: [Q1],
    answers: [],
    createdAt: new Date(Date.now() - 5 * 60000),
    ...overrides,
  }) as DiagnosticSessionDocument;

const photo = (questionId: Types.ObjectId, analysis: Partial<WorkPhotoSummary['analysis']> = {}): WorkPhotoSummary => ({
  id: 'photo-1',
  questionId: questionId.toString(),
  analysis: { status: 'done', readable: true, workShown: true, mistakes: [], skillsShown: [], ...analysis },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(skillRepository.findAll).mockResolvedValue([skill('A7', 'A', ['N6']), skill('N6', 'N'), skill('G7', 'G')]);
  vi.mocked(examRepository.findUsableForDiagnostic).mockResolvedValue([]);
  questions.findQuickCheckPool.mockResolvedValue([question(Q1, 'A7'), question(Q2, 'G7')]);
  questions.findByIds.mockImplementation(async (ids) => [question(Q1, 'A7'), question(Q2, 'G7')].filter((q) => ids.includes(q._id.toString())));
});

describe('startQuickCheckService', () => {
  it('resumes an open quick check', async () => {
    sessions.findQuickInProgress.mockResolvedValue(quickSession());
    const { data } = await startQuickCheckService(USER.toString());
    expect((data as QuickCheckView).current?.id).toBe(Q1.toString());
    expect(sessions.createQuick).not.toHaveBeenCalled();
  });

  it('starts with a question from the heaviest topic', async () => {
    sessions.findQuickInProgress.mockResolvedValue(null);
    sessions.createQuick.mockResolvedValue(quickSession());
    await startQuickCheckService(USER.toString());
    // Topic weights: A = 1, N = 1, G = 1 → alphabetical tie-break puts A first, so the A7 question.
    expect(sessions.createQuick).toHaveBeenCalledWith(USER.toString(), Q1.toString(), 2.5);
  });
});

describe('uploadQuickPhotoService', () => {
  it('only accepts a photo for the current question', async () => {
    sessions.findById.mockResolvedValue(quickSession());
    const res = await uploadQuickPhotoService(
      USER.toString(),
      { sessionId: SESSION.toString(), questionId: Q2.toString() },
      { mimeType: 'image/jpeg', data: Buffer.from('x') }
    );
    expect(res.status).toBe(409);
    expect(photos.save).not.toHaveBeenCalled();
  });
});

describe('submitQuickAnswerService', () => {
  const input = { sessionId: SESSION.toString(), questionId: Q1.toString(), answer: 'ა' };

  it('requires a photo for a real answer but not for "I don\'t know"', async () => {
    sessions.findById.mockResolvedValue(quickSession());
    photos.find.mockResolvedValue(null);
    expect((await submitQuickAnswerService(USER.toString(), input)).data).toEqual({ error: 'PHOTO_REQUIRED' });

    sessions.recordQuickAnswer.mockResolvedValue(1);
    const res = await submitQuickAnswerService(USER.toString(), { ...input, answer: '' });
    expect(res.status).toBe(200);
    expect(sessions.recordQuickAnswer).toHaveBeenCalledWith(SESSION.toString(), expect.objectContaining({ answer: '', ability: 1.75 }));
  });

  it('raises the ability after a correct answer, appends the next question and returns the photo to analyse', async () => {
    sessions.findById.mockResolvedValue(quickSession());
    photos.find.mockResolvedValue(photo(Q1));
    sessions.recordQuickAnswer.mockResolvedValue(1);

    const res = await submitQuickAnswerService(USER.toString(), input);
    const data = res.data as { view: QuickCheckView; photoId: string | null };
    expect(data.photoId).toBe('photo-1');
    expect(data.view).toMatchObject({ answeredCount: 1, current: { id: Q2.toString() } });
    expect(sessions.recordQuickAnswer).toHaveBeenCalledWith(SESSION.toString(), {
      questionId: Q1.toString(),
      answer: 'ა',
      ability: 3.25,
      nextQuestionId: Q2.toString(),
    });
  });

  it('rejects answers to other questions, other users and double submits', async () => {
    sessions.findById.mockResolvedValue(quickSession());
    expect((await submitQuickAnswerService(USER.toString(), { ...input, questionId: Q2.toString() })).status).toBe(409);
    expect((await submitQuickAnswerService(new Types.ObjectId().toString(), input)).status).toBe(404);

    photos.find.mockResolvedValue(photo(Q1));
    sessions.recordQuickAnswer.mockResolvedValue(0);
    expect((await submitQuickAnswerService(USER.toString(), input)).data).toEqual({ error: 'ALREADY_ANSWERED' });
  });
});

describe('finishQuickCheckService', () => {
  it('refuses to finish before every question is answered', async () => {
    sessions.findById.mockResolvedValue(quickSession());
    expect((await finishQuickCheckService(USER.toString(), { sessionId: SESSION.toString() })).data).toEqual({ error: 'NOT_FINISHED' });
  });

  it('grades, blames the skill named in the photo and closes the session', async () => {
    sessions.findById.mockResolvedValue(
      quickSession({ questionIds: [Q1, Q2], answers: [{ questionId: Q1, answer: 'ბ' }, { questionId: Q2, answer: 'ა' }] })
    );
    const analysed = photo(Q1, { mistakes: [{ type: 'conceptual', skillCode: 'N6', description: 'ფესვის შეცდომა' }] });
    photos.list.mockResolvedValue([analysed]);
    sessions.complete.mockResolvedValue(1);

    const res = await finishQuickCheckService(USER.toString(), { sessionId: SESSION.toString() });
    const result = res.data as QuickCheckResult;

    expect(result).toMatchObject({ score: 1, maxScore: 2, correctCount: 1, total: 2, photosAnalysed: 1, photosTotal: 1 });
    expect(result.weak[0]).toMatchObject({ code: 'N6', reasons: ['ფესვის შეცდომა'] });
    expect(result.weak.map((w) => w.code)).toContain('A7');
    expect(result.strong.map((s) => s.code)).toContain('G7');
    expect(sessions.complete).toHaveBeenCalledWith(SESSION.toString(), expect.objectContaining({ score: 1, skillSummary: expect.any(Array) }));
    expect(attemptRepository.insertMany).toHaveBeenCalledTimes(1);
    expect(rebuildMasteryService).toHaveBeenCalledWith(USER.toString());
  });
});

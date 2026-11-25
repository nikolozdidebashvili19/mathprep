import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/course.repository', () => ({ courseRepository: { findActiveByUser: vi.fn() } }));
vi.mock('@/features/course/repository/course-day.repository', () => ({
  courseDayRepository: { findOne: vi.fn(), markCompleted: vi.fn() },
}));
vi.mock('@/features/course/repository/practice-session.repository', () => ({
  practiceSessionRepository: {
    findById: vi.fn(),
    findByCourseDay: vi.fn(),
    create: vi.fn(),
    recordAnswer: vi.fn(),
    complete: vi.fn(),
    revealGuideStep: vi.fn(),
    insertItem: vi.fn(),
  },
}));
vi.mock('@/features/attempt/repository/attempt.repository', () => ({
  attemptRepository: { findOutcomesByUser: vi.fn().mockResolvedValue([]), insertMany: vi.fn() },
}));
vi.mock('@/features/exam/repository/exam.repository', () => ({ examRepository: { findUsableForDiagnostic: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/features/question/repository/question.repository', () => ({
  questionRepository: { findQuickCheckPool: vi.fn(), findByIds: vi.fn() },
}));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/features/mastery/service/mastery.service', () => ({
  getMasteryMapService: vi.fn(async (_u: string, codes: string[]) => new Map(codes.map((c) => [c, { skillCode: c, value: 0.35 }]))),
  recordPracticeMasteryService: vi.fn(),
}));

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { CourseDayDocument } from '@/features/course/schema/course-day.schema';
import { CourseDocument } from '@/features/course/schema/course.schema';
import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import {
  answerPracticeService,
  hintPracticeService,
  startDayPracticeService,
  startTodayPracticeService,
} from '@/features/course/service/practice.service';
import { PracticeAnswerResult, PracticeSessionView } from '@/features/course/types/course.types';
import { recordPracticeMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument, QuestionModel } from '@/features/question/schema/question.schema';

const USER = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();
const Q2 = new Types.ObjectId();

// Fixtures are built with the real models (no DB needed), so they are properly typed documents.
const question = (id: Types.ObjectId, difficulty: number): QuestionDocument =>
  new QuestionModel({
    _id: id,
    source: 'naec',
    code: `Q-${difficulty}`,
    number: 1,
    type: 'multiple_choice',
    text: 'იპოვეთ $x$',
    options: [{ key: 'ა', text: '1' }, { key: 'ბ', text: '2' }],
    images: [] as string[],
    solutionSteps: ['ნაბიჯი 1', 'ნაბიჯი 2', 'პასუხი ა'],
    answer: 'ა',
    maxPoints: 1,
    difficulty,
    primarySkill: 'A4',
    skills: [{ skillCode: 'A4', isPrimary: true }],
  }).toObject();

const course = { _id: COURSE, startDate: new Date(), durationDays: 30, skills: ['A4'] } as CourseDocument;

type ItemOverrides = { questionId?: Types.ObjectId; kind?: string; answeredAt?: Date; correct?: boolean; hintsUsed?: number };
const sessionWith = (items: ItemOverrides[], status = 'in_progress'): PracticeSessionDocument =>
  new PracticeSessionModel({
    _id: SESSION,
    userId: USER,
    courseId: COURSE,
    dayIndex: 0,
    status,
    items: items.map((i) => ({ blockIndex: 0, kind: 'practice', skillCode: 'A4', ...i })),
  }).toObject();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(courseRepository.findActiveByUser).mockResolvedValue(course);
  vi.mocked(questionRepository.findQuickCheckPool).mockResolvedValue([question(Q1, 2), question(Q2, 5)]);
  vi.mocked(questionRepository.findByIds).mockImplementation(async (ids) => [question(Q1, 2), question(Q2, 5)].filter((q) => ids.includes(q._id.toString())));
});

describe('startTodayPracticeService', () => {
  it('needs an active course', async () => {
    vi.mocked(courseRepository.findActiveByUser).mockResolvedValue(null);
    expect((await startTodayPracticeService(USER.toString())).data).toEqual({ error: 'NO_COURSE' });
  });

  it('has no practice on a weekly check day', async () => {
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(null);
    vi.mocked(courseDayRepository.findOne).mockResolvedValue({ blocks: [{ kind: 'check', minutes: 60 }] } as CourseDayDocument);
    expect((await startTodayPracticeService(USER.toString())).data).toMatchObject({ checkDay: true, items: [] });
  });

  it('builds today from the blocks: a theory card, then questions picked for the skill, no repeats', async () => {
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(null);
    vi.mocked(courseDayRepository.findOne).mockResolvedValue({
      blocks: [
        { kind: 'theory', skillCode: 'A4', minutes: 10 },
        { kind: 'practice', skillCode: 'A4', minutes: 3 },
        { kind: 'drill', skillCode: 'A4', minutes: 3 },
      ],
    } as CourseDayDocument);
    vi.mocked(practiceSessionRepository.create).mockImplementation(async (input) => sessionWith(input.items.map((i) => ({ kind: i.kind, questionId: i.questionId ? new Types.ObjectId(i.questionId) : undefined }))));

    const view = (await startTodayPracticeService(USER.toString())).data as PracticeSessionView;
    const items = vi.mocked(practiceSessionRepository.create).mock.calls[0][0].items;
    expect(items.map((i) => [i.kind, i.questionId])).toEqual([
      ['theory', null],
      ['practice', Q1.toString()],
      ['drill', Q2.toString()],
    ]);
    // The key is never sent before an answer.
    expect(view.items[1]).toMatchObject({ answered: false, correctAnswer: null });
  });

  it('opens earlier days but not future ones', async () => {
    vi.mocked(courseRepository.findActiveByUser).mockResolvedValue({ ...course, startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } as CourseDocument);
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(sessionWith([{ questionId: Q1 }]));
    expect((await startDayPracticeService(USER.toString(), 1)).status).toBe(200);
    expect(vi.mocked(practiceSessionRepository.findByCourseDay).mock.calls[0][1]).toBe(1);
    expect((await startDayPracticeService(USER.toString(), 4)).data).toEqual({ error: 'DAY_NOT_OPEN' });
  });

  it('resumes an existing session', async () => {
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(sessionWith([{ questionId: Q1 }]));
    await startTodayPracticeService(USER.toString());
    expect(practiceSessionRepository.create).not.toHaveBeenCalled();
  });
});

describe('answerPracticeService', () => {
  const input = { sessionId: SESSION.toString(), itemIndex: 1, answer: 'ა' };

  it('marks a theory card as read without an attempt or mastery change', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ kind: 'theory' }, { questionId: Q1 }]));
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    const res = await answerPracticeService(USER.toString(), { ...input, itemIndex: 0, answer: '' });
    expect(res.data).toMatchObject({ correct: true, correctAnswer: null });
    expect(attemptRepository.insertMany).not.toHaveBeenCalled();
  });

  it('grades a question instantly, stores the attempt, updates mastery and finishes the day on the last item', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ kind: 'theory', answeredAt: new Date() }, { questionId: Q1 }]));
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.complete).mockResolvedValue(1);

    const res = (await answerPracticeService(USER.toString(), { ...input, answer: 'ბ' })).data as PracticeAnswerResult;

    expect(res).toEqual({
      correct: false,
      correctAnswer: 'ა',
      solution: { steps: ['ნაბიჯი 1', 'ნაბიჯი 2', 'პასუხი ა'], commonMistake: null },
      reteach: null,
      summary: { correctCount: 0, questionCount: 1 },
      // No easier A4 question left in the pool, so no second chance and the day is done.
      secondChance: null,
    });
    expect(vi.mocked(attemptRepository.insertMany).mock.calls[0][0][0]).toMatchObject({ context: 'practice', points: 0, maxPoints: 1 });
    expect(recordPracticeMasteryService).toHaveBeenCalledWith(USER.toString(), expect.objectContaining({ primarySkill: 'A4' }), 0, 1);
    expect(courseDayRepository.markCompleted).toHaveBeenCalledWith(COURSE.toString(), 0);
  });

  it('rejects double answers and other students', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{}, { questionId: Q1, answeredAt: new Date() }]));
    expect((await answerPracticeService(USER.toString(), input)).data).toEqual({ error: 'ALREADY_ANSWERED' });
    expect((await answerPracticeService(new Types.ObjectId().toString(), input)).status).toBe(404);
  });
});

describe('second chance', () => {
  // Missed difficulty 5 → ideal is 4: Q1 (difficulty 2) is closer than the difficulty-1 question.
  it('after a wrong answer inserts an easier question on the same skill right after it, and the day goes on', async () => {
    const Q3 = new Types.ObjectId();
    const easy = { ...question(Q3, 1), code: 'Q-easy' };
    vi.mocked(questionRepository.findQuickCheckPool).mockResolvedValue([question(Q1, 2), question(Q2, 5), easy]);
    vi.mocked(questionRepository.findByIds).mockImplementation(async (ids) => [question(Q1, 2), question(Q2, 5), easy].filter((q) => ids.includes(q._id.toString())));
    const before = sessionWith([{ kind: 'theory', answeredAt: new Date() }, { questionId: Q2 }]);
    const after = sessionWith([{ kind: 'theory', answeredAt: new Date() }, { questionId: Q2, answeredAt: new Date(), correct: false }, { questionId: Q1 }]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.insertItem).mockResolvedValue(1);

    const res = (await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 1, answer: 'ბ' })).data as PracticeAnswerResult;

    expect(practiceSessionRepository.insertItem).toHaveBeenCalledWith(SESSION.toString(), 2, expect.objectContaining({ questionId: Q1.toString(), secondChance: true }));
    expect(res.secondChance).toMatchObject({ index: 2, answered: false, correctAnswer: null });
    expect(res.summary).toBeNull();
    expect(practiceSessionRepository.complete).not.toHaveBeenCalled();
  });
});

describe('hintPracticeService', () => {
  const input = { sessionId: SESSION.toString(), itemIndex: 0 };

  const hint = (text: string) => ({ kind: 'hint', text, items: [] });

  it('without guidance: solution steps one by one as hints, then the full solution last', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, hintsUsed: 1 }]));
    vi.mocked(practiceSessionRepository.revealGuideStep).mockResolvedValue(1);
    const res = await hintPracticeService(USER.toString(), input);
    expect(res.data).toEqual({ hints: [hint('ნაბიჯი 1'), hint('ნაბიჯი 2')], hintsTotal: 3 });
    expect(practiceSessionRepository.revealGuideStep).toHaveBeenCalledWith(SESSION.toString(), 0, 1, 1);
  });

  it('with guidance: what is asked and the plan come first and are free, then hints', async () => {
    const guided = { ...question(Q1, 2), guidance: { restate: 'რას ეძებენ', plan: ['p1', 'p2'], hints: ['h1'] } };
    vi.mocked(questionRepository.findByIds).mockResolvedValue([guided]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1 }]));
    vi.mocked(practiceSessionRepository.revealGuideStep).mockResolvedValue(1);
    const res = await hintPracticeService(USER.toString(), input);
    // restate, plan, one hint, walkthrough, full solution = 5 rungs (no lesson in this test, so no theory/example).
    expect(res.data).toEqual({ hints: [{ kind: 'restate', text: 'რას ეძებენ', items: [] }], hintsTotal: 5 });
    expect(practiceSessionRepository.revealGuideStep).toHaveBeenCalledWith(SESSION.toString(), 0, 0, 0);
  });

  it('refuses when no rung is left', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, hintsUsed: 3 }]));
    expect((await hintPracticeService(USER.toString(), input)).data).toEqual({ error: 'NO_MORE_HINTS' });
    expect(practiceSessionRepository.revealGuideStep).not.toHaveBeenCalled();
  });

  it('counts a hinted answer less toward mastery', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, hintsUsed: 2 }]));
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.complete).mockResolvedValue(1);
    await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 0, answer: 'ა' });
    expect(recordPracticeMasteryService).toHaveBeenCalledWith(USER.toString(), expect.anything(), 1, 0.5);
    expect(vi.mocked(attemptRepository.insertMany).mock.calls[0][0][0]).toMatchObject({ hintsUsed: 2 });
  });
});

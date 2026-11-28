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
    revealStage: vi.fn(),
    insertItems: vi.fn(),
    replaceQuestion: vi.fn(),
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
vi.mock('@/features/handwriting/service/handwriting.service', () => ({
  listSessionWorkPhotosService: vi.fn().mockResolvedValue([]),
  findWorkPhotoService: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/features/revision/service/review.service', () => ({
  reviewOverviewService: vi.fn().mockResolvedValue({ due: [], learnt: [] }),
  recordLearningService: vi.fn(),
  recordReviewAnswerService: vi.fn(),
}));

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { CourseDayDocument } from '@/features/course/schema/course-day.schema';
import { CourseDocument } from '@/features/course/schema/course.schema';
import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { hintPracticeService } from '@/features/course/service/practice-help.service';
import { answerPracticeService, startDayPracticeService, startTodayPracticeService } from '@/features/course/service/practice.service';
import { PracticeAnswerResult, PracticeHintResult, PracticeSessionView } from '@/features/course/types/course.types';
import { findWorkPhotoService } from '@/features/handwriting/service/handwriting.service';
import { WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { recordPracticeMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument, QuestionModel } from '@/features/question/schema/question.schema';
import { recordLearningService, recordReviewAnswerService, reviewOverviewService } from '@/features/revision/service/review.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { HINT_COPY, MAX_REINFORCEMENTS_PER_DAY } from '@/shared/const/course.const';

const USER = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const Q1 = new Types.ObjectId();
const Q2 = new Types.ObjectId();

// Fixtures are built with the real models (no DB needed), so they are properly typed documents.
const question = (id: Types.ObjectId, difficulty: number, skill = 'A4'): QuestionDocument =>
  new QuestionModel({
    _id: id,
    source: 'naec',
    code: `Q-${id.toString().slice(-4)}`,
    number: 1,
    type: 'multiple_choice',
    text: 'იპოვეთ $x$',
    options: [{ key: 'ა', text: '1' }, { key: 'ბ', text: '2' }],
    images: [] as string[],
    solutionSteps: ['ნაბიჯი 1', 'ნაბიჯი 2', 'პასუხი ა'],
    answer: 'ა',
    maxPoints: 1,
    difficulty,
    primarySkill: skill,
    skills: [{ skillCode: skill, isPrimary: true }],
  }).toObject();

/** Sets the question pool (practice picks) and what findByIds returns. */
const usePool = (questions: QuestionDocument[]) => {
  vi.mocked(questionRepository.findQuickCheckPool).mockResolvedValue(questions);
  vi.mocked(questionRepository.findByIds).mockImplementation(async (ids) => questions.filter((q) => ids.includes(q._id.toString())));
};

const course = { _id: COURSE, startDate: new Date(), durationDays: 30, skills: ['A4'] } as CourseDocument;

type ItemOverrides = {
  questionId?: Types.ObjectId;
  kind?: string;
  blockIndex?: number;
  answeredAt?: Date;
  correct?: boolean;
  hintsUsed?: number;
  stuckStage?: number;
  scaffold?: string;
  secondChance?: boolean;
  reinforcedWith?: number;
};
const sessionWith = (items: ItemOverrides[], status = 'in_progress'): PracticeSessionDocument =>
  new PracticeSessionModel({
    _id: SESSION,
    userId: USER,
    courseId: COURSE,
    dayIndex: 0,
    status,
    items: items.map((i) => ({ blockIndex: 0, kind: 'practice', skillCode: 'A4', ...i })),
  }).toObject();

const answered = { answeredAt: new Date(), correct: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(courseRepository.findActiveByUser).mockResolvedValue(course);
  vi.mocked(reviewOverviewService).mockResolvedValue({ due: [], learnt: [] });
  vi.mocked(findWorkPhotoService).mockResolvedValue(null);
  vi.mocked(skillRepository.findAll).mockResolvedValue([]);
  usePool([question(Q1, 2), question(Q2, 5)]);
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

  it('builds today: the lesson, then questions for the skill (the new skill starts solved together), no repeats', async () => {
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(null);
    vi.mocked(courseDayRepository.findOne).mockResolvedValue({
      blocks: [
        { kind: 'theory', skillCode: 'A4', minutes: 10 },
        { kind: 'practice', skillCode: 'A4', minutes: 3 },
        { kind: 'drill', skillCode: 'A4', minutes: 3 },
      ],
    } as CourseDayDocument);
    vi.mocked(practiceSessionRepository.create).mockImplementation(async (input) =>
      sessionWith(input.items.map((i) => ({ kind: i.kind, questionId: i.questionId ? new Types.ObjectId(i.questionId) : undefined })))
    );

    const view = (await startTodayPracticeService(USER.toString())).data as PracticeSessionView;
    const items = vi.mocked(practiceSessionRepository.create).mock.calls[0][0].items;
    expect(items.map((i) => [i.kind, i.questionId, i.scaffold])).toEqual([
      ['theory', null, undefined],
      ['practice', Q1.toString(), 'full'],
      ['drill', Q2.toString(), 'full'],
    ]);
    // The key is never sent before an answer.
    expect(view.items[1]).toMatchObject({ answered: false, correctAnswer: null });
  });

  it('a day with a new lesson starts with a warm-up on a skill learnt earlier; due reviews fill the revision block', async () => {
    const N1 = new Types.ObjectId();
    usePool([question(Q1, 2), question(N1, 1, 'N1')]);
    vi.mocked(reviewOverviewService).mockResolvedValue({ due: ['N1'], learnt: ['N1'] });
    vi.mocked(skillRepository.findAll).mockResolvedValue([{ code: 'A4', prerequisites: ['N1'] } as SkillDocument]);
    vi.mocked(practiceSessionRepository.findByCourseDay).mockResolvedValue(null);
    vi.mocked(courseDayRepository.findOne).mockResolvedValue({
      blocks: [
        { kind: 'theory', skillCode: 'A4', minutes: 10 },
        { kind: 'practice', skillCode: 'A4', minutes: 3 },
      ],
    } as CourseDayDocument);
    vi.mocked(practiceSessionRepository.create).mockImplementation(async () => sessionWith([]));

    await startTodayPracticeService(USER.toString());
    const items = vi.mocked(practiceSessionRepository.create).mock.calls[0][0].items;
    expect(items[0]).toMatchObject({ kind: 'revision', skillCode: 'N1', questionId: N1.toString(), warmup: true, review: true });
    expect(items[1]).toMatchObject({ kind: 'theory', skillCode: 'A4' });
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

  it('grades instantly, stores the attempt, updates mastery, starts the review schedule and finishes the day', async () => {
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
      adjusted: null,
    });
    expect(vi.mocked(attemptRepository.insertMany).mock.calls[0][0][0]).toMatchObject({ context: 'practice', points: 0, maxPoints: 1 });
    expect(recordPracticeMasteryService).toHaveBeenCalledWith(USER.toString(), expect.objectContaining({ primarySkill: 'A4' }), 0, 1);
    expect(recordLearningService).toHaveBeenCalledWith(USER.toString(), 'A4');
    expect(courseDayRepository.markCompleted).toHaveBeenCalledWith(COURSE.toString(), 0);
  });

  it('a review answer moves the spaced-repetition schedule; with hints it does not count as passed', async () => {
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ kind: 'revision', questionId: Q1 }]));
    await answerPracticeService(USER.toString(), { ...input, itemIndex: 0 });
    expect(recordReviewAnswerService).toHaveBeenLastCalledWith(USER.toString(), 'A4', true);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ kind: 'revision', questionId: Q1, hintsUsed: 1 }]));
    await answerPracticeService(USER.toString(), { ...input, itemIndex: 0 });
    expect(recordReviewAnswerService).toHaveBeenLastCalledWith(USER.toString(), 'A4', false);
    expect(recordLearningService).not.toHaveBeenCalled();
  });

  it('rejects double answers and other students', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{}, { questionId: Q1, answeredAt: new Date() }]));
    expect((await answerPracticeService(USER.toString(), input)).data).toEqual({ error: 'ALREADY_ANSWERED' });
    expect((await answerPracticeService(new Types.ObjectId().toString(), input)).status).toBe(404);
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

describe('second chance', () => {
  // Missed difficulty 5 → ideal is 4: Q1 (difficulty 2) is closer than the difficulty-1 question.
  it('after a wrong answer inserts an easier question on the same skill right after it, and the day goes on', async () => {
    const Q3 = new Types.ObjectId();
    usePool([question(Q1, 2), question(Q2, 5), question(Q3, 1)]);
    const before = sessionWith([{ kind: 'theory', answeredAt: new Date() }, { questionId: Q2 }]);
    const after = sessionWith([{ kind: 'theory', answeredAt: new Date() }, { questionId: Q2, answeredAt: new Date(), correct: false }, { questionId: Q1 }]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.insertItems).mockResolvedValue(1);

    const res = (await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 1, answer: 'ბ' })).data as PracticeAnswerResult;

    expect(practiceSessionRepository.insertItems).toHaveBeenCalledWith(SESSION.toString(), 2, [
      expect.objectContaining({ questionId: Q1.toString(), secondChance: true }),
    ]);
    expect(res.secondChance).toMatchObject({ index: 2, answered: false, correctAnswer: null });
    expect(res.summary).toBeNull();
    expect(practiceSessionRepository.complete).not.toHaveBeenCalled();
  });
});

describe('adaptive difficulty', () => {
  const [QA, QB, QC, QD] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const pool = () => [question(QA, 1), question(QB, 2), question(QC, 2), question(QD, 3)];

  it('two correct answers in a row on their own: the next planned question becomes one level harder', async () => {
    usePool(pool());
    const before = sessionWith([{ questionId: QA, ...answered }, { questionId: QB }, { questionId: QC }]);
    const after = sessionWith([{ questionId: QA, ...answered }, { questionId: QB, ...answered }, { questionId: QD }]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.replaceQuestion).mockResolvedValue(1);

    const res = (await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 1, answer: 'ა' })).data as PracticeAnswerResult;

    expect(practiceSessionRepository.replaceQuestion).toHaveBeenCalledWith(SESSION.toString(), 2, QC.toString(), QD.toString());
    expect(res.adjusted).toMatchObject({ index: 2, direction: 'up', item: { question: { id: QD.toString() } } });
  });

  it('a correct answer after a hinted or solved-together one does not step up yet', async () => {
    usePool(pool());
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(
      sessionWith([{ questionId: QA, ...answered, scaffold: 'full' }, { questionId: QB }, { questionId: QC }])
    );
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    const res = (await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 1, answer: 'ა' })).data as PracticeAnswerResult;
    expect(practiceSessionRepository.replaceQuestion).not.toHaveBeenCalled();
    expect(res.adjusted).toBeNull();
  });

  it('after a miss, a harder next question comes back to the missed level (and the second chance goes first)', async () => {
    usePool(pool());
    const before = sessionWith([{ questionId: QB }, { questionId: QD }]);
    const after = sessionWith([{ questionId: QB, answeredAt: new Date(), correct: false }, { questionId: QA, secondChance: true }, { questionId: QC }]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    vi.mocked(practiceSessionRepository.recordAnswer).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.replaceQuestion).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.insertItems).mockResolvedValue(1);

    const res = (await answerPracticeService(USER.toString(), { sessionId: SESSION.toString(), itemIndex: 0, answer: 'ბ' })).data as PracticeAnswerResult;

    expect(practiceSessionRepository.replaceQuestion).toHaveBeenCalledWith(SESSION.toString(), 1, QD.toString(), QC.toString());
    // The second chance never repeats the swapped-in question.
    expect(practiceSessionRepository.insertItems).toHaveBeenCalledWith(SESSION.toString(), 1, [expect.objectContaining({ questionId: QA.toString() })]);
    expect(res.adjusted).toMatchObject({ index: 2, direction: 'down', item: { question: { id: QC.toString() } } });
  });
});

describe('hintPracticeService', () => {
  const input = { sessionId: SESSION.toString(), itemIndex: 0 };
  const hint = (text: string, stage: number) => ({ kind: 'hint', stage, text, items: [] });

  it('without guidance: one hint from the first half of the solution, then the photo, then easier questions', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1 }]));
    vi.mocked(practiceSessionRepository.revealStage).mockResolvedValue(1);
    const res = (await hintPracticeService(USER.toString(), input)).data as PracticeHintResult;
    expect(res).toEqual({ hints: [hint('ნაბიჯი 1', 1)], stage: 1, stages: 3, inserted: [] });
    expect(practiceSessionRepository.revealStage).toHaveBeenCalledWith(SESSION.toString(), 0, 0, 1);
  });

  it('with guidance: stage 1 = what is asked + the first hint; the plan comes in stage 2 and is free', async () => {
    usePool([{ ...question(Q1, 2), guidance: { restate: 'რას ეძებენ', plan: ['p1', 'p2'], hints: ['h1'] } }]);
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, stuckStage: 1 }]));
    vi.mocked(practiceSessionRepository.revealStage).mockResolvedValue(1);
    const res = (await hintPracticeService(USER.toString(), input)).data as PracticeHintResult;
    expect(res.hints.map((h) => [h.kind, h.stage])).toEqual([
      ['restate', 1],
      ['hint', 1],
      ['plan', 2],
    ]);
    expect(res).toMatchObject({ stage: 2, stages: 4 });
    expect(practiceSessionRepository.revealStage).toHaveBeenCalledWith(SESSION.toString(), 0, 1, 0);
  });

  it('never reveals the final step of the solution, at any stage', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, stuckStage: 2 }]));
    vi.mocked(practiceSessionRepository.revealStage).mockResolvedValue(1);
    const res = (await hintPracticeService(USER.toString(), input)).data as PracticeHintResult;
    expect(res.hints.flatMap((h) => [h.text, ...h.items]).join(' ')).not.toContain('პასუხი ა');
  });

  it('refuses when every stage is shown or the question is answered', async () => {
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, stuckStage: 3 }]));
    expect((await hintPracticeService(USER.toString(), input)).data).toEqual({ error: 'NO_MORE_HINTS' });
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q1, answeredAt: new Date() }]));
    expect((await hintPracticeService(USER.toString(), input)).data).toEqual({ error: 'ALREADY_ANSWERED' });
    expect(practiceSessionRepository.revealStage).not.toHaveBeenCalled();
  });
});

describe('stage 4: reinforcement', () => {
  const input = { sessionId: SESSION.toString(), itemIndex: 0 };
  const [E3, E4, N2Q] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];

  const photoWithMistake = (skillCode: string): WorkPhotoSummary => ({
    id: 'p',
    questionId: Q2.toString(),
    mode: 'stuck',
    uploads: 1,
    analysis: { status: 'done', readable: true, matchesQuestion: true, mistakes: [{ type: 'calculation', skillCode, description: 'd' }], skillsShown: [] },
  });

  beforeEach(() => {
    vi.mocked(practiceSessionRepository.revealStage).mockResolvedValue(1);
    vi.mocked(practiceSessionRepository.insertItems).mockResolvedValue(1);
  });

  it('inserts easier questions on the same skill before the original, climbing back to it', async () => {
    usePool([question(Q2, 5), question(E3, 3), question(E4, 4)]);
    vi.mocked(practiceSessionRepository.findById)
      .mockResolvedValueOnce(sessionWith([{ questionId: Q2, stuckStage: 2 }]))
      .mockResolvedValueOnce(sessionWith([{ questionId: E3 }, { questionId: E4 }, { questionId: Q2, stuckStage: 3, reinforcedWith: 2 }]));

    const res = (await hintPracticeService(USER.toString(), input)).data as PracticeHintResult;

    expect(practiceSessionRepository.revealStage).toHaveBeenCalledWith(SESSION.toString(), 0, 2, 0, 2);
    expect(practiceSessionRepository.insertItems).toHaveBeenCalledWith(SESSION.toString(), 0, [
      expect.objectContaining({ questionId: E3.toString(), reinforcement: true, reinforcementSkill: null }),
      expect.objectContaining({ questionId: E4.toString(), reinforcement: true }),
    ]);
    expect(res.inserted.map((i) => i.question?.id)).toEqual([E3.toString(), E4.toString()]);
    expect(res.hints.at(-1)).toMatchObject({ kind: 'reinforce', text: HINT_COPY.reinforceIntro });
  });

  it('aims at the weakness the photo showed first, then one level below the original', async () => {
    usePool([question(Q2, 5), question(E4, 4), question(N2Q, 2, 'N2')]);
    vi.mocked(findWorkPhotoService).mockResolvedValue(photoWithMistake('N2'));
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q2, stuckStage: 2 }]));

    await hintPracticeService(USER.toString(), input);

    expect(practiceSessionRepository.insertItems).toHaveBeenCalledWith(SESSION.toString(), 0, [
      expect.objectContaining({ questionId: N2Q.toString(), skillCode: 'N2', reinforcementSkill: 'N2' }),
      expect.objectContaining({ questionId: E4.toString(), skillCode: 'A4', reinforcementSkill: null }),
    ]);
  });

  it('says so when nothing easier exists or the daily cap is reached, without inserting', async () => {
    usePool([question(Q2, 5)]);
    const reinforced = Array.from({ length: MAX_REINFORCEMENTS_PER_DAY }, () => ({ questionId: new Types.ObjectId(), reinforcedWith: 1, ...answered }));
    vi.mocked(practiceSessionRepository.findById).mockResolvedValue(sessionWith([{ questionId: Q2, stuckStage: 2 }, ...reinforced]));

    const res = (await hintPracticeService(USER.toString(), input)).data as PracticeHintResult;

    expect(practiceSessionRepository.revealStage).toHaveBeenCalledWith(SESSION.toString(), 0, 2, 0, 0);
    expect(practiceSessionRepository.insertItems).not.toHaveBeenCalled();
    expect(res.hints.at(-1)).toMatchObject({ kind: 'reinforce', text: HINT_COPY.reinforceNone });
  });
});

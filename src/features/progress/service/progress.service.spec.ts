import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/practice-session.repository', () => ({ practiceSessionRepository: { findByUser: vi.fn() } }));
vi.mock('@/features/course/repository/course.repository', () => ({ courseRepository: { findActiveByUser: vi.fn() } }));
vi.mock('@/features/course/repository/course-day.repository', () => ({ courseDayRepository: { countCompleted: vi.fn() } }));
vi.mock('@/features/mastery/repository/mastery.repository', () => ({ masteryRepository: { findByUser: vi.fn() } }));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn() } }));

import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { CourseDocument, CourseModel } from '@/features/course/schema/course.schema';
import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import { MasteryDocument, MasteryModel } from '@/features/mastery/schema/mastery.schema';
import { getLearningStatsService, getProgressService } from '@/features/progress/service/progress.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument, SkillModel } from '@/features/skill/schema/skill.schema';
import { XP_RULES } from '@/shared/const/progress.const';

const NOW = new Date('2026-11-24T10:00:00Z');

// Fixtures are built with the real models (no DB needed), so they are properly typed documents.
const USER = new Types.ObjectId();
const session = (answers: { at: string; correct: boolean; question?: boolean }[], completedAt?: string): PracticeSessionDocument =>
  new PracticeSessionModel({
    userId: USER,
    courseId: new Types.ObjectId(),
    dayIndex: 0,
    completedAt: completedAt ? new Date(completedAt) : undefined,
    items: answers.map((a, blockIndex) => ({
      blockIndex,
      kind: a.question === false ? 'theory' : 'practice',
      questionId: a.question === false ? undefined : new Types.ObjectId(),
      correct: a.correct,
      answeredAt: new Date(a.at),
    })),
  }).toObject();
const mastery = (skillCode: string, value: number, observations: number): MasteryDocument =>
  new MasteryModel({ userId: USER, skillCode, value, observations }).toObject();
const skill = (code: string, nameKa: string): SkillDocument =>
  new SkillModel({ code, nameKa, topic: code[0], nameEn: code, examWeight: 1, minPracticeMinutes: 10 }).toObject();

beforeEach(() => {
  vi.mocked(practiceSessionRepository.findByUser).mockResolvedValue([
    session([{ at: '2026-11-23T09:00:00Z', correct: true }], '2026-11-23T09:01:00Z'),
    session([
      { at: '2026-11-24T09:00:00Z', correct: true, question: false },
      { at: '2026-11-24T09:03:00Z', correct: false },
    ]),
  ]);
  const course: CourseDocument = new CourseModel({
    userId: USER,
    minutesPerDay: 60,
    durationDays: 30,
    startDate: new Date('2026-11-23T00:00:00Z'),
    skills: ['A1', 'A2'],
  }).toObject();
  vi.mocked(courseRepository.findActiveByUser).mockResolvedValue(course);
  vi.mocked(courseDayRepository.countCompleted).mockResolvedValue(1);
  vi.mocked(masteryRepository.findByUser).mockResolvedValue([mastery('A1', 0.6, 3), mastery('G1', 0.4, 1), mastery('N1', 0.35, 0)]);
  vi.mocked(skillRepository.findAll).mockResolvedValue([skill('A1', 'წრფივი განტოლება'), skill('A2', 'კვადრატული განტოლება'), skill('G1', 'სამკუთხედი')]);
});

describe('getLearningStatsService', () => {
  it('derives streak, XP, minutes and the daily goal from stored sessions', async () => {
    const stats = await getLearningStatsService('u1', NOW);
    expect(stats).toEqual({
      streakDays: 2,
      xp: XP_RULES.correct + XP_RULES.dayBonus + XP_RULES.theory + XP_RULES.wrong,
      minutesToday: 4,
      dailyGoalMinutes: 60,
    });
  });
});

describe('getProgressService', () => {
  it('lists course skills first, then other practised skills, and counts answers', async () => {
    const view = await getProgressService('u1', NOW);
    expect(view.skills.map((s) => s.code)).toEqual(['A1', 'A2', 'G1']);
    expect(view.skills[1]).toEqual({ code: 'A2', nameKa: 'კვადრატული განტოლება', value: 0, observations: 0 });
    expect(view.answeredCount).toBe(2);
    expect(view.correctCount).toBe(1);
    expect(view.course).toEqual({ daysCompleted: 1, durationDays: 30, todayIndex: 1 });
    expect(view.activeToday).toBe(true);
    expect(view.xpToday).toBe(XP_RULES.theory + XP_RULES.wrong);
  });
});

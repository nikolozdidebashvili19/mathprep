import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/course.repository', () => ({
  courseRepository: { findActiveByUser: vi.fn(), create: vi.fn(), abandon: vi.fn() },
}));
vi.mock('@/features/course/repository/course-day.repository', () => ({
  courseDayRepository: { insertMany: vi.fn(), findRange: vi.fn() },
}));
vi.mock('@/features/diagnostic/repository/diagnostic-session.repository', () => ({
  diagnosticSessionRepository: { countCompletedByUser: vi.fn(), findCompletedByUser: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/features/mastery/service/mastery.service', () => ({
  ensureMasteryService: vi.fn(),
  rebuildMasteryService: vi.fn(),
  getMasteryMapService: vi.fn(async (_u: string, codes: string[]) => new Map(codes.map((c) => [c, { skillCode: c, value: 0.2, observations: 1 }]))),
}));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn() } }));

import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { CourseDayDocument } from '@/features/course/schema/course-day.schema';
import { CourseDocument } from '@/features/course/schema/course.schema';
import {
  abandonCourseService,
  createCourseService,
  getActiveCourseService,
  getCoursePreviewsService,
} from '@/features/course/service/course.service';
import { CoursePreview } from '@/features/course/types/course.types';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { rebuildMasteryService } from '@/features/mastery/service/mastery.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';

const USER = new Types.ObjectId().toString();
const COURSE = new Types.ObjectId();
const skills = [
  { code: 'N2', topic: 'N', nameKa: 'წილადები', examWeight: 1.4, minPracticeMinutes: 60, prerequisites: [] },
  { code: 'A7', topic: 'A', nameKa: 'კვადრატული', examWeight: 1.3, minPracticeMinutes: 90, prerequisites: ['N2'] },
] as SkillDocument[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(skillRepository.findAll).mockResolvedValue(skills);
  vi.mocked(diagnosticSessionRepository.countCompletedByUser).mockResolvedValue(1);
  vi.mocked(courseRepository.findActiveByUser).mockResolvedValue(null);
});

describe('getCoursePreviewsService', () => {
  it('needs a finished diagnostic', async () => {
    vi.mocked(diagnosticSessionRepository.countCompletedByUser).mockResolvedValue(0);
    expect((await getCoursePreviewsService(USER)).data).toEqual({ error: 'NO_DIAGNOSTIC' });
  });

  it('plans all 12 duration × daily-time options with per-topic coverage', async () => {
    const previews = (await getCoursePreviewsService(USER)).data as CoursePreview[];
    expect(previews).toHaveLength(12);
    expect(previews[0]).toMatchObject({ months: 1, minutesPerDay: 30 });
    expect(previews.at(-1)).toMatchObject({ months: 5, minutesPerDay: 120, skillCount: 2, omittedCount: 0, realistic: true });
    expect(previews.at(-1)?.topics.map((t) => t.code)).toEqual(['N', 'A']);
  });
});

describe('createCourseService', () => {
  it('refuses a second active course', async () => {
    vi.mocked(courseRepository.findActiveByUser).mockResolvedValue({ _id: COURSE } as CourseDocument);
    expect((await createCourseService(USER, { months: 1, minutesPerDay: 60 })).data).toEqual({ error: 'COURSE_EXISTS' });
  });

  it('rebuilds mastery, stores the course and one document per day', async () => {
    vi.mocked(courseRepository.create).mockResolvedValue({ _id: COURSE } as CourseDocument);
    const res = await createCourseService(USER, { months: 1, minutesPerDay: 60 });

    expect(res).toEqual({ data: { courseId: COURSE.toString() }, status: 201 });
    expect(rebuildMasteryService).toHaveBeenCalledWith(USER);
    expect(vi.mocked(courseRepository.create).mock.calls[0][0]).toMatchObject({ durationDays: 30, minutesPerDay: 60, skills: ['N2', 'A7'] });
    const days = vi.mocked(courseDayRepository.insertMany).mock.calls[0][0];
    expect(days).toHaveLength(30);
    expect(days[1].date.getTime() - days[0].date.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('getActiveCourseService', () => {
  it('returns null without a course, otherwise today and the next days with skill names', async () => {
    expect(await getActiveCourseService(USER)).toBeNull();

    const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    vi.mocked(courseRepository.findActiveByUser).mockResolvedValue({
      _id: COURSE,
      durationDays: 30,
      minutesPerDay: 60,
      startDate,
      skills: ['N2'],
      omittedSkills: ['A7'],
      coverage: 0.5,
      realistic: false,
    } as CourseDocument);
    vi.mocked(courseDayRepository.findRange).mockResolvedValue([
      { dayIndex: 2, date: startDate, blocks: [{ kind: 'practice', skillCode: 'N2', minutes: 30 }] },
      { dayIndex: 3, date: startDate, blocks: [] },
    ] as CourseDayDocument[]);

    const view = await getActiveCourseService(USER);
    expect(view?.todayIndex).toBe(2);
    expect(view?.today?.blocks[0]).toMatchObject({ skillName: 'წილადები', minutes: 30 });
    expect(view?.upcoming.map((d) => d.dayIndex)).toEqual([3]);
    expect(view?.omitted).toEqual([{ code: 'A7', nameKa: 'კვადრატული' }]);
  });
});

describe('abandonCourseService', () => {
  it('ends the active course', async () => {
    expect((await abandonCourseService(USER)).status).toBe(404);
    vi.mocked(courseRepository.findActiveByUser).mockResolvedValue({ _id: COURSE } as CourseDocument);
    expect((await abandonCourseService(USER)).status).toBe(200);
    expect(courseRepository.abandon).toHaveBeenCalledWith(COURSE.toString(), USER);
  });
});

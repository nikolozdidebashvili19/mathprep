import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { CourseDayDocument } from '@/features/course/schema/course-day.schema';
import { planCourse, skillStatus } from '@/features/course/service/planner';
import { CoursePlan, CoursePreview, CourseView, DayView } from '@/features/course/types/course.types';
import { CreateCourseType } from '@/features/course/validations/course.validation';
import { diagnosticSessionRepository } from '@/features/diagnostic/repository/diagnostic-session.repository';
import { ensureMasteryService, getMasteryMapService, rebuildMasteryService } from '@/features/mastery/service/mastery.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { DailyMinutes, DAYS_PER_MONTH } from '@/shared/const/course.const';
import { COURSE_DURATION_MONTHS, DAILY_MINUTES_OPTIONS, MASTERY_PRIOR } from '@/shared/const/domain.const';
import { TOPICS } from '@/shared/const/topics.const';
import { ServiceResult } from '@/shared/types/common';
import { courseDayIndex, DAY_MS, startOfUtcDay } from '@/shared/utils/date';

const UPCOMING_DAYS = 6;
const OMITTED_PREVIEW = 6;


type PlanningInputs = { skills: SkillDocument[]; mastery: Map<string, number>; observed: Set<string> };

async function loadPlanningInputs(userId: string): Promise<PlanningInputs> {
  const skills = await skillRepository.findAll();
  const states = [...(await getMasteryMapService(userId, skills.map((s) => s.code))).values()];
  return {
    skills,
    mastery: new Map(states.map((m) => [m.skillCode, m.value])),
    observed: new Set(states.filter((m) => m.observations > 0).map((m) => m.skillCode)),
  };
}

function toPreview(plan: CoursePlan, months: number, skills: SkillDocument[]): CoursePreview {
  const topicOf = new Map(skills.map((s) => [s.code, s.topic]));
  const nameOf = new Map(skills.map((s) => [s.code, s.nameKa]));
  const needed = [...plan.skills.map((s) => s.code), ...plan.omitted];
  return {
    months,
    minutesPerDay: plan.minutesPerDay,
    skillCount: plan.skills.length,
    omittedCount: plan.omitted.length,
    coverage: plan.coverage,
    realistic: plan.realistic,
    topics: TOPICS.map((t) => ({
      code: t.code,
      nameKa: t.nameKa,
      covered: plan.skills.filter((s) => s.topic === t.code).length,
      needed: needed.filter((c) => topicOf.get(c) === t.code).length,
    })).filter((t) => t.needed > 0),
    omittedNames: plan.omitted.slice(0, OMITTED_PREVIEW).map((c) => nameOf.get(c) ?? c),
  };
}

/**
 * Setup screen data: every duration × daily-time option planned from the student's current mastery
 * (the planner is fast and deterministic, so all 12 are computed up front and switching is instant).
 */
export async function getCoursePreviewsService(userId: string): Promise<ServiceResult<CoursePreview[]>> {
  if ((await diagnosticSessionRepository.countCompletedByUser(userId)) === 0) return { data: { error: 'NO_DIAGNOSTIC' }, status: 409 };
  await ensureMasteryService(userId);
  const { skills, mastery, observed } = await loadPlanningInputs(userId);
  const previews = COURSE_DURATION_MONTHS.flatMap((months) =>
    DAILY_MINUTES_OPTIONS.map((minutesPerDay) =>
      toPreview(planCourse({ skills, mastery, observed, durationDays: months * DAYS_PER_MONTH, minutesPerDay }), months, skills)
    )
  );
  return { data: previews, status: 200 };
}

/** Rebuilds mastery from every diagnostic, plans the course and stores it with one document per day. */
export async function createCourseService(userId: string, input: CreateCourseType): Promise<ServiceResult<{ courseId: string }>> {
  if ((await diagnosticSessionRepository.countCompletedByUser(userId)) === 0) return { data: { error: 'NO_DIAGNOSTIC' }, status: 409 };
  if (await courseRepository.findActiveByUser(userId)) return { data: { error: 'COURSE_EXISTS' }, status: 409 };

  await rebuildMasteryService(userId);
  const { skills, mastery, observed } = await loadPlanningInputs(userId);
  const minutesPerDay: DailyMinutes = input.minutesPerDay;
  const plan = planCourse({ skills, mastery, observed, durationDays: input.months * DAYS_PER_MONTH, minutesPerDay });
  const startDate = startOfUtcDay(new Date());

  const course = await courseRepository.create({
    userId,
    durationDays: plan.durationDays,
    minutesPerDay,
    startDate,
    skills: plan.skills.map((s) => s.code),
    omittedSkills: plan.omitted,
    coverage: plan.coverage,
    realistic: plan.realistic,
  });
  const courseId = course._id.toString();
  await courseDayRepository.insertMany(
    plan.days.map((d) => ({ courseId, dayIndex: d.dayIndex, date: new Date(startDate.getTime() + d.dayIndex * DAY_MS), blocks: d.blocks }))
  );
  return { data: { courseId }, status: 201 };
}

function toDayView(day: CourseDayDocument, nameOf: Map<string, string>): DayView {
  return {
    dayIndex: day.dayIndex,
    date: new Date(day.date).toISOString(),
    completed: day.completed,
    blocks: day.blocks.map((b) => ({
      kind: b.kind,
      skillCode: b.skillCode ?? null,
      skillName: b.skillCode ? nameOf.get(b.skillCode) ?? b.skillCode : null,
      minutes: b.minutes,
    })),
  };
}

/** The active course with today's plan and the next days, or null when the student has none. */
export async function getActiveCourseService(userId: string): Promise<CourseView | null> {
  const course = await courseRepository.findActiveByUser(userId);
  if (!course) return null;

  const todayIndex = courseDayIndex(new Date(course.startDate), new Date(), course.durationDays);
  const [days, { skills, mastery, observed }] = await Promise.all([
    courseDayRepository.findRange(course._id.toString(), 0, todayIndex + UPCOMING_DAYS),
    loadPlanningInputs(userId),
  ]);
  const nameOf = new Map(skills.map((s) => [s.code, s.nameKa]));
  const topicOf = new Map(skills.map((s) => [s.code, s.topic]));
  const views = days.map((d) => toDayView(d, nameOf));

  return {
    id: course._id.toString(),
    durationDays: course.durationDays,
    minutesPerDay: course.minutesPerDay,
    startDate: new Date(course.startDate).toISOString(),
    todayIndex,
    coverage: course.coverage ?? 0,
    realistic: course.realistic ?? true,
    today: views.find((d) => d.dayIndex === todayIndex) ?? null,
    todayCompleted: days.find((d) => d.dayIndex === todayIndex)?.completed ?? false,
    upcoming: views.filter((d) => d.dayIndex > todayIndex),
    pastDays: views.filter((d) => d.dayIndex < todayIndex).reverse(),
    plannedSkills: course.skills.map((code) => ({
      code,
      nameKa: nameOf.get(code) ?? code,
      topic: topicOf.get(code) ?? '',
      status: skillStatus(mastery.get(code) ?? MASTERY_PRIOR, observed.has(code)),
    })),
    omitted: course.omittedSkills.map((code) => ({ code, nameKa: nameOf.get(code) ?? code })),
  };
}

/** Ends the active course so the student can set up a new one (e.g. after another diagnostic). */
export async function abandonCourseService(userId: string): Promise<ServiceResult<{ abandoned: true }>> {
  const course = await courseRepository.findActiveByUser(userId);
  if (!course) return { data: { error: 'NOT_FOUND' }, status: 404 };
  await courseRepository.abandon(course._id.toString(), userId);
  return { data: { abandoned: true }, status: 200 };
}

export async function hasActiveCourseService(userId: string): Promise<boolean> {
  return (await courseRepository.findActiveByUser(userId)) !== null;
}

/**
 * T-018 course planner (Layer 4, PRODUCT.md). Deterministic and pure: same inputs → same plan. No AI decides the plan.
 *
 * 1. Time budget: every WEEKLY_CHECK_EVERY_DAYS-th day is a weekly check and the last day is the final mock
 *    (the ~15% reserve); the other days are learning days with a focus capacity of theory + practice minutes.
 * 2. Priority = gap × examWeight × readiness × status factor (gap = TARGET_MASTERY − mastery; readiness 1 if every
 *    prerequisite is ≥ MASTERY_READY, else NOT_READY_FACTOR). Weak-first: a skill the evidence shows weak (below the
 *    prior) is boosted (WEAK_PRIORITY_BOOST); a skill never observed is damped (UNTESTED_PRIORITY_FACTOR) and gets a
 *    UNTESTED_CHECKIN_DAYS check-in instead of full lessons; the weekly check then confirms it.
 *    Only prerequisites the evidence shows not ready ("blocking") lower readiness, get pulled in and must come first;
 *    an untested prerequisite gets the benefit of the doubt (photo analysis blames a prerequisite directly when it is
 *    the real cause, which makes it observed).
 * 3. Fill the budget in priority order. A skill needs minPracticeMinutes × gap minutes, i.e.
 *    ceil(minutes / focus capacity) learning days. Unready prerequisites are pulled in with it (and before it);
 *    whatever does not fit is reported as omitted.
 * 4. Order: prerequisites first; among ready skills the highest rank wins, where rank = the best gap × weight of the
 *    skill and of everything it unlocks (so N1 → A4 → A12 starts early); the same topic is not repeated when
 *    another ready skill is close in rank.
 * Student level (from the diagnostic score) changes steps 2–4:
 *   beginner     — every prerequisite not shown to be known is taught first (no benefit of the doubt), untested
 *                  skills get full lessons, and the order is foundations first (prerequisite depth, then rank),
 *                  so a student who scored 0 starts from natural numbers, not from pyramids;
 *   intermediate — evidence-based prerequisites as above, but the order is still foundations first;
 *   advanced     — weak-first by value, as described above.
 * 5. Days: theory on a skill's first day, practice on the focus skill, drills on the weakest skill started so far,
 *    revision of skills finished 3 / 7 / 14 days earlier. Learning days left at the end become mixed exam practice.
 */
import { prerequisiteDepths } from '@/features/course/service/student-level';
import {
  CoursePlan,
  StudentLevel,
  PlanBlock,
  PlanDay,
  PlannedSkill,
  PlannedSkillStatus,
  PlannerSkillInput,
} from '@/features/course/types/course.types';
import {
  DailyMinutes,
  NOT_READY_FACTOR,
  REALISTIC_COVERAGE,
  REVISION_INTERVALS_DAYS,
  SESSION_TEMPLATES,
  TARGET_MASTERY,
  UNTESTED_CHECKIN_DAYS,
  UNTESTED_PRIORITY_FACTOR,
  WEAK_PRIORITY_BOOST,
  WEEKLY_CHECK_EVERY_DAYS,
} from '@/shared/const/course.const';
import { MASTERY_PRIOR, MASTERY_READY } from '@/shared/const/domain.const';

/** `priority` (with readiness) decides what is selected; `value` (gap × weight) decides the teaching order. */
type Candidate = PlannerSkillInput & {
  /** Prerequisites the evidence shows below MASTERY_READY: they must be taught first. */
  blocking: string[];
  gap: number;
  value: number;
  priority: number;
  minutes: number;
  days: number;
  status: PlannedSkillStatus;
};

/** Weak = the evidence put it below the prior; untested = no evidence; partial = evidence, gap left. */
export const skillStatus = (value: number, isObserved: boolean): PlannedSkillStatus =>
  !isObserved ? 'untested' : value < MASTERY_PRIOR ? 'weak' : 'partial';

const STATUS_FACTOR: Record<PlannedSkillStatus, number> = {
  weak: WEAK_PRIORITY_BOOST,
  partial: 1,
  untested: UNTESTED_PRIORITY_FACTOR,
};

const isCheckDay = (dayIndex: number, totalDays: number) =>
  dayIndex === totalDays - 1 || (dayIndex + 1) % WEEKLY_CHECK_EVERY_DAYS === 0;

function toCandidates(
  skills: PlannerSkillInput[],
  mastery: ReadonlyMap<string, number>,
  observed: ReadonlySet<string>,
  focusMinutes: number,
  level: StudentLevel
): Map<string, Candidate> {
  const beginner = level === 'beginner';
  const m = (code: string) => mastery.get(code) ?? MASTERY_PRIOR;
  const out = new Map<string, Candidate>();
  for (const s of skills) {
    const gap = Math.round((TARGET_MASTERY - m(s.code)) * 1000) / 1000;
    if (gap <= 0) continue;
    const status = skillStatus(m(s.code), observed.has(s.code));
    // A beginner gets no benefit of the doubt: an untested prerequisite is taught first too.
    const blocking = s.prerequisites.filter((p) => (beginner || observed.has(p)) && m(p) < MASTERY_READY);
    const readiness = blocking.length === 0 ? 1 : NOT_READY_FACTOR;
    const minutes = Math.ceil(s.minPracticeMinutes * gap);
    // An untested skill is only a short check-in for students who already know a lot; a beginner learns it properly.
    const days = status === 'untested' && !beginner ? UNTESTED_CHECKIN_DAYS : Math.max(1, Math.ceil(minutes / focusMinutes));
    const value = gap * s.examWeight * (beginner && status === 'untested' ? 1 : STATUS_FACTOR[status]);
    out.set(s.code, { ...s, blocking, gap, value, priority: value * readiness, minutes, days, status });
  }
  return out;
}

/** The skill plus every unselected blocking prerequisite (recursively), prerequisites first. */
function withMissingPrerequisites(code: string, candidates: Map<string, Candidate>, selected: Set<string>): string[] {
  const out: string[] = [];
  const visit = (c: string) => {
    if (selected.has(c) || out.includes(c) || !candidates.has(c)) return;
    candidates.get(c)!.blocking.forEach(visit);
    out.push(c);
  };
  visit(code);
  return out;
}

/** Best value of the skill and of every selected skill that (transitively) depends on it. */
function unlockRanks(chosen: Candidate[]): Map<string, number> {
  const rank = new Map<string, number>();
  const dependents = (code: string) => chosen.filter((c) => c.blocking.includes(code));
  const visit = (c: Candidate): number => {
    const known = rank.get(c.code);
    if (known !== undefined) return known;
    const value = Math.max(c.value, ...dependents(c.code).map(visit));
    rank.set(c.code, value);
    return value;
  };
  chosen.forEach(visit);
  return rank;
}

function orderInterleaved(chosen: Candidate[], depths: ReadonlyMap<string, number> | null): Candidate[] {
  const rank = unlockRanks(chosen);
  const r = (c: Candidate) => rank.get(c.code) ?? c.value;
  const depth = (c: Candidate) => depths?.get(c.code) ?? 0;
  const remaining = new Map(chosen.map((c) => [c.code, c]));
  const ordered: Candidate[] = [];
  while (remaining.size > 0) {
    // Foundations first (when depths are given): only the most basic ready skills compete, then rank decides.
    const unblocked = [...remaining.values()].filter((c) => c.blocking.every((p) => !remaining.has(p)));
    const minDepth = Math.min(...unblocked.map(depth));
    const ready = unblocked.filter((c) => depth(c) === minDepth).sort((a, b) => r(b) - r(a) || a.code.localeCompare(b.code));
    const lastTopic = ordered.at(-1)?.topic;
    const other = ready.find((c) => c.topic !== lastTopic);
    const pick = ready[0].topic === lastTopic && other && (depths !== null || r(other) >= r(ready[0]) / 2) ? other : ready[0];
    ordered.push(pick);
    remaining.delete(pick.code);
  }
  return ordered;
}

function buildDays(order: Candidate[], totalDays: number, minutesPerDay: DailyMinutes, mastery: ReadonlyMap<string, number>): PlanDay[] {
  const t = SESSION_TEMPLATES[minutesPerDay];
  const queue = order.flatMap((c) => Array.from({ length: c.days }, (_, i) => ({ code: c.code, first: i === 0, last: i === c.days - 1 })));
  const finishedOn = new Map<string, number>();
  const started: string[] = [];
  const days: PlanDay[] = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    if (isCheckDay(dayIndex, totalDays)) {
      days.push({ dayIndex, blocks: [{ kind: dayIndex === totalDays - 1 ? 'mock' : 'check', skillCode: null, minutes: minutesPerDay }] });
      continue;
    }
    const slot = queue.shift();
    const blocks: PlanBlock[] = [];
    if (slot) {
      if (!started.includes(slot.code)) started.push(slot.code);
      if (slot.first) blocks.push({ kind: 'theory', skillCode: slot.code, minutes: t.theory });
      blocks.push({ kind: 'practice', skillCode: slot.code, minutes: slot.first ? t.practice : t.practice + t.theory });
      if (slot.last) finishedOn.set(slot.code, dayIndex);
    } else {
      blocks.push({ kind: 'practice', skillCode: null, minutes: t.theory + t.practice });
    }
    if (t.drill > 0) {
      const weakest = started
        .filter((c) => c !== slot?.code)
        .sort((a, b) => (mastery.get(a) ?? MASTERY_PRIOR) - (mastery.get(b) ?? MASTERY_PRIOR))[0];
      blocks.push({ kind: 'drill', skillCode: weakest ?? slot?.code ?? null, minutes: t.drill });
    }
    const due = [...finishedOn.entries()].find(([, day]) => REVISION_INTERVALS_DAYS.some((gap) => dayIndex - day === gap));
    blocks.push({ kind: 'revision', skillCode: due ? due[0] : null, minutes: t.revision });
    days.push({ dayIndex, blocks });
  }
  return days;
}

export function planCourse(input: {
  skills: PlannerSkillInput[];
  mastery: ReadonlyMap<string, number>;
  /** Skills with at least one observation; defaults to every skill in `mastery`. */
  observed?: ReadonlySet<string>;
  durationDays: number;
  minutesPerDay: DailyMinutes;
  /** From the diagnostic score; decides how much prior knowledge the plan may assume (default advanced). */
  level?: StudentLevel;
}): CoursePlan {
  const { skills, mastery, durationDays, minutesPerDay } = input;
  const level = input.level ?? 'advanced';
  const observed = input.observed ?? new Set(mastery.keys());
  const template = SESSION_TEMPLATES[minutesPerDay];
  const learningDays = Array.from({ length: durationDays }, (_, i) => i).filter((i) => !isCheckDay(i, durationDays)).length;
  const candidates = toCandidates(skills, mastery, observed, template.theory + template.practice, level);

  const selected = new Set<string>();
  let daysLeft = learningDays;
  const ranked = [...candidates.values()].sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));
  for (const c of ranked) {
    const bundle = withMissingPrerequisites(c.code, candidates, selected);
    const cost = bundle.reduce((sum, code) => sum + candidates.get(code)!.days, 0);
    if (bundle.length === 0 || cost > daysLeft) continue;
    bundle.forEach((code) => selected.add(code));
    daysLeft -= cost;
  }

  const order = orderInterleaved([...selected].map((code) => candidates.get(code)!), level === 'advanced' ? null : prerequisiteDepths(skills));
  const weighted = (list: Candidate[]) => list.reduce((sum, c) => sum + c.gap * c.examWeight, 0);
  const coverage = weighted([...candidates.values()]) === 0 ? 1 : weighted(order) / weighted([...candidates.values()]);

  const planned: PlannedSkill[] = order.map((c) => ({
    code: c.code,
    topic: c.topic,
    gap: c.gap,
    priority: Math.round(c.priority * 1000) / 1000,
    days: c.days,
    status: c.status,
  }));
  return {
    durationDays,
    minutesPerDay,
    level,
    learningDays,
    skills: planned,
    omitted: ranked.filter((c) => !selected.has(c.code)).map((c) => c.code),
    coverage: Math.round(coverage * 100) / 100,
    realistic: coverage >= REALISTIC_COVERAGE,
    days: buildDays(order, durationDays, minutesPerDay, mastery),
  };
}

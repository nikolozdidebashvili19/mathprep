/**
 * T-020 question picker (pure, deterministic). Practice comes from the past-exam pool until parametric templates
 * (T-021) exist; the newest papers stay reserved for the full mock, filtered out before this is called.
 */
import { MAX_QUESTIONS_PER_BLOCK, minutesPerQuestion, RAMP_ABOVE_TARGET, RAMP_BELOW_TARGET } from '@/shared/const/course.const';
import { MAX_DIFFICULTY, MIN_DIFFICULTY } from '@/shared/const/domain.const';

export type PickableQuestion = { id: string; code: string; difficulty: number; primarySkill: string; skills: string[] };

export type PickRequest = {
  pool: PickableQuestion[];
  /** null = mixed (exam practice or revision of saved mistakes). */
  skillCode: string | null;
  minutes: number;
  /** Student's mastery of the skill (or the average for mixed blocks), 0–1. */
  mastery: number;
  seen: ReadonlySet<string>;
  /** Questions answered wrong before: preferred for revision. */
  wrong: ReadonlySet<string>;
  /** For mixed blocks: the course's skills. */
  courseSkills: ReadonlySet<string>;
  /** Questions already used today (never repeated within a day). */
  usedToday: ReadonlySet<string>;
  /** Day index: rotates ties so consecutive days do not show the same questions. */
  seed: number;
  revision: boolean;
};

/** Difficulty just below the 50%-success point of the mastery model, so practice is challenging but doable. */
export const targetDifficulty = (mastery: number) =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(1 + (mastery - 0.15) / 0.2)));

export const questionCount = (minutes: number, difficulty: number) =>
  Math.min(MAX_QUESTIONS_PER_BLOCK, Math.max(1, Math.round(minutes / minutesPerQuestion(difficulty))));

/** Stable pseudo-random rank for tie-breaking (FNV-1a of code + seed). */
const tieRank = (code: string, seed: number) => {
  let h = 2166136261 ^ seed;
  for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/**
 * Difficulty ladder for a block: from one step below the target up to one step above it, so the first questions
 * are familiar and each next one is a little harder (never a jump straight to the hardest).
 */
export function difficultyRamp(target: number, count: number): number[] {
  const lo = Math.max(MIN_DIFFICULTY, target - RAMP_BELOW_TARGET);
  const hi = Math.min(MAX_DIFFICULTY, target + RAMP_ABOVE_TARGET);
  if (count <= 1) return [lo];
  return Array.from({ length: count }, (_, i) => lo + ((hi - lo) * i) / (count - 1));
}

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

export function pickQuestions(req: PickRequest): string[] {
  const target = targetDifficulty(req.mastery);
  const count = questionCount(req.minutes, target);
  const matches = (q: PickableQuestion) =>
    req.skillCode ? q.skills.includes(req.skillCode) : q.skills.some((s) => req.courseSkills.has(s));
  const remaining = req.pool.filter((q) => matches(q) && !req.usedToday.has(q.id));

  const score = (q: PickableQuestion, slotDifficulty: number) => [
    req.revision && req.wrong.has(q.id) ? 0 : 1, // revision: saved mistakes first
    req.seen.has(q.id) && !(req.revision && req.wrong.has(q.id)) ? 1 : 0, // then unseen
    req.skillCode && q.primarySkill !== req.skillCode ? 1 : 0, // the skill as the main topic
    Math.abs(q.difficulty - slotDifficulty),
    tieRank(q.code, req.seed),
  ];

  // Fill each rung of the ramp with the best remaining question, then present them easiest first.
  const picked: PickableQuestion[] = [];
  for (const slot of difficultyRamp(target, count)) {
    if (remaining.length === 0) break;
    let best = 0;
    for (let i = 1; i < remaining.length; i++) if (compare(score(remaining[i], slot), score(remaining[best], slot)) < 0) best = i;
    picked.push(remaining.splice(best, 1)[0]);
  }
  return picked
    .map((q, order) => ({ q, order }))
    .sort((a, b) => a.q.difficulty - b.q.difficulty || a.order - b.order)
    .map((x) => x.q.id);
}

/**
 * Second chance after a wrong answer: another question on the same skill, never harder than the one missed and
 * ideally one step easier, not already in today's session; unseen questions first.
 */
export function pickSecondChance(input: {
  pool: PickableQuestion[];
  failed: { skill: string; difficulty: number };
  exclude: ReadonlySet<string>;
  seen: ReadonlySet<string>;
  seed: number;
}): string | null {
  const ideal = Math.max(MIN_DIFFICULTY, input.failed.difficulty - 1);
  const candidates = input.pool.filter(
    (q) => q.primarySkill === input.failed.skill && q.difficulty <= input.failed.difficulty && !input.exclude.has(q.id)
  );
  const score = (q: PickableQuestion) => [input.seen.has(q.id) ? 1 : 0, Math.abs(q.difficulty - ideal), tieRank(q.code, input.seed)];
  candidates.sort((a, b) => compare(score(a), score(b)));
  return candidates[0]?.id ?? null;
}

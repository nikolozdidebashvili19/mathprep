/**
 * T-020 question picker (pure, deterministic). Practice comes from the past-exam pool until parametric templates
 * (T-021) exist; the newest papers stay reserved for the full mock, filtered out before this is called.
 */
import {
  LEVELS_ABOVE_HARDEST_SOLVED,
  MAX_REINFORCEMENT_QUESTIONS,
  MAX_QUESTIONS_PER_BLOCK,
  minutesPerQuestion,
  RAMP_ABOVE_TARGET,
  RAMP_BELOW_TARGET,
} from '@/shared/const/course.const';
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
  /**
   * Readiness ceiling per skill (hardest solved + LEVELS_ABOVE_HARDEST_SOLVED): harder questions are a last resort,
   * so exam-level questions only appear once the levels below them have been solved. Missing skill = no ceiling.
   */
  ceiling?: ReadonlyMap<string, number>;
  /** Fixed number of questions (otherwise from the block's minutes). */
  count?: number;
  /** Mixed blocks only: questions whose main skill is one of these (spaced reviews that are due). */
  focusSkills?: ReadonlySet<string>;
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
 * are familiar and each next one is a little harder (never a jump straight to the hardest). The readiness ceiling
 * caps both ends: a student who has not solved level 2 yet practises at level 2 at most, whatever the target.
 */
export function difficultyRamp(target: number, count: number, ceiling: number = MAX_DIFFICULTY): number[] {
  const cap = Math.max(MIN_DIFFICULTY, ceiling);
  const lo = Math.min(cap, Math.max(MIN_DIFFICULTY, target - RAMP_BELOW_TARGET));
  const hi = Math.max(lo, Math.min(cap, MAX_DIFFICULTY, target + RAMP_ABOVE_TARGET));
  if (count <= 1) return [lo];
  return Array.from({ length: count }, (_, i) => lo + ((hi - lo) * i) / (count - 1));
}

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/** Highest difficulty the student is ready for on a skill: one level above the hardest question solved on it. */
export const readinessCeiling = (hardestCorrect: number) =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, hardestCorrect + LEVELS_ABOVE_HARDEST_SOLVED));

export function pickQuestions(req: PickRequest): string[] {
  const target = targetDifficulty(req.mastery);
  const count = req.count ?? questionCount(req.minutes, target);
  const ceilingOf = (skill: string) => req.ceiling?.get(skill) ?? MAX_DIFFICULTY;
  const matches = (q: PickableQuestion) => {
    if (req.skillCode) return q.skills.includes(req.skillCode);
    if (req.focusSkills) return req.focusSkills.has(q.primarySkill);
    return q.skills.some((s) => req.courseSkills.has(s));
  };
  const remaining = req.pool.filter((q) => matches(q) && !req.usedToday.has(q.id));

  const score = (q: PickableQuestion, slotDifficulty: number) => [
    q.difficulty > ceilingOf(q.primarySkill) ? 1 : 0, // not ready for it yet: last resort
    req.revision && req.wrong.has(q.id) ? 0 : 1, // revision: saved mistakes first
    req.seen.has(q.id) && !(req.revision && req.wrong.has(q.id)) ? 1 : 0, // then unseen
    req.skillCode && q.primarySkill !== req.skillCode ? 1 : 0, // the skill as the main topic
    Math.abs(q.difficulty - slotDifficulty),
    tieRank(q.code, req.seed),
  ];

  // Fill each rung of the ramp with the best remaining question, then present them easiest first.
  const picked: PickableQuestion[] = [];
  for (const slot of difficultyRamp(target, count, req.skillCode ? ceilingOf(req.skillCode) : MAX_DIFFICULTY)) {
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

/**
 * "I'm stuck" stage 4: easier questions before the student returns to the one they are stuck on.
 * With a weakness from the photo analysis on another skill: one question on that weakness (from its easiest level),
 * then one on the original skill a level below the original. Otherwise the original skill, climbing back from two
 * levels below to one below. Unseen questions first; never harder than the original.
 */
export function pickReinforcement(input: {
  pool: PickableQuestion[];
  original: { skill: string; difficulty: number };
  weakSkill: string | null;
  exclude: ReadonlySet<string>;
  seen: ReadonlySet<string>;
  seed: number;
  max?: number;
}): string[] {
  const max = input.max ?? MAX_REINFORCEMENT_QUESTIONS;
  const used = new Set(input.exclude);
  const out: string[] = [];
  const pickOne = (skill: string, maxDifficulty: number, ideal: number) => {
    if (out.length >= max) return;
    const candidates = input.pool.filter((q) => q.primarySkill === skill && q.difficulty <= maxDifficulty && !used.has(q.id));
    const score = (q: PickableQuestion) => [input.seen.has(q.id) ? 1 : 0, Math.abs(q.difficulty - ideal), tieRank(q.code, input.seed)];
    const best = candidates.sort((a, b) => compare(score(a), score(b)))[0];
    if (!best) return;
    used.add(best.id);
    out.push(best.id);
  };
  const d = input.original.difficulty;
  const below = Math.max(MIN_DIFFICULTY, d - 1);
  if (input.weakSkill && input.weakSkill !== input.original.skill) {
    pickOne(input.weakSkill, d, MIN_DIFFICULTY);
    pickOne(input.original.skill, below, below);
  } else {
    const rungs = d - 2 >= MIN_DIFFICULTY ? [d - 2, d - 1] : [below];
    rungs.forEach((r) => pickOne(input.original.skill, r, r));
    // A missing rung falls back to an easier question, so sort: the climb back always goes easiest first.
    const level = new Map(input.pool.map((q) => [q.id, q.difficulty]));
    out.sort((x, y) => (level.get(x) ?? 0) - (level.get(y) ?? 0));
  }
  return out;
}

/**
 * Adaptive difficulty: a question on the skill at exactly this level (one above after a streak, or the missed level
 * after a wrong answer), unseen first; null when the pool has none, and the block then stays as planned.
 */
export function pickAtLevel(input: {
  pool: PickableQuestion[];
  skill: string;
  difficulty: number;
  exclude: ReadonlySet<string>;
  seen: ReadonlySet<string>;
  seed: number;
}): string | null {
  const candidates = input.pool.filter((q) => q.primarySkill === input.skill && q.difficulty === input.difficulty && !input.exclude.has(q.id));
  const score = (q: PickableQuestion) => [input.seen.has(q.id) ? 1 : 0, tieRank(q.code, input.seed)];
  return candidates.sort((a, b) => compare(score(a), score(b)))[0]?.id ?? null;
}

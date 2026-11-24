/**
 * T-020 question picker (pure, deterministic). Practice comes from the past-exam pool until parametric templates
 * (T-021) exist; the newest papers stay reserved for the full mock, filtered out before this is called.
 */
import { MAX_QUESTIONS_PER_BLOCK, minutesPerQuestion } from '@/shared/const/course.const';
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

export function pickQuestions(req: PickRequest): string[] {
  const target = targetDifficulty(req.mastery);
  const count = questionCount(req.minutes, target);
  const matches = (q: PickableQuestion) =>
    req.skillCode ? q.skills.includes(req.skillCode) : q.skills.some((s) => req.courseSkills.has(s));
  const candidates = req.pool.filter((q) => matches(q) && !req.usedToday.has(q.id));

  const score = (q: PickableQuestion) => [
    req.revision && req.wrong.has(q.id) ? 0 : 1, // revision: saved mistakes first
    req.seen.has(q.id) && !(req.revision && req.wrong.has(q.id)) ? 1 : 0, // then unseen
    req.skillCode && q.primarySkill !== req.skillCode ? 1 : 0, // the skill as the main topic
    Math.abs(q.difficulty - target),
    tieRank(q.code, req.seed),
  ];
  return candidates
    .map((q) => ({ id: q.id, s: score(q) }))
    .sort((a, b) => {
      for (let i = 0; i < a.s.length; i++) if (a.s[i] !== b.s[i]) return a.s[i] - b.s[i];
      return 0;
    })
    .slice(0, count)
    .map((x) => x.id);
}

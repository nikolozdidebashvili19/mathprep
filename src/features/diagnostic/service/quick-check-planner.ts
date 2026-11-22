/**
 * Adaptive quick check (pure, no DB): which topic comes next, how the ability estimate moves, which question to ask.
 * One question per topic, topics in exam-weight order; difficulty follows the running ability (1–5 scale).
 */
import { MAX_DIFFICULTY, MIN_DIFFICULTY, QUICK_CHECK_ABILITY_STEP } from '@/shared/const/domain.const';

export type PlannerSkill = { code: string; topic: string; examWeight: number };
export type PlannerQuestion = { id: string; primarySkill: string; difficulty: number };

/** Topics by total exam weight (heaviest first), repeated from the top if the check is longer than the topic count. */
export function planTopicOrder(skills: PlannerSkill[], length: number): string[] {
  const weightByTopic = new Map<string, number>();
  for (const s of skills) weightByTopic.set(s.topic, (weightByTopic.get(s.topic) ?? 0) + s.examWeight);
  const topics = [...weightByTopic.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  if (topics.length === 0) return [];
  return Array.from({ length }, (_, i) => topics[i % topics.length]);
}

/** Up after a correct answer, down after a wrong one or "I don't know"; stays on the difficulty scale. */
export function nextAbility(ability: number, correct: boolean): number {
  const moved = ability + (correct ? QUICK_CHECK_ABILITY_STEP : -QUICK_CHECK_ABILITY_STEP);
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, moved));
}

/**
 * The unused question in `topic` whose difficulty is closest to the ability; ties are broken at random,
 * weighted by the primary skill's exam weight. Falls back to any topic when this one is exhausted.
 */
export function pickQuestion(
  pool: PlannerQuestion[],
  skills: PlannerSkill[],
  topic: string,
  ability: number,
  usedIds: ReadonlySet<string>,
  random: () => number = Math.random
): PlannerQuestion | null {
  const skillByCode = new Map(skills.map((s) => [s.code, s]));
  const unused = pool.filter((q) => !usedIds.has(q.id) && skillByCode.has(q.primarySkill));
  const inTopic = unused.filter((q) => skillByCode.get(q.primarySkill)?.topic === topic);
  const candidates = inTopic.length > 0 ? inTopic : unused;
  if (candidates.length === 0) return null;

  const distance = (q: PlannerQuestion) => Math.abs(q.difficulty - ability);
  const best = Math.min(...candidates.map(distance));
  const closest = candidates.filter((q) => distance(q) <= best + 0.5);
  const weights = closest.map((q) => Math.max(0.05, skillByCode.get(q.primarySkill)?.examWeight ?? 0.05));
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < closest.length; i++) {
    roll -= weights[i];
    if (roll < 0) return closest[i];
  }
  return closest[closest.length - 1];
}

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { NewPracticeItem } from '@/features/course/repository/practice-session.repository';
import {
  PickableQuestion,
  pickAtLevel,
  pickQuestions,
  pickReinforcement,
  pickSecondChance,
  questionCount,
  readinessCeiling,
  targetDifficulty,
} from '@/features/course/service/practice-picker';
import { BlockKind, ScaffoldLevel, StudentLevel } from '@/features/course/types/course.types';
import { examRepository } from '@/features/exam/repository/exam.repository';
import { getMasteryMapService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { reviewOverviewService } from '@/features/revision/service/review.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { BEGINNER_START_MASTERY, SCAFFOLD_SEQUENCE } from '@/shared/const/course.const';
import { MASTERY_PRIOR, MASTERY_READY, MASTERY_WEAK_BELOW } from '@/shared/const/domain.const';
import { hasBrokenLetters } from '@/shared/utils/text-quality';

/** Practice pool: tagged MC questions outside the full-mock papers, without broken text. */
async function loadPracticePool(): Promise<QuestionDocument[]> {
  const reserved = await examRepository.findUsableForDiagnostic();
  const pool = await questionRepository.findQuickCheckPool(reserved.map((e) => e._id.toString()));
  return pool.filter((q) => ![q.text, ...q.options.map((o) => o.text)].some(hasBrokenLetters));
}

const toPickable = (q: QuestionDocument): PickableQuestion => ({
  id: q._id.toString(),
  code: q.code,
  difficulty: q.difficulty,
  primarySkill: q.primarySkill ?? '',
  skills: q.skills.map((s) => s.skillCode),
});

type DayBlock = { kind: BlockKind; skillCode?: string | null; minutes: number };

/** Guided problem solving: first question solved together, second with one hint, third alone; then nothing. */
const scaffoldAt = (position: number): ScaffoldLevel => SCAFFOLD_SEQUENCE[position] ?? 'none';

/**
 * Turns the day's blocks into session items: one per theory lesson, one per picked question.
 * - `level` = the course's student level: for a beginner, a skill with no evidence yet is practised as if mastery
 *   were BEGINNER_START_MASTERY, so the ramp starts at the easiest questions instead of exam level.
 * - Readiness ceiling: a skill's questions stay at most one level above the hardest the student has solved on it.
 * - A practice block on a new or not-yet-ready skill starts with guided problem solving (full → light → solo).
 * - The revision block reviews the skills that are due (1 / 3 / 7 / 14 days after learning), one question each,
 *   then saved mistakes; a day with a new lesson starts with a warm-up question on something learnt earlier.
 */
export async function buildDayItemsService(userId: string, dayIndex: number, blocks: DayBlock[], courseSkills: string[], level: StudentLevel = 'advanced') {
  const reviews = await reviewOverviewService(userId);
  const tracked = [...new Set([...courseSkills, ...reviews.learnt])];
  const [pool, outcomes, mastery, skills] = await Promise.all([
    loadPracticePool(),
    attemptRepository.findOutcomesByUser(userId),
    getMasteryMapService(userId, tracked),
    skillRepository.findAll(),
  ]);
  const pickable = pool.map(toPickable);
  const seen = new Set(outcomes.map((o) => o.questionId.toString()));
  const wrong = new Set(outcomes.filter((o) => o.points < o.maxPoints).map((o) => o.questionId.toString()));
  const masteryOf = (code: string) => {
    const state = mastery.get(code);
    if (level === 'beginner' && !state?.observations) return BEGINNER_START_MASTERY;
    return state?.value ?? MASTERY_PRIOR;
  };
  const ceiling = new Map([...mastery.values()].filter((m) => m.observations > 0).map((m) => [m.skillCode, readinessCeiling(m.hardestCorrect)]));
  const avgMastery = courseSkills.length ? courseSkills.reduce((sum, c) => sum + masteryOf(c), 0) / courseSkills.length : MASTERY_PRIOR;
  const theoryToday = new Set(blocks.flatMap((b) => (b.kind === 'theory' && b.skillCode ? [b.skillCode] : [])));
  const usedToday = new Set<string>();
  const items: NewPracticeItem[] = [];
  const base = { pool: pickable, seen, wrong, courseSkills: new Set(courseSkills), usedToday, seed: dayIndex, ceiling };
  const take = (ids: string[]) => ids.forEach((id) => usedToday.add(id));

  const needsGuidance = (kind: BlockKind, skill: string) =>
    (kind === 'practice' && (theoryToday.has(skill) || masteryOf(skill) < MASTERY_READY)) || (kind === 'drill' && masteryOf(skill) < MASTERY_WEAK_BELOW);

  blocks.forEach((block, blockIndex) => {
    const skillCode = block.skillCode ?? null;
    if (block.kind === 'theory') {
      const warm = skillCode ? warmupSkill(skillCode, reviews.learnt, skills) : null;
      const warmId = warm
        ? pickQuestions({ ...base, skillCode: warm, minutes: block.minutes, mastery: masteryOf(warm), revision: true, count: 1 })[0]
        : undefined;
      if (warm && warmId) {
        take([warmId]);
        items.push({ blockIndex, kind: 'revision', skillCode: warm, questionId: warmId, warmup: true, review: reviews.due.includes(warm) });
      }
      items.push({ blockIndex, kind: 'theory', skillCode, questionId: null });
      return;
    }

    if (block.kind === 'revision') {
      const ids = revisionItems(block, blockIndex, reviews.due, (code) => masteryOf(code), base, avgMastery);
      ids.forEach((it) => usedToday.add(it.questionId));
      items.push(...ids);
      return;
    }

    const ids = pickQuestions({ ...base, skillCode, minutes: block.minutes, mastery: skillCode ? masteryOf(skillCode) : avgMastery, revision: false });
    take(ids);
    const guided = skillCode !== null && needsGuidance(block.kind, skillCode);
    ids.forEach((id, i) => items.push({ blockIndex, kind: block.kind, skillCode, questionId: id, scaffold: guided ? scaffoldAt(i) : 'none' }));
  });
  return items;
}

type PickBase = Omit<Parameters<typeof pickQuestions>[0], 'skillCode' | 'minutes' | 'mastery' | 'revision'>;

/** Due reviews first (one easy-ish question per due skill, most overdue first), then saved mistakes / the plan's skill. */
function revisionItems(
  block: DayBlock,
  blockIndex: number,
  due: string[],
  masteryOf: (code: string) => number,
  base: PickBase,
  avgMastery: number
): (NewPracticeItem & { questionId: string })[] {
  const skillCode = block.skillCode ?? null;
  const total = questionCount(block.minutes, targetDifficulty(skillCode ? masteryOf(skillCode) : avgMastery));
  const out: (NewPracticeItem & { questionId: string })[] = [];
  const used = new Set(base.usedToday);
  for (const code of due) {
    if (out.length >= total) break;
    const [id] = pickQuestions({ ...base, usedToday: used, skillCode: code, minutes: block.minutes, mastery: masteryOf(code), revision: true, count: 1 });
    if (!id) continue;
    used.add(id);
    out.push({ blockIndex, kind: 'revision', skillCode: code, questionId: id, review: true });
  }
  const rest = total - out.length;
  if (rest > 0) {
    const mastery = skillCode ? masteryOf(skillCode) : avgMastery;
    const ids = pickQuestions({ ...base, usedToday: used, skillCode, minutes: block.minutes, mastery, revision: true, count: rest });
    out.push(...ids.map((id) => ({ blockIndex, kind: 'revision' as const, skillCode, questionId: id })));
  }
  return out;
}

/** Warm-up before a new lesson: a learnt prerequisite of the new skill, else the skill learnt most recently. */
function warmupSkill(newSkill: string, learnt: string[], skills: { code: string; prerequisites: string[] }[]): string | null {
  const prerequisites = skills.find((s) => s.code === newSkill)?.prerequisites ?? [];
  const candidates = learnt.filter((c) => c !== newSkill);
  return candidates.find((c) => prerequisites.includes(c)) ?? candidates[0] ?? null;
}

/** Another question on the failed question's skill (easier or equal), or null when the pool has none left. */
export async function pickSecondChanceService(
  userId: string,
  failed: QuestionDocument,
  inSession: string[],
  seed: number
): Promise<string | null> {
  if (!failed.primarySkill) return null;
  const [pool, outcomes] = await Promise.all([loadPracticePool(), attemptRepository.findOutcomesByUser(userId)]);
  return pickSecondChance({
    pool: pool.map(toPickable),
    failed: { skill: failed.primarySkill, difficulty: failed.difficulty },
    exclude: new Set(inSession),
    seen: new Set(outcomes.map((o) => o.questionId.toString())),
    seed,
  });
}

/** "I'm stuck" stage 4: easier questions on the weakness (or the same skill) before the original. */
export async function pickReinforcementService(
  userId: string,
  original: QuestionDocument,
  weakSkill: string | null,
  inSession: string[],
  seed: number
): Promise<string[]> {
  if (!original.primarySkill) return [];
  const [pool, outcomes] = await Promise.all([loadPracticePool(), attemptRepository.findOutcomesByUser(userId)]);
  return pickReinforcement({
    pool: pool.map(toPickable),
    original: { skill: original.primarySkill, difficulty: original.difficulty },
    weakSkill,
    exclude: new Set(inSession),
    seen: new Set(outcomes.map((o) => o.questionId.toString())),
    seed,
  });
}

/** Adaptive difficulty: an unseen question on the skill at exactly `difficulty`, or null. */
export async function pickAtLevelService(userId: string, skill: string, difficulty: number, inSession: string[], seed: number): Promise<string | null> {
  const [pool, outcomes] = await Promise.all([loadPracticePool(), attemptRepository.findOutcomesByUser(userId)]);
  return pickAtLevel({
    pool: pool.map(toPickable),
    skill,
    difficulty,
    exclude: new Set(inSession),
    seen: new Set(outcomes.map((o) => o.questionId.toString())),
    seed,
  });
}

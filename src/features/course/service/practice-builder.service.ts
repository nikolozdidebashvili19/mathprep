import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { PickableQuestion, pickQuestions, pickSecondChance } from '@/features/course/service/practice-picker';
import { BlockKind, StudentLevel } from '@/features/course/types/course.types';
import { examRepository } from '@/features/exam/repository/exam.repository';
import { getMasteryMapService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { BEGINNER_START_MASTERY } from '@/shared/const/course.const';
import { MASTERY_PRIOR } from '@/shared/const/domain.const';
import { hasBrokenLetters } from '@/shared/utils/text-quality';

/** Turns a course day's blocks into session items (T-020): one per theory card, one per picked question. */
type NewItem = { blockIndex: number; kind: BlockKind; skillCode: string | null; questionId: string | null };

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

/** Turns the day's blocks into session items: one per theory card, one per picked question. */
type DayBlock = { kind: BlockKind; skillCode?: string | null; minutes: number };

/**
 * `level` = the course's student level: for a beginner, a skill with no evidence yet is practised as if mastery
 * were BEGINNER_START_MASTERY, so the ramp starts at the easiest questions instead of exam level.
 */
export async function buildDayItemsService(userId: string, dayIndex: number, blocks: DayBlock[], courseSkills: string[], level: StudentLevel = 'advanced') {
  const [pool, outcomes, mastery] = await Promise.all([
    loadPracticePool(),
    attemptRepository.findOutcomesByUser(userId),
    getMasteryMapService(userId, courseSkills),
  ]);
  const pickable = pool.map(toPickable);
  const seen = new Set(outcomes.map((o) => o.questionId.toString()));
  const wrong = new Set(outcomes.filter((o) => o.points < o.maxPoints).map((o) => o.questionId.toString()));
  const masteryOf = (code: string) => {
    const state = mastery.get(code);
    if (level === 'beginner' && !state?.observations) return BEGINNER_START_MASTERY;
    return state?.value ?? MASTERY_PRIOR;
  };
  const avgMastery = courseSkills.length ? courseSkills.reduce((sum, c) => sum + masteryOf(c), 0) / courseSkills.length : MASTERY_PRIOR;
  const usedToday = new Set<string>();
  const items: NewItem[] = [];

  blocks.forEach((block, blockIndex) => {
    const skillCode = block.skillCode ?? null;
    if (block.kind === 'theory') {
      items.push({ blockIndex, kind: 'theory', skillCode, questionId: null });
      return;
    }
    const ids = pickQuestions({
      pool: pickable,
      skillCode,
      minutes: block.minutes,
      mastery: skillCode ? masteryOf(skillCode) : avgMastery,
      seen,
      wrong,
      courseSkills: new Set(courseSkills),
      usedToday,
      seed: dayIndex,
      revision: block.kind === 'revision',
    });
    ids.forEach((id) => {
      usedToday.add(id);
      items.push({ blockIndex, kind: block.kind, skillCode, questionId: id });
    });
  });
  return items;
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

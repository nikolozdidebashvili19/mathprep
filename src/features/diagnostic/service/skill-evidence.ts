/**
 * Quick check → per-skill evidence (pure, no DB). Combines right/wrong, difficulty, the handwriting analysis and
 * the prerequisite graph. Feeds the result screen now and the mastery model (T-016) later.
 *
 * Rules (w = 0.6 + 0.1 × difficulty, so harder questions say more):
 * - correct: primary skill +w (halved when the photo shows no real working: could be a guess);
 *   its direct prerequisites +0.3w each (you can't do A7 without A2).
 * - wrong / "I don't know": the photo's mistakes take the blame: conceptual −w, calculation / misread / incomplete
 *   −0.5w on the mistake's own skill. Without photo mistakes the primary skill takes −w; with them, −0.5w.
 * - skills the photo shows applied correctly: +0.3w.
 * - on a correct answer an "incomplete" mistake is ignored (no working shown is already the halved credit).
 * Score = sum / (|sum| + 1), in (−1, 1). Negative = weak.
 */
import { WorkMistake } from '@/features/handwriting/types/handwriting.types';
import { QUICK_CHECK_REASONS } from '@/shared/const/diagnostic.const';

export type EvidenceItem = {
  primarySkill: string;
  difficulty: number;
  answered: boolean;
  correct: boolean;
  /** Present only when the photo analysis succeeded. */
  analysis?: { workShown: boolean; mistakes: WorkMistake[]; skillsShown: string[] };
};

export type SkillEvidence = { skillCode: string; score: number; reasons: string[] };

const MAX_REASONS = 3;

export function computeSkillEvidence(items: EvidenceItem[], prerequisites: ReadonlyMap<string, string[]>): SkillEvidence[] {
  const sums = new Map<string, number>();
  const reasons = new Map<string, string[]>();
  const add = (code: string, delta: number, reason?: string) => {
    sums.set(code, (sums.get(code) ?? 0) + delta);
    if (reason) reasons.set(code, [...(reasons.get(code) ?? []), reason]);
  };

  for (const item of items) {
    const w = 0.6 + 0.1 * item.difficulty;
    // On a correct answer "incomplete" only means the working was not written out; that is already
    // handled by halving the credit, so it is not counted again as a mistake.
    const mistakes = (item.analysis?.mistakes ?? []).filter((m) => !(item.correct && m.type === 'incomplete'));

    if (item.correct) {
      const guessed = item.analysis !== undefined && !item.analysis.workShown;
      add(item.primarySkill, guessed ? w / 2 : w, guessed ? QUICK_CHECK_REASONS.correctNoWork : QUICK_CHECK_REASONS.correct);
      for (const pre of prerequisites.get(item.primarySkill) ?? []) add(pre, 0.3 * w);
    } else {
      const ownReason = item.answered ? QUICK_CHECK_REASONS.wrong : QUICK_CHECK_REASONS.dontKnow;
      add(item.primarySkill, mistakes.length > 0 ? -0.5 * w : -w, ownReason);
    }

    for (const m of mistakes) add(m.skillCode, m.type === 'conceptual' ? -w : -0.5 * w, m.description);
    const blamed = new Set(mistakes.map((m) => m.skillCode));
    for (const code of item.analysis?.skillsShown ?? []) {
      if (!blamed.has(code) && code !== item.primarySkill) add(code, 0.3 * w, QUICK_CHECK_REASONS.shownInWork);
    }
  }

  return [...sums.entries()]
    .map(([skillCode, sum]) => ({
      skillCode,
      score: Math.round((sum / (Math.abs(sum) + 1)) * 100) / 100,
      reasons: [...new Set(reasons.get(skillCode) ?? [])].slice(0, MAX_REASONS),
    }))
    .sort((a, b) => a.score - b.score);
}

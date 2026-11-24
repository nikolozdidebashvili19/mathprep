/** Pure helpers for the quick check: which skills a photo may blame, and the weak/strong lists on the result. */
import { SkillEvidence } from '@/features/diagnostic/service/skill-evidence';
import { QuickSkillResult } from '@/features/diagnostic/types/diagnostic.types';
import { SkillDocument } from '@/features/skill/schema/skill.schema';

const RESULT_LIST_SIZE = 5;
const STRONG_THRESHOLD = 0.3;

/** A skill, its prerequisites and theirs: the codes a photo analysis may blame. */
export function relatedSkills(codes: string[], skillByCode: Map<string, SkillDocument>): SkillDocument[] {
  const out = new Set<string>();
  let frontier = codes;
  for (let depth = 0; depth < 3 && frontier.length; depth++) {
    frontier.forEach((c) => out.add(c));
    frontier = frontier.flatMap((c) => skillByCode.get(c)?.prerequisites ?? []).filter((c) => !out.has(c));
  }
  return [...out].map((c) => skillByCode.get(c)).filter((s): s is SkillDocument => s !== undefined);
}

type SkillResults = { weak: QuickSkillResult[]; strong: QuickSkillResult[] };

/** Weak skills (weakest first, weighted by exam points) and strong skills for the result screen. */
export function toSkillResults(evidence: SkillEvidence[], skillByCode: Map<string, SkillDocument>): SkillResults {
  const withSkill = evidence
    .map((e) => ({ e, skill: skillByCode.get(e.skillCode) }))
    .filter((x): x is { e: SkillEvidence; skill: SkillDocument } => x.skill !== undefined);
  const toResult = ({ e, skill }: { e: SkillEvidence; skill: SkillDocument }): QuickSkillResult => ({
    code: skill.code,
    nameKa: skill.nameKa,
    score: e.score,
    reasons: e.reasons,
  });
  // Weakest first, but a weak skill that carries more exam points matters more.
  const weak = withSkill
    .filter(({ e }) => e.score < 0)
    .sort((a, b) => a.e.score * a.skill.examWeight - b.e.score * b.skill.examWeight)
    .slice(0, RESULT_LIST_SIZE)
    .map(toResult);
  const strong = withSkill
    .filter(({ e }) => e.score >= STRONG_THRESHOLD)
    .sort((a, b) => b.e.score - a.e.score)
    .slice(0, RESULT_LIST_SIZE)
    .map(toResult);
  return { weak, strong };
}


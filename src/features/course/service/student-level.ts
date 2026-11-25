import { PlannerSkillInput, StudentLevel } from '@/features/course/types/course.types';
import { ADVANCED_FROM, BEGINNER_BELOW } from '@/shared/const/course.const';

/** Level from the share of the diagnostic answered correctly (0–1); no diagnostic yet counts as a beginner. */
export function studentLevel(scoreShare: number | null): StudentLevel {
  if (scoreShare === null || scoreShare < BEGINNER_BELOW) return 'beginner';
  return scoreShare < ADVANCED_FROM ? 'intermediate' : 'advanced';
}

/** Longest prerequisite chain under each skill (0 = no prerequisites): the "how basic is it" order for beginners. */
export function prerequisiteDepths(skills: PlannerSkillInput[]): Map<string, number> {
  const byCode = new Map(skills.map((s) => [s.code, s]));
  const depth = new Map<string, number>();
  const visit = (code: string, path: Set<string>): number => {
    const known = depth.get(code);
    if (known !== undefined) return known;
    const s = byCode.get(code);
    if (!s || path.has(code)) return 0;
    path.add(code);
    const d = s.prerequisites.length === 0 ? 0 : 1 + Math.max(...s.prerequisites.map((p) => visit(p, path)));
    path.delete(code);
    depth.set(code, d);
    return d;
  };
  skills.forEach((s) => visit(s.code, new Set()));
  return depth;
}

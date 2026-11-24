import type { SkillNode } from '@/features/skill/types/skill.types';

/**
 * Returns the codes forming a prerequisite cycle (first node repeated at the end),
 * or null when the graph is acyclic. Unknown prerequisite codes are ignored.
 */
export function findPrerequisiteCycle(skills: SkillNode[]): string[] | null {
  const byCode = new Map(skills.map((s) => [s.code, s]));
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (code: string): string[] | null => {
    const current = state.get(code);
    if (current === 'done') return null;
    if (current === 'visiting') return [...stack.slice(stack.indexOf(code)), code];

    state.set(code, 'visiting');
    stack.push(code);
    for (const prereq of byCode.get(code)?.prerequisites ?? []) {
      if (!byCode.has(prereq)) continue;
      const cycle = visit(prereq);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(code, 'done');
    return null;
  };

  for (const skill of skills) {
    const cycle = visit(skill.code);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Orders the given skills so every prerequisite that is also in the list comes first.
 * Among skills that are ready at the same time, higher `priority` wins; ties fall back
 * to the input order. Deterministic. Throws only on a cyclic graph, which
 * SkillGraphSchema rejects before data ever reaches the planner.
 */
export function topologicalOrder(
  skills: SkillNode[],
  priority: (code: string) => number = () => 0
): string[] {
  const included = new Set(skills.map((s) => s.code));
  const inputIndex = new Map(skills.map((s, i) => [s.code, i]));
  const remaining = new Map(
    skills.map((s) => [s.code, new Set(s.prerequisites.filter((p) => included.has(p)))])
  );
  const order: string[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, prereqs]) => prereqs.size === 0)
      .map(([code]) => code)
      .sort((a, b) => priority(b) - priority(a) || inputIndex.get(a)! - inputIndex.get(b)!);

    if (ready.length === 0) throw new Error('SKILL_GRAPH_CYCLE');

    const next = ready[0];
    order.push(next);
    remaining.delete(next);
    remaining.forEach((prereqs) => prereqs.delete(next));
  }
  return order;
}

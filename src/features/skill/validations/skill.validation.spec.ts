import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { SkillGraphSchema, type SkillGraphType } from '@/features/skill/validations/skill.validation';

const loadContentGraph = (): SkillGraphType =>
  JSON.parse(readFileSync(path.resolve(process.cwd(), 'content/skills.json'), 'utf8'));

const baseGraph = (): SkillGraphType => ({
  version: 1,
  weightSource: 'estimate',
  topics: [{ code: 'G', nameKa: 'პლანიმეტრია', nameEn: 'Plane geometry' }],
  skills: [
    { code: 'G1', topic: 'G', nameKa: 'კუთხეები', nameEn: 'Angles', examWeight: 1, minPracticeMinutes: 60, prerequisites: [] },
    { code: 'G2', topic: 'G', nameKa: 'სამკუთხედი', nameEn: 'Triangles', examWeight: 2, minPracticeMinutes: 90, prerequisites: ['G1'] },
  ],
});

describe('SkillGraphSchema', () => {
  it('accepts content/skills.json', () => {
    const result = SkillGraphSchema.safeParse(loadContentGraph());
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it('content/skills.json has 50–70 skills, as PRODUCT.md requires', () => {
    const count = loadContentGraph().skills.length;
    expect(count).toBeGreaterThanOrEqual(50);
    expect(count).toBeLessThanOrEqual(70);
  });

  it('rejects duplicate codes', () => {
    const graph = baseGraph();
    graph.skills.push({ ...graph.skills[0] });
    expect(SkillGraphSchema.safeParse(graph).success).toBe(false);
  });

  it('rejects unknown topics and prerequisites', () => {
    const graph = baseGraph();
    graph.skills[1].topic = 'X';
    graph.skills[1].prerequisites = ['G9'];
    const issues = SkillGraphSchema.safeParse(graph).error?.issues ?? [];
    expect(issues.map((i) => i.message)).toEqual(['Unknown topic X', 'Invalid prerequisite G9 on G2']);
  });

  it('rejects cycles', () => {
    const graph = baseGraph();
    graph.skills[0].prerequisites = ['G2'];
    const issues = SkillGraphSchema.safeParse(graph).error?.issues ?? [];
    expect(issues.some((i) => i.message.startsWith('Prerequisite cycle'))).toBe(true);
  });
});

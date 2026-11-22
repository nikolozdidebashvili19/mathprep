import { describe, expect, it } from 'vitest';

import { findPrerequisiteCycle, topologicalOrder } from '@/features/skill/service/skill-graph.service';

describe('findPrerequisiteCycle', () => {
  it('returns null for an acyclic graph', () => {
    expect(
      findPrerequisiteCycle([
        { code: 'G1', prerequisites: [] },
        { code: 'G2', prerequisites: ['G1'] },
        { code: 'G4', prerequisites: ['G2'] },
      ])
    ).toBeNull();
  });

  it('returns the cycle path', () => {
    expect(
      findPrerequisiteCycle([
        { code: 'A1', prerequisites: ['A3'] },
        { code: 'A2', prerequisites: ['A1'] },
        { code: 'A3', prerequisites: ['A2'] },
      ])
    ).toEqual(['A1', 'A3', 'A2', 'A1']);
  });
});

describe('topologicalOrder', () => {
  const skills = [
    { code: 'G4', prerequisites: ['G2'] },
    { code: 'G2', prerequisites: ['G1'] },
    { code: 'P1', prerequisites: [] },
    { code: 'G1', prerequisites: [] },
  ];

  it('puts prerequisites first and keeps input order on ties', () => {
    expect(topologicalOrder(skills)).toEqual(['P1', 'G1', 'G2', 'G4']);
  });

  it('breaks ties by priority', () => {
    const priority = (code: string) => (code === 'G1' ? 10 : 1);
    expect(topologicalOrder(skills, priority)).toEqual(['G1', 'G2', 'G4', 'P1']);
  });

  it('ignores prerequisites outside the selected set', () => {
    expect(topologicalOrder([{ code: 'G4', prerequisites: ['G2'] }])).toEqual(['G4']);
  });

  it('throws on a cycle', () => {
    expect(() =>
      topologicalOrder([
        { code: 'A1', prerequisites: ['A2'] },
        { code: 'A2', prerequisites: ['A1'] },
      ])
    ).toThrow('SKILL_GRAPH_CYCLE');
  });
});

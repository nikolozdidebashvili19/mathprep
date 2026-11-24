import { describe, expect, it } from 'vitest';

import { nextAbility, pickQuestion, planTopicOrder, PlannerQuestion, PlannerSkill } from '@/features/diagnostic/service/quick-check-planner';

const skills: PlannerSkill[] = [
  { code: 'A4', topic: 'A', examWeight: 2.6 },
  { code: 'A7', topic: 'A', examWeight: 1.2 },
  { code: 'G7', topic: 'G', examWeight: 1.9 },
  { code: 'L1', topic: 'L', examWeight: 1 },
];

describe('planTopicOrder', () => {
  it('orders topics by total exam weight and repeats from the top when longer', () => {
    expect(planTopicOrder(skills, 3)).toEqual(['A', 'G', 'L']);
    expect(planTopicOrder(skills, 5)).toEqual(['A', 'G', 'L', 'A', 'G']);
    expect(planTopicOrder([], 3)).toEqual([]);
  });
});

describe('nextAbility', () => {
  it('moves by the step and stays within 1–5', () => {
    expect(nextAbility(2.5, true)).toBe(3.25);
    expect(nextAbility(2.5, false)).toBe(1.75);
    expect(nextAbility(4.8, true)).toBe(5);
    expect(nextAbility(1.2, false)).toBe(1);
  });
});

describe('pickQuestion', () => {
  const pool: PlannerQuestion[] = [
    { id: 'a1', primarySkill: 'A4', difficulty: 1 },
    { id: 'a3', primarySkill: 'A4', difficulty: 3 },
    { id: 'a3b', primarySkill: 'A7', difficulty: 3 },
    { id: 'g2', primarySkill: 'G7', difficulty: 2 },
    { id: 'x', primarySkill: 'Z9', difficulty: 3 },
  ];

  it('picks the question in the topic closest to the ability', () => {
    expect(pickQuestion(pool, skills, 'A', 1.2, new Set(), () => 0)?.id).toBe('a1');
  });

  it('breaks ties weighted by skill exam weight', () => {
    // A4 (2.6) and A7 (1.2): a roll in the first 2.6/3.8 picks A4, the rest A7.
    expect(pickQuestion(pool, skills, 'A', 3, new Set(['a1']), () => 0.1)?.id).toBe('a3');
    expect(pickQuestion(pool, skills, 'A', 3, new Set(['a1']), () => 0.9)?.id).toBe('a3b');
  });

  it('skips used questions and unknown skills, and falls back to other topics', () => {
    expect(pickQuestion(pool, skills, 'L', 3, new Set(), () => 0)?.id).not.toBe('x');
    expect(pickQuestion(pool, skills, 'G', 2, new Set(['g2']), () => 0)?.primarySkill).toMatch(/^A/);
    expect(pickQuestion(pool, skills, 'A', 3, new Set(['a1', 'a3', 'a3b', 'g2']), () => 0)).toBeNull();
  });
});

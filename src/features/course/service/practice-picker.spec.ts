import { describe, expect, it } from 'vitest';

import { difficultyRamp, pickQuestions, pickSecondChance, PickableQuestion, PickRequest, questionCount, targetDifficulty } from '@/features/course/service/practice-picker';

const q = (id: string, primarySkill: string, difficulty: number, skills: string[] = [primarySkill]): PickableQuestion => ({
  id,
  code: `C-${id}`,
  difficulty,
  primarySkill,
  skills,
});

const pool = [q('a1', 'A4', 1), q('a2', 'A4', 2), q('a3', 'A4', 3), q('a5', 'A4', 5), q('x2', 'A12', 2, ['A12', 'A4']), q('g2', 'G7', 2)];

const base: PickRequest = {
  pool,
  skillCode: 'A4',
  minutes: 10,
  mastery: 0.35,
  seen: new Set(),
  wrong: new Set(),
  courseSkills: new Set(['A4', 'G7']),
  usedToday: new Set(),
  seed: 0,
  revision: false,
};

describe('targetDifficulty / questionCount', () => {
  it('maps mastery to a difficulty just below the 50% point, within 1–5', () => {
    expect([0, 0.35, 0.6, 0.95].map(targetDifficulty)).toEqual([1, 2, 3, 5]);
  });

  it('fits the block length, at least one and capped', () => {
    expect(questionCount(20, 2)).toBe(7);
    expect(questionCount(1, 3)).toBe(1);
    expect(questionCount(200, 1)).toBe(8);
  });
});

describe('difficultyRamp', () => {
  it('runs from one below to one above the target, clamped to 1–5', () => {
    expect(difficultyRamp(3, 3)).toEqual([2, 3, 4]);
    expect(difficultyRamp(1, 2)).toEqual([1, 2]);
    expect(difficultyRamp(5, 1)).toEqual([4]);
  });
});

describe('pickQuestions', () => {
  it('climbs from easy to harder around the target, the skill as main topic first', () => {
    // 10 min at difficulty 2 → 3 questions on the ramp 1 → 2 → 3, shown easiest first.
    expect(pickQuestions(base)).toEqual(['a1', 'a2', 'a3']);
  });

  it('never presents a harder question before an easier one', () => {
    const picked = pickQuestions({ ...base, minutes: 30, mastery: 0.6 });
    const difficulty = (id: string) => pool.find((x) => x.id === id)!.difficulty;
    expect(picked.map(difficulty)).toEqual([...picked.map(difficulty)].sort((a, b) => a - b));
  });

  it('prefers unseen questions and never repeats one within a day', () => {
    expect(pickQuestions({ ...base, seen: new Set(['a2']) })[0]).toBe('a1');
    expect(pickQuestions({ ...base, usedToday: new Set(['a2', 'a1']) })).not.toContain('a2');
  });

  it('revision brings back questions answered wrong before', () => {
    expect(pickQuestions({ ...base, skillCode: null, revision: true, seen: new Set(['g2']), wrong: new Set(['g2']) })[0]).toBe('g2');
  });

  it('mixed blocks draw from the course skills only', () => {
    const picked = pickQuestions({ ...base, skillCode: null, courseSkills: new Set(['G7']), minutes: 30 });
    expect(picked).toEqual(['g2']);
  });
});

describe('pickSecondChance', () => {
  const input = { pool, failed: { skill: 'A4', difficulty: 3 }, exclude: new Set(['a3']), seen: new Set<string>(), seed: 0 };

  it('picks the same skill one step easier, never harder', () => {
    expect(pickSecondChance(input)).toBe('a2');
    expect(pickSecondChance({ ...input, exclude: new Set(['a3', 'a2']) })).toBe('a1');
  });

  it('prefers unseen questions and returns null when nothing fits', () => {
    expect(pickSecondChance({ ...input, seen: new Set(['a2']) })).toBe('a1');
    expect(pickSecondChance({ ...input, failed: { skill: 'A4', difficulty: 1 }, exclude: new Set(['a1']) })).toBeNull();
  });
});

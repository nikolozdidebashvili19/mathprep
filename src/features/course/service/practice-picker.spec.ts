import { describe, expect, it } from 'vitest';

import { pickQuestions, PickableQuestion, PickRequest, questionCount, targetDifficulty } from '@/features/course/service/practice-picker';

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

describe('pickQuestions', () => {
  it('picks the skill\'s questions closest to the target difficulty, the skill as main topic first', () => {
    // 10 min at difficulty 2 → 3 questions.
    expect(pickQuestions(base)).toEqual(['a2', 'a1', 'a3']);
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

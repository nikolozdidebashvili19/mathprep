import { describe, expect, it } from 'vitest';

import { gradeAnswer, parseNumericAnswer } from '@/features/attempt/service/grading.service';

describe('parseNumericAnswer', () => {
  it.each([
    ['0,5', 0.5],
    ['0.5', 0.5],
    ['1/2', 0.5],
    ['-3', -3],
    ['−3', -3],
    [' 12 ', 12],
    ['$\\frac{3}{4}$', 0.75],
    ['-1/4', -0.25],
  ])('reads %s as %d', (raw, value) => {
    expect(parseNumericAnswer(raw)).toBeCloseTo(value);
  });

  it.each(['', 'abc', '1/0', '2x', '1,2,3'])('rejects %s', (raw) => {
    expect(parseNumericAnswer(raw)).toBeNull();
  });
});

describe('gradeAnswer', () => {
  const mc = { type: 'multiple_choice', answer: 'გ', maxPoints: 1 };
  const numeric = { type: 'numeric', answer: '0,5', maxPoints: 2 };

  it('grades MC by exact key', () => {
    expect(gradeAnswer(mc, 'გ')).toEqual({ correct: true, points: 1 });
    expect(gradeAnswer(mc, 'ა')).toEqual({ correct: false, points: 0 });
  });

  it('treats "I don\'t know" (empty) as wrong', () => {
    expect(gradeAnswer(mc, '')).toEqual({ correct: false, points: 0 });
  });

  it('accepts equivalent numeric forms', () => {
    for (const given of ['0,5', '0.5', '1/2', '2/4']) {
      expect(gradeAnswer(numeric, given)).toEqual({ correct: true, points: 2 });
    }
    expect(gradeAnswer(numeric, '0.51')).toEqual({ correct: false, points: 0 });
  });

  it('never marks a question with no key as correct', () => {
    expect(gradeAnswer({ type: 'multiple_choice', answer: '', maxPoints: 1 }, 'ა').correct).toBe(false);
  });

  it('does not auto-grade written questions', () => {
    expect(gradeAnswer({ type: 'written', answer: '5', maxPoints: 3 }, '5').correct).toBe(false);
  });
});

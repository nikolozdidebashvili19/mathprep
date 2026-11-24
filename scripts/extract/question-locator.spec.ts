import { describe, expect, it } from 'vitest';

import { locateQuestions } from './question-locator';

const pointsFirstExam = (count: number) =>
  ['cover page 51.', ...Array.from({ length: count }, (_, i) => `\r\n(${i < count - 2 ? 1 : 4}) ${i + 1}.\r\n ) 14  ) 7`)];

describe('locateQuestions', () => {
  it('finds every "(points) N." marker and its page', () => {
    const result = locateQuestions(pointsFirstExam(30));
    expect(result.pattern).toBe('points-first');
    expect(result.status).toBe('complete');
    expect(result.questions).toHaveLength(30);
    expect(result.questions[0]).toEqual({ n: 1, page: 2, points: 1 });
    expect(result.questions[29]).toEqual({ n: 30, page: 31, points: 4 });
    expect(result.totalPoints).toBe(28 + 8);
  });

  it('finds markers that share a line with other text', () => {
    const result = locateQuestions(['x (1) 1. a', 'b (2) 2. c']);
    expect(result.questions.map((q) => q.n)).toEqual([1, 2]);
  });

  it('is partial when stray or out-of-order markers appear', () => {
    const pages = pointsFirstExam(30);
    pages.push('(1) 7.');
    expect(locateQuestions(pages).status).toBe('partial');
  });

  it('is partial when too few questions are found', () => {
    expect(locateQuestions(pointsFirstExam(5)).status).toBe('partial');
  });

  it('does not treat decimals like "(1) 2.5" as markers', () => {
    expect(locateQuestions(['(1) 2.5']).questions).toEqual([]);
  });

  it('falls back to the older number-first layout as partial', () => {
    const page = ' 1                                     1 \n0,99 : 1,1\n 2                                     2 \n';
    const result = locateQuestions([page]);
    expect(result.pattern).toBe('number-first');
    expect(result.status).toBe('partial');
    expect(result.questions).toEqual([
      { n: 1, page: 1, points: 1 },
      { n: 2, page: 1, points: 2 },
    ]);
  });

  it('reads the older written-question header " 35      3 " (2018 p36)', () => {
    const pages = [' 1                    1 \n', ' 2      3 \n     36'];
    expect(locateQuestions(pages).questions).toEqual([
      { n: 1, page: 1, points: 1 },
      { n: 2, page: 2, points: 3 },
    ]);
  });

  it('ignores formula lines that look like headers (2015-V2 p2)', () => {
    const page = ' 1                    1 \n  2    7    :1,  5  \n 2                    1 \n';
    expect(locateQuestions([page]).questions.map((q) => q.points)).toEqual([1, 1]);
  });

  it('reports none when nothing matches', () => {
    expect(locateQuestions(['no markers here'])).toEqual({ pattern: null, status: 'none', questions: [], totalPoints: 0 });
  });
});

import { describe, expect, it } from 'vitest';

import { openMistakes } from '@/features/revision/service/saved-mistakes';

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 10, minute));

describe('openMistakes', () => {
  it('keeps questions whose latest answer is wrong, most recent first, with how often they were missed', () => {
    const history = [
      { questionId: 'q1', answer: 'ა', correct: false, at: at(1) },
      { questionId: 'q2', answer: 'ბ', correct: false, at: at(2) },
      { questionId: 'q1', answer: 'გ', correct: false, at: at(3) },
    ];
    expect(openMistakes(history, 10)).toEqual([
      { questionId: 'q1', lastAnswer: 'გ', wrongCount: 2, lastWrongAt: at(3) },
      { questionId: 'q2', lastAnswer: 'ბ', wrongCount: 1, lastWrongAt: at(2) },
    ]);
  });

  it('a later correct answer takes the question off the list; a new mistake brings it back', () => {
    const fixed = [
      { questionId: 'q1', answer: 'ა', correct: false, at: at(1) },
      { questionId: 'q1', answer: 'ბ', correct: true, at: at(2) },
    ];
    expect(openMistakes(fixed, 10)).toEqual([]);
    expect(openMistakes([...fixed, { questionId: 'q1', answer: 'გ', correct: false, at: at(3) }], 10)).toHaveLength(1);
  });

  it('is capped', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({ questionId: `q${i}`, answer: 'ა', correct: false, at: at(i) }));
    expect(openMistakes(history, 2).map((m) => m.questionId)).toEqual(['q4', 'q3']);
  });
});

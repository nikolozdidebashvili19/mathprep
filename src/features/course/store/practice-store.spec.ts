import { describe, expect, it } from 'vitest';

import { createPracticeStore } from '@/features/course/store/practice-store';
import { PracticeItemView, PracticeSessionView } from '@/features/course/types/course.types';

const item = (index: number, answered: boolean): PracticeItemView => ({
  index,
  kind: 'practice',
  skillCode: 'A4',
  skillName: 'წრფივი განტოლებები',
  prerequisiteNames: [],
  theory: null,
  mastery: null,
  question: null,
  answered,
  answer: answered ? 'ა' : null,
  correct: answered ? true : null,
  correctAnswer: answered ? 'ა' : null,
  solution: null,
  hints: [],
  hintsTotal: 0,
});

const view = (answered: boolean[], completed = false): PracticeSessionView => ({
  id: 's1',
  dayIndex: 0,
  checkDay: false,
  completed,
  items: answered.map((a, i) => item(i, a)),
});

describe('practice store', () => {
  it('resumes an unfinished day at the first unanswered step', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, true, false, false]));
    expect(store.getState().index).toBe(2);
  });

  it('opens a finished day at the start for review', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, true], true));
    expect(store.getState().index).toBe(0);
  });

  it('goes back (not before the first step) and clears the pending answer', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, false]));
    store.getState().select('ბ');
    store.getState().back();
    expect(store.getState()).toMatchObject({ index: 0, selected: null, feedback: null });
    store.getState().back();
    expect(store.getState().index).toBe(0);
    store.getState().next();
    expect(store.getState().index).toBe(1);
  });
});

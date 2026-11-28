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
  lesson: null,
  reteach: null,
  mastery: null,
  question: null,
  answered,
  answer: answered ? 'ა' : null,
  correct: answered ? true : null,
  correctAnswer: answered ? 'ა' : null,
  solution: null,
  scaffold: 'none',
  scaffoldSteps: [],
  hints: [],
  stuckStage: 0,
  stuckStages: 0,
  secondChance: false,
  reinforcement: false,
  reinforcementSkillName: null,
  warmup: false,
  review: false,
  workPhoto: null,
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

describe('insertItems', () => {
  it('second chance: puts the new question right after the answered one and renumbers the rest', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, false]));
    store.getState().insertItems(1, [{ ...item(99, false), secondChance: true }]);
    const items = store.getState().view!.items;
    expect(items.map((i) => i.index)).toEqual([0, 1, 2]);
    expect(items.map((i) => i.secondChance)).toEqual([false, true, false]);
  });

  it('reinforcement: easier questions go before the current one and the student moves onto the first of them', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, false]));
    store.getState().select('ბ');
    store.getState().insertItems(1, [{ ...item(98, false), reinforcement: true }, { ...item(99, false), reinforcement: true }]);
    const { index, selected, view: v } = store.getState();
    expect([index, selected]).toEqual([1, null]);
    expect(v!.items.map((i) => i.reinforcement)).toEqual([false, true, true, false]);
  });
});

describe('adaptive updates', () => {
  it('replaces an item in place (difficulty swap) and stores the stage and the photo analysis', () => {
    const store = createPracticeStore();
    store.getState().startPractice(view([true, false, false]));
    store.getState().replaceItem(2, { ...item(7, false), skillName: 'სხვა' });
    store.getState().setHints(1, [{ kind: 'hint', stage: 1, text: 'h', items: [] }], 1);
    const photo = { mode: 'stuck' as const, status: 'done' as const, progress: 'mistake' as const, where: 'w', issue: 'i', nextStep: 'n', weakSkillName: null, retakesLeft: 2 };
    store.getState().setWorkPhoto(1, photo);
    const items = store.getState().view!.items;
    expect(items[2]).toMatchObject({ index: 2, skillName: 'სხვა' });
    expect(items[1]).toMatchObject({ stuckStage: 1, workPhoto: photo });
  });
});

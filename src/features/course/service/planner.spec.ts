import { describe, expect, it } from 'vitest';

import { planCourse } from '@/features/course/service/planner';
import { PlannerSkillInput } from '@/features/course/types/course.types';

const skill = (code: string, topic: string, examWeight: number, prerequisites: string[] = [], minPracticeMinutes = 40): PlannerSkillInput => ({
  code,
  topic,
  examWeight,
  minPracticeMinutes,
  prerequisites,
});

// N2 → A2 → A7; G7 independent; L1 already mastered.
const skills = [skill('N2', 'N', 1.4), skill('A2', 'A', 0.7, ['N2']), skill('A7', 'A', 1.3, ['A2']), skill('G7', 'G', 1.9), skill('L1', 'L', 1)];
const mastery = new Map([
  ['N2', 0.3],
  ['A2', 0.2],
  ['A7', 0.1],
  ['G7', 0.4],
  ['L1', 0.9],
]);

const plan = (durationDays: number, minutesPerDay: 30 | 60 | 90 | 120 = 60) => planCourse({ skills, mastery, durationDays, minutesPerDay });

describe('planCourse', () => {
  it('is deterministic', () => {
    expect(plan(30)).toEqual(plan(30));
  });

  it('skips mastered skills and orders prerequisites first', () => {
    const order = plan(30).skills.map((s) => s.code);
    expect(order).not.toContain('L1');
    expect(order.indexOf('N2')).toBeLessThan(order.indexOf('A2'));
    expect(order.indexOf('A2')).toBeLessThan(order.indexOf('A7'));
    expect(plan(30).omitted).toEqual([]);
    expect(plan(30).realistic).toBe(true);
  });

  it('reserves weekly checks and the final mock', () => {
    const days = plan(14).days;
    expect(days).toHaveLength(14);
    expect(days[6].blocks).toEqual([{ kind: 'check', skillCode: null, minutes: 60 }]);
    expect(days[13].blocks[0].kind).toBe('mock');
    expect(plan(14).learningDays).toBe(12);
  });

  it('fills a day from the session template: theory on a skill\'s first day, practice, drills, revision', () => {
    const first = plan(30, 60).days[0];
    expect(first.blocks.map((b) => b.kind)).toEqual(['theory', 'practice', 'drill', 'revision']);
    expect(first.blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(60);
    expect(plan(30, 30).days[0].blocks.map((b) => b.kind)).toEqual(['theory', 'practice', 'revision']);
  });

  it('turns leftover learning days into mixed exam practice', () => {
    const long = plan(60, 120);
    const lastLearning = long.days.filter((d) => d.blocks[0].kind === 'practice').at(-1);
    expect(lastLearning?.blocks[0]).toMatchObject({ kind: 'practice', skillCode: null });
  });

  it('omits what does not fit, pulls prerequisites with their skill, and flags an unrealistic goal', () => {
    // 3 days at 30 min/day: two learning days.
    const tight = plan(3, 30);
    expect(tight.learningDays).toBe(2);
    expect(tight.skills.length).toBeLessThan(4);
    expect(tight.omitted.length).toBeGreaterThan(0);
    expect(tight.realistic).toBe(false);
    for (const s of tight.skills) {
      const prereqs = skills.find((k) => k.code === s.code)!.prerequisites.filter((p) => (mastery.get(p) ?? 0) < 0.8);
      prereqs.forEach((p) => expect(tight.skills.map((x) => x.code)).toContain(p));
    }
  });

  it('starts with the root that unlocks the most valuable chain', () => {
    const chain = planCourse({
      skills: [skill('L1', 'L', 1), skill('N1', 'N', 0.5), skill('A4', 'A', 3, ['N1'])],
      mastery: new Map([['L1', 0.1], ['N1', 0.35], ['A4', 0.1]]),
      durationDays: 30,
      minutesPerDay: 60,
    });
    expect(chain.skills.map((s) => s.code)).toEqual(['N1', 'A4', 'L1']);
  });

  it('is weak-first: a proven weakness outranks a heavier untested skill, which only gets a check-in day', () => {
    const p = planCourse({
      skills: [skill('G7', 'G', 2.5, [], 90), skill('P5', 'P', 0.7, [], 90)],
      mastery: new Map([['P5', 0.1]]),
      observed: new Set(['P5']),
      durationDays: 30,
      minutesPerDay: 30,
    });
    expect(p.skills.map((s) => [s.code, s.status, s.days])).toEqual([
      ['P5', 'weak', 4],
      ['G7', 'untested', 1],
    ]);
  });

  it('labels skills with evidence but a gap left as partial', () => {
    const p = planCourse({ skills: [skill('A4', 'A', 2)], mastery: new Map([['A4', 0.5]]), durationDays: 30, minutesPerDay: 60 });
    expect(p.skills[0].status).toBe('partial');
  });

  it('schedules revision of a finished skill a few days later', () => {
    const days = plan(30, 60).days;
    const finishedFirst = days[0].blocks[1].skillCode;
    const revised = days.flatMap((d) => d.blocks.filter((b) => b.kind === 'revision' && b.skillCode === finishedFirst));
    expect(revised.length).toBeGreaterThan(0);
  });
});

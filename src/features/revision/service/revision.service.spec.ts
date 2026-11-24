import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/course/repository/practice-session.repository', () => ({ practiceSessionRepository: { findByUser: vi.fn() } }));
vi.mock('@/features/mastery/repository/mastery.repository', () => ({ masteryRepository: { findByUser: vi.fn() } }));
vi.mock('@/features/skill/repository/skill.repository', () => ({ skillRepository: { findAll: vi.fn() } }));

import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import { MasteryModel } from '@/features/mastery/schema/mastery.schema';
import { getRevisionLibraryService, getTheoryReviewService } from '@/features/revision/service/revision.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument, SkillModel } from '@/features/skill/schema/skill.schema';

const USER = new Types.ObjectId();
const example = { problem: 'p', steps: ['s'], answer: 'a' };
const card = { idea: 'idea', rules: ['r'], example, examExample: example, mistakes: ['m'], examTip: 'tip' };

const skill = (code: string, topic: string, withCard = true, prerequisites: string[] = []): SkillDocument =>
  new SkillModel({
    code,
    topic,
    nameKa: `name-${code}`,
    nameEn: code,
    examWeight: 1,
    minPracticeMinutes: 10,
    prerequisites,
    theoryCard: withCard ? card : undefined,
  }).toObject();

beforeEach(() => {
  vi.mocked(skillRepository.findAll).mockResolvedValue([
    skill('A1', 'A', true, ['N1']),
    skill('A2', 'A'),
    skill('G1', 'G'),
    skill('N1', 'N'),
    skill('T1', 'T', false),
  ]);
  vi.mocked(practiceSessionRepository.findByUser).mockResolvedValue([
    new PracticeSessionModel({
      userId: USER,
      courseId: new Types.ObjectId(),
      dayIndex: 0,
      items: [
        { blockIndex: 0, kind: 'theory', skillCode: 'G1', answeredAt: new Date() },
        { blockIndex: 1, kind: 'theory', skillCode: 'A1', answeredAt: new Date() },
        { blockIndex: 2, kind: 'theory', skillCode: 'A2' }, // opened but not read yet
        { blockIndex: 3, kind: 'theory', skillCode: 'T1', answeredAt: new Date() }, // no card written
        { blockIndex: 4, kind: 'practice', skillCode: 'N1', questionId: new Types.ObjectId(), answeredAt: new Date() },
      ],
    }).toObject(),
  ]);
  vi.mocked(masteryRepository.findByUser).mockResolvedValue([new MasteryModel({ userId: USER, skillCode: 'A1', value: 0.55 }).toObject()]);
});

describe('getRevisionLibraryService', () => {
  it('lists only theory cards the student has read, grouped in topic order', async () => {
    const view = await getRevisionLibraryService(USER.toString());
    expect(view.topics.map((t) => t.code)).toEqual(['A', 'G']);
    expect(view.topics[0].skills).toEqual([{ code: 'A1', nameKa: 'name-A1', mastery: 0.55 }]);
    expect(view.learntCount).toBe(2);
    expect(view.cardCount).toBe(4);
  });
});

describe('getTheoryReviewService', () => {
  it('opens a learnt card with its neighbours for flipping', async () => {
    const { data, status } = await getTheoryReviewService(USER.toString(), 'A1');
    expect(status).toBe(200);
    if ('error' in data) throw new Error('expected a card');
    expect(data.prerequisiteNames).toEqual(['name-N1']);
    expect(data.previous).toBeNull();
    expect(data.next).toEqual({ code: 'G1', nameKa: 'name-G1' });
    expect([data.position, data.total]).toEqual([1, 2]);
  });

  it('does not open a card the course has not taught yet', async () => {
    expect((await getTheoryReviewService(USER.toString(), 'A2')).status).toBe(404);
    expect((await getTheoryReviewService(USER.toString(), 'ZZ')).status).toBe(404);
  });
});

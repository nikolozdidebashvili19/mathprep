import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { toLessonView, toTheoryView } from '@/features/course/service/practice-views';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import { RevisionLibraryView, TheoryReviewView } from '@/features/revision/types/revision.types';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { TOPICS } from '@/shared/const/topics.const';
import { ServiceResult } from '@/shared/types/common';

/**
 * The theory cards the student has already been through in a daily session ("got it" pressed), in topic order.
 * Revision is reading only: nothing is written, so it never changes XP, streaks or mastery.
 */
async function learntSkills(userId: string): Promise<{ learnt: SkillDocument[]; all: SkillDocument[]; mastery: Map<string, number> }> {
  const [sessions, skills, mastery] = await Promise.all([
    practiceSessionRepository.findByUser(userId),
    skillRepository.findAll(),
    masteryRepository.findByUser(userId),
  ]);
  const read = new Set(sessions.flatMap((s) => s.items.flatMap((i) => (i.kind === 'theory' && i.answeredAt && i.skillCode ? [i.skillCode] : []))));
  const topicOrder = new Map<string, number>(TOPICS.map((t, i) => [t.code, i]));
  const learnt = skills
    .filter((s) => (s.theoryCard || s.lesson) && read.has(s.code))
    .sort((a, b) => (topicOrder.get(a.topic) ?? 99) - (topicOrder.get(b.topic) ?? 99) || a.code.localeCompare(b.code));
  return { learnt, all: skills, mastery: new Map(mastery.map((m) => [m.skillCode, m.value])) };
}

export async function getRevisionLibraryService(userId: string): Promise<RevisionLibraryView> {
  const { learnt, all, mastery } = await learntSkills(userId);
  const topics = TOPICS.map((t) => ({
    code: t.code,
    nameKa: t.nameKa,
    skills: learnt.filter((s) => s.topic === t.code).map((s) => ({ code: s.code, nameKa: s.nameKa, mastery: mastery.get(s.code) ?? null })),
  })).filter((t) => t.skills.length > 0);
  return { topics, learntCount: learnt.length, cardCount: all.filter((s) => s.theoryCard || s.lesson).length };
}

/** One learnt card to re-read. A card the student has not reached yet is not opened here (the course teaches it first). */
export async function getTheoryReviewService(userId: string, code: string): Promise<ServiceResult<TheoryReviewView>> {
  const { learnt, all, mastery } = await learntSkills(userId);
  const index = learnt.findIndex((s) => s.code === code);
  const skill = learnt[index];
  const theory = toTheoryView(skill);
  const lesson = toLessonView(skill);
  if (!skill || (!theory && !lesson)) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const nameOf = new Map(all.map((s) => [s.code, s.nameKa]));
  const neighbour = (s: SkillDocument | undefined) => (s ? { code: s.code, nameKa: s.nameKa } : null);
  return {
    data: {
      code: skill.code,
      skillName: skill.nameKa,
      prerequisiteNames: skill.prerequisites.map((c) => nameOf.get(c) ?? c),
      lesson,
      theory,
      mastery: mastery.get(skill.code) ?? null,
      previous: neighbour(learnt[index - 1]),
      next: neighbour(learnt[index + 1]),
      position: index + 1,
      total: learnt.length,
    },
    status: 200,
  };
}

import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { reinforceStageOf, stageCount, stageHintCost } from '@/features/course/service/hints';
import { pickReinforcementService } from '@/features/course/service/practice-builder.service';
import { freshItemViews, revealed } from '@/features/course/service/practice-view.service';
import { helpFor } from '@/features/course/service/practice-views';
import { PracticeHintResult } from '@/features/course/types/course.types';
import { PracticeHintType } from '@/features/course/validations/course.validation';
import { findWorkPhotoService } from '@/features/handwriting/service/handwriting.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { MAX_REINFORCEMENTS_PER_DAY } from '@/shared/const/course.const';
import { ServiceResult } from '@/shared/types/common';

/**
 * Reveals the next "I'm stuck" stage of an unanswered question (see hints.ts). Real hints lower how much the answer
 * counts toward mastery and XP. Stage 4 inserts easier questions before this one: on the weakness the work photo
 * showed, else on the same skill (at most MAX_REINFORCEMENTS_PER_DAY questions get it per day).
 */
export async function hintPracticeService(userId: string, input: PracticeHintType): Promise<ServiceResult<PracticeHintResult>> {
  const session = await practiceSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const item = session.items[input.itemIndex];
  if (!item?.questionId || item.kind === 'theory') return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (item.answeredAt) return { data: { error: 'ALREADY_ANSWERED' }, status: 409 };

  const [[question], skills] = await Promise.all([questionRepository.findByIds([item.questionId.toString()]), skillRepository.findAll()]);
  if (!question) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const { ladder } = helpFor(question, skills.find((s) => s.code === question.primarySkill), item);
  const stages = stageCount(ladder);
  if (stages === 0) return { data: { error: 'NO_HINTS' }, status: 404 };
  const current = item.stuckStage ?? 0;
  if (current >= stages) return { data: { error: 'NO_MORE_HINTS' }, status: 409 };
  const next = current + 1;
  const cost = stageHintCost(ladder, next);

  if (next !== reinforceStageOf(ladder)) {
    const matched = await practiceSessionRepository.revealStage(input.sessionId, input.itemIndex, current, cost);
    if (matched === 0) return { data: { error: 'NO_MORE_HINTS' }, status: 409 };
    return { data: { hints: revealed(ladder, next, item.reinforcedWith), stage: next, stages, inserted: [] }, status: 200 };
  }

  // Stage 4: easier questions first, aimed at what the photo showed (never assume: no photo → the same skill).
  const reinforcedToday = session.items.filter((i) => (i.reinforcedWith ?? 0) > 0).length;
  const photo = await findWorkPhotoService(input.sessionId, question._id.toString());
  const usable = photo?.analysis.status === 'done' && photo.analysis.readable !== false && photo.analysis.matchesQuestion !== false;
  const weakSkill = usable ? photo.analysis.mistakes[0]?.skillCode ?? null : null;
  const inSession = session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : []));
  const ids = reinforcedToday < MAX_REINFORCEMENTS_PER_DAY
    ? await pickReinforcementService(userId, question, weakSkill, inSession, session.dayIndex + input.itemIndex)
    : [];

  const matched = await practiceSessionRepository.revealStage(input.sessionId, input.itemIndex, current, cost, ids.length);
  if (matched === 0) return { data: { error: 'NO_MORE_HINTS' }, status: 409 };
  if (ids.length > 0) {
    const picked = await questionRepository.findByIds(ids);
    const skillOf = new Map(picked.map((q) => [q._id.toString(), q.primarySkill ?? null]));
    await practiceSessionRepository.insertItems(
      input.sessionId,
      input.itemIndex,
      ids.map((id) => {
        const skill = skillOf.get(id) ?? question.primarySkill ?? null;
        return {
          blockIndex: item.blockIndex,
          kind: item.kind,
          skillCode: skill,
          questionId: id,
          reinforcement: true,
          reinforcementSkill: skill !== question.primarySkill ? skill : null,
        };
      })
    );
  }
  const inserted = ids.length > 0 ? await freshItemViews(input.sessionId, input.itemIndex, ids.length) : [];
  return { data: { hints: revealed(ladder, next, ids.length), stage: next, stages, inserted }, status: 200 };
}

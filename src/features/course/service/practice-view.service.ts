import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionDocument } from '@/features/course/schema/practice-session.schema';
import { stageCount } from '@/features/course/service/hints';
import { helpFor, toLessonView, toPhotoFeedback, toSolution, toTheoryView } from '@/features/course/service/practice-views';
import { PracticeItemView, PracticeSessionView, StuckStep } from '@/features/course/types/course.types';
import { toQuestionView } from '@/features/diagnostic/service/diagnostic.service';
import { listSessionWorkPhotosService } from '@/features/handwriting/service/handwriting.service';
import { getMasteryMapService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { HINT_COPY } from '@/shared/const/course.const';

/** The daily session as the browser sees it (questions, help, photos), built from the stored session. */

/** Revealed "I'm stuck" steps; stage 4 says so when no easier question could be found. */
export function revealed(ladder: StuckStep[], stage: number, reinforcedWith: number | null | undefined): StuckStep[] {
  return ladder
    .filter((s) => s.stage <= stage)
    .map((s) => (s.kind === 'reinforce' && reinforcedWith === 0 ? { ...s, text: HINT_COPY.reinforceNone } : s));
}

export async function toSessionView(session: PracticeSessionDocument): Promise<PracticeSessionView> {
  const ids = session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : []));
  const theoryCodes = session.items.flatMap((i) => (i.kind === 'theory' && i.skillCode ? [i.skillCode] : []));
  const [questions, skills, mastery, photos] = await Promise.all([
    questionRepository.findByIds(ids),
    skillRepository.findAll(),
    getMasteryMapService(session.userId.toString(), theoryCodes),
    listSessionWorkPhotosService(session._id.toString()),
  ]);
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  const skillBy = new Map(skills.map((s) => [s.code, s]));
  const photoBy = new Map(photos.map((p) => [p.questionId, p]));
  const nameOf = (code: string) => skillBy.get(code)?.nameKa ?? null;

  const items: PracticeItemView[] = session.items.map((item, index) => {
    const q = item.questionId ? byId.get(item.questionId.toString()) : undefined;
    const skill = item.skillCode ? skillBy.get(item.skillCode) : undefined;
    const questionSkill = q?.primarySkill ? skillBy.get(q.primarySkill) : skill;
    const answered = !!item.answeredAt;
    const help = item.kind === 'theory' ? { scaffold: [], ladder: [] } : helpFor(q, questionSkill, item);
    const photo = q ? photoBy.get(q._id.toString()) : undefined;
    return {
      index,
      kind: item.kind,
      skillCode: item.skillCode ?? null,
      skillName: skill?.nameKa ?? null,
      prerequisiteNames: item.kind === 'theory' ? (skill?.prerequisites ?? []).map((c) => skillBy.get(c)?.nameKa ?? c) : [],
      theory: item.kind === 'theory' ? toTheoryView(skill) : null,
      lesson: item.kind === 'theory' ? toLessonView(skill) : null,
      // After an answer: the question's skill's simpler re-explanation ("explain it more simply").
      reteach: answered && q ? toLessonView(questionSkill)?.reteach ?? null : null,
      mastery: item.kind === 'theory' && item.skillCode ? mastery.get(item.skillCode)?.value ?? null : null,
      question: q ? toQuestionView(q) : null,
      answered,
      answer: answered ? item.answer ?? '' : null,
      correct: answered ? item.correct ?? null : null,
      correctAnswer: answered && q ? q.answer ?? null : null,
      solution: answered ? toSolution(q) : null,
      scaffold: item.scaffold ?? 'none',
      scaffoldSteps: help.scaffold,
      hints: revealed(help.ladder, item.stuckStage ?? 0, item.reinforcedWith),
      stuckStage: item.stuckStage ?? 0,
      stuckStages: stageCount(help.ladder),
      secondChance: !!item.secondChance,
      reinforcement: !!item.reinforcement,
      reinforcementSkillName: item.reinforcementSkill ? nameOf(item.reinforcementSkill) : null,
      warmup: !!item.warmup,
      review: !!item.review,
      workPhoto: photo ? toPhotoFeedback(photo, nameOf) : null,
    };
  });
  return { id: session._id.toString(), dayIndex: session.dayIndex, checkDay: false, completed: session.status === 'completed', items };
}


/** Re-reads the session and returns the items at [from, from + count) as the browser sees them. */
export async function freshItemViews(sessionId: string, from: number, count: number): Promise<PracticeItemView[]> {
  const fresh = await practiceSessionRepository.findById(sessionId);
  return fresh ? (await toSessionView(fresh)).items.slice(from, from + count) : [];
}

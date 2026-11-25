import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionDocument } from '@/features/course/schema/practice-session.schema';
import { stepHintCost } from '@/features/course/service/hints';
import { buildDayItemsService, pickSecondChanceService } from '@/features/course/service/practice-builder.service';
import { ladderFor, revealedSteps, toLessonView, toSolution, toTheoryView } from '@/features/course/service/practice-views';
import { PracticeAnswerResult, PracticeItemView, PracticeSessionView, StuckStep } from '@/features/course/types/course.types';
import { PracticeAnswerType, PracticeHintType } from '@/features/course/validations/course.validation';
import { toQuestionView } from '@/features/diagnostic/service/diagnostic.service';
import { getMasteryMapService, recordPracticeMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { hintedWeight, MAX_SECOND_CHANCES } from '@/shared/const/course.const';
import { ServiceResult } from '@/shared/types/common';
import { courseDayIndex } from '@/shared/utils/date';

async function toView(session: PracticeSessionDocument): Promise<PracticeSessionView> {
  const ids = session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : []));
  const theoryCodes = session.items.flatMap((i) => (i.kind === 'theory' && i.skillCode ? [i.skillCode] : []));
  const [questions, skills, mastery] = await Promise.all([
    questionRepository.findByIds(ids),
    skillRepository.findAll(),
    getMasteryMapService(session.userId.toString(), theoryCodes),
  ]);
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  const skillBy = new Map(skills.map((s) => [s.code, s]));

  const items: PracticeItemView[] = session.items.map((item, index) => {
    const q = item.questionId ? byId.get(item.questionId.toString()) : undefined;
    const skill = item.skillCode ? skillBy.get(item.skillCode) : undefined;
    const answered = !!item.answeredAt;
    const hints = item.kind === 'theory' ? [] : ladderFor(q, q?.primarySkill ? skillBy.get(q.primarySkill) : skill);
    return {
      index,
      kind: item.kind,
      skillCode: item.skillCode ?? null,
      skillName: skill?.nameKa ?? null,
      prerequisiteNames: item.kind === 'theory' ? (skill?.prerequisites ?? []).map((c) => skillBy.get(c)?.nameKa ?? c) : [],
      theory: item.kind === 'theory' ? toTheoryView(skill) : null,
      lesson: item.kind === 'theory' ? toLessonView(skill) : null,
      // After an answer: the question's skill's simpler re-explanation ("explain it more simply").
      reteach: answered && q ? toLessonView(q.primarySkill ? skillBy.get(q.primarySkill) : skill)?.reteach ?? null : null,
      mastery: item.kind === 'theory' && item.skillCode ? mastery.get(item.skillCode)?.value ?? null : null,
      question: q ? toQuestionView(q) : null,
      answered,
      answer: answered ? item.answer ?? '' : null,
      correct: answered ? item.correct ?? null : null,
      correctAnswer: answered && q ? q.answer ?? null : null,
      solution: answered ? toSolution(q) : null,
      hints: hints.slice(0, revealedSteps(item)),
      hintsTotal: hints.length,
      secondChance: !!item.secondChance,
    };
  });
  return { id: session._id.toString(), dayIndex: session.dayIndex, checkDay: false, completed: session.status === 'completed', items };
}

export async function startTodayPracticeService(userId: string): Promise<ServiceResult<PracticeSessionView>> {
  return startDayPracticeService(userId, null);
}

/**
 * A day's session for the active course: today (dayIndex null) or an earlier day, to review or catch up.
 * Resumed if it exists, otherwise built from the day's blocks. Future days are not open yet.
 */
export async function startDayPracticeService(userId: string, requestedDay: number | null): Promise<ServiceResult<PracticeSessionView>> {
  const course = await courseRepository.findActiveByUser(userId);
  if (!course) return { data: { error: 'NO_COURSE' }, status: 404 };
  const courseId = course._id.toString();
  const today = courseDayIndex(new Date(course.startDate), new Date(), course.durationDays);
  const dayIndex = requestedDay ?? today;
  if (dayIndex < 0 || dayIndex > today) return { data: { error: 'DAY_NOT_OPEN' }, status: 409 };

  const existing = await practiceSessionRepository.findByCourseDay(courseId, dayIndex);
  if (existing) return { data: await toView(existing), status: 200 };

  const day = await courseDayRepository.findOne(courseId, dayIndex);
  if (!day) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (day.blocks.some((b) => b.kind === 'check' || b.kind === 'mock')) {
    return { data: { id: null, dayIndex, checkDay: true, completed: false, items: [] }, status: 200 };
  }

  const items = await buildDayItemsService(userId, dayIndex, day.blocks, course.skills, course.level ?? 'advanced');
  const session = await practiceSessionRepository.create({ userId, courseId, dayIndex, items });
  return { data: await toView(session), status: 200 };
}

/**
 * Records one item. A question is graded at once (instant feedback), saved as a practice attempt and fed into
 * mastery; a theory card is just marked as read. The last item completes the session and the course day.
 */
export async function answerPracticeService(userId: string, input: PracticeAnswerType): Promise<ServiceResult<PracticeAnswerResult>> {
  const session = await practiceSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (session.status !== 'in_progress') return { data: { error: 'SESSION_COMPLETED' }, status: 409 };
  const item = session.items[input.itemIndex];
  if (!item) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (item.answeredAt) return { data: { error: 'ALREADY_ANSWERED' }, status: 409 };

  const [question] = item.questionId ? await questionRepository.findByIds([item.questionId.toString()]) : [];
  const graded = question ? gradeAnswer(question, input.answer) : { correct: true, points: 0 };
  const matched = await practiceSessionRepository.recordAnswer(input.sessionId, input.itemIndex, input.answer, graded.correct);
  if (matched === 0) return { data: { error: 'ALREADY_ANSWERED' }, status: 409 };

  if (question) {
    await attemptRepository.insertMany([
      {
        userId,
        questionId: question._id.toString(),
        context: 'practice',
        contextId: input.sessionId,
        answer: input.answer,
        points: graded.points,
        maxPoints: question.maxPoints,
        gradingStatus: 'graded',
        hintsUsed: item.hintsUsed ?? 0,
      },
    ]);
    const outcome = question.maxPoints > 0 ? graded.points / question.maxPoints : 0;
    await recordPracticeMasteryService(userId, question, outcome, hintedWeight(item.hintsUsed ?? 0));
  }

  // A wrong answer earns a second chance: an easier question on the same skill, right after this one.
  let secondChance: PracticeItemView | null = null;
  const chancesUsed = session.items.filter((i) => i.secondChance).length;
  if (question && !graded.correct && !item.secondChance && chancesUsed < MAX_SECOND_CHANCES) {
    const inSession = session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : []));
    const nextId = await pickSecondChanceService(userId, question, inSession, session.dayIndex + input.itemIndex);
    const position = input.itemIndex + 1;
    if (nextId) {
      const added = await practiceSessionRepository.insertItem(input.sessionId, position, {
        blockIndex: item.blockIndex,
        kind: item.kind,
        skillCode: question.primarySkill ?? item.skillCode ?? null,
        questionId: nextId,
        secondChance: true,
      });
      const fresh = added > 0 ? await practiceSessionRepository.findById(input.sessionId) : null;
      secondChance = fresh ? (await toView(fresh)).items[position] ?? null : null;
    }
  }

  const answeredNow = session.items.filter((i, idx) => i.answeredAt || idx === input.itemIndex);
  const done = !secondChance && answeredNow.length === session.items.length;
  let summary: PracticeAnswerResult['summary'] = null;
  if (done && (await practiceSessionRepository.complete(input.sessionId)) > 0) {
    await courseDayRepository.markCompleted(session.courseId.toString(), session.dayIndex);
    const questionItems = session.items.map((i, idx) => (idx === input.itemIndex ? { ...i, correct: graded.correct } : i)).filter((i) => i.questionId);
    summary = { correctCount: questionItems.filter((i) => i.correct).length, questionCount: questionItems.length };
  }

  const skills = question ? await skillRepository.findAll() : [];
  const reteach = question ? toLessonView(skills.find((s) => s.code === question.primarySkill))?.reteach ?? null : null;
  return {
    data: { correct: graded.correct, correctAnswer: question?.answer ?? null, solution: toSolution(question), reteach, summary, secondChance },
    status: 200,
  };
}

/**
 * Reveals the next "I'm stuck" rung of an unanswered question. Teaching rungs (restate, theory, plan, example) are
 * free; hints and the walkthrough lower how much the answer counts toward mastery and XP, the full solution the most.
 */
export async function hintPracticeService(userId: string, input: PracticeHintType): Promise<ServiceResult<{ hints: StuckStep[]; hintsTotal: number }>> {
  const session = await practiceSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const item = session.items[input.itemIndex];
  if (!item?.questionId) return { data: { error: 'NOT_FOUND' }, status: 404 };

  const [[question], skills] = await Promise.all([questionRepository.findByIds([item.questionId.toString()]), skillRepository.findAll()]);
  const ladder = ladderFor(question, skills.find((s) => s.code === question?.primarySkill));
  if (ladder.length === 0) return { data: { error: 'NO_HINTS' }, status: 404 };
  const revealed = revealedSteps(item);
  if (revealed >= ladder.length) return { data: { error: 'NO_MORE_HINTS' }, status: 409 };

  const matched = await practiceSessionRepository.revealGuideStep(input.sessionId, input.itemIndex, revealed, stepHintCost(ladder[revealed]));
  if (matched === 0) return { data: { error: 'NO_MORE_HINTS' }, status: 409 };
  return { data: { hints: ladder.slice(0, revealed + 1), hintsTotal: ladder.length }, status: 200 };
}

import { attemptRepository } from '@/features/attempt/repository/attempt.repository';
import { gradeAnswer } from '@/features/attempt/service/grading.service';
import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { adjustNextQuestion } from '@/features/course/service/practice-adapt.service';
import { buildDayItemsService, pickSecondChanceService } from '@/features/course/service/practice-builder.service';
import { toSessionView } from '@/features/course/service/practice-view.service';
import { toLessonView, toSolution } from '@/features/course/service/practice-views';
import { PracticeAnswerResult, PracticeSessionView } from '@/features/course/types/course.types';
import { PracticeAnswerType } from '@/features/course/validations/course.validation';
import { recordPracticeMasteryService } from '@/features/mastery/service/mastery.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { recordLearningService, recordReviewAnswerService } from '@/features/revision/service/review.service';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { hintedWeight, MAX_SECOND_CHANCES } from '@/shared/const/course.const';
import { ServiceResult } from '@/shared/types/common';
import { courseDayIndex } from '@/shared/utils/date';

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
  if (existing) return { data: await toSessionView(existing), status: 200 };

  const day = await courseDayRepository.findOne(courseId, dayIndex);
  if (!day) return { data: { error: 'NOT_FOUND' }, status: 404 };
  if (day.blocks.some((b) => b.kind === 'check' || b.kind === 'mock')) {
    return { data: { id: null, dayIndex, checkDay: true, completed: false, items: [] }, status: 200 };
  }

  const items = await buildDayItemsService(userId, dayIndex, day.blocks, course.skills, course.level ?? 'advanced');
  const session = await practiceSessionRepository.create({ userId, courseId, dayIndex, items });
  return { data: await toSessionView(session), status: 200 };
}

/**
 * Records one item. A question is graded at once (instant feedback), saved as a practice attempt and fed into
 * mastery and the spaced-repetition schedule; a theory card is just marked as read. A wrong answer brings a second
 * chance; the block's next question adapts (one level up after a streak, back to the missed level after a miss).
 * The last item completes the session and the course day.
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
    // Spaced repetition: practice starts a skill's schedule; a review only passes when solved without hints.
    if (question.primarySkill) {
      if (item.kind === 'revision') await recordReviewAnswerService(userId, question.primarySkill, graded.correct && (item.hintsUsed ?? 0) === 0);
      else await recordLearningService(userId, question.primarySkill);
    }
  }

  const adjusted = question ? await adjustNextQuestion(userId, session, input.itemIndex, question, graded.correct) : null;

  // A wrong answer earns a second chance: an easier question on the same skill, right after this one.
  let inserted = 0;
  const chancesUsed = session.items.filter((i) => i.secondChance).length;
  if (question && !graded.correct && !item.secondChance && !item.reinforcement && chancesUsed < MAX_SECOND_CHANCES) {
    // The swapped-in question is in the session now too, so it cannot come back as the second chance.
    const inSession = [...session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : [])), ...(adjusted ? [adjusted.questionId] : [])];
    const nextId = await pickSecondChanceService(userId, question, inSession, session.dayIndex + input.itemIndex);
    if (nextId) {
      inserted = await practiceSessionRepository.insertItems(input.sessionId, input.itemIndex + 1, [
        { blockIndex: item.blockIndex, kind: item.kind, skillCode: question.primarySkill ?? item.skillCode ?? null, questionId: nextId, secondChance: true },
      ]);
    }
  }

  const answeredNow = session.items.filter((i, idx) => i.answeredAt || idx === input.itemIndex);
  const done = inserted === 0 && answeredNow.length === session.items.length;
  let summary: PracticeAnswerResult['summary'] = null;
  if (done && (await practiceSessionRepository.complete(input.sessionId)) > 0) {
    await courseDayRepository.markCompleted(session.courseId.toString(), session.dayIndex);
    const questionItems = session.items.map((i, idx) => (idx === input.itemIndex ? { ...i, correct: graded.correct } : i)).filter((i) => i.questionId);
    summary = { correctCount: questionItems.filter((i) => i.correct).length, questionCount: questionItems.length };
  }

  const fresh = inserted > 0 || adjusted ? await practiceSessionRepository.findById(input.sessionId) : null;
  const view = fresh ? await toSessionView(fresh) : null;
  const secondChance = inserted > 0 ? view?.items[input.itemIndex + 1] ?? null : null;
  // The second chance sits right after this answer, so a swapped question further on moved one place down.
  const adjustedIndex = adjusted ? adjusted.index + (inserted > 0 && adjusted.index > input.itemIndex ? 1 : 0) : null;
  const adjustedItem = adjustedIndex !== null ? view?.items[adjustedIndex] : undefined;

  const skills = question ? await skillRepository.findAll() : [];
  const reteach = question ? toLessonView(skills.find((s) => s.code === question.primarySkill))?.reteach ?? null : null;
  return {
    data: {
      correct: graded.correct,
      correctAnswer: question?.answer ?? null,
      solution: toSolution(question),
      reteach,
      summary,
      secondChance,
      adjusted: adjusted && adjustedItem && adjustedIndex !== null ? { index: adjustedIndex, item: adjustedItem, direction: adjusted.direction } : null,
    },
    status: 200,
  };
}


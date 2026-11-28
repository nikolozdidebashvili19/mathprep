import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionDocument } from '@/features/course/schema/practice-session.schema';
import { pickAtLevelService } from '@/features/course/service/practice-builder.service';
import { questionRepository } from '@/features/question/repository/question.repository';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { STEP_UP_STREAK } from '@/shared/const/course.const';
import { MAX_DIFFICULTY } from '@/shared/const/domain.const';

type SessionItem = PracticeSessionDocument['items'][number];

/** Planned (not inserted) question items of the same block, with their positions. */
const blockQuestions = (session: PracticeSessionDocument, item: SessionItem) =>
  session.items
    .map((it, index) => ({ it, index }))
    .filter(({ it }) => it.blockIndex === item.blockIndex && it.questionId && !it.secondChance && !it.reinforcement);

/** Answered on their own: no "I'm stuck" hints and no solved-together scaffold. */
const unaided = (it: SessionItem) => (it.hintsUsed ?? 0) === 0 && it.scaffold !== 'full' && it.scaffold !== 'light';

/**
 * Adaptive difficulty inside a skill block. After STEP_UP_STREAK correct answers in a row on their own, the next
 * planned question becomes exactly one level harder; after a wrong answer, a harder next question is brought back to
 * the missed level. Never more than one level at a time. Returns the swapped position, or null.
 */
export async function adjustNextQuestion(
  userId: string,
  session: PracticeSessionDocument,
  itemIndex: number,
  question: QuestionDocument,
  correct: boolean
): Promise<{ index: number; direction: 'up' | 'down'; questionId: string } | null> {
  const item = session.items[itemIndex];
  const skill = item.skillCode;
  if (!skill || (item.kind !== 'practice' && item.kind !== 'drill') || item.secondChance || item.reinforcement) return null;

  const inBlock = blockQuestions(session, item);
  const next = inBlock.find(({ index, it }) => index > itemIndex && !it.answeredAt);
  if (!next?.it.questionId) return null;
  const [nextQuestion] = await questionRepository.findByIds([next.it.questionId.toString()]);
  if (!nextQuestion) return null;

  let target: number | null = null;
  if (correct) {
    const answered = inBlock.filter(({ index, it }) => index < itemIndex && it.answeredAt);
    const streak = [...answered.slice(-(STEP_UP_STREAK - 1)).map(({ it }) => it), item];
    const onARoll = streak.length >= STEP_UP_STREAK && streak.every((it, i) => (i === streak.length - 1 || it.correct) && unaided(it));
    if (onARoll && nextQuestion.difficulty <= question.difficulty && question.difficulty < MAX_DIFFICULTY) target = question.difficulty + 1;
  } else if (nextQuestion.difficulty > question.difficulty) {
    target = question.difficulty;
  }
  if (target === null) return null;

  const inSession = session.items.flatMap((i) => (i.questionId ? [i.questionId.toString()] : []));
  const replacement = await pickAtLevelService(userId, skill, target, inSession, session.dayIndex + itemIndex);
  if (!replacement) return null;
  const matched = await practiceSessionRepository.replaceQuestion(session._id.toString(), next.index, next.it.questionId.toString(), replacement);
  return matched > 0 ? { index: next.index, direction: correct ? 'up' : 'down', questionId: replacement } : null;
}


import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { photoStageOf } from '@/features/course/service/hints';
import { helpFor, toPhotoFeedback } from '@/features/course/service/practice-views';
import { PracticePhotoFeedback } from '@/features/course/types/course.types';
import { relatedSkills } from '@/features/diagnostic/service/quick-check-result';
import {
  analyzePracticePhotoService,
  countPracticePhotosTodayService,
  findWorkPhotoService,
  savePracticePhotoService,
} from '@/features/handwriting/service/handwriting.service';
import { UploadPracticePhotoType } from '@/features/handwriting/validations/handwriting.validation';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { PRACTICE_PHOTO_DAILY_LIMIT, PRACTICE_PHOTO_PER_QUESTION } from '@/shared/const/course.const';
import { ServiceResult } from '@/shared/types/common';

/**
 * A photo of the student's handwritten working on a practice question, analysed at once:
 * - not answered yet ("I'm stuck" stage 3, once that stage is open): where the working goes wrong or stops and one
 *   next step, never the answer;
 * - answered wrong ("find my mistake"): the exact wrong step and how to fix it.
 * An unclear photo or one of another problem comes back as such, so the student retakes it (nothing is guessed).
 * Limits: PRACTICE_PHOTO_PER_QUESTION photos per question, PRACTICE_PHOTO_DAILY_LIMIT questions per day.
 */
export async function practicePhotoService(
  userId: string,
  input: UploadPracticePhotoType,
  file: { mimeType: string; data: Buffer }
): Promise<ServiceResult<PracticePhotoFeedback>> {
  const session = await practiceSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const item = session.items[input.itemIndex];
  if (!item?.questionId || item.kind === 'theory') return { data: { error: 'NOT_FOUND' }, status: 404 };
  const mode = item.answeredAt ? 'mistake' : 'stuck';
  if (mode === 'mistake' && item.correct) return { data: { error: 'ALREADY_CORRECT' }, status: 409 };

  const questionId = item.questionId.toString();
  const [[question], skills] = await Promise.all([questionRepository.findByIds([questionId]), skillRepository.findAll()]);
  if (!question) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const skillBy = new Map(skills.map((s) => [s.code, s]));
  if (mode === 'stuck') {
    const photoStage = photoStageOf(helpFor(question, skillBy.get(question.primarySkill ?? ''), item).ladder);
    if (photoStage === null || (item.stuckStage ?? 0) < photoStage) return { data: { error: 'PHOTO_NOT_OPEN' }, status: 409 };
  }

  const existing = await findWorkPhotoService(input.sessionId, questionId);
  if ((existing?.uploads ?? 0) >= PRACTICE_PHOTO_PER_QUESTION) return { data: { error: 'QUESTION_PHOTO_LIMIT' }, status: 429 };
  if (!existing && (await countPracticePhotosTodayService(userId)) >= PRACTICE_PHOTO_DAILY_LIMIT) {
    return { data: { error: 'PHOTO_DAILY_LIMIT' }, status: 429 };
  }

  const { photoId } = await savePracticePhotoService({ userId, sessionId: input.sessionId, questionId, mode, ...file });
  const allowed = relatedSkills(question.skills.map((s) => s.skillCode), skillBy);
  const summary = await analyzePracticePhotoService(photoId, {
    mode,
    question: { text: question.text, options: question.options.map((o) => ({ key: o.key, text: o.text })), answer: question.answer ?? '' },
    studentAnswer: item.answer ?? '',
    solutionSteps: [...(question.solutionSteps ?? [])],
    skills: allowed.map((s) => ({ code: s.code, nameKa: s.nameKa, nameEn: s.nameEn })),
  });
  const feedback = summary ? toPhotoFeedback(summary, (code) => skillBy.get(code)?.nameKa ?? null) : null;
  if (!feedback) return { data: { error: 'INTERNAL_ERROR' }, status: 500 };
  return { data: feedback, status: 200 };
}

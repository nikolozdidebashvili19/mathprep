import { workPhotoRepository } from '@/features/handwriting/repository/work-photo.repository';
import { WorkPhotoDocument } from '@/features/handwriting/schema/work-photo.schema';
import { buildPracticePhotoPrompt, dropLeakingSentences } from '@/features/handwriting/service/practice-photo';
import { AnalysisSkill, PracticePhotoContext, PracticePhotoMode, WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { ModelPracticePhotoSchema, ModelWorkAnalysisSchema } from '@/features/handwriting/validations/handwriting.validation';
import { aiVision } from '@/shared/lib/ai-vision';
import { ServiceResult } from '@/shared/types/common';
import { startOfUtcDay } from '@/shared/utils/date';
import { parseModelJson } from '@/shared/utils/model-json';

export type AnalysisContext = {
  question: { text: string; options: { key: string; text: string }[]; answer?: string | null };
  studentAnswer: string;
  correct: boolean;
  /** Skills the model may name: the question's skills and their prerequisites. */
  skills: AnalysisSkill[];
};

/** Prompt for one photo of handwritten working. Pure, so it is unit-tested. */
export function buildAnalysisPrompt({ question, studentAnswer, correct, skills }: AnalysisContext): string {
  const options = question.options.map((o) => `${o.key}) ${o.text}`).join('   ');
  const skillList = skills.map((s) => `${s.code}: ${s.nameEn} (${s.nameKa})`).join('\n');
  return `You are a maths teacher checking a Georgian 12th-grade student's handwritten working (the photo) for one question
of the Georgian national university-entrance exam. Find what the student does and does not know.

Question: ${question.text}
${options ? `Options: ${options}\n` : ''}Correct answer: ${question.answer}
Student's answer: ${studentAnswer} (${correct ? 'correct' : 'wrong'})

Skills you may name (use ONLY these codes):
${skillList}

Return JSON:
- "readable": false if the photo is not readable handwriting (blurred, empty, not maths). Then leave the other lists empty.
- "matchesQuestion": false if the working is clearly for a different question.
- "workShown": true if the photo shows real steps leading to the answer, false if it shows only the answer or almost nothing.
- "approach": one short sentence in Georgian describing the method the student used.
- "mistakes": every error in the working, in order. "type" is "conceptual" (wrong rule/idea), "calculation" (arithmetic or
  algebra slip), "misread" (copied the question or a number wrong) or "incomplete" (stopped before the end).
  "skillCode" is the skill the error belongs to: an arithmetic slip while adding fractions is N2, not the question's topic.
  "description" is one short sentence in Georgian. If the answer is correct and the working is fine, return [].
- "skillsShown": codes of skills the working applies correctly.
- "feedback": one or two kind sentences in Georgian to the student: what to fix first.
Write maths in plain text (x^2, sqrt(3), 1/2), never LaTeX or backslashes.

{"readable": true, "matchesQuestion": true, "workShown": true, "approach": "...",
"mistakes": [{"type": "calculation", "skillCode": "N2", "description": "..."}], "skillsShown": ["A4"], "feedback": "..."}`;
}

const toSummary = (photo: WorkPhotoDocument): WorkPhotoSummary => ({
  id: photo._id.toString(),
  questionId: photo.questionId.toString(),
  mode: photo.mode ?? null,
  uploads: photo.uploads ?? 0,
  analysis: {
    status: photo.analysis?.status ?? 'pending',
    readable: photo.analysis?.readable,
    matchesQuestion: photo.analysis?.matchesQuestion,
    workShown: photo.analysis?.workShown,
    approach: photo.analysis?.approach,
    mistakes: (photo.analysis?.mistakes ?? []).map((m) => ({ type: m.type, skillCode: m.skillCode, description: m.description })),
    skillsShown: photo.analysis?.skillsShown ?? [],
    feedback: photo.analysis?.feedback,
    progress: photo.analysis?.progress,
    where: photo.analysis?.where,
    issue: photo.analysis?.issue,
    nextStep: photo.analysis?.nextStep,
  },
});

export async function saveWorkPhotoService(input: {
  userId: string;
  sessionId: string;
  questionId: string;
  mimeType: string;
  data: Buffer;
}): Promise<ServiceResult<{ photoId: string }>> {
  const photoId = await workPhotoRepository.upsert(input);
  return { data: { photoId }, status: 201 };
}

/** The photo bytes, only for the student who took it. */
export async function getOwnWorkPhotoImageService(
  userId: string,
  photoId: string
): Promise<ServiceResult<{ mimeType: string; data: Buffer }>> {
  const photo = await workPhotoRepository.findImageById(photoId);
  if (!photo || photo.userId !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  return { data: { mimeType: photo.mimeType, data: photo.data }, status: 200 };
}

export async function findWorkPhotoService(sessionId: string, questionId: string): Promise<WorkPhotoSummary | null> {
  const photo = await workPhotoRepository.findOneForQuestion(sessionId, questionId);
  return photo ? toSummary(photo) : null;
}

export async function listSessionWorkPhotosService(sessionId: string): Promise<WorkPhotoSummary[]> {
  return (await workPhotoRepository.findBySession(sessionId)).map(toSummary);
}

/**
 * Sends one photo to the vision model and stores what it found. Never throws: a failed call is stored as
 * `failed` (retried when the diagnostic finishes), and the diagnostic then falls back to right/wrong only.
 */
export async function analyzeWorkPhotoService(photoId: string, context: AnalysisContext): Promise<ServiceResult<{ status: string }>> {
  const photo = await workPhotoRepository.findImageById(photoId);
  if (!photo) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const by = aiVision.describe();

  try {
    const raw = await aiVision.generateJson({
      prompt: buildAnalysisPrompt(context),
      images: [{ mimeType: photo.mimeType, base64: photo.data.toString('base64') }],
    });
    const parsed = ModelWorkAnalysisSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) throw new Error(`model output failed validation: ${parsed.error.issues[0]?.message}`);

    const allowed = new Set(context.skills.map((s) => s.code));
    const result = parsed.data;
    await workPhotoRepository.setAnalysis(photoId, {
      status: 'done',
      readable: result.readable,
      matchesQuestion: result.matchesQuestion,
      workShown: result.workShown,
      approach: result.approach,
      // Unknown codes are dropped rather than trusted; readable-but-off-topic photos count as no evidence.
      mistakes: result.readable && result.matchesQuestion ? result.mistakes.filter((m) => allowed.has(m.skillCode)) : [],
      skillsShown: result.readable && result.matchesQuestion ? result.skillsShown.filter((c) => allowed.has(c)) : [],
      feedback: result.feedback,
      ...by,
      analyzedAt: new Date(),
    });
    return { data: { status: 'done' }, status: 200 };
  } catch (error) {
    await workPhotoRepository.setAnalysis(photoId, {
      status: 'failed',
      error: (error as Error).message.slice(0, 300),
      ...by,
      analyzedAt: new Date(),
    });
    return { data: { status: 'failed' }, status: 200 };
  }
}

export async function savePracticePhotoService(input: {
  userId: string;
  sessionId: string;
  questionId: string;
  mode: PracticePhotoMode;
  mimeType: string;
  data: Buffer;
}): Promise<{ photoId: string; uploads: number }> {
  const { id, uploads } = await workPhotoRepository.upsertPractice(input);
  return { photoId: id, uploads };
}

/** Practice photos the student sent today (UTC day), for the daily limit. */
export const countPracticePhotosTodayService = (userId: string, now = new Date()) =>
  workPhotoRepository.countPracticeSince(userId, startOfUtcDay(now));

/**
 * Analyses one practice photo now (the student is waiting) and stores the result. Before an answer (`stuck`), every
 * sentence that would give the answer away is dropped. Never throws: a failed call is stored and returned as
 * `failed`, and the student can retake the photo.
 */
export async function analyzePracticePhotoService(photoId: string, ctx: PracticePhotoContext): Promise<WorkPhotoSummary | null> {
  const photo = await workPhotoRepository.findImageById(photoId);
  if (!photo) return null;
  const by = aiVision.describe();
  try {
    const raw = await aiVision.generateJson({
      prompt: buildPracticePhotoPrompt(ctx),
      images: [{ mimeType: photo.mimeType, base64: photo.data.toString('base64') }],
    });
    const parsed = ModelPracticePhotoSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) throw new Error(`model output failed validation: ${parsed.error.issues[0]?.message}`);

    const result = parsed.data;
    const usable = result.readable && result.matchesQuestion;
    const allowed = new Set(ctx.skills.map((s) => s.code));
    const correctText = ctx.question.options.find((o) => o.key === ctx.question.answer)?.text ?? '';
    const finalStep = ctx.solutionSteps.at(-1) ?? '';
    const safe = (text: string) => (!usable ? '' : ctx.mode === 'stuck' ? dropLeakingSentences(text, correctText, finalStep) : text);
    await workPhotoRepository.setAnalysis(photoId, {
      status: 'done',
      readable: result.readable,
      matchesQuestion: result.matchesQuestion,
      progress: result.progress,
      where: safe(result.where),
      issue: safe(result.issue),
      nextStep: safe(result.nextStep),
      // Unknown codes are dropped rather than trusted; an unreadable or off-topic photo is no evidence.
      mistakes: usable ? result.mistakes.filter((m) => allowed.has(m.skillCode)) : [],
      skillsShown: [],
      ...by,
      analyzedAt: new Date(),
    });
  } catch (error) {
    await workPhotoRepository.setAnalysis(photoId, {
      status: 'failed',
      error: (error as Error).message.slice(0, 300),
      ...by,
      analyzedAt: new Date(),
    });
  }
  const stored = await workPhotoRepository.findById(photoId);
  return stored ? toSummary(stored) : null;
}

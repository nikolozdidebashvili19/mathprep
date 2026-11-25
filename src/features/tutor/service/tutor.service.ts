import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { questionRepository } from '@/features/question/repository/question.repository';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { tutorMessageRepository } from '@/features/tutor/repository/tutor-message.repository';
import { TutorContext, TutorReply, TutorTurn } from '@/features/tutor/types/tutor.types';
import { AskTutorType, ModelTutorReplySchema } from '@/features/tutor/validations/tutor.validation';
import { TUTOR_DAILY_LIMIT } from '@/shared/const/tutor.const';
import { aiVision } from '@/shared/lib/ai-vision';
import { ServiceResult } from '@/shared/types/common';
import { startOfUtcDay } from '@/shared/utils/date';
import { parseModelJson } from '@/shared/utils/model-json';

const MAX_REPLY_CHARS = 1200;

export const normalizeMessage = (message: string) => message.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Compact prompt (token budget): the question, both answers, the stored verified solution and the last few turns.
 * The model explains from the given solution instead of solving from scratch (cheaper and more reliable).
 */
export function buildTutorPrompt(ctx: TutorContext, history: TutorTurn[], message: string): string {
  const options = ctx.options.map((o) => `${o.key}) ${o.text}`).join('   ');
  const steps = ctx.solutionSteps.length ? ctx.solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(no stored solution)';
  const turns = history.map((t) => `${t.role === 'student' ? 'Student' : 'Tutor'}: ${t.text}`).join('\n');
  return `You are a kind, patient maths tutor for a Georgian 12th-grade student preparing for the national exam.
Answer in Georgian, in at most 5 short sentences. Maths in LaTeX inside $...$ (escape backslashes for JSON).
Explain the WHY, step by step, at the student's level; if they made a mistake, show exactly where.
Use the solution below as the truth; never claim a different answer. If the question is unrelated to this problem,
answer in one sentence and bring them back to it.

Problem${ctx.skillName ? ` (topic: ${ctx.skillName})` : ''}: ${ctx.questionText}
Options: ${options}
Correct answer: ${ctx.correctAnswer}. Student answered: ${ctx.studentAnswer || '(no answer)'}.
Solution:
${steps}
${turns ? `\nConversation so far:\n${turns}\n` : ''}
Student: ${message}

Return JSON: {"reply": "..."}`;
}

/**
 * Stuck mode (before answering): a Socratic prompt. The model sees the solution so it can steer, but must never
 * state the final result or which option is correct; it asks one guiding question at a time.
 */
export function buildStuckPrompt(ctx: TutorContext, history: TutorTurn[], message: string): string {
  const options = ctx.options.map((o) => `${o.key}) ${o.text}`).join('   ');
  const steps = ctx.solutionSteps.length ? ctx.solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(no stored solution)';
  const seen = ctx.seenGuidance.length ? ctx.seenGuidance.map((s) => `- ${s}`).join('\n') : '(none)';
  const turns = history.map((t) => `${t.role === 'student' ? 'Student' : 'Tutor'}: ${t.text}`).join('\n');
  return `You are a kind, patient maths tutor for a Georgian 12th-grade student who is STUCK on a problem they have
NOT answered yet. Your job is to help them reach the answer THEMSELVES.
Rules: answer in Georgian, at most 4 short sentences, maths in LaTeX inside $...$ (escape backslashes for JSON).
NEVER state the final result, NEVER say which option is correct, NEVER do the last step for them.
Find exactly where they are stuck, explain that one idea in simple words, then end with ONE guiding question
or a small next step for them to try. Build on the hints they have already seen; do not just repeat them.
If the message is unrelated to this problem, answer in one sentence and bring them back to it.

Problem${ctx.skillName ? ` (topic: ${ctx.skillName})` : ''}: ${ctx.questionText}
Options: ${options}
Solution (secret, for you only):
${steps}
Hints the student already saw:
${seen}
${turns ? `\nConversation so far:\n${turns}\n` : ''}
Student: ${message}

Return JSON: {"reply": "..."}`;
}

/**
 * The AI helper for an answered practice question (explain mode) or a still-open one (stuck mode). Same first question on the same problem → cached reply
 * (0 tokens, not counted); otherwise one capped model call, limited to TUTOR_DAILY_LIMIT per student per day.
 */
export async function askTutorService(userId: string, input: AskTutorType): Promise<ServiceResult<TutorReply>> {
  const session = await practiceSessionRepository.findById(input.sessionId);
  if (!session || session.userId.toString() !== userId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const item = session.items[input.itemIndex];
  if (!item?.questionId) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const stuck = input.mode === 'stuck';
  if (!stuck && !item.answeredAt) return { data: { error: 'NOT_ANSWERED' }, status: 409 };
  if (stuck && item.answeredAt) return { data: { error: 'ALREADY_ANSWERED' }, status: 409 };

  const questionId = item.questionId.toString();
  const used = await tutorMessageRepository.countModelCallsSince(userId, startOfUtcDay(new Date()));
  const remaining = Math.max(0, TUTOR_DAILY_LIMIT - used);
  const normalized = normalizeMessage(input.message);
  const base = { userId, questionId, sessionId: input.sessionId, message: input.message, normalized, mode: input.mode };

  if (input.history.length === 0) {
    const cachedReply = await tutorMessageRepository.findReply(questionId, normalized, input.mode);
    if (cachedReply) {
      await tutorMessageRepository.create({ ...base, reply: cachedReply, cached: true });
      return { data: { reply: cachedReply, remaining }, status: 200 };
    }
  }
  if (remaining === 0) return { data: { error: 'LIMIT_REACHED' }, status: 429 };

  const [[question], skills] = await Promise.all([questionRepository.findByIds([questionId]), skillRepository.findAll()]);
  if (!question) return { data: { error: 'NOT_FOUND' }, status: 404 };
  const ctx: TutorContext = {
    questionText: question.text,
    options: question.options.map((o) => ({ key: o.key, text: o.text })),
    correctAnswer: question.answer ?? '',
    studentAnswer: item.answer ?? '',
    solutionSteps: [...(question.solutionSteps ?? [])],
    skillName: skills.find((s) => s.code === question.primarySkill)?.nameKa ?? null,
    seenGuidance: stuck ? [...(question.guidance?.hints ?? [])].slice(0, item.hintsUsed ?? 0) : [],
  };

  try {
    const prompt = stuck ? buildStuckPrompt(ctx, input.history, input.message) : buildTutorPrompt(ctx, input.history, input.message);
    const raw = await aiVision.generateJson({ prompt, images: [] });
    const parsed = ModelTutorReplySchema.safeParse(parseModelJson(raw));
    if (!parsed.success) return { data: { error: 'TUTOR_FAILED' }, status: 502 };
    const reply = parsed.data.reply.slice(0, MAX_REPLY_CHARS);
    await tutorMessageRepository.create({ ...base, reply, cached: false, ...aiVision.describe() });
    return { data: { reply, remaining: remaining - 1 }, status: 200 };
  } catch {
    return { data: { error: 'TUTOR_FAILED' }, status: 502 };
  }
}

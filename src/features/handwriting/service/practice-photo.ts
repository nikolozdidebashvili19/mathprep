/**
 * Practice work photos (pure, unit-tested): the prompt for "I'm stuck" stage 3 / "find my mistake", and the filter
 * that drops any sentence giving the answer away before it reaches a student who has not answered yet.
 */
import { PracticePhotoContext } from '@/features/handwriting/types/handwriting.types';

export function buildPracticePhotoPrompt(ctx: PracticePhotoContext): string {
  const stuck = ctx.mode === 'stuck';
  const options = ctx.question.options.map((o) => `${o.key}) ${o.text}`).join('   ');
  const steps = ctx.solutionSteps.length ? ctx.solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(no stored solution)';
  const skillList = ctx.skills.map((s) => `${s.code}: ${s.nameEn} (${s.nameKa})`).join('\n');
  const task = stuck
    ? 'The student has NOT answered yet and pressed "I\'m stuck". Find exactly where their working goes wrong, or where it stops.'
    : `The student chose ${ctx.studentAnswer || '(nothing)'}, which is wrong (correct: ${ctx.question.answer}). ` +
      'Find the exact step where the working goes wrong.';
  const nextStepRule = stuck
    ? `- "nextStep": ONE small next step or one guiding question, so they can go on by themselves.
- NEVER give the final result, NEVER say which option is correct, NEVER write out the rest of the solution.`
    : '- "nextStep": how to fix that step, in 1–2 short sentences (the student already sees the correct answer).';

  return `You are a kind, patient maths tutor for a Georgian student preparing for the national university-entrance exam.
The photo shows the student's own handwritten working on the problem below. ${task}

Problem: ${ctx.question.text}
${options ? `Options: ${options}\n` : ''}Verified solution (secret, for you only):
${steps}

Skills you may name (use ONLY these codes):
${skillList}

Rules:
- Read ONLY what is actually written. Never assume a step the photo does not show and never guess what the student meant.
- If the photo is blurred, too dark, cut off, empty or not maths, set "readable": false and leave everything else empty.
- If the working is clearly for a different problem, set "matchesQuestion": false.
- "progress": "mistake" if a written step is wrong, "stopped" if every written step is right but the working stops
  before the end, "on_track" if everything written is right.
- "where": the exact place, quoting the student's line briefly (e.g. "მესამე სტრიქონი: $2x+3=7$").
- "issue": what goes wrong there (for "stopped": what is missing), in 1–2 short, simple sentences.
${nextStepRule}
- "mistakes": every wrong step (at least one when "progress" is "mistake"). "type" is "conceptual" (wrong rule or idea),
  "calculation" (arithmetic or algebra slip),
  "misread" (copied a number or the question wrong) or "incomplete" (stopped before the end). "skillCode" is the skill
  the error belongs to: an arithmetic slip while adding fractions is N2, not the problem's topic. [] if there is none.
- Write in Georgian, in simple words for a beginner. Maths in LaTeX inside $...$ (escape backslashes for JSON).

Return JSON:
{"readable": true, "matchesQuestion": true, "progress": "mistake", "where": "...", "issue": "...", "nextStep": "...",
"mistakes": [{"type": "calculation", "skillCode": "N2", "description": "..."}]}`;
}

/** Strips LaTeX/markup noise so "$\frac{3}{4}$" and "\frac{3}{4}" compare equal. */
const squash = (s: string) => s.replace(/[$\s{}\\.,]/g, '').toLowerCase();

/** Announcing the answer: "the answer is …", "the correct answer", or naming an option ("ვარიანტი გ", "პასუხი (ბ)"). */
const GIVEAWAY = /პასუხია|სწორი პასუხი|(ვარიანტი|პასუხი)\s*\(?[ა-ე]\)?(?![ა-ჰ])/;

/**
 * Removes the sentences that would give the answer away: a giveaway phrase, the correct option's text (when it is
 * specific enough to mean something, ≥ 3 characters) or the solution's final step. '' when nothing safe is left.
 */
export function dropLeakingSentences(text: string, correctOptionText: string, finalStep: string): string {
  const answer = squash(correctOptionText);
  const last = squash(finalStep);
  const leaks = (t: string) => GIVEAWAY.test(t) || (answer.length >= 3 && squash(t).includes(answer)) || (last.length >= 8 && squash(t).includes(last));
  if (!leaks(text)) return text;
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !leaks(sentence))
    .join(' ')
    .trim();
}

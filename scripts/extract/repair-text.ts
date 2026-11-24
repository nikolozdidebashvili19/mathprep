/**
 * T-007 follow-up: fixes look-alike letters from other scripts in extracted questions (სიბრطყე → სიბრტყე).
 * Sends the page image + current text back to the model, asks it to fix only those letters, and keeps the answer
 * only if acceptTextRepair passes. Anything it cannot fix stays flagged for admin review (T-011).
 * Usage: npm run content:repair-text -- [--exam 2024-V1] [--delay 5000]   then: npm run seed -- --refresh-drafts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { CONTENT_DIR, log, numberArg, PAGES_DIR, readIndex, selectExams } from './content-index.ts';
import {
  acceptTextRepair,
  findForeignLetters,
  FOREIGN_LETTERS_PROBLEM,
  parseModelJson,
  QuestionImportSchema,
  type QuestionImport,
} from './question-import.ts';
import { callWithRetry, sleep } from './vision/call-with-retry.ts';
import { createVisionProvider } from './vision/vision-provider.ts';

const argv = process.argv;
const delayMs = numberArg(argv, '--delay', 5000);
const provider = createVisionProvider();

const RepairSchema = z.object({ text: z.string(), options: z.array(z.object({ key: z.string(), text: z.string() })) });

const hasForeign = (q: QuestionImport) => [q.text, ...q.options.map((o) => o.text)].some((s) => findForeignLetters(s).length > 0);

const buildPrompt = (q: QuestionImport) => `The image is a page of a Georgian maths exam. Below is question ${q.number} as transcribed.
Some Georgian letters were wrongly written as letters from other scripts (Arabic, Cyrillic, Armenian, Hebrew, Korean, or Latin
inside a Georgian word),
for example "სიბრطყე" should be "სიბრტყე". Compare with the page and replace ONLY those wrong letters with the correct
Georgian letters. Change nothing else: keep the LaTeX, spacing and wording exactly. Escape LaTeX backslashes for JSON.

${JSON.stringify({ text: q.text, options: q.options })}

Return the same JSON shape: {"text": "...", "options": [{"key": "...", "text": "..."}]}`;

async function repair(examId: string, q: QuestionImport): Promise<QuestionImport | string> {
  const image = path.join(PAGES_DIR, examId, 'exam', `p${String(q.sourcePage).padStart(3, '0')}.png`);
  const images = [{ mimeType: 'image/png' as const, base64: readFileSync(image).toString('base64') }];
  try {
    const parsed = RepairSchema.safeParse(parseModelJson(await callWithRetry(provider, buildPrompt(q), images)));
    if (!parsed.success) return 'model output failed validation';
    const fixed = parsed.data;
    const sameKeys = fixed.options.map((o) => o.key).join() === q.options.map((o) => o.key).join();
    const ok = sameKeys && acceptTextRepair(q.text, fixed.text) && q.options.every((o, i) => acceptTextRepair(o.text, fixed.options[i].text));
    if (!ok) return `rejected: ${JSON.stringify(fixed.text.slice(0, 80))}`;
    return { ...q, text: fixed.text, options: q.options.map((o, i) => ({ ...o, text: fixed.options[i].text })) };
  } catch (error) {
    return (error as Error).message.slice(0, 120);
  }
}

const withoutForeignProblem = (problems: string[]) => problems.filter((p) => !p.startsWith(FOREIGN_LETTERS_PROBLEM));

let fixedCount = 0;
let failedCount = 0;
for (const exam of selectExams(readIndex(), argv)) {
  const file = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  if (!existsSync(file)) continue;
  const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(file, 'utf8')));
  const out: QuestionImport[] = [];
  for (const q of questions) {
    if (!hasForeign(q)) {
      out.push(q);
      continue;
    }
    const result = await repair(exam.id, q);
    await sleep(delayMs);
    if (typeof result === 'string') {
      failedCount++;
      const letters = [...new Set([q.text, ...q.options.map((o) => o.text)].flatMap(findForeignLetters))].join('');
      log(`${q.code}: not fixed (${result}), flagged`);
      const problems = [...withoutForeignProblem(q.extraction.problems), `${FOREIGN_LETTERS_PROBLEM}: ${letters}`];
      out.push({ ...q, extraction: { ...q.extraction, problems } });
      continue;
    }
    fixedCount++;
    log(`${q.code}: fixed`);
    out.push({ ...result, extraction: { ...q.extraction, problems: withoutForeignProblem(q.extraction.problems) } });
  }
  writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
}
log(`foreign letters: ${fixedCount} questions fixed, ${failedCount} left flagged`);

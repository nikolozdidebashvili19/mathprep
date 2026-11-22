/**
 * Generates step-by-step explanations for multiple-choice questions → content/explanations/<exam-id>.json.
 * Usage: npm run content:explain -- [--exam 2019-V1] [--only 3,4] [--limit 10] [--force] [--batch 3] [--delay 5000]
 * Token-lean: shared instructions per batch, figures only when a question has one, short JSON output, resumable.
 * Questions with broken letters (T-007 repair pending) are skipped until their text is fixed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_DIR, log, numberArg, readIndex, selectExams } from './content-index.ts';
import {
  buildExplanationPrompt,
  checkExplanation,
  ModelExplanationBatchSchema,
  type Explanation,
  type ModelExplanation,
} from './explanation.ts';
import { findForeignLetters, parseModelJson, QuestionImportSchema, type QuestionImport } from './question-import.ts';
import { callWithRetry, sleep } from './vision/call-with-retry.ts';
import { createVisionProvider } from './vision/vision-provider.ts';

const argv = process.argv;
const force = argv.includes('--force');
const batchSize = numberArg(argv, '--batch', 3);
const delayMs = numberArg(argv, '--delay', 5000);
const limit = numberArg(argv, '--limit', Infinity);
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',').map(Number)) : null;

const provider = createVisionProvider();
const by = { provider: provider.name, model: provider.model };
log(`provider: ${provider.name} / ${provider.model}`);

const brokenText = (q: QuestionImport) => [q.text, ...q.options.map((o) => o.text)].some((s) => findForeignLetters(s).length > 0);

async function ask(batch: QuestionImport[], guided: boolean): Promise<Map<number, ModelExplanation> | string> {
  const withImage = batch.filter((q) => q.images.length > 0);
  const images = withImage.map((q) => ({
    mimeType: 'image/png' as const,
    base64: readFileSync(path.join(CONTENT_DIR, '..', q.images[0])).toString('base64'),
  }));
  try {
    const raw = await callWithRetry(provider, buildExplanationPrompt(batch, withImage.map((q) => q.number), guided), images);
    const parsed = ModelExplanationBatchSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) return `model output failed validation — ${parsed.error.issues[0]?.message}`;
    return new Map(parsed.data.questions.map((e) => [e.number, e]));
  } catch (error) {
    return (error as Error).message.slice(0, 160);
  }
}

const toRecord = (q: QuestionImport, e: ModelExplanation, method: Explanation['method'], verified: boolean): Explanation => ({
  code: q.code,
  steps: e.steps,
  commonMistake: e.commonMistake,
  method,
  verified,
  ...by,
});

/** Second attempt with the key; kept only if its own final answer matches. */
async function askGuided(q: QuestionImport): Promise<Explanation | null> {
  const guided = await ask([q], true);
  await sleep(delayMs);
  const e = typeof guided === 'string' ? undefined : guided.get(q.number);
  return e && checkExplanation(e, q.answer).verified ? toRecord(q, e, 'guided', true) : null;
}

/** Blind attempt for the batch, then a guided attempt for each question whose answer did not match the key. */
async function explainBatch(batch: QuestionImport[]): Promise<Explanation[] | string> {
  const blind = await ask(batch, false);
  await sleep(delayMs);
  if (typeof blind === 'string') return blind;
  const records: Explanation[] = [];
  for (const q of batch) {
    const e = blind.get(q.number);
    if (e && checkExplanation(e, q.answer).verified) {
      records.push(toRecord(q, e, 'blind', true));
      continue;
    }
    const guided = await askGuided(q);
    log(`${q.code}: blind answer did not match the key → ${guided ? 'guided explanation (review first)' : 'no usable explanation'}`);
    if (guided) records.push(guided);
  }
  return records;
}

let budget = limit;
for (const exam of selectExams(readIndex(), argv)) {
  if (budget <= 0) break;
  const questionFile = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  if (!existsSync(questionFile)) continue;
  const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(questionFile, 'utf8')));
  const outFile = path.join(CONTENT_DIR, 'explanations', `${exam.id}.json`);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const byCode = new Map((existsSync(outFile) ? (JSON.parse(readFileSync(outFile, 'utf8')) as Explanation[]) : []).map((e) => [e.code, e]));
  const save = () => writeFileSync(outFile, `${JSON.stringify([...byCode.values()], null, 2)}\n`);

  const todo = questions
    .filter((q) => q.type === 'multiple_choice' && !brokenText(q) && (!only || only.has(q.number)) && (force || !byCode.has(q.code)))
    .slice(0, budget);
  budget -= todo.length;

  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const result = await explainBatch(batch);
    const label = `${exam.id} Q${batch[0].number}–Q${batch.at(-1)!.number}`;
    if (typeof result === 'string') {
      log(`${label}: skipped (re-run to retry) — ${result}`);
      continue;
    }
    result.forEach((r) => byCode.set(r.code, r));
    save();
    log(`${label}: ${result.filter((r) => r.method === 'blind').length} verified blind, ${result.filter((r) => r.method === 'guided').length} guided`);
  }
  log(`${exam.id}: ${byCode.size} explanations in ${path.relative(process.cwd(), outFile)}`);
}

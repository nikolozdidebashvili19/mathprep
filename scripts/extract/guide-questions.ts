/**
 * Generates "I'm stuck" guidance for multiple-choice questions → content/guidance/<exam-id>.json.
 * Only questions with a blind-verified explanation (the guidance is built from that solution).
 * Usage: npm run content:guide -- [--exam 2019-V1] [--only 3,4] [--limit 10] [--force] [--batch 4] [--delay 5000]
 * Token-lean: text only, shared instructions per batch, short JSON, resumable; leaky guidance is dropped.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_DIR, log, numberArg, readIndex, selectExams } from './content-index.ts';
import { ExplanationSchema } from './explanation.ts';
import { buildGuidancePrompt, checkGuidance, ModelGuidanceBatchSchema, type Guidance } from './guidance.ts';
import { parseModelJson, QuestionImportSchema, type QuestionImport } from './question-import.ts';
import { callWithRetry, sleep } from './vision/call-with-retry.ts';
import { createVisionProvider } from './vision/vision-provider.ts';

const argv = process.argv;
const force = argv.includes('--force');
const batchSize = numberArg(argv, '--batch', 4);
const delayMs = numberArg(argv, '--delay', 5000);
const limit = numberArg(argv, '--limit', Infinity);
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',').map(Number)) : null;

const provider = createVisionProvider();
log(`provider: ${provider.name} / ${provider.model}`);

type Item = { question: QuestionImport; steps: string[] };

async function guideBatch(batch: Item[]): Promise<Guidance[] | string> {
  try {
    const raw = await callWithRetry(provider, buildGuidancePrompt(batch), []);
    const parsed = ModelGuidanceBatchSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) return `model output failed validation — ${parsed.error.issues[0]?.message}`;
    const byNumber = new Map(parsed.data.questions.map((g) => [g.number, g]));
    const records: Guidance[] = [];
    for (const { question, steps } of batch) {
      const g = byNumber.get(question.number);
      if (!g) continue;
      const correct = question.options.find((o) => o.key === question.answer)?.text ?? '';
      const check = checkGuidance(g, correct, steps.at(-1) ?? '');
      if (!check.ok) {
        log(`${question.code}: dropped — ${check.problems[0]}`);
        continue;
      }
      records.push({ code: question.code, restate: g.restate, plan: g.plan, hints: g.hints, provider: provider.name, model: provider.model });
    }
    return records;
  } catch (error) {
    return (error as Error).message.slice(0, 160);
  }
}

let budget = limit;
for (const exam of selectExams(readIndex(), argv)) {
  if (budget <= 0) break;
  const questionFile = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  const explanationFile = path.join(CONTENT_DIR, 'explanations', `${exam.id}.json`);
  if (!existsSync(questionFile) || !existsSync(explanationFile)) continue;
  const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(questionFile, 'utf8')));
  const verified = new Map(
    ExplanationSchema.array()
      .parse(JSON.parse(readFileSync(explanationFile, 'utf8')))
      .filter((e) => e.method === 'blind' && e.verified)
      .map((e) => [e.code, e.steps])
  );
  const outFile = path.join(CONTENT_DIR, 'guidance', `${exam.id}.json`);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const byCode = new Map((existsSync(outFile) ? (JSON.parse(readFileSync(outFile, 'utf8')) as Guidance[]) : []).map((g) => [g.code, g]));
  const save = () => writeFileSync(outFile, `${JSON.stringify([...byCode.values()], null, 2)}\n`);

  const todo: Item[] = questions
    .filter((q) => q.type === 'multiple_choice' && verified.has(q.code) && (!only || only.has(q.number)) && (force || !byCode.has(q.code)))
    .slice(0, budget)
    .map((q) => ({ question: q, steps: verified.get(q.code) ?? [] }));
  budget -= todo.length;

  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const result = await guideBatch(batch);
    await sleep(delayMs);
    const label = `${exam.id} Q${batch[0].question.number}–Q${batch.at(-1)!.question.number}`;
    if (typeof result === 'string') {
      log(`${label}: skipped (re-run to retry) — ${result}`);
      continue;
    }
    result.forEach((g) => byCode.set(g.code, g));
    save();
    log(`${label}: ${result.length}/${batch.length} guided`);
  }
  log(`${exam.id}: ${byCode.size} guidance records in ${path.relative(process.cwd(), outFile)}`);
}

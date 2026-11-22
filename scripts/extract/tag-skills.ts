/**
 * T-009: content/questions/<exam-id>.json → model → content/tags/<exam-id>.json (skills, primary skill, difficulty,
 * off-program). Tags are suggestions: the seed applies them only to `draft` questions; admin review (T-011) approves.
 * Usage: npm run content:tag -- [--exam 2024-V1] [--only 4,5] [--force] [--batch 5] [--delay 5000]
 * Saves after every batch, so a run stopped by rate limits resumes where it left off.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_DIR, log, numberArg, readIndex, selectExams } from './content-index.ts';
import { parseModelJson, QuestionImportSchema, type QuestionImport } from './question-import.ts';
import { buildTagPrompt, ModelTagBatchSchema, toSkillTag, type SkillTag, type TagSkill } from './skill-tag.ts';
import { callWithRetry, sleep } from './vision/call-with-retry.ts';
import { createVisionProvider } from './vision/vision-provider.ts';

const argv = process.argv;
const force = argv.includes('--force');
const batchSize = numberArg(argv, '--batch', 5);
const delayMs = numberArg(argv, '--delay', 5000);
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',').map(Number)) : null;

const skills: TagSkill[] = JSON.parse(readFileSync(path.join(CONTENT_DIR, 'skills.json'), 'utf8')).skills;
const knownCodes = new Set(skills.map((s) => s.code));
const provider = createVisionProvider();
const by = { provider: provider.name, model: provider.model };
log(`provider: ${provider.name} / ${provider.model}`);

const tagLine = (t: SkillTag) =>
  `${t.code}: ${t.offProgram ? 'OFF-PROGRAM' : t.skills.join(',')} d${t.difficulty}${t.problems.length ? `  ⚠ ${t.problems.join('; ')}` : ''}`;

async function tagBatch(year: number, batch: QuestionImport[]): Promise<SkillTag[] | string> {
  const withImage = batch.filter((q) => q.images.length > 0);
  const images = withImage.map((q) => ({
    mimeType: 'image/png' as const,
    base64: readFileSync(path.join(CONTENT_DIR, '..', q.images[0])).toString('base64'),
  }));
  const prompt = buildTagPrompt(year, batch, skills, withImage.map((q) => q.number));
  try {
    const raw = await callWithRetry(provider, prompt, images);
    const parsed = ModelTagBatchSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) return `model output failed validation — ${parsed.error.issues[0]?.message}`;
    const byNumber = new Map(parsed.data.questions.map((t) => [t.number, t]));
    const missing = batch.filter((q) => !byNumber.has(q.number)).map((q) => q.number);
    if (missing.length) log(`   no tag returned for Q${missing.join(', Q')} (re-run to retry)`);
    return batch.filter((q) => byNumber.has(q.number)).map((q) => toSkillTag(q.code, byNumber.get(q.number)!, knownCodes, by));
  } catch (error) {
    return (error as Error).message.slice(0, 160);
  }
}

for (const exam of selectExams(readIndex(), argv)) {
  const questionFile = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  if (!existsSync(questionFile)) continue;
  const questions = QuestionImportSchema.array().parse(JSON.parse(readFileSync(questionFile, 'utf8')));
  const outFile = path.join(CONTENT_DIR, 'tags', `${exam.id}.json`);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const existing: SkillTag[] = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : [];
  const byCode = new Map(existing.map((t) => [t.code, t]));

  const todo = questions.filter((q) => (!only || only.has(q.number)) && (force || !byCode.has(q.code)));
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const result = await tagBatch(exam.year, batch);
    const label = `${exam.id} Q${batch[0].number}–Q${batch.at(-1)!.number}`;
    await sleep(delayMs);
    if (typeof result === 'string') {
      log(`${label}: skipped (re-run to retry) — ${result}`);
      continue;
    }
    result.forEach((t) => byCode.set(t.code, t));
    const order = new Map(questions.map((q, idx) => [q.code, idx]));
    writeFileSync(outFile, `${JSON.stringify([...byCode.values()].sort((a, b) => order.get(a.code)! - order.get(b.code)!), null, 2)}\n`);
    result.forEach((t) => log(tagLine(t)));
  }
  log(`${exam.id}: ${byCode.size}/${questions.length} tagged in ${path.relative(process.cwd(), outFile)}`);
}

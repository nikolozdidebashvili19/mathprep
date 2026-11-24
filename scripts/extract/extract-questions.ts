/**
 * T-007: page image → vision model → content/questions/<exam-id>.json (+ diagram crops in content/images/).
 * Usage: npm run content:extract -- --exam 2026-V1 [--only 4,5] [--force] [--delay 5000]
 * Needs: content:render + content:locate done, an answer key (T-008), and the AI_PROVIDER key in .env.
 * Saves after every question, so a run stopped by rate limits resumes where it left off.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createCanvas, loadImage } from '@napi-rs/canvas';

import { AnswerKeySchema } from './answer-key.ts';
import { CONTENT_DIR, log, numberArg, PAGES_DIR, readIndex, selectExams } from './content-index.ts';
import {
  checkExtractedQuestion,
  IMAGE_OPTION_TEXT,
  parseModelJson,
  QuestionImportSchema,
  VisionQuestionSchema,
  type QuestionImport,
  type VisionQuestion,
} from './question-import.ts';
import { callWithRetry, sleep } from './vision/call-with-retry.ts';
import { createVisionProvider, type VisionProvider } from './vision/vision-provider.ts';

const DIAGRAM_MARGIN = 0.02;
const REROLL_TEMPERATURE = 0.4;
const argv = process.argv;
const force = argv.includes('--force');
const delayMs = numberArg(argv, '--delay', 5000);
const onlyArg = argv[argv.indexOf('--only') + 1];
const only = argv.includes('--only') ? new Set(onlyArg.split(',').map(Number)) : null;

const pagePath = (examId: string, page: number) => path.join(PAGES_DIR, examId, 'exam', `p${String(page).padStart(3, '0')}.png`);

const examName = (year: number) => `the ${year} Georgian national university-entrance exam in mathematics`;

const buildPrompt = (year: number, n: number, isMultipleChoice: boolean) => `You are digitising ${examName(year)}.
The image is one page of the official booklet. Extract ONLY question ${n} (its header looks like "(points) ${n}.").

Rules:
- "text": the question statement in Georgian exactly as printed. Do not translate or paraphrase. Do not include the "(points) ${n}." header.
- Write the text on one line (no line breaks). Escape every LaTeX backslash for JSON (\\\\frac, not \\frac).
- Write every mathematical expression in LaTeX wrapped in $...$ (e.g. $\\angle BAC = 28^\\circ$, $\\frac{3}{4}$, $\\sqrt{2}$).
- "options": ${isMultipleChoice
    ? 'the four answer options in order, keys exactly "ა", "ბ", "გ", "დ" (the printed labels), text in the same LaTeX style. ' +
      `If an option is a picture (graph, figure) and not text, set its text to exactly "${IMAGE_OPTION_TEXT}", ` +
      'set "hasDiagram" to true and make "diagramBox" cover all the option pictures with their labels.'
    : 'an empty array (this is a written-answer question).'}
- "hasDiagram": true if the question has a figure, graph or table drawn on the page.
- "diagramBox": [ymin, xmin, ymax, xmax] on a 0–1000 scale tightly around the figure only (not the text), or null.
- "confidence": 0–1, how sure you are that text and options are transcribed exactly.
- "notes": anything uncertain (illegible symbols, question continues on another page). Empty string if none.

Return JSON: {"number": ${n}, "text": "...", "options": [{"key": "...", "text": "..."}],
"hasDiagram": false, "diagramBox": null, "confidence": 0.0, "notes": ""}`;

async function requestOnce(
  provider: VisionProvider,
  prompt: string,
  imageFile: string,
  temperature: number
): Promise<{ json: unknown } | { error: string }> {
  let raw = '';
  try {
    const image = { mimeType: 'image/png' as const, base64: readFileSync(imageFile).toString('base64') };
    raw = await callWithRetry(provider, prompt, [image], temperature);
    return { json: parseModelJson(raw) };
  } catch (error) {
    const message = (error as Error).message;
    const at = Number(/position (\d+)/.exec(message)?.[1] ?? -1);
    const context = at >= 0 ? ` near ${JSON.stringify(raw.slice(Math.max(0, at - 80), at + 40))}` : '';
    return { error: `${message.slice(0, 100)}${context}` };
  }
}

/**
 * Calls the model and parses its JSON. Temperature 0 repeats the same malformed JSON or refusal (RECITATION)
 * on every run, so one re-roll is warmer. Never throws: a failed question is skipped, not the whole run.
 */
async function requestQuestionJson(
  provider: VisionProvider,
  prompt: string,
  imageFile: string,
  n: number
): Promise<{ json: unknown } | { error: string }> {
  const first = await requestOnce(provider, prompt, imageFile, 0);
  if ('json' in first) return first;
  log(`   Q${n} failed (${first.error.slice(0, 60)}), re-asking at temperature ${REROLL_TEMPERATURE}`);
  return requestOnce(provider, prompt, imageFile, REROLL_TEMPERATURE);
}

/** A figure without a box repeats at temperature 0 (2015 Q24, Q27); one warmer re-ask, kept only if it has a box. */
async function rerollForDiagramBox(
  provider: VisionProvider,
  prompt: string,
  imageFile: string,
  n: number,
  original: VisionQuestion
): Promise<VisionQuestion> {
  log(`   Q${n}: diagram without a box, re-asking at temperature ${REROLL_TEMPERATURE}`);
  const result = await requestOnce(provider, prompt, imageFile, REROLL_TEMPERATURE);
  const parsed = 'json' in result ? VisionQuestionSchema.safeParse(result.json) : null;
  return parsed?.success && parsed.data.diagramBox ? parsed.data : original;
}

async function cropDiagram(imageFile: string, box: [number, number, number, number], outFile: string) {
  const img = await loadImage(imageFile);
  const [y0, x0, y1, x1] = box.map((v) => v / 1000);
  const left = Math.max(0, x0 - DIAGRAM_MARGIN) * img.width;
  const top = Math.max(0, y0 - DIAGRAM_MARGIN) * img.height;
  const width = (Math.min(1, x1 + DIAGRAM_MARGIN) * img.width) - left;
  const height = (Math.min(1, y1 + DIAGRAM_MARGIN) * img.height) - top;
  const canvas = createCanvas(Math.round(width), Math.round(height));
  canvas.getContext('2d').drawImage(img, left, top, width, height, 0, 0, width, height);
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, canvas.toBuffer('image/png'));
}

const provider = createVisionProvider();
log(`provider: ${provider.name} / ${provider.model}`);

for (const exam of selectExams(readIndex(), argv)) {
  if (exam.locator?.status !== 'complete') {
    log(`${exam.id}: skipped — question pages only partly located (T-006); needs a page-finding pass first`);
    continue;
  }
  const key = AnswerKeySchema.parse(JSON.parse(readFileSync(path.join(CONTENT_DIR, 'answer-keys', `${exam.id}.json`), 'utf8')));
  const outFile = path.join(CONTENT_DIR, 'questions', `${exam.id}.json`);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const existing: QuestionImport[] = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : [];
  const byNumber = new Map(existing.map((q) => [q.number, q]));

  for (const located of exam.questions) {
    const n = located.n;
    if (only && !only.has(n)) continue;
    if (!force && byNumber.has(n)) continue;

    const isMultipleChoice = String(n) in key.mc;
    const imageFile = pagePath(exam.id, located.page);
    const result = await requestQuestionJson(provider, buildPrompt(exam.year, n, isMultipleChoice), imageFile, n);
    if ('error' in result) {
      log(`${exam.id} Q${n}: no usable model output, skipped (re-run to retry) — ${result.error}`);
      await sleep(delayMs);
      continue;
    }
    const parsed = VisionQuestionSchema.safeParse(result.json);
    if (!parsed.success) {
      log(`${exam.id} Q${n}: model output failed validation, skipped (re-run to retry) — ${parsed.error.issues[0]?.message}`);
      await sleep(delayMs);
      continue;
    }

    let vq = parsed.data;
    if (vq.hasDiagram && !vq.diagramBox) vq = await rerollForDiagramBox(provider, buildPrompt(exam.year, n, isMultipleChoice), imageFile, n, vq);
    const problems = checkExtractedQuestion(vq, n, isMultipleChoice);
    const images: string[] = [];
    if (vq.diagramBox && !problems.includes('diagram box is out of range')) {
      const rel = `content/images/${exam.id}/q${String(n).padStart(2, '0')}.png`;
      await cropDiagram(imageFile, vq.diagramBox, path.join(CONTENT_DIR, '..', rel));
      images.push(rel);
    }

    const record = QuestionImportSchema.parse({
      code: `${exam.id}-Q${String(n).padStart(2, '0')}`,
      examId: exam.id,
      number: n,
      sourcePage: located.page,
      type: isMultipleChoice ? 'multiple_choice' : 'written',
      maxPoints: located.points,
      text: vq.text,
      options: isMultipleChoice ? vq.options : [],
      answer: isMultipleChoice ? key.mc[String(n)] : key.final?.[String(n)] ?? '',
      images,
      extraction: { provider: provider.name, model: provider.model, confidence: vq.confidence, notes: vq.notes, problems },
    });
    byNumber.set(n, record);
    writeFileSync(outFile, `${JSON.stringify([...byNumber.values()].sort((a, b) => a.number - b.number), null, 2)}\n`);
    log(`${exam.id} Q${n}: ${problems.length ? `⚠ ${problems.join('; ')}` : 'ok'}${images.length ? ' [diagram]' : ''}`);
    await sleep(delayMs);
  }
  log(`${exam.id}: ${byNumber.size}/${exam.questions.length} questions in ${path.relative(process.cwd(), outFile)}`);
}

/**
 * T-006: writes question → page → points into content/index.json using the pdftotext layer.
 * Usage: npm run content:locate [-- --exam 2024-V1]
 * Requires `pdftotext` (poppler) on PATH; it ships with Git for Windows.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { log, RAW_DIR, readIndex, selectExams, writeIndex } from './content-index.ts';
import { locateQuestions } from './question-locator.ts';

const pageTexts = (pdfPath: string): string[] =>
  execFileSync('pdftotext', ['-layout', pdfPath, '-'], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split('\f');

const index = readIndex();
const selected = new Set(selectExams(index, process.argv).map((e) => e.id));

for (const exam of index) {
  if (!selected.has(exam.id)) continue;
  const result = locateQuestions(pageTexts(path.join(RAW_DIR, exam.examFile)));
  exam.locator = { pattern: result.pattern, status: result.status, totalPoints: result.totalPoints };
  exam.questions = result.questions;
  log(`${exam.id.padEnd(8)} ${result.status.padEnd(8)} questions=${result.questions.length} points=${result.totalPoints}`);
}

writeIndex(index);
log('content/index.json updated');

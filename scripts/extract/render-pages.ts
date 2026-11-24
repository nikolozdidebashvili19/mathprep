/**
 * T-006: renders every exam page to PNG → content/raw/pages/<exam-id>/p001.png (gitignored).
 * Usage: npm run content:render [-- --exam 2024-V1] [-- --dpi 200] [-- --force]
 * Existing images are skipped unless --force is given.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { log, numberArg, PAGES_DIR, RAW_DIR, readIndex, selectExams } from './content-index.ts';

const PDF_POINTS_PER_INCH = 72;
const pdfjsRoot = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
// In Node, pdfjs reads these with fs.readFile, so it needs a plain path (not a file:// URL),
// and it insists on a trailing "/". Forward slashes work for fs on Windows too.
const assetDir = (dir: string) => `${path.posix.join(...pdfjsRoot.split(path.sep), dir)}/`;

const dpi = numberArg(process.argv, '--dpi', 200);
const force = process.argv.includes('--force');
const scale = dpi / PDF_POINTS_PER_INCH;

async function renderPdf(pdfPath: string, outDir: string): Promise<number> {
  mkdirSync(outDir, { recursive: true });
  const loadingTask = getDocument({
    data: new Uint8Array(readFileSync(pdfPath)),
    standardFontDataUrl: assetDir('standard_fonts'),
    cMapUrl: assetDir('cmaps'),
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;

  let rendered = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const outFile = path.join(outDir, `p${String(pageNumber).padStart(3, '0')}.png`);
    if (!force && existsSync(outFile)) continue;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // pdfjs is typed against the DOM canvas; @napi-rs/canvas implements the same 2D API in Node.
    // This tooling-only boundary is the one place a cast is unavoidable.
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;

    writeFileSync(outFile, canvas.toBuffer('image/png'));
    page.cleanup();
    rendered++;
  }
  await loadingTask.destroy();
  return rendered;
}

for (const exam of selectExams(readIndex(), process.argv)) {
  const files = exam.answerKeyInExamFile ? [exam.examFile] : [exam.examFile, exam.answerKeyFile];
  for (const file of files) {
    const sub = file === exam.examFile ? 'exam' : 'answers';
    const count = await renderPdf(path.join(RAW_DIR, file), path.join(PAGES_DIR, exam.id, sub));
    log(`${exam.id.padEnd(8)} ${sub.padEnd(7)} rendered=${count} (dpi ${dpi})`);
  }
}

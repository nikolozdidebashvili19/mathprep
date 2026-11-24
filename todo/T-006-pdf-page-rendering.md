# T-006 · Render PDF pages to images + locate questions

**Epic:** Content pipeline · **Week:** 2 · **Status:** done · **Depends on:** T-001

## What was built
- `npm run content:render [-- --exam 2024-V1] [-- --dpi 200] [-- --force]`: renders every page with `pdfjs-dist` + `@napi-rs/canvas` (no Python or poppler needed) → `content/raw/pages/<exam-id>/{exam,answers}/p001.png`. Gitignored with `content/raw/`. Pages that already exist are skipped unless `--force`
- `npm run content:locate [-- --exam 2024-V1]`: reads the `pdftotext` digit layer and writes `locator` + `questions[]: { n, page, points }` into `content/index.json`
- The locator logic is pure and tested: `scripts/extract/question-locator.ts` (+ spec)
- The scripts are TypeScript run directly by Node 24. Added `allowImportingTsExtensions` to tsconfig and `scripts/package.json` (`"type": "module"`)

## Results
- **594 pages rendered at 200 DPI, 103 MB.** I checked pages by eye: Georgian text, formulas and diagrams are sharp
- Locator:

| Exams | Status | Questions / points |
|---|---|---|
| 2023–2026 | complete | 41 / 51 |
| 2021, 2022 | complete | 35 / 51 |
| 2020 | complete | 40 / 59 |
| 2015–2019 | complete | 40 / 59 (older "N … points" header; regex fixed 2026-11-19) |

## Gotchas fixed
- In Node, pdfjs loads its fallback fonts with `fs.readFile`, so `standardFontDataUrl` must be a plain path ending in `/`, not a `file://` URL. Otherwise any text in fonts the PDF doesn't embed may draw wrong or not at all
- `PDFDocumentProxy.destroy` doesn't exist in pdfjs 6; use `loadingTask.destroy()`

## Notes for later tickets
- The exam format changed in 2020 (from a number-first to a points-first layout) and again in 2021 (35 → 41 questions). This is a strong hint for `formatEra`
- The answer keys (`answers/`) are clean tables: MC letters ა/ბ/გ/დ for the first ~30 questions, then numeric/LaTeX answers. That makes T-008 straightforward

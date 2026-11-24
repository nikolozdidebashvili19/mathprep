# T-007 · Vision extraction: pages → question JSON

**Epic:** Content pipeline · **Week:** 2 · **Status:** done (all 13 exams, 514 questions; follow-ups below) · **Depends on:** T-006, T-008

## What was built
- `npm run content:extract -- --exam 2026-V1 [--only 4,5] [--force] [--delay 3000]`
- **Provider adapter** `scripts/extract/vision/`: `AI_PROVIDER=gemini` (default) via the REST API (no SDK). Adding Anthropic later = one more provider file; nothing else changes
- Default model **`gemini-3.5-flash-lite`** (free key): ~2s per question. `gemini-flash-latest` and `gemini-3.8-flash` hung for over 2 minutes on this key; `gemini-2.5-*` is closed to new users. Override with `GEMINI_MODEL`
- One call per question (page image + strict prompt: Georgian verbatim, math in LaTeX `$…$`, options ა/ბ/გ/დ, diagram box). Output is validated with Zod (`VisionQuestionSchema`) plus `checkExtractedQuestion` (number, exactly 4 options for MC, box sanity)
- Merged with the locator (page, points) and the answer key (T-008) → `content/questions/<id>.json` (`QuestionImportSchema`). Diagrams are cropped → `content/images/<id>/qNN.png`
- Saves after every question, so a run resumes after rate limits. Retries 429/5xx/timeouts with backoff (a 2-minute request timeout)

## 2026 results
- 41/41 extracted, 0 automatic flags, 1 temporary 503 retried
- Spot-checked against the page images: Q1, Q4, Q9, Q24 and Q30 are right, and the answer key agrees when I solve them by hand. The diagram detection is right (only Q30 has a figure) and the crop is clean
- **Known weakness of the free lite model:** occasional single-letter Georgian typos (Q4 "ჩააზულია" for "ჩახაზულია", Q38 "წროფის" for "წრფის"). The math was correct in every sample
- **The model's `confidence` is always 1.0, so it's useless as a review signal.** Review must rely on the automatic checks + admin review (T-011)

## Progress (2026-11-20)
- **All 13 exams extracted: 514 questions** (2023–2026: 41 each, 2021–22: 35, 2015–2020: 40), seeded as `draft`. All extraction flags resolved (0 open): 2015-V2 Q21 got its box on re-run; 2015-V1 Q27 and 2015-V2 Q24 cropped with hand-set boxes (noted in `extraction.notes`); 2021-V1 Q12 keeps one combined labelled image of the four graphs, options read "იხ. გრაფიკი". A `--force` re-extract of those three would overwrite the hand fixes
- **Figure without a box** repeats at temperature 0: `rerollForDiagramBox` re-asks once at 0.4 and keeps the answer only if it has a box
- **Refusals:** Gemini sometimes returns no text with `finishReason: RECITATION` (copyright filter; 2015-V2 Q8). It is not retried with backoff; it gets the warmer re-roll and, if that fails too, the question is skipped and the run continues. A plain re-run usually gets it
- **Malformed diagram box** (2015 Q27: wrong length) becomes `null`, so the question is kept and flagged instead of dropped
- **Picture options** (first seen in 2021 Q12: four graphs as answers): the prompt has the model write `[სურათი]` (`IMAGE_OPTION_TEXT`) as option text and box all option pictures as one diagram. `checkExtractedQuestion` flags it as "picture options: needs per-option images in admin review" (T-011 must handle per-option images; the exam UI in T-012 must render them)
- Fixed: tolerant JSON parsing (`parseModelJson`: repairs unescaped LaTeX like `circ`/`rac`, unwraps `[{…}]`); 503 "high demand" retries are normal
- **Malformed JSON** (2020 Q17: the model dropped a closing quote, identically on every run at temperature 0): `parseModelJson` now turns raw line breaks inside strings into spaces, and unreadable JSON is re-asked once at temperature 0.4 (`requestQuestionJson`). The failure log shows the text around the error position
- 2015–2019 are now **fully located** (T-006 locator fix: 40 questions, 59 points each), so they can be extracted like the newer years

## Still to do
- [x] Finish 2021
- [x] 2020
- [x] 2019 → 2015
- [ ] Written questions that continue onto a second page: send both pages
- [ ] Optional quality pass: re-run with a stronger model (e.g. Anthropic) and diff the texts to find typos automatically
- [ ] Admin review UI (T-011) to fix typos and approve
- **Wrong-script letters** (2026-11-21): the model sometimes writes a look-alike from another script (სიბრطყე, Cyrillic р, Armenian տ) or Latin inside a Georgian word (აბსცissata). `findForeignLetters` now flags both in `checkExtractedQuestion`. Found 54 questions; `npm run content:repair-text` sends the page back to the model and keeps a fix only if `acceptTextRepair` passes (no wrong letters left, ≤2 edits per wrong letter). 14 fixed so far; **the rest is waiting for the Gemini daily quota** — re-run `npm run content:repair-text` then `npm run seed -- --refresh-drafts`. Typos inside correct-script words (წროფის) are left for admin review

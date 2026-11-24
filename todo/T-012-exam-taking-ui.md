# T-012 · Exam-taking UI (diagnostic)

**Epic:** Diagnostic · **Week:** 3 · **Status:** in progress (v1 works for MC on 2024–2026; see "Still to do") · **Depends on:** T-011 (bypassed for v1, see below)

- The student chooses a full exam (year + variant) or the quick check (15–20 questions spread across skills)
- No time limit; MC, numeric and written (photo upload) inputs; KaTeX rendering
- Progress is saved so the student can resume later; a Zustand `diagnostic` store per CLAUDE.md §10

## Design
Follow the Duolingo-style session rules in [T-029](T-029-duolingo-style-ui.md).

## Done (v1, 2026-11-20)
- `/diagnostic` lists exams with `usableForDiagnostic` (2024–2026): question count, points, in-progress answers, last result. CTA: start / resume (sky) / retake
- `/diagnostic/[examCode]` in a new `(session)` route group: full screen, no header/sidebar, same auth + onboarding checks as `(protected)`
- Session screen: X close, segmented progress bar, one question per screen, KaTeX (`MathText` + `splitMathSegments`), question figures, big ა/ბ/გ/დ tiles (sky when selected), sticky bottom bar with back, "არ ვიცი" (I don't know = empty answer) and next/finish. No right/wrong feedback (diagnostic = measurement)
- `DiagnosticSession` model: question order fixed at start, answers saved on every "next" (`PUT /api/diagnostic/answer`), resumes at the first unanswered question. `POST /api/diagnostic/finish` grades and writes Attempts (T-013)
- Completion screen: score / accuracy / time tiles (`animate-pop`) + continue
- Figures are served by `GET /api/question-images/<exam>/qNN.png` (signed-in only, strict path regex) from `content/images/`
- Answer keys never leave the server (`toQuestionView`; covered by a test)
- Tests: `diagnostic.service.spec.ts` (start/resume, ownership, finish idempotency, list), `math-text.spec.ts`

## Decisions
- **T-011 bypassed for v1:** questions are still `draft`; the diagnostic uses them as extracted. Expect rare one-letter typos until admin review exists
- **MC only for now:** the 4 written questions per exam (14 of 51 points) wait for T-014/T-015; `AUTO_GRADED_TYPES` already includes `numeric`

## Still to do
- [ ] Manual signed-in run in a browser (light + dark, phone width)
- [ ] Quick check (15–20 questions across skills): needs skill tags (T-009)
- [ ] Written questions with photo upload (T-014/T-015)
- [ ] Picture options (`[სურათი]`, e.g. 2021 Q12) need per-option images before older exams join the diagnostic
- [ ] Production: `content/images` must ship with the deployment (or move to storage with T-014)

## Quick check (2026-11-22) — the default diagnostic
Agreed with the product owner: a short adaptive check replaces the full exam as the default; the full exam stays as "full mock".
- `/diagnostic/quick` (`QuickCheckSession`): **12 questions, one per topic** (topics ordered by exam weight). Difficulty follows a running ability estimate (start 2.5, ±0.75 per answer; `quick-check-planner.ts`). Pool: tagged MC questions, not off-program, not 2024–2026 (reserved for the full mock), no broken letters (`hasBrokenLetters`)
- Per question: choose option → **photo of the handwritten working (required; "არ ვიცი" skips both)** → send. Answers are final (the next question depends on them), so no back button between questions. Photos are compressed in the browser (≤1600 px JPEG, `compressImage`)
- API: `POST /api/diagnostic/quick/photo` (multipart, `validateFormData`), `POST /api/diagnostic/quick/answer` (photo analysis runs after the response via `after()`), `POST /api/diagnostic/quick/finish` (re-runs failed analyses, then grades)
- Result: score tiles + **"სად გიჭირს"** (weak skills with reasons, incl. the mistakes found in the photos) + strong skills (`skill-evidence.ts`, stored on the session as `skillSummary`)
- Verified end to end against Atlas + Gemini with a throwaway user (cleaned up): the analysis caught a planted `24 + 6 = 32` slip as a calculation mistake on A4

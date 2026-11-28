# T-015 · Handwritten solution grading

**Epic:** Diagnostic · **Week:** 4 · **Status:** todo · **Depends on:** T-014, T-021

- Vision model → LaTeX steps; the student confirms or edits the transcription
- The SymPy service (T-021) checks each step for equivalence with the previous one
- Result: first wrong step, mistake type, skill, correction, and points under the official criteria
- A valid alternative method is accepted. Low confidence → `needs_review`, which does not count toward mastery

## v1 (2026-11-22): diagnostic analysis, no step checking yet
`analyzeWorkPhotoService` sends the photo + question + correct and given answer + allowed skills (the question's skills and prerequisites) to the vision model (`src/shared/lib/ai-vision.ts`, Gemini now, Anthropic later via `AI_PROVIDER`). It returns readable / workShown / approach / mistakes (`conceptual | calculation | misread | incomplete`, each tied to a skill) / skillsShown / feedback (Georgian). Unknown skill codes are dropped; failures are stored as `failed` and retried at finish; transient 429/5xx are retried twice. Still to do here: SymPy step checking (T-021), points under official criteria for written questions, `needs_review`

## Practice photos (2026-11-25)
The same vision adapter now also analyses photos in the daily session ("I'm stuck" stage 3 and "find my mistake", T-020): `buildPracticePhotoPrompt` + `analyzePracticePhotoService` (`progress` mistake / stopped / on_track, `where`, `issue`, `nextStep`, mistakes → skills). Stored on `WorkPhoto` with `context: 'practice'`. Before an answer every sentence that gives the answer away is dropped. Photos of minors still go to the Gemini free tier, as in the quick check: move to a provider that does not train on inputs before launch (T-027)

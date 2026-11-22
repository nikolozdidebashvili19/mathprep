# T-016 · Mastery model (Layer 3)

**Epic:** Diagnostic · **Week:** 5 · **Status:** todo · **Depends on:** T-003

- Pure Elo/BKT-style update, weighted by difficulty, with partial credit. For written work, the error is charged to the skill of the failed step
- Confidence grows with the number of observations. Mistake types are counted separately; repeated conceptual errors send the skill back to `foundation`
- Mastery stays below "solid" until the student answers correctly at difficulty ≥ 3
- Thorough unit tests (pure function, no DB)

## Done (2026-11-22)
- `src/features/mastery/service/mastery-model.ts` (pure, 10 tests): Elo-style update on a 0–1 scale; difficulty d sits at 0.1 + 0.2(d−1); step shrinks with observations; confidence = 1 − e^(−n/4); capped below "solid" (0.7) until a correct answer at difficulty ≥ 3; mistake types counted, 2 conceptual → `foundation`
- `observationsFromDiagnostic`: the photo decides who is blamed (mistake on its own skill: conceptual full weight, slips 0.6; the question skill gets half when the error was elsewhere); correct without working = half weight; skills applied correctly in the photo +0.4 weight
- `rebuildMasteryService` replays every finished diagnostic oldest first and replaces the stored mastery (idempotent); runs when a quick check finishes and before a course is created; `ensureMasteryService` builds it once for older accounts
- Still to do: practice answers from daily sessions (T-020), `nextReviewAt` (T-022)

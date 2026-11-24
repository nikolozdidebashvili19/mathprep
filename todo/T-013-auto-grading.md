# T-013 · Auto-grading for MC and numeric answers

**Epic:** Diagnostic · **Week:** 3 · **Status:** done (mastery hook waits for T-016) · **Depends on:** T-003

- Pure grader: MC by exact match; numeric with a tolerance, accepting `0,5`, `0.5` and `1/2`
- Writes an `Attempt` and triggers the mastery update (T-016)

## Done (2026-11-20)
- `src/features/attempt/service/grading.service.ts`: `gradeAnswer` (MC exact key; numeric via `parseNumericAnswer`: comma/dot decimals, fractions, `\frac{}{}`, Unicode minus; relative tolerance `NUMERIC_TOLERANCE` = 1e-6). An empty answer or a missing key is never correct; written questions are never auto-graded
- `attemptRepository.insertMany`: the diagnostic finish writes one graded Attempt per question (`context: 'diagnostic'`, `contextId` = session id)
- Double-submit safe: the session is closed first (conditional update); if it was already closed, no attempts are written (409)
- Tests: `grading.service.spec.ts`

## Still to do
- [ ] Trigger the mastery update (T-016), marked `TODO(T-016)` in `diagnostic.service.ts`

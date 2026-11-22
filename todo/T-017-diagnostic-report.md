# T-017 · Diagnostic report + Knowledge Map

**Epic:** Diagnostic · **Week:** 4 · **Status:** todo · **Depends on:** T-013, T-016

- Score, mastery per topic (Knowledge Map), the 3 weakest skills, and evidence (wrong questions and the step that failed)
- Indigo segmented meters, per the locked §19 design

## Design
Follow the Duolingo-style session rules in [T-029](T-029-duolingo-style-ui.md).

## v1 (2026-11-22)
- `/report` ("ცოდნის რუკა" tab): knowledge map from the latest finished quick check — every skill grouped by topic (`TOPICS`), level weak / mixed / strong / untested from `skillSummary` (`levelFor`, thresholds in `domain.const`) — plus the history of every finished diagnostic (quick and full mock)
- `/report/[sessionId]`: question-by-question review — the student's vs the correct answer, the work photo (owner-only `GET /api/diagnostic/photos/[photoId]`) and the analysis (approach, mistakes with skill names, feedback)
- Quick-check and full-exam result screens link here; the dashboard shows the 3 weakest skills of the last quick check (`DiagnosticSummaryCard`) or a CTA to take it
- Still to do: knowledge map from full mocks too (no `skillSummary` yet), mastery over time (T-016), "start course from weak skills" (T-018)

# Erovnuli.ge: ticket board

Tickets come from [PRODUCT.md](../PRODUCT.md). Each ticket is a file `T-NNN-<slug>.md` with a status line (`todo` / `in progress` / `done`). Update the status here and in the ticket when it changes.

## Board

| # | Ticket | Epic | Week | Status |
|---|---|---|---|---|
| T-001 | [Content folder, raw PDFs, exam index](T-001-content-raw-and-exam-index.md) | Foundation | 1 | ✅ done |
| T-002 | [Skill graph v1](T-002-skill-graph-v1.md) | Foundation | 1 | ✅ done (needs teacher review) |
| T-003 | [Domain data model](T-003-domain-data-model.md) | Foundation | 1 | ✅ done |
| T-004 | [Georgian UI shell + brand](T-004-georgian-ui-shell.md) | Foundation | 1 | ✅ done |
| T-005 | [Onboarding: grade + target](T-005-onboarding-grade-target.md) | Foundation | 1 | ✅ done (manual signed-in test pending) |
| T-006 | [Render PDF pages + locate questions](T-006-pdf-page-rendering.md) | Content | 2 | ✅ done |
| T-007 | [Vision extraction → question JSON](T-007-question-extraction.md) | Content | 2 | ✅ done (514 questions); 40 still have wrong-script letters, `content:repair-text` waits for Gemini quota |
| T-008 | [Answer keys + criteria](T-008-answer-keys.md) | Content | 2 | 🟡 all MC keys done; criteria wait for T-007 |
| T-009 | [AI skill tagging](T-009-ai-skill-tagging.md) | Content | 2 | ✅ done (514 tagged, weights recomputed; approval in T-011) |
| T-010 | [Seed script](T-010-seed-script.md) | Content | 2 | ✅ done |
| T-011 | [Admin question review](T-011-admin-question-review.md) | Content | 2 | todo |
| T-012 | [Exam-taking UI](T-012-exam-taking-ui.md) | Diagnostic | 3 | 🟡 adaptive quick check (12 q + work photos) is the default, full exam = full mock; browser test pending |
| T-013 | [Auto-grading MC/numeric](T-013-auto-grading.md) | Diagnostic | 3 | ✅ done (mastery hook waits for T-016) |
| T-014 | [Private photo storage](T-014-photo-storage.md) | Diagnostic | 3 | 🟡 interim: photos in MongoDB; R2 before launch |
| T-015 | [Handwriting grading](T-015-handwriting-grading.md) | Diagnostic | 4 | 🟡 v1 photo analysis in the quick check + daily practice ("I'm stuck", "find my mistake"); step checking todo |
| T-016 | [Mastery model](T-016-mastery-model.md) | Diagnostic | 5 | ✅ done (from diagnostics; practice joins in T-020) |
| T-017 | [Diagnostic report + Knowledge Map](T-017-diagnostic-report.md) | Diagnostic | 4 | 🟡 v1: knowledge map, history, per-question review with photos; dashboard card |
| T-018 | [Course planner](T-018-course-planner.md) | Course | 5 | ✅ done |
| T-019 | [Course setup UI](T-019-course-setup-ui.md) | Course | 5 | ✅ done |
| T-020 | [Daily session + theory cards](T-020-daily-session.md) | Course | 5 | 🟡 teaching-first: lessons (15/67), 4-stage "I'm stuck" with photo analysis + reinforcement, guided first questions, adaptive difficulty, warm-ups |
| T-021 | [SymPy service + templates](T-021-math-service-templates.md) | Course | 6 | todo |
| T-022 | [Spaced repetition](T-022-spaced-repetition.md) | Course | 6 | 🟡 v1: reviews 1/3/7/14 days after learning, saved mistakes on `/revision` |
| T-023 | [Weekly check + re-plan](T-023-weekly-check-replan.md) | Adaptation | 7 | todo |
| T-024 | [Progress dashboard](T-024-progress-dashboard.md) | Adaptation | 7 | 🟡 v1: streak, XP, calendar, weekly XP, course + mastery bars; real dashboard stats |
| T-025 | [Final mock + before/after](T-025-final-mock.md) | Adaptation | 7 | todo |
| T-026 | [Analytics + metrics](T-026-analytics-metrics.md) | Beta | 8 | todo |
| T-027 | [Minors' data + privacy](T-027-privacy-minors.md) | Beta | 8 | todo |
| T-028 | [NAEC rights (non-code)](T-028-naec-rights.md) | Beta | — | todo |
| T-029 | [Duolingo-style UI/UX](T-029-duolingo-style-ui.md) | Design | 2 | 🟡 foundation done; session-screen rules apply in T-012/T-017/T-020/T-024 |

## Decisions (where the build differs from PRODUCT.md)

1. **Database: MongoDB + Mongoose, not PostgreSQL + Prisma.** The repository and CLAUDE.md are built around Mongoose repositories. Switching would mean rewriting auth and every convention. The §6 relations map onto embedded arrays (see T-003).
2. **Code locations follow CLAUDE.md's feature folders**, not PRODUCT §8's `src/lib/*.ts`. For example, the mastery model lives in `src/features/mastery/`, the planner in `src/features/course/`, and the skill graph check in `src/features/skill/validations/`.
3. **The source PDFs are 24 per-year files, not one combined PDF**, and their Georgian text has no Unicode layer. Extraction therefore needs rendered pages plus a vision model (T-006, T-007).
4. **Redis/BullMQ is deferred.** The demo runs grading inline (or as a simple background job) until load requires a queue.
5. **No Python on this machine.** The SymPy service (T-021) runs in Docker. PDF rendering uses Node (`pdfjs-dist`), not poppler.
6. **The diagnostic ships before admin review (T-011).** v1 uses the 2024–2026 draft questions as extracted (MC only) so the flow can be tested end to end early.

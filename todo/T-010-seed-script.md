# T-010 · Seed script: content/ → MongoDB

**Epic:** Content pipeline · **Week:** 2 · **Status:** done · **Depends on:** T-003, T-007

## Done
- `npm run seed` → `scripts/seed/seed.ts` (runs with `tsx` so `@/` imports resolve; reads `.env`)
- Repositories: `skill.repository`, `exam.repository`, `question.repository` (upsert by `code`)
- Pure mappers + tests: `scripts/seed/seed-mappers.ts`. `formatEra`: e2015 (2015–2020, 40 questions), e2021 (2021–22, 35), e2023 (2023+, 41). `usableForDiagnostic` for 2024–2026. Placeholder difficulty 3 until T-009
- Re-seed safe: source fields (page, points, exam link, type) refresh every run; text/options/answer/status/difficulty are written **only on first insert**, so admin edits (T-011) survive
- `question.schema` `answer` is now optional (written questions are graded by criteria)
- First run succeeded: 65 skills, 13 exams, 193 draft questions in Atlas

- Upsert is one unordered `bulkWrite` per exam (`bulkUpsertByCode`). Verified 2026-11-20: typecheck + lint clean, re-seed fast, "5 inserted, 205 refreshed" (new 2021 questions only), 210 draft questions in DB
- `question.repository.spec.ts`: covers `findByExamId`, `countByStatus`, `bulkUpsertByCode` (model mocked at the repository boundary)
- Re-run `npm run seed` after each T-007 extraction batch

- `npm run seed -- --refresh-drafts` re-applies text/options/answer/images from content/ to questions still in `draft` (used after the 2026-11-20 hand fixes); reviewed questions never match

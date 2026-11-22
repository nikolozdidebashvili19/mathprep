# T-002 · Skill graph v1

**Epic:** Foundation · **Week:** 1 · **Status:** done (v1, needs expert review) · **Depends on:** —

## Goal
Layer 1 of the engine: about 50–70 math skills with prerequisites, exam weight and practice minutes.

## Acceptance criteria
- [x] `content/skills.json` with 65 skills across 12 topics, with Georgian and English names
- [x] Zod schema plus a graph check: unique codes, prerequisites exist, no cycles (`src/features/skill/validations/`)
- [x] Topological order helper (used by the planner, T-018)
- [x] Unit tests run the real `content/skills.json` through the validator
- [ ] **Review by a math teacher against the official NAEC program** (names, prerequisites, whether calculus C1–C3 is in the current program)
- [x] `examWeight` recomputed from the 514 tagged questions (T-009), `weightSource: "exams"`
- [x] Added V4 (geometric transformations) and N8 (number systems) after tagging found them on the papers → 67 skills
- [ ] Teacher review: derivatives (C1, C2) never appear on 2015–2026 papers; consider dropping them or marking them optional
- [ ] Theory cards per skill (T-020)

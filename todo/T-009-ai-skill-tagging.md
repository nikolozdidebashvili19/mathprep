# T-009 · AI skill tagging (offline, admin-approved)

**Epic:** Content pipeline · **Week:** 2 · **Status:** todo · **Depends on:** T-002, T-007

- An LLM suggests `skills[]`, `primarySkill`, `difficulty`, `formatEra` and `offProgram` from `content/skills.json`
- Suggestions are saved as drafts; nothing goes live without admin approval (T-011)
- Then recompute `examWeight` per skill from the real exams (recent years weighted more heavily) and update `skills.json`

## Progress (2026-11-21)
- `npm run content:tag` (`scripts/extract/tag-skills.ts`, pure logic + tests in `skill-tag.ts`): batches of 5 questions with their figures → Gemini → `content/tags/<exam-id>.json` (skills ≤3, primarySkill, difficulty 1–5, offProgram, confidence, problems). Unknown codes are dropped and flagged; resumable; accepts the model's bare-array output
- **All 514 questions tagged.** Difficulty spread: 1=49, 2=206, 3=190, 4=58, 5=11. 0 flagged tags
- The model's 5 "off-program" questions were gaps in the skill list, not off-program: **added V4 (geometric transformations: symmetry, translation, rotation, homothety) and N8 (positional number systems)** → 67 skills. V4 appears on almost every paper (Q14/Q27). 17 questions re-tagged by hand (`provider: "manual"`) because the free Gemini key ran out of daily quota
- Seed applies tags to `draft` questions on every run (`mapTag`); approval is T-011
- `npm run content:weights` recomputed `examWeight` = expected points per skill on a recency-weighted paper (2023+ ×1, 2021–22 ×0.6, 2015–20 ×0.3; primary skill gets 60% of the points). Sum ≈ 55 points (real papers: 51–59). `weightSource: "exams"`
- Finding for T-002: derivatives (C1, C2) essentially never appear 2015–2026 (weight 0.1); C3 (max/min) does, but as word problems

## Still to do
- [ ] Admin approval of tags in T-011
- [ ] Spot-check difficulty against real results once students take the quick check

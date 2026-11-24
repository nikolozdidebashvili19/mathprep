# T-018 · Course planner (Layer 4)

**Epic:** Course · **Week:** 5 · **Status:** todo · **Depends on:** T-002, T-016

- Deterministic pure function: time budget (15% reserve) → priority (gap × weight × readiness) → fill the budget → topological order with topic interleaving → stages → daily blocks from the session template
- Reports the skills left out (1-month plans) and the "goal isn't realistic" warning
- Tests on fixed inputs

## Done (2026-11-22)
`src/features/course/service/planner.ts` (pure, deterministic, 8 tests), constants in `course.const.ts`:
- Reserve: every 7th day = weekly check, last day = final mock (~15%)
- Priority = gap × weight × readiness (selection); teaching order uses gap × weight of the skill and everything it unlocks, so N1 → A4 → A12 starts early; topics interleaved
- Minutes per skill = minPracticeMinutes × gap → whole learning days; unready prerequisites pulled in with their skill; the rest is `omitted`; `realistic` = coverage of (gap × weight) ≥ 60%
- Days: theory on a skill's first day, practice, drills on the weakest started skill, revision at +3/+7/+14 days; leftover days = mixed exam practice
- Real data (one quick check): 1 month = 9–22 skills + warning, 3 months/60 = 39–40 skills, 5 months/90+ = all 67 + 25–46 exam-practice days

# T-022 · Spaced repetition + saved mistakes

**Epic:** Course · **Week:** 6 · **Status:** in progress (v1 done 2026-11-25) · **Depends on:** T-016

- Done separately (2026-11-24): `/revision` theory library: every theory card the student has read, grouped by topic, flip through with previous/next. Read-only, so it does not change XP, streaks or mastery.
- Retention reviews at +3, +7 and +14 days (`Mastery.nextReviewAt`); saved mistakes feed the revision block

## v1 (2026-11-25)
- `ReviewSchedule` (`src/features/revision/`, kept apart from Mastery because the mastery rebuild replaces those documents): the first practice answer on a skill starts it; reviews come **1, 3, 7 and 14 days** after learning (`REVISION_INTERVALS_DAYS`). A review passes only when answered correctly **without hints**; a wrong one starts the cycle again from that day; a late review keeps the gap to the next one (`review-schedule.ts`, pure + tested)
- The day's revision block is built from what is due (one question per due skill, most overdue first), then saved mistakes / the plan's skill; due questions carry a "გამეორება: … ხომ არ დაგავიწყდა?" banner. The warm-up before a new lesson counts as a review when its skill is due
- **Saved mistakes** on `/revision` (one fold-out row, `mistake-notebook.tsx`): every question answered wrong (diagnostic or practice) and not solved since, newest first, with the student's answer, the correct one and the step-by-step solution. Skipped questions ("I don't know") are not mistakes. Solving it later removes it
- Not back-filled: students who practised before 2026-11-25 get schedules from their next practice answer on

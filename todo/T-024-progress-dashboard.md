# T-024 · Student progress dashboard

**Epic:** Adaptation · **Week:** 7 · **Status:** in progress (v1 built 2026-11-24) · **Depends on:** T-017, T-023

- Mastery over time, course completion, streak, upcoming reviews, and weekly summaries

## Design
Follow the Duolingo-style session rules in [T-029](T-029-duolingo-style-ui.md).

## Progress (2026-11-24)
- [x] `/progress` (simplified 2026-11-24 on user feedback "too crowded"): streak banner (current, best, total XP), this week's flame strip, course bar, first 5 skill bars + "all skills" fold-out. Course page and knowledge map simplified the same way: one banner/summary, details in fold-out rows (`ExpandableSection`)
- [x] Dashboard pills + daily-goal card use real data (`getLearningStatsService`)
- [x] Everything is derived from practice-session answer timestamps (no counters to drift): XP rules in `progress.const.ts` (correct 10, −2 per hint, min 4; wrong 2; theory 5; finished day +20); days are Tbilisi days (UTC+4); minutes = gaps ≤ 5 min between answers
- Design rule from the user: keep pages as simple as the dashboard (one banner, one or two cards, the rest folded away)
- [x] Day-complete screen shows XP earned and links to progress

## Still to do
- [ ] Mastery over time (needs mastery history snapshots)
- [ ] Upcoming reviews (waits for T-022 `nextReviewAt`)
- [ ] Weekly summaries (waits for T-023)
- [ ] Browser check (light/dark, phone width)

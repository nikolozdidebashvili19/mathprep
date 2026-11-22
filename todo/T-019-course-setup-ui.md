# T-019 · Course setup UI

**Epic:** Course · **Week:** 5 · **Status:** todo · **Depends on:** T-018

- Duration 1/3/5 months × 30/60/90/120 min per day; the realism warning; a preview of which topics are covered and which are left out

## Done (2026-11-22)
`/course`: before a diagnostic → CTA to the quick check; then the setup (duration and daily-time tiles, react-hook-form) with a live preview of all 12 options computed up front (skills covered per topic, coverage bar, realism warning, what is left out); `POST /api/course` stores the course + one `CourseDay` per day. With an active course: today's blocks, the next 6 days, skills in teaching order, what is left out, and "re-plan" (`POST /api/course/abandon`). The dashboard path moves on to "course + weekly check". The "start" button waits for the daily session UI (T-020).

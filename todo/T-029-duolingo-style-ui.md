# T-029 · Duolingo-style UI/UX (gamified learning design system)

**Epic:** Design · **Week:** 2 · **Status:** in progress (foundation done; session screens are applied in their own tickets) · **Depends on:** T-004

The student experience should feel like a playful language-learning app: short bites, a visible path, instant feedback, streaks and XP. **The style only. No owl/mascot, no Duolingo name, art, sounds or exact brand colours.** The locked direction is in CLAUDE.md §19.

## Done (foundation)
- [x] Tokens in `globals.css`: green `primary`, `sky`, `streak`, `xp`, `destructive`, each with an `-edge` shade, plus a navy dark mode
- [x] `shadow-edge*` utilities (`@utility`) for the chunky 3D bottom edge; `animate-pop`, `animate-bob`; reduced-motion guard
- [x] Font: Nunito (variable) + Noto Sans Georgian; extrabold headings
- [x] `Button`: pressable variants `default` / `sky` / `destructive` / `outline` (collapse on press), larger sizes, rounded-2xl
- [x] `Card` rounded-2xl + border-2; `Input` h-12, filled, sky focus
- [x] Landing page: path preview + headline + stacked CTAs ("start" / "I already have an account"), stats band, step tiles
- [x] Dashboard: unit banner, **winding lesson path** (done / current with "start" bubble / locked), streak + XP pills, daily-goal card
- [x] Sidebar: big icon nav items with sky active state; header: green logo tile + wordmark
- [x] Onboarding: big grade tiles (sky selected state)

## Rules for later UI tickets (apply when building them)
- **T-012 exam / T-020 daily session:** full-screen lesson layout with a close (X) button and a **segmented progress bar** at the top. One question per screen. Answer options are big `outline` tiles (sky when selected). A sticky bottom **check bar**: "შემოწმება" (Check) button → turns green "სწორია!" (Correct!) or red with the correct answer + "გაგრძელება" (Continue). Diagnostic mode shows no correctness feedback (it's a measurement), only "next".
- **Lesson complete screen:** XP earned, time spent and accuracy shown as three stat tiles that `animate-pop` in; one primary "გაგრძელება" (Continue).
- **T-024 progress:** streak calendar (flame per active day), XP per week, skill mastery as chunky progress bars, not thin charts.
- **T-017 Knowledge Map:** skills as round nodes coloured by mastery band (red / amber / green), the same node style as the path.
- Encouraging, short Georgian microcopy; errors never shame ("ჯერ არა, ვცადოთ ერთად", roughly "Not yet, let's try it together").
- Keep tap targets ≥ 44px, focus rings visible (sky), all motion behind `prefers-reduced-motion`.

## Open
- [ ] Real streak/XP/daily-goal data: the dashboard shows honest zeros until T-020/T-024 record sessions
- [ ] Optional: sound effects for correct/incorrect (off by default, toggle in settings)
- [ ] Visual review in a browser (light + dark, phone width)

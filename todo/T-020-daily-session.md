# T-020 · Daily session UI + theory cards

**Epic:** Course · **Week:** 5 · **Status:** todo · **Depends on:** T-018

- Blocks: theory → practice → weakness drills → revision; instant feedback on every answer; stage progression rules (planner step 5)
- A verified theory card per skill, written once and cached

## Design
Follow the Duolingo-style session rules in [T-029](T-029-duolingo-style-ui.md).

## v1 (2026-11-22)
- `/course/today` (session layout, `PracticeSession`): today's blocks as steps — theory card (skill intro + prerequisites until verified cards exist), then practice / drill / revision questions, one per screen; "შემოწმება" → instant green/red feedback with the right answer → "გაგრძელება"; day summary at the end. Weekly-check / mock days show a notice (T-023 / T-025)
- `practice-picker.ts` (pure, tested): the block's skill, difficulty just below the 50% point of the mastery model, unseen first, revision prefers questions answered wrong, no repeats within a day, deterministic daily rotation; count = block minutes / (2 + 0.5·d), max 8. Pool = past-exam MC questions outside the full-mock papers, without broken text
- `PracticeSession` stores the items (resumable); `POST /api/course/practice/answer` grades, saves a practice `Attempt` and updates mastery incrementally (`recordPracticeMasteryService`); the last answer completes the session and the `CourseDay`
- Mastery rebuild now replays diagnostics **and** practice answers in time order (verified: rebuild == incremental on real data)
- Planner is now weak-first (status weak / partial / untested; untested = 1-day check-in; only evidence-based prerequisites block)
- Still to do: verified theory cards, stage progression rules (planner step 5), parametric practice (T-021), XP/streak (T-024)

## Theory cards (2026-11-22, in progress)
- Original text (not copied or paraphrased from textbooks — copyright; Topuria's Algebra 1 table of contents was used only to check scope). Exam-irrelevant sections skipped: determinants, limits/continuity, derivatives/integrals, arc-functions, advanced trig transforms, complex numbers
- `content/theory/<code>.json`, validated by `TheoryCardSchema`; `theory.validation.spec.ts` checks every card against the skill list, for control characters (broken escapes) and renders every formula with KaTeX. Seeded into `Skill.theoryCard` (status `draft`)
- Two layers so the card serves a beginner and a strong student: basics (idea, rules, step-by-step example) and exam level (exam-style example, typical mistakes, tip). From mastery 0.5 the basics start collapsed
- **12 of 67 written** (the first user's weak skills): A5 C3 E4 F1 G9 K3 L1 N2 P5 S1 T2 V4. Remaining 55 to write in batches; all need a maths teacher's review before launch

## Question explanations (2026-11-22)
- `npm run content:explain` (`scripts/extract/explain-questions.ts`, logic + tests in `explanation.ts`): Gemini free, batches of 3, figures only when needed; the model solves **blind** and the explanation counts only if its final answer matches the key; a mismatch is re-asked once with the key (**guided**)
- Result: 412 MC questions → 345 blind-verified (shown to students after they answer: practice feedback + diagnostic review, "როგორ იხსნება?"), 33 guided (held for admin review, T-011), ~32 none (broken-letter text pending repair, 2 unsolved)
- Georgian wording from the free model is understandable but not polished (typos, colloquial forms) → polish in admin review or a later cheap pass
- Zero runtime tokens: explanations are stored on `Question.solutionSteps` / `commonMistakes`

## Hints + AI helper (2026-11-22)
- **Hints (0 tokens):** "მინიშნება" before answering reveals, one at a time from the server, the skill's key rule (theory card) and then the stored solution steps — never the last step (`hints.ts`, max 4). Each hint lowers the answer's mastery weight by 25% (min 25%, `hintedWeight`); `hintsUsed` is stored on the practice item and the Attempt, and the mastery rebuild uses it
- **AI helper ("ჰკითხე დამხმარეს", `src/features/tutor/`):** only after the question is answered; compact prompt = question + both answers + stored verified solution + last 4 turns (the model explains, it does not re-solve); ≤5 sentences in Georgian; same first question on the same problem → cached reply (0 tokens, not counted); 20 model calls per student per day (`TUTOR_DAILY_LIMIT`); every Q&A stored in `TutorMessage`
- Verified on real Atlas + Gemini (throwaway user): hint ladder, NOT_ANSWERED guard, hinted attempt weight, a precise tutor reply in 1.6 s, cache hit in 0.3 s

## Teaching-first session (2026-11-24, user request: "a real personal tutor")
- **Full lessons** (`content/lessons/<code>.json`, `LessonSchema` in `lesson.validation.ts`, stored on `Skill.lesson`, validated again on read): 10–15 min, starts by explaining, formula boxes with *when* and *how* to use each formula, exactly three worked examples **easy → medium → hard** with a "why?" behind every step, ≥2 small check questions in between (instant feedback + explanation, no mastery effect), summary, typical mistakes, exam tip, and a simpler `reteach` explanation + easy example. `lesson.validation.spec.ts` checks the schema, the skill code and renders every formula in KaTeX
- **Lesson player** (`lesson-player.tsx`): one section per screen with its own progress bar; a check screen lets the student go on only after trying it. Revision (`/revision/[code]`) shows the same lesson on one page (`lesson-document.tsx`). Skills without a lesson keep the short theory card
- **10 lessons written** (the first theory days of the 3 active courses): N1 G1 N2 A12 K3 L1 S1 F1 G2 N5. Original text; all need a maths teacher's review before launch. Next batch: A1 A4 C3 P5 V4 G7 E1 E4 N3 N6 …
- **Difficulty ramp** (`difficultyRamp` in `practice-picker.ts`): each block fills rungs from one below to one above the target difficulty and is shown easiest first
- **Wrong answer → second chance**: the solution opens, "ამიხსენი უფრო მარტივად" shows the skill's `reteach`, and an easier (≤ missed difficulty, ideally −1) unseen question on the same skill is inserted right after (`pickSecondChance`, `insertItem`; max 3 per day, never for a second-chance item)
- **"I'm stuck" ladder** (`buildStuckLadder` in `hints.ts`) replaces the hint button: what is asked (restate) → steps (plan) → hints 1–3 → reasoning together (solution without the last step) → live tutor in **stuck mode** (never gives the answer, guides with one question; own reply cache; shares the 20/day limit). Restate and plan are free; hints/walkthrough lower mastery weight + XP (`hintsUsed` = real hints, `guideStepsUsed` = all rungs)
- **Guidance content** (`npm run content:guide`, `scripts/extract/guidance.ts`): 344 of 345 blind-verified questions done and seeded (2026-11-24); Gemini free, built from the blind-verified solution, text only; dropped if it names the answer option, repeats the final step or contains the correct option's text. Questions without guidance yet fall back to rule + solution steps
- Verified on real Atlas + Gemini (throwaway user, cleaned up): 10 lessons parse from the DB, restate → plan free (hintsUsed 0), stuck tutor replied with a guiding question and no answer, a wrong answer returned `reteach` and inserted the second chance at index+1

## Level-based planning + more "I'm stuck" help (2026-11-24, user: "a beginner who got 0 can't start with pyramids")
- **Student level** (`student-level.ts`): latest diagnostic score share < 40% beginner, < 75% intermediate, else advanced; stored on `Course.level`, shown on the setup screen
- **Beginner:** no benefit of the doubt — every prerequisite below MASTERY_READY is taught first; untested skills get full lessons (not a 1-day check-in); order = foundations first (prerequisite depth, then rank); practice on untested skills starts at difficulty 1 (`BEGINNER_START_MASTERY`). Intermediate: evidence-based prerequisites, foundations-first order. Advanced: weak-first as before
- On real data all 3 students are beginners (0–25%): new plans start N1 G1 L1 P1 N2 G2 K1 P2 N8 G6 N5 … (old plans had E4 / K3 in the first three). **Existing courses keep their old plan until re-planned** ("ხელახლა აწყობა")
- **"I'm stuck" ladder now 7 rungs**: restate → theory (the skill's lesson formulas with when-to-use) → plan → similar solved example (lesson's easy example) → hints → walkthrough → full solution. First four free, hints/walkthrough cost 1, the full solution costs 3 (`SOLUTION_HINT_COST`). Stuck-mode tutor available from the first rung
- Lessons: 15 written (+ P1 K1 P2 G6 N8, the beginner path's next skills)

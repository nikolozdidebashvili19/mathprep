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

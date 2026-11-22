Erovnuli.ge: Product Spec (Math Demo)

Scope of this document: the demo version. It covers mathematics only, in Georgian, for students preparing for the Unified National Examinations (ეროვნული გამოცდები).

1. One-line pitch

Erovnuli.ge finds exactly why a student loses points on the math National Exam and builds a day-by-day training course that fixes those specific weaknesses. It re-checks progress every week and adjusts the course.

What makes it different from competitors (Prep.ge, FoxPrep.ai, Litero.ge, Testebi.ge, Abituri.ge): they put AI on top of a question bank. We diagnose at the skill level, grade handwritten working step by step, and build the course from a skill graph. The AI isn't asked to invent a plan.

2. Demo scope
In the demo
Mathematics only
Georgian interface
Real NAEC math exams, 2015–2026, organized by year and variant (source: one combined PDF, see §8)
Untimed diagnostic exam (full exam or a 15–20 question quick check)
Answer types: multiple choice, numeric, written working with a photo upload
AI grading of handwritten solutions (finds the first wrong step)
Skill-level diagnostic report and Knowledge Map
Personalized course: 1 / 3 / 5 months × 30 / 60 / 90 / 120 min per day
Daily sessions, weekly reassessment, final mock exam
Student progress dashboard
Admin dashboard for reviewing questions and correcting OCR errors
Not in the demo
Other subjects, English interface, payments, tutor/school dashboards, mobile apps, leaderboards, university admission predictions
3. Student journey
Register. Email or Google sign-in. Enter grade (11 or 12) and target score (optional).
Diagnostic. Choose a full exam (year + variant) or the quick check. Answer without a time limit. Upload photos of written working.
Report. See your score, your Knowledge Map (mastery per topic), your 3 weakest skills, and evidence: which questions you got wrong and the step where you went wrong.
Course setup. Choose a duration (1/3/5 months) and daily time (30/60/90/120 min). The app warns if the goal isn't realistic, for example 1 month from a low starting level.
Daily training. Each session has theory, practice, weakness drills and revision, with instant feedback on every answer.
Weekly check. A mandatory 10–15 question test of new questions. Mastery is updated and next week's plan is rebuilt.
Final mock. A full exam the student hasn't seen before, then a before/after comparison.
4. How the custom course is built (core engine)

Key principle: The course is produced by a deterministic planning algorithm working on structured data. AI is used around the edges: tagging questions, grading free-form work, writing explanations and generating verified practice variants. It never decides the plan alone. That keeps plans consistent, debuggable and cheap to run.

The engine has five layers.

Layer 1: Skill graph (built once, by us)

The math exam program is broken down into about 50–70 skills. Each skill has prerequisites.

Topic: Geometry
  G1  Angles and parallel lines             prereq: —
  G2  Triangle properties & congruence      prereq: G1
  G3  Similar triangles                     prereq: G2
  G4  Pythagorean theorem                   prereq: G2
  G5  Circle: angles, chords, tangents      prereq: G1, G2
  G6  Areas of polygons                     prereq: G2, G4
  G7  Solid geometry: volumes & areas       prereq: G6
Topic: Probability & statistics
  P1  Counting principle                    prereq: —
  P2  Permutations / combinations           prereq: P1
  P3  Classical probability                 prereq: P1
  ...

Each skill stores:

exam_weight: how many points it is typically worth, counted from the 2015–2026 exams (recent years weighted more heavily, since the format may have changed over time)
prerequisites[]
theory_card: a short verified explanation with worked examples
min_practice_minutes: rough time needed to move from weak to solid

Source: NAEC's official math exam program plus the real exam papers.

Layer 2: Tagged question bank

Every question, whether from a real exam or for practice, is stored with:

Field	Example
id	2024-V1-Q15
source	NAEC 2024, variant 1 / generated
source_page	page number in the combined PDF (for admin review)
format_era	which exam format/program the question belongs to (older exams may differ)
skills	[A4 quadratic equations, A2 factoring]
primary_skill	A4
difficulty	1–5
type	multiple_choice / numeric / written
answer	x=0 or x=4
max_points	2
marking_criteria	official criteria, if any
solution_steps	verified step list + alternative methods
common_mistakes	e.g. "dividing both sides by x loses x=0"

The past exams alone don't contain enough questions to fill a 5-month course. Practice content comes from three sources:

Real exam questions (2015–2026): used for diagnostics, weekly checks and the final mock. Recent years (closest to the current format) go to the diagnostic and final mock. Older years supply extra exam-level practice and weekly-check questions.
Parametric templates: for example "solve ax² + bx = 0" with random a and b. Answers are computed and checked by a symbolic math library (SymPy), so they are always correct. This is the main source of daily practice.
AI-written variants: generated offline, then checked by SymPy and approved by an admin before publishing.
Layer 3: Mastery model (per student, per skill)

Each skill gets a mastery score from 0 to 1 and a confidence value.

Every graded answer updates the mastery of every skill tagged on that question.
Updates are weighted by difficulty. A correct hard question raises mastery more than a correct easy one, and a wrong easy question lowers it more than a wrong hard one. In practice this is an Elo or Bayesian Knowledge Tracing style update.
Partial credit counts. For written work, the grader reports which step failed, so the error is charged to the skill used in that step.
Mistake types (conceptual / calculation / misread / incomplete) are counted separately. Repeated conceptual errors put a skill back into the "foundation" stage.
Confidence is low when a skill has been tested only once or twice. Low-confidence skills get extra questions in the next weekly check.

Getting 2 of 2 easy questions right does not make a skill mastered. Mastery requires correct answers at exam-level difficulty.

Layer 4: Course planner

Inputs: mastery per skill, duration (days), minutes per day, skill graph and the student's target score.

Step 1: Time budget. total_minutes = days × minutes_per_day, with about 15% reserved for weekly checks, spaced revision and the final mock.

Step 2: Priority score for each skill.

gap       = target_mastery − current_mastery      (skip if ≤ 0)
priority  = gap × exam_weight × readiness
readiness = 1 if all prerequisites ≥ 0.6, else 0.3  (pull the prerequisite in first)

This rewards fixing skills that are weak, worth many points and actually learnable right now.

Step 3: Choose what fits. Rank skills by priority and give each one minutes (min_practice_minutes × gap) until the budget runs out.

1 month: only the highest-priority skills fit. The plan is intensive gap-fixing, and the app tells the student which topics were left out.
3 months: covers weak and average skills.
5 months: covers everything, including foundations, plus a long exam-practice phase at the end.

Step 4: Order the skills. Sort the selected skills so prerequisites come first. Ties are broken by priority. Topics are interleaved so the student isn't on one topic for 3 weeks straight.

Step 5: Progress each skill through stages. A skill moves to the next stage only when the student meets its criterion.

Stage	Content	Move on when
Foundation	theory card + guided easy questions	3 correct in a row
Basic practice	difficulty 1–2, hints available	≥ 70%
Independent	difficulty 2–3, no hints	≥ 75%
Exam-level	real-exam-style, difficulty 3–4	≥ 70%
Advanced	difficulty 5, mixed topics	optional
Retention	spaced reviews at +3, +7, +14 days	still ≥ 70%

Step 6: Fill each day using the session template.

Daily time	Theory	Practice	Weakness drills	Revision
30 min	5	15	—	10
60 min	10	20	20	10
90 min	15	30	30	15
120 min	20	40	40	20
Theory comes from the skill currently in its foundation stage.
Practice comes from the current focus skill at the student's level.
Weakness drills target the lowest-mastery skill that is ready to learn.
Revision covers spaced-repetition items due today and the student's saved mistakes.

The number of questions per block comes from the estimated time per question, by difficulty.

Layer 5: Weekly adaptation

Every 7 days:

A 10–15 question check made of unseen questions, drawn from this week's skills, low-confidence skills and a few mastered skills to test retention.
Mastery is recalculated.
Steps 2–6 are re-run for the remaining days. Skills that are now mastered drop out, unresolved ones get more time, and newly found weaknesses enter the plan.
The student sees a short "this week" summary: what improved, what still needs work and what changes next week.
Where AI is (and isn't) used
Task	Method
Multiple choice / numeric grading	Plain code (exact match / numeric tolerance)
Checking generated practice answers	SymPy (symbolic math)
Mastery and plan generation	Deterministic algorithm
Grading handwritten working	Vision model + verified solution steps + rubric
Tagging exam questions with skills	AI suggestion → admin approval (offline)
Explanations	Written once, verified, cached
Weekly summary text	AI writes friendly wording from structured data
5. Handwritten solution grading
The student uploads a photo. If it is blurry, they are asked to retake it.
The vision model transcribes the working into LaTeX steps. The student can confirm or fix the transcription.
Each step is checked. Where possible, the algebra in each step is verified with SymPy, so a wrong transformation is caught by math, not by guessing.
The grader reports the first incorrect step, the mistake type, the skill involved, a correction and the points awarded under the official criteria.
A valid alternative method is never marked wrong just because it differs from the official solution.
If the grader's confidence is low, the result is marked "needs review" and doesn't count toward mastery.
6. Data model (simplified)
User(id, name, grade, target_score, locale)
Exam(id, year, variant, format_era, source_pdf, page_start, page_end)
Skill(id, topic, name_ka, exam_weight, min_minutes)
SkillPrereq(skill_id, prereq_id)
Question(id, exam_id?, source, type, difficulty, text, images, answer,
         max_points, criteria, solution_steps, common_mistakes, status)
QuestionSkill(question_id, skill_id, is_primary)
Template(id, skill_id, difficulty, generator_code)      -- parametric questions
Attempt(id, user_id, question_id, answer, photo_url, points,
        first_error_step, mistake_type, grader_confidence, created_at)
Mastery(user_id, skill_id, value, confidence, stage, next_review_at)
Course(id, user_id, duration_days, minutes_per_day, start_date, status)
CourseDay(id, course_id, date, blocks_json, completed)
WeeklyCheck(id, course_id, week, score, mastery_snapshot_json)
7. Tech stack
Layer	Choice
App	Existing Next.js project (App Router), React, Tailwind, KaTeX for math rendering
Backend	Next.js Route Handlers + Server Actions (no separate Express server needed for the demo)
Math engine	Python microservice with SymPy (answer checking, templates)
Database	PostgreSQL + Prisma
Auth	Auth.js or Supabase Auth
Storage	Cloudflare R2 (private bucket for student photos)
Jobs	Redis + BullMQ (grading, weekly re-plan)
AI	Vision-capable LLM API (server side only, never from frontend)
Analytics	PostHog
8. Content pipeline: from PDF to question bank
Source file

All math exams from 2015 to 2026 are in one combined PDF. It lives in the project at:

C:\Users\ndide\OneDrive\Desktop\ეროვნულები
Keep it in content/raw/, not in public/. It must never be served to the browser. Students only see questions after they are extracted, reviewed and stored in the database.
Add content/raw/ to .gitignore if the repository is or may become public (see the rights note in §11).
Answer keys and marking criteria: if they are inside the same PDF, they are extracted with their exam. If they are separate files, they go into content/raw/answer-keys/.
Pipeline steps
Index the PDF. Find where each exam starts and ends, and record year, variant and page range in content/index.json:
json
[
  { "id": "2024-V1", "year": 2024, "variant": 1, "pages": [312, 330], "answer_key_pages": [331, 333] },
  { "id": "2015-V1", "year": 2015, "variant": 1, "pages": [1, 18], "answer_key_pages": [19, 20] }
]
Extract. For each exam, take the text, convert formulas to LaTeX and crop diagrams to images (content/images/<exam-id>/q<n>.png). Scanned pages need OCR, and Georgian OCR on formulas is error-prone, so every page is checked visually against the original.
Structure. Each question becomes a JSON record (see Layer 2), linked to its answer and marking criteria, saved as content/questions/<exam-id>.json.
Tag. Skills, difficulty and format_era are suggested for each question.
Seed. A seed script (prisma/seed.ts) loads the reviewed JSON into PostgreSQL with status = "draft".
Review. An admin checks every question in the dashboard against the original PDF page (source_page) and approves it. Nothing goes live unreviewed.
Templates. Parametric practice generators are written for each skill.

Suggested order: start with 2024–2026 (closest to the current format, used for the diagnostic), then work backwards to 2015.

Project structure (additions to the existing Next.js app)
content/
  raw/naec-math-2015-2026.pdf     ← source PDF (not public, not served)
  index.json                      ← exam → page ranges
  questions/<exam-id>.json        ← extracted questions
  images/<exam-id>/q<n>.png       ← cropped diagrams
  skills.json                     ← skill graph (Layer 1)
prisma/
  schema.prisma                   ← data model from §6
  seed.ts                         ← loads content/ into the DB
scripts/
  extract/                        ← PDF → JSON extraction scripts
src/app/
  (student)/diagnostic/           ← exam-taking UI
  (student)/report/               ← diagnostic report + Knowledge Map
  (student)/course/               ← course setup + daily sessions
  (student)/progress/             ← dashboard
  admin/questions/                ← review + approve questions
  api/grade/                      ← grading endpoints
src/lib/
  mastery.ts                      ← mastery model (Layer 3)
  planner.ts                      ← course planner (Layer 4)
  grading/                        ← MC / numeric / handwriting graders
services/math/                    ← Python SymPy microservice
9. Demo build plan (about 8 weeks)
Week	Deliverable
1	Index the 2015–2026 PDF; skill graph v1; Prisma schema; auth; Georgian UI shell
2	Extract and review 2024–2026 exams; admin review screen; then continue back to 2015 in parallel with later weeks
3	Exam-taking UI (MC, numeric, photo upload), auto-grading
4	Handwriting grading + diagnostic report + Knowledge Map
5	Mastery model + course planner + daily session UI
6	Parametric templates for top-priority skills; spaced repetition
7	Weekly check + re-planning; progress dashboard
8	Beta with 20–30 students; fix grading errors; measure results
10. Success metrics
Main metric: improvement on previously weak skills, measured on unseen questions
Diagnostic completion rate
Daily session completion rate
Week-over-week retention
AI grading correction rate (how often admins or students overturn the grade)
11. Open items and risks
Exam rights: get written clarification from NAEC on commercial use of the 2015–2026 exam materials before launching publicly. Until then, keep the PDF and extracted content out of any public repository.
Format changes: the math exam format and program may have changed between 2015 and 2026. Check older questions against the current exam program and mark any off-program question so it isn't used in diagnostics.
Minors' data: use private photo storage, collect only necessary data, set deletion rules and get parental consent where required. Never train external models on student work.
Grading trust: use a SymPy check on every step, low-confidence flags and admin review during beta.
Content volume: the past exams are too few for long courses, so the parametric templates are essential.
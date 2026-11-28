import { DAILY_MINUTES_OPTIONS } from '@/shared/const/domain.const';

export type DailyMinutes = (typeof DAILY_MINUTES_OPTIONS)[number];

/** Daily session template (PRODUCT.md, planner step 6): minutes per block for each daily time. */
export const SESSION_TEMPLATES: Record<DailyMinutes, { theory: number; practice: number; drill: number; revision: number }> = {
  30: { theory: 5, practice: 15, drill: 0, revision: 10 },
  60: { theory: 10, practice: 20, drill: 20, revision: 10 },
  90: { theory: 15, practice: 30, drill: 30, revision: 15 },
  120: { theory: 20, practice: 40, drill: 40, revision: 20 },
};

export const DAYS_PER_MONTH = 30;

/** Every 7th day is the weekly check; with the final mock this is the ~15% reserve of the time budget. */
export const WEEKLY_CHECK_EVERY_DAYS = 7;

/** Mastery the planner aims for on every selected skill. */
export const TARGET_MASTERY = 0.8;

/** Readiness factor for a skill whose prerequisites are not ready yet (they are pulled in first). */
export const NOT_READY_FACTOR = 0.3;

/** Below this share of the (gap × exam weight) the student needs, the plan is flagged as not realistic. */
export const REALISTIC_COVERAGE = 0.6;

/**
 * Spaced revision: a skill is reviewed this many days after it was learnt (1, 3, 7 and 14 days). The planner uses it
 * for the plan preview; the daily session schedules the real reviews from what the student actually practised (T-022).
 */
export const REVISION_INTERVALS_DAYS = [1, 3, 7, 14] as const;

export const COURSE_COPY = {
  setupTitle: 'კურსის აწყობა',
  setupIntro: 'გეგმა შენი დიაგნოსტიკიდან აიწყობა: ჯერ სუსტი და ყველაზე ღირებული უნარები, საფუძვლებიდან დაწყებული.',
  durationLabel: 'ხანგრძლივობა',
  monthsUnit: (n: number) => (n === 1 ? '1 თვე' : `${n} თვე`),
  dailyLabel: 'დღეში',
  minutesUnit: 'წთ',
  previewTitle: 'რას მოიცავს',
  skillsCovered: (n: number, total: number) => `${n} უნარი ${total}-დან`,
  coverageLabel: 'საჭირო სამუშაოს დაფარვა',
  unrealistic: 'ამ დროში ყველა სუსტი მხარე ვერ დაიფარება. გეგმა ყველაზე მნიშვნელოვანზე ფოკუსირდება; სრული მომზადებისთვის აირჩიე მეტი დრო.',
  leftOut: 'გარეთ რჩება, მაგალითად',
  create: 'კურსის დაწყება',
  creating: 'იწყობა...',
  createError: 'კურსი ვერ აიწყო. სცადე თავიდან.',
  needsDiagnosticTitle: 'ჯერ დიაგნოსტიკა',
  needsDiagnosticBody: 'კურსი შენი სუსტი მხარეებიდან აიწყობა, ამიტომ ჯერ გაიარე სწრაფი შემოწმება.',
  needsDiagnosticCta: 'სწრაფი შემოწმება',
  dayOf: (day: number, total: number) => `დღე ${day} / ${total}`,
  todayTitle: 'დღევანდელი გეგმა',
  todaySummary: (steps: number, minutes: number) => `${steps} ნაწილი · ${minutes} წთ`,
  start: 'დაწყება',
  upcomingTitle: 'მომდევნო დღეები',
  pastTitle: 'წინა დღეები',
  pastHint: 'გახსენი, რომ გადახედო ამოცანებსა და თეორიას, ან დაასრულო გამოტოვებული დღე.',
  dayLabel: (n: number) => `დღე ${n}`,
  planTitle: 'უნარები სწავლის რიგით',
  omittedTitle: 'ამ კურსში არ შედის',
  replan: 'ხელახლა აწყობა',
  replanConfirm: 'მიმდინარე კურსი დასრულდება და ახალს ააწყობ. გავაგრძელოთ?',
  replanError: 'ვერ მოხერხდა. სცადე თავიდან.',
  blockKinds: {
    theory: 'თეორია',
    practice: 'ვარჯიში',
    drill: 'სუსტი მხარის ვარჯიში',
    revision: 'გამეორება',
    check: 'ყოველკვირეული შემოწმება',
    mock: 'საბოლოო საცდელი გამოცდა',
  },
  mixedPractice: 'შერეული, გამოცდის სტილის ამოცანები',
  skillStatus: { weak: 'სუსტი', partial: 'გასაუმჯობესებელი', untested: 'შემოწმება' },
  planNote: 'ჯერ სუსტი უნარები; „შემოწმება“ ნიშნავს ერთდღიან შემოწმებას უნარისთვის, რომელიც ჯერ არ გაგვიზომავს.',
  savedMistakes: 'შენახული შეცდომები',
};

/**
 * Student level from the latest diagnostic's score share: below BEGINNER_BELOW = beginner (the course starts from the
 * very basics), below ADVANCED_FROM = intermediate, else advanced.
 */
export const STUDENT_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const BEGINNER_BELOW = 0.4;
export const ADVANCED_FROM = 0.75;
/** A beginner's untested skill is practised as if mastery were this low (difficulty-1 questions first). */
export const BEGINNER_START_MASTERY = 0.1;

export const LEVEL_COPY = {
  label: 'შენი დონე',
  names: { beginner: 'დამწყები', intermediate: 'საშუალო', advanced: 'მოწინავე' },
  notes: {
    beginner: 'კურსი სულ საფუძვლებიდან დაიწყება: ჯერ ის, რასაც ყველაფერი ეყრდნობა, მერე ნაბიჯ-ნაბიჯ უფრო რთული.',
    intermediate: 'კურსი შენი ხარვეზებით დაიწყება, საფუძვლებიდან რთულისკენ.',
    advanced: 'კურსი პირდაპირ შენს სუსტ ადგილებზე და გამოცდის დონის ამოცანებზე იქნება.',
  },
};

/** Weak-first planning: proven weaknesses outrank untested skills, which get a short check-in instead of lessons. */
export const WEAK_PRIORITY_BOOST = 2;
export const UNTESTED_PRIORITY_FACTOR = 0.5;
export const UNTESTED_CHECKIN_DAYS = 1;

/** Daily session (T-020): how many questions fit a block, and how hard they are for the student's mastery. */
export const MAX_QUESTIONS_PER_BLOCK = 8;
/** Practice climbs from this far below the target difficulty to this far above it (T-020 difficulty ramp). */
export const RAMP_BELOW_TARGET = 1;
export const RAMP_ABOVE_TARGET = 1;
/**
 * Readiness ceiling: a skill's practice never goes more than this many levels above the hardest question the student
 * has solved on it, so exam-level questions only come once the levels below have been solved.
 */
export const LEVELS_ABOVE_HARDEST_SOLVED = 1;
/** This many correct answers in a row without help → the next question in the block becomes one level harder. */
export const STEP_UP_STREAK = 2;

/**
 * Guided problem solving (faded scaffolding) for a skill that is new or weak for the student: the first question of
 * its practice block is solved together (what is asked + the steps), the second gets one small hint, the third is
 * solved alone. `none` = no scaffolding (known skill, mixed practice, inserted questions).
 */
export const SCAFFOLD_LEVELS = ['full', 'light', 'solo', 'none'] as const;
export const SCAFFOLD_SEQUENCE = ['full', 'light', 'solo'] as const;
/** Estimated minutes for one question of difficulty d: 2 + 0.5 × d (easy ≈ 2.5 min, hardest ≈ 4.5 min). */
export const minutesPerQuestion = (difficulty: number) => 2 + 0.5 * difficulty;
/** Tagged skills other than the question's primary skill count this much in the mastery update. */
export const SECONDARY_SKILL_WEIGHT = 0.3;

/** From this mastery on, a theory card opens at the exam level with the basics collapsed. */
export const THEORY_BASICS_COLLAPSED_FROM = 0.5;

export const PRACTICE_COPY = {
  basicsTitle: 'საფუძვლები',
  reviewBasics: 'გაიმეორე საფუძვლები',
  ideaTitle: 'რა არის ეს',
  rulesTitle: 'მთავარი წესები',
  exampleTitle: 'ნაბიჯ-ნაბიჯ მაგალითი',
  examTitle: 'გამოცდის დონე',
  examExampleTitle: 'გამოცდის სტილის ამოცანა',
  answerLabel: 'პასუხი',
  mistakesTitle: 'ხშირი შეცდომები',
  tipTitle: 'რჩევა გამოცდისთვის',
  close: 'დახურვა',
  back: 'წინა',
  theoryTitle: 'თეორია',
  theoryIntro: 'დღეს ამ უნარზე ვმუშაობთ:',
  theoryNeeds: 'ეყრდნობა:',
  theorySoon: 'სრული თეორიის ბარათი (განმარტება და ამოხსნილი მაგალითები) მალე დაემატება. ახლა პირდაპირ ამოცანებით დავიწყოთ.',
  gotIt: 'გავიგე',
  check: 'შემოწმება',
  continue: 'გაგრძელება',
  correct: 'სწორია!',
  wrong: 'არასწორია',
  correctAnswerIs: 'სწორი პასუხი:',
  saving: 'ინახება...',
  saveError: 'პასუხი ვერ შეინახა. სცადე თავიდან.',
  doneTitle: 'დღე დასრულდა!',
  doneSubtitle: 'ყოველი პასუხი შენს ცოდნის რუკას აახლებს.',
  correctLabel: 'სწორი',
  accuracyLabel: 'სიზუსტე',
  xpLabel: 'XP',
  seeProgress: 'ჩემი პროგრესი',
  toCourse: 'კურსზე დაბრუნება',
  checkDayTitle: 'დღეს შემოწმების დღეა',
  checkDayBody: 'ყოველკვირეული შემოწმება და საბოლოო გამოცდა მალე დაემატება. დღეს შეგიძლია დაისვენო ან გაიმეორო ცოდნის რუკიდან.',
  noQuestions: 'ამ უნარისთვის ამოცანები ჯერ არ გვაქვს.',
  todayDone: 'დღევანდელი გეგმა შესრულებულია',
  review: 'გადახედვა',
  questionOf: 'ამოცანა',
};

/** Hints (zero tokens): each revealed hint lowers how much the answer counts toward mastery. */
export const HINT_WEIGHT_PENALTY = 0.25;
export const MIN_HINTED_WEIGHT = 0.25;
export const hintedWeight = (hintsUsed: number) => Math.max(MIN_HINTED_WEIGHT, 1 - HINT_WEIGHT_PENALTY * hintsUsed);


/**
 * "I'm stuck" (T-020, rebuilt 2026-11-25): four stages, each press gives more help than the one before, and none of
 * them gives the answer or the full solution.
 *   1. a small hint      — what is asked + the first targeted hint
 *   2. more detail       — the next hint, the formulas with when to use them, the problem split into small steps,
 *                          a similar solved example
 *   3. show your work    — the last hint + a photo of the handwritten working: the AI finds where the student went
 *                          wrong or stopped and gives the next step (an unclear photo → retake, never a guess)
 *   4. reinforcement     — easier questions on the weakness the photo showed (or the same skill), then back to this one
 */
export const STUCK_STEP_KINDS = ['restate', 'hint', 'theory', 'plan', 'example', 'photo', 'reinforce'] as const;
export const FREE_STUCK_KINDS: readonly string[] = ['restate', 'theory', 'plan', 'example', 'photo', 'reinforce'];
/** Formulas / rules shown in the theory step. */
export const MAX_STUCK_THEORY = 3;
export const MAX_STUCK_HINTS = 3;
/** Second-chance questions after wrong answers, at most this many per day (the day must stay finishable). */
export const MAX_SECOND_CHANCES = 3;
/** Questions that get stage-4 reinforcement per day, and how many easier questions each one gets at most. */
export const MAX_REINFORCEMENTS_PER_DAY = 2;
export const MAX_REINFORCEMENT_QUESTIONS = 2;
/** Practice work photos: distinct questions per student per day, and photos (first + retakes) per question. */
export const PRACTICE_PHOTO_DAILY_LIMIT = 10;
export const PRACTICE_PHOTO_PER_QUESTION = 3;

export const HINT_COPY = {
  button: 'გავიჭედე',
  more: 'კიდევ დამეხმარე',
  stageTitles: { small: 'პატარა მინიშნება', detail: 'უფრო დაწვრილებით', photo: 'მაჩვენე შენი ამოხსნა', easier: 'ჯერ უფრო მარტივი' },
  stageOf: (n: number, total: number) => `დახმარება ${n}/${total}`,
  kinds: {
    restate: 'რას გვეკითხება',
    hint: 'მინიშნება',
    theory: 'გავიხსენოთ თეორია',
    plan: 'დავყოთ პატარა ნაბიჯებად',
    example: 'მსგავსი ამოხსნილი მაგალითი',
    photo: 'რა ვნახე შენს ამოხსნაში',
    reinforce: 'ჯერ უფრო მარტივი ამოცანა',
  },
  theoryIntro: 'ამ ამოცანისთვის ეს წესები გჭირდება:',
  planIntro: 'ეს ამოცანა ასე იყოფა პატარა ნაბიჯებად:',
  answerLabel: 'პასუხი',
  photoIntro: 'გადაუღე ფოტო ფურცელს, სადაც ამოხსნა დაიწყე, სადამდეც მიხვედი. ვნახავ, სად შეცდი ან სად გაჩერდი, და შემდეგ ნაბიჯს მიგანიშნებ. პასუხს არ გეტყვი.',
  reinforceIntro: 'ჯერ უფრო მარტივ ამოცანას ამოვხსნით, მერე ამას დავუბრუნდებით.',
  reinforceNone: 'უფრო მარტივი მსგავსი ამოცანა ახლა არ გვაქვს. ჰკითხე დამხმარეს: ერთად გავივლით.',
  free: 'ეს ქულას არ ამცირებს',
  stillStuck: 'რომელიმე ნაბიჯი გაუგებარია? ჰკითხე დამხმარეს. პასუხს არ გეტყვის, მაგრამ მიგიყვანს.',
  noPhotoHint: 'ფურცელი ან კამერა არ გაქვს? დააჭირე „კიდევ დამეხმარე“: ჯერ უფრო მარტივ ამოცანას ამოვხსნით.',
  none: 'ამ ამოცანისთვის მინიშნება ჯერ არ გვაქვს.',
  error: 'მინიშნება ვერ ჩაიტვირთა.',
};

/** Guided problem solving (faded scaffolding): free help shown before the student asks for it. */
export const SCAFFOLD_COPY = {
  fullTitle: 'ამ ამოცანას ერთად ამოვხსნით',
  fullBody: 'მიჰყევი ნაბიჯებს ფურცელზე, ბოლოს პასუხი თავად აირჩიე.',
  lightTitle: 'პატარა მინიშნება',
  solo: 'ახლა თავად სცადე! თუ გაიჭედე, დააჭირე „გავიჭედე“.',
};

/** Photo of the handwritten working: stage 3 of "I'm stuck", or "find my mistake" after a wrong answer. */
export const WORK_PHOTO_COPY = {
  take: 'ამოხსნის გადაღება',
  retake: 'ხელახლა გადაღება',
  analysing: 'ვამოწმებ შენს ამოხსნას...',
  findMistake: 'მაჩვენე, სად შევცდი',
  findMistakeIntro: 'გადაუღე ფოტო შენს ამოხსნას და გეტყვი, რომელ ნაბიჯზე შეცდი და როგორ გაასწორო.',
  unreadable: 'ფოტოზე ამოხსნა კარგად არ ჩანს, ამიტომ ვერ გამოვიცნობ. გადაუღე ხელახლა: კარგ შუქზე, ახლოდან, ისე, რომ მთელი ამოხსნა ჩანდეს.',
  otherQuestion: 'ეს ამოხსნა სხვა ამოცანას ჰგავს. გადაუღე ამ ამოცანის ამოხსნას.',
  failed: 'ფოტო ვერ შემოწმდა. სცადე ხელახლა.',
  onTrack: 'სწორ გზაზე ხარ! გააგრძელე.',
  where: 'სად:',
  issue: 'რა ხდება:',
  nextStep: 'სცადე ახლა:',
  fix: 'როგორ გაასწორო:',
  weakSkill: (name: string) => `სავარჯიშოა: ${name}`,
  retakesLeft: (n: number) => `კიდევ ${n} ფოტო შეგიძლია ამ ამოცანისთვის`,
  dailyLimit: 'დღევანდელი ფოტოების ლიმიტი ამოიწურა. ჰკითხე დამხმარეს ან დააჭირე „კიდევ დამეხმარე“.',
  questionLimit: 'ამ ამოცანისთვის მეტი ფოტო ვეღარ შემოწმდება. ჰკითხე დამხმარეს.',
  safeNextStep: 'თავიდან გადახედე ამ ნაბიჯს და შეამოწმე, რომ წესი სწორად გამოიყენე. თუ ისევ გაგიჭირდა, ჰკითხე დამხმარეს.',
  photoAlt: 'შენი ამოხსნის ფოტო',
};

/** Banners on inserted and adjusted questions (adaptive difficulty, reinforcement, spaced review). */
export const ADAPTIVE_COPY = {
  reinforcement: 'ჯერ ეს უფრო მარტივი ამოცანა: იგივე იდეა, პატარა ნაბიჯით',
  reinforcementFor: (name: string) => `ჯერ ვივარჯიშოთ: ${name}`,
  backToOriginal: 'ახლა დავუბრუნდეთ თავდაპირველ ამოცანას. ახლა უკვე შეძლებ!',
  levelUp: 'ყოჩაღ! შემდეგი ამოცანა ოდნავ უფრო რთული იქნება.',
  warmup: (name: string) => `გახურება: გავიხსენოთ „${name}“`,
  review: (name: string) => `გამეორება: „${name}“ ხომ არ დაგავიწყდა?`,
};

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

/** Spaced revision of a finished skill after these many days. */
export const REVISION_INTERVALS_DAYS = [3, 7, 14] as const;

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

/** Weak-first planning: proven weaknesses outrank untested skills, which get a short check-in instead of lessons. */
export const WEAK_PRIORITY_BOOST = 2;
export const UNTESTED_PRIORITY_FACTOR = 0.5;
export const UNTESTED_CHECKIN_DAYS = 1;

/** Daily session (T-020): how many questions fit a block, and how hard they are for the student's mastery. */
export const MAX_QUESTIONS_PER_BLOCK = 8;
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

export const HINT_COPY = {
  button: 'მინიშნება',
  label: (n: number, total: number) => `მინიშნება ${n}/${total}`,
  none: 'ამ ამოცანისთვის მინიშნება ჯერ არ გვაქვს.',
  error: 'მინიშნება ვერ ჩაიტვირთა.',
  ruleHint: (skillName: string) => `ეს ამოცანა ეხება თემას „${skillName}“. გაიხსენე მთავარი წესი:`,
};

/** Full lessons (content/lessons/): how long they take and how they are built. */
export const LESSON_MIN_MINUTES = 10;
export const LESSON_MAX_MINUTES = 15;
export const LESSON_MIN_CHECKS = 2;
/** Worked examples always climb in this order. */
export const EXAMPLE_LEVELS = ['easy', 'medium', 'hard'] as const;
export type ExampleLevel = (typeof EXAMPLE_LEVELS)[number];

export const LESSON_COPY = {
  minutes: (n: number) => `${n} წთ გაკვეთილი`,
  goalTitle: 'ამ გაკვეთილის შემდეგ შეძლებ:',
  start: 'დავიწყოთ',
  next: 'შემდეგი',
  back: 'წინა',
  finish: 'გავიგე, ვივარჯიშოთ',
  finishReview: 'გაგრძელება',
  stepOf: (n: number, total: number) => `${n} / ${total}`,
  formulaWhen: 'როდის:',
  formulaHow: 'როგორ:',
  exampleLevels: { easy: 'მარტივი მაგალითი', medium: 'საშუალო მაგალითი', hard: 'რთული მაგალითი' },
  why: 'რატომ?',
  answer: 'პასუხი',
  checkTitle: 'შეამოწმე თავი',
  check: 'შემოწმება',
  checkCorrect: 'სწორია!',
  checkWrong: 'ჯერ არა. აი, რატომ:',
  tryAgain: 'კიდევ სცადე',
  summaryTitle: 'მთავარი, რაც უნდა დაიმახსოვრო',
  mistakesTitle: 'ხშირი შეცდომები',
  tipTitle: 'რჩევა გამოცდისთვის',
  reteachButton: 'ამიხსენი უფრო მარტივად',
  reteachTitle: 'სხვანაირად ავხსნათ',
  secondChance: 'ახლა სცადე ეს: იგივე იდეა, ოდნავ უფრო მარტივად',
};

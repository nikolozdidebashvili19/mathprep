/**
 * Finds question numbers, their points and their page in the pdftotext layer of an exam PDF.
 * The Georgian text itself has no Unicode mapping, but digits and brackets do, which is
 * enough to locate questions.
 *
 * - Pattern "points-first" (2020+): "(3) 38." — points in brackets, then the question number.
 * - Pattern "number-first" (≤2019): a line that starts with the number and ends with the points.
 *   It needs a wide gap before the points digit and a plausible 1–4 points range to count as complete.
 */

export type LocatedQuestion = {
  n: number;
  page: number;
  points: number;
};

export type LocatorStatus = 'complete' | 'partial' | 'none';

export type LocatorResult = {
  pattern: 'points-first' | 'number-first' | null;
  status: LocatorStatus;
  questions: LocatedQuestion[];
  totalPoints: number;
};

const POINTS_FIRST = /\((\d)\)\s*(\d{1,2})\.(?!\d)/g;
// " 35      3 ": number, a wide gap, optional unmapped (Georgian) text, points at the end of the line.
// Leading indent varies (2018 Q28 has 4 spaces); the consecutive-chain filter drops stray body-text matches.
// The points digit sits far right after a wide gap (≥5 spaces). The middle may hold options
// (2017/2018: " 1   ) 1,3   ) 0,13      1"), but formula lines like "  2    7    :1,  5" (2015-V2 p2) have a short gap.
// Horizontal whitespace only ([ \t], never \s): \s matches newlines and joined a formula line with the next line.
const NUMBER_FIRST = /^ {0,6}(\d{1,2})(?:[ \t]{4,}.*\S)?[ \t]{5,}(\d)[ \t]*$/gm;
const MIN_COMPLETE_QUESTIONS = 25;
const MAX_QUESTION_POINTS = 4;

type RawHit = LocatedQuestion;

const collect = (pages: string[], re: RegExp, numberGroup: number, pointsGroup: number): RawHit[] =>
  pages.flatMap((text, i) =>
    [...text.matchAll(re)].map((m) => ({ n: Number(m[numberGroup]), points: Number(m[pointsGroup]), page: i + 1 }))
  );

/** Keeps the first strictly consecutive chain 1, 2, 3, … and drops stray matches. */
const consecutiveChain = (hits: RawHit[]): LocatedQuestion[] => {
  const chain: LocatedQuestion[] = [];
  for (const hit of hits) {
    if (hit.n === chain.length + 1) chain.push(hit);
  }
  return chain;
};

const sumPoints = (questions: LocatedQuestion[]) => questions.reduce((s, q) => s + q.points, 0);

export function locateQuestions(pageTexts: string[]): LocatorResult {
  const pages = pageTexts.map((t) => t.replace(/\r/g, ''));

  const pointsFirstHits = collect(pages, POINTS_FIRST, 2, 1);
  const pointsFirst = consecutiveChain(pointsFirstHits);
  if (pointsFirst.length > 0) {
    const clean = pointsFirst.length === pointsFirstHits.length;
    return {
      pattern: 'points-first',
      status: clean && pointsFirst.length >= MIN_COMPLETE_QUESTIONS ? 'complete' : 'partial',
      questions: pointsFirst,
      totalPoints: sumPoints(pointsFirst),
    };
  }

  const numberFirst = consecutiveChain(collect(pages, NUMBER_FIRST, 1, 2));
  if (numberFirst.length > 0) {
    // This layout has more stray matches, so "complete" also needs every points value in the exam's 1–4 range.
    const plausible = numberFirst.every((q) => q.points >= 1 && q.points <= MAX_QUESTION_POINTS);
    const status = plausible && numberFirst.length >= MIN_COMPLETE_QUESTIONS ? 'complete' : 'partial';
    return { pattern: 'number-first', status, questions: numberFirst, totalPoints: sumPoints(numberFirst) };
  }

  return { pattern: null, status: 'none', questions: [], totalPoints: 0 };
}

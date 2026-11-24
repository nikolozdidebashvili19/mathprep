import { NUMERIC_TOLERANCE } from '@/shared/const/domain.const';

export type GradableQuestion = {
  type: string;
  answer?: string | null;
  maxPoints: number;
};

export type GradeResult = {
  correct: boolean;
  points: number;
};

/**
 * Reads a numeric answer as students write it: "0,5", "0.5", "-3", "1/2", "−2" (Unicode minus), "$\frac{1}{2}$".
 * Returns null when the text is not a single number.
 */
export function parseNumericAnswer(raw: string): number | null {
  const text = raw
    .replace(/\$/g, '')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (text === '') return null;

  const fraction = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  return /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : null;
}

function numbersMatch(given: number, expected: number): boolean {
  return Math.abs(given - expected) <= NUMERIC_TOLERANCE * Math.max(1, Math.abs(expected));
}

/** T-013: grades one auto-gradable answer. An empty answer ("I don't know") is never correct. */
export function gradeAnswer(question: GradableQuestion, given: string): GradeResult {
  const expected = (question.answer ?? '').trim();
  const answer = given.trim();
  if (answer === '' || expected === '') return { correct: false, points: 0 };

  let correct = false;
  if (question.type === 'multiple_choice') {
    correct = answer === expected;
  } else if (question.type === 'numeric') {
    const a = parseNumericAnswer(answer);
    const e = parseNumericAnswer(expected);
    correct = a !== null && e !== null && numbersMatch(a, e);
  }
  return { correct, points: correct ? question.maxPoints : 0 };
}

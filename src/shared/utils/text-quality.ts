/**
 * Extraction sometimes leaves letters from other scripts in Georgian text (სიბრطყე, აბსცissata), see T-007.
 * Students must never see such questions, so pools filter them out until the text is repaired.
 */
const FOREIGN_LETTERS = /[\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u1C90-\u1CBF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/u;

/** Latin glued to a Georgian letter outside $...$ (maths lives inside $...$). */
const MIXED_GEORGIAN_LATIN = /[\u10D0-\u10FF][a-zA-Z]|[a-zA-Z][\u10D0-\u10FF]/u;

export function hasBrokenLetters(text: string): boolean {
  const prose = text.replace(/\$[^$]*\$/g, ' ');
  return FOREIGN_LETTERS.test(text) || MIXED_GEORGIAN_LATIN.test(prose);
}

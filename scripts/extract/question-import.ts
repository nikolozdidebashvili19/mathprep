/**
 * T-007: what the vision model must return per question, and the merged record written to
 * content/questions/<exam-id>.json (seeded into MongoDB by T-010).
 */
import { z } from 'zod';

import { MC_LETTERS } from './answer-key.ts';

/** Option text the model writes when an answer option is a picture (graph, figure), not text. */
export const IMAGE_OPTION_TEXT = '[სურათი]';

const NormalizedBox =z.tuple([z.number(), z.number(), z.number(), z.number()]);

/** Raw model output for one question. Box = [ymin, xmin, ymax, xmax] on a 0–1000 scale (Gemini convention). */
export const VisionQuestionSchema = z.object({
  number: z.number().int().positive(),
  text: z.string().min(1),
  options: z.array(z.object({ key: z.string(), text: z.string().min(1) })),
  hasDiagram: z.boolean(),
  // A malformed box (e.g. [] or 3 numbers, 2015 Q27) becomes null; checkExtractedQuestion then flags the
  // missing box instead of the whole question being thrown away.
  diagramBox: z.preprocess((v) => (Array.isArray(v) && v.length !== 4 ? null : v), NormalizedBox.nullable()),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional().default(''),
});

export type VisionQuestion = z.infer<typeof VisionQuestionSchema>;

export const QuestionImportSchema = z.object({
  code: z.string().regex(/^\d{4}-V\d-Q\d{2}$/),
  examId: z.string(),
  number: z.number().int().positive(),
  sourcePage: z.number().int().positive(),
  type: z.enum(['multiple_choice', 'numeric', 'written']),
  maxPoints: z.number().int().positive(),
  text: z.string().min(1),
  options: z.array(z.object({ key: z.enum(MC_LETTERS), text: z.string().min(1) })),
  answer: z.string(),
  images: z.array(z.string()),
  extraction: z.object({
    provider: z.string(),
    model: z.string(),
    confidence: z.number(),
    notes: z.string(),
    problems: z.array(z.string()),
  }),
});

export type QuestionImport = z.infer<typeof QuestionImportSchema>;

/**
 * Models often write LaTeX with single backslashes inside JSON strings. That either breaks JSON.parse
 * ("\c" in \circ) or, worse, parses silently wrong ("\f" in \frac becomes a form-feed). Every backslash
 * followed by a LaTeX command (2+ letters) or a symbol is doubled; real JSON escapes are kept:
 * \\ \" \/ \uXXXX and single-letter \n \t \r \b \f not followed by more letters.
 * Ambiguity: "\nAB" (newline + Latin letters) is read as a LaTeX command; the prompt asks for one-line text.
 */
export function repairLatexEscapes(raw: string): string {
  return raw.replace(/\\(\\|"|\/|u[0-9a-fA-F]{4}|[a-zA-Z]+|[\s\S])/g, (match, tail: string) => {
    if (tail === '\\' || tail === '"' || tail === '/' || /^u[0-9a-fA-F]{4}$/.test(tail)) return match;
    if (/^[bfnrt]$/.test(tail)) return match;
    return `\\\\${tail}`;
  });
}

/**
 * Models sometimes break a long string across lines (2020 Q17), which JSON forbids. Raw control characters
 * inside string literals become a space (the prompt asks for one-line text anyway); whitespace between tokens is kept.
 */
export function replaceControlCharsInStrings(raw: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of raw) {
    if (inString && !escaped && ch < ' ') {
      out += ' ';
      continue;
    }
    out += ch;
    if (escaped) escaped = false;
    else if (ch === '\\') escaped = inString;
    else if (ch === '"') inString = !inString;
  }
  return out;
}

/** Parses model output into one object: repairs LaTeX escapes and line breaks, unwraps a single-element array. */
export function parseModelJson(raw: string): unknown {
  const parsed: unknown = JSON.parse(repairLatexEscapes(replaceControlCharsInStrings(raw)));
  return Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
}

/**
 * Letters from scripts that never appear in the papers (Arabic, Cyrillic, Armenian, Hebrew, CJK, Mtavruli…).
 * The model sometimes swaps a Georgian letter for a look-alike (სიბრطყე for სიბრტყე). Greek is allowed (math).
 */
const FOREIGN_LETTERS = /[Ѐ-ӿ԰-֏֐-׿؀-ۿऀ-ॿᲐ-Ჿ぀-ヿ一-鿿가-힯]/gu;

/** Latin letters glued to a Georgian letter outside $...$ ("აბსცissata", 2016 Q11); math lives inside $...$. */
const MIXED_GEORGIAN_LATIN = /[ა-ჿ][a-zA-Z]+|[a-zA-Z]+[ა-ჿ]/gu;

const outsideMath = (text: string) => text.replace(/\$[^$]*\$/g, ' ');

export const findForeignLetters = (text: string): string[] => [
  ...(text.match(FOREIGN_LETTERS) ?? []),
  ...(outsideMath(text).match(MIXED_GEORGIAN_LATIN) ?? []).map((m) => m.replace(/[ა-ჿ]/gu, '')),
];

export const FOREIGN_LETTERS_PROBLEM = 'foreign letters in text';

/** Plain Levenshtein distance; used to accept a model repair only if it changed almost nothing else. */
export function editDistance(a: string, b: string): number {
  const ca = [...a];
  const cb = [...b];
  let prev = Array.from({ length: cb.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ca.length; i++) {
    const cur = [i];
    for (let j = 1; j <= cb.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca[i - 1] === cb[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[cb.length];
}

/**
 * A model repair of look-alike letters is kept only if no foreign letter is left and nothing else moved much:
 * at most 2 edits per foreign letter, plus 2 slack (a dropped or doubled neighbour).
 */
export function acceptTextRepair(before: string, after: string): boolean {
  if (findForeignLetters(after).length > 0) return false;
  const wrongLetters = [...findForeignLetters(before).join('')].length;
  return editDistance(before, after) <= (2 * wrongLetters) + 2;
}

/** Consistency checks that do not need the model: anything returned here sends the question to review. */
export function checkExtractedQuestion(q: VisionQuestion, expectedNumber: number, isMultipleChoice: boolean): string[] {
  const problems: string[] = [];
  if (q.number !== expectedNumber) problems.push(`model returned question ${q.number}, expected ${expectedNumber}`);
  if (isMultipleChoice) {
    const keys = q.options.map((o) => o.key).join('');
    if (keys !== MC_LETTERS.join('')) problems.push(`MC options should be ა ბ გ დ, got "${keys || 'none'}"`);
  } else if (q.options.length > 0) {
    problems.push('written question came back with answer options');
  }
  if (q.options.some((o) => o.text === IMAGE_OPTION_TEXT)) {
    problems.push('picture options: needs per-option images in admin review');
  }
  if (q.hasDiagram && !q.diagramBox) problems.push('diagram reported but no box given');
  if (q.diagramBox) {
    const [y0, x0, y1, x1] = q.diagramBox;
    if (!(y0 < y1 && x0 < x1 && y0 >= 0 && x0 >= 0 && y1 <= 1000 && x1 <= 1000)) problems.push('diagram box is out of range');
  }
  const foreign = [q.text, ...q.options.map((o) => o.text)].flatMap(findForeignLetters);
  if (foreign.length) problems.push(`${FOREIGN_LETTERS_PROBLEM}: ${[...new Set(foreign)].join('')}`);
  if (q.confidence < 0.7) problems.push(`low model confidence (${q.confidence})`);
  return problems;
}

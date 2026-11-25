export type MathSegment = { kind: 'text' | 'math'; value: string };

/**
 * Splits question text written as "Georgian prose with $LaTeX$ inline" into text and math parts.
 * An unmatched "$" is kept as plain text so a typo never swallows the rest of the question.
 */
export function splitMathSegments(source: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let rest = source;
  while (rest.length > 0) {
    const open = rest.indexOf('$');
    const close = open === -1 ? -1 : rest.indexOf('$', open + 1);
    if (open === -1 || close === -1) {
      segments.push({ kind: 'text', value: rest });
      break;
    }
    if (open > 0) segments.push({ kind: 'text', value: rest.slice(0, open) });
    const math = rest.slice(open + 1, close);
    if (math.trim()) segments.push({ kind: 'math', value: math });
    rest = rest.slice(close + 1);
  }
  return segments;
}

export type BoldSegment = { bold: boolean; value: string };

/** Splits plain text on **bold** markers (used for key terms in lessons). An unmatched "**" stays as text. */
export function splitBold(source: string): BoldSegment[] {
  const parts = source.split('**');
  if (parts.length % 2 === 0) return [{ bold: false, value: source }];
  return parts.flatMap((value, i) => (value ? [{ bold: i % 2 === 1, value }] : []));
}

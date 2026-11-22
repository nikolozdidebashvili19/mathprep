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

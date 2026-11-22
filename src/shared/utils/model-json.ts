/**
 * Vision models often return JSON with unescaped LaTeX (\frac, \circ) or raw line breaks inside strings.
 * Same repair as the extraction pipeline (scripts/extract/question-import.ts), for app-side model calls.
 */
function repairLatexEscapes(raw: string): string {
  return raw.replace(/\\(\\|"|\/|u[0-9a-fA-F]{4}|[a-zA-Z]+|[\s\S])/g, (match, tail: string) => {
    if (tail === '\\' || tail === '"' || tail === '/' || /^u[0-9a-fA-F]{4}$/.test(tail)) return match;
    if (/^[bfnrt]$/.test(tail)) return match;
    return `\\\\${tail}`;
  });
}

function replaceControlCharsInStrings(raw: string): string {
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

/** Parses model output into a JS value; a single-element array is unwrapped. Throws on hopeless JSON. */
export function parseModelJson(raw: string): unknown {
  const parsed: unknown = JSON.parse(repairLatexEscapes(replaceControlCharsInStrings(raw)));
  return Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
}

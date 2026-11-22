import { describe, expect, it } from 'vitest';

import {
  acceptTextRepair,
  checkExtractedQuestion,
  editDistance,
  findForeignLetters,
  IMAGE_OPTION_TEXT,
  parseModelJson,
  VisionQuestionSchema,
  type VisionQuestion,
} from './question-import';
import { createVisionProvider } from './vision/vision-provider';

const mcQuestion: VisionQuestion = {
  number: 4,
  text: 'იპოვეთ $x$',
  options: [
    { key: 'ა', text: '$1$' },
    { key: 'ბ', text: '$2$' },
    { key: 'გ', text: '$3$' },
    { key: 'დ', text: '$4$' },
  ],
  hasDiagram: false,
  diagramBox: null,
  confidence: 0.95,
  notes: '',
};

describe('checkExtractedQuestion', () => {
  it('accepts a clean MC question', () => {
    expect(checkExtractedQuestion(mcQuestion, 4, true)).toEqual([]);
  });

  it('flags the wrong question number', () => {
    expect(checkExtractedQuestion(mcQuestion, 5, true)).toEqual(['model returned question 4, expected 5']);
  });

  it('flags missing or misordered MC options', () => {
    const q = { ...mcQuestion, options: mcQuestion.options.slice(0, 3) };
    expect(checkExtractedQuestion(q, 4, true)).toEqual(['MC options should be ა ბ გ დ, got "აბგ"']);
  });

  it('flags options on a written question', () => {
    expect(checkExtractedQuestion(mcQuestion, 4, false)).toEqual(['written question came back with answer options']);
  });

  it('flags a diagram without a usable box', () => {
    expect(checkExtractedQuestion({ ...mcQuestion, hasDiagram: true }, 4, true)).toEqual(['diagram reported but no box given']);
    expect(checkExtractedQuestion({ ...mcQuestion, diagramBox: [500, 0, 100, 900] }, 4, true)).toEqual(['diagram box is out of range']);
  });

  it('flags picture options for admin review', () => {
    const q = {
      ...mcQuestion,
      options: mcQuestion.options.map((o) => ({ ...o, text: IMAGE_OPTION_TEXT })),
      hasDiagram: true,
      diagramBox: [300, 50, 950, 800] as [number, number, number, number],
    };
    expect(checkExtractedQuestion(q, 4, true)).toEqual(['picture options: needs per-option images in admin review']);
  });

  it('turns a malformed diagram box into null so it gets flagged, not dropped (2015 Q27)', () => {
    const parsed = VisionQuestionSchema.parse({ ...mcQuestion, hasDiagram: true, diagramBox: [100, 200] });
    expect(parsed.diagramBox).toBeNull();
    expect(checkExtractedQuestion(parsed, 4, true)).toEqual(['diagram reported but no box given']);
  });

  it('flags look-alike letters from other scripts (სიბრطყე, 2026 Q9) but not Greek', () => {
    expect(checkExtractedQuestion({ ...mcQuestion, text: 'სიბრطყე $\\alpha$ α' }, 4, true)).toEqual(['foreign letters in text: ط']);
    expect(findForeignLetters('კუთხე $\\angle A$ α β π')).toEqual([]);
  });

  it('flags Latin letters inside a Georgian word, but not math in $...$ (2016 Q11)', () => {
    expect(findForeignLetters('აბსცissata ღერძის')).toEqual(['issata']);
    expect(findForeignLetters('$ABC$ სამკუთხედი, $5$სმ, $x$-ის')).toEqual([]);
  });

  it('measures edit distance in characters', () => {
    expect(editDistance('სიბრطყე', 'სიბრტყე')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
  });

  it('accepts a repair only if it removes the foreign letters and changes little else', () => {
    expect(acceptTextRepair('მოძراობს $x$', 'მოძრაობს $x$')).toBe(true);
    expect(acceptTextRepair('მოძراობს $x$', 'მოძრაობს $y$ და სხვა')).toBe(false);
    expect(acceptTextRepair('სიბრطყე', 'სიბრطყე')).toBe(false);
    expect(acceptTextRepair('აბსცissata ღერძის', 'აბსცისათა ღერძის')).toBe(true);
  });

  it('flags low confidence', () => {
    expect(checkExtractedQuestion({ ...mcQuestion, confidence: 0.5 }, 4, true)).toEqual(['low model confidence (0.5)']);
  });

  it('defaults notes when the model omits them', () => {
    const withoutNotes = { number: 4, text: 'x', options: [], hasDiagram: false, diagramBox: null, confidence: 1 };
    expect(VisionQuestionSchema.parse(withoutNotes).notes).toBe('');
  });
});

describe('parseModelJson', () => {
  const textOf = (raw: string) => (parseModelJson(raw) as { text: string }).text;

  it('keeps correctly escaped LaTeX', () => {
    expect(textOf(String.raw`{"text": "$\\frac{1}{2}$"}`)).toBe(String.raw`$\frac{1}{2}$`);
  });

  it('repairs an invalid escape like \\circ (2025 Q10)', () => {
    expect(textOf(String.raw`{"text": "$5^\circ$"}`)).toBe(String.raw`$5^\circ$`);
  });

  it('repairs escapes that would otherwise parse silently wrong', () => {
    const raw = String.raw`{"text": "$\frac{a}{b} \times \beta \neq \right) \text{x}$"}`;
    expect(textOf(raw)).toBe(String.raw`$\frac{a}{b} \times \beta \neq \right) \text{x}$`);
  });

  it('repairs symbol commands like \\, and \\%', () => {
    expect(textOf(String.raw`{"text": "$7\,2\%$"}`)).toBe(String.raw`$7\,2\%$`);
  });

  it('keeps real JSON escapes', () => {
    expect(textOf(String.raw`{"text": "a\n$b$ \"q\" ა"}`)).toBe('a\n$b$ "q" ა');
  });

  it('turns raw line breaks inside strings into spaces (2020 Q17)', () => {
    expect(textOf('{\n  "text": "პირველი\nმეორე\t$x$"\n}')).toBe('პირველი მეორე $x$');
  });

  it('unwraps a single-element array (2025 Q7)', () => {
    expect(parseModelJson('[{"number": 7}]')).toEqual({ number: 7 });
  });
});

describe('createVisionProvider', () => {
  it('uses Gemini with the default model when only the key is set', () => {
    const provider = createVisionProvider({ GEMINI_API_KEY: 'test-key' });
    expect(provider.name).toBe('gemini');
    expect(provider.model).toBe('gemini-3.5-flash-lite');
  });

  it('honours GEMINI_MODEL', () => {
    expect(createVisionProvider({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-3.8-flash' }).model).toBe('gemini-3.8-flash');
  });

  it('fails clearly without a key or with an unknown provider', () => {
    expect(() => createVisionProvider({})).toThrow('GEMINI_API_KEY is not set');
    expect(() => createVisionProvider({ AI_PROVIDER: 'other' })).toThrow('not supported yet');
  });
});

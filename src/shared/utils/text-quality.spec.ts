import { describe, expect, it } from 'vitest';

import { hasBrokenLetters } from '@/shared/utils/text-quality';

describe('hasBrokenLetters', () => {
  it('accepts clean Georgian text with maths and Greek', () => {
    expect(hasBrokenLetters('$ABC$ სამკუთხედში $\alpha = 30^\circ$, იპოვეთ $x$-ის მნიშვნელობა.')).toBe(false);
  });

  it('flags look-alike letters from other scripts', () => {
    expect(hasBrokenLetters('საკოორდინატო სიბრطყეზე')).toBe(true);
    expect(hasBrokenLetters('წрფე')).toBe(true);
  });

  it('flags Latin letters inside a Georgian word', () => {
    expect(hasBrokenLetters('აბსცissata ღერძის')).toBe(true);
  });
});

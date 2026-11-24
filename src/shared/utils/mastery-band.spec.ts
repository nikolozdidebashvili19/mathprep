import { describe, expect, it } from 'vitest';

import { masteryBand } from '@/shared/utils/mastery-band';

describe('masteryBand', () => {
  it('maps mastery values to colour bands', () => {
    expect(masteryBand(null)).toBe('untested');
    expect(masteryBand(0.9, 0)).toBe('untested');
    expect(masteryBand(0.2)).toBe('weak');
    expect(masteryBand(0.5)).toBe('mixed');
    expect(masteryBand(0.7)).toBe('strong');
  });
});

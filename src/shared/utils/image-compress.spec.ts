import { describe, expect, it } from 'vitest';

import { scaledSize } from '@/shared/utils/image-compress';

describe('scaledSize', () => {
  it('shrinks the longer side to the limit and keeps the aspect ratio', () => {
    expect(scaledSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never scales up a small image', () => {
    expect(scaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

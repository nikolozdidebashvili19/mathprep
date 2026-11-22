// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { validateFormData } from './validate-form-data';

const Schema = z.object({ sessionId: z.string().min(3) });
const RULES = { field: 'photo', maxBytes: 10, mimeTypes: ['image/jpeg'] };

function makeRequest(fields: Record<string, string>, file?: File) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  if (file) form.append('photo', file);
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: form });
}

const errorOf = async (result: unknown) => {
  expect(result).toBeInstanceOf(NextResponse);
  const res = result as NextResponse;
  return { status: res.status, error: (await res.json()).error };
};

describe('validateFormData', () => {
  it('returns fields and the file when valid', async () => {
    const file = new File(['12345'], 'w.jpg', { type: 'image/jpeg' });
    const result = await validateFormData(makeRequest({ sessionId: 'abc' }, file), Schema, RULES);
    expect(result).not.toBeInstanceOf(NextResponse);
    const ok = result as { data: { sessionId: string }; file: File };
    expect(ok.data).toEqual({ sessionId: 'abc' });
    expect(ok.file.size).toBe(5);
  });

  it('rejects invalid fields, a missing file, a too large file and a wrong type', async () => {
    const jpg = new File(['1'], 'w.jpg', { type: 'image/jpeg' });
    expect(await errorOf(await validateFormData(makeRequest({ sessionId: 'a' }, jpg), Schema, RULES))).toEqual({ status: 400, error: 'VALIDATION_ERROR' });
    expect(await errorOf(await validateFormData(makeRequest({ sessionId: 'abc' }), Schema, RULES))).toEqual({ status: 400, error: 'FILE_REQUIRED' });
    const big = new File(['12345678901'], 'w.jpg', { type: 'image/jpeg' });
    expect(await errorOf(await validateFormData(makeRequest({ sessionId: 'abc' }, big), Schema, RULES))).toEqual({ status: 413, error: 'FILE_TOO_LARGE' });
    const gif = new File(['1'], 'w.gif', { type: 'image/gif' });
    expect(await errorOf(await validateFormData(makeRequest({ sessionId: 'abc' }, gif), Schema, RULES))).toEqual({ status: 400, error: 'UNSUPPORTED_FILE_TYPE' });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AiVisionError, createAiVisionClient } from '@/shared/lib/ai-vision';

const okResponse = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text }] } }] }), {
    status: 200,
  });

describe('AiVisionClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to Gemini flash-lite and reports provider + model', () => {
    expect(createAiVisionClient({ GEMINI_API_KEY: 'k' }).describe()).toEqual({ provider: 'gemini', model: 'gemini-3.5-flash-lite' });
    expect(createAiVisionClient({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' }).describe().model).toBe('gemini-x');
  });

  it('sends images + prompt with the key in a header and returns only the non-thought text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);

    const text = await createAiVisionClient({ GEMINI_API_KEY: 'secret' }).generateJson({
      prompt: 'p',
      images: [{ mimeType: 'image/jpeg', base64: 'AAA' }],
    });

    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('gemini-3.5-flash-lite:generateContent');
    expect(url).not.toContain('secret');
    expect(init.headers['x-goog-api-key']).toBe('secret');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: 'AAA' } });
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', temperature: 0 });
  });

  it('retries transient failures (503, 429) and then succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const busy = () => new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'high demand' } }), { status: 503 });
    const fetchMock = vi.fn().mockResolvedValueOnce(busy()).mockResolvedValueOnce(busy()).mockResolvedValueOnce(okResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);

    expect(await createAiVisionClient({ GEMINI_API_KEY: 'k' }, sleep).generateJson({ prompt: 'p', images: [] })).toBe('{}');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2000, 6000]);
  });

  it('does not retry a bad request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'bad image' } }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createAiVisionClient({ GEMINI_API_KEY: 'k' }, vi.fn()).generateJson({ prompt: 'p', images: [] })).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns API errors and empty answers into AiVisionError', async () => {
    const client = createAiVisionClient({ GEMINI_API_KEY: 'k' }, vi.fn().mockResolvedValue(undefined));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota' } }), { status: 429 })));
    await expect(client.generateJson({ prompt: 'p', images: [] })).rejects.toMatchObject({ status: 429 });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), { status: 200 })));
    await expect(client.generateJson({ prompt: 'p', images: [] })).rejects.toThrow('SAFETY');
  });

  it('fails clearly without a key or with an unknown provider', async () => {
    await expect(createAiVisionClient({}).generateJson({ prompt: 'p', images: [] })).rejects.toBeInstanceOf(AiVisionError);
    await expect(createAiVisionClient({ AI_PROVIDER: 'anthropic' }).generateJson({ prompt: 'p', images: [] })).rejects.toThrow('not supported yet');
  });
});

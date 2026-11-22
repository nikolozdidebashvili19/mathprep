import { ProviderError, type VisionProvider, type VisionRequest } from './vision-provider.ts';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 120_000;

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  error?: { code: number; status: string; message: string };
};

/** Gemini REST API via fetch (no SDK). The key travels only in the request header. */
export function createGeminiProvider(apiKey: string, model: string): VisionProvider {
  const generateJson = async ({ prompt, images, temperature = 0 }: VisionRequest): Promise<string> => {
    const response = await fetch(`${API_BASE}/${model}:generateContent`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...images.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature },
      }),
    });

    const body = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok || body.error) {
      const status = body.error?.code ?? response.status;
      const retryable = status === 429 || status >= 500;
      throw new ProviderError(`Gemini ${status} ${body.error?.status ?? ''}: ${body.error?.message ?? 'request failed'}`, status, retryable);
    }

    const candidate = body.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join('');
    if (!text) {
      const reason = candidate?.finishReason ?? 'none';
      // RECITATION (copyright filter) repeats for the same input, so waiting and retrying is pointless.
      throw new ProviderError(`Gemini returned no text (finishReason: ${reason})`, 200, reason !== 'RECITATION');
    }
    return text;
  };

  return { name: 'gemini', model, generateJson };
}

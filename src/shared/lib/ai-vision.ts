/**
 * Server-side vision model client: "prompt + images in, JSON text out".
 * The provider is picked with AI_PROVIDER (default gemini). Adding Anthropic later = one more `case` in `send`.
 * Callers validate the returned JSON with Zod; this class never interprets it.
 */
export type AiImage = { mimeType: string; base64: string };

export type AiVisionRequest = {
  prompt: string;
  images: AiImage[];
  /** 0 = deterministic (default). */
  temperature?: number;
};

type AiVisionConfig = {
  provider: string;
  apiKey?: string;
  model: string;
};

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  error?: { code: number; status: string; message: string };
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 60_000;
/** Waits before each retry of a transient failure (429 rate limit, 5xx "high demand"). */
const RETRY_DELAYS_MS = [2_000, 6_000];

const isTransient = (error: unknown) =>
  error instanceof AiVisionError ? error.retryable : error instanceof Error && error.name === 'TimeoutError';

export class AiVisionError extends Error {
  readonly status: number;
  /** True only for API rate limits and overload (429, 5xx); config errors and refusals are not retried. */
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable = false) {
    super(message);
    this.name = 'AiVisionError';
    this.status = status;
    this.retryable = retryable;
  }
}

type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AiVisionClient {
  private readonly readConfig: () => AiVisionConfig;
  private readonly sleep: Sleep;

  constructor(readConfig: () => AiVisionConfig, sleep: Sleep = defaultSleep) {
    this.readConfig = readConfig;
    this.sleep = sleep;
  }

  /** Provider and model in use, stored next to every analysis so results stay traceable. */
  describe(): { provider: string; model: string } {
    const { provider, model } = this.readConfig();
    return { provider, model };
  }

  /** Sends the request, retrying transient failures (rate limit, overload, timeout) twice with a growing wait. */
  async generateJson(request: AiVisionRequest): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.send(request);
      } catch (error) {
        if (!isTransient(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
        await this.sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  private async send(request: AiVisionRequest): Promise<string> {
    const config = this.readConfig();
    switch (config.provider) {
      case 'gemini':
        return this.sendGemini(config, request);
      default:
        throw new AiVisionError(`AI_PROVIDER "${config.provider}" is not supported yet (available: gemini)`, 500);
    }
  }

  private async sendGemini(config: AiVisionConfig, { prompt, images, temperature = 0 }: AiVisionRequest): Promise<string> {
    if (!config.apiKey) throw new AiVisionError('GEMINI_API_KEY is not set', 500);
    const response = await fetch(`${GEMINI_API_BASE}/${config.model}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
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
      throw new AiVisionError(`Gemini ${status}: ${body.error?.message ?? 'request failed'}`, status, status === 429 || status >= 500);
    }
    const candidate = body.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join('');
    if (!text) throw new AiVisionError(`Gemini returned no text (finishReason: ${candidate?.finishReason ?? 'none'})`, 502);
    return text;
  }
}

export const createAiVisionClient = (env: Record<string, string | undefined>, sleep?: Sleep) =>
  new AiVisionClient(() => {
    const provider = env.AI_PROVIDER || 'gemini';
    return {
      provider,
      apiKey: provider === 'gemini' ? env.GEMINI_API_KEY : undefined,
      model: provider === 'gemini' ? env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL : '',
    };
  }, sleep);

export const aiVision = createAiVisionClient(process.env);

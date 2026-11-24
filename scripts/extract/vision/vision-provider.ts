/**
 * One small interface for "send page images + a prompt, get JSON text back".
 * Pick the backend with AI_PROVIDER (default: gemini). Adding Anthropic later = one more file here.
 */
import { createGeminiProvider } from './gemini-provider.ts';

export type VisionImage = {
  mimeType: 'image/png' | 'image/jpeg';
  base64: string;
};

export type VisionRequest = {
  prompt: string;
  images: VisionImage[];
  /** Defaults to 0 (deterministic). Raised only to re-roll output that came back malformed. */
  temperature?: number;
};

export type VisionProvider = {
  name: string;
  model: string;
  /** Returns the model's raw JSON text. Callers validate it with Zod. */
  generateJson: (request: VisionRequest) => Promise<string>;
};

// Plain fields, no constructor parameter properties: Node's type-stripping can't run those.
export class ProviderError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

export function createVisionProvider(env: Record<string, string | undefined> = process.env): VisionProvider {
  const provider = env.AI_PROVIDER ?? 'gemini';
  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in .env');
    // Default verified Nov 2026 on a free key: 3.5-flash-lite answers in ~2s; flash-latest / 3.8-flash hung >2 min.
    return createGeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite');
  }
  throw new Error(`AI_PROVIDER "${provider}" is not supported yet (available: gemini)`);
}

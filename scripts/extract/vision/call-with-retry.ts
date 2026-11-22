import { log } from '../content-index.ts';
import { ProviderError, type VisionImage, type VisionProvider } from './vision-provider.ts';

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = 15000;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries timeouts, 429 and 5xx with linear backoff; anything else (bad request, RECITATION) is thrown at once. */
export async function callWithRetry(provider: VisionProvider, prompt: string, images: VisionImage[], temperature = 0): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await provider.generateJson({ prompt, images, temperature });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      const retryable = timedOut || (error instanceof ProviderError && error.retryable);
      if (!retryable || attempt >= MAX_ATTEMPTS) throw error;
      const wait = BACKOFF_MS * attempt;
      log(`   retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait / 1000}s: ${(error as Error).message.slice(0, 120)}`);
      await sleep(wait);
    }
  }
}

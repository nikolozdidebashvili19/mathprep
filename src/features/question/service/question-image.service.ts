import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ServiceResult } from '@/shared/types/common';

const IMAGES_DIR = path.join(process.cwd(), 'content', 'images');
// Only crops written by the extractor: "<exam>/qNN.png". Rules out path traversal.
const IMAGE_PATH = /^\d{4}-V\d\/q\d{2}\.png$/;

export async function readQuestionImageService(segments: string[]): Promise<ServiceResult<Buffer>> {
  const relative = segments.join('/');
  if (!IMAGE_PATH.test(relative)) return { data: { error: 'NOT_FOUND' }, status: 404 };
  try {
    return { data: await readFile(path.join(IMAGES_DIR, relative)), status: 200 };
  } catch {
    return { data: { error: 'NOT_FOUND' }, status: 404 };
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { practicePhotoService } from '@/features/course/service/practice-photo.service';
import { UploadPracticePhotoSchema } from '@/features/handwriting/validations/handwriting.validation';
import { MAX_WORK_PHOTO_BYTES, WORK_PHOTO_MIME_TYPES } from '@/shared/const/domain.const';
import { auth } from '@/shared/lib/auth';
import { validateFormData } from '@/shared/middleware/validate-form-data';

type SessionUser = { id?: string };

/** multipart/form-data: sessionId, itemIndex, photo (jpeg/png/webp, compressed in the browser). Analysed at once. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateFormData(req, UploadPracticePhotoSchema, {
      field: 'photo',
      maxBytes: MAX_WORK_PHOTO_BYTES,
      mimeTypes: WORK_PHOTO_MIME_TYPES,
    });
    if (validated instanceof NextResponse) return validated;

    const data = Buffer.from(await validated.file.arrayBuffer());
    const result = await practicePhotoService(userId, validated.data, { mimeType: validated.file.type, data });
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

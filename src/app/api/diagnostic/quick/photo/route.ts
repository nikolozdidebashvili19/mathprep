import { NextRequest, NextResponse } from 'next/server';

import { uploadQuickPhotoService } from '@/features/diagnostic/service/quick-check.service';
import { UploadWorkPhotoSchema } from '@/features/handwriting/validations/handwriting.validation';
import { MAX_WORK_PHOTO_BYTES, WORK_PHOTO_MIME_TYPES } from '@/shared/const/domain.const';
import { auth } from '@/shared/lib/auth';
import { validateFormData } from '@/shared/middleware/validate-form-data';

type SessionUser = { id?: string };

/** multipart/form-data: sessionId, questionId, photo (jpeg/png/webp, compressed in the browser). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateFormData(req, UploadWorkPhotoSchema, {
      field: 'photo',
      maxBytes: MAX_WORK_PHOTO_BYTES,
      mimeTypes: WORK_PHOTO_MIME_TYPES,
    });
    if (validated instanceof NextResponse) return validated;

    const data = Buffer.from(await validated.file.arrayBuffer());
    const result = await uploadQuickPhotoService(userId, validated.data, { mimeType: validated.file.type, data });
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { getOwnWorkPhotoImageService } from '@/features/handwriting/service/handwriting.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

const OBJECT_ID = /^[a-f0-9]{24}$/;

/** A student's own work photo (private: never cached by shared caches). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { photoId } = await params;
    if (!OBJECT_ID.test(photoId)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const result = await getOwnWorkPhotoImageService(userId, photoId);
    if ('error' in result.data) return NextResponse.json(result.data, { status: result.status });
    return new NextResponse(new Uint8Array(result.data.data), {
      headers: { 'Content-Type': result.data.mimeType, 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { readQuestionImageService } from '@/features/question/service/question-image.service';
import { auth } from '@/shared/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { data, status } = await readQuestionImageService((await params).path);
    if (!(data instanceof Buffer)) return NextResponse.json(data, { status });

    return new NextResponse(new Uint8Array(data), {
      status,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

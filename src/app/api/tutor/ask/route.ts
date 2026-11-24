import { NextRequest, NextResponse } from 'next/server';

import { askTutorService } from '@/features/tutor/service/tutor.service';
import { AskTutorSchema } from '@/features/tutor/validations/tutor.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, AskTutorSchema);
    if (validated instanceof NextResponse) return validated;

    const result = await askTutorService(userId, validated.data);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

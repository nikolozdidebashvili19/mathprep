import { NextRequest, NextResponse } from 'next/server';

import { createCourseService } from '@/features/course/service/course.service';
import { CreateCourseSchema } from '@/features/course/validations/course.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, CreateCourseSchema);
    if (validated instanceof NextResponse) return validated;

    const result = await createCourseService(userId, validated.data);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

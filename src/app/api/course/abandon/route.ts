import { NextResponse } from 'next/server';

import { abandonCourseService } from '@/features/course/service/course.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

/** No body: ends the signed-in student's active course. */
export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const result = await abandonCourseService(userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

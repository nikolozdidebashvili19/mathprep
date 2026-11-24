import { NextRequest, NextResponse } from 'next/server';

import { saveDiagnosticAnswerService } from '@/features/diagnostic/service/diagnostic.service';
import { SaveAnswerSchema } from '@/features/diagnostic/validations/diagnostic.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, SaveAnswerSchema);
    if (validated instanceof NextResponse) return validated;

    const { data, status } = await saveDiagnosticAnswerService(userId, validated.data);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

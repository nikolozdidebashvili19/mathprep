import { NextRequest, NextResponse } from 'next/server';

import { finishQuickCheckService } from '@/features/diagnostic/service/quick-check.service';
import { FinishDiagnosticSchema } from '@/features/diagnostic/validations/diagnostic.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

// Waits for photo analyses that are still outstanding.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, FinishDiagnosticSchema);
    if (validated instanceof NextResponse) return validated;

    const result = await finishQuickCheckService(userId, validated.data);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

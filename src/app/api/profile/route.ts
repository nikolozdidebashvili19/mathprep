import { NextRequest, NextResponse } from 'next/server';

import { updateOnboardingService } from '@/features/auth/service/profile.service';
import { OnboardingSchema } from '@/features/auth/validations/auth.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, OnboardingSchema);
    if (validated instanceof NextResponse) return validated;

    const { data, status } = await updateOnboardingService(userId, validated.data);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

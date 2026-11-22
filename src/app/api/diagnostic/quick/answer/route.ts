import { after, NextRequest, NextResponse } from 'next/server';

import { analyzeQuickPhotoService, submitQuickAnswerService } from '@/features/diagnostic/service/quick-check.service';
import { QuickAnswerSchema } from '@/features/diagnostic/validations/diagnostic.validation';
import { auth } from '@/shared/lib/auth';
import { validateBody } from '@/shared/middleware/validate-body';

type SessionUser = { id?: string };

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as SessionUser | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const validated = await validateBody(req, QuickAnswerSchema);
    if (validated instanceof NextResponse) return validated;

    const result = await submitQuickAnswerService(userId, validated.data);
    if ('error' in result.data) return NextResponse.json(result.data, { status: result.status });

    // The photo is analysed after the response, so the student moves on without waiting for the model.
    if (result.data.photoId) {
      const { sessionId, questionId } = validated.data;
      after(() => analyzeQuickPhotoService(sessionId, questionId));
    }
    return NextResponse.json(result.data.view, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

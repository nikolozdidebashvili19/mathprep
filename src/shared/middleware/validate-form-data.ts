import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

type FileRules = { field: string; maxBytes: number; mimeTypes: readonly string[] };

/**
 * multipart/form-data counterpart of validateBody: text fields go through the Zod schema,
 * the one file field is checked for presence, size and type. Returns 400 (413 for size) otherwise.
 */
export async function validateFormData<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  fileRules: FileRules
): Promise<{ data: T; file: File } | NextResponse> {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });

  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  const result = schema.safeParse(fields);
  if (!result.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: result.error.flatten() }, { status: 400 });
  }

  const file = form.get(fileRules.field);
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
  if (file.size > fileRules.maxBytes) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 });
  if (!fileRules.mimeTypes.includes(file.type)) return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE' }, { status: 400 });

  return { data: result.data, file };
}

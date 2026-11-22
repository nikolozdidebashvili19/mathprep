# T-014 · Private photo storage

**Epic:** Diagnostic · **Week:** 3 · **Status:** todo · **Depends on:** —

- Cloudflare R2 private bucket with signed upload and download URLs; `src/shared/lib/storage.ts` (class + singleton + spec)
- Blur check before upload (client side, Laplacian variance); ask the student to retake when blurry
- Retention and deletion rules (see T-027)

## Interim (2026-11-22)
Quick-check work photos are stored **in MongoDB** (`WorkPhoto`, `src/features/handwriting/`), compressed in the browser to a few hundred KB, one per question per session. Move to the private R2 bucket before launch; nothing serves photos to the browser yet.

# T-004 · Georgian UI shell and brand basics

**Epic:** Foundation · **Week:** 1 · **Status:** done · **Depends on:** —

## Scope
- `APP_NAME = 'Erovnuli.ge'`, a Georgian description, `<html lang="ka">`
- **Georgian font fallback**: Space Grotesk and Inter have no Georgian glyphs. Add `Noto Sans Georgian` (next/font) to the `--font-sans` / `--font-heading` stacks. This keeps the locked §19 direction
- Move all UI copy into `src/shared/const/*.const.ts`, in Georgian (home, nav, auth forms, dashboard, footer)
- Rewrite the marketing home page for the product: hero ("find exactly why you lose points"), the 3-step journey, a CTA to sign-up
- Sidebar navigation: დიაგნოსტიკა, ანგარიში, კურსი, პროგრესი
- Update `PROTECTED_ROUTES` and the proxy matcher for the new student routes

## Acceptance criteria
- [x] No English strings visible in the student UI (copy lives in `src/shared/const/{app,home,auth,ui,dashboard,navigation,sections}.const.ts`)
- [x] Follows the §19 locked direction; no inline styles; no arbitrary Tailwind values
- [x] Zod validation messages in Georgian (`z.locales.ka()` via `src/shared/providers/locale-provider.tsx`)
- [x] lint + typecheck + tests + build pass; smoke-tested `/`, `/sign-in`, and the signed-out redirect from `/diagnostic`

## Notes
- **Bug fixed:** the `(protected)` layout sent every non-admin to `/`, so students could not open any student page. It now only requires a session. Admin pages (T-011) must check the role themselves.
- `uppercase` was removed from Georgian eyebrow labels. CSS uppercase turns Georgian into Mtavruli capitals, which is a different look.
- `/diagnostic`, `/report`, `/course` and `/progress` are placeholder pages ("coming soon") until their tickets land.
- The dashboard shows the student's journey with step 1 active (`currentStepIndex={0}`). It will be driven by real data after T-012.
- **Dev-mode font bug (fixed):** with fixed weights, Google serves Noto Sans Georgian from `/l/font?kit=…&skey=…` URLs, which Turbopack dev cannot resolve ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'"). The production build was unaffected. It now loads as a variable font (no `weight` option).
- **Not checked visually in a browser yet.** Please look over the Georgian copy and the Noto Sans Georgian rendering.

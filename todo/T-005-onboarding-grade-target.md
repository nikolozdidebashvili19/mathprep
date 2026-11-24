# T-005 · Registration onboarding: grade + target score

**Epic:** Foundation · **Week:** 1 · **Status:** done (signed-in flow not yet tested by hand) · **Depends on:** T-003, T-004

## What was built
- `OnboardingSchema` in `auth/validations`: grade 11 or 12 (required), target score 1–100 (optional)
- `PATCH /api/profile` → `updateOnboardingService` → `userRepository.updateById`. Returns 401 without a session. Service tests are in `profile.service.spec.ts`
- `grade` is added to the JWT and the session (the `jwt` callback already reloads the user from the DB on every request, so the session updates immediately)
- `/onboarding` lives in its own `(onboarding)` route group: header plus a centered card, no sidebar. Signed out → `/sign-in`; grade already set → `/dashboard`
- The `(protected)` layout sends students without a grade to `/onboarding`. Admins skip it
- The form uses react-hook-form + zodResolver, with an 11/12 radio pair and an optional score field. All copy is in `ONBOARDING_COPY`

## Verification
- [x] typecheck, lint, 77 tests, build
- [x] Signed out: `/onboarding` → 307 to sign-in; `PATCH /api/profile` → 401
- [ ] **Manual test while signed in** (needs MongoDB from `.env`): register → redirected to `/onboarding` → save → `/dashboard`

## Open
- The maximum score differs between exam years, so it is capped at 100 for now. Tighten it once the exam index has `maxScore` (T-006/T-007)
- A profile settings page for changing grade or target later is not built yet

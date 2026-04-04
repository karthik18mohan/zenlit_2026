# Release Readiness (RC) — April 3, 2026

This document tracks what is complete in code versus what still needs human action before Google Play submission.

## 1) Compliance scope completion status

### Completed in code
- Account deletion is available:
  - In-app destructive flow with typed confirmation (`DELETE`).
  - Public web deletion page (`/delete-account`) with OTP + destructive confirmation.
- Public legal pages are implemented and routable:
  - `/privacy`
  - `/terms`
- Legal links are clickable in auth and onboarding consent UIs.
- Sign-up captures email/OTP only; legal acceptance is handled once in the persisted legal-consent gate after authentication.
- Existing users are routed through legal re-acceptance when legal version changes.
- Location permission rationale is shown before system permission prompt.
- Legal/support/account deletion URLs are configurable via Expo env + `app.config.ts` extras.
- Android target SDK 35 is enforced via `expo-build-properties` in `app.config.ts`.
- Android manifest permissions exclude background location (foreground-only flow).
- EAS production profile exists (`eas.json > build.production`).

### Deployed/public requirements (must be verified live)
- Public pages reachable on production host:
  - `https://zenlit.app/privacy`
  - `https://zenlit.app/terms`
  - `https://zenlit.app/delete-account`
- Supabase migration for `legal_acceptances` applied in production.
- Supabase Edge Function `delete-account` deployed and bound to production project.

## 2) Commands for quality checks and release build

Run from repo root:

```bash
# Install dependencies
npm ci

# TypeScript checks
npx tsc --noEmit

# Test suite
node --test tests/*.mjs

# Production-style web export smoke check
npm run build

# Android production AAB via EAS
eas build --platform android --profile production

# Optional: submit from CI/local once Play credentials are configured
eas submit --platform android --profile production
```

## 3) Manual tasks by release phase

### Must do before internal testing
- Confirm production env values in EAS project settings (Supabase URL/key, legal URLs, support email).
- Deploy latest Supabase migration set and verify schema health.
- Deploy `delete-account` function to production Supabase.
- Build a fresh `production` Android artifact and install on test devices.
- Manually verify end-to-end flows on device:
  - New sign-in route to legal consent gate before first app access.
  - Existing-user legal re-acceptance after bumping legal version in staging.
  - In-app delete account flow.
  - Web delete account flow (OTP + permanent delete).
  - Radar location rationale + deny/blocked/settings recovery states.
  - Notifications opt-in and message notification behavior.

### Must do before Play submission
- In Google Play Console:
  - Set Privacy Policy URL.
  - Enter account deletion URL in the policy section.
  - Complete Data Safety form using actual production behavior.
  - Complete IARC questionnaire based on live moderation posture.
  - Upload release assets (screenshots, feature graphic, icon, description copy).
  - Create and roll out release with production AAB.
- Confirm legal pages are public, stable, and match in-app copy.
- Confirm support contact email is monitored.

### Optional polish
- Add automated E2E/device tests for auth + legal + deletion flows.
- Add runtime analytics for legal acceptance completion and deletion funnel drop-offs.
- Add release smoke test script that validates legal URLs and deletion endpoint health.

## 4) Deployment notes (EAS + Supabase)

### EAS
- Production profile is configured in `eas.json`.
- Use managed credentials or verified service account setup for submit automation.
- Confirm `owner`/project binding matches intended Play app package.

### Supabase
- Apply SQL migrations in order, including legal acceptance table migration.
- Deploy/redeploy edge functions:
  - `delete-account`
  - `send-push-notification`
  - `update-conversation-anonymity`
- Verify RLS policies and function secrets in production project.

## 5) Current release-candidate verdict

**Status:** close to Play submission-ready in code, but **not fully Play-ready** until the manual console/deployment steps above are completed and verified against live infrastructure.

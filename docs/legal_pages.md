# Legal Pages (Privacy + Terms)

Zenlit now ships public legal routes using Expo Router:
- `/privacy`
- `/terms`
- `/delete-account`
- `/profile/legal` (in-app legal hub)

These pages are implemented as app routes so they are exported in the web build and can be reviewed by Play Store reviewers on public HTTPS URLs.

## Source files
- Privacy page route: `app/privacy.tsx`
- Terms page route: `app/terms.tsx`
- Account deletion route: `app/delete-account.tsx`
- Auth email capture (no legal proof state): `app/auth/index.tsx`
- Existing-user legal gate: `app/onboarding/legal-consent.tsx`
- Profile legal hub route: `app/profile/legal.tsx`
- Profile menu legal entry: `src/components/profile/ProfileMenuSheet.tsx`
- Shared legal constants (URLs, dates, versions, support email): `src/constants/legal.ts`
- Legal acceptance persistence service: `src/services/legalAcceptanceService.ts`
- Reusable legal page UI component: `src/components/legal/LegalDocumentScreen.tsx`

## Single source of truth for legal metadata
Legal URLs and support contact are centralized in `src/constants/legal.ts` and are sourced from Expo config (`app.config.ts` + `app.json`) with environment overrides.

Set these env vars before build:
- `EXPO_PUBLIC_WEB_BASE_URL` (example: `https://zenlit.app`)
- `EXPO_PUBLIC_PRIVACY_POLICY_URL` (defaults to `${EXPO_PUBLIC_WEB_BASE_URL}/privacy`)
- `EXPO_PUBLIC_TERMS_URL` (defaults to `${EXPO_PUBLIC_WEB_BASE_URL}/terms`)
- `EXPO_PUBLIC_ACCOUNT_DELETION_URL` (defaults to `${EXPO_PUBLIC_WEB_BASE_URL}/delete-account`)
- `EXPO_PUBLIC_SUPPORT_EMAIL` (example: `support@zenlit.app`)

Resolved in-app constants:
- `PRIVACY_POLICY_URL`
- `TERMS_URL`
- `ACCOUNT_DELETION_URL`
- `SUPPORT_EMAIL`

## Mandatory acceptance flow
1. Signup/auth collects only the user email and sends OTP; it does **not** capture legal proof state.
2. After authentication, route guards immediately check `legal_acceptances` for the current `TERMS_VERSION` and `PRIVACY_VERSION`.
3. If no current acceptance exists, users are routed to `/onboarding/legal-consent` and blocked from core app screens.
4. The legal-consent screen includes explicit wording, clickable Terms + Privacy links, and a required unchecked affirmation control.
5. Tapping **Accept and Continue** persists `user_id`, `terms_version`, `privacy_version`, and `accepted_at` in `public.legal_acceptances` via `saveCurrentUserLegalAcceptance`.
6. The legal-consent screen keeps **Log out** and **Delete account** actions available while gated.

## Acceptance storage
Acceptance is persisted in `public.legal_acceptances`.

Columns:
- `user_id` (UUID, PK, references `auth.users(id)`)
- `terms_version` (text)
- `privacy_version` (text)
- `accepted_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Migration file:
- `supabase/migrations/20260403110000_create_legal_acceptances_table.sql`

## Versioning model
- `LEGAL_VERSION` remains the base release tag.
- `TERMS_VERSION` and `PRIVACY_VERSION` are explicit constants (currently mapped to `LEGAL_VERSION`) and are written to acceptance records.
- When either document changes materially, bump its corresponding version constant and users will be re-gated automatically.

## Deploy steps (required)
1. Apply database migrations (Supabase CLI):
   - `supabase db push`
2. Build static web output:
   - `npm run build`
3. Deploy the generated `dist/` folder to HTTPS hosting (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.).
4. Ensure routes `/privacy`, `/terms`, and `/delete-account` are publicly reachable without login.
5. Set `EXPO_PUBLIC_WEB_BASE_URL` to that live origin in your app environment so mobile links open the correct public pages.

## Updating legal content
1. Update route files (`app/privacy.tsx`, `app/terms.tsx`).
2. If version/date changes, update constants in `src/constants/legal.ts`.
3. Rebuild and redeploy web output.

## Markdown mirrors
- `privacy_policy.md`
- `terms_of_service.md`

These are repository mirrors only. The reviewable public pages are the web routes above.

## Play submission / release readiness config
Set these values before creating a Play production submission:

1. **Package/application id**
   - Android package: `com.arjungowdal4601.zenlit` (from `app.config.ts`)
2. **Version/build flow**
   - App version: `expo.version` in `app.json`
   - Android build number: EAS `build.production.autoIncrement: true` in `eas.json`
3. **Legal URLs (required for listing + in-app links)**
   - `EXPO_PUBLIC_PRIVACY_POLICY_URL=https://zenlit.app/privacy`
   - `EXPO_PUBLIC_TERMS_URL=https://zenlit.app/terms`
   - `EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://zenlit.app/delete-account`
   - `EXPO_PUBLIC_SUPPORT_EMAIL=support@zenlit.app`
4. **Location permissions policy**
   - Foreground only via `expo-location` plugin (`locationWhenInUsePermission`); do not add background location permissions.
5. **Android target SDK**
   - Keep `compileSdkVersion` and `targetSdkVersion` at `35` via `expo-build-properties`.

Quick pre-submit checks:
- `npx expo config --type public`
- `npx tsc --noEmit`

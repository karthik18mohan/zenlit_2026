# Play Store Readiness Re-Audit — April 3, 2026

Scope: strict re-audit of code and docs for the previously flagged compliance items.

## Verdict summary

- Blocker issues remaining: **0**
- High-severity issues remaining: **0**
- Medium-severity issues remaining: **1**

The codebase is close, but not fully production-grade for submission without tightening the medium issues below.

## Requirement-by-requirement audit

| Requirement | Status | Severity if not complete | Evidence in repo | Remaining action |
|---|---|---|---|---|
| In-app account deletion | PASS | — | Profile menu opens delete flow and calls `deleteCurrentAccount`; destructive confirmation requires typing `DELETE`. Backend function invocation is wired. | None in code. |
| Automated backend data deletion | PASS | — | `supabase/functions/delete-account/index.ts` verifies JWT, removes storage paths, deletes feedback rows, deletes profile row, then deletes auth user. | Ensure function deployed in prod and secrets set. |
| Public web account deletion URL | PASS | — | Public `/delete-account` route exists with email OTP verification + destructive `DELETE` phrase, then invokes backend deletion. Root layout allows unauthenticated access to this route. | Verify production host serves route publicly over HTTPS. |
| Public privacy policy URL | PASS | — | `app/privacy.tsx` route exists and config defaults/public URL constants point to `/privacy`. | Verify live URL content matches latest legal text. |
| Public terms URL | PASS | — | `app/terms.tsx` route exists and config defaults/public URL constants point to `/terms`. | Verify live URL content matches latest legal text. |
| Clickable legal links in app | PARTIAL | MEDIUM | Auth and legal-consent screens include clickable links to both Terms and Privacy. However Profile menu item labeled “Privacy & Terms” opens only privacy URL, not both. | Split profile menu action into explicit Terms + Privacy entries, or open an in-app legal hub exposing both links directly. |
| Signup/onboarding legal acceptance | PASS | — | Signup no longer records non-auditable acceptance state. A single mandatory legal-consent gate persists acceptance to `legal_acceptances` with `user_id`, terms/privacy versions, and timestamp before app access. | None in code. |
| Existing-user acceptance handling | PASS | — | `determinePostAuthRoute` checks latest legal acceptance; `_layout` redirects authenticated users without current acceptance to `/onboarding/legal-consent` and blocks app navigation. | None in code. |
| Location permission rationale before OS prompt | PASS | — | Visibility sheet shows rationale modal first, then calls permission request only on “Continue”. | Keep copy aligned with Play Data Safety/location disclosures. |
| `privacyPolicyUrl` / config wiring | PASS | — | Env + `app.config.ts` + `app.json` + `src/constants/legal.ts` are wired with fallbacks for privacy/terms/account-deletion URLs. | Validate production EAS env values before release build. |
| Play submission docs | PASS | — | `docs/playstore-submission.md` and `docs/release-readiness.md` include Play checklist, data-safety mapping, and manual console tasks. | Keep docs synced with live infrastructure and final Console answers. |

## Strict readiness call

- **Code-complete for Play compliance:** **No** (due to one medium issue above).
- **Deploy-ready:** **Conditionally yes** for build/deploy mechanics, **no** for strict compliance closure until medium issues are resolved.
- **Waiting only on external console/manual actions:** **No** (there are still in-repo medium compliance quality gaps to fix first).

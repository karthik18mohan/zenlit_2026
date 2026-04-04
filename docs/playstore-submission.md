# Play Store Submission Package (Code-Based)

This checklist is derived from the current Zenlit codebase and existing legal docs, and is intended for direct use in Google Play Console.

## 1) App overview (for listing/compliance context)

Zenlit is a nearby social app with:
- passwordless email OTP account access,
- user profiles,
- nearby discovery using **foreground** location,
- public feed posts,
- direct messaging,
- optional push notifications,
- in-app and web-based account deletion.

Code evidence:
- Location permission is foreground-only (`requestForegroundPermissionsAsync`) and periodic foreground updates (`watchPositionAsync`).
- Messaging, posts, profiles, locations, social links, and feedback tables are actively used.
- Push token registration via Expo Notifications and persistence in `profiles.expo_push_token`.

## 2) Required public URLs and contact

Use these exact values (from app config/constants):

- **Privacy Policy URL:** `https://zenlit.app/privacy`
- **Terms URL:** `https://zenlit.app/terms`
- **Account deletion URL (public):** `https://zenlit.app/delete-account`
- **Support email/contact:** `support@zenlit.app`

Notes:
- Legal URLs are centralized and exposed in app constants/config.
- Public web routes exist for `/privacy`, `/terms`, and `/delete-account`.

## 3) Data Safety mapping (based on implemented behavior)

Legend:
- **Collected** = handled/stored by app backend or third-party processors used by app.
- **Shared** = sent to third parties beyond core processors needed to operate the app.
  - In this codebase, data is processed by Supabase and Expo Notifications as infrastructure.
  - No ad SDK or analytics SDK identified.

| Data type | Collected | Shared | Required for app functionality | User can request deletion | Where in code |
|---|---|---|---|---|---|
| Email / account info (email, auth identity) | Yes | No evidence of non-operational sharing | Required for sign-in/account | Yes (in-app + web delete flow) | `profiles.email`, auth + deletion flow (`app/delete-account.tsx`, `src/services/accountDeletionService.ts`, `supabase/functions/delete-account/index.ts`) |
| Profile information (display name, username, DOB, gender, bio, social links) | Yes | No evidence of non-operational sharing | Required for profile/social features | Yes | `profiles` + `social_links` schema/usage (`supabase/types.ts`, `src/services/profileService.ts`) |
| Precise location (lat/long full + rounded) | Yes (when visibility enabled) | No evidence of non-operational sharing | Required for nearby/radar features only (not hard-required for basic sign-in) | Yes (location nulled when hidden/denied; account deletion removes) | `src/services/locationService.ts`, `src/contexts/VisibilityContext.tsx`, `src/services/locationDbService.ts` |
| Messages / chat content (text, metadata) | Yes | No evidence of non-operational sharing | Required for messaging feature | Yes (account deletion path) | `messages` usage in `src/services/messagingService.ts`; schema in `supabase/types.ts` |
| User-generated content: posts | Yes | No evidence of non-operational sharing | Required for posting/feed features | Yes | `src/services/postService.ts`, `posts` in `supabase/types.ts` |
| Uploaded media (profile/post/feedback images) | Yes | Publicly readable by bucket policy for profile/post assets | Required only if user chooses image features | Yes | Image picker/upload (`src/components/ImageUploadDialog.tsx`, `app/create.tsx`, `src/components/feedback/FeedbackForm.tsx`), storage policies (`supabase/migrations/20251012120834_create_storage_buckets.sql`) |
| Device identifiers / push token (Expo push token) | Yes (if notifications enabled) | Shared with Expo Notifications for delivery routing | Optional (notifications feature) | Yes (token can be removed + deleted with account) | `src/hooks/useNotifications.ts`; privacy text in `app/privacy.tsx` |
| Feedback submissions (text + optional image) | Yes | No evidence of non-operational sharing | Optional | Yes (account deletion cleanup includes feedback) | `app/feedback.tsx`, `src/components/feedback/FeedbackForm.tsx`, `feedback` table in `supabase/types.ts` |
| Analytics / crash data | **Not found in current repo** | N/A | N/A | N/A | No analytics/crash SDKs found in dependencies/usages (`package.json`, code search) |

### Important nuance for Play Data Safety answers
- If Play asks whether data is “shared,” you should treat core processors (backend/notification infrastructure) according to Play’s latest definitions and your legal position. This repo shows operational processing via Supabase and Expo Notifications, but no ad/marketing SDK usage.

## 4) Suggested Play Console answers

Use these as draft answers and verify wording in Console before submitting:

- App collects account info (email) for authentication/account management: **Yes**.
- App collects profile info (display name, username, DOB, gender, bio/social links): **Yes**.
- App collects precise location: **Yes**, foreground usage tied to Radar/nearby features.
- App collects messages: **Yes** (direct messages).
- App collects photos/media: **Yes**, when user uploads profile/post/feedback images.
- App collects device/app identifiers for notifications (Expo push token): **Yes**, optional notifications.
- App collects analytics/crash diagnostics: **No evidence in current codebase**.
- Data deletion request available: **Yes**, in-app deletion and public web deletion URL.

If Play asks “is collection required,” answer by feature:
- Core account/auth data: required.
- Location: required for nearby/radar behavior, not for all app browsing.
- Push token: optional.
- Feedback: optional.

## 5) IARC preparation checklist (reviewer-facing)

Use this while completing the IARC questionnaire:

- [ ] **User interaction present?** Yes (users can discover profiles, post, and direct message).
- [ ] **User-generated content present?** Yes (profiles, posts, messages, optional feedback).
- [ ] **Unmoderated or potentially user-shared communications?** Direct messaging exists.
- [ ] **Location-related features?** Yes, foreground proximity/radar and nearby matching.
- [ ] **Any gambling, sexual content, graphic violence, controlled substances, or paid loot mechanics?** Not evidenced in this repo; answer based on your production content policy.
- [ ] **Block/report/moderation controls disclosed in listing/policy?** Verify current moderation tooling before final IARC submission.

## 6) External manual steps (cannot be completed in code)

- [ ] Sign in to Google Play Console for the target app.
- [ ] Enter/store listing legal URLs (Privacy Policy URL; if applicable add Terms URL in listing text).
- [ ] Complete **Data Safety** questionnaire using the mapping above.
- [ ] Complete **IARC** questionnaire using the checklist above.
- [ ] Enter/verify **Account deletion URL** in the designated Console policy section.
- [ ] Upload required store assets (screenshots, icon, feature graphic, etc.).
- [ ] Confirm target audience/content declarations and any policy forms.

## 7) Reviewer-facing compliance summary

Zenlit compliance summary for reviewers:
- Users can permanently delete their account **in-app** (Profile → menu → Delete account).
- Users can also delete account on web at **`https://zenlit.app/delete-account`**.
- Privacy policy and terms are publicly accessible at **`https://zenlit.app/privacy`** and **`https://zenlit.app/terms`**.
- Location access is **foreground only** and used for nearby/radar functionality.

## 8) Code-to-console mismatch checks identified

1. **Data Safety precision needed for “Shared” answers:** code clearly uses Supabase and Expo Notifications processors, but Console wording can classify processor handling differently by context. Final selection must follow Play’s latest definitions.
2. **Storage visibility nuance:** storage bucket policies make profile/post images publicly readable in current migration policy; ensure this aligns with your listing/privacy text and Data Safety disclosures.
3. **IARC depends on live moderation posture:** repository confirms UGC + messaging + location features, but final IARC answers should reflect your live moderation/enforcement setup.


# Account deletion architecture (Play Store compliance)

## What this implements

Zenlit now supports **in-app account deletion** and a **public web deletion flow** at `/delete-account`.

- In-app entry point: `Profile → Menu → Delete Account`
- Public web deletion URL: `https://<your-web-domain>/delete-account`
- Backend executor: Supabase Edge Function `delete-account`

## Deletion flow

1. User triggers delete from app or web.
2. User must pass a destructive confirmation flow (`DELETE` typed in final step).
3. Client invokes Supabase Edge Function `delete-account` with authenticated JWT.
4. Function verifies JWT and resolves caller identity.
5. Function deletes user-linked storage objects and relational data.
6. Function deletes `auth.users` account via service role.
7. Client clears local session/storage and signs out.

## Data deleted

The backend deletion path removes user-linked data from:

- `profiles` (source-of-truth user profile)
- dependent cascades from profile FK links:
  - `social_links`
  - `posts`
  - `locations`
  - `messages`
  - `conversations`
  - `push_notifications`
  - `user_app_updates`
- `feedback` rows (`feedback.user_id`)
- storage files in user namespace (`{user_id}/...`) in:
  - `profile-images`
  - `post-images`
  - `feedback-images`
- auth identity row in `auth.users`

## Retention

No intentional data retention is implemented for deleted users.

## Required deployment

Deploy new edge function:

```bash
supabase functions deploy delete-account
```

Ensure edge-function secrets exist:

```bash
supabase secrets set SUPABASE_URL="..." SUPABASE_ANON_KEY="..." SUPABASE_SERVICE_ROLE_KEY="..."
```

## Privacy/legal wording update

Any privacy policy language that says **"email support to request deletion"** should be replaced with wording that:

- states deletion is available in-app and via `/delete-account`
- states deletion is automated after identity verification

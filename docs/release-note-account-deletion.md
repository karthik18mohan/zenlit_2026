# Release note: Account deletion compliance

## Summary

This release adds:

- in-app two-step destructive account deletion flow
- secure Supabase server-side deletion endpoint
- public web deletion page `/delete-account` for uninstalled users
- local data/session cleanup after deletion

## External actions still required

1. Deploy `delete-account` edge function.
2. Update Play Console Account Deletion URL to:
   - `https://<your-domain>/delete-account`
3. Update hosted privacy policy text to reflect automated deletion flow.

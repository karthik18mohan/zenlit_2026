# Supabase migrations in this repo

Why they matter
- Migrations are the step-by-step recipe to build the database from scratch. Supabase CLI applies them in order when you run `supabase db reset`, create a branch, or deploy to a new environment.
- They prevent schema drift: the applied migration list in the database is compared with the files here. Deleting or editing historical migrations will make new environments fail to build.
- They are the audit trail for schema/RLS/trigger changes.

Current state (kept as-is)
- History: 20251012110324_create_initial_schema.sql … 20251129152000_remove_push_logs_and_app_updates.sql.
- Schema today (public): profiles, social_links, posts, feedback, locations, messages (+ messaging-only push trigger calling the Edge Function). Push logs and app update tables have been removed.
- Latest messaging-only push migration is already applied via Supabase MCP.

If you want to prune/clean safely
1) Create a baseline: use `supabase db dump --schema-only` (or MCP equivalent) from a clean, up-to-date database.
2) Add a new migration (e.g., `20251201_baseline.sql`) that recreates the current schema and policies exactly.
3) Move old migrations to an `archive/` folder (keep in git history) so new environments apply only the baseline and newer migrations.
4) Verify: run `supabase db reset` locally or on a dev branch to ensure the baseline builds the DB end-to-end.

Avoid
- Deleting or editing existing migrations without a baseline; it will break new environments/branches.
- Relying on “one-time” SQL outside migrations; keep schema changes versioned here for reproducibility.

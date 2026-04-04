/*
  # Report & Block: user safety and content moderation

  Creates tables for:
  - User/content reports (with reason categorisation)
  - User blocking (hides blocked users from radar, feed, and messages)

  Required for Play Store approval of any UGC + messaging app.
*/

-- ============================================================================
-- 1. Reports table
-- ============================================================================

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('profile', 'post', 'message')),
  content_id uuid,
  reason text NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate_content', 'impersonation', 'threats', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = reporter_id);

CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX idx_reports_status ON public.reports(status) WHERE status = 'pending';

-- ============================================================================
-- 2. Blocked users table
-- ============================================================================

CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks"
  ON public.blocked_users FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = blocker_id)
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- ============================================================================
-- 3. RPC to get blocked user IDs (avoids exposing the table directly in queries)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_blocked_user_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN ARRAY(
    SELECT blocked_id
    FROM public.blocked_users
    WHERE blocker_id = (SELECT auth.uid())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_blocked_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blocked_user_ids() TO authenticated;

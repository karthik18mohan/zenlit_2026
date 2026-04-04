/*
  # Release hardening: public access, username RPCs, and notification safety

  This migration aligns the database with the current production client:
  - removes unnecessary anonymous reads from core app tables
  - provides explicit username/email availability RPCs
  - makes feedback attachments private
  - prevents push notifications from silently targeting a stale Supabase project

  Required settings after deploy:
  - app.settings.supabase_url
  - app.settings.function_secret
*/

-- ============================================================================
-- 1. Tighten read policies to authenticated app users only
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can check username availability" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view social links" ON public.social_links;
DROP POLICY IF EXISTS "Authenticated users can view all social links" ON public.social_links;

CREATE POLICY "Authenticated users can view all social links"
  ON public.social_links
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;

CREATE POLICY "Authenticated users can view posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 2. Dedicated RPCs for username/email availability
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_username text := lower(trim(coalesce(username_to_check, '')));
BEGIN
  IF normalized_username = '' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(user_name) = normalized_username
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_email_available(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email text := lower(trim(coalesce(email_to_check, '')));
BEGIN
  IF normalized_email = '' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = normalized_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_username_suggestions(
  base_username text,
  max_suggestions integer DEFAULT 5
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_base text := lower(regexp_replace(coalesce(base_username, ''), '[^a-z0-9._-]+', '', 'g'));
  candidate text;
  candidates text[];
  suggestions text[] := ARRAY[]::text[];
  target_count integer := greatest(1, least(coalesce(max_suggestions, 5), 10));
BEGIN
  IF normalized_base = '' THEN
    normalized_base := 'zenlit';
  END IF;

  normalized_base := left(normalized_base, 20);

  candidates := ARRAY[
    left(normalized_base || (floor(random() * 900) + 100)::int::text, 30),
    left(normalized_base || '_' || (floor(random() * 90) + 10)::int::text, 30),
    left(normalized_base || '.' || extract(year FROM now())::int::text, 30),
    left(normalized_base || '_zen', 30),
    left(normalized_base || '_app', 30),
    left(normalized_base || (floor(random() * 9000) + 1000)::int::text, 30)
  ];

  FOREACH candidate IN ARRAY candidates LOOP
    IF candidate <> ''
       AND NOT candidate = ANY (suggestions)
       AND NOT EXISTS (
         SELECT 1
         FROM public.profiles
         WHERE lower(user_name) = candidate
       ) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;

    EXIT WHEN coalesce(array_length(suggestions, 1), 0) >= target_count;
  END LOOP;

  RETURN suggestions;
END;
$$;

REVOKE ALL ON FUNCTION public.check_username_available(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_email_available(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_username_suggestions(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_username_suggestions(text, integer) TO anon, authenticated;

-- ============================================================================
-- 3. Make feedback attachments private
-- ============================================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'feedback-images';

DROP POLICY IF EXISTS "Feedback images are publicly accessible" ON storage.objects;

-- ============================================================================
-- 4. Harden message notification trigger settings
-- ============================================================================

DROP TRIGGER IF EXISTS on_message_insert_notify ON public.messages;

CREATE OR REPLACE FUNCTION public.send_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  receiver_profile RECORD;
  sender_profile RECORD;
  notification_body text;
  supabase_url text := nullif(current_setting('app.settings.supabase_url', true), '');
  function_secret text := nullif(current_setting('app.settings.function_secret', true), '');
  notification_preferences jsonb := '{}'::jsonb;
BEGIN
  IF supabase_url IS NULL OR function_secret IS NULL THEN
    RAISE WARNING 'Push notification skipped: missing app.settings.supabase_url or app.settings.function_secret';
    RETURN NEW;
  END IF;

  SELECT
    id,
    expo_push_token,
    notification_enabled,
    notification_preferences,
    display_name
  INTO receiver_profile
  FROM public.profiles
  WHERE id = NEW.receiver_id;

  IF NOT FOUND
     OR receiver_profile.notification_enabled = false
     OR receiver_profile.expo_push_token IS NULL THEN
    RETURN NEW;
  END IF;

  notification_preferences := coalesce(
    receiver_profile.notification_preferences,
    jsonb_build_object('messages', true, 'muted_conversations', '[]'::jsonb)
  );

  IF coalesce((notification_preferences->>'messages')::boolean, true) = false THEN
    RETURN NEW;
  END IF;

  IF coalesce(notification_preferences->'muted_conversations', '[]'::jsonb) @> to_jsonb(NEW.sender_id::text) THEN
    RETURN NEW;
  END IF;

  SELECT display_name
  INTO sender_profile
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF coalesce(length(NEW.text), 0) > 100 THEN
    notification_body := substring(NEW.text, 1, 97) || '...';
  ELSE
    notification_body := coalesce(NEW.text, 'New message');
  END IF;

  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || function_secret
    ),
    body := jsonb_build_object(
      'userId', NEW.receiver_id,
      'type', 'message',
      'title', coalesce(sender_profile.display_name, 'Someone') || ' sent you a message',
      'body', notification_body,
      'data', jsonb_build_object(
        'senderId', NEW.sender_id,
        'messageId', NEW.id,
        'receiverId', NEW.receiver_id
      ),
      'priority', 'high'
    )::text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_notification();

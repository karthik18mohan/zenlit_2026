/*
  # Messaging-only push notifications

  - Restrict push notification types to messages
  - Simplify notification preferences to messaging flags only
  - Refresh the message trigger to call the Edge Function with a configurable auth token
*/

-- Simplify notification preferences to messaging only
ALTER TABLE profiles
  ALTER COLUMN notification_preferences SET DEFAULT jsonb_build_object(
    'messages', true,
    'muted_conversations', '[]'::jsonb
  );

UPDATE profiles
SET notification_preferences = jsonb_build_object(
  'messages', COALESCE((notification_preferences->>'messages')::boolean, true),
  'muted_conversations', COALESCE(notification_preferences->'muted_conversations', '[]'::jsonb)
);

-- Restrict notification log to message-only
UPDATE push_notifications
SET notification_type = 'message'
WHERE notification_type <> 'message';

ALTER TABLE push_notifications
  DROP CONSTRAINT IF EXISTS push_notifications_notification_type_check;

ALTER TABLE push_notifications
  ADD CONSTRAINT push_notifications_notification_type_check CHECK (notification_type = 'message');

-- Refresh messaging trigger with configurable auth token
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
DROP FUNCTION IF EXISTS send_message_notification();

CREATE OR REPLACE FUNCTION send_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  receiver_profile RECORD;
  sender_profile RECORD;
  notification_body TEXT;
  supabase_url TEXT := COALESCE(current_setting('app.settings.supabase_url', true), 'https://yxucgloawhbpjuweoipt.supabase.co');
  anon_key TEXT := COALESCE(current_setting('app.settings.anon_key', true), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dWNnbG9hd2hicGp1d2VvaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjQ5ODAsImV4cCI6MjA3NTg0MDk4MH0.PWHoyMRS4xRuulf6avUROUC5ngJ5xxBWl4vDmp17_f4');
  function_secret TEXT := NULLIF(current_setting('app.settings.function_secret', true), '');
  auth_token TEXT := COALESCE(function_secret, anon_key);
BEGIN
  SELECT 
    id,
    expo_push_token,
    notification_enabled,
    notification_preferences,
    display_name
  INTO receiver_profile
  FROM profiles
  WHERE id = NEW.receiver_id;

  IF NOT FOUND 
     OR receiver_profile.notification_enabled = false 
     OR receiver_profile.expo_push_token IS NULL THEN
    RETURN NEW;
  END IF;

  IF (receiver_profile.notification_preferences->>'messages')::boolean = false THEN
    RETURN NEW;
  END IF;

  IF receiver_profile.notification_preferences->'muted_conversations' @> to_jsonb(NEW.sender_id::text) THEN
    RETURN NEW;
  END IF;

  SELECT display_name
  INTO sender_profile
  FROM profiles
  WHERE id = NEW.sender_id;

  IF COALESCE(LENGTH(NEW.text), 0) > 100 THEN
    notification_body := SUBSTRING(NEW.text, 1, 97) || '...';
  ELSE
    notification_body := COALESCE(NEW.text, 'New message');
  END IF;

  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || auth_token
    ),
    body := jsonb_build_object(
      'userId', NEW.receiver_id,
      'type', 'message',
      'title', COALESCE(sender_profile.display_name, 'Someone') || ' sent you a message',
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_message_notification();

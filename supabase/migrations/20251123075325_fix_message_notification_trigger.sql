/*
  # Fix Message Notification Trigger

  1. Problem Identified
    - The trigger function was trying to get env vars using `current_setting()`
    - This doesn't work in Supabase's hosted environment
    - The trigger needs to use the anon key instead of service role for edge function calls

  2. Solution
    - Update the trigger to use Supabase's built-in environment
    - Use the anon key (which the edge function accepts)
    - Simplify the URL construction
    - Make the HTTP call more robust

  3. Changes
    - Remove the current_setting calls
    - Use hardcoded Supabase URL from the project
    - Use the anon key for authentication
    - Add better error handling
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
DROP FUNCTION IF EXISTS send_message_notification();

-- Create improved function to send message notifications
CREATE OR REPLACE FUNCTION send_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  receiver_profile RECORD;
  sender_profile RECORD;
  notification_body TEXT;
  supabase_url TEXT := 'https://yxucgloawhbpjuweoipt.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dWNnbG9hd2hicGp1d2VvaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjQ5ODAsImV4cCI6MjA3NTg0MDk4MH0.PWHoyMRS4xRuulf6avUROUC5ngJ5xxBWl4vDmp17_f4';
BEGIN
  -- Get receiver's profile and notification settings
  SELECT 
    id, 
    expo_push_token, 
    notification_enabled, 
    notification_preferences,
    display_name
  INTO receiver_profile
  FROM profiles
  WHERE id = NEW.receiver_id;

  -- Exit early if receiver doesn't have notifications enabled or no push token
  IF NOT FOUND 
     OR receiver_profile.notification_enabled = false 
     OR receiver_profile.expo_push_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if messages are enabled in preferences
  IF (receiver_profile.notification_preferences->>'messages')::boolean = false THEN
    RETURN NEW;
  END IF;

  -- Check if conversation is muted
  IF receiver_profile.notification_preferences->'muted_conversations' @> to_jsonb(NEW.sender_id::text) THEN
    RETURN NEW;
  END IF;

  -- Get sender's profile info
  SELECT display_name, user_name
  INTO sender_profile
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification body
  IF LENGTH(NEW.text) > 100 THEN
    notification_body := SUBSTRING(NEW.text, 1, 97) || '...';
  ELSE
    notification_body := NEW.text;
  END IF;

  -- Call Edge Function to send notification
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', NEW.receiver_id,
      'type', 'message',
      'title', COALESCE(sender_profile.display_name, 'Someone') || ' sent you a message',
      'body', notification_body,
      'data', jsonb_build_object(
        'senderId', NEW.sender_id,
        'messageId', NEW.id,
        'conversationId', COALESCE(NEW.topic, '')
      ),
      'priority', 'high'
    )::text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on messages table
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_message_notification();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;
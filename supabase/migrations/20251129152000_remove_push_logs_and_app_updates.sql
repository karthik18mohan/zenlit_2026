/*
  # Remove push logs and app update tables

  - Drop push_notifications log table (push now messaging-only and unlogged)
  - Drop app_versions and user_app_updates (no app-update push flow)
*/

DROP TABLE IF EXISTS push_notifications CASCADE;
DROP TABLE IF EXISTS user_app_updates CASCADE;
DROP TABLE IF EXISTS app_versions CASCADE;

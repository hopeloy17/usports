-- At-risk push notifications (FR-23).
--
-- 1. A new notification type for the "your game may be cancelled" warning. The
--    notifications table doubles as the record of who has already been warned,
--    so each player is pinged at most once per event.
-- 2. A table of Expo push tokens, one row per device. The token is the key so a
--    device that signs in as someone else is moved to the new user instead of
--    pinging both.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_at_risk';

CREATE TABLE IF NOT EXISTS push_tokens (
  token      text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

-- Supports the "already warned?" lookup the notifier runs every minute
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications (event_id, type);

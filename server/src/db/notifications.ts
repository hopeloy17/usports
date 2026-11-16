import { supabase } from "./client";

export type NotificationType =
  | "event_joined"
  | "event_left"
  | "event_full"
  | "event_cancelled"
  | "event_updated"
  | "event_reminder"
  | "event_at_risk";

// An open event starting soon, with everyone who has ever joined it
export type UpcomingEventRow = {
  id: string;
  title: string;
  start_time: string;
  min_players: number;
  participants: { user_id: string; status: "going" | "cancelled" }[];
};

export type NewNotificationRow = {
  user_id: string;
  event_id: string;
  type: NotificationType;
  message: string;
};

export type PushTokenRow = {
  user_id: string;
  token: string;
};

/**
 * Lists open events whose start time is after `from` and at or before `until`.
 * Full and cancelled events are left out: a full event already has enough players.
 */
export async function getOpenEventsStartingBetween(
  from: Date,
  until: Date,
): Promise<UpcomingEventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_time, min_players, participants:event_participants(user_id, status)")
    .eq("status", "open")
    .gt("start_time", from.toISOString())
    .lte("start_time", until.toISOString());

  if (error) {
    throw new Error(`getOpenEventsStartingBetween error: ${error.message}`);
  }

  return (data ?? []) as UpcomingEventRow[];
}

/**
 * Returns "eventId:userId" keys for every notification of `type` already sent
 * about any of the given events.
 */
export async function getNotifiedRecipients(
  eventIds: string[],
  type: NotificationType,
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("event_id, user_id")
    .eq("type", type)
    .in("event_id", eventIds);

  if (error) {
    throw new Error(`getNotifiedRecipients error: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => `${row.event_id}:${row.user_id}`));
}

export async function insertNotifications(rows: NewNotificationRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("notifications").insert(rows);

  if (error) {
    throw new Error(`insertNotifications error: ${error.message}`);
  }
}

export async function getPushTokensForUsers(userIds: string[]): Promise<PushTokenRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);

  if (error) {
    throw new Error(`getPushTokensForUsers error: ${error.message}`);
  }

  return data ?? [];
}

// Saves a device's token for a user, moving it over if another user had it
export async function upsertPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { token, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );

  if (error) {
    throw new Error(`upsertPushToken error: ${error.message}`);
  }
}

// Removes tokens Expo reports as no longer registered (app uninstalled, etc.)
export async function deletePushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const { error } = await supabase.from("push_tokens").delete().in("token", tokens);

  if (error) {
    throw new Error(`deletePushTokens error: ${error.message}`);
  }
}

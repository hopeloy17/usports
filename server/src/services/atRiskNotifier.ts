import {
  getNotifiedRecipients,
  getOpenEventsStartingBetween,
  getPushTokensForUsers,
  insertNotifications,
  NewNotificationRow,
  UpcomingEventRow,
} from "../db/notifications";
import { PushMessage, sendPushNotifications } from "./pushService";

// FR-23: warn joined players when the minimum isn't met about an hour before start
export const DEFAULT_WARNING_WINDOW_MINUTES = 60;
export const DEFAULT_CHECK_INTERVAL_MS = 60_000;

const MS_PER_MINUTE = 60_000;

export type AtRiskWarning = {
  eventId: string;
  userId: string;
  title: string;
  message: string;
};

export type AtRiskCheckResult = {
  warningsCreated: number;
  pushesAccepted: number;
};

function getGoingUserIds(event: UpcomingEventRow): string[] {
  return event.participants
    .filter((participant) => participant.status === "going")
    .map((participant) => participant.user_id);
}

export function buildAtRiskMessage(event: UpcomingEventRow, goingCount: number, now: Date): string {
  const playersNeeded = event.min_players - goingCount;
  const minutesUntilStart = Math.max(
    1,
    Math.round((new Date(event.start_time).getTime() - now.getTime()) / MS_PER_MINUTE),
  );
  const playerWord = playersNeeded === 1 ? "player" : "players";

  return `${event.title} starts in ${minutesUntilStart} min and still needs ${playersNeeded} more ${playerWord}. Invite a friend or it may be cancelled.`;
}

/**
 * Picks out the players who should be warned: everyone going to an event that
 * is below its minimum, minus anyone already warned about that event.
 */
export function findAtRiskWarnings(
  events: UpcomingEventRow[],
  alreadyNotified: Set<string>,
  now: Date,
): AtRiskWarning[] {
  return events.flatMap((event) => {
    const goingUserIds = getGoingUserIds(event);

    if (goingUserIds.length >= event.min_players) {
      return [];
    }

    const message = buildAtRiskMessage(event, goingUserIds.length, now);

    return goingUserIds
      .filter((userId) => !alreadyNotified.has(`${event.id}:${userId}`))
      .map((userId) => ({ eventId: event.id, userId, title: event.title, message }));
  });
}

async function buildPushMessages(warnings: AtRiskWarning[]): Promise<PushMessage[]> {
  const userIds = [...new Set(warnings.map((warning) => warning.userId))];
  const tokens = await getPushTokensForUsers(userIds);

  return warnings.flatMap((warning) =>
    tokens
      .filter((token) => token.user_id === warning.userId)
      .map((token) => ({
        to: token.token,
        title: "Your game may be cancelled",
        body: warning.message,
        data: { type: "event_at_risk", eventId: warning.eventId },
      })),
  );
}

/**
 * Finds games starting within the warning window that are short of players,
 * records an in-app notification for each joined player, and pings their phones.
 *
 * The notification rows are saved before pushing so a crash mid-send can never
 * cause the same player to be pinged twice.
 */
export async function checkAtRiskEvents(
  now: Date = new Date(),
  windowMinutes: number = DEFAULT_WARNING_WINDOW_MINUTES,
): Promise<AtRiskCheckResult> {
  const windowEnd = new Date(now.getTime() + windowMinutes * MS_PER_MINUTE);
  const events = await getOpenEventsStartingBetween(now, windowEnd);
  const alreadyNotified = await getNotifiedRecipients(
    events.map((event) => event.id),
    "event_at_risk",
  );
  const warnings = findAtRiskWarnings(events, alreadyNotified, now);

  if (warnings.length === 0) {
    return { warningsCreated: 0, pushesAccepted: 0 };
  }

  const rows: NewNotificationRow[] = warnings.map((warning) => ({
    user_id: warning.userId,
    event_id: warning.eventId,
    type: "event_at_risk",
    message: warning.message,
  }));
  await insertNotifications(rows);

  const messages = await buildPushMessages(warnings);
  const pushesAccepted = messages.length > 0 ? await sendPushNotifications(messages) : 0;

  return { warningsCreated: warnings.length, pushesAccepted };
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Runs the at-risk check on a timer. Returns a function that stops it.
 * AT_RISK_WARNING_MINUTES and AT_RISK_CHECK_INTERVAL_MS override the defaults.
 */
export function startAtRiskNotifier(): () => void {
  const windowMinutes = readPositiveNumber(
    process.env.AT_RISK_WARNING_MINUTES,
    DEFAULT_WARNING_WINDOW_MINUTES,
  );
  const intervalMs = readPositiveNumber(
    process.env.AT_RISK_CHECK_INTERVAL_MS,
    DEFAULT_CHECK_INTERVAL_MS,
  );
  let isRunning = false;

  const runCheck = async () => {
    // Skip a tick rather than overlap with a slow previous run
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const result = await checkAtRiskEvents(new Date(), windowMinutes);
      if (result.warningsCreated > 0) {
        console.log(
          `[at-risk] warned ${result.warningsCreated} player(s), ${result.pushesAccepted} push(es) accepted`,
        );
      }
    } catch (error) {
      console.error("[at-risk] check failed", error);
    } finally {
      isRunning = false;
    }
  };

  void runCheck();
  const timer = setInterval(runCheck, intervalMs);
  return () => clearInterval(timer);
}

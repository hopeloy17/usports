import { deletePushTokens } from "../db/notifications";

// Expo's push service relays to Apple (APNs) and Google (FCM) for us
export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo accepts at most 100 messages per request
const MAX_MESSAGES_PER_REQUEST = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type PushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function sendChunk(messages: PushMessage[]): Promise<PushTicket[]> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages.map((message) => ({ sound: "default", ...message }))),
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { data?: PushTicket[] };
  return body.data ?? [];
}

// Tickets come back in the same order as the messages that were sent
function findUnregisteredTokens(messages: PushMessage[], tickets: PushTicket[]): string[] {
  return tickets.flatMap((ticket, index) =>
    ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
      ? [messages[index].to]
      : [],
  );
}

/**
 * Sends push notifications through Expo and forgets tokens for devices that
 * have uninstalled the app. Returns how many messages Expo accepted.
 */
export async function sendPushNotifications(messages: PushMessage[]): Promise<number> {
  let acceptedCount = 0;
  const unregisteredTokens: string[] = [];

  for (const messageChunk of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    const tickets = await sendChunk(messageChunk);
    acceptedCount += tickets.filter((ticket) => ticket.status === "ok").length;
    unregisteredTokens.push(...findUnregisteredTokens(messageChunk, tickets));
  }

  await deletePushTokens(unregisteredTokens);
  return acceptedCount;
}

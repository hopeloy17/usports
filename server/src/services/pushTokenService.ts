import { upsertPushToken } from "../db/notifications";
import { ValidationError } from "./errors";
import { isExpoPushToken } from "./pushService";

// Remembers which user a device belongs to so the server can ping it later
export async function registerPushToken(userId: unknown, body: unknown): Promise<{ token: string }> {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new ValidationError("User ID is required");
  }

  const token = body && typeof body === "object" ? (body as { token?: unknown }).token : undefined;

  if (!isExpoPushToken(token)) {
    throw new ValidationError("A valid Expo push token is required");
  }

  await upsertPushToken(userId, token);
  return { token };
}

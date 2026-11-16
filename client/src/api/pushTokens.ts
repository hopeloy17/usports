import { API_BASE_URL } from "./events";
import { resolveUserId } from "./profile";

// Tells the server which user this device belongs to so it can ping the phone,
// for example when a joined game is about to be cancelled for low attendance.
export async function registerPushTokenApi(
  userId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/push-tokens`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": resolveUserId(userId),
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to register push token: ${response.status} ${response.statusText}`,
    );
  }
}

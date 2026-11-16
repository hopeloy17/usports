import { API_BASE_URL } from "./events";
import { authHeaders, forgetSignInIfRejected } from "./session";

// Tells the server which student this device belongs to so it can ping the phone,
// for example when a joined game is about to be cancelled for low attendance.
// Who's asking goes as the sign-in token (authHeaders), not a user id: the server reads the
// student from the token, which can't be faked. `_userId` is kept only so the caller
// (usePushNotifications) doesn't have to change.
export async function registerPushTokenApi(
  _userId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/push-tokens`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    // An expired or invalid sign-in token: forget it, so the app goes back to sign-in
    forgetSignInIfRejected(response);
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to register push token: ${response.status} ${response.statusText}`,
    );
  }
}

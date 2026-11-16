import { API_BASE_URL } from "../events";
import { registerPushTokenApi } from "../pushTokens";
import { clearSession, loadSession, saveSession } from "../session";

// The signed-in student's sign-in token: the server reads whose phone this is from it
const TOKEN = "token-abc";

describe("push token API client", () => {
  const originalFetch = globalThis.fetch;
  const token = "ExponentPushToken[abc123]";

  beforeEach(() => {
    // Each test starts signed in
    clearSession();
    saveSession({ userId: "user-1", accessToken: TOKEN });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
    clearSession();
  });

  it("sends the device's push token with the student's sign-in token", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await registerPushTokenApi("user-1", token);

    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/push-tokens`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ token }),
    });
  });

  it("never sends a user id: the server reads the student from the sign-in token", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    // Even if a caller passes someone else's id, only the sign-in token goes to the server
    await registerPushTokenApi("someone-else", token);

    const options = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(options.headers).not.toHaveProperty("x-user-id");
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("throws the server's error message when registration fails", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "A valid Expo push token is required" }),
    } as Response);

    await expect(registerPushTokenApi("user-1", "bad")).rejects.toThrow(
      "A valid Expo push token is required",
    );
  });

  it("forgets the sign-in when the server rejects the sign-in token (401)", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Your sign-in has expired. Please sign in again" }),
    } as Response);

    await expect(registerPushTokenApi("user-1", token)).rejects.toThrow(
      "Your sign-in has expired. Please sign in again",
    );
    // Signed out on this device, so the app goes back to the sign-in screen
    expect(loadSession()).toBeNull();
  });
});

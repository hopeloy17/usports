import { API_BASE_URL } from "../events";
import { DEFAULT_USER_ID } from "../profile";
import { registerPushTokenApi } from "../pushTokens";

describe("push token API client", () => {
  const originalFetch = globalThis.fetch;
  const token = "ExponentPushToken[abc123]";

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sends the token to the server for the given user", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await registerPushTokenApi("user-1", token);

    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/push-tokens`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": "user-1" },
      body: JSON.stringify({ token }),
    });
  });

  it("uses the default user id for the mock signed-in student", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await registerPushTokenApi("me", token);

    const options = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(options.headers["x-user-id"]).toBe(DEFAULT_USER_ID);
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
});

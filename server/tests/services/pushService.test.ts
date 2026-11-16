// Push sender tests with fetch and the token store replaced by fakes
import { deletePushTokens } from "../../src/db/notifications";
import {
  EXPO_PUSH_URL,
  isExpoPushToken,
  PushMessage,
  sendPushNotifications,
} from "../../src/services/pushService";

jest.mock("../../src/db/notifications", () => ({
  deletePushTokens: jest.fn(),
}));

const mockedDeletePushTokens = jest.mocked(deletePushTokens);
const mockedFetch = jest.fn();

function makeMessage(index: number): PushMessage {
  return { to: `ExponentPushToken[device-${index}]`, title: "Title", body: "Body" };
}

function respondWith(tickets: unknown[], status = 200): void {
  mockedFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => ({ data: tickets }),
  });
}

describe("isExpoPushToken", () => {
  it.each(["ExponentPushToken[abc123]", "ExpoPushToken[abc123]"])("accepts %s", (token) => {
    expect(isExpoPushToken(token)).toBe(true);
  });

  it.each([undefined, 42, "", "abc123", "ExponentPushToken[]", "ExponentPushToken[abc"])(
    "rejects %p",
    (token) => {
      expect(isExpoPushToken(token)).toBe(false);
    },
  );
});

describe("sendPushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockReset();
    global.fetch = mockedFetch as unknown as typeof fetch;
    mockedDeletePushTokens.mockResolvedValue();
  });

  it("posts the messages to Expo with a default sound", async () => {
    respondWith([{ status: "ok", id: "ticket-1" }]);

    await sendPushNotifications([makeMessage(1)]);

    expect(mockedFetch).toHaveBeenCalledWith(
      EXPO_PUSH_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(mockedFetch.mock.calls[0][1].body);
    expect(body).toEqual([{ sound: "default", ...makeMessage(1) }]);
  });

  it("returns how many messages Expo accepted", async () => {
    respondWith([
      { status: "ok", id: "ticket-1" },
      { status: "error", message: "rate limited", details: { error: "MessageRateExceeded" } },
    ]);

    expect(await sendPushNotifications([makeMessage(1), makeMessage(2)])).toBe(1);
  });

  it("splits more than 100 messages into several requests", async () => {
    const messages = Array.from({ length: 150 }, (_, index) => makeMessage(index));
    respondWith(Array.from({ length: 100 }, () => ({ status: "ok", id: "t" })));
    respondWith(Array.from({ length: 50 }, () => ({ status: "ok", id: "t" })));

    expect(await sendPushNotifications(messages)).toBe(150);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it("forgets tokens for devices that are no longer registered", async () => {
    respondWith([
      { status: "ok", id: "ticket-1" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
    ]);

    await sendPushNotifications([makeMessage(1), makeMessage(2)]);

    expect(mockedDeletePushTokens).toHaveBeenCalledWith(["ExponentPushToken[device-2]"]);
  });

  it("throws when Expo rejects the request", async () => {
    respondWith([], 500);

    await expect(sendPushNotifications([makeMessage(1)])).rejects.toThrow(
      "Expo push request failed: 500",
    );
  });
});

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getEventIdFromResponse, getPushTokenAsync } from "../pushNotifications";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "project-123" } } } },
}));

const mockedNotifications = jest.mocked(Notifications);
const token = "ExponentPushToken[abc123]";

function setPlatform(os: "ios" | "android" | "web") {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

describe("getPushTokenAsync", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("ios");
    (Device as { isDevice: boolean }).isDevice = true;
    Constants.expoConfig!.extra = { eas: { projectId: "project-123" } };
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      type: "expo",
      data: token,
    });
  });

  afterAll(() => setPlatform(originalOS as "ios"));

  it("returns the Expo push token for this project", async () => {
    expect(await getPushTokenAsync()).toBe(token);
    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-123",
    });
  });

  it("asks for permission when it has not been granted yet", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);

    expect(await getPushTokenAsync()).toBe(token);
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it("returns null when the student denies permission", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Notifications.NotificationPermissionsStatus);

    expect(await getPushTokenAsync()).toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("does not ask again once the student has permanently declined", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as Notifications.NotificationPermissionsStatus);

    expect(await getPushTokenAsync()).toBeNull();
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns null on a simulator", async () => {
    (Device as { isDevice: boolean }).isDevice = false;

    expect(await getPushTokenAsync()).toBeNull();
    expect(mockedNotifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns null on the web", async () => {
    setPlatform("web");

    expect(await getPushTokenAsync()).toBeNull();
  });

  it("creates the game alerts channel first on Android", async () => {
    setPlatform("android");

    await getPushTokenAsync();

    expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "game-alerts",
      expect.objectContaining({ name: "Game alerts" }),
    );
    expect(
      mockedNotifications.setNotificationChannelAsync.mock.invocationCallOrder[0],
    ).toBeLessThan(mockedNotifications.getPermissionsAsync.mock.invocationCallOrder[0]);
  });

  it("returns null without an EAS project id", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    Constants.expoConfig!.extra = {};

    expect(await getPushTokenAsync()).toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});

describe("getEventIdFromResponse", () => {
  function makeResponse(data: Record<string, unknown>) {
    return {
      notification: { request: { content: { data } } },
    } as unknown as Notifications.NotificationResponse;
  }

  it("reads the event id from the notification data", () => {
    expect(getEventIdFromResponse(makeResponse({ eventId: "e1" }))).toBe("e1");
  });

  it("returns null when the notification is not about an event", () => {
    expect(getEventIdFromResponse(makeResponse({}))).toBeNull();
    expect(getEventIdFromResponse(makeResponse({ eventId: 42 }))).toBeNull();
  });
});

// At-risk notifier tests with the database and push service replaced by fakes
import {
  getNotifiedRecipients,
  getOpenEventsStartingBetween,
  getPushTokensForUsers,
  insertNotifications,
  UpcomingEventRow,
} from "../../src/db/notifications";
import {
  buildAtRiskMessage,
  checkAtRiskEvents,
  findAtRiskWarnings,
} from "../../src/services/atRiskNotifier";
import { sendPushNotifications } from "../../src/services/pushService";

jest.mock("../../src/db/notifications", () => ({
  getNotifiedRecipients: jest.fn(),
  getOpenEventsStartingBetween: jest.fn(),
  getPushTokensForUsers: jest.fn(),
  insertNotifications: jest.fn(),
}));

jest.mock("../../src/services/pushService", () => ({
  sendPushNotifications: jest.fn(),
}));

const mockedGetOpenEvents = jest.mocked(getOpenEventsStartingBetween);
const mockedGetNotified = jest.mocked(getNotifiedRecipients);
const mockedGetTokens = jest.mocked(getPushTokensForUsers);
const mockedInsert = jest.mocked(insertNotifications);
const mockedSendPush = jest.mocked(sendPushNotifications);

const now = new Date("2030-06-15T17:00:00.000Z");

function makeEvent(overrides: Partial<UpcomingEventRow> = {}): UpcomingEventRow {
  return {
    id: "e1",
    title: "Casual 3v3 Runs",
    start_time: "2030-06-15T17:45:00.000Z",
    min_players: 4,
    participants: [
      { user_id: "host", status: "going" },
      { user_id: "u2", status: "going" },
      { user_id: "u3", status: "cancelled" },
    ],
    ...overrides,
  };
}

describe("buildAtRiskMessage", () => {
  it("says how soon the game starts and how many players are missing", () => {
    expect(buildAtRiskMessage(makeEvent(), 2, now)).toBe(
      "Casual 3v3 Runs starts in 45 min and still needs 2 more players. Invite a friend or it may be cancelled.",
    );
  });

  it("uses the singular when one player is missing", () => {
    expect(buildAtRiskMessage(makeEvent(), 3, now)).toContain("needs 1 more player.");
  });

  it("never reports less than one minute", () => {
    const event = makeEvent({ start_time: "2030-06-15T17:00:10.000Z" });
    expect(buildAtRiskMessage(event, 2, now)).toContain("starts in 1 min");
  });
});

describe("findAtRiskWarnings", () => {
  it("warns every player who is going to an under-filled event", () => {
    const warnings = findAtRiskWarnings([makeEvent()], new Set(), now);

    expect(warnings.map((warning) => warning.userId)).toEqual(["host", "u2"]);
    expect(warnings[0].eventId).toBe("e1");
  });

  it("skips players who left the event", () => {
    const warnings = findAtRiskWarnings([makeEvent()], new Set(), now);
    expect(warnings.map((warning) => warning.userId)).not.toContain("u3");
  });

  it("skips events that have reached their minimum", () => {
    const event = makeEvent({ min_players: 2 });
    expect(findAtRiskWarnings([event], new Set(), now)).toEqual([]);
  });

  it("skips players who were already warned about that event", () => {
    const warnings = findAtRiskWarnings([makeEvent()], new Set(["e1:host"]), now);
    expect(warnings.map((warning) => warning.userId)).toEqual(["u2"]);
  });

  it("does not let a warning for one event suppress another event", () => {
    const other = makeEvent({ id: "e2" });
    const warnings = findAtRiskWarnings([other], new Set(["e1:host"]), now);
    expect(warnings.map((warning) => warning.userId)).toEqual(["host", "u2"]);
  });
});

describe("checkAtRiskEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOpenEvents.mockResolvedValue([makeEvent()]);
    mockedGetNotified.mockResolvedValue(new Set());
    mockedGetTokens.mockResolvedValue([
      { user_id: "host", token: "ExponentPushToken[host-phone]" },
      { user_id: "u2", token: "ExponentPushToken[u2-phone]" },
      { user_id: "u2", token: "ExponentPushToken[u2-tablet]" },
    ]);
    mockedInsert.mockResolvedValue();
    mockedSendPush.mockImplementation(async (messages) => messages.length);
  });

  it("looks only at events starting within the warning window", async () => {
    await checkAtRiskEvents(now, 60);

    expect(mockedGetOpenEvents).toHaveBeenCalledWith(
      now,
      new Date("2030-06-15T18:00:00.000Z"),
    );
  });

  it("checks for earlier at-risk warnings about the events it found", async () => {
    await checkAtRiskEvents(now);
    expect(mockedGetNotified).toHaveBeenCalledWith(["e1"], "event_at_risk");
  });

  it("records an in-app notification for each warned player", async () => {
    await checkAtRiskEvents(now);

    expect(mockedInsert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: "host", event_id: "e1", type: "event_at_risk" }),
      expect.objectContaining({ user_id: "u2", event_id: "e1", type: "event_at_risk" }),
    ]);
  });

  it("pings every registered device of each warned player", async () => {
    const result = await checkAtRiskEvents(now);

    const sent = mockedSendPush.mock.calls[0][0];
    expect(sent.map((message) => message.to)).toEqual([
      "ExponentPushToken[host-phone]",
      "ExponentPushToken[u2-phone]",
      "ExponentPushToken[u2-tablet]",
    ]);
    expect(sent[0]).toEqual(
      expect.objectContaining({
        title: "Your game may be cancelled",
        data: { type: "event_at_risk", eventId: "e1" },
      }),
    );
    expect(result).toEqual({ warningsCreated: 2, pushesAccepted: 3 });
  });

  it("saves the notifications before sending pushes", async () => {
    await checkAtRiskEvents(now);

    expect(mockedInsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockedSendPush.mock.invocationCallOrder[0],
    );
  });

  it("still records the warning when the player has no registered device", async () => {
    mockedGetTokens.mockResolvedValue([]);

    const result = await checkAtRiskEvents(now);

    expect(mockedInsert).toHaveBeenCalled();
    expect(mockedSendPush).not.toHaveBeenCalled();
    expect(result).toEqual({ warningsCreated: 2, pushesAccepted: 0 });
  });

  it("does nothing when every player was already warned", async () => {
    mockedGetNotified.mockResolvedValue(new Set(["e1:host", "e1:u2"]));

    const result = await checkAtRiskEvents(now);

    expect(mockedInsert).not.toHaveBeenCalled();
    expect(mockedSendPush).not.toHaveBeenCalled();
    expect(result).toEqual({ warningsCreated: 0, pushesAccepted: 0 });
  });

  it("does nothing when no games are starting soon", async () => {
    mockedGetOpenEvents.mockResolvedValue([]);

    await checkAtRiskEvents(now);

    expect(mockedInsert).not.toHaveBeenCalled();
    expect(mockedSendPush).not.toHaveBeenCalled();
  });

  it("does not push when saving the notifications fails", async () => {
    mockedInsert.mockRejectedValue(new Error("database down"));

    await expect(checkAtRiskEvents(now)).rejects.toThrow("database down");
    expect(mockedSendPush).not.toHaveBeenCalled();
  });
});

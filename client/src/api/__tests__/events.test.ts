import {
  API_BASE_URL,
  createEventApi,
  fetchEventById,
  fetchEvents,
  joinEventApi,
  leaveEventApi,
} from "../events";
import { clearSession, loadSession, saveSession } from "../session";

// The signed-in student's sign-in token: the server reads who joins or leaves from it
const TOKEN = "token-abc";

describe("events API client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Each test starts signed in
    clearSession();
    saveSession({ userId: "11111111-1111-1111-1111-111111111111", accessToken: TOKEN });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("fetches all events from the server", async () => {
    const mockData = [
      {
        id: "1",
        name: "John D.'s Basketball Game",
        sport: "Basketball",
        venue: "Spoelhof Fieldhouse",
        dateTime: "2026-10-10T19:00:00.000Z",
        joinedCount: 6,
        minPlayers: 10,
        skillLevel: "Intermediate",
        status: "open",
        host: "John D.",
        roster: ["John D."],
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetchEvents();

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/events`);
    expect(result).toEqual(mockData);
  });

  it("passes sport and date filters to the server", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchEvents({ sport: "Basketball", date: "2026-10-10" });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/events?sport=Basketball&date=2026-10-10`,
    );
  });

  it("fetches a single event by id", async () => {
    const mockEvent = {
      id: "1",
      name: "John D.'s Basketball Game",
      sport: "Basketball",
      venue: "Spoelhof Fieldhouse",
      dateTime: "2026-10-10T19:00:00.000Z",
      joinedCount: 6,
      minPlayers: 10,
      skillLevel: "Intermediate",
      status: "open",
      host: "John D.",
      roster: ["John D."],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const result = await fetchEventById("1");

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/events/1`);
    expect(result).toEqual(mockEvent);
  });

  it("creates an event on the server via POST", async () => {
    const input = {
      sport: "Volleyball",
      venue: "Van Noord Arena",
      dateTime: "2026-10-12T18:00:00.000Z",
      minPlayers: 8,
      skillLevel: "Beginner" as const,
      host: "Taylor R.",
      description: "Friendly game",
    };

    const createdEvent = {
      id: "3",
      name: "Taylor R.'s Volleyball Game",
      ...input,
      joinedCount: 1,
      roster: ["Taylor R."],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => createdEvent,
    } as Response);

    const result = await createEventApi(input);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/events`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(result).toEqual(createdEvent);
  });

  it("joins an event via POST /api/events/:id/join", async () => {
    const updatedEvent = {
      id: "1",
      joinedCount: 7,
      roster: ["John D.", "You"],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedEvent,
    } as Response);

    const result = await joinEventApi("1", "You");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/events/1/join`,
      expect.objectContaining({
        method: "POST",
        // Who joins comes from the sign-in token, never from an id the app claims
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    );
    expect(result).toEqual(updatedEvent);
  });

  it("leaves an event via DELETE /api/events/:id/join", async () => {
    const updatedEvent = {
      id: "1",
      joinedCount: 5,
      roster: ["John D."],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedEvent,
    } as Response);

    const result = await leaveEventApi("1", "You");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/events/1/join`,
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    );
    expect(result).toEqual(updatedEvent);
  });

  it.each([
    ["joining", () => joinEventApi("1", "You")],
    ["leaving", () => leaveEventApi("1", "You")],
  ])("forgets the sign-in when the server rejects the token while %s", async (_label, call) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Your sign-in has expired. Please sign in again" }),
    } as Response);

    await expect(call()).rejects.toThrow("Your sign-in has expired. Please sign in again");
    // The app's sign-in check then sends the student back to the sign-in screen
    expect(loadSession()).toBeNull();
  });

  describe("error handling", () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("throws an error when fetchEvents response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Event not found" }),
      } as Response);

      await expect(fetchEvents()).rejects.toThrow("Failed to fetch events: 404 Not Found");
    });

    it("propagates a network error when fetchEvents cannot reach the server", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(fetchEvents()).rejects.toThrow("Network failure");
    });

    it("throws an error when fetchEventById response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(fetchEventById("1")).rejects.toThrow("Failed to fetch event: 404 Not Found");
    });

    it("propagates a network error when fetchEventById cannot reach the server", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(fetchEventById("1")).rejects.toThrow("Network failure");
    });

    it("propagates a network error for an unknown event when the server is unreachable", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(fetchEventById("nonexistent_id")).rejects.toThrow(
        "Network failure",
      );
    });

    it("propagates a network error when createEventApi cannot reach the server", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      const input = {
        sport: "Tennis",
        venue: "Tennis Courts",
        dateTime: "2026-10-15T15:00:00.000Z",
        minPlayers: 2,
        skillLevel: "Advanced" as const,
        host: "Alex B.",
        description: "Singles match",
      };

      await expect(createEventApi(input)).rejects.toThrow("Network failure");
    });

    it("throws server error message when createEventApi response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: "Invalid event data" }),
      } as Response);

      await expect(
        createEventApi({
          sport: "Tennis",
          venue: "Courts",
          dateTime: "2026-10-15T15:00:00.000Z",
          minPlayers: 2,
          skillLevel: "Advanced" as const,
          host: "Alex B.",
        }),
      ).rejects.toThrow("Invalid event data");
    });

    it("propagates a network error when joinEventApi cannot reach the server", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(joinEventApi("1", "NewPlayer")).rejects.toThrow("Network failure");
    });

    it("propagates a network error for an unknown event when joining", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(joinEventApi("unknown_999", "Player")).rejects.toThrow(
        "Network failure",
      );
    });

    it("throws server error message when joinEventApi response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        json: async () => ({ error: "Event is full" }),
      } as Response);

      await expect(joinEventApi("1", "Player")).rejects.toThrow("Event is full");
    });

    it("propagates a network error when leaveEventApi cannot reach the server", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(leaveEventApi("1", "NewPlayer")).rejects.toThrow("Network failure");
    });

    it("propagates a network error for an unknown event when leaving", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      await expect(leaveEventApi("unknown_999", "Player")).rejects.toThrow(
        "Network failure",
      );
    });

    it("throws server error message when leaveEventApi response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        json: async () => ({ error: "The host cannot leave the event" }),
      } as Response);

      await expect(leaveEventApi("1", "Host")).rejects.toThrow(
        "The host cannot leave the event",
      );
    });
  });
});

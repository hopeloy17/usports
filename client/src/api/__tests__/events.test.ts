import {
  API_BASE_URL,
  createEventApi,
  fetchEventById,
  fetchEvents,
  joinEventApi,
  leaveEventApi,
} from "../events";

describe("events API client", () => {
  const originalFetch = global.fetch;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant: "You" }),
      }),
    );
    expect(result).toEqual(updatedEvent);
  });

  it("leaves an event via POST /api/events/:id/leave", async () => {
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
      `${API_BASE_URL}/api/events/1/leave`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant: "You" }),
      }),
    );
    expect(result).toEqual(updatedEvent);
  });

  it("throws an error when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Event not found" }),
    } as Response);

    await expect(fetchEvents()).rejects.toThrow("Failed to fetch events: 404 Not Found");
  });
});

import * as database from "../../src/db";
import {
  getAllEvents,
  getEventById,
  mapDatabaseEvent,
  addEventParticipant,
  removeEventParticipant,
} from "../../src/repositories/eventRepository";

jest.mock("../../src/db", () => ({
  addParticipant: jest.fn(),
  getEventRows: jest.fn(),
  removeParticipant: jest.fn(),
}));

const mockedGetEventRows = jest.mocked(database.getEventRows);
const mockedAddParticipant = jest.mocked(database.addParticipant);
const mockedRemoveParticipant = jest.mocked(database.removeParticipant);

describe("mapDatabaseEvent", () => {
  it("maps the database event shape and preserves a null skill level", () => {
    const result = mapDatabaseEvent({
      id: "eeeeeee1-1111-1111-1111-111111111111",
      title: "Casual 3v3 Runs",
      start_time: "2030-06-15T18:00:00.000Z",
      description: "Bring light and dark shirts.",
      min_players: 4,
      max_players: 6,
      skill_level: null,
      status: "open",
      host_id: "user-1",
      host: { name: "Alex Johnson" },
      sport: { name: "Basketball" },
      venue: { name: "Spoelhof Fieldhouse Court 1" },
      participants: [
        { user: { name: "Alex Johnson" }, status: "going" },
        { user: { name: "Jordan Smith" }, status: "going" },
        { user: { name: "Taylor Kim" }, status: "cancelled" },
      ],
    });

    expect(result).toEqual({
      id: "eeeeeee1-1111-1111-1111-111111111111",
      name: "Casual 3v3 Runs",
      sport: "Basketball",
      venue: "Spoelhof Fieldhouse Court 1",
      dateTime: "2030-06-15T18:00:00.000Z",
      joinedCount: 2,
      minPlayers: 4,
      maxPlayers: 6,
      skillLevel: null,
      status: "open",
      hostId: "user-1",
      host: "Alex Johnson",
      roster: ["Alex Johnson", "Jordan Smith"],
      description: "Bring light and dark shirts.",
    });
  });

  it("maps a full event without adding a description when the database value is null", () => {
    const result = mapDatabaseEvent({
      id: "eeeeeee2-2222-2222-2222-222222222222",
      title: "1v1 Tennis Rally",
      start_time: "2030-06-16T18:00:00.000Z",
      description: null,
      min_players: 2,
      max_players: 2,
      skill_level: "intermediate",
      status: "full",
      host_id: "user-2",
      host: { name: "Jordan Smith" },
      sport: { name: "Tennis" },
      venue: { name: "Spoelhof Fieldhouse Court 1" },
      participants: [
        { user: { name: "Jordan Smith" }, status: "going" },
        { user: { name: "Taylor Kim" }, status: "going" },
      ],
    });

    expect(result).toEqual({
      id: "eeeeeee2-2222-2222-2222-222222222222",
      name: "1v1 Tennis Rally",
      sport: "Tennis",
      venue: "Spoelhof Fieldhouse Court 1",
      dateTime: "2030-06-16T18:00:00.000Z",
      joinedCount: 2,
      minPlayers: 2,
      maxPlayers: 2,
      skillLevel: "Intermediate",
      status: "full",
      hostId: "user-2",
      host: "Jordan Smith",
      roster: ["Jordan Smith", "Taylor Kim"],
    });
  });
});

describe("event repository reads", () => {
  const row = {
    id: "event-1",
    title: "Casual 3v3 Runs",
    start_time: "2030-06-15T18:00:00.000Z",
    description: null,
    min_players: 4,
    max_players: 6,
    skill_level: null,
    status: "open" as const,
    host_id: "user-1",
    host: { name: "Alex Johnson" },
    sport: { name: "Basketball" },
    venue: { name: "Fieldhouse" },
    participants: [
      { status: "going" as const, user: { name: "Alex Johnson" } },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and maps all event rows with filters", async () => {
    mockedGetEventRows.mockResolvedValue([row]);

    const result = await getAllEvents({
      sport: "Basketball",
      date: "2030-06-15",
    });

    expect(mockedGetEventRows).toHaveBeenCalledWith({
      sport: "Basketball",
      date: "2030-06-15",
    });
    expect(result[0].name).toBe("Casual 3v3 Runs");
  });

  it("loads one event by id", async () => {
    mockedGetEventRows.mockResolvedValue([row]);

    const result = await getEventById("event-1");

    expect(mockedGetEventRows).toHaveBeenCalledWith({});
    expect(result?.id).toBe("event-1");
  });

  it("returns undefined when an event id is not found", async () => {
    mockedGetEventRows.mockResolvedValue([]);

    await expect(getEventById("missing")).resolves.toBeUndefined();
  });

  it("adds a participant and reloads the updated event", async () => {
    mockedAddParticipant.mockResolvedValue({});
    mockedGetEventRows.mockResolvedValue([row]);

    await expect(addEventParticipant("event-1", "user-1")).resolves.toEqual(
      expect.objectContaining({ id: "event-1" }),
    );

    expect(mockedAddParticipant).toHaveBeenCalledWith("event-1", "user-1");
  });

  it("cancels a participant and reloads the updated event", async () => {
    mockedRemoveParticipant.mockResolvedValue({});
    mockedGetEventRows.mockResolvedValue([row]);

    await expect(removeEventParticipant("event-1", "user-1")).resolves.toEqual(
      expect.objectContaining({ id: "event-1" }),
    );

    expect(mockedRemoveParticipant).toHaveBeenCalledWith("event-1", "user-1");
  });
});

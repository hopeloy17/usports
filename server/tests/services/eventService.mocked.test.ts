// Business-logic tests for eventService with the data layer replaced by fakes.
// Each test decides what the repository "returns" and checks exactly what the
// service asks it to save, so the rules are tested without any real storage.
import {
  addEvent,
  addEventParticipant,
  getAllEvents,
  getEventById,
  removeEventParticipant,
} from "../../src/repositories/eventRepository";
import { getParticipantStatus } from "../../src/db";
import { ConflictError } from "../../src/services/errors";
import { createEvent, joinEvent, leaveEvent, listEvents } from "../../src/services/eventService";
import { Event } from "../../src/types/event";

jest.mock("../../src/repositories/eventRepository", () => ({
  addEvent: jest.fn(),
  addEventParticipant: jest.fn(),
  getAllEvents: jest.fn(),
  getEventById: jest.fn(),
  removeEventParticipant: jest.fn(),
}));

jest.mock("../../src/db", () => ({
  getParticipantStatus: jest.fn(),
}));

// jest.mocked() gives the fakes proper types so .mockReturnValue() type-checks
const mockedAddEvent = jest.mocked(addEvent);
const mockedGetAllEvents = jest.mocked(getAllEvents);
const mockedGetEventById = jest.mocked(getEventById);
const mockedAddEventParticipant = jest.mocked(addEventParticipant);
const mockedRemoveEventParticipant = jest.mocked(removeEventParticipant);
const mockedGetParticipantStatus = jest.mocked(getParticipantStatus);

// Builds a test event; override only the fields a test cares about
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "e1",
    name: "Host's Volleyball Game",
    sport: "Volleyball",
    venue: "Fieldhouse",
    dateTime: "2030-06-15T18:00:00.000Z",
    joinedCount: 1,
    minPlayers: 2,
    maxPlayers: 3,
    skillLevel: "Beginner",
    status: "open",
    host: "Host",
    roster: ["Host"],
    ...overrides,
  };
}

// Makes the fake repository hold this event, and echo back whatever the service saves
function stubRepositoryWith(event: Event): void {
  mockedGetEventById.mockReturnValue(event);
  mockedAddEventParticipant.mockResolvedValue(event);
  mockedRemoveEventParticipant.mockResolvedValue(event);
  mockedGetParticipantStatus.mockResolvedValue(null);
}

describe("joinEvent (mocked repository)", () => {
  it("saves the new participant and count when the event is open", async () => {
    stubRepositoryWith(makeEvent());

    await joinEvent("e1", "user-sam");

    expect(mockedAddEventParticipant).toHaveBeenCalledWith("e1", "user-sam");
  });

  it("saves status 'full' when the last spot is taken", async () => {
    const event = makeEvent({ joinedCount: 2, roster: ["Host", "Ann"] });
    stubRepositoryWith(event);
    mockedAddEventParticipant.mockResolvedValue({
      ...event,
      joinedCount: 3,
      status: "full",
    });

    const result = await joinEvent("e1", "user-sam");

    expect(mockedAddEventParticipant).toHaveBeenCalledWith("e1", "user-sam");
    expect(result.status).toBe("full");
  });

  it("rejects joining a full event without saving anything", async () => {
    stubRepositoryWith(makeEvent({ status: "full", joinedCount: 3, roster: ["Host", "Ann", "Bo"] }));

    await expect(joinEvent("e1", "user-sam")).rejects.toThrow(new ConflictError("Event is full"));
    expect(mockedAddEventParticipant).not.toHaveBeenCalled();
  });

  it("rejects joining when capacity is reached even if status is stale", async () => {
    stubRepositoryWith(
      makeEvent({ status: "open", joinedCount: 3, maxPlayers: 3 }),
    );

    await expect(joinEvent("e1", "user-sam")).rejects.toThrow(
      new ConflictError("Event is full"),
    );
    expect(mockedAddEventParticipant).not.toHaveBeenCalled();
  });

  it("rejects joining a cancelled event without saving anything", async () => {
    stubRepositoryWith(makeEvent({ status: "cancelled" }));

    await expect(joinEvent("e1", "user-sam")).rejects.toThrow(new ConflictError("Event is cancelled"));
    expect(mockedAddEventParticipant).not.toHaveBeenCalled();
  });

  it("rejects joining twice without saving anything", async () => {
    stubRepositoryWith(makeEvent({ joinedCount: 2, roster: ["Host", "Sam"] }));
    mockedGetParticipantStatus.mockResolvedValue("going");

    await expect(joinEvent("e1", "user-sam")).rejects.toThrow(
      new ConflictError("Participant has already joined"),
    );
    expect(mockedAddEventParticipant).not.toHaveBeenCalled();
  });
});

describe("leaveEvent (mocked repository)", () => {
  it("saves the roster and count without the participant", async () => {
    stubRepositoryWith(makeEvent({ joinedCount: 2, roster: ["Host", "Sam"] }));
    mockedGetParticipantStatus.mockResolvedValue("going");

    await leaveEvent("e1", "user-sam");

    expect(mockedRemoveEventParticipant).toHaveBeenCalledWith("e1", "user-sam");
  });

  it("saves status 'open' when someone leaves a full event, so it reopens", async () => {
    const event = makeEvent({
      status: "full",
      joinedCount: 3,
      roster: ["Host", "Ann", "Sam"],
    });
    stubRepositoryWith(event);
    mockedRemoveEventParticipant.mockResolvedValue({
      ...event,
      joinedCount: 2,
      status: "open",
    });
    mockedGetParticipantStatus.mockResolvedValue("going");

    const result = await leaveEvent("e1", "user-sam");

    expect(mockedRemoveEventParticipant).toHaveBeenCalledWith("e1", "user-sam");
    expect(result.status).toBe("open");
  });
});

describe("listEvents (mocked repository)", () => {
  const soccerToday = makeEvent({ id: "a", sport: "Soccer", dateTime: "2030-06-15T18:00:00.000Z" });
  const soccerLater = makeEvent({ id: "b", sport: "Soccer", dateTime: "2030-06-16T18:00:00.000Z" });
  const tennisToday = makeEvent({ id: "c", sport: "Tennis", dateTime: "2030-06-15T09:00:00.000Z" });

  beforeEach(() => {
    mockedGetAllEvents.mockImplementation(async (filters = {}) =>
      [soccerToday, soccerLater, tennisToday].filter((event) =>
        (typeof filters.sport !== "string" ||
          event.sport.toLowerCase() === filters.sport.toLowerCase()) &&
        (typeof filters.date !== "string" ||
          event.dateTime.startsWith(filters.date)),
      ),
    );
  });

  it("filters the feed by sport", async () => {
    const feed = await listEvents({ sport: "soccer" });

    expect(feed.map((event) => event.id)).toEqual(["a", "b"]);
  });

  it("filters the feed by date", async () => {
    const feed = await listEvents({ date: "2030-06-15" });

    expect(feed.map((event) => event.id)).toEqual(["a", "c"]);
  });

  it("filters by sport and date together", async () => {
    const feed = await listEvents({ sport: "Soccer", date: "2030-06-15" });

    expect(feed.map((event) => event.id)).toEqual(["a"]);
  });
});

describe("createEvent (mocked repository)", () => {
  it("saves a new open event with the host as its only player", async () => {
    mockedAddEvent.mockImplementation((event) => event);

    await createEvent({
      sport: "Soccer",
      venue: "Gainey",
      dateTime: "2030-06-15T18:00:00.000Z",
      minPlayers: 4,
      skillLevel: "Beginner",
      host: "Host",
    });

    expect(mockedAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "open", joinedCount: 1, roster: ["Host"] }),
    );
  });
});

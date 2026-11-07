// Business-logic tests for eventService with the data layer replaced by fakes.
// Each test decides what the repository "returns" and checks exactly what the
// service asks it to save, so the rules are tested without any real storage.
import {
  addEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../../src/repositories/eventRepository";
import { ConflictError } from "../../src/services/errors";
import { createEvent, joinEvent, leaveEvent, listEvents } from "../../src/services/eventService";
import { Event } from "../../src/types/event";

jest.mock("../../src/repositories/eventRepository", () => ({
  addEvent: jest.fn(),
  getAllEvents: jest.fn(),
  getEventById: jest.fn(),
  updateEvent: jest.fn(),
}));

// jest.mocked() gives the fakes proper types so .mockReturnValue() type-checks
const mockedAddEvent = jest.mocked(addEvent);
const mockedGetAllEvents = jest.mocked(getAllEvents);
const mockedGetEventById = jest.mocked(getEventById);
const mockedUpdateEvent = jest.mocked(updateEvent);

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
  mockedUpdateEvent.mockImplementation((_id, updates) => ({ ...event, ...updates }));
}

describe("joinEvent (mocked repository)", () => {
  it("saves the new participant and count when the event is open", async () => {
    stubRepositoryWith(makeEvent());

    await joinEvent("e1", "Sam");

    expect(mockedUpdateEvent).toHaveBeenCalledWith("e1", {
      joinedCount: 2,
      roster: ["Host", "Sam"],
      status: "open",
    });
  });

  it("saves status 'full' when the last spot is taken", async () => {
    stubRepositoryWith(makeEvent({ joinedCount: 2, roster: ["Host", "Ann"] }));

    const result = await joinEvent("e1", "Sam");

    expect(mockedUpdateEvent).toHaveBeenCalledWith("e1", {
      joinedCount: 3,
      roster: ["Host", "Ann", "Sam"],
      status: "full",
    });
    expect(result.status).toBe("full");
  });

  it("rejects joining a full event without saving anything", async () => {
    stubRepositoryWith(makeEvent({ status: "full", joinedCount: 3, roster: ["Host", "Ann", "Bo"] }));

    await expect(joinEvent("e1", "Sam")).rejects.toThrow(new ConflictError("Event is full"));
    expect(mockedUpdateEvent).not.toHaveBeenCalled();
  });

  it("rejects joining a cancelled event without saving anything", async () => {
    stubRepositoryWith(makeEvent({ status: "cancelled" }));

    await expect(joinEvent("e1", "Sam")).rejects.toThrow(new ConflictError("Event is cancelled"));
    expect(mockedUpdateEvent).not.toHaveBeenCalled();
  });

  it("rejects joining twice without saving anything", async () => {
    stubRepositoryWith(makeEvent({ joinedCount: 2, roster: ["Host", "Sam"] }));

    await expect(joinEvent("e1", "Sam")).rejects.toThrow(
      new ConflictError("Participant has already joined"),
    );
    expect(mockedUpdateEvent).not.toHaveBeenCalled();
  });
});

describe("leaveEvent (mocked repository)", () => {
  it("saves the roster and count without the participant", async () => {
    stubRepositoryWith(makeEvent({ joinedCount: 2, roster: ["Host", "Sam"] }));

    await leaveEvent("e1", "Sam");

    expect(mockedUpdateEvent).toHaveBeenCalledWith("e1", {
      joinedCount: 1,
      roster: ["Host"],
      status: "open",
    });
  });

  it("saves status 'open' when someone leaves a full event, so it reopens", async () => {
    stubRepositoryWith(
      makeEvent({ status: "full", joinedCount: 3, roster: ["Host", "Ann", "Sam"] }),
    );

    const result = await leaveEvent("e1", "Sam");

    expect(mockedUpdateEvent).toHaveBeenCalledWith("e1", {
      joinedCount: 2,
      roster: ["Host", "Ann"],
      status: "open",
    });
    expect(result.status).toBe("open");
  });
});

describe("listEvents (mocked repository)", () => {
  const soccerToday = makeEvent({ id: "a", sport: "Soccer", dateTime: "2030-06-15T18:00:00.000Z" });
  const soccerLater = makeEvent({ id: "b", sport: "Soccer", dateTime: "2030-06-16T18:00:00.000Z" });
  const tennisToday = makeEvent({ id: "c", sport: "Tennis", dateTime: "2030-06-15T09:00:00.000Z" });

  beforeEach(() => {
    mockedGetAllEvents.mockReturnValue([soccerToday, soccerLater, tennisToday]);
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

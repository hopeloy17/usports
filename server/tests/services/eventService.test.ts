import {
  addEvent,
  getEventById,
  getAllEvents,
  addEventParticipant,
  removeEventParticipant,
} from "../../src/repositories/eventRepository";
import * as eventRepository from "../../src/repositories/eventRepository";
import * as database from "../../src/db";
import { getParticipantStatus } from "../../src/db";
import { mockEvents } from "../../src/data/events";
import { ConflictError, NotFoundError, ValidationError } from "../../src/services/errors";
import {
  createEvent,
  formatHeadcount,
  getEvent,
  joinEvent,
  leaveEvent,
  listEvents,
} from "../../src/services/eventService";
import { Event } from "../../src/types/event";

// Builds a test event; override only the fields a test cares about
function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "test",
    name: "Host's Volleyball Game",
    sport: "Volleyball",
    venue: "Fieldhouse",
    dateTime: "2030-06-15T18:00:00.000Z",
    joinedCount: 1,
    minPlayers: 2,
    skillLevel: "Beginner",
    status: "open",
    host: "Host",
    roster: ["Host"],
    ...overrides,
  };
}

let testEvents: Event[];

jest.spyOn(eventRepository, "getEventById");
jest.spyOn(eventRepository, "getAllEvents");
jest.spyOn(eventRepository, "addEvent");
jest.spyOn(eventRepository, "addEventParticipant");
jest.spyOn(eventRepository, "removeEventParticipant");
jest.spyOn(database, "getParticipantStatus");

beforeEach(() => {
  testEvents = structuredClone(mockEvents);

  jest.mocked(eventRepository.getEventById).mockImplementation(async (id) =>
    testEvents.find((event) => event.id === id),
  );
  jest.mocked(eventRepository.getAllEvents).mockImplementation(async (filters = {}) =>
    testEvents.filter((event) =>
      (typeof filters.sport !== "string" ||
        event.sport.toLowerCase() === filters.sport.toLowerCase()) &&
      (typeof filters.date !== "string" ||
        event.dateTime.startsWith(filters.date)),
    ),
  );
  jest.mocked(eventRepository.addEvent).mockImplementation((event) => {
    testEvents = [...testEvents, event];
    return event;
  });
  jest.mocked(database.getParticipantStatus).mockImplementation(async (eventId, userId) => {
    const event = testEvents.find((candidate) => candidate.id === eventId);
    return event?.roster.includes(userId) ? "going" : null;
  });
  jest.mocked(eventRepository.addEventParticipant).mockImplementation(async (eventId, userId) => {
    const event = testEvents.find((candidate) => candidate.id === eventId);
    if (!event) return undefined;
    const updated = {
      ...event,
      joinedCount: event.joinedCount + 1,
      roster: [...event.roster, userId],
      status:
        event.maxPlayers !== undefined && event.joinedCount + 1 >= event.maxPlayers
          ? "full" as const
          : event.status,
    };
    testEvents = testEvents.map((candidate) => candidate.id === eventId ? updated : candidate);
    return updated;
  });
  jest.mocked(eventRepository.removeEventParticipant).mockImplementation(async (eventId, userId) => {
    const event = testEvents.find((candidate) => candidate.id === eventId);
    if (!event) return undefined;
    const updated = {
      ...event,
      joinedCount: event.joinedCount - 1,
      roster: event.roster.filter((participant) => participant !== userId),
      status: event.status === "full" ? "open" as const : event.status,
    };
    testEvents = testEvents.map((candidate) => candidate.id === eventId ? updated : candidate);
    return updated;
  });
});

describe("joinEvent", () => {
  it("adds the participant and increases the joined count", async () => {
    const event = await joinEvent("1", "Jordan P.");

    expect(event.joinedCount).toBe(7);
    expect(event.roster).toContain("Jordan P.");
  });

  it("saves the change", async () => {
    await joinEvent("1", "Jordan P.");

    expect(getEventById("1")?.roster).toContain("Jordan P.");
  });

  it("marks the event full when the last spot is taken", async () => {
    addEvent(makeEvent({ id: "capped", maxPlayers: 2 }));

    const event = await joinEvent("capped", "Jordan P.");

    expect(event.status).toBe("full");
  });

  it("rejects an unknown event", async () => {
    const result = joinEvent("unknown", "Jordan P.");

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Event not found");
  });

  it("rejects a blank participant", async () => {
    const result = joinEvent("1", "   ");

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Participant is required");
  });

  it("rejects joining a full event", async () => {
    addEvent(makeEvent({ id: "full", joinedCount: 2, maxPlayers: 2, roster: ["Host", "Sam"], status: "full" }));

    const result = joinEvent("full", "Jordan P.");

    await expect(result).rejects.toThrow(ConflictError);
    await expect(result).rejects.toThrow("Event is full");
  });

  it("rejects joining a cancelled event", async () => {
    addEvent(makeEvent({ id: "cancelled", status: "cancelled" }));

    const result = joinEvent("cancelled", "Jordan P.");

    await expect(result).rejects.toThrow(ConflictError);
    await expect(result).rejects.toThrow("Event is cancelled");
  });

  it("rejects joining the same event twice", async () => {
    const result = joinEvent("1", "Sarah M.");

    await expect(result).rejects.toThrow(ConflictError);
    await expect(result).rejects.toThrow("Participant has already joined");
  });

  it("leaves the event unchanged when a join is rejected", async () => {
    addEvent(makeEvent({ id: "full", joinedCount: 2, maxPlayers: 2, roster: ["Host", "Sam"], status: "full" }));

    await expect(joinEvent("full", "Jordan P.")).rejects.toThrow();

    expect(getEventById("full")?.roster).toEqual(["Host", "Sam"]);
    expect(getEventById("full")?.joinedCount).toBe(2);
  });
});

describe("leaveEvent", () => {
  it("removes the participant and decreases the joined count", async () => {
    const event = await leaveEvent("1", "Sarah M.");

    expect(event.joinedCount).toBe(5);
    expect(event.roster).not.toContain("Sarah M.");
  });

  it("reopens a full event when someone leaves", async () => {
    addEvent(makeEvent({ id: "full", joinedCount: 2, maxPlayers: 2, roster: ["Host", "Sam"], status: "full" }));

    const event = await leaveEvent("full", "Sam");

    expect(event.status).toBe("open");
  });

  it("keeps a cancelled event cancelled when someone leaves", async () => {
    addEvent(makeEvent({ id: "cancelled", joinedCount: 2, roster: ["Host", "Sam"], status: "cancelled" }));

    const event = await leaveEvent("cancelled", "Sam");

    expect(event.status).toBe("cancelled");
  });

  it("rejects an unknown event", async () => {
    const result = leaveEvent("unknown", "Sarah M.");

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Event not found");
  });

  it("rejects a participant who is not on the roster", async () => {
    const result = leaveEvent("1", "Not Joined");

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Participant not found");
  });

  it("rejects the host leaving their own event", async () => {
    const result = leaveEvent("1", "John D.");

    await expect(result).rejects.toThrow(ConflictError);
    await expect(result).rejects.toThrow("The host cannot leave the event");
  });
});

describe("formatHeadcount", () => {
  it("shows the joined count against the players needed", () => {
    expect(formatHeadcount(makeEvent({ joinedCount: 4, minPlayers: 8 }))).toBe("4/8 joined");
  });

  it("keeps counting after the minimum is reached", () => {
    expect(formatHeadcount(makeEvent({ joinedCount: 12, minPlayers: 10 }))).toBe("12/10 joined");
  });
});

describe("getEvent", () => {
  it("returns an event by id", async () => {
    const event = await getEvent("1");

    expect(event.id).toBe("1");
  });

  it("rejects an unknown event", async () => {
    const result = getEvent("unknown");

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Event not found");
  });
});

describe("listEvents", () => {
  function ids(events: Event[]): string[] {
    return events.map((event) => event.id);
  }

  it("returns every event with its headcount when no filters are set", async () => {
    const events = await listEvents({});

    expect(ids(events)).toEqual(["1", "2"]);
    expect(events[0].headcount).toBe("6/10 joined");
  });

  it("filters by sport, ignoring case", async () => {
    expect(ids(await listEvents({ sport: "soccer" }))).toEqual(["2"]);
  });

  it("filters by skill level", async () => {
    expect(ids(await listEvents({ skillLevel: "Intermediate" }))).toEqual(["1"]);
  });

  it("filters by date", async () => {
    addEvent(makeEvent({ id: "dated", dateTime: "2030-06-15T18:00:00.000Z" }));

    expect(ids(await listEvents({ date: "2030-06-15" }))).toEqual(["dated"]);
  });

  it("requires every filter to match", async () => {
    expect(await listEvents({ sport: "Basketball", skillLevel: "Beginner" })).toEqual([]);
  });

  it("returns an empty list for a sport with no events", async () => {
    expect(await listEvents({ sport: "Curling" })).toEqual([]);
  });

  it("rejects an invalid skill level", async () => {
    const result = listEvents({ skillLevel: "Expert" });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid skill level");
  });

  it("rejects a date that is not in YYYY-MM-DD format", async () => {
    const result = listEvents({ date: "10/21/2026" });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid date");
  });

  it("rejects a date that does not exist", async () => {
    await expect(listEvents({ date: "2026-13-45" })).rejects.toThrow("Invalid date");
  });
});

describe("createEvent", () => {
  const validInput = {
    sport: "Volleyball",
    venue: "Fieldhouse",
    dateTime: "2030-06-15T18:00:00.000Z",
    minPlayers: 8,
    skillLevel: "Beginner",
    host: "Taylor R.",
  };

  it("builds a new open event hosted by the creator", async () => {
    const event = await createEvent(validInput);

    expect(event.name).toBe("Taylor R.'s Volleyball Game");
    expect(event.joinedCount).toBe(1);
    expect(event.roster).toEqual(["Taylor R."]);
    expect(event.status).toBe("open");
  });

  it("saves the new event", async () => {
    const event = await createEvent(validInput);

    expect(getEventById(event.id)).toBeDefined();
  });

  it("leaves out an empty description", async () => {
    const event = await createEvent({ ...validInput, description: "" });

    expect(event).not.toHaveProperty("description");
  });

  it("rejects missing or blank fields", async () => {
    const result = createEvent({ ...validInput, sport: "  " });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid event data");
  });

  it("rejects min players greater than max players", async () => {
    await expect(createEvent({ ...validInput, maxPlayers: 4 })).rejects.toThrow(ValidationError);
  });

  it("rejects an unknown skill level", async () => {
    await expect(createEvent({ ...validInput, skillLevel: "Expert" })).rejects.toThrow(ValidationError);
  });

  it("rejects input that is not an object", async () => {
    await expect(createEvent("not an object")).rejects.toThrow(ValidationError);
  });
});

import {
  addEvent,
  getEventById,
  resetEvents,
} from "../../src/repositories/eventRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../src/services/errors";
import { joinEvent, leaveEvent } from "../../src/services/eventService";
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

beforeEach(() => {
  resetEvents();
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

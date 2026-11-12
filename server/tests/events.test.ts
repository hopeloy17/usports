import request from "supertest";
import { app } from "../src/app";
import * as eventRepository from "../src/repositories/eventRepository";
import * as database from "../src/db";
import { mockEvents } from "../src/data/events";
import { Event } from "../src/types/event";

const validEvent = {
  sport: "Volleyball",
  venue: "Fieldhouse",
  dateTime: "2026-10-12T18:00:00.000Z",
  minPlayers: 8,
  skillLevel: "Beginner",
  host: "Taylor R.",
};

let testEvents: Event[];

jest.spyOn(eventRepository, "getAllEvents");
jest.spyOn(eventRepository, "getEventById");
jest.spyOn(eventRepository, "addEvent");
jest.spyOn(eventRepository, "updateEvent");
jest.spyOn(eventRepository, "deleteEvent");
jest.spyOn(eventRepository, "addEventParticipant");
jest.spyOn(eventRepository, "removeEventParticipant");
jest.spyOn(database, "getParticipantStatus");

beforeEach(() => {
  testEvents = structuredClone(mockEvents);

  jest.mocked(eventRepository.getAllEvents).mockImplementation(async (filters = {}) =>
    testEvents.filter((event) =>
      (typeof filters.sport !== "string" ||
        event.sport.toLowerCase() === filters.sport.toLowerCase()) &&
      (typeof filters.date !== "string" ||
        event.dateTime.startsWith(filters.date)),
    ),
  );
  jest.mocked(eventRepository.getEventById).mockImplementation(async (id) =>
    testEvents.find((event) => event.id === id),
  );
  jest.mocked(eventRepository.addEvent).mockImplementation((event) => {
    testEvents = [...testEvents, event];
    return event;
  });
  jest.mocked(eventRepository.updateEvent).mockImplementation(async (id, updates) => {
    const event = testEvents.find((candidate) => candidate.id === id);
    if (!event) return undefined;
    const updated = { ...event, ...updates };
    testEvents = testEvents.map((candidate) => candidate.id === id ? updated : candidate);
    return updated;
  });
  jest.mocked(eventRepository.deleteEvent).mockImplementation(async (id) => {
    if (!testEvents.some((event) => event.id === id)) return false;
    testEvents = testEvents.filter((event) => event.id !== id);
    return true;
  });
  jest.mocked(database.getParticipantStatus).mockImplementation(async (eventId, userId) => {
    const event = testEvents.find((candidate) => candidate.id === eventId);
    return event && (event.hostId === userId || event.roster.includes(userId))
      ? "going"
      : null;
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

describe("GET /api/health", () => {
  it("returns a healthy status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/events", () => {
  it("returns the hardcoded events", async () => {
    const response = await request(app).get("/api/events");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty("sport");
    expect(response.body[0]).toHaveProperty("venue");
  });

  it("gives every event a valid status", async () => {
    const response = await request(app).get("/api/events");

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    for (const event of response.body) {
      expect(["open", "full", "cancelled"]).toContain(event.status);
    }
  });

  it("includes each event's headcount for the feed", async () => {
    const response = await request(app).get("/api/events");

    expect(response.body[0].headcount).toBe("6/10 joined");
  });
});

describe("GET /api/events/:id", () => {
  it("returns an event by id", async () => {
    const response = await request(app).get("/api/events/1");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe("1");
  });

  it("returns 404 for an unknown event", async () => {
    const response = await request(app).get("/api/events/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });
});

describe("POST /api/events", () => {
  it("creates a valid event", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({
        sport: "Volleyball",
        venue: "Fieldhouse",
        dateTime: "2026-10-12T18:00:00.000Z",
        minPlayers: 8,
        skillLevel: "Beginner",
        host: "Taylor R.",
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Taylor R.'s Volleyball Game");
    expect(response.body.joinedCount).toBe(1);
    expect(response.body.roster).toEqual(["Taylor R."]);
  });

  it("rejects invalid event data", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ sport: "", minPlayers: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid event data" });
  });

  it("rejects non-object body in POST /api/events", async () => {
    const response = await request(app)
      .post("/api/events")
      .set("Content-Type", "text/plain")
      .send("not an object");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid event data" });
  });


  it("creates an event with a valid max players", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, maxPlayers: 12 });

    expect(response.status).toBe(201);
    expect(response.body.maxPlayers).toBe(12);
  });

  it("allows min players to equal max players", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, maxPlayers: 8 });

    expect(response.status).toBe(201);
    expect(response.body.maxPlayers).toBe(8);
  });

  it("rejects min players greater than max players", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, maxPlayers: 4 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid event data" });
  });

  it("rejects a non-integer max players", async () => {
    const response = await request(app)
      .post("/api/events")
      .send({ ...validEvent, maxPlayers: 10.5 });

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/events/:id", () => {
  it("updates an existing event", async () => {
    const response = await request(app)
      .patch("/api/events/1")
      .send({ venue: "New Fieldhouse" });

    expect(response.status).toBe(200);
    expect(response.body.venue).toBe("New Fieldhouse");
  });

  it("returns 404 when updating an unknown event", async () => {
    const response = await request(app)
      .patch("/api/events/unknown")
      .send({ venue: "New Fieldhouse" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("rejects invalid non-object payload", async () => {
    const response = await request(app)
      .patch("/api/events/1")
      .set("Content-Type", "text/plain")
      .send("not a json object");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid event data" });
  });

});

describe("DELETE /api/events/:id", () => {
  it("deletes an existing event", async () => {
    const deleteResponse = await request(app).delete("/api/events/1");

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get("/api/events/1");
    expect(getResponse.status).toBe(404);
  });

  it("returns 404 when deleting an unknown event", async () => {
    const response = await request(app).delete("/api/events/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });
});

describe("POST /api/events/:id/join", () => {
  it("adds a participant to an event", async () => {
    const response = await request(app)
      .post("/api/events/1/join")
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(7);
    expect(response.body.roster).toContain("Jordan P.");
  });

  it("returns 404 when joining an unknown event", async () => {
    const response = await request(app)
      .post("/api/events/unknown/join")
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("rejects joining without a participant", async () => {
    const response = await request(app)
      .post("/api/events/1/join")
      .set("x-user-id", "");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User ID is required" });
  });

  it("rejects duplicate participants", async () => {
    const response = await request(app)
      .post("/api/events/1/join")
      .set("x-user-id", "Sarah M.");

    expect(response.status).toBe(409);
  });

  it("rejects joining an event at max capacity", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 1, maxPlayers: 1 });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Event is full" });
  });
    it("marks an event full when the last spot is taken", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 2, maxPlayers: 2 });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("full");
  });

  it("rejects joining a cancelled event", async () => {
    const created = await request(app).post("/api/events").send(validEvent);
    await request(app)
      .patch(`/api/events/${created.body.id}`)
      .send({ status: "cancelled" });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Event is cancelled" });
  });

  it("allows joining past min players when there is no max", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 1 });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(2);
  });
});

describe("DELETE /api/events/:id/join", () => {
  it("removes a participant from an event", async () => {
    const response = await request(app)
      .delete("/api/events/1/join")
      .set("x-user-id", "Sarah M.");

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(5);
    expect(response.body.roster).not.toContain("Sarah M.");
  });

  it("reopens a full event when someone leaves", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 2, maxPlayers: 2 });
    await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    const response = await request(app)
      .delete(`/api/events/${created.body.id}/join`)
      .set("x-user-id", "Jordan P.");

    expect(response.body.status).toBe("open");
  });
  
  it("returns 404 when leaving an unknown event", async () => {
    const response = await request(app)
      .delete("/api/events/unknown/join")
      .set("x-user-id", "Sarah M.");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("returns 404 when participant is not in the roster", async () => {
    const response = await request(app)
      .delete("/api/events/1/join")
      .set("x-user-id", "NonExistentPlayer");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Participant not found" });
  });

  it("rejects when the host attempts to leave the event", async () => {
    const response = await request(app)
      .delete("/api/events/1/join")
      .set("x-user-id", "host-john");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "The host cannot leave the event" });
  });

  it("no longer accepts the old POST /leave route", async () => {
    const response = await request(app)
      .post("/api/events/1/leave")
      .set("x-user-id", "Sarah M.");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Route not found" });
  });
});

describe("Unexpected errors", () => {
  it("returns 500 with a generic message when something unexpected fails", async () => {
    jest.spyOn(eventRepository, "getAllEvents").mockImplementation(() => {
      throw new Error("Database connection lost");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/events");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const response = await request(app)
      .post("/api/events")
      .set("Content-Type", "application/json")
      .send("{ not valid json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid JSON body" });
  });
});

describe("Unknown routes", () => {
  it("returns 404 for undefined routes", async () => {
    const response = await request(app).get("/api/unknown-endpoint");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Route not found" });
  });
});

describe("GET /api/events with filters", () => {
  it("filters events by sport", async () => {
    const response = await request(app).get("/api/events?sport=Soccer");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe("2");
  });

  it("matches sport case-insensitively", async () => {
    const response = await request(app).get("/api/events?sport=soccer");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe("2");
  });

  it("filters events by skill level", async () => {
    const response = await request(app).get("/api/events?skillLevel=Intermediate");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe("1");
  });

  it("filters events by date", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, dateTime: "2027-10-21T18:00:00.000Z" });

    const response = await request(app).get("/api/events?date=2027-10-21");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(created.body.id);
  });

  it("combines filters so every filter must match", async () => {
    const response = await request(app).get(
      "/api/events?sport=Basketball&skillLevel=Beginner",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns an empty list for a sport with no events", async () => {
    const response = await request(app).get("/api/events?sport=Curling");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("rejects an invalid skill level", async () => {
    const response = await request(app).get("/api/events?skillLevel=Expert");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid skill level" });
  });

  it("rejects a date that is not in YYYY-MM-DD format", async () => {
    const response = await request(app).get("/api/events?date=10/21/2026");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid date" });
  });

  it("rejects a date that does not exist", async () => {
    const response = await request(app).get("/api/events?date=2026-13-45");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid date" });
  });
});

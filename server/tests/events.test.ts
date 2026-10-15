import request from "supertest";
import { app } from "../src/app";
import { resetEvents } from "../src/repositories/eventRepository";
import { response } from "express";

const validEvent = {
  sport: "Volleyball",
  venue: "Fieldhouse",
  dateTime: "2026-10-12T18:00:00.000Z",
  minPlayers: 8,
  skillLevel: "Beginner",
  host: "Taylor R.",
};

beforeEach(() => {
  resetEvents();
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
      .send({ participant: "Jordan P." });

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(7);
    expect(response.body.roster).toContain("Jordan P.");
  });

  it("returns 404 when joining an unknown event", async () => {
    const response = await request(app)
      .post("/api/events/unknown/join")
      .send({ participant: "Jordan P." });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("rejects joining without a participant", async () => {
    const response = await request(app)
      .post("/api/events/1/join")
      .send({ participant: "" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Participant is required" });
  });

  it("rejects duplicate participants", async () => {
    const response = await request(app)
      .post("/api/events/1/join")
      .send({ participant: "Sarah M." });

    expect(response.status).toBe(409);
  });

  it("rejects joining an event at max capacity", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 1, maxPlayers: 1 });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .send({ participant: "Jordan P." });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Event is full" });
  });

  it("allows joining past min players when there is no max", async () => {
    const created = await request(app)
      .post("/api/events")
      .send({ ...validEvent, minPlayers: 1 });

    const response = await request(app)
      .post(`/api/events/${created.body.id}/join`)
      .send({ participant: "Jordan P." });

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(2);
  });
});

describe("POST /api/events/:id/leave", () => {
  it("removes a participant from an event", async () => {
    const response = await request(app)
      .post("/api/events/1/leave")
      .send({ participant: "Sarah M." });

    expect(response.status).toBe(200);
    expect(response.body.joinedCount).toBe(5);
    expect(response.body.roster).not.toContain("Sarah M.");
  });

  it("returns 404 when leaving an unknown event", async () => {
    const response = await request(app)
      .post("/api/events/unknown/leave")
      .send({ participant: "Sarah M." });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Event not found" });
  });

  it("returns 404 when participant is not in the roster", async () => {
    const response = await request(app)
      .post("/api/events/1/leave")
      .send({ participant: "NonExistentPlayer" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Participant not found" });
  });

  it("rejects when the host attempts to leave the event", async () => {
    const response = await request(app)
      .post("/api/events/1/leave")
      .send({ participant: "John D." });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "The host cannot leave the event" });
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

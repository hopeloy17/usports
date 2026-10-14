import request from "supertest";
import { app } from "../src/app";
import { resetEvents } from "../src/repositories/eventRepository";

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
});

describe("DELETE /api/events/:id", () => {
  it("deletes an existing event", async () => {
    const deleteResponse = await request(app).delete("/api/events/1");

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get("/api/events/1");
    expect(getResponse.status).toBe(404);
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
});

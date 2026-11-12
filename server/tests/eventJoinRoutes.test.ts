import request from "supertest";
import { app } from "../src/app";
import { joinEvent, leaveEvent } from "../src/services/eventService";
import { ConflictError } from "../src/services/errors";

jest.mock("../src/services/eventService", () => ({
  createEvent: jest.fn(),
  getEvent: jest.fn(),
  joinEvent: jest.fn(),
  leaveEvent: jest.fn(),
  listEvents: jest.fn(),
}));

const mockedJoinEvent = jest.mocked(joinEvent);
const mockedLeaveEvent = jest.mocked(leaveEvent);

const updatedEvent = {
  id: "event-1",
  name: "Casual 3v3 Runs",
  sport: "Basketball",
  venue: "Fieldhouse",
  dateTime: "2030-06-15T18:00:00.000Z",
  joinedCount: 2,
  minPlayers: 4,
  maxPlayers: 6,
  skillLevel: null,
  status: "open" as const,
  hostId: "user-1",
  host: "Alex Johnson",
  roster: ["Alex Johnson", "Jordan Smith"],
};

describe("event join routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedJoinEvent.mockResolvedValue(updatedEvent);
    mockedLeaveEvent.mockResolvedValue(updatedEvent);
  });

  it("passes x-user-id to the join service", async () => {
    const response = await request(app)
      .post("/api/events/event-1/join")
      .set("x-user-id", "user-2");

    expect(response.status).toBe(200);
    expect(mockedJoinEvent).toHaveBeenCalledWith("event-1", "user-2");
    expect(response.body).toEqual(updatedEvent);
  });

  it("passes x-user-id to the leave service", async () => {
    const response = await request(app)
      .delete("/api/events/event-1/join")
      .set("x-user-id", "user-2");

    expect(response.status).toBe(200);
    expect(mockedLeaveEvent).toHaveBeenCalledWith("event-1", "user-2");
    expect(response.body).toEqual(updatedEvent);
  });

  it("returns a conflict when the service reports a full event", async () => {
    mockedJoinEvent.mockRejectedValue(new ConflictError("Event is full"));

    const response = await request(app)
      .post("/api/events/event-1/join")
      .set("x-user-id", "user-2");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Event is full" });
  });

  it("rejects a join without x-user-id", async () => {
    const response = await request(app).post("/api/events/event-1/join");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User ID is required" });
    expect(mockedJoinEvent).not.toHaveBeenCalled();
  });

  it("rejects a leave without x-user-id", async () => {
    const response = await request(app).delete("/api/events/event-1/join");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User ID is required" });
    expect(mockedLeaveEvent).not.toHaveBeenCalled();
  });
});

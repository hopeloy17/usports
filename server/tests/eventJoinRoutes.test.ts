// Route tests for joining and leaving a game:
//   POST   /api/events/:id/join -> the signed-in student joins
//   DELETE /api/events/:id/join -> the signed-in student leaves
//
// Who joins or leaves comes ONLY from their sign-in token, so nobody can join or leave a game
// as someone else.
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

// Fake the sign-in token check so these tests don't talk to Supabase. A token
// "test-token:<id>" counts as a valid sign-in as <id>; any other token is invalid or expired
jest.mock("../src/auth/verifyAccessToken", () => ({
  verifyAccessToken: async (token: string) =>
    token.startsWith("test-token:") ? decodeURIComponent(token.slice("test-token:".length)) : null,
}));

const mockedJoinEvent = jest.mocked(joinEvent);
const mockedLeaveEvent = jest.mocked(leaveEvent);

// The Authorization header for a request signed in as `userId`
function signedInAs(userId: string): string {
  return `Bearer test-token:${encodeURIComponent(userId)}`;
}

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

  it("passes the signed-in student's id to the join service", async () => {
    const response = await request(app)
      .post("/api/events/event-1/join")
      .set("Authorization", signedInAs("user-2"));

    expect(response.status).toBe(200);
    expect(mockedJoinEvent).toHaveBeenCalledWith("event-1", "user-2");
    expect(response.body).toEqual(updatedEvent);
  });

  it("passes the signed-in student's id to the leave service", async () => {
    const response = await request(app)
      .delete("/api/events/event-1/join")
      .set("Authorization", signedInAs("user-2"));

    expect(response.status).toBe(200);
    expect(mockedLeaveEvent).toHaveBeenCalledWith("event-1", "user-2");
    expect(response.body).toEqual(updatedEvent);
  });

  it("returns a conflict when the service reports a full event", async () => {
    mockedJoinEvent.mockRejectedValue(new ConflictError("Event is full"));

    const response = await request(app)
      .post("/api/events/event-1/join")
      .set("Authorization", signedInAs("user-2"));

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Event is full" });
  });

  it("rejects a join without a sign-in token", async () => {
    const response = await request(app).post("/api/events/event-1/join");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Please sign in" });
    expect(mockedJoinEvent).not.toHaveBeenCalled();
  });

  it("rejects a leave without a sign-in token", async () => {
    const response = await request(app).delete("/api/events/event-1/join");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Please sign in" });
    expect(mockedLeaveEvent).not.toHaveBeenCalled();
  });

  it("can't join or leave as someone else by claiming their id", async () => {
    // A claimed id alone gets nowhere...
    const unsigned = await request(app).post("/api/events/event-1/join").set("x-user-id", "user-3");
    expect(unsigned.status).toBe(401);

    // ...and with a token, the token's id is the one used
    await request(app)
      .post("/api/events/event-1/join")
      .set("Authorization", signedInAs("user-2"))
      .set("x-user-id", "user-3");
    await request(app)
      .delete("/api/events/event-1/join")
      .set("Authorization", signedInAs("user-2"))
      .set("x-user-id", "user-3");

    expect(mockedJoinEvent).toHaveBeenCalledWith("event-1", "user-2");
    expect(mockedLeaveEvent).toHaveBeenCalledWith("event-1", "user-2");
  });
});

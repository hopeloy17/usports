// The real token check asks Supabase. These tests use a stand-in that accepts tokens shaped
// "test-token:<user id>" and rejects everything else, like the other route tests do
jest.mock("../src/auth/verifyAccessToken", () => ({
  verifyAccessToken: async (token: string) =>
    token.startsWith("test-token:") ? decodeURIComponent(token.slice("test-token:".length)) : null,
}));

import request from "supertest";
import { app } from "../src/app";
import { upsertPushToken } from "../src/db/notifications";

jest.mock("../src/db/notifications", () => ({
  upsertPushToken: jest.fn(),
}));

const mockedUpsertPushToken = jest.mocked(upsertPushToken);
const validToken = "ExponentPushToken[abc123]";

// The Authorization header a signed-in student's app sends
function signedInAs(userId: string): string {
  return `Bearer test-token:${encodeURIComponent(userId)}`;
}

describe("PUT /api/push-tokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpsertPushToken.mockResolvedValue();
  });

  it("saves the token for the signed-in student", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("Authorization", signedInAs("user-1"))
      .send({ token: validToken });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ token: validToken });
    expect(mockedUpsertPushToken).toHaveBeenCalledWith("user-1", validToken);
  });

  it("rejects a request without signing in", async () => {
    const response = await request(app).put("/api/push-tokens").send({ token: validToken });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Please sign in" });
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("ignores an x-user-id header, since anyone could set it", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("x-user-id", "user-1")
      .send({ token: validToken });

    expect(response.status).toBe(401);
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("Authorization", signedInAs("user-1"))
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "A valid Expo push token is required" });
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects a token that is not an Expo push token", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("Authorization", signedInAs("user-1"))
      .send({ token: "not-a-token" });

    expect(response.status).toBe(400);
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("Authorization", signedInAs("user-1"))
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 500 when the token cannot be saved", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockedUpsertPushToken.mockRejectedValue(new Error("database down"));

    const response = await request(app)
      .put("/api/push-tokens")
      .set("Authorization", signedInAs("user-1"))
      .send({ token: validToken });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
});

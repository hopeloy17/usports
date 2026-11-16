import request from "supertest";
import { app } from "../src/app";
import { upsertPushToken } from "../src/db/notifications";

jest.mock("../src/db/notifications", () => ({
  upsertPushToken: jest.fn(),
}));

const mockedUpsertPushToken = jest.mocked(upsertPushToken);
const validToken = "ExponentPushToken[abc123]";

describe("PUT /api/push-tokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpsertPushToken.mockResolvedValue();
  });

  it("saves the token for the requesting user", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("x-user-id", "user-1")
      .send({ token: validToken });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ token: validToken });
    expect(mockedUpsertPushToken).toHaveBeenCalledWith("user-1", validToken);
  });

  it("rejects a request without x-user-id", async () => {
    const response = await request(app).put("/api/push-tokens").send({ token: validToken });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User ID is required" });
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("x-user-id", "user-1")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "A valid Expo push token is required" });
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects a token that is not an Expo push token", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("x-user-id", "user-1")
      .send({ token: "not-a-token" });

    expect(response.status).toBe(400);
    expect(mockedUpsertPushToken).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const response = await request(app)
      .put("/api/push-tokens")
      .set("x-user-id", "user-1")
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
      .set("x-user-id", "user-1")
      .send({ token: validToken });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
});

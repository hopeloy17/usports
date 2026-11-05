// Fake Zuriel's database functions so these tests never reach Supabase
// (same reason as tests/services/profileService.test.ts)
jest.mock("../src/db", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

import request from "supertest";
import { app } from "../src/app";
import { getProfile, updateProfile } from "../src/db";

const mockedGetProfile = jest.mocked(getProfile);
const mockedUpdateProfile = jest.mocked(updateProfile);

// A valid UUID for the user making the request
const USER_ID = "11111111-1111-4111-8111-111111111111";

// Until sign-up exists, the client says who it is with this header
const USER_HEADER = "x-user-id";

// A users-table row as the database returns it (snake_case)
function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: "Hope L.",
    school_email: "hl@calvin.edu",
    email_verified: true,
    email_verified_at: "2026-11-01T00:00:00Z",
    class_year: 2027,
    bio: "Pickup basketball fan",
    profile_photo_url: null,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

// Reset fakes between tests; restoreAllMocks also undoes any console.error silencing
beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/profile", () => {
  it("returns the requesting user's profile", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());

    const response = await request(app).get("/api/profile").set(USER_HEADER, USER_ID);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: USER_ID,
      name: "Hope L.",
      schoolEmail: "hl@calvin.edu",
      classYear: 2027,
      bio: "Pickup basketball fan",
      profilePhotoUrl: null,
    });
    // The id must come from the header, not anywhere else
    expect(mockedGetProfile).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 400 when the user id header is missing", async () => {
    const response = await request(app).get("/api/profile");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User id is required" });
  });

  it("returns 400 when the user id is not a UUID", async () => {
    const response = await request(app).get("/api/profile").set(USER_HEADER, "abc");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid user id" });
  });

  it("returns 404 when the user does not exist", async () => {
    mockedGetProfile.mockResolvedValue(null);

    const response = await request(app).get("/api/profile").set(USER_HEADER, USER_ID);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Profile not found" });
  });

  it("returns 500 without leaking details when the database fails", async () => {
    mockedGetProfile.mockRejectedValue(new Error("getProfile failed: connection refused"));
    // The error handler logs unexpected errors; keep the test output clean
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/profile").set(USER_HEADER, USER_ID);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
});

describe("PUT /api/profile", () => {
  it("updates the profile and returns it", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());
    mockedUpdateProfile.mockResolvedValue(makeUserRow({ bio: "Volleyball too", class_year: 2028 }));

    const response = await request(app)
      .put("/api/profile")
      .set(USER_HEADER, USER_ID)
      .send({ bio: "Volleyball too", classYear: 2028 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ bio: "Volleyball too", classYear: 2028 });
    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, {
      bio: "Volleyball too",
      class_year: 2028,
    });
  });

  it("returns 400 for a field that cannot be edited", async () => {
    const response = await request(app)
      .put("/api/profile")
      .set(USER_HEADER, USER_ID)
      .send({ schoolEmail: "x@gmail.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Field cannot be updated: schoolEmail" });
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid value", async () => {
    const response = await request(app)
      .put("/api/profile")
      .set(USER_HEADER, USER_ID)
      .send({ classYear: 1999 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid class year" });
  });

  it("returns 400 when the user id header is missing", async () => {
    const response = await request(app).put("/api/profile").send({ bio: "Hi" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "User id is required" });
  });

  it("returns 404 when the user does not exist", async () => {
    mockedGetProfile.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/profile")
      .set(USER_HEADER, USER_ID)
      .send({ bio: "Hi" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Profile not found" });
  });
});

describe("CORS for /api/profile", () => {
  it("allows browsers to send PUT requests with the user id header", async () => {
    // Browsers send this "preflight" OPTIONS request before a cross-origin PUT
    const response = await request(app).options("/api/profile");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("PUT");
    expect(response.headers["access-control-allow-headers"]).toContain("x-user-id");
  });
});

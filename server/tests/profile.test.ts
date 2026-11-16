// Route tests for the signed-in student's own profile:
//   GET /api/profile  -> their profile
//   PUT /api/profile  -> update their name, bio, and/or class year
//
// Who's asking comes ONLY from their sign-in token ("Authorization: Bearer <token>"), which the
// server checks with Supabase. A user id the request claims anywhere else (like the old
// x-user-id header) is ignored, so nobody can read or edit someone else's profile.

// Fake Zuriel's database functions so these tests never reach Supabase
// (same reason as tests/services/profileService.test.ts)
jest.mock("../src/db", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

// Fake the sign-in token check, so these tests don't talk to Supabase either. A token
// "test-token:<id>" counts as a valid sign-in as <id>; any other token is invalid or expired.
// (A plain function, not jest.fn(), so resetAllMocks below leaves it working.)
jest.mock("../src/auth/verifyAccessToken", () => ({
  verifyAccessToken: async (token: string) =>
    token.startsWith("test-token:") ? decodeURIComponent(token.slice("test-token:".length)) : null,
}));

import request from "supertest";
import { app } from "../src/app";
import { getProfile, updateProfile } from "../src/db";

const mockedGetProfile = jest.mocked(getProfile);
const mockedUpdateProfile = jest.mocked(updateProfile);

// A valid UUID for the signed-in student, and someone else they might try to pose as
const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

// The Authorization header for a request signed in as `userId`
function signedInAs(userId: string): string {
  return `Bearer test-token:${encodeURIComponent(userId)}`;
}

// The messages for requests that aren't signed in (must match src/auth/requestUser.ts)
const SIGN_IN_REQUIRED = "Please sign in";
const SIGN_IN_EXPIRED = "Your sign-in has expired. Please sign in again";

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
  it("returns the signed-in student's profile", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());

    const response = await request(app).get("/api/profile").set("Authorization", signedInAs(USER_ID));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: USER_ID,
      name: "Hope L.",
      schoolEmail: "hl@calvin.edu",
      classYear: 2027,
      bio: "Pickup basketball fan",
      profilePhotoUrl: null,
    });
    // The id comes from the sign-in token, not anywhere else
    expect(mockedGetProfile).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 401 when the request has no sign-in token", async () => {
    const response = await request(app).get("/api/profile");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: SIGN_IN_REQUIRED });
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it("returns 401 for a made-up, edited, or expired token", async () => {
    const response = await request(app).get("/api/profile").set("Authorization", "Bearer forged-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: SIGN_IN_EXPIRED });
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header isn't a Bearer token", async () => {
    const response = await request(app).get("/api/profile").set("Authorization", "Basic abc123");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: SIGN_IN_REQUIRED });
  });

  it("ignores x-user-id: claiming someone else's id doesn't get their profile", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());

    // Without a token, the claimed id alone gets nowhere
    const unsigned = await request(app).get("/api/profile").set("x-user-id", OTHER_USER_ID);
    expect(unsigned.status).toBe(401);

    // With a token, the token's id wins over the claimed one
    await request(app)
      .get("/api/profile")
      .set("Authorization", signedInAs(USER_ID))
      .set("x-user-id", OTHER_USER_ID);
    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
    expect(mockedGetProfile).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 400 when the id in the token is not a UUID", async () => {
    const response = await request(app).get("/api/profile").set("Authorization", signedInAs("abc"));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid user id" });
  });

  it("returns 404 when the user does not exist", async () => {
    mockedGetProfile.mockResolvedValue(null);

    const response = await request(app).get("/api/profile").set("Authorization", signedInAs(USER_ID));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Profile not found" });
  });

  it("returns 500 without leaking details when the database fails", async () => {
    mockedGetProfile.mockRejectedValue(new Error("getProfile failed: connection refused"));
    // The error handler logs unexpected errors; keep the test output clean
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/profile").set("Authorization", signedInAs(USER_ID));

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
      .set("Authorization", signedInAs(USER_ID))
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
      .set("Authorization", signedInAs(USER_ID))
      .send({ schoolEmail: "x@gmail.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Field cannot be updated: schoolEmail" });
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid value", async () => {
    const response = await request(app)
      .put("/api/profile")
      .set("Authorization", signedInAs(USER_ID))
      .send({ classYear: 1999 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid class year" });
  });

  it("returns 401 when the request has no sign-in token", async () => {
    const response = await request(app).put("/api/profile").send({ bio: "Hi" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: SIGN_IN_REQUIRED });
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("can't edit someone else's profile by claiming their id", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());
    mockedUpdateProfile.mockResolvedValue(makeUserRow({ bio: "Hi" }));

    await request(app)
      .put("/api/profile")
      .set("Authorization", signedInAs(USER_ID))
      .set("x-user-id", OTHER_USER_ID)
      .send({ bio: "Hi" });

    // Only the signed-in student's own profile is changed
    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, { bio: "Hi" });
  });

  it("returns 404 when the user does not exist", async () => {
    mockedGetProfile.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/profile")
      .set("Authorization", signedInAs(USER_ID))
      .send({ bio: "Hi" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Profile not found" });
  });
});

describe("CORS for /api/profile", () => {
  it("allows browsers to send PUT requests with a sign-in token", async () => {
    // Browsers send this "preflight" OPTIONS request before a cross-origin PUT
    const response = await request(app).options("/api/profile");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("PUT");
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
    // The old way of saying who you are is no longer accepted at all
    expect(response.headers["access-control-allow-headers"]).not.toContain("x-user-id");
  });
});

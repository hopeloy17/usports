// Replace Zuriel's database functions with fakes BEFORE anything imports them.
// The factory matters: without it Jest would load the real db/client.ts,
// which throws when server/.env is missing — and tests must never hit the real DB anyway.
jest.mock("../../src/db", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

import { getProfile, updateProfile } from "../../src/db";
import { NotFoundError, ValidationError } from "../../src/services/errors";
import { getUserProfile, updateUserProfile } from "../../src/services/profileService";

// jest.mocked() gives the fakes proper types so .mockResolvedValue() type-checks
const mockedGetProfile = jest.mocked(getProfile);
const mockedUpdateProfile = jest.mocked(updateProfile);

// A valid UUID to use as the signed-in user's id
const USER_ID = "11111111-1111-4111-8111-111111111111";

// Builds a users-table row in the database's snake_case shape; override any column per test
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

// Team standard: reset fakes between tests so one test's setup can't leak into the next
beforeEach(() => {
  jest.resetAllMocks();
});

describe("getUserProfile", () => {
  it("returns the profile in camelCase without internal columns", async () => {
    // Arrange: the database finds the user
    mockedGetProfile.mockResolvedValue(makeUserRow());

    const profile = await getUserProfile(USER_ID);

    // toEqual (not toMatchObject) so extra fields like email_verified would fail the test
    expect(profile).toEqual({
      id: USER_ID,
      name: "Hope L.",
      schoolEmail: "hl@calvin.edu",
      classYear: 2027,
      bio: "Pickup basketball fan",
      profilePhotoUrl: null,
    });
  });

  it("rejects an id that is not a UUID without querying the database", async () => {
    const result = getUserProfile("abc");

    // Same two-line pattern as eventService.test.ts: check the error type, then the message
    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid user id");
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it("looks up the profile by the given user id", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());

    await getUserProfile(USER_ID);

    expect(mockedGetProfile).toHaveBeenCalledWith(USER_ID);
  });

  // it.each runs the same test once per value: no header at all, and an empty header
  it.each([undefined, ""])("requires a user id (received %p)", async (missingId) => {
    const result = getUserProfile(missingId);

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("User id is required");
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when no user has that id", async () => {
    // Zuriel's getProfile documents null for a missing user
    mockedGetProfile.mockResolvedValue(null);

    const result = getUserProfile(USER_ID);

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Profile not found");
  });
});

describe("updateUserProfile", () => {
  it("saves allowed fields in snake_case and returns the camelCase profile", async () => {
    // Arrange: the user exists (the service checks this first)...
    mockedGetProfile.mockResolvedValue(makeUserRow());
    // ...and the database returns the row after the update
    mockedUpdateProfile.mockResolvedValue(
      makeUserRow({ name: "Hope Loy", bio: "Volleyball too", class_year: 2028 }),
    );

    // Act: the client sends camelCase, like every other endpoint
    const profile = await updateUserProfile(USER_ID, {
      name: "Hope Loy",
      bio: "Volleyball too",
      classYear: 2028,
    });

    // Assert: the database receives snake_case column names
    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, {
      name: "Hope Loy",
      bio: "Volleyball too",
      class_year: 2028,
    });
    // ...and the caller gets the public camelCase shape back
    expect(profile).toEqual({
      id: USER_ID,
      name: "Hope Loy",
      schoolEmail: "hl@calvin.edu",
      classYear: 2028,
      bio: "Volleyball too",
      profilePhotoUrl: null,
    });
  });

  it("rejects fields that cannot be edited without touching the database", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());

    // A user trying to change their verified school email must be stopped here
    const result = updateUserProfile(USER_ID, { schoolEmail: "x@gmail.com" });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Field cannot be updated: schoolEmail");
    // The security guarantee: nothing was written
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("sends only the fields that were provided", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());
    mockedUpdateProfile.mockResolvedValue(makeUserRow({ bio: "New bio" }));

    await updateUserProfile(USER_ID, { bio: "New bio" });

    // name and class_year must not be overwritten when only bio changes
    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, { bio: "New bio" });
  });

  it("allows clearing bio and classYear with null", async () => {
    mockedGetProfile.mockResolvedValue(makeUserRow());
    mockedUpdateProfile.mockResolvedValue(makeUserRow({ bio: null, class_year: null }));

    const profile = await updateUserProfile(USER_ID, { bio: null, classYear: null });

    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, { bio: null, class_year: null });
    expect(profile.bio).toBeNull();
    expect(profile.classYear).toBeNull();
  });

  // Anything that isn't a plain object can't be a set of profile fields
  it.each([null, "hi", 42, ["name"]])("rejects a non-object body (%p)", async (body) => {
    const result = updateUserProfile(USER_ID, body);

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid profile data");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("rejects an update with no fields", async () => {
    const result = updateUserProfile(USER_ID, {});

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("No profile fields to update");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  // name is NOT NULL in the users table, so it can't be blank or cleared
  it.each(["", "   ", null, 7])("rejects an invalid name (%p)", async (name) => {
    const result = updateUserProfile(USER_ID, { name });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid name");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it.each(["a".repeat(501), 5])("rejects an invalid bio (%p)", async (bio) => {
    const result = updateUserProfile(USER_ID, { bio });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid bio");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("accepts a bio of exactly 500 characters", async () => {
    // Boundary check: 500 is the limit, so it must be allowed
    const bio = "a".repeat(500);
    mockedGetProfile.mockResolvedValue(makeUserRow());
    mockedUpdateProfile.mockResolvedValue(makeUserRow({ bio }));

    await updateUserProfile(USER_ID, { bio });

    expect(mockedUpdateProfile).toHaveBeenCalledWith(USER_ID, { bio });
  });

  // Must be a whole number from 2000 to 2100; a numeric string doesn't count
  it.each([2026.5, 1999, 2101, "2027"])("rejects an invalid class year (%p)", async (classYear) => {
    const result = updateUserProfile(USER_ID, { classYear });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid class year");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("throws NotFoundError without updating when the user does not exist", async () => {
    mockedGetProfile.mockResolvedValue(null);

    const result = updateUserProfile(USER_ID, { bio: "Hi" });

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow("Profile not found");
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid user id without querying the database", async () => {
    const result = updateUserProfile("abc", { bio: "Hi" });

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Invalid user id");
    expect(mockedGetProfile).not.toHaveBeenCalled();
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });
});

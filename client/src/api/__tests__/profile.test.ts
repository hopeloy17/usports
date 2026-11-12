import { API_BASE_URL } from "../events";
import {
  DEFAULT_USER_ID,
  fetchProfile,
  resetFallbackProfile,
  updateProfileApi,
} from "../profile";

describe("profile API client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetFallbackProfile();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("fetches the user profile from the server with x-user-id header", async () => {
    const mockProfile = {
      id: DEFAULT_USER_ID,
      name: "Taylor Swift",
      schoolEmail: "ts@calvin.edu",
      classYear: 2027,
      bio: "Music and soccer lover",
      profilePhotoUrl: null,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    const result = await fetchProfile(DEFAULT_USER_ID);

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: {
        "x-user-id": DEFAULT_USER_ID,
      },
    });
    expect(result).toEqual(mockProfile);
  });

  it("throws an error when fetchProfile response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Profile not found" }),
    } as Response);

    await expect(fetchProfile(DEFAULT_USER_ID)).rejects.toThrow(
      "Profile not found",
    );
  });

  it("returns fallback profile when fetchProfile encounters a network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

    const result = await fetchProfile(DEFAULT_USER_ID);
    expect(result).toHaveProperty("id", DEFAULT_USER_ID);
    expect(result).toHaveProperty("name", "You");
  });

  it("updates the profile via PUT /api/profile", async () => {
    const updatedProfile = {
      id: DEFAULT_USER_ID,
      name: "Jordan K.",
      schoolEmail: "student@calvin.edu",
      classYear: 2028,
      bio: "Volleyball player",
      profilePhotoUrl: null,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedProfile,
    } as Response);

    const result = await updateProfileApi(DEFAULT_USER_ID, {
      name: "Jordan K.",
      bio: "Volleyball player",
      classYear: 2028,
    });

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": DEFAULT_USER_ID,
      },
      body: JSON.stringify({
        name: "Jordan K.",
        bio: "Volleyball player",
        classYear: 2028,
      }),
    });
    expect(result).toEqual(updatedProfile);
  });

  it("throws error with server message on validation failure (400)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid name" }),
    } as Response);

    await expect(
      updateProfileApi(DEFAULT_USER_ID, { name: "" }),
    ).rejects.toThrow("Invalid name");
  });

  it("throws error with server message on server failure (500)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Internal server error" }),
    } as Response);

    await expect(
      updateProfileApi(DEFAULT_USER_ID, { name: "Test" }),
    ).rejects.toThrow("Internal server error");
  });
});

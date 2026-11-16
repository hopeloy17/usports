import { API_BASE_URL } from "./events";
import { authHeaders, forgetSignInIfRejected } from "./session";

export const DEFAULT_USER_ID = "11111111-1111-1111-1111-111111111111";

export type ServerProfile = {
  id: string;
  name: string;
  schoolEmail: string;
  classYear: number | null;
  bio: string | null;
  profilePhotoUrl: string | null;
};

export type UpdateProfileInput = {
  name?: string;
  bio?: string | null;
  classYear?: number | null;
};

let fallbackProfile: ServerProfile = {
  id: DEFAULT_USER_ID,
  name: "You",
  schoolEmail: "student@calvin.edu",
  classYear: 2027,
  bio: null,
  profilePhotoUrl: null,
};

export function resetFallbackProfile(): void {
  fallbackProfile = {
    id: DEFAULT_USER_ID,
    name: "You",
    schoolEmail: "student@calvin.edu",
    classYear: 2027,
    bio: null,
    profilePhotoUrl: null,
  };
}

// Who's asking is NOT sent as a user id any more: the server reads the student from their
// sign-in token (authHeaders), which can't be faked. The `_userId` arguments below are kept
// only so the code that calls these functions doesn't have to change.

export async function fetchProfile(
  _userId: string = DEFAULT_USER_ID,
): Promise<ServerProfile> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: authHeaders(),
    });
  } catch (networkError) {
    console.warn(
      `[USports API] Backend server unreachable at ${API_BASE_URL}. Returning local fallback profile.`,
    );
    return fallbackProfile;
  }

  if (!response.ok) {
    // An expired or invalid sign-in token: forget it, so the app goes back to sign-in
    forgetSignInIfRejected(response);
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to fetch profile: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  fallbackProfile = { ...fallbackProfile, ...data };
  return data;
}

export async function updateProfileApi(
  _userId: string = DEFAULT_USER_ID,
  updates: UpdateProfileInput,
): Promise<ServerProfile> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(updates),
    });
  } catch (networkError) {
    console.warn(
      `[USports API] Backend server unreachable at ${API_BASE_URL}. Updating local fallback profile.`,
    );
    fallbackProfile = {
      ...fallbackProfile,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.classYear !== undefined ? { classYear: updates.classYear } : {}),
    };
    return fallbackProfile;
  }

  if (!response.ok) {
    // An expired or invalid sign-in token: forget it, so the app goes back to sign-in
    forgetSignInIfRejected(response);
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to update profile: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  fallbackProfile = { ...fallbackProfile, ...data };
  return data;
}

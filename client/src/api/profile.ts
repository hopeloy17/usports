import { API_BASE_URL } from "./events";

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

// The mock profile uses "me" until sign-in exists; the server needs a real user id
export const resolveUserId = (id?: string) => (id && id !== "me" ? id : DEFAULT_USER_ID);

export async function fetchProfile(
  userId: string = DEFAULT_USER_ID,
): Promise<ServerProfile> {
  const headerId = resolveUserId(userId);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: {
        "x-user-id": headerId,
      },
    });
  } catch (networkError) {
    console.warn(
      `[USports API] Backend server unreachable at ${API_BASE_URL}. Returning local fallback profile.`,
    );
    return fallbackProfile;
  }

  if (!response.ok) {
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
  userId: string = DEFAULT_USER_ID,
  updates: UpdateProfileInput,
): Promise<ServerProfile> {
  const headerId = resolveUserId(userId);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": headerId,
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

import Constants from "expo-constants";
import { Platform } from "react-native";
import { SkillLevel } from "../context/ProfileContext";
import { EventStatus } from "../styles/common";

export type ServerEvent = {
  id: string;
  name: string;
  sport: string;
  venue: string;
  dateTime: string;
  joinedCount: number;
  minPlayers: number;
  maxPlayers?: number;
  skillLevel: SkillLevel | null;
  status: EventStatus;
  host: string;
  roster: string[];
  description?: string;
};

export type CreateEventInput = {
  sport: string;
  venue: string;
  description?: string;
  dateTime: string;
  minPlayers: number;
  maxPlayers?: number;
  skillLevel: SkillLevel;
  host: string;
};

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // When running in Expo Go or development client on a physical device,
  // hostUri points to the host machine's IP (e.g. "192.168.1.5:8081")
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:3000`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
};

export const API_BASE_URL = getBaseUrl();

export type EventFilters = {
  sport?: string;
  date?: string;
};

export async function fetchEvents(
  filters: EventFilters = {},
): Promise<ServerEvent[]> {
  const query = new URLSearchParams();
  if (filters.sport) query.set("sport", filters.sport);
  if (filters.date) query.set("date", filters.date);
  const queryString = query.toString();
  const endpoint = `${API_BASE_URL}/api/events${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function fetchEventById(id: string): Promise<ServerEvent> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch event: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function createEventApi(
  input: CreateEventInput,
): Promise<ServerEvent> {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to create event: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function joinEventApi(
  id: string,
  userId: string,
): Promise<ServerEvent> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/join`, {
    method: "POST",
    headers: { "x-user-id": userId },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to join event: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function leaveEventApi(
  id: string,
  userId: string,
): Promise<ServerEvent> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/join`, {
    method: "DELETE",
    headers: { "x-user-id": userId },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to leave event: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

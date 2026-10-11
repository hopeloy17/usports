import Constants from "expo-constants";
import { Platform } from "react-native";
import { SkillLevel } from "../context/ProfileContext";

export type ServerEvent = {
  id: string;
  name: string;
  sport: string;
  venue: string;
  dateTime: string;
  joinedCount: number;
  minPlayers: number;
  skillLevel: SkillLevel;
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

const getInitialFallbackEvents = (): ServerEvent[] => {
  const today = new Date();
  today.setHours(19, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 30, 0, 0);

  return [
    {
      id: "1",
      name: "John D.'s Basketball Game",
      sport: "Basketball",
      venue: "Spoelhof Fieldhouse",
      dateTime: today.toISOString(),
      joinedCount: 6,
      minPlayers: 10,
      skillLevel: "Intermediate",
      host: "John D.",
      roster: [
        "John D.",
        "Sarah M.",
        "Mike T.",
        "David L.",
        "Emma W.",
        "Chris P.",
      ],
      description: "Casual pickup basketball game at Spoelhof Fieldhouse.",
    },
    {
      id: "2",
      name: "Alex B.'s Soccer Game",
      sport: "Soccer",
      venue: "Gainey Athletic Complex",
      dateTime: tomorrow.toISOString(),
      joinedCount: 2,
      minPlayers: 14,
      skillLevel: "Beginner",
      host: "Alex B.",
      roster: ["Alex B.", "Gary L."],
      description: "Friendly soccer scrimmage at Gainey Athletic Complex.",
    },
  ];
};

let fallbackEvents: ServerEvent[] = getInitialFallbackEvents();

export async function fetchEvents(): Promise<ServerEvent[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/events`);
  } catch (networkError) {
    console.warn(
      `[USports API] Backend server unreachable at ${API_BASE_URL}. Ensure 'npm run dev:server' is running. Using fallback mock data.`,
    );
    return fallbackEvents;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  fallbackEvents = data;
  return data;
}

export async function fetchEventById(id: string): Promise<ServerEvent> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/events/${id}`);
  } catch (networkError) {
    const event = fallbackEvents.find((e) => e.id === id);
    if (event) return event;
    throw new Error(`Event not found: ${id}`);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch event: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

export async function createEventApi(
  input: CreateEventInput,
): Promise<ServerEvent> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (networkError) {
    console.warn(
      `[USports API] Backend server unreachable at ${API_BASE_URL}. Storing event in local fallback state.`,
    );
    const fallbackEvent: ServerEvent = {
      id: Date.now().toString(),
      name: `${input.host}'s ${input.sport} Game`,
      sport: input.sport,
      venue: input.venue,
      dateTime: input.dateTime,
      minPlayers: input.minPlayers,
      skillLevel: input.skillLevel,
      host: input.host,
      roster: [input.host],
      description: input.description,
    };
    fallbackEvents = [...fallbackEvents, fallbackEvent];
    return fallbackEvent;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to create event: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  fallbackEvents = [...fallbackEvents, data];
  return data;
}

export async function joinEventApi(
  id: string,
  participant: string,
): Promise<ServerEvent> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/events/${id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participant }),
    });
  } catch (networkError) {
    const target = fallbackEvents.find((e) => e.id === id);
    if (target) {
      if (!target.roster.includes(participant)) {
        target.roster = [...target.roster, participant];
        target.joinedCount += 1;
      }
      return { ...target };
    }
    throw networkError;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to join event: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

export async function leaveEventApi(
  id: string,
  participant: string,
): Promise<ServerEvent> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/events/${id}/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participant }),
    });
  } catch (networkError) {
    const target = fallbackEvents.find((e) => e.id === id);
    if (target) {
      target.roster = target.roster.filter((p) => p !== participant);
      target.joinedCount = Math.max(0, target.joinedCount - 1);
      return { ...target };
    }
    throw networkError;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error ||
        `Failed to leave event: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

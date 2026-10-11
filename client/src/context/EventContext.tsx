import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createEventApi,
  CreateEventInput,
  fetchEvents,
  joinEventApi,
  leaveEventApi,
  ServerEvent,
} from "../api/events";
import { ProfileContext, SkillLevel } from "./ProfileContext";

// Define the shape of our Event data
export type Event = {
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
  isJoinedByMe: boolean; // Tracks if the current user joined
};

export type NewEventInput = {
  sport: string;
  venue: string;
  description: string;
  dateTime: string;
  minPlayers: number;
  skillLevel: SkillLevel;
  host: string;
};

// Defines what the EventContext can provide
type EventContextType = {
  events: Event[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  toggleJoin: (id: string) => Promise<void>;
  createEvent: (input: NewEventInput) => Promise<void>;
};

// Creates the required Context
const EventContext = createContext<EventContextType | undefined>(undefined);

function toClientEvent(
  serverEvent: ServerEvent,
  currentUser: string,
  createdEventIds: Set<string>,
): Event {
  const isHost = serverEvent.host === currentUser;
  const isCreated = createdEventIds.has(serverEvent.id);
  const isInRoster = serverEvent.roster.includes(currentUser);

  return {
    ...serverEvent,
    isJoinedByMe: isInRoster || isHost || isCreated,
  };
}

export function EventProvider({
  children,
  initialEvents,
}: {
  children: React.ReactNode;
  initialEvents?: Event[];
}) {
  const profileContext = useContext(ProfileContext);
  const currentUser = profileContext?.profile.displayName || "You";

  const createdEventIdsRef = useRef<Set<string>>(new Set());
  const [events, setEvents] = useState<Event[]>(initialEvents ?? []);
  const [loading, setLoading] = useState<boolean>(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const serverEvents = await fetchEvents();
      setEvents(
        serverEvents.map((e) =>
          toClientEvent(e, currentUser, createdEventIdsRef.current),
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load events";
      setError(message);
      console.warn("Could not fetch events from server:", message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!initialEvents) {
      refreshEvents();
    }
  }, [initialEvents, refreshEvents]);

  const toggleJoin = async (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    const isLeaving = target.isJoinedByMe;

    try {
      const updatedServerEvent = isLeaving
        ? await leaveEventApi(id, currentUser)
        : await joinEventApi(id, currentUser);

      if (isLeaving) {
        createdEventIdsRef.current.delete(id);
      }

      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? toClientEvent(
                updatedServerEvent,
                currentUser,
                createdEventIdsRef.current,
              )
            : e,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update event";
      setError(message);
      console.warn("Toggle join failed:", message);
      throw err;
    }
  };

  const createEvent = async (input: NewEventInput) => {
    try {
      const payload: CreateEventInput = {
        sport: input.sport,
        venue: input.venue,
        description: input.description,
        dateTime: input.dateTime,
        minPlayers: input.minPlayers,
        skillLevel: input.skillLevel,
        host: input.host,
      };

      const createdServerEvent = await createEventApi(payload);
      createdEventIdsRef.current.add(createdServerEvent.id);

      const newEvent = toClientEvent(
        createdServerEvent,
        currentUser,
        createdEventIdsRef.current,
      );

      setEvents((prev) => [...prev, newEvent]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create event";
      setError(message);
      console.warn("Create event failed:", message);
      throw err;
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        error,
        refreshEvents,
        toggleJoin,
        createEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

// Custom hook for easy access
export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventProvider");
  }
  return context;
}
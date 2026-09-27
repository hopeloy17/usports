import React, { createContext, useContext, useState } from "react";

// Define the shape of our Event data
export type Event = {
  id: string;
  sport: string;
  venue: string;
  dateTime: string;
  joinedCount: number;
  minPlayers: number;
  skillLevel: skLevel;
  host: string;
  roster: string[];
  isJoinedByMe: boolean; // Tracks if the current user joined
};

export type skLevel = "Amateur" | "Intermediate" | "Pro" | "World Class" | "All Levels"; //skLevel is skill level

type EventContextType = {
  events: Event[];
  toggleJoin: (id: string) => void;
};

// Create the Context
const EventContext = createContext<EventContextType | undefined>(undefined);

const today = new Date();
today.setHours(19, 0, 0, 0);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() +1);
tomorrow.setHours(17, 30, 0, 0);
// Initial mock data mapped to Calvin venues
const initialEvents: Event[] = [
  {
    id: "1",
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
    isJoinedByMe: false,
  },
  {
    id: "2",
    sport: "Soccer",
    venue: "Gainey Athletic Complex",
    dateTime: tomorrow.toISOString(),
    joinedCount: 2,
    minPlayers: 14,
    skillLevel: "All Levels",
    host: "Alex B.",
    roster: ["Alex B.", "Gary L."],
    isJoinedByMe: false,
  },
];

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  const toggleJoin = (id: string) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) => {
        if (event.id === id) {
          const isLeaving = event.isJoinedByMe;
          return {
            ...event,
            isJoinedByMe: !isLeaving,
            joinedCount: isLeaving
              ? event.joinedCount - 1
              : event.joinedCount + 1,
            // Add or remove "You" from the roster for demo purposes
            roster: isLeaving
              ? event.roster.filter((name) => name !== "You")
              : [...event.roster, "You"],
          };
        }
        return event;
      }),
    );
  };

  return (
    <EventContext.Provider value={{ events, toggleJoin }}>
      {children}
    </EventContext.Provider>
  );
}

// Custom hook for easy access
export function useEvents() {
  const context = useContext(EventContext);
  if (!context)
    throw new Error("useEvents must be used within an EventProvider");
  return context;
}

type NewEventInput = {
  sport: string;
  venue: string;
  dateTime: string;
  minPlayers: number;
  // joinedCount: number;
  skillLevel: skLevel;
  host: string;
  // roster: string[];
  // isJoinedByMe: boolean;
}
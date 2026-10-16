import React, { createContext, useContext, useState } from "react";
import type { EventFilters } from "../utils/filterEvents";

type EventFiltersContextType = {
  filters: EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<EventFilters>>;
};

const EventFiltersContext = createContext<EventFiltersContextType | undefined>(undefined);

// Keeps the feed's filters alive while the user visits other screens
export function EventFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<EventFilters>({});

  return (
    <EventFiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </EventFiltersContext.Provider>
  );
}

export function useEventFilters() {
  const context = useContext(EventFiltersContext);
  if (!context)
    throw new Error("useEventFilters must be used within an EventFiltersProvider");
  return context;
}

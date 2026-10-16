import type { Event } from "../context/EventContext";
import type { SkillLevel } from "../context/ProfileContext";

export type EventFilters = {
  sport?: string;
  skillLevel?: SkillLevel;
  date?: string; // "YYYY-MM-DD" in the user's local time
};

// Converts an ISO dateTime into the user's local calendar day as "YYYY-MM-DD"
export function toLocalDateString(dateTime: string): string {
  const date = new Date(dateTime);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Returns only the events that match every filter that is set
export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  return events.filter((event) =>
    (!filters.sport || event.sport.toLowerCase() === filters.sport.toLowerCase()) &&
    (!filters.skillLevel || event.skillLevel === filters.skillLevel) &&
    (!filters.date || toLocalDateString(event.dateTime) === filters.date)
  );
}

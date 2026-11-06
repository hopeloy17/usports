// Zuriel's data functions (in-memory for now, Supabase later)
import {
  addEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../repositories/eventRepository";
import { CreateEventInput, Event, SkillLevel, UpdateEventInput } from "../types/event";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const validSkillLevels: SkillLevel[] = ["Beginner", "Intermediate", "Advanced"];

// An event as shown in the feed, with its headcount ready to display
export type FeedEvent = Event & { headcount: string };

// Filters arrive straight from the query string, so they are checked before use
export type EventListFilters = {
  sport?: unknown;
  skillLevel?: unknown;
  date?: unknown;
};

async function findEvent(eventId: string): Promise<Event> {
  const event = await getEventById(eventId);

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return event;
}

async function saveEvent(eventId: string, updates: UpdateEventInput): Promise<Event> {
  const event = await updateEvent(eventId, updates);

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return event;
}

function hasReachedCapacity(event: Event, joinedCount: number): boolean {
  return event.maxPlayers !== undefined && joinedCount >= event.maxPlayers;
}

// Checks that a date is in YYYY-MM-DD format and is a real calendar date
function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(date);
}

// Makes sure that an event is valid before adding it to the database
function isValidCreateEventInput(body: unknown): body is CreateEventInput {
  if (!body || typeof body !== "object") {
    return false;
  }

  const input = body as Record<string, unknown>;

  return (
    typeof input.sport === "string" && input.sport.trim().length > 0 &&
    typeof input.venue === "string" && input.venue.trim().length > 0 &&
    typeof input.dateTime === "string" && !Number.isNaN(Date.parse(input.dateTime)) &&
    typeof input.minPlayers === "number" && Number.isInteger(input.minPlayers) && input.minPlayers > 0 &&
    ((typeof input.maxPlayers === "number" && Number.isInteger(input.maxPlayers) && input.maxPlayers >= input.minPlayers)
      || typeof input.maxPlayers === "undefined") &&
    typeof input.skillLevel === "string" && validSkillLevels.includes(input.skillLevel as SkillLevel) &&
    typeof input.host === "string" && input.host.trim().length > 0 &&
    (input.description === undefined || typeof input.description === "string")
  );
}

// Shows the joined count against the players needed, such as "4/8 joined"
export function formatHeadcount(event: Pick<Event, "joinedCount" | "minPlayers">): string {
  return `${event.joinedCount}/${event.minPlayers} joined`;
}

export async function getEvent(eventId: string): Promise<Event> {
  return findEvent(eventId);
}

// Returns the feed's events, keeping only those that match every filter given
export async function listEvents(filters: EventListFilters): Promise<FeedEvent[]> {
  const { sport, skillLevel, date } = filters;

  if (skillLevel !== undefined && !validSkillLevels.includes(skillLevel as SkillLevel)) {
    throw new ValidationError("Invalid skill level");
  }

  if (date !== undefined && (typeof date !== "string" || !isValidDateString(date))) {
    throw new ValidationError("Invalid date");
  }

  const events = await getAllEvents();

  return events
    .filter((event) =>
      (typeof sport !== "string" || event.sport.toLowerCase() === sport.toLowerCase()) &&
      (skillLevel === undefined || event.skillLevel === skillLevel) &&
      (date === undefined || new Date(event.dateTime).toISOString().startsWith(date as string))
    )
    .map((event) => ({ ...event, headcount: formatHeadcount(event) }));
}

// Validates the input, then saves a new open event with the host as its first player
export async function createEvent(input: unknown): Promise<Event> {
  if (!isValidCreateEventInput(input)) {
    throw new ValidationError("Invalid event data");
  }

  const newEvent: Event = {
    id: Date.now().toString(),
    name: `${input.host}'s ${input.sport} Game`,
    sport: input.sport,
    venue: input.venue,
    dateTime: input.dateTime,
    joinedCount: 1,
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    skillLevel: input.skillLevel,
    status: "open",
    host: input.host,
    roster: [input.host],
    ...(typeof input.description === "string" && input.description.length > 0
      ? { description: input.description }
      : {}),
  };

  return addEvent(newEvent);
}

// Adds a participant, enforcing the cancelled, double-join, and capacity rules
export async function joinEvent(eventId: string, participant: string): Promise<Event> {
  if (participant.trim().length === 0) {
    throw new ValidationError("Participant is required");
  }

  const event = await findEvent(eventId);

  if (event.status === "cancelled") {
    throw new ConflictError("Event is cancelled");
  }

  if (event.roster.includes(participant)) {
    throw new ConflictError("Participant has already joined");
  }

  if (hasReachedCapacity(event, event.joinedCount)) {
    throw new ConflictError("Event is full");
  }

  const joinedCount = event.joinedCount + 1;

  return saveEvent(eventId, {
    joinedCount,
    roster: [...event.roster, participant],
    status: hasReachedCapacity(event, joinedCount) ? "full" : event.status,
  });
}

// Removes a participant and reopens the event if it was full
export async function leaveEvent(eventId: string, participant: string): Promise<Event> {
  const event = await findEvent(eventId);

  if (!event.roster.includes(participant)) {
    throw new NotFoundError("Participant not found");
  }

  if (participant === event.host) {
    throw new ConflictError("The host cannot leave the event");
  }

  return saveEvent(eventId, {
    joinedCount: event.joinedCount - 1,
    roster: event.roster.filter((name) => name !== participant),
    status: event.status === "full" ? "open" : event.status,
  });
}

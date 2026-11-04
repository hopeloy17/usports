// Zuriel's data functions (in-memory for now, Supabase later)
import { getEventById, updateEvent } from "../repositories/eventRepository";
import { Event, UpdateEventInput } from "../types/event";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

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

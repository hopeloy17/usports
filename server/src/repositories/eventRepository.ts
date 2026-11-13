import { mockEvents } from "../data/events";
import {
  addParticipant,
  EventRowFilter,
  getEventRows,
  removeParticipant,
  updateEventStatus,
} from "../db";
import { Event, EventStatus, SkillLevel, UpdateEventInput } from "../types/event";

type DatabaseParticipantRow = {
status: "going" | "cancelled";
user: { name: string };
};

export type DatabaseEventRow = {
id: string;
host_id: string;
title: string;
start_time: string;
description: string | null;
min_players: number;
max_players: number;
skill_level: DatabaseSkillLevel | null;
status: EventStatus;
host: { name: string };
sport: { name: string };
venue: { name: string };
participants: DatabaseParticipantRow[];
};

type DatabaseSkillLevel = "beginner" | "intermediate" | "advanced";

function toClientSkillLevel(
  skillLevel: DatabaseSkillLevel | null,
): SkillLevel | null {
  if (skillLevel === null) return null;

  return {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  }[skillLevel] as SkillLevel;
}

export function mapDatabaseEvent(row: DatabaseEventRow): Event {
const activeParticipants = row.participants.filter(
(participant) => participant.status === "going",
);

  return {
  id: row.id,
  hostId: row.host_id,
  name: row.title,
  sport: row.sport.name,
  venue: row.venue.name,
  dateTime: row.start_time,
  joinedCount: activeParticipants.length,
  minPlayers: row.min_players,
  maxPlayers: row.max_players,
  skillLevel: toClientSkillLevel(row.skill_level),
  status: row.status,
  host: row.host.name,
  roster: activeParticipants.map((participant) => participant.user.name),
  ...(row.description === null ? {} : { description: row.description }),
  };
}

let events: Event[] = structuredClone(mockEvents);

export async function getAllEvents(filters: EventRowFilter = {}): Promise<Event[]> {
  const rows = await getEventRows(filters);
  return rows.map(mapDatabaseEvent);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  const rows = await getEventRows({});
  const row = rows.find((event) => event.id === id);
  return row ? mapDatabaseEvent(row) : undefined;
}

export async function addEventParticipant(
  eventId: string,
  userId: string,
): Promise<Event | undefined> {
  await addParticipant(eventId, userId);
  const updatedEvent = await getEventById(eventId);

  // Recalculate from active participants so a stale open status cannot allow
  // the response to report an available event after its last spot is taken.
  if (
    updatedEvent?.maxPlayers !== undefined &&
    updatedEvent.joinedCount >= updatedEvent.maxPlayers &&
    updatedEvent.status !== "full"
  ) {
    await updateEventStatus(eventId, "full");
    updatedEvent.status = "full";
  }

  return updatedEvent;
}

export async function removeEventParticipant(
  eventId: string,
  userId: string,
): Promise<Event | undefined> {
  await removeParticipant(eventId, userId);
  const updatedEvent = await getEventById(eventId);

  // Only a full event reopens; cancelled events must retain their terminal status.
  if (updatedEvent?.status === "full") {
    await updateEventStatus(eventId, "open");
    updatedEvent.status = "open";
  }

  return updatedEvent;
}

export function addEvent(event: Event): Event {
  events = [...events, event];
  return event;
}

export async function updateEvent(
  id: string,
  updates: UpdateEventInput,
): Promise<Event | undefined> {
  const existingEvent = await getEventById(id);

  if (!existingEvent) {
    return undefined;
  }

  const updatedEvent: Event = {
    ...existingEvent,
    ...updates,
  };

  events = events.map((event) => (event.id === id ? updatedEvent : event));
  return updatedEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!(await getEventById(id))) {
    return false;
  }

  events = events.filter((event) => event.id !== id);
  return true;
}

export function resetEvents(): void {
  events = structuredClone(mockEvents);
}

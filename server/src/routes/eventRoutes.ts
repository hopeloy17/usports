import { Router } from "express";
import {
  addEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../repositories/eventRepository";
import {
  CreateEventInput,
  Event,
  SkillLevel,
  UpdateEventInput,
} from "../types/event";

const router = Router();
const validSkillLevels: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

// Makes sure that an event is valid before adding it to the database
function isValidCreateEventInput(body: unknown): body is CreateEventInput {
  // Makes sure that the body is an object
  if (!body || typeof body !== "object") {
    return false;
  }

  const input = body as Record<string, unknown>;

  // Validity requirements
  return (
    typeof input.sport === "string" && input.sport.trim().length > 0 &&
    typeof input.venue === "string" && input.venue.trim().length > 0 &&
    typeof input.dateTime === "string" && !Number.isNaN(Date.parse(input.dateTime)) &&
    typeof input.minPlayers === "number" && Number.isInteger(input.minPlayers) && input.minPlayers > 0 &&
    ((typeof input.maxPlayers === "number" && Number.isInteger(input.maxPlayers) && input.maxPlayers >= input.minPlayers)
      || typeof input.maxPlayers === "undefined") &&
    typeof input.skillLevel === "string" && validSkillLevels.includes(input.skillLevel as SkillLevel) &&
    typeof input.host === "string" && input.host.trim().length > 0 && (input.description === undefined || typeof input.description === "string")
  );
}

// router.get("/", (_request, response) => {
//   response.status(200).json(getAllEvents());
// });

// Checks that a date is in YYYY-MM-DD format and is a real calendar date
function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(date);
}

router.get("/", (request, response) => {
  const { sport, skillLevel, date } = request.query;

  if (skillLevel !== undefined && !validSkillLevels.includes(skillLevel as SkillLevel)) {
    response.status(400).json({ error: "Invalid skill level" });
    return;
  }

  if (date !== undefined && (typeof date !== "string" || !isValidDateString(date))) {
    response.status(400).json({ error: "Invalid date" });
    return;
  }

  // Every filter that was provided must match
  const filteredEvents = getAllEvents().filter((event) =>
    (typeof sport !== "string" || event.sport.toLowerCase() === sport.toLowerCase()) &&
    (skillLevel === undefined || event.skillLevel === skillLevel) &&
    (date === undefined || new Date(event.dateTime).toISOString().startsWith(date as string))
  );

  response.status(200).json(filteredEvents);
});


router.get("/:id", (request, response) => {
  const event = getEventById(request.params.id);

  if (!event) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  response.status(200).json(event);
});

router.post("/", (request, response) => {
  if (!isValidCreateEventInput(request.body)) {
    response.status(400).json({ error: "Invalid event data" });
    return;
  }

  const input = request.body;
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
    host: input.host,
    roster: [input.host],
    ...(typeof input.description === "string" && input.description.length > 0
      ? { description: input.description }
      : {}),
  };

  response.status(201).json(addEvent(newEvent));
});

router.patch("/:id", (request, response) => {
  const updates = request.body as UpdateEventInput;

  if (!updates || typeof updates !== "object") {
    response.status(400).json({ error: "Invalid event data" });
    return;
  }

  const event = updateEvent(request.params.id, updates);

  if (!event) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  response.status(200).json(event);
});

router.delete("/:id", (request, response) => {
  if (!deleteEvent(request.params.id)) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  response.status(204).send();
});

router.post("/:id/join", (request, response) => {
  const event = getEventById(request.params.id);
  const participant = request.body?.participant;

  // Event no longer exists
  if (!event) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  // Participant is not provided
  if (typeof participant !== "string" || participant.trim().length === 0) {
    response.status(400).json({ error: "Participant is required" });
    return;
  }

  // Already joined check
  if (event.roster.includes(participant)) {
    response.status(409).json({ error: "Participant has already joined" });
    return;
  }

  // Capacity check
  if (event.maxPlayers !== undefined && event.joinedCount >= event.maxPlayers) {
    response.status(409).json({ error: "Event is full" });
    return;
  }

  const updatedEvent = updateEvent(event.id, {
    joinedCount: event.joinedCount + 1,
    roster: [...event.roster, participant],
  });

  response.status(200).json(updatedEvent);
});

router.post("/:id/leave", (request, response) => {
  const event = getEventById(request.params.id);
  const participant = request.body?.participant;

  if (!event) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  if (typeof participant !== "string" || !event.roster.includes(participant)) {
    response.status(404).json({ error: "Participant not found" });
    return;
  }

  if (participant === event.host) {
    response.status(409).json({ error: "The host cannot leave the event" });
    return;
  }

  const updatedEvent = updateEvent(event.id, {
    joinedCount: event.joinedCount - 1,
    roster: event.roster.filter((name) => name !== participant),
  });

  response.status(200).json(updatedEvent);
});

export default router;

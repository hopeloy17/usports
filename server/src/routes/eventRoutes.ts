import { Request, Router } from "express";
import { deleteEvent, updateEvent } from "../repositories/eventRepository";
import {
  createEvent,
  getEvent,
  joinEvent,
  leaveEvent,
  listEvents,
} from "../services/eventService";
import { UpdateEventInput } from "../types/event";

// Routes only translate HTTP into service calls. The rules live in the event service,
// and errors it throws are turned into status codes by the error handler in app.ts.
const router = Router();

// Reads the participant's name from the request body; anything else counts as missing
function readParticipant(request: Request): string {
  const participant = request.body?.participant;
  return typeof participant === "string" ? participant : "";
}

router.get("/", async (request, response) => {
  response.status(200).json(await listEvents(request.query));
});

router.get("/:id", async (request, response) => {
  response.status(200).json(await getEvent(request.params.id));
});

router.post("/", async (request, response) => {
  response.status(201).json(await createEvent(request.body));
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

router.post("/:id/join", async (request, response) => {
  response.status(200).json(await joinEvent(request.params.id, readParticipant(request)));
});

router.delete("/:id/join", async (request, response) => {
  response.status(200).json(await leaveEvent(request.params.id, readParticipant(request)));
});

export default router;

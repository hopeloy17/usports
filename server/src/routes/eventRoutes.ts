import { Request, Router } from "express";
import { getRequestUserId } from "../auth/requestUser";
import { deleteEvent, updateEvent } from "../repositories/eventRepository";
import {
  createEvent,
  getEvent,
  joinEvent,
  leaveEvent,
  listEvents,
} from "../services/eventService";
import { ValidationError } from "../services/errors";
import { UpdateEventInput } from "../types/event";

// Routes only translate HTTP into service calls. The rules live in the event service,
// and errors it throws are turned into status codes by the error handler in app.ts.
const router = Router();

function readUserId(request: Request): string {
  const userId = getRequestUserId(request);
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new ValidationError("User ID is required");
  }

  return userId;
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

router.patch("/:id", async (request, response) => {
  const updates = request.body as UpdateEventInput;

  if (!updates || typeof updates !== "object") {
    response.status(400).json({ error: "Invalid event data" });
    return;
  }

  const event = await updateEvent(request.params.id, updates);

  if (!event) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  response.status(200).json(event);
});

router.delete("/:id", async (request, response) => {
  if (!(await deleteEvent(request.params.id))) {
    response.status(404).json({ error: "Event not found" });
    return;
  }

  response.status(204).send();
});

router.post("/:id/join", async (request, response) => {
  response.status(200).json(await joinEvent(request.params.id, readUserId(request)));
});

router.delete("/:id/join", async (request, response) => {
  response.status(200).json(await leaveEvent(request.params.id, readUserId(request)));
});

export default router;

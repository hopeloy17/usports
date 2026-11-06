import { NextFunction, Request, Response } from "express";
import { ConflictError, NotFoundError, ValidationError } from "../services/errors";

// express.json() throws this kind of error when a request body is not valid JSON
function isInvalidJsonError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { type?: unknown }).type === "entity.parse.failed"
  );
}

// Turns errors thrown by the services into JSON responses with the right status code.
// Express only treats middleware as an error handler when it takes all four arguments.
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ValidationError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (isInvalidJsonError(error)) {
    response.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  if (error instanceof NotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof ConflictError) {
    response.status(409).json({ error: error.message });
    return;
  }

  // Anything else is a bug or an outage: log it for the team, but keep details from the client
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
}

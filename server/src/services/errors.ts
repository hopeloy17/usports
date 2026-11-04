// Errors the business logic throws; the routes turn each into an HTTP status code

// The thing being looked up does not exist (404)
export class NotFoundError extends Error {
  name = "NotFoundError";
}

// The request breaks a rule, such as joining a full event (409)
export class ConflictError extends Error {
  name = "ConflictError";
}

// The input itself is invalid (400)
export class ValidationError extends Error {
  name = "ValidationError";
}

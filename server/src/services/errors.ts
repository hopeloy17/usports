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

// The caller couldn't prove who they are, such as a wrong email or password (401)
export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
}

// The caller is known but isn't allowed in yet, such as a student who hasn't
// confirmed their email (403)
export class ForbiddenError extends Error {
  name = "ForbiddenError";
}

// Too many requests in a short time, such as Supabase's hourly limit on
// confirmation emails (429)
export class TooManyRequestsError extends Error {
  name = "TooManyRequestsError";
}

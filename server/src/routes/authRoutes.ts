import { Router } from "express";
import { signInStudent, signUpStudent } from "../services/authService";

// Like profileRoutes: routes only translate HTTP into service calls. The sign-up rules
// (calvin.edu only, clear error messages) live in the auth service, and the error handler
// in app.ts turns its errors into status codes. Express 5 passes a rejected async handler
// straight to that error handler, so no try/catch is needed here.
const router = Router();

// Paths are nouns, per docs/CodingStandard.md: signing up creates an account,
// and signing in creates a session.

// POST /api/auth/accounts -> sign up: create the account; Supabase emails the confirmation link.
// Body: { email, password }. Replies 201 { message } telling the student to check their inbox.
router.post("/accounts", async (request, response) => {
  response.status(201).json(await signUpStudent(request.body));
});

// POST /api/auth/sessions -> sign in, once the email has been confirmed.
// Body: { email, password }. Replies 200 { userId, accessToken }.
router.post("/sessions", async (request, response) => {
  response.status(200).json(await signInStudent(request.body));
});

export default router;

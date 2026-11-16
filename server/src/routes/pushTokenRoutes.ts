import { Router } from "express";
import { getRequestUserId } from "../auth/requestUser";
import { registerPushToken } from "../services/pushTokenService";

// Like the other routers: translate HTTP into a service call and let the error
// handler in app.ts turn thrown errors into status codes.
const router = Router();

// PUT /api/push-tokens { token } -> registers this device for the signed-in student.
// PUT because registering the same token again is harmless (idempotent).
router.put("/", async (request, response) => {
  // Who's registering comes from their sign-in token (401 if there's no valid one).
  // getRequestUserId checks the token with Supabase, so it must be awaited
  const userId = await getRequestUserId(request);
  response.status(200).json(await registerPushToken(userId, request.body));
});

export default router;

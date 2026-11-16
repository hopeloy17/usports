import { Router } from "express";
import { getRequestUserId } from "../auth/requestUser";
import { registerPushToken } from "../services/pushTokenService";

// Like the other routers: translate HTTP into a service call and let the error
// handler in app.ts turn thrown errors into status codes.
const router = Router();

// PUT /api/push-tokens { token } -> registers this device for the requesting user.
// PUT because registering the same token again is harmless (idempotent).
router.put("/", async (request, response) => {
  response.status(200).json(await registerPushToken(getRequestUserId(request), request.body));
});

export default router;

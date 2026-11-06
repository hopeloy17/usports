import { Router } from "express";
import { getRequestUserId } from "../auth/requestUser";
import { getUserProfile, updateUserProfile } from "../services/profileService";

// Like eventRoutes: routes only translate HTTP into service calls. The profile rules live
// in the profile service, and the error handler in app.ts turns its errors into status codes.
// There is no :id in these paths: a user always reads and edits their own profile.
const router = Router();

// GET /api/profile -> the requesting user's profile
router.get("/", async (request, response) => {
  response.status(200).json(await getUserProfile(getRequestUserId(request)));
});

// PUT /api/profile -> update name, bio, and/or classYear, returning the updated profile
router.put("/", async (request, response) => {
  response.status(200).json(await updateUserProfile(getRequestUserId(request), request.body));
});

export default router;

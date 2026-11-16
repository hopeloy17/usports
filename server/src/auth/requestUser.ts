import { Request } from "express";
import { UnauthorizedError } from "../services/errors";
import { verifyAccessToken } from "./verifyAccessToken";

// What the app shows when a request isn't signed in (the route tests check this exact wording)
export const SIGN_IN_REQUIRED = "Please sign in";
export const SIGN_IN_EXPIRED = "Your sign-in has expired. Please sign in again";

// "Bearer <token>": the standard way to send a sign-in token. Real tokens never contain spaces
const BEARER_PATTERN = /^Bearer (\S+)$/i;

/**
 * Returns the id of the signed-in student making the request, read from their sign-in token.
 *
 * The app sends the token it got from signing in as "Authorization: Bearer <token>". Supabase
 * signed that token, so the id inside can't be made up or edited. Any user id the request
 * claims anywhere else (such as the old x-user-id header) is ignored.
 *
 * @param request - The incoming request
 * @returns The signed-in student's user id
 * @throws UnauthorizedError (401) if there's no Bearer token, or it's invalid or expired
 * @throws Error (500) if Supabase can't be reached to check the token
 */
export async function getRequestUserId(request: Request): Promise<string> {
  const match = BEARER_PATTERN.exec(request.header("authorization") ?? "");
  if (!match) {
    throw new UnauthorizedError(SIGN_IN_REQUIRED);
  }

  const userId = await verifyAccessToken(match[1]);
  if (!userId) {
    throw new UnauthorizedError(SIGN_IN_EXPIRED);
  }

  return userId;
}

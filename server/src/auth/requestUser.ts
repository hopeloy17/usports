import { Request } from "express";

// The header the client uses to say which user it is acting for
export const USER_ID_HEADER = "x-user-id";

/**
 * Returns the id of the user making the request, unvalidated (services check it).
 *
 * TEMPORARY: there is no sign-in yet, so this trusts the x-user-id header, which any
 * client can fake. When Supabase Auth sign-up lands, replace the body with reading
 * and verifying the access token from the Authorization header; callers stay the same.
 */
export function getRequestUserId(request: Request): unknown {
  return request.header(USER_ID_HEADER);
}

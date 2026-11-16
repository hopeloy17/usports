// Checks a student's sign-in token and returns the user id inside it.
//
// When a student signs in, Supabase gives the app an access token: their user id and an expiry
// time, signed with a key only Supabase holds. Supabase's getClaims checks that signature (with
// Supabase's public keys, or by asking Supabase for older projects) and that the token hasn't
// expired, so a made-up or edited token is refused. Only then is the user id inside trusted.
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { authClient } from "../db/client";

/**
 * Verifies a sign-in (access) token from the app.
 *
 * @param token - The token the app sent, without the "Bearer " prefix
 * @returns The signed-in student's user id, or null if the token is invalid, expired, or isn't
 *   a signed-in student's token (e.g. one of Supabase's own project keys)
 * @throws Error if Supabase can't be reached to check the token (the error handler answers 500,
 *   since that's the server's problem, not a bad sign-in)
 */
export async function verifyAccessToken(token: string): Promise<string | null> {
  const { data, error } = await authClient.auth.getClaims(token);

  if (error) {
    if (isAuthRetryableFetchError(error)) {
      throw new Error(`verifyAccessToken: couldn't reach Supabase: ${error.message}`);
    }
    // Bad signature, expired, or not a token at all
    return null;
  }

  // Only a signed-in student's token counts. Supabase's project keys are signed tokens too,
  // but they have a different role and no user id (sub) inside
  const claims = data?.claims;
  if (!claims || claims.role !== "authenticated" || typeof claims.sub !== "string" || claims.sub === "") {
    return null;
  }

  return claims.sub;
}

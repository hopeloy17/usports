// The app's side of student sign-up and sign-in.
//
// These functions only talk to our server (POST /api/auth/accounts and
// POST /api/auth/sessions). The server does all the real checking: calvin.edu only,
// verified email, already-registered, and so on. So the app sends exactly what the student
// typed and, when something's wrong, passes the server's message straight to the screen.
import { API_BASE_URL } from "./events";

// Shown when the request never reaches the server (no connection, or the server isn't running)
export const NETWORK_ERROR =
  "Can't reach the USports server. Check your connection and try again.";

// What a successful sign-in returns: who signed in, and a token for later requests
export type SignInResult = {
  userId: string;
  accessToken: string;
};

/**
 * Creates a student account. The server checks the email is a calvin.edu address, and
 * Supabase then emails a confirmation link; the account can't sign in until it's clicked.
 *
 * @param email - The email exactly as typed (the server trims and lowercases it)
 * @param password - The password exactly as typed
 * @returns The server's message telling the student to check their inbox
 * @throws Error with the server's message for a non-Calvin email, an already-registered
 *   email, a weak password, or too many attempts; NETWORK_ERROR if the server can't be
 *   reached; or a general "Something went wrong (status)" message for an unreadable reply
 */
export async function signUp(email: string, password: string): Promise<string> {
  const body = (await postCredentials("/api/auth/accounts", email, password)) as {
    message: string;
  };
  return body.message;
}

/**
 * Signs a student in. Only works once they've clicked the confirmation link in their email.
 *
 * @param email - The email exactly as typed (the server trims and lowercases it)
 * @param password - The password exactly as typed
 * @returns The student's user id and an access token
 * @throws Error with the server's message for an unverified email, a wrong email or password,
 *   a non-Calvin email, or too many attempts; NETWORK_ERROR if the server can't be reached;
 *   or a general "Something went wrong (status)" message for an unreadable reply
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  return (await postCredentials("/api/auth/sessions", email, password)) as SignInResult;
}

// Sends { email, password } as JSON to the given server path and returns the parsed reply.
// Shared by signUp and signIn because the request and error handling are identical.
async function postCredentials(path: string, email: string, password: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // fetch only throws when the request never got a reply at all
    throw new Error(NETWORK_ERROR);
  }

  // A reply that isn't JSON (e.g. an HTML error page) becomes null instead of crashing
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The server always sends { error: "..." } for problems; show that message as-is
    throw new Error(body?.error ?? `Something went wrong (${response.status}). Please try again.`);
  }

  return body;
}

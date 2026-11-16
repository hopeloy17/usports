// Remembers who's signed in on this device, so reloading the page doesn't send the student
// back to the sign-in screen.
//
// Web: kept in the browser's localStorage under one key, so it survives reloads.
// Phones (and tests): there is no localStorage, so it's kept in memory only and forgotten when
// the app restarts. (Phones could use expo-secure-store later; the team chose web-only for now.)
//
// Nothing here ever throws: some private browser windows block localStorage entirely, and
// signing in should still work there (it just won't survive a reload).
//
// Note: localStorage can be read by any script running on the page. React shows every
// student-typed value as plain text (never as HTML), so a script can't be slipped in that way.

// What's saved: who signed in, and the access token from signing in (the server will check
// the token later; for now the app identifies the student by userId)
export type SavedSession = {
  userId: string;
  accessToken: string;
};

// The one localStorage key the app uses
const STORAGE_KEY = "usports.session";

// What React sees while the web page is still being built on the server, before the browser
// has had a chance to read its storage: "we don't know yet" (not "nobody is signed in")
export const SESSION_NOT_CHECKED = "session-not-checked";

// The saved sign-in, as text, when the browser's storage can't be used (phones, tests, or a
// browser that blocks it). Lives only as long as the app is running.
let memoryCopy: string | null = null;

// False once writing to the browser's storage has failed; from then on only memoryCopy is used,
// so a blocked browser doesn't keep reading back an old (or empty) value
let browserStorageWorks = true;

// Code to call whenever someone signs in or out (React's useSyncExternalStore subscribes here)
const listeners = new Set<() => void>();

// The browser's localStorage, or null where there is none (phones, tests) or it's blocked.
// Even reading `window.localStorage` can throw in some locked-down browsers, hence the try.
function browserStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  if (!browserStorageWorks) return null;
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

// Saves (or, with null, removes) the sign-in text, then tells every listener
function writeSession(raw: string | null): void {
  memoryCopy = raw;
  const storage = browserStorage();
  if (storage) {
    try {
      if (raw === null) {
        storage.removeItem(STORAGE_KEY);
      } else {
        storage.setItem(STORAGE_KEY, raw);
      }
    } catch {
      // Blocked or full: keep going with the in-memory copy (forgotten on reload)
      browserStorageWorks = false;
    }
  }
  listeners.forEach((listener) => listener());
}

/**
 * Remembers the student who just signed in on this device.
 * @param session - The user id and access token returned by signing in
 */
export function saveSession(session: SavedSession): void {
  writeSession(JSON.stringify({ userId: session.userId, accessToken: session.accessToken }));
}

/** Forgets the signed-in student on this device (signing out). */
export function clearSession(): void {
  writeSession(null);
}

/**
 * The saved sign-in as raw text (or null), for React's useSyncExternalStore. Returns the same
 * string until the sign-in changes, so React only re-renders when something really changed.
 */
export function getSavedSessionSnapshot(): string | null {
  const storage = browserStorage();
  if (storage) {
    try {
      return storage.getItem(STORAGE_KEY);
    } catch {
      // Blocked for reading: fall back to the in-memory copy
    }
  }
  return memoryCopy;
}

/** The snapshot while the web page is built on the server: the sign-in isn't known yet. */
export function getServerSessionSnapshot(): string {
  return SESSION_NOT_CHECKED;
}

/**
 * Registers code to run whenever someone signs in or out on this device.
 * @returns A function that stops the notifications
 */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Turns saved sign-in text back into a session. Anything that isn't a valid saved sign-in
 * (edited by hand, left over from an older version, corrupted) counts as nobody signed in.
 */
export function parseSession(raw: string | null): SavedSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { userId, accessToken } = value as Record<string, unknown>;
    if (typeof userId === "string" && userId !== "" && typeof accessToken === "string") {
      return { userId, accessToken };
    }
  } catch {
    // Not JSON: fall through to "nobody signed in"
  }
  return null;
}

/** Who's signed in on this device right now, or null if nobody is. */
export function loadSession(): SavedSession | null {
  return parseSession(getSavedSessionSnapshot());
}

/**
 * The header that tells the server who's asking: the saved sign-in token, as
 * "Authorization: Bearer <token>". The server reads the student from this token (which Supabase
 * signed, so it can't be faked), never from a user id the app claims.
 * @returns The header to add to a request, or {} if nobody is signed in
 */
export function authHeaders(): Record<string, string> {
  const session = loadSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

/**
 * Call with the server's answer to a signed-in request. A 401 means the server didn't accept
 * the sign-in token (missing, made up, or expired after about an hour), so the sign-in is
 * forgotten; the app's sign-in check then sends the student back to the sign-in screen.
 * (Not for the sign-in request itself, where 401 just means a wrong password.)
 * @returns true if the sign-in was forgotten
 */
export function forgetSignInIfRejected(response: { status: number }): boolean {
  if (response.status !== 401) return false;
  clearSession();
  return true;
}

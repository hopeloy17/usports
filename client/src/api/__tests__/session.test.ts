// Tests for the saved sign-in (src/api/session.ts): how the app remembers who's signed in.
//
// On the web the sign-in is kept in the browser's storage, so reloading the page doesn't send
// the student back to the sign-in screen. Where there is no browser storage (phones, these
// tests, a browser that blocks it) it's kept in memory only: remembered until the app restarts.
import {
  authHeaders,
  clearSession,
  forgetSignInIfRejected,
  getSavedSessionSnapshot,
  loadSession,
  saveSession,
  subscribeToSession,
} from "../session";

// The browser-storage key the app uses (must match src/api/session.ts)
const STORAGE_KEY = "usports.session";

// A signed-in student, as the sign-in API returns them
const SESSION = { userId: "22222222-2222-4222-8222-222222222222", accessToken: "token-abc" };

// A stand-in for the browser's localStorage (these tests don't run in a browser)
function makeFakeStorage() {
  const items = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => (items.has(key) ? items.get(key)! : null)),
    setItem: jest.fn((key: string, value: string) => void items.set(key, value)),
    removeItem: jest.fn((key: string) => void items.delete(key)),
  };
}

// Puts a fake localStorage on `window` for one test (and takes it away afterwards)
function installBrowserStorage(storage: object) {
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
}
function removeBrowserStorage() {
  delete (window as { localStorage?: unknown }).localStorage;
}

beforeEach(() => {
  removeBrowserStorage();
  clearSession(); // nobody signed in at the start of each test
});

afterAll(() => {
  removeBrowserStorage();
});

describe("saved sign-in", () => {
  it("starts with nobody signed in", () => {
    expect(loadSession()).toBeNull();
  });

  it("remembers who signed in and reads it back", () => {
    saveSession(SESSION);

    expect(loadSession()).toEqual(SESSION);
  });

  it("forgets the student on sign-out", () => {
    saveSession(SESSION);

    clearSession();

    expect(loadSession()).toBeNull();
  });

  it("keeps the sign-in in the browser's storage on the web, so it survives a reload", () => {
    const storage = makeFakeStorage();
    installBrowserStorage(storage);

    saveSession(SESSION);
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(SESSION));

    // A reload starts the app's code from scratch: only what's in the browser's storage is left
    jest.isolateModules(() => {
      const reloaded = jest.requireActual<typeof import("../session")>("../session");
      expect(reloaded.loadSession()).toEqual(SESSION);
    });
  });

  it("removes it from the browser's storage on sign-out", () => {
    const storage = makeFakeStorage();
    installBrowserStorage(storage);
    saveSession(SESSION);

    clearSession();

    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["not JSON at all", "not-json{"],
    ["JSON that isn't an object", "42"],
    ["a missing user id", JSON.stringify({ accessToken: "t" })],
    ["a user id that isn't text", JSON.stringify({ userId: 5, accessToken: "t" })],
    ["an empty user id", JSON.stringify({ userId: "", accessToken: "t" })],
    ["a missing token", JSON.stringify({ userId: SESSION.userId })],
  ])("ignores a saved value with %s (treats it as nobody signed in)", (_label, raw) => {
    const storage = makeFakeStorage();
    storage.setItem(STORAGE_KEY, raw);
    installBrowserStorage(storage);

    expect(loadSession()).toBeNull();
  });

  it("still works, until the app restarts, when the browser blocks its storage", () => {
    // Some private windows throw on any use of localStorage
    const blocked = {
      getItem: jest.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: jest.fn(() => {
        throw new Error("QuotaExceededError");
      }),
      removeItem: jest.fn(() => {
        throw new Error("SecurityError");
      }),
    };
    installBrowserStorage(blocked);

    expect(() => saveSession(SESSION)).not.toThrow();
    expect(loadSession()).toEqual(SESSION);

    expect(() => clearSession()).not.toThrow();
    expect(loadSession()).toBeNull();
  });

  it("tells listeners when someone signs in or out, and stops after they unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSession(listener);

    saveSession(SESSION);
    expect(listener).toHaveBeenCalledTimes(1);

    clearSession();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    saveSession(SESSION);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("sends the saved sign-in token as an Authorization header", () => {
    saveSession(SESSION);

    // The server reads who's asking from this token, never from an id the app claims
    expect(authHeaders()).toEqual({ Authorization: `Bearer ${SESSION.accessToken}` });
  });

  it("sends no Authorization header when nobody is signed in", () => {
    expect(authHeaders()).toEqual({});
  });

  it("forgets the sign-in when the server rejects the token (401: invalid or expired)", () => {
    saveSession(SESSION);

    expect(forgetSignInIfRejected({ status: 401 })).toBe(true);

    // The app's sign-in check then sends the student back to the sign-in screen
    expect(loadSession()).toBeNull();
  });

  it.each([200, 400, 404, 409, 500])(
    "keeps the sign-in for any other answer (status %i)",
    (status) => {
      saveSession(SESSION);

      expect(forgetSignInIfRejected({ status })).toBe(false);
      expect(loadSession()).toEqual(SESSION);
    },
  );

  it("gives React the same snapshot text until the sign-in actually changes", () => {
    // React's useSyncExternalStore re-renders whenever the snapshot changes, so reading twice
    // without a change must give an identical value
    saveSession(SESSION);

    expect(getSavedSessionSnapshot()).toBe(getSavedSessionSnapshot());
    expect(getSavedSessionSnapshot()).toBe(JSON.stringify(SESSION));
  });
});

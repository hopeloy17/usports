// Route tests for student sign-up and sign-in:
//   POST /api/auth/accounts  -> create an account and send the confirmation email
//   POST /api/auth/sessions  -> sign in, but only once the email has been confirmed
//
// What these tests pin down:
// - Only calvin.edu addresses get through, and the server checks this BEFORE calling
//   Supabase. A check that lives only in the app's form is easy to skip by calling the
//   API directly, so the server is the place that has to enforce it.
// - Sign-up hands the email and password to Supabase Auth, which sends the confirmation email.
// - Clear error messages for a non-Calvin email, an already-registered email, and an
//   account whose email hasn't been verified yet.
// - A student who hasn't verified their email can't sign in, so they can't use the app.

// Fake the Supabase clients so these tests never reach the real project.
// authClient is the separate client the auth service uses for sign-up and sign-in. It is kept
// apart from the shared `supabase` client because signing someone in on a supabase-js client
// makes it send that student's token on later requests, which would quietly replace the
// server's key on every database query. `supabase` is listed here only so other files that
// import it (like src/db/index.ts) still load.
jest.mock("../src/db/client", () => ({
  supabase: {},
  authClient: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));

import request from "supertest";
import { app } from "../src/app";
import { authClient } from "../src/db/client";

// Loosely typed handles on the fakes, so each test can choose what Supabase "answers"
// without building Supabase's full User and Session types
const mockedSignUp = authClient.auth.signUp as jest.Mock;
const mockedSignIn = authClient.auth.signInWithPassword as jest.Mock;

// ---------------------------------------------------------------------------
// The exact messages the app will show. Written once so every test checks the same wording.
// ---------------------------------------------------------------------------
const CHECK_INBOX = "Check your calvin.edu inbox to confirm your account";
const CALVIN_ONLY = "Please use your calvin.edu email address";
const REQUIRED = "Email and password are required";
const ALREADY_REGISTERED = "An account with this email already exists";
const WEAK_PASSWORD = "Password is too weak; please choose a longer password";
const NOT_VERIFIED = "Please verify your email before signing in";
const BAD_LOGIN = "Invalid email or password";
const TOO_MANY = "Too many attempts; please wait a few minutes and try again";

// A valid student and their details, reused across tests
const EMAIL = "jdoe12@calvin.edu";
const PASSWORD = "correct-horse-battery";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACCESS_TOKEN = "access-token-123";

// ---------------------------------------------------------------------------
// Fake Supabase answers. Supabase replies with { data, error } instead of throwing,
// so these build the shapes it really returns.
// ---------------------------------------------------------------------------

// A brand-new sign-up, or a retry for an address that was never confirmed:
// Supabase returns the user with one identity and no session (no session until confirmed)
function signUpCreated() {
  return {
    data: {
      user: { id: USER_ID, email: EMAIL, identities: [{ id: "identity-1" }] },
      session: null,
    },
    error: null,
  };
}

// An address that already has a confirmed account. With email confirmations on, Supabase
// doesn't return an error here (so outsiders can't probe which emails have accounts);
// instead it returns a look-alike user whose identities list is empty.
function signUpAlreadyRegistered() {
  return {
    data: {
      user: { id: USER_ID, email: EMAIL, identities: [] },
      session: null,
    },
    error: null,
  };
}

// A successful sign-in for a student whose email has been confirmed
function signInVerified() {
  return {
    data: {
      user: { id: USER_ID, email: EMAIL, email_confirmed_at: "2026-11-13T12:00:00Z" },
      session: { access_token: ACCESS_TOKEN, refresh_token: "refresh-token-456" },
    },
    error: null,
  };
}

// A Supabase error reply, identified by its error code (e.g. "email_not_confirmed")
function supabaseError(code: string, message: string, status = 400) {
  return {
    data: { user: null, session: null },
    error: { code, message, status },
  };
}

// ---------------------------------------------------------------------------
// Request helpers. Leaving out the body sends a request with no body at all.
// ---------------------------------------------------------------------------
function postSignUp(body?: string | object) {
  const pending = request(app).post("/api/auth/accounts");
  return body === undefined ? pending : pending.send(body);
}

function postSignIn(body?: string | object) {
  const pending = request(app).post("/api/auth/sessions");
  return body === undefined ? pending : pending.send(body);
}

// Hides the error log for tests that expect a 500 (the error handler logs real failures
// for the team, which would just clutter the test output here)
function silenceErrorLog() {
  jest.spyOn(console, "error").mockImplementation(() => {});
}

// ---------------------------------------------------------------------------
// Inputs shared by the sign-up and sign-in tests
// ---------------------------------------------------------------------------

// Addresses that look close to a Calvin email but must be rejected
const OUTSIDE_ADDRESSES: [string, string][] = [
  ["a Gmail address", "jdoe@gmail.com"],
  ["another school's address", "jdoe@hope.edu"],
  ["calvin.com instead of calvin.edu", "jdoe@calvin.com"],
  ["a domain that only ends in calvin.edu", "jdoe@notcalvin.edu"],
  ["calvin.edu followed by another domain", "jdoe@calvin.edu.evil.com"],
  ["a subdomain of calvin.edu", "jdoe@mail.calvin.edu"],
  ["calvin.edu hidden before a second @", "jdoe@calvin.edu@gmail.com"],
  ["no name before the @", "@calvin.edu"],
  ["no @ at all", "jdoe.calvin.edu"],
  ["a space inside the address", "j doe@calvin.edu"],
];

// Request bodies that are missing the email or password, or have them in the wrong form
const INCOMPLETE_BODIES: [string, object][] = [
  ["no email", { password: PASSWORD }],
  ["no password", { email: EMAIL }],
  ["an empty email", { email: "", password: PASSWORD }],
  ["an email of only spaces", { email: "   ", password: PASSWORD }],
  ["an empty password", { email: EMAIL, password: "" }],
  ["an email that is not text", { email: 12345, password: PASSWORD }],
  ["a password that is not text", { email: EMAIL, password: 12345 }],
  ["an empty object", {}],
  ["a JSON array instead of an object", [EMAIL, PASSWORD]],
];

// Reset the fakes between tests so one test's Supabase answer never leaks into the next;
// restoreAllMocks also undoes any console.error silencing
beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// POST /api/auth/accounts
// ===========================================================================
describe("POST /api/auth/accounts", () => {
  describe("accepted calvin.edu address", () => {
    it("creates the account and tells the student to check their inbox", async () => {
      mockedSignUp.mockResolvedValue(signUpCreated());

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(201);
      // Only the message comes back: no Supabase user object, id, or token
      expect(response.body).toEqual({ message: CHECK_INBOX });
    });

    it("sends the email and password to Supabase exactly once", async () => {
      mockedSignUp.mockResolvedValue(signUpCreated());

      await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(mockedSignUp).toHaveBeenCalledTimes(1);
      expect(mockedSignUp).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
    });

    it("trims spaces and lowercases the email before sending it to Supabase", async () => {
      mockedSignUp.mockResolvedValue(signUpCreated());

      const response = await postSignUp({ email: "  JDoe12@Calvin.EDU  ", password: PASSWORD });

      expect(response.status).toBe(201);
      // Stored lowercase, so "JDoe12@" and "jdoe12@" can't become two different accounts
      expect(mockedSignUp).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
    });

    it("passes the password through unchanged", async () => {
      mockedSignUp.mockResolvedValue(signUpCreated());
      // Spaces and capitals are a real part of a password, so nothing may trim or lowercase it
      const password = "  My Pass Word  ";

      await postSignUp({ email: EMAIL, password });

      expect(mockedSignUp).toHaveBeenCalledWith({ email: EMAIL, password });
    });

    it.each([
      ["a plain student address", "jdoe12@calvin.edu"],
      ["a name with a dot", "jane.doe@calvin.edu"],
      ["a name with a dash and digits", "first-last2@calvin.edu"],
      ["an all-capitals address", "JDOE12@CALVIN.EDU"],
    ])("accepts %s (%s)", async (_label, email) => {
      mockedSignUp.mockResolvedValue(signUpCreated());

      const response = await postSignUp({ email, password: PASSWORD });

      expect(response.status).toBe(201);
      expect(mockedSignUp).toHaveBeenCalledWith({ email: email.toLowerCase(), password: PASSWORD });
    });

    it("accepts a retry for an address that was never confirmed", async () => {
      // If someone signed up with this address but never clicked the link (a typo, or someone
      // else typing a classmate's email), Supabase treats a new sign-up as a retry and sends a
      // fresh confirmation email. That must be a success, not "already registered", or the real
      // owner of the address could be locked out of ever signing up.
      mockedSignUp.mockResolvedValue(signUpCreated());

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: CHECK_INBOX });
    });
  });

  describe("rejected outside address", () => {
    it.each(OUTSIDE_ADDRESSES)(
      "rejects %s (%s) with 400 and never calls Supabase",
      async (_label, email) => {
        const response = await postSignUp({ email, password: PASSWORD });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: CALVIN_ONLY });
        // The server stopped it on its own: Supabase never saw the request
        expect(mockedSignUp).not.toHaveBeenCalled();
      },
    );
  });

  describe("missing or invalid input", () => {
    it.each(INCOMPLETE_BODIES)("returns 400 for %s", async (_label, body) => {
      const response = await postSignUp(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: REQUIRED });
      expect(mockedSignUp).not.toHaveBeenCalled();
    });

    it("returns 400 when the request has no body at all", async () => {
      const response = await postSignUp();

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: REQUIRED });
      expect(mockedSignUp).not.toHaveBeenCalled();
    });

    it("returns 400 when the body is not valid JSON", async () => {
      const response = await request(app)
        .post("/api/auth/accounts")
        .set("Content-Type", "application/json")
        .send("{ not json");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid JSON body" });
      expect(mockedSignUp).not.toHaveBeenCalled();
    });
  });

  describe("already-registered email", () => {
    it("returns 409 when Supabase hides an existing account behind an empty identities list", async () => {
      mockedSignUp.mockResolvedValue(signUpAlreadyRegistered());

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: ALREADY_REGISTERED });
    });

    // When email confirmations are off, Supabase reports an existing account as an error
    // instead; both codes below are ones it uses for "this email is taken"
    it.each(["user_already_exists", "email_exists"])(
      "returns 409 when Supabase reports the error code %s",
      async (code) => {
        mockedSignUp.mockResolvedValue(supabaseError(code, "User already registered", 422));

        const response = await postSignUp({ email: EMAIL, password: PASSWORD });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: ALREADY_REGISTERED });
      },
    );
  });

  describe("weak password", () => {
    it("returns 400 with a clear message when Supabase says the password is too weak", async () => {
      mockedSignUp.mockResolvedValue(
        supabaseError("weak_password", "Password should be at least 6 characters.", 422),
      );

      const response = await postSignUp({ email: EMAIL, password: "abc" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: WEAK_PASSWORD });
    });
  });

  describe("rate limits", () => {
    // Supabase limits how many confirmation emails a project can send per hour, and how many
    // auth requests can come in. Hitting either must give a clear 429, not a vague 500.
    it.each([
      ["too many confirmation emails sent", "over_email_send_rate_limit"],
      ["too many requests", "over_request_rate_limit"],
    ])("returns 429 with a clear message when Supabase reports %s (%s)", async (_label, code) => {
      mockedSignUp.mockResolvedValue(supabaseError(code, "Rate limit exceeded", 429));

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(429);
      expect(response.body).toEqual({ error: TOO_MANY });
    });
  });

  describe("Supabase failures", () => {
    it("returns 500 without leaking Supabase's message for an unexpected error", async () => {
      silenceErrorLog();
      mockedSignUp.mockResolvedValue(
        supabaseError("unexpected_failure", "secret internal details", 500),
      );

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });

    it("returns 500 when Supabase can't be reached at all", async () => {
      silenceErrorLog();
      mockedSignUp.mockRejectedValue(new Error("fetch failed"));

      const response = await postSignUp({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });
  });
});

// ===========================================================================
// POST /api/auth/sessions
// ===========================================================================
describe("POST /api/auth/sessions", () => {
  describe("verified student", () => {
    it("signs in and returns the user id and access token", async () => {
      mockedSignIn.mockResolvedValue(signInVerified());

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(200);
      // Only what the app needs: the refresh token and Supabase's user object stay on the server
      expect(response.body).toEqual({ userId: USER_ID, accessToken: ACCESS_TOKEN });
    });

    it("trims spaces and lowercases the email before sending it to Supabase", async () => {
      mockedSignIn.mockResolvedValue(signInVerified());

      await postSignIn({ email: "  JDoe12@Calvin.EDU ", password: PASSWORD });

      expect(mockedSignIn).toHaveBeenCalledTimes(1);
      expect(mockedSignIn).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
    });
  });

  describe("blocked unverified user", () => {
    it("returns 403 with a clear message when Supabase says the email is not confirmed", async () => {
      mockedSignIn.mockResolvedValue(supabaseError("email_not_confirmed", "Email not confirmed"));

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: NOT_VERIFIED });
    });

    it("never hands an access token to an unverified user", async () => {
      mockedSignIn.mockResolvedValue(supabaseError("email_not_confirmed", "Email not confirmed"));

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.body).not.toHaveProperty("accessToken");
      expect(response.body).not.toHaveProperty("userId");
    });

    // Safety net: if "Confirm email" is ever switched off in the Supabase dashboard, Supabase
    // signs unconfirmed users in. The server must still check the confirmation itself.
    it.each([
      ["null", null],
      ["missing", undefined],
    ])(
      "still returns 403 if Supabase signs the user in but email_confirmed_at is %s",
      async (_label, confirmedAt) => {
        const answer = signInVerified();
        answer.data.user.email_confirmed_at = confirmedAt as unknown as string;
        mockedSignIn.mockResolvedValue(answer);

        const response = await postSignIn({ email: EMAIL, password: PASSWORD });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: NOT_VERIFIED });
      },
    );
  });

  describe("wrong email or password", () => {
    it("returns 401 with one message for an unknown email or a wrong password", async () => {
      // Supabase uses the same code for both, so nobody can tell which emails have accounts
      mockedSignIn.mockResolvedValue(
        supabaseError("invalid_credentials", "Invalid login credentials"),
      );

      const response = await postSignIn({ email: EMAIL, password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: BAD_LOGIN });
    });
  });

  describe("rate limits", () => {
    // Repeated sign-in attempts (e.g. someone guessing passwords) get rate-limited by Supabase
    it("returns 429 with a clear message when Supabase reports too many requests", async () => {
      mockedSignIn.mockResolvedValue(
        supabaseError("over_request_rate_limit", "Rate limit exceeded", 429),
      );

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(429);
      expect(response.body).toEqual({ error: TOO_MANY });
    });
  });

  describe("rejected outside address", () => {
    it.each(OUTSIDE_ADDRESSES)(
      "rejects %s (%s) with 400 and never calls Supabase",
      async (_label, email) => {
        const response = await postSignIn({ email, password: PASSWORD });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: CALVIN_ONLY });
        expect(mockedSignIn).not.toHaveBeenCalled();
      },
    );
  });

  describe("missing or invalid input", () => {
    it.each(INCOMPLETE_BODIES)("returns 400 for %s", async (_label, body) => {
      const response = await postSignIn(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: REQUIRED });
      expect(mockedSignIn).not.toHaveBeenCalled();
    });

    it("returns 400 when the request has no body at all", async () => {
      const response = await postSignIn();

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: REQUIRED });
      expect(mockedSignIn).not.toHaveBeenCalled();
    });
  });

  describe("Supabase failures", () => {
    it("returns 500 without leaking Supabase's message for an unexpected error", async () => {
      silenceErrorLog();
      mockedSignIn.mockResolvedValue(
        supabaseError("unexpected_failure", "secret internal details", 500),
      );

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });

    it("returns 500 when Supabase can't be reached at all", async () => {
      silenceErrorLog();
      mockedSignIn.mockRejectedValue(new Error("fetch failed"));

      const response = await postSignIn({ email: EMAIL, password: PASSWORD });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });
  });
});

// ===========================================================================
// CORS: the web version of the app runs on a different port, so the browser asks first
// ===========================================================================
describe("CORS for /api/auth", () => {
  it("answers the browser's preflight for sign-up and allows POST with a JSON body", async () => {
    const response = await request(app)
      .options("/api/auth/accounts")
      .set("Origin", "http://localhost:8081")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
  });
});

// Tests for the app's sign-up / sign-in API functions (src/api/auth.ts).
//
// These functions only talk to our server: POST /api/auth/accounts (sign up) and
// POST /api/auth/sessions (sign in). The server does the real checking (calvin.edu only,
// verified email, etc.), so the app's job is to send what the student typed and pass the
// server's exact error message back to the screen, where the student can read it.
import { API_BASE_URL } from "../events";
import { NETWORK_ERROR, signIn, signUp } from "../auth";

// A valid student, reused across tests
const EMAIL = "jdoe12@calvin.edu";
const PASSWORD = "correct-horse-battery";
const USER_ID = "11111111-1111-4111-8111-111111111111";

// The server's messages (must match server/src/services/authService.ts)
const CHECK_INBOX = "Check your calvin.edu inbox to confirm your account";
const CALVIN_ONLY = "Please use your calvin.edu email address";
const ALREADY_REGISTERED = "An account with this email already exists";
const TOO_MANY = "Too many attempts; please wait a few minutes and try again";
const NOT_VERIFIED = "Please verify your email before signing in";
const BAD_LOGIN = "Invalid email or password";

// Makes the next fetch answer with this status and JSON body, like the server would
function mockServerReply(status: number, body: unknown) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

// Makes the next fetch answer with a body that isn't JSON (e.g. an HTML error page from a proxy)
function mockNonJsonReply(status: number) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    },
  } as unknown as Response);
}

// Makes the next fetch fail before reaching the server (no Wi-Fi, server not running, ...)
function mockNetworkFailure() {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
}

describe("auth API client", () => {
  // Every test replaces fetch, so put the real one back afterwards
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // =========================================================================
  // signUp -> POST /api/auth/accounts
  // =========================================================================
  describe("signUp", () => {
    it("posts the email and password as JSON to /api/auth/accounts", async () => {
      mockServerReply(201, { message: CHECK_INBOX });

      await signUp(EMAIL, PASSWORD);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      });
    });

    it("sends the email exactly as typed, leaving clean-up to the server", async () => {
      // The server trims and lowercases the email itself, so the app doesn't duplicate that rule
      mockServerReply(201, { message: CHECK_INBOX });

      await signUp("  JDoe12@Calvin.EDU ", PASSWORD);

      const [, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ email: "  JDoe12@Calvin.EDU ", password: PASSWORD });
    });

    it("returns the server's 'check your inbox' message on success", async () => {
      mockServerReply(201, { message: CHECK_INBOX });

      await expect(signUp(EMAIL, PASSWORD)).resolves.toBe(CHECK_INBOX);
    });

    it("throws the server's message when the email isn't a calvin.edu address", async () => {
      mockServerReply(400, { error: CALVIN_ONLY });

      await expect(signUp("jdoe@gmail.com", PASSWORD)).rejects.toThrow(CALVIN_ONLY);
    });

    it("throws the server's message when the email is already registered", async () => {
      mockServerReply(409, { error: ALREADY_REGISTERED });

      await expect(signUp(EMAIL, PASSWORD)).rejects.toThrow(ALREADY_REGISTERED);
    });

    it("throws the server's message when sign-ups are rate-limited", async () => {
      mockServerReply(429, { error: TOO_MANY });

      await expect(signUp(EMAIL, PASSWORD)).rejects.toThrow(TOO_MANY);
    });

    it("throws a friendly message when the server can't be reached", async () => {
      mockNetworkFailure();

      await expect(signUp(EMAIL, PASSWORD)).rejects.toThrow(NETWORK_ERROR);
    });

    it("throws a general message with the status code when the reply isn't JSON", async () => {
      mockNonJsonReply(502);

      await expect(signUp(EMAIL, PASSWORD)).rejects.toThrow(
        "Something went wrong (502). Please try again.",
      );
    });
  });

  // =========================================================================
  // signIn -> POST /api/auth/sessions
  // =========================================================================
  describe("signIn", () => {
    it("posts the email and password as JSON to /api/auth/sessions", async () => {
      mockServerReply(200, { userId: USER_ID, accessToken: "token-123" });

      await signIn(EMAIL, PASSWORD);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      });
    });

    it("returns the user id and access token on success", async () => {
      mockServerReply(200, { userId: USER_ID, accessToken: "token-123" });

      await expect(signIn(EMAIL, PASSWORD)).resolves.toEqual({
        userId: USER_ID,
        accessToken: "token-123",
      });
    });

    it("throws the server's message when the email hasn't been verified", async () => {
      mockServerReply(403, { error: NOT_VERIFIED });

      await expect(signIn(EMAIL, PASSWORD)).rejects.toThrow(NOT_VERIFIED);
    });

    it("throws the server's message for a wrong email or password", async () => {
      mockServerReply(401, { error: BAD_LOGIN });

      await expect(signIn(EMAIL, "wrong-password")).rejects.toThrow(BAD_LOGIN);
    });

    it("throws the server's message when the email isn't a calvin.edu address", async () => {
      mockServerReply(400, { error: CALVIN_ONLY });

      await expect(signIn("jdoe@gmail.com", PASSWORD)).rejects.toThrow(CALVIN_ONLY);
    });

    it("throws a friendly message when the server can't be reached", async () => {
      mockNetworkFailure();

      await expect(signIn(EMAIL, PASSWORD)).rejects.toThrow(NETWORK_ERROR);
    });

    it("throws a general message with the status code when the reply isn't JSON", async () => {
      mockNonJsonReply(500);

      await expect(signIn(EMAIL, PASSWORD)).rejects.toThrow(
        "Something went wrong (500). Please try again.",
      );
    });
  });
});

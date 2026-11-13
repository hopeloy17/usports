// Student sign-up and sign-in through Supabase Auth, restricted to calvin.edu addresses.
//
// The calvin.edu rule is enforced HERE, on the server, before Supabase is ever called.
// The app's form may check it too, but a check that lives only in the app is easy to skip
// by calling the API directly, so this is the check that actually protects sign-up.
//
// Supabase does the rest: it stores the password securely, sends the confirmation email,
// and refuses to sign in anyone who hasn't clicked the link in that email yet.
import { authClient } from "../db/client";
import {
  ConflictError,
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

// ---------------------------------------------------------------------------
// The messages students see. The route tests (tests/auth.test.ts) check this exact wording.
// ---------------------------------------------------------------------------
const CHECK_INBOX = "Check your calvin.edu inbox to confirm your account";
const CALVIN_ONLY = "Please use your calvin.edu email address";
const REQUIRED = "Email and password are required";
const ALREADY_REGISTERED = "An account with this email already exists";
const WEAK_PASSWORD = "Password is too weak; please choose a longer password";
const NOT_VERIFIED = "Please verify your email before signing in";
const BAD_LOGIN = "Invalid email or password";
const TOO_MANY = "Too many attempts; please wait a few minutes and try again";

// A Calvin address: one or more characters that are neither spaces nor "@", then exactly
// "@calvin.edu" at the very end. Anchored at both ends (^ and $), so look-alikes such as
// "x@notcalvin.edu", "x@mail.calvin.edu", "x@calvin.edu.evil.com" and "x@calvin.edu@gmail.com"
// don't match. Applied after the email is trimmed and lowercased.
const CALVIN_EMAIL_PATTERN = /^[^\s@]+@calvin\.edu$/;

// Supabase error codes that mean "an account with this email already exists"
// (Supabase only returns these when email confirmations are off; see signUpStudent)
const ALREADY_REGISTERED_CODES = ["user_already_exists", "email_exists"];

// Supabase error codes for its rate limits: too many confirmation emails sent this hour,
// or too many auth requests in a short time
const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

// What a successful sign-up sends back to the app
export type SignUpResult = {
  message: string;
};

// What a successful sign-in sends back to the app. The refresh token and Supabase's
// full user object stay on the server; the app only needs to know who signed in.
export type SignInResult = {
  userId: string;
  accessToken: string;
};

// A checked email and password, ready to hand to Supabase
type Credentials = {
  email: string;
  password: string;
};

/**
 * Creates a student account and has Supabase send the confirmation email.
 * The new account can't sign in until the student clicks the link in that email.
 *
 * Signing up again with an address that was never confirmed counts as a retry and
 * succeeds (Supabase sends a fresh email), so a typo or a stranger using a classmate's
 * address can never lock the real owner out.
 *
 * @param input - The request body; typed unknown because it comes straight from the request.
 *   Must be an object with a text `email` (a calvin.edu address) and a non-empty text `password`.
 * @returns A message telling the student to check their calvin.edu inbox
 * @throws ValidationError if the email or password is missing or not text, if the email is not
 *   a calvin.edu address (Supabase is not called), or if Supabase says the password is too weak
 * @throws ConflictError if a confirmed account with this email already exists
 * @throws TooManyRequestsError if Supabase's email or request rate limit has been hit
 * @throws Error for any other Supabase failure; the error handler turns it into a 500
 */
export async function signUpStudent(input: unknown): Promise<SignUpResult> {
  // Validate before contacting Supabase, so a rejected email never reaches it
  const { email, password } = readCredentials(input);

  const { data, error } = await authClient.auth.signUp({ email, password });

  if (error) {
    throwIfRateLimited(error.code);

    if (error.code !== undefined && ALREADY_REGISTERED_CODES.includes(error.code)) {
      throw new ConflictError(ALREADY_REGISTERED);
    }

    if (error.code === "weak_password") {
      throw new ValidationError(WEAK_PASSWORD);
    }

    // Anything else is unexpected: keep Supabase's message in the server log only
    throw new Error(`signUp failed: ${error.message}`);
  }

  // With email confirmations on, Supabase doesn't report an existing confirmed account as an
  // error (so outsiders can't probe which emails have accounts). Instead it returns a
  // look-alike user whose identities list is empty. A real new or retried sign-up has one.
  if (data.user?.identities?.length === 0) {
    throw new ConflictError(ALREADY_REGISTERED);
  }

  return { message: CHECK_INBOX };
}

/**
 * Signs in a student whose email has been confirmed.
 *
 * @param input - The request body; typed unknown because it comes straight from the request.
 *   Must be an object with a text `email` (a calvin.edu address) and a non-empty text `password`.
 * @returns The student's user id and an access token for later requests
 * @throws ValidationError if the email or password is missing or not text, or if the email is
 *   not a calvin.edu address (Supabase is not called)
 * @throws UnauthorizedError if the email or password is wrong (one message for both, so nobody
 *   can tell which emails have accounts)
 * @throws ForbiddenError if the student hasn't confirmed their email yet
 * @throws TooManyRequestsError if Supabase's request rate limit has been hit
 * @throws Error for any other Supabase failure; the error handler turns it into a 500
 */
export async function signInStudent(input: unknown): Promise<SignInResult> {
  // Same checks as sign-up: no account outside calvin.edu can exist, so there's no
  // reason to ask Supabase about one
  const { email, password } = readCredentials(input);

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error) {
    throwIfRateLimited(error.code);

    if (error.code === "email_not_confirmed") {
      throw new ForbiddenError(NOT_VERIFIED);
    }

    if (error.code === "invalid_credentials") {
      throw new UnauthorizedError(BAD_LOGIN);
    }

    // Anything else is unexpected: keep Supabase's message in the server log only
    throw new Error(`signInWithPassword failed: ${error.message}`);
  }

  // Safety net: if "Confirm email" is ever switched off in the Supabase dashboard, Supabase
  // signs unconfirmed users in. Checking the confirmation here keeps them out regardless.
  if (!data.user.email_confirmed_at) {
    throw new ForbiddenError(NOT_VERIFIED);
  }

  return { userId: data.user.id, accessToken: data.session.access_token };
}

// Turns either of Supabase's rate-limit error codes into a clear 429 for the student.
// Shared by sign-up and sign-in so both use the same wording.
function throwIfRateLimited(code: string | undefined): void {
  if (code !== undefined && RATE_LIMIT_CODES.includes(code)) {
    throw new TooManyRequestsError(TOO_MANY);
  }
}

// Checks the request body has a text email and password, and that the email is a
// calvin.edu address. Returns the email trimmed and lowercased (so "JDoe@Calvin.edu" and
// "jdoe@calvin.edu" are the same account) and the password exactly as typed (spaces and
// capitals are a real part of a password).
function readCredentials(input: unknown): Credentials {
  // Arrays are objects in JavaScript, so they need their own check. Express leaves the
  // body undefined when a request has none, which this also catches.
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError(REQUIRED);
  }

  const { email, password } = input as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    throw new ValidationError(REQUIRED);
  }

  if (typeof password !== "string" || password === "") {
    throw new ValidationError(REQUIRED);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!CALVIN_EMAIL_PATTERN.test(normalizedEmail)) {
    throw new ValidationError(CALVIN_ONLY);
  }

  return { email: normalizedEmail, password };
}

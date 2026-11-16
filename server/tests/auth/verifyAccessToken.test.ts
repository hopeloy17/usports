// Tests for verifyAccessToken (src/auth/verifyAccessToken.ts): checking a student's sign-in token.
//
// When a student signs in, Supabase gives the app an access token: their user id plus an expiry
// time, signed with a key only Supabase holds. The server trusts the user id ONLY after Supabase's
// getClaims has checked that signature and expiry. These tests fake getClaims so they never reach
// the real Supabase project.
jest.mock("../../src/db/client", () => ({
  supabase: {},
  authClient: {
    auth: {
      getClaims: jest.fn(),
    },
  },
}));

import { AuthInvalidJwtError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { authClient } from "../../src/db/client";
import { verifyAccessToken } from "../../src/auth/verifyAccessToken";

const mockedGetClaims = authClient.auth.getClaims as jest.Mock;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TOKEN = "header.payload.signature";

// What getClaims returns for a token it has verified, with the given claims inside
function verified(claims: Record<string, unknown>) {
  return { data: { claims, header: { alg: "ES256" }, signature: new Uint8Array() }, error: null };
}

// A signed-in student's token: Supabase marks those with role "authenticated"
const STUDENT_CLAIMS = { sub: USER_ID, role: "authenticated", exp: 4102444800 };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("verifyAccessToken", () => {
  it("returns the user id inside a valid sign-in token", async () => {
    mockedGetClaims.mockResolvedValue(verified(STUDENT_CLAIMS));

    await expect(verifyAccessToken(TOKEN)).resolves.toBe(USER_ID);
    // The token itself is what Supabase checks
    expect(mockedGetClaims).toHaveBeenCalledWith(TOKEN);
  });

  it.each([
    ["a made-up or edited token (bad signature)", "Invalid JWT signature"],
    ["an expired token", "JWT has expired"],
    ["text that isn't a token at all", "Invalid JWT structure"],
  ])("returns null for %s", async (_label, message) => {
    mockedGetClaims.mockResolvedValue({ data: null, error: new AuthInvalidJwtError(message) });

    await expect(verifyAccessToken(TOKEN)).resolves.toBeNull();
  });

  // Supabase's own project keys are signed tokens too, but they don't belong to a student
  it.each([
    ["the public (anon) project key", { role: "anon" }],
    ["the secret (service_role) project key", { role: "service_role" }],
    ["a token with no user id", { role: "authenticated" }],
    ["a token with an empty user id", { sub: "", role: "authenticated" }],
    ["a token for a different role", { sub: USER_ID, role: "anon" }],
  ])("returns null for %s, since it isn't a signed-in student", async (_label, claims) => {
    mockedGetClaims.mockResolvedValue(verified(claims));

    await expect(verifyAccessToken(TOKEN)).resolves.toBeNull();
  });

  it("throws when Supabase can't be reached, so the server answers 500 (not 'sign in again')", async () => {
    mockedGetClaims.mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError("fetch failed", 0),
    });

    await expect(verifyAccessToken(TOKEN)).rejects.toThrow("Supabase");
  });
});

// Tests for the sign-in / create-account screen (src/app/sign-in.tsx).
//
// The app opens on this screen. A student either signs in (and goes to the games feed) or
// creates an account with their calvin.edu email (and is told to check their inbox). Every
// error the server sends back must be shown word for word, so the student knows what to fix:
// a non-Calvin email, an already-registered email, or an email that isn't verified yet.
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { router } from "expo-router";
import * as authApi from "../../api/auth";
import type { SignInResult } from "../../api/auth";
import SignInScreen from "../sign-in";

// Fake the API so these tests never make real network calls; each test picks the answer
jest.mock("../../api/auth");

// The screen navigates with router.replace and sets its header with <Stack.Screen>;
// there is no real navigator in these tests, so stub both out
jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  Stack: { Screen: () => null },
}));

const mockedSignIn = jest.mocked(authApi.signIn);
const mockedSignUp = jest.mocked(authApi.signUp);
const mockedReplace = jest.mocked(router.replace);

// A valid student, reused across tests
const EMAIL = "jdoe12@calvin.edu";
const PASSWORD = "correct-horse-battery";

// The server's messages (must match server/src/services/authService.ts)
const CHECK_INBOX = "Check your calvin.edu inbox to confirm your account";
const CALVIN_ONLY = "Please use your calvin.edu email address";
const ALREADY_REGISTERED = "An account with this email already exists";
const TOO_MANY = "Too many attempts; please wait a few minutes and try again";
const NOT_VERIFIED = "Please verify your email before signing in";
const BAD_LOGIN = "Invalid email or password";

// A request the test finishes by hand, so it can look at the screen while it's still waiting.
// Note: `await fireEvent.press(...)` waits for the press handler to finish (RNTL v14 returns
// the handler's promise), so tests that check the "in progress" state press WITHOUT await,
// look at the screen, then call resolve() and await the press to finish cleanly.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

// Renders the screen and returns its queries plus helpers that act like a student
async function renderScreen() {
  const screen = await render(<SignInScreen />);

  // Type into the email and password fields, found by their screen-reader labels
  const typeCredentials = async (email: string, password: string) => {
    await fireEvent.changeText(screen.getByLabelText("Calvin email"), email);
    await fireEvent.changeText(screen.getByLabelText("Password"), password);
  };

  // Press the main button (its text depends on the mode, so use its testID)
  const pressSubmit = async () => {
    await fireEvent.press(screen.getByTestId("auth-submit"));
  };

  // Press the link that switches between "Sign in" and "Create account"
  const toggleMode = async () => {
    await fireEvent.press(screen.getByTestId("auth-toggle-mode"));
  };

  return { ...screen, typeCredentials, pressSubmit, toggleMode };
}

// Reset the fakes so one test's answers never leak into the next
beforeEach(() => {
  jest.resetAllMocks();
});

// ===========================================================================
// Sign in (the default mode)
// ===========================================================================
describe("SignInScreen: signing in", () => {
  it("starts in sign-in mode with labelled email and password fields", async () => {
    const { getByLabelText, getByTestId, getByText } = await renderScreen();

    expect(getByLabelText("Calvin email")).toBeTruthy();
    expect(getByLabelText("Password")).toBeTruthy();
    expect(getByText("Sign in with your Calvin email")).toBeTruthy();
    expect(getByTestId("auth-submit")).toHaveTextContent("Sign in");
  });

  it("hides the password as it is typed", async () => {
    const { getByLabelText } = await renderScreen();

    expect(getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("sets the email field up for typing an email address", async () => {
    const { getByLabelText } = await renderScreen();
    const emailField = getByLabelText("Calvin email");

    // Email keyboard, and no auto-capitalizing the first letter of the address
    expect(emailField.props.keyboardType).toBe("email-address");
    expect(emailField.props.autoCapitalize).toBe("none");
  });

  it("sends the typed email and password to signIn, not signUp", async () => {
    mockedSignIn.mockResolvedValue({ userId: "u1", accessToken: "token" });
    const { typeCredentials, pressSubmit } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(mockedSignIn).toHaveBeenCalledTimes(1);
    expect(mockedSignIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(mockedSignUp).not.toHaveBeenCalled();
  });

  it("goes to the games feed after a successful sign-in", async () => {
    mockedSignIn.mockResolvedValue({ userId: "u1", accessToken: "token" });
    const { typeCredentials, pressSubmit } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    // replace (not push) so the back button can't return to the sign-in screen
    expect(mockedReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("blocks an unverified student: shows the verify message and stays on this screen", async () => {
    mockedSignIn.mockRejectedValue(new Error(NOT_VERIFIED));
    const { typeCredentials, pressSubmit, findByText } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(await findByText(NOT_VERIFIED)).toBeTruthy();
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it("shows the server's message for a wrong email or password", async () => {
    mockedSignIn.mockRejectedValue(new Error(BAD_LOGIN));
    const { typeCredentials, pressSubmit, findByText } = await renderScreen();

    await typeCredentials(EMAIL, "wrong-password");
    await pressSubmit();

    expect(await findByText(BAD_LOGIN)).toBeTruthy();
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it("shows the server's message for a non-Calvin email", async () => {
    mockedSignIn.mockRejectedValue(new Error(CALVIN_ONLY));
    const { typeCredentials, pressSubmit, findByText } = await renderScreen();

    await typeCredentials("jdoe@gmail.com", PASSWORD);
    await pressSubmit();

    expect(await findByText(CALVIN_ONLY)).toBeTruthy();
  });

  it("shows the friendly message when the server can't be reached", async () => {
    mockedSignIn.mockRejectedValue(new Error(authApi.NETWORK_ERROR));
    const { typeCredentials, pressSubmit, findByText } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(await findByText(authApi.NETWORK_ERROR)).toBeTruthy();
  });

  it("marks errors as alerts so screen readers announce them", async () => {
    mockedSignIn.mockRejectedValue(new Error(NOT_VERIFIED));
    const { typeCredentials, pressSubmit, findByTestId } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    const error = await findByTestId("auth-error");
    expect(error.props.accessibilityRole).toBe("alert");
    // The message is in words, never shown by color alone (docs: NFR-5)
    expect(error).toHaveTextContent(NOT_VERIFIED);
  });

  it("shows progress and ignores extra presses while signing in", async () => {
    const request = deferred<SignInResult>();
    mockedSignIn.mockReturnValue(request.promise);
    const { typeCredentials, getByTestId, findByText } = await renderScreen();

    await typeCredentials(EMAIL, PASSWORD);
    // First press starts the request; don't await it, since it's still in flight
    const firstPress = fireEvent.press(getByTestId("auth-submit"));
    expect(await findByText("Signing in...")).toBeTruthy();

    // A second press while waiting must not send a second request
    await fireEvent.press(getByTestId("auth-submit"));
    expect(mockedSignIn).toHaveBeenCalledTimes(1);

    // Finish the request so nothing is left running after the test
    request.resolve({ userId: "u1", accessToken: "token" });
    await firstPress;
  });

  it("clears the previous error when the student tries again", async () => {
    const retry = deferred<SignInResult>();
    mockedSignIn.mockRejectedValueOnce(new Error(BAD_LOGIN)).mockReturnValueOnce(retry.promise);
    const { typeCredentials, pressSubmit, findByText, getByTestId, queryByTestId } =
      await renderScreen();

    // First attempt fails and shows its error
    await typeCredentials(EMAIL, "wrong-password");
    await pressSubmit();
    expect(await findByText(BAD_LOGIN)).toBeTruthy();

    // Second attempt: while it's still running, the old error is already gone
    await typeCredentials(EMAIL, PASSWORD);
    const retryPress = fireEvent.press(getByTestId("auth-submit"));
    await waitFor(() => expect(queryByTestId("auth-error")).toBeNull());

    // Finish the retry so nothing is left running after the test
    retry.resolve({ userId: "u1", accessToken: "token" });
    await retryPress;
  });
});

// ===========================================================================
// Create an account
// ===========================================================================
describe("SignInScreen: creating an account", () => {
  it("switches to create-account mode from the link under the form", async () => {
    const { toggleMode, getByTestId, getByText } = await renderScreen();

    await toggleMode();

    expect(getByText("Create an account with your Calvin email")).toBeTruthy();
    expect(getByTestId("auth-submit")).toHaveTextContent("Create account");
  });

  it("sends the typed email and password to signUp, not signIn", async () => {
    mockedSignUp.mockResolvedValue(CHECK_INBOX);
    const { toggleMode, typeCredentials, pressSubmit } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(mockedSignUp).toHaveBeenCalledTimes(1);
    expect(mockedSignUp).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(mockedSignIn).not.toHaveBeenCalled();
  });

  it("after signing up, tells the student to check their inbox", async () => {
    mockedSignUp.mockResolvedValue(CHECK_INBOX);
    const { toggleMode, typeCredentials, pressSubmit, findByTestId } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    const notice = await findByTestId("auth-notice");
    expect(notice).toHaveTextContent(CHECK_INBOX, { exact: false });
    // Announced to screen readers too
    expect(notice.props.accessibilityRole).toBe("alert");
  });

  it("after signing up, switches back to sign-in with the email kept and the password cleared", async () => {
    mockedSignUp.mockResolvedValue(CHECK_INBOX);
    const { toggleMode, typeCredentials, pressSubmit, findByTestId, getByLabelText, getByTestId } =
      await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();
    await findByTestId("auth-notice");

    // Ready to sign in as soon as they've clicked the link in the email
    expect(getByTestId("auth-submit")).toHaveTextContent("Sign in");
    expect(getByLabelText("Calvin email").props.value).toBe(EMAIL);
    expect(getByLabelText("Password").props.value).toBe("");
  });

  it("does not go to the feed after signing up (the email isn't verified yet)", async () => {
    mockedSignUp.mockResolvedValue(CHECK_INBOX);
    const { toggleMode, typeCredentials, pressSubmit, findByTestId } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();
    await findByTestId("auth-notice");

    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it("rejects a non-Calvin email with the server's message and stays in create-account mode", async () => {
    mockedSignUp.mockRejectedValue(new Error(CALVIN_ONLY));
    const { toggleMode, typeCredentials, pressSubmit, findByText, getByTestId } =
      await renderScreen();

    await toggleMode();
    await typeCredentials("jdoe@gmail.com", PASSWORD);
    await pressSubmit();

    expect(await findByText(CALVIN_ONLY)).toBeTruthy();
    expect(getByTestId("auth-submit")).toHaveTextContent("Create account");
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it("shows the server's message for an already-registered email", async () => {
    mockedSignUp.mockRejectedValue(new Error(ALREADY_REGISTERED));
    const { toggleMode, typeCredentials, pressSubmit, findByText } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(await findByText(ALREADY_REGISTERED)).toBeTruthy();
  });

  it("shows the server's message when sign-ups are rate-limited", async () => {
    mockedSignUp.mockRejectedValue(new Error(TOO_MANY));
    const { toggleMode, typeCredentials, pressSubmit, findByText } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();

    expect(await findByText(TOO_MANY)).toBeTruthy();
  });

  it("shows progress and ignores extra presses while creating the account", async () => {
    const request = deferred<string>();
    mockedSignUp.mockReturnValue(request.promise);
    const { toggleMode, typeCredentials, getByTestId, findByText } = await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    // First press starts the request; don't await it, since it's still in flight
    const firstPress = fireEvent.press(getByTestId("auth-submit"));
    expect(await findByText("Creating account...")).toBeTruthy();

    // A second press while waiting must not send a second request
    await fireEvent.press(getByTestId("auth-submit"));
    expect(mockedSignUp).toHaveBeenCalledTimes(1);

    // Finish the request so nothing is left running after the test
    request.resolve(CHECK_INBOX);
    await firstPress;
  });

  it("clears old errors and notices when switching between modes", async () => {
    mockedSignUp.mockRejectedValue(new Error(ALREADY_REGISTERED));
    const { toggleMode, typeCredentials, pressSubmit, findByText, queryByTestId } =
      await renderScreen();

    await toggleMode();
    await typeCredentials(EMAIL, PASSWORD);
    await pressSubmit();
    expect(await findByText(ALREADY_REGISTERED)).toBeTruthy();

    // Back to sign-in: the sign-up error no longer applies
    await toggleMode();

    expect(queryByTestId("auth-error")).toBeNull();
    expect(queryByTestId("auth-notice")).toBeNull();
  });

  it("switches back to sign-in mode from the same link", async () => {
    const { toggleMode, getByTestId, getByText } = await renderScreen();

    await toggleMode();
    await toggleMode();

    expect(getByText("Sign in with your Calvin email")).toBeTruthy();
    expect(getByTestId("auth-submit")).toHaveTextContent("Sign in");
  });
});

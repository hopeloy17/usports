// Tests for the app's entry route (src/app/index.tsx): where the app goes when it opens.
//
// Students must sign in (with a verified calvin.edu email) before they can use the app, so
// opening the app lands on the sign-in screen, unless someone is still signed in on this
// device (on the web, a reload keeps you signed in), who goes straight to the games feed.
import React from "react";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import RootIndex from "../index";

// Who's signed in on this device, chosen per test (the real profile context reads it from
// the browser's storage)
let mockSession = { sessionChecked: true, isSignedIn: false };
jest.mock("../../context/ProfileContext", () => ({
  useProfile: () => mockSession,
}));

// Stand-in screens: these tests only check WHERE the app lands, not what each screen shows
function FakeSignInScreen() {
  return <Text>Sign-in screen</Text>;
}

function FakeFeedScreen() {
  return <Text>Games feed</Text>;
}

// Opens the app at its entry route with the two places it can go
function openApp() {
  return renderRouter(
    {
      index: RootIndex,
      "sign-in": FakeSignInScreen,
      "(tabs)/index": FakeFeedScreen,
    },
    { initialUrl: "/" },
  );
}

beforeEach(() => {
  mockSession = { sessionChecked: true, isSignedIn: false };
});

describe("RootIndex", () => {
  it("opens the app on the sign-in screen when nobody is signed in", async () => {
    const app = await openApp();

    expect(await app.findByText("Sign-in screen")).toBeTruthy();
    expect(app.queryByText("Games feed")).toBeNull();
  });

  it("opens straight to the games feed when someone is still signed in on this device", async () => {
    mockSession = { sessionChecked: true, isSignedIn: true };

    const app = await openApp();

    expect(await app.findByText("Games feed")).toBeTruthy();
    expect(app.queryByText("Sign-in screen")).toBeNull();
  });

  it("shows neither screen until the saved sign-in has been read (web page start-up)", async () => {
    // Redirecting now could bounce a signed-in student to the sign-in screen by mistake
    mockSession = { sessionChecked: false, isSignedIn: false };

    const app = await openApp();

    expect(app.queryByText("Sign-in screen")).toBeNull();
    expect(app.queryByText("Games feed")).toBeNull();
  });
});

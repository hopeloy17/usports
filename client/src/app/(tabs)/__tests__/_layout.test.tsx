// Tests for the tabs layout (src/app/(tabs)/_layout.tsx): the feed, profile, and add tabs.
//
// The tabs are for signed-in students only. Anyone else, including someone who types
// /profile straight into the address bar, is sent to the sign-in screen.
import React from "react";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import TabsLayout from "../_layout";

// Who's signed in on this device, chosen per test
let mockSession = { sessionChecked: true, isSignedIn: false };
jest.mock("../../../context/ProfileContext", () => ({
  useProfile: () => mockSession,
}));

// The real tab bar is drawn by the phone's own tab views, which don't exist in tests. Stand in
// a plain container that just shows the current tab: these tests are about who may see the
// tabs at all, not how the tab bar looks
jest.mock("expo-router/unstable-native-tabs", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Slot } = jest.requireActual<typeof import("expo-router")>("expo-router");
  const Trigger = Object.assign(() => null, { Label: () => null, Icon: () => null });
  const NativeTabs = Object.assign(() => createElement(Slot), { Trigger });
  return { NativeTabs };
});

// Stand-in screens
function FakeProfileTab() {
  return <Text>Profile tab</Text>;
}

function FakeSignInScreen() {
  return <Text>Sign-in screen</Text>;
}

// Opens the app straight at /profile (as if typed into the address bar)
function openProfileDirectly() {
  return renderRouter(
    {
      "(tabs)/_layout": TabsLayout,
      "(tabs)/profile": FakeProfileTab,
      "sign-in": FakeSignInScreen,
    },
    { initialUrl: "/profile" },
  );
}

beforeEach(() => {
  mockSession = { sessionChecked: true, isSignedIn: false };
});

describe("TabsLayout", () => {
  it("sends someone who isn't signed in to the sign-in screen, even if they type /profile", async () => {
    const app = await openProfileDirectly();

    expect(await app.findByText("Sign-in screen")).toBeTruthy();
    expect(app.queryByText("Profile tab")).toBeNull();
  });

  it("shows the tab to a signed-in student", async () => {
    mockSession = { sessionChecked: true, isSignedIn: true };

    const app = await openProfileDirectly();

    expect(await app.findByText("Profile tab")).toBeTruthy();
    expect(app.queryByText("Sign-in screen")).toBeNull();
  });

  it("shows nothing until the saved sign-in has been read (web page start-up)", async () => {
    mockSession = { sessionChecked: false, isSignedIn: false };

    const app = await openProfileDirectly();

    expect(app.queryByText("Profile tab")).toBeNull();
    expect(app.queryByText("Sign-in screen")).toBeNull();
  });
});

// Tests for the root layout (src/app/_layout.tsx): the navigation stack every screen sits in.
//
// The layout decides each screen's header before that screen's own code has loaded. On the
// web, the server-rendered page and the first frames use these settings alone, so a screen
// that should have no header bar must say so here, or a default bar flashes in first.
import React from "react";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "../_layout";

// The real providers load the profile and games from the server. These tests are only
// about headers, so each provider just renders the screens inside it
jest.mock("../../context/ProfileContext", () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../../context/EventFiltersContext", () => ({
  EventFiltersProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../../context/EventContext", () => ({
  EventProvider: ({ children }: { children: React.ReactNode }) => children,
}));
// The real registrar sets up phone notifications as soon as its file loads, which needs the
// phone's notification system (not available in Jest). It draws nothing, so a stand-in that
// renders nothing keeps these header tests the same
jest.mock("../../notifications/PushNotificationRegistrar", () => ({
  PushNotificationRegistrar: () => null,
}));

// A stand-in sign-in screen. Unlike the real one, it sets no header options of its own,
// so the test sees exactly what the layout decides
function FakeSignInScreen() {
  return <Text>Sign-in screen</Text>;
}

describe("RootLayout", () => {
  it("shows the sign-in screen without a header bar, even before the screen's own code runs", async () => {
    const app = await renderRouter(
      { _layout: RootLayout, "sign-in": FakeSignInScreen },
      { initialUrl: "/sign-in" },
    );

    expect(await app.findByText("Sign-in screen")).toBeTruthy();

    // In tests the stack's header isn't drawn as text; it's one settings element from
    // react-native-screens ("RNSScreenStackHeaderConfig") whose `hidden` prop says whether
    // the bar shows. Undeclared screens get a visible bar titled with the route name
    const headers = app.container.queryAll((node) => node.type === "RNSScreenStackHeaderConfig");
    expect(headers).toHaveLength(1);
    expect(headers[0].props.hidden).toBe(true);
  });
});

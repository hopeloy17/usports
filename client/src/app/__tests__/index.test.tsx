// Tests for the app's entry route (src/app/index.tsx): where the app goes when it opens.
//
// Students must sign in (with a verified calvin.edu email) before they can use the app,
// so opening the app has to land on the sign-in screen, not the games feed.
import React from "react";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import RootIndex from "../index";

// Stand-in screens: these tests only check WHERE the app lands, not what each screen shows
function FakeSignInScreen() {
  return <Text>Sign-in screen</Text>;
}

function FakeFeedScreen() {
  return <Text>Games feed</Text>;
}

describe("RootIndex", () => {
  it("opens the app on the sign-in screen instead of the games feed", async () => {
    const app = await renderRouter(
      {
        index: RootIndex,
        "sign-in": FakeSignInScreen,
        "(tabs)/index": FakeFeedScreen,
      },
      { initialUrl: "/" },
    );

    expect(await app.findByText("Sign-in screen")).toBeTruthy();
    expect(app.queryByText("Games feed")).toBeNull();
  });
});

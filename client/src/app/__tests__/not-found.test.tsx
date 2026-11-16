// Tests for the "page not found" screen (src/app/+not-found.tsx), shown when a link or typed
// web address doesn't match any screen in the app.
import React from "react";
import { render } from "@testing-library/react-native";
import NotFoundScreen from "../+not-found";

// The screen sets its title through the router's Stack and links home with Link. These tests
// only check what the screen says, so Stack.Screen draws nothing and Link just shows its contents
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("NotFoundScreen", () => {
  it("tells the student the screen doesn't exist and offers a way home", async () => {
    const { getByText } = await render(<NotFoundScreen />);

    expect(getByText("This screen doesn't exist.")).toBeTruthy();
    expect(getByText("Go to home screen!")).toBeTruthy();
  });
});

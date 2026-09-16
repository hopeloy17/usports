import { render } from "@testing-library/react-native";
import React from "react";
import { EventProvider } from "../../../context/EventContext";
import EventFeedScreen from "../index";

// Helper function updated to await render
const renderWithProvider = async (component: React.ReactElement) => {
  return await render(<EventProvider>{component}</EventProvider>);
};

describe("EventFeedScreen", () => {
  it("renders the header and the mock events", async () => {
    const { getByText } = await renderWithProvider(<EventFeedScreen />);

    expect(getByText("Upcoming Games")).toBeTruthy();
    expect(getByText("Basketball")).toBeTruthy();
    expect(getByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
    expect(getByText("Soccer")).toBeTruthy();
    expect(getByText("📍 Gainey Athletic Complex")).toBeTruthy();
  });

  it("displays the correct joined vs min players headcount", async () => {
    const { getByText } = await renderWithProvider(<EventFeedScreen />);

    expect(getByText("6/10 joined")).toBeTruthy();
    expect(getByText("2/14 joined")).toBeTruthy();
  });
});

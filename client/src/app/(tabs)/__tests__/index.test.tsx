import { render } from "@testing-library/react-native";
import React from "react";
import * as eventApi from "../../../api/events";
import { EventProvider } from "../../../context/EventContext";
import EventFeedScreen from "../index";

jest.mock("../../../api/events");

const mockServerEvents: eventApi.ServerEvent[] = [
  {
    id: "1",
    name: "John D.'s Basketball Game",
    sport: "Basketball",
    venue: "Spoelhof Fieldhouse",
    dateTime: "2026-10-10T19:00:00.000Z",
    joinedCount: 6,
    minPlayers: 10,
    skillLevel: "Intermediate",
    host: "John D.",
    roster: [
      "John D.",
      "Sarah M.",
      "Mike T.",
      "David L.",
      "Emma W.",
      "Chris P.",
    ],
  },
  {
    id: "2",
    name: "Alex B.'s Soccer Game",
    sport: "Soccer",
    venue: "Gainey Athletic Complex",
    dateTime: "2026-10-11T17:30:00.000Z",
    joinedCount: 2,
    minPlayers: 14,
    skillLevel: "Beginner",
    host: "Alex B.",
    roster: ["Alex B.", "Gary L."],
  },
];

const renderWithProvider = async (component: React.ReactElement) => {
  return await render(<EventProvider>{component}</EventProvider>);
};

describe("EventFeedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue(mockServerEvents);
  });

  it("renders the header and the mock events", async () => {
    const { getByText, findByText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    expect(getByText("Upcoming Games")).toBeTruthy();
    expect(await findByText("Basketball")).toBeTruthy();
    expect(await findByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
    expect(await findByText("Soccer")).toBeTruthy();
    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
  });

  it("displays the correct joined vs min players headcount", async () => {
    const { findByText } = await renderWithProvider(<EventFeedScreen />);

    expect(await findByText("6/10 joined")).toBeTruthy();
    expect(await findByText("2/14 joined")).toBeTruthy();
  });
});

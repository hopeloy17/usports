import React from "react";
import * as eventApi from "../../../api/events";
import { EventProvider } from "../../../context/EventContext";
import { EventFiltersProvider } from "../../../context/EventFiltersContext";
import EventFeedScreen from "../index";
import { fireEvent, render } from "@testing-library/react-native";

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

// Wraps a screen in every provider it needs
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EventFiltersProvider>
      <EventProvider>{children}</EventProvider>
    </EventFiltersProvider>
  );
}

const renderWithProvider = async (component: React.ReactElement) => {
  return await render(<Providers>{component}</Providers>);
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
    // expect(await findByText("Basketball")).toBeTruthy();
    expect(await findByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
    // expect(await findByText("Soccer")).toBeTruthy();
    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
  });

  it("displays the correct joined vs min players headcount", async () => {
    const { findByText } = await renderWithProvider(<EventFeedScreen />);

    expect(await findByText("6/10 joined")).toBeTruthy();
    expect(await findByText("2/14 joined")).toBeTruthy();
  });
});

// Builds a dateTime a number of days from today, in local time
function daysFromNow(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

describe("EventFeedScreen filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue(mockServerEvents);
  });

  // Taps the "Filters" text in the header to open the filter dialog
  async function openFilters(
    findByLabelText: (label: string) => Promise<Parameters<typeof fireEvent.press>[0]>,
    ){
    await fireEvent.press(await findByLabelText("Open filters"));
  }

  it("hides the filter chips until Filters is pressed", async () => {
    const { findByLabelText, queryByLabelText } = await renderWithProvider(<EventFeedScreen />);

    expect(await findByLabelText("Open filters")).toBeTruthy();
    expect(queryByLabelText("Filter by sport: Soccer")).toBeNull();
  });

  it("shows a filter chip for each sport in the feed", async () => {
    const { findByLabelText } = await renderWithProvider(<EventFeedScreen />);

    await openFilters(findByLabelText);

    expect(await findByLabelText("Filter by sport: Basketball")).toBeTruthy();
    expect(await findByLabelText("Filter by sport: Soccer")).toBeTruthy();
  });

  it("shows only games for the selected sport", async () => {
    const { findByLabelText, findByText, queryByText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by sport: Soccer"));

    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(queryByText("📍 Spoelhof Fieldhouse")).toBeNull();
  });

  it("clears the sport filter when the chip is pressed again", async () => {
    const { findByLabelText, findByText } = await renderWithProvider(<EventFeedScreen />);

    await openFilters(findByLabelText);
    const soccerChip = await findByLabelText("Filter by sport: Soccer");
    await fireEvent.press(soccerChip);
    await fireEvent.press(soccerChip);

    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(await findByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
  });

  it("shows only games for the selected skill level", async () => {
    const { findByLabelText, findByText, queryByText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by skill: Beginner"));

    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(queryByText("📍 Spoelhof Fieldhouse")).toBeNull();
  });

  it("shows only games on the selected date", async () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([
      { ...mockServerEvents[0], dateTime: daysFromNow(0, 19) },
      { ...mockServerEvents[1], dateTime: daysFromNow(1, 17) },
    ]);
    const { findByLabelText, findByText, queryByText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by date: Tomorrow"));

    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(queryByText("📍 Spoelhof Fieldhouse")).toBeNull();
  });

  it("shows a message when no games match the filters", async () => {
    const { findByLabelText, findByText } = await renderWithProvider(<EventFeedScreen />);

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by sport: Basketball"));
    await fireEvent.press(await findByLabelText("Filter by skill: Beginner"));

    expect(await findByText("No games match your filters.")).toBeTruthy();
  });

  it("closes the dialog when the area outside it is pressed", async () => {
    const { findByLabelText, queryByLabelText } = await renderWithProvider(<EventFeedScreen />);

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Close filters"));

    expect(queryByLabelText("Filter by sport: Soccer")).toBeNull();
  });

  it("keeps the filter and shows a count after the dialog closes", async () => {
    const { findByLabelText, findByText, queryByText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by sport: Soccer"));
    await fireEvent.press(await findByLabelText("Close filters"));

    expect(await findByText("Filters (1)")).toBeTruthy();
    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(queryByText("📍 Spoelhof Fieldhouse")).toBeNull();
  });

  it("keeps the filter after leaving the screen and coming back", async () => {
    const { findByLabelText, findByText, queryByText, rerender } = await renderWithProvider(
      <EventFeedScreen />,
    );

    await openFilters(findByLabelText);
    await fireEvent.press(await findByLabelText("Filter by sport: Soccer"));
    await fireEvent.press(await findByLabelText("Close filters"));

    // Leave the feed (like opening a game's details), then come back
    await rerender(<Providers>{null}</Providers>);
    await rerender(<Providers><EventFeedScreen /></Providers>);

    expect(await findByText("Filters (1)")).toBeTruthy();
    expect(await findByText("📍 Gainey Athletic Complex")).toBeTruthy();
    expect(queryByText("📍 Spoelhof Fieldhouse")).toBeNull();
  });
});

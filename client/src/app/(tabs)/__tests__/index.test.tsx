import React from "react";
import * as eventApi from "../../../api/events";
import { EventProvider } from "../../../context/EventContext";
import { EventFiltersProvider } from "../../../context/EventFiltersContext";
import EventFeedScreen from "../index";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

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
    status: "open",
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
    status: "open",
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

  it("shows a loading state while the server request is pending", async () => {
    let resolveFetch: (events: eventApi.ServerEvent[]) => void = () => {};
    (eventApi.fetchEvents as jest.Mock).mockImplementation(
      () => new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { findByTestId } = await renderWithProvider(<EventFeedScreen />);

    expect(await findByTestId("feed-loading")).toBeTruthy();
    await act(async () => {
      resolveFetch(mockServerEvents);
    });
  });

  it("shows a server error and retries with the active filters", async () => {
    (eventApi.fetchEvents as jest.Mock)
      .mockRejectedValueOnce(new Error("Event service unavailable"))
      .mockResolvedValueOnce(mockServerEvents);

    const { findByTestId, findByLabelText } = await renderWithProvider(
      <EventFeedScreen />,
    );

    expect(await findByTestId("feed-error")).toHaveTextContent(
      /Event service unavailable/,
    );
    await fireEvent.press(await findByLabelText("Retry loading games"));

    await waitFor(() => {
      expect(eventApi.fetchEvents).toHaveBeenLastCalledWith({});
    });
  });
});

describe("EventFeedScreen cancellation notice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The feed treats the signed-in student as "You" when there is no ProfileProvider
  const joinedAndCancelled = { ...mockServerEvents[0], status: "cancelled" as const, roster: ["John D.", "You"] };

  it("tells the student when a game they joined was cancelled", async () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([joinedAndCancelled]);
    const { findByTestId } = await renderWithProvider(<EventFeedScreen />);

    expect(await findByTestId("cancelled-notice")).toHaveTextContent(
      "A game you joined was cancelled: John D.'s Basketball Game",
    );
  });

  it("stays quiet about cancelled games the student did not join", async () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([
      { ...joinedAndCancelled, roster: ["John D."] },
    ]);
    const { findByText, queryByTestId } = await renderWithProvider(<EventFeedScreen />);

    await findByText("📍 Spoelhof Fieldhouse");
    expect(queryByTestId("cancelled-notice")).toBeNull();
  });

  it("stays quiet about joined games that are still on", async () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([
      { ...joinedAndCancelled, status: "open" },
    ]);
    const { findByText, queryByTestId } = await renderWithProvider(<EventFeedScreen />);

    await findByText("📍 Spoelhof Fieldhouse");
    expect(queryByTestId("cancelled-notice")).toBeNull();
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
    expect(eventApi.fetchEvents).toHaveBeenLastCalledWith({ sport: "Soccer" });
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

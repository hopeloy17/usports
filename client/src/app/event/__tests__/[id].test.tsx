import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import * as eventApi from "../../../api/events";
import { EventProvider } from "../../../context/EventContext";
import { ProfileProvider } from "../../../context/ProfileContext";
import EventDetailsScreen from "../[id]";

jest.mock("../../../api/events");
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  Stack: {
    Screen: () => null,
  },
}));

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
    description: "Casual pickup basketball game at Spoelhof Fieldhouse.",
  },
  {
    id: "2",
    name: "Full Game",
    sport: "Soccer",
    venue: "Gainey Athletic Complex",
    dateTime: "2026-10-11T17:30:00.000Z",
    joinedCount: 14,
    minPlayers: 14,
    skillLevel: "Beginner",
    host: "Alex B.",
    roster: ["Alex B."],
  },
];

const renderWithProviders = async (component: React.ReactElement) => {
  return await render(
    <ProfileProvider>
      <EventProvider>{component}</EventProvider>
    </ProfileProvider>,
  );
};

describe("EventDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue(
      mockServerEvents.map((e) => ({ ...e, roster: [...e.roster] })),
    );
    (eventApi.joinEventApi as jest.Mock).mockImplementation(
      async (id: string, participant: string) => {
        const target = mockServerEvents.find((e) => e.id === id)!;
        return {
          ...target,
          joinedCount: target.joinedCount + 1,
          roster: [...target.roster, participant],
        };
      },
    );
    (eventApi.leaveEventApi as jest.Mock).mockImplementation(
      async (id: string, participant: string) => {
        const target = mockServerEvents.find((e) => e.id === id)!;
        return {
          ...target,
          joinedCount: target.joinedCount - 1,
          roster: target.roster.filter((p) => p !== participant),
        };
      },
    );
  });

  it("displays 'Event not found.' if event is not in list", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "999" });

    const { findByText } = await renderWithProviders(<EventDetailsScreen />);
    expect(await findByText("Event not found.")).toBeTruthy();
  });

  it("renders event details, description, status, and roster", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "1" });

    const { findByText } = await renderWithProviders(<EventDetailsScreen />);

    expect(await findByText("John D.'s Basketball Game")).toBeTruthy();
    expect(await findByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
    expect(await findByText("Intermediate")).toBeTruthy();
    expect(
      await findByText("Casual pickup basketball game at Spoelhof Fieldhouse."),
    ).toBeTruthy();
    expect(await findByText("6/10 players joined")).toBeTruthy();
    expect(await findByText("Needs 4 more players to happen.")).toBeTruthy();
    expect(await findByText("John D. (Host)")).toBeTruthy();
    expect(await findByText("Sarah M.")).toBeTruthy();
  });

  it("does not display threshold warning when min players is reached", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "2" });

    const { findByText, queryByText } = await renderWithProviders(
      <EventDetailsScreen />,
    );

    expect(await findByText("14/14 players joined")).toBeTruthy();
    expect(queryByText(/Needs .* more players to happen\./)).toBeNull();
  });

  it("allows joining and leaving the game via the action button", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "1" });

    const { findByText, getByText } = await renderWithProviders(
      <EventDetailsScreen />,
    );

    // Initial state: not joined
    expect(await findByText("Join Game")).toBeTruthy();

    // Press Join Game
    await act(async () => {
      fireEvent.press(getByText("Join Game"));
    });

    // Should now show Leave Game and updated headcount
    expect(await findByText("Leave Game")).toBeTruthy();
    expect(await findByText("7/10 players joined")).toBeTruthy();

    // Press Leave Game
    await act(async () => {
      fireEvent.press(getByText("Leave Game"));
    });

    // Back to Join Game
    expect(await findByText("Join Game")).toBeTruthy();
  });
});

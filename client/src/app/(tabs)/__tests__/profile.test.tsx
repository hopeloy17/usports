import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import * as eventApi from "../../../api/events";
import { EventProvider, useEvents } from "../../../context/EventContext";
import { ProfileProvider } from "../../../context/ProfileContext";
import ProfileScreen from "../profile";

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

const renderWithProviders = async (component: React.ReactElement) => {
  return await render(
    <ProfileProvider>
      <EventProvider>{component}</EventProvider>
    </ProfileProvider>,
  );
};

describe("ProfileScreen", () => {
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
  });

  it("renders the profile details and empty games state", async () => {
    const { findByText } = await renderWithProviders(<ProfileScreen />);

    expect(await findByText("student@calvin.edu")).toBeTruthy();
    expect(await findByText("Intermediate")).toBeTruthy();
    expect(await findByText("You haven't joined any games yet.")).toBeTruthy();
  });

  it("edits the display name and skill level", async () => {
    const { findByText, getByText, getByPlaceholderText } =
      await renderWithProviders(<ProfileScreen />);

    expect(await findByText("Edit Profile")).toBeTruthy();

    await act(async () => fireEvent.press(getByText("Edit Profile")));
    await act(async () =>
      fireEvent.changeText(getByPlaceholderText("Your name"), "Jordan K."),
    );
    await act(async () => fireEvent.press(getByText("Advanced")));
    await act(async () => fireEvent.press(getByText("Save")));

    expect(await findByText("Jordan K.")).toBeTruthy();
    expect(await findByText("Advanced")).toBeTruthy();
  });

  it("lists games the user has joined", async () => {
    let toggleJoin: (id: string) => Promise<void> = async () => {};
    let eventsLength = 0;
    const JoinHelper = () => {
      const { toggleJoin: tj, events } = useEvents();
      toggleJoin = tj;
      eventsLength = events.length;
      return null;
    };

    const { findByText } = await renderWithProviders(
      <>
        <JoinHelper />
        <ProfileScreen />
      </>,
    );

    await waitFor(() => expect(eventsLength).toBeGreaterThan(0));

    await act(async () => {
      await toggleJoin("1");
    });

    expect(await findByText("Basketball")).toBeTruthy();
    expect(await findByText("📍 Spoelhof Fieldhouse")).toBeTruthy();
  });
});

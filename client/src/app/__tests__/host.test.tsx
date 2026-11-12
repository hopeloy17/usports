import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import * as eventApi from "../../api/events";
import * as profileApi from "../../api/profile";
import { Event, EventProvider, useEvents } from "../../context/EventContext";
import { ProfileProvider } from "../../context/ProfileContext";
import CreateScreen from "../host";

jest.mock("../../api/events");
jest.mock("../../api/profile");

// The screen dismisses itself via the router after submitting; there's no
// navigator mounted in these tests, so stub it out
jest.mock("expo-router", () => ({
  router: { canGoBack: () => false, back: jest.fn(), replace: jest.fn() },
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

const renderWithProviders = async (component: React.ReactElement) => {
  return await render(
    <ProfileProvider>
      <EventProvider>{component}</EventProvider>
    </ProfileProvider>,
  );
};

describe("CreateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (profileApi.fetchProfile as jest.Mock).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "You",
      schoolEmail: "student@calvin.edu",
      classYear: 2027,
      bio: null,
      profilePhotoUrl: null,
    });
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue(
      mockServerEvents.map((e) => ({ ...e, roster: [...e.roster] })),
    );
    (eventApi.createEventApi as jest.Mock).mockImplementation(
      async (input: eventApi.CreateEventInput) => {
        return {
          ...input,
          id: String(Date.now()),
          name: `${input.host}'s ${input.sport} Game`,
          joinedCount: 1,
          roster: [input.host],
        };
      },
    );
  });

  it("renders the form fields", async () => {
    const { findByText } = await renderWithProviders(<CreateScreen />);

    expect(await findByText("Sport")).toBeTruthy();
    expect(await findByText("Venue")).toBeTruthy();
    expect(await findByText("Date")).toBeTruthy();
    expect(await findByText("Time")).toBeTruthy();
    expect(await findByText("Minimum Players")).toBeTruthy();
    expect(await findByText("Skill Level")).toBeTruthy();
    expect(await findByText("Create Game")).toBeTruthy();
  });

  it("creates an event hosted by the signed-in user when submitted", async () => {
    let events: Event[] = [];
    const EventsHelper = () => {
      events = useEvents().events;
      return null;
    };

    const { getByText } = await renderWithProviders(
      <>
        <EventsHelper />
        <CreateScreen />
      </>,
    );

    await waitFor(() => expect(events.length).toBeGreaterThan(0));
    const initialCount = events.length;

    await fireEvent.press(getByText("Create Game"));
    await waitFor(() => expect(events.length).toBe(initialCount + 1));

    const newEvent = events[events.length - 1];
    expect(newEvent.host).toBe("You");
    expect(newEvent.joinedCount).toBe(1);
    expect(newEvent.roster).toEqual(["You"]);
    expect(newEvent.sport).toBe("Basketball");
    expect(newEvent.skillLevel).toBe("Intermediate");
    expect(eventApi.createEventApi).toHaveBeenCalled();
  });

  it("builds dateTime from the selected date and time defaults", async () => {
    let events: Event[] = [];
    const EventsHelper = () => {
      events = useEvents().events;
      return null;
    };

    const { getByText } = await renderWithProviders(
      <>
        <EventsHelper />
        <CreateScreen />
      </>,
    );

    await waitFor(() => expect(events.length).toBeGreaterThan(0));

    await fireEvent.press(getByText("Create Game"));

    await waitFor(() => expect(events.length).toBeGreaterThan(initialEventsCount));

    const newEvent = events[events.length - 1];
    const created = new Date(newEvent.dateTime);

    // Defaults to today at 7:00 PM local time
    expect(created.getHours()).toBe(19);
    expect(created.getMinutes()).toBe(0);
    expect(created.getDate()).toBe(new Date().getDate());
  });

  it("navigates back to the homepage when Back button is pressed", async () => {
    const { findByText, getByText } = await renderWithProviders(<CreateScreen />);

    expect(await findByText("Back")).toBeTruthy();

    await fireEvent.press(getByText("Back"));

    const { router } = require("expo-router");
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("shows custom location input when 'Custom location' is selected", async () => {
    const { getByTestId, queryByTestId, findByText } = await renderWithProviders(<CreateScreen />);

    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByTestId("custom-venue-input")).toBeNull();

    fireEvent(getByTestId("venue-picker"), "valueChange", "Custom location");

    await waitFor(() => {
      expect(getByTestId("custom-venue-input")).toBeTruthy();
    });
  });

  it("submits with custom venue name and description when entered", async () => {
    let events: Event[] = [];
    const EventsHelper = () => {
      events = useEvents().events;
      return null;
    };

    const { getByTestId, getByText, getByPlaceholderText } = await renderWithProviders(
      <>
        <EventsHelper />
        <CreateScreen />
      </>,
    );

    await waitFor(() => expect(events.length).toBeGreaterThan(0));

    fireEvent(getByTestId("venue-picker"), "valueChange", "Custom location");

    await waitFor(() => expect(getByTestId("custom-venue-input")).toBeTruthy());
    const customInput = getByTestId("custom-venue-input");
    const descInput = getByPlaceholderText(/Add details about the game/);

    await fireEvent.changeText(customInput, "Seminary Pond");
    await fireEvent.changeText(descInput, "Bring your own skates and sticks.");
    await fireEvent.press(getByText("Create Game"));

    await waitFor(() => expect(events.length).toBe(3));
    const newEvent = events[events.length - 1];
    expect(newEvent.venue).toBe("Seminary Pond");
    expect(newEvent.description).toBe("Bring your own skates and sticks.");
    expect(eventApi.createEventApi).toHaveBeenCalledWith(
      expect.objectContaining({
        venue: "Seminary Pond",
        description: "Bring your own skates and sticks.",
      }),
    );
  });

  it("shows validation error and prevents submission when minimum players exceeds maximum players", async () => {
    const { getByTestId, getByText, findByTestId } = await renderWithProviders(<CreateScreen />);

    await findByTestId("create-game-button");

    await act(async () => {
      fireEvent.changeText(getByTestId("min-players-input"), "12");
      fireEvent.changeText(getByTestId("max-players-input"), "6");
    });
    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

    const errorMessage = await findByTestId("error-message");
    expect(errorMessage).toHaveTextContent("Minimum players cannot be greater than maximum players");
    expect(eventApi.createEventApi).not.toHaveBeenCalled();
    const { router } = require("expo-router");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows validation error and prevents submission when selected date is in the past", async () => {
    const { getByTestId, getByText, findByTestId } = await renderWithProviders(<CreateScreen />);

    await findByTestId("create-game-button");

    await act(async () => {
      fireEvent(getByTestId("event-calendar"), "dayPress", { dateString: "2020-01-01" });
    });
    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

    const errorMessage = await findByTestId("error-message");
    expect(errorMessage).toHaveTextContent("Event date cannot be in the past");
    expect(eventApi.createEventApi).not.toHaveBeenCalled();
    const { router } = require("expo-router");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows validation error when custom location is selected but not specified", async () => {
    const { getByTestId, getByText, findByTestId } = await renderWithProviders(<CreateScreen />);

    await findByTestId("create-game-button");

    await act(async () => {
      fireEvent(getByTestId("venue-picker"), "valueChange", "Custom location");
    });
    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

    const errorMessage = await findByTestId("error-message");
    expect(errorMessage).toHaveTextContent("Please specify a custom location");
    expect(eventApi.createEventApi).not.toHaveBeenCalled();
  });

  it("shows clear server error message when server rejects creation with 400 validation error", async () => {
    (eventApi.createEventApi as jest.Mock).mockRejectedValueOnce(
      new Error("Invalid event data"),
    );

    const { findByTestId, getByText } = await renderWithProviders(<CreateScreen />);
    await findByTestId("create-game-button");

    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

    const errorMessage = await findByTestId("error-message");
    expect(errorMessage).toHaveTextContent("Invalid event data");
    const { router } = require("expo-router");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows clear server error message when server returns 500 internal server error", async () => {
    (eventApi.createEventApi as jest.Mock).mockRejectedValueOnce(
      new Error("Internal server error"),
    );

    const { findByTestId, getByText } = await renderWithProviders(<CreateScreen />);
    await findByTestId("create-game-button");

    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

    const errorMessage = await findByTestId("error-message");
    expect(errorMessage).toHaveTextContent("Internal server error");
    const { router } = require("expo-router");
    expect(router.replace).not.toHaveBeenCalled();
  });
});


const initialEventsCount = 2;

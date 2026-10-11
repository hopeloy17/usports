import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import * as eventApi from "../../api/events";
import { Event, EventProvider, useEvents } from "../../context/EventContext";
import { ProfileProvider } from "../../context/ProfileContext";
import CreateScreen from "../host";

jest.mock("../../api/events");

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

describe("CreateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

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

    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

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

    await act(async () => {
      fireEvent.press(getByText("Back"));
    });

    const { router } = require("expo-router");
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("shows custom location input when 'Custom location' is selected", async () => {
    const { getByTestId, queryByTestId, findByText } = await renderWithProviders(<CreateScreen />);

    expect(await findByText("Venue")).toBeTruthy();
    expect(queryByTestId("custom-venue-input")).toBeNull();

    const picker = getByTestId("venue-picker");
    await act(async () => {
      picker.props.onChange({
        nativeEvent: { newValue: "Custom location", newIndex: 8 },
      });
    });

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

    const picker = getByTestId("venue-picker");
    await act(async () => {
      picker.props.onChange({
        nativeEvent: { newValue: "Custom location", newIndex: 8 },
      });
    });

    await waitFor(() => expect(getByTestId("custom-venue-input")).toBeTruthy());
    const customInput = getByTestId("custom-venue-input");
    const descInput = getByPlaceholderText(/Add details about the game/);

    await act(async () => {
      fireEvent.changeText(customInput, "Seminary Pond");
      fireEvent.changeText(descInput, "Bring your own skates and sticks.");
    });

    await act(async () => {
      fireEvent.press(getByText("Create Game"));
    });

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
});


const initialEventsCount = 2;

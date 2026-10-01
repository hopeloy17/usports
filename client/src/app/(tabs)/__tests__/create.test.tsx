import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Event, EventProvider, useEvents } from "../../../context/EventContext";
import { ProfileProvider } from "../../../context/ProfileContext";
import CreateScreen from "../create";

const renderWithProviders = async (component: React.ReactElement) => {
  return await render(
    <ProfileProvider>
      <EventProvider>{component}</EventProvider>
    </ProfileProvider>,
  );
};

describe("CreateScreen", () => {
  it("renders the form fields", async () => {
    const { getByText } = await renderWithProviders(<CreateScreen />);

    expect(getByText("Sport")).toBeTruthy();
    expect(getByText("Venue")).toBeTruthy();
    expect(getByText("Date")).toBeTruthy();
    expect(getByText("Time")).toBeTruthy();
    expect(getByText("Minimum Players")).toBeTruthy();
    expect(getByText("Skill Level")).toBeTruthy();
    expect(getByText("Create Game")).toBeTruthy();
  });

  it("creates an event hosted by the signed-in user when submitted", async () => {
    // Null-rendering helper that reads live context from inside the providers
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

    const initialCount = events.length;

    await act(async () => fireEvent.press(getByText("Create Game")));

    expect(events.length).toBe(initialCount + 1);

    const newEvent = events[events.length - 1];
    expect(newEvent.host).toBe("You");
    expect(newEvent.joinedCount).toBe(1);
    expect(newEvent.roster).toEqual(["You"]);
    expect(newEvent.sport).toBe("Basketball");
    expect(newEvent.skillLevel).toBe("Intermediate");
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

    await act(async () => fireEvent.press(getByText("Create Game")));

    const newEvent = events[events.length - 1];
    const created = new Date(newEvent.dateTime);

    // Defaults to today at 7:00 PM local time
    expect(created.getHours()).toBe(19);
    expect(created.getMinutes()).toBe(0);
    expect(created.getDate()).toBe(new Date().getDate());
  });
});

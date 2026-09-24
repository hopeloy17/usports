import { act, renderHook } from "@testing-library/react-native";
import React from "react";
import { EventProvider, useEvents } from "../EventContext";

describe("EventContext", () => {
  it("toggles join status and updates headcount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventProvider>{children}</EventProvider>
    );

    const { result } = await renderHook(() => useEvents(), { wrapper });

    // Check initial state
    const initialEvent = result.current.events[0];
    expect(initialEvent.isJoinedByMe).toBe(false);
    expect(initialEvent.joinedCount).toBe(6);
    expect(initialEvent.roster).not.toContain("You");

    // Await the asynchronous state update
    await act(async () => {
      result.current.toggleJoin(initialEvent.id);
    });

    // Verify state after re-render completes
    const updatedEvent = result.current.events[0];
    expect(updatedEvent.isJoinedByMe).toBe(true);
    expect(updatedEvent.joinedCount).toBe(7);
    expect(updatedEvent.roster).toContain("You");
  });
});

it("creates a new event with the host auto-jojned", async () => {
  const wrapper = ({children}: {children: React.ReactNode}) => (<EventProvider>{children}</EventProvider>);

  const {result} = await renderHook(() => useEvents(), {wrapper});
  const initialCount = result.current.events.length;

  await act(async() => {
    result.current.createEvent({
      sport: "Volleyball",
      venue: "Van Noord Arena",
      dateTime: "2026-09-30T18:00:00",
      minPlayers:8,
      skillLevel: "Amateur",
      host: "Taylor R.",
    });
  });

  const events = result.current.events;
  const newEvent = events[events.length - 1];

  expect(events.length).toBe(initialCount + 1);
  expect(newEvent.sport).toBe("Volleyball");
  expect(newEvent.host).toBe("Taylor R.");
  expect(newEvent.joinedCount).toBe(1);
  expect(newEvent.roster).toEqual(['Taylor R.']);
  expect(newEvent.isJoinedByMe).toBe(true);
  expect(newEvent.id).toBeTruthy();
});
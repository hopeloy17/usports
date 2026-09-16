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

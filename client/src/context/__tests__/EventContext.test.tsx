import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import * as eventApi from "../../api/events";
import { EventProvider, useEvents } from "../EventContext";

jest.mock("../../api/events");

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

describe("EventContext", () => {
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
    (eventApi.createEventApi as jest.Mock).mockImplementation(
      async (input: eventApi.CreateEventInput) => {
        return {
          ...input,
          id: "3",
          name: `${input.host}'s ${input.sport} Game`,
          joinedCount: 1,
          roster: [input.host],
        };
      },
    );
  });

  it("toggles join status and updates headcount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventProvider>{children}</EventProvider>
    );

    const { result } = await renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.events.length).toBeGreaterThan(0);
    });

    // Check initial state
    const initialEvent = result.current.events[0];
    expect(initialEvent.isJoinedByMe).toBe(false);
    expect(initialEvent.joinedCount).toBe(6);
    expect(initialEvent.roster).not.toContain("You");

    // Await the asynchronous state update
    await act(async () => {
      await result.current.toggleJoin(initialEvent.id);
    });

    // Verify state after re-render completes
    const updatedEvent = result.current.events[0];
    expect(updatedEvent.isJoinedByMe).toBe(true);
    expect(updatedEvent.joinedCount).toBe(7);
    expect(updatedEvent.roster).toContain("You");
    expect(eventApi.joinEventApi).toHaveBeenCalledWith("1", "You");
  });

  it("creates a new event with the host auto-joined", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventProvider>{children}</EventProvider>
    );

    const { result } = await renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.events.length).toBeGreaterThan(0);
    });

    const initialCount = result.current.events.length;

    await act(async () => {
      await result.current.createEvent({
        sport: "Volleyball",
        description: "Casual Volleyball game at Van Noord Arena",
        venue: "Van Noord Arena",
        dateTime: "2026-09-30T18:00:00",
        minPlayers: 8,
        skillLevel: "Beginner",
        host: "Taylor R.",
      });
    });

    const events = result.current.events;
    const newEvent = events[events.length - 1];

    expect(newEvent.name).toBe("Taylor R.'s Volleyball Game");
    expect(events.length).toBe(initialCount + 1);
    expect(newEvent.sport).toBe("Volleyball");
    expect(newEvent.host).toBe("Taylor R.");
    expect(newEvent.joinedCount).toBe(1);
    expect(newEvent.roster).toEqual(["Taylor R."]);
    expect(newEvent.isJoinedByMe).toBe(true);
    expect(newEvent.id).toBeTruthy();
    expect(eventApi.createEventApi).toHaveBeenCalled();
  });
});
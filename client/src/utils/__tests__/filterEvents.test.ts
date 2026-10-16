import type { Event } from "../../context/EventContext";
import { filterEvents } from "../filterEvents";

// Builds a dateTime string from local time so tests pass in any timezone
function localDateTime(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "0",
    name: "Test Game",
    sport: "Basketball",
    venue: "Spoelhof Fieldhouse",
    dateTime: localDateTime(2026, 10, 20, 19),
    joinedCount: 1,
    minPlayers: 10,
    skillLevel: "Intermediate",
    host: "John D.",
    roster: ["John D."],
    isJoinedByMe: false,
    ...overrides,
  };
}

const basketballGame = makeEvent({
  id: "1",
  sport: "Basketball",
  skillLevel: "Intermediate",
  dateTime: localDateTime(2026, 10, 20, 19),
});

const soccerGame = makeEvent({
  id: "2",
  sport: "Soccer",
  skillLevel: "Beginner",
  dateTime: localDateTime(2026, 10, 21, 17, 30),
});

const events = [basketballGame, soccerGame];

function ids(filteredEvents: Event[]): string[] {
  return filteredEvents.map((event) => event.id);
}

describe("filterEvents", () => {
  it("returns every event when no filters are set", () => {
    expect(ids(filterEvents(events, {}))).toEqual(["1", "2"]);
  });

  it("filters by sport", () => {
    expect(ids(filterEvents(events, { sport: "Soccer" }))).toEqual(["2"]);
  });

  it("matches sport case-insensitively", () => {
    expect(ids(filterEvents(events, { sport: "soccer" }))).toEqual(["2"]);
  });

  it("filters by skill level", () => {
    expect(ids(filterEvents(events, { skillLevel: "Intermediate" }))).toEqual(["1"]);
  });

  it("filters by date", () => {
    expect(ids(filterEvents(events, { date: "2026-10-21" }))).toEqual(["2"]);
  });

  it("requires every filter to match", () => {
    expect(filterEvents(events, { sport: "Basketball", skillLevel: "Beginner" })).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterEvents(events, { sport: "Curling" })).toEqual([]);
  });

  it("does not change the original list", () => {
    filterEvents(events, { sport: "Soccer" });

    expect(ids(events)).toEqual(["1", "2"]);
  });

  it("matches the date using the user's local day, not UTC", () => {
    const lateGame = makeEvent({ id: "3", dateTime: localDateTime(2026, 10, 20, 23, 30) });

    expect(ids(filterEvents([lateGame], { date: "2026-10-20" }))).toEqual(["3"]);
  });
});

import { ServerEvent } from "../src/api/events";

// Stand-in for the T2 seed data (#58) until it exists: the same two games the
// server starts with (server/src/data/events.ts). Dates are relative to "now"
// so the games never go stale. Swap this file for the real seed when #58 lands.
export function getSeedEvents(): ServerEvent[] {
  const today = new Date();
  today.setHours(19, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 30, 0, 0);

  return [
    {
      id: "1",
      name: "John D.'s Basketball Game",
      sport: "Basketball",
      venue: "Spoelhof Fieldhouse",
      dateTime: today.toISOString(),
      joinedCount: 6,
      minPlayers: 10,
      skillLevel: "Intermediate",
      status: "open",
      host: "John D.",
      roster: ["John D.", "Sarah M.", "Mike T.", "David L.", "Emma W.", "Chris P."],
      description: "Casual pickup basketball game at Spoelhof Fieldhouse.",
    },
    {
      id: "2",
      name: "Alex B.'s Soccer Game",
      sport: "Soccer",
      venue: "Gainey Athletic Complex",
      dateTime: tomorrow.toISOString(),
      joinedCount: 2,
      minPlayers: 14,
      skillLevel: "Beginner",
      status: "open",
      host: "Alex B.",
      roster: ["Alex B.", "Gary L."],
      description: "Friendly soccer scrimmage at Gainey Athletic Complex.",
    },
  ];
}

import { render } from "@testing-library/react-native";
import { Event } from "../../context/EventContext";
import GameCard from "../GameCard";

const baseGame: Event = {
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
  roster: ["John D."],
  isJoinedByMe: false,
};

describe("GameCard status badge", () => {
  it.each([
    ["open", "Open"],
    ["full", "Full"],
    ["cancelled", "Cancelled"],
  ] as const)("shows the %s status as '%s'", async (status, label) => {
    const { getByText } = await render(<GameCard game={{ ...baseGame, status }} />);

    expect(getByText(label)).toBeTruthy();
  });
});

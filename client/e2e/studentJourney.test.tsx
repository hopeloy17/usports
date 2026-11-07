// End-to-end tests: the whole app is rendered (real screens, real router, real
// context code) and driven like a student would use it. Only the network is
// faked, by an in-memory copy of the REST API that starts from the seed data.
// The testIDs used here are listed in e2e/README.md; keep them stable.
import { router } from "expo-router";
import { act, fireEvent, waitFor } from "expo-router/testing-library";
import { createFakeApi } from "./fakeApi";
import { jordan, renderApp, switchStudent, taylor } from "./renderApp";
import { getSeedEvents } from "./seedData";

const fakeApi = createFakeApi();

// Taps an element and waits for everything it sets off (including the fake
// network call) to finish, like a student pausing for the screen to update
async function press(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    await fireEvent.press(element);
  });
}

beforeEach(() => {
  fakeApi.reset(getSeedEvents());
  fakeApi.install();
});

describe("student journey", () => {
  // Blocked on #63 (there is no sign-up screen yet). Fill this in when it merges:
  // type a name and a @calvin.edu email, submit, and expect to land on the feed.
  it.skip("signs up with a calvin.edu email", async () => {});

  it("starts from the seed data: both seeded games are in the feed", async () => {
    const app = await renderApp(taylor);

    expect(await app.findByTestId("game-card-1")).toBeTruthy();
    expect(app.getByTestId("game-card-2")).toBeTruthy();
    expect(app.getByTestId("game-card-headcount-1")).toHaveTextContent("6/10 joined");
  });

  it("edits a profile, hosts a game, and a second student joins and leaves it", async () => {
    // --- Student one edits their profile ---
    const app = await renderApp(taylor);
    await app.findByTestId("game-card-1");

    await act(async () => router.push("/profile"));
    await press(app.getByTestId("edit-profile-button"));
    await fireEvent.changeText(app.getByTestId("display-name-input"), "Taylor");
    await press(app.getByTestId("skill-option-Advanced"));
    await press(app.getByTestId("save-profile-button"));
    expect(app.getByTestId("profile-name")).toHaveTextContent("Taylor");

    // --- ...hosts a soccer game for 2 players ---
    await act(async () => router.push("/host"));
    await press(app.getByTestId("sport-option-Soccer"));
    await fireEvent.changeText(app.getByTestId("min-players-input"), "2");
    await press(app.getByTestId("create-game-button"));

    // --- ...and sees it in the feed with only themselves joined ---
    await waitFor(() => expect(fakeApi.getEvents()).toHaveLength(3));
    const newGame = fakeApi.getEvents()[2];
    expect(newGame.host).toBe("Taylor");
    expect(await app.findByTestId(`game-card-${newGame.id}`)).toBeTruthy();
    expect(app.getByTestId(`game-card-headcount-${newGame.id}`)).toHaveTextContent("1/2 joined");

    // --- Student two opens the app and finds the same game ---
    await switchStudent(jordan);
    expect(app.getByTestId("feed-list")).toBeTruthy();
    expect(await app.findByTestId(`game-card-headcount-${newGame.id}`)).toHaveTextContent(
      "1/2 joined",
    );

    // --- ...joins it and watches the count go up ---
    await press(app.getByTestId(`game-card-${newGame.id}`));
    expect(await app.findByTestId("event-headcount")).toHaveTextContent("1/2 players joined");
    await press(app.getByTestId("join-leave-button"));
    await waitFor(() =>
      expect(app.getByTestId("event-headcount")).toHaveTextContent("2/2 players joined"),
    );
    expect(app.getByTestId("roster-item-Jordan")).toBeTruthy();
    expect(fakeApi.getEvents()[2].roster).toEqual(["Taylor", "Jordan"]);

    // --- ...then leaves again and the count goes back down ---
    await press(app.getByTestId("join-leave-button"));
    await waitFor(() =>
      expect(app.getByTestId("event-headcount")).toHaveTextContent("1/2 players joined"),
    );
    expect(app.queryByTestId("roster-item-Jordan")).toBeNull();
    expect(fakeApi.getEvents()[2].roster).toEqual(["Taylor"]);
  });

  it("warns a student when a game they joined has been cancelled", async () => {
    const seed = getSeedEvents();
    seed[0] = { ...seed[0], status: "cancelled", roster: [...seed[0].roster, "Jordan"] };
    fakeApi.reset(seed);

    const app = await renderApp(jordan);

    expect(await app.findByTestId("cancelled-notice")).toHaveTextContent(
      "A game you joined was cancelled: John D.'s Basketball Game",
    );
  });
});

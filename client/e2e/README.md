# End-to-end client tests

These tests render the whole app (real screens, real router, real context code)
and drive it like a student would. They run with the rest of the client suite
(`npm test`). Only the network is faked.

## How it works

| File | Purpose |
|---|---|
| `renderApp.tsx` | Renders the app in a test router. Swaps the native tab bar (native code cannot run in Jest) for a plain `Stack`. `switchStudent()` signs in as someone else. |
| `fakeApi.ts` | In-memory copy of the REST API (`/api/events`, join, leave) that follows the server's rules. Reset before every test. |
| `seedData.ts` | The starting games. A stand-in for the T2 seed data (#58); replace it when #58 lands. |
| `studentJourney.test.tsx` | The tests. |

Tests switch tabs with `router.push("/profile")` because the tab bar is not
rendered. A "second student" is created with `switchStudent(jordan)`, which
restarts the client state (profile, filters, loaded games) as a different profile.

Waiting for the fake network: wrap taps in `act(async () => { await fireEvent.press(...) })`
(the `press` helper in the test file does this).

## Not covered yet

- **Sign-up with a calvin.edu email** is `it.skip` until the sign-up screen (#63) is merged.

## Stable testIDs

Tests depend on these. If you rename one, update the tests in the same PR.

| testID | Where | Element |
|---|---|---|
| `feed-list` | Feed (`(tabs)/index.tsx`) | The list of games |
| `cancelled-notice` | Feed | Banner for a joined game that was cancelled |
| `game-card-<id>` | `GameCard.tsx` | A game card (tap to open details) |
| `game-card-headcount-<id>` | `GameCard.tsx` | "6/10 joined" text |
| `status-badge` | `StatusBadge.tsx` | Open / Full / Cancelled pill |
| `event-headcount` | Details (`event/[id].tsx`) | "6/10 players joined" text |
| `join-leave-button` | Details | Join Game / Leave Game |
| `roster-item-<name>` | Details | One row of the roster |
| `edit-profile-button` | Profile (`(tabs)/profile.tsx`) | Starts editing |
| `display-name-input` | Profile | Name field while editing |
| `skill-option-<level>` | Profile | Beginner / Intermediate / Advanced while editing |
| `save-profile-button` | Profile | Saves the edit |
| `profile-name` | Profile | The saved display name |
| `sport-option-<sport>` | Host (`host.tsx`) | A sport button, e.g. `sport-option-Soccer` |
| `min-players-input` | Host | Minimum players field |
| `max-players-input` | Host | Maximum players field |
| `create-game-button` | Host | Creates the game |
| `venue-picker`, `custom-venue-input` | Host | Existing IDs from the host tests |

`<id>` is the game id, `<name>` the player's display name, `<level>` and
`<sport>` the visible option text.

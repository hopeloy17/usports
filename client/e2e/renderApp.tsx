import { useState } from "react";
import { Redirect, Stack, router } from "expo-router";
import { act } from "expo-router/testing-library";
import { renderRouter } from "expo-router/testing-library";
import HostScreen from "../src/app/host";
import EventDetailsScreen from "../src/app/event/[id]";
import FeedScreen from "../src/app/(tabs)/index";
import ProfileScreen from "../src/app/(tabs)/profile";
import { EventProvider } from "../src/context/EventContext";
import { EventFiltersProvider } from "../src/context/EventFiltersContext";
import { Profile, ProfileProvider } from "../src/context/ProfileContext";

// Two students the tests can sign in as
export const taylor: Profile = {
  id: "taylor",
  displayName: "Student",
  email: "taylor@calvin.edu",
  skillLevel: "Beginner",
};
export const jordan: Profile = {
  id: "jordan",
  displayName: "Jordan",
  email: "jordan@calvin.edu",
  skillLevel: "Intermediate",
};

// Lets a test change who is signed in (set by the layout below while it is mounted)
let setSignedInStudent: ((student: Profile) => void) | undefined;

// Same providers and screens as src/app/_layout.tsx, signed in as `firstStudent`.
// The providers are keyed by student id, so switching students throws away all
// client state (profile, filters, loaded events) and starts fresh, like the app
// being closed and reopened by someone else.
function makeRootLayout(firstStudent: Profile) {
  return function TestRootLayout() {
    const [student, setStudent] = useState(firstStudent);
    setSignedInStudent = setStudent;

    return (
      <ProfileProvider key={student.id} startingProfile={student}>
        <EventFiltersProvider>
          <EventProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="event/[id]" options={{ title: "Game Details" }} />
              <Stack.Screen name="host" options={{ title: "Host a Game" }} />
            </Stack>
          </EventProvider>
        </EventFiltersProvider>
      </ProfileProvider>
    );
  };
}

// Signs in as a different student and returns them to the feed. The fake API
// keeps the shared games, so the new student sees what the last one did.
export async function switchStudent(student: Profile) {
  await act(async () => {
    setSignedInStudent?.(student);
    router.replace("/");
  });
}

// The real tab bar is native code that cannot run in Jest, so tests use a plain
// Stack in its place. Tests switch tabs with router.push("/profile").
function TestTabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// Stands in for src/app/index.tsx: an already-signed-in student opens the app on the feed
function SignedInIndex() {
  return <Redirect href="/(tabs)" />;
}

// Renders the whole app signed in as `student`
export async function renderApp(student: Profile) {
  return await renderRouter(
    {
      _layout: makeRootLayout(student),
      // The real entry route sends students to sign in first (tested in
      // src/app/__tests__/index.test.tsx). These students are already signed in,
      // so "/" goes straight to the feed instead.
      index: SignedInIndex,
      "(tabs)/_layout": TestTabsLayout,
      "(tabs)/index": FeedScreen,
      "(tabs)/profile": ProfileScreen,
      "event/[id]": EventDetailsScreen,
      host: HostScreen,
    },
    { initialUrl: "/" },
  );
}

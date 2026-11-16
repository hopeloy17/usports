import { Stack } from "expo-router";
import { EventProvider } from "../context/EventContext";
import { ProfileProvider } from "../context/ProfileContext";
import { EventFiltersProvider } from "../context/EventFiltersContext";

export default function RootLayout() {
  return (
    <ProfileProvider>
      <EventFiltersProvider>
        <EventProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Full-screen sign-in with no header bar. Set here, not only inside the screen,
                so the bar is hidden from the first frame (including the server-rendered web page) */}
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen
              name="event/[id]"
              options={{
                title: "Game Details",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="host"
              options={{
                title: "Host a Game",
                presentation: "modal",
              }}
            />
          </Stack>
        </EventProvider>
      </EventFiltersProvider>
    </ProfileProvider>
  );
}

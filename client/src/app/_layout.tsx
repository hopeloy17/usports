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

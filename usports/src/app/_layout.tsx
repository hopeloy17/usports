import { Stack } from "expo-router";
import { EventProvider } from "../context/EventContext";

export default function RootLayout() {
  return (
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
      </Stack>
    </EventProvider>
  );
}

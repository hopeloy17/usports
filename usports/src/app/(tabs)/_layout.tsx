import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          tabBarLabel: "Feed",
        }}
      />
      {/* We can add a "Create" or "Profile" tab screen here later */}
    </Tabs>
  );
}

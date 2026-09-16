import { Redirect } from "expo-router";

export default function RootIndex() {
  // Redirect immediately to the tabs layout
  return <Redirect href="/(tabs)" />;
}

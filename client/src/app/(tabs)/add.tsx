import { Redirect } from "expo-router";

// Tapping the "Create" tab redirects directly to the /host screen
export default function CreateTab() {
  return <Redirect href="/host" />;
}

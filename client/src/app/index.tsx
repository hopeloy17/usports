import { Redirect } from "expo-router";

export default function RootIndex() {
  // Students must sign in (with a verified calvin.edu email) before using the app,
  // so opening it always lands on the sign-in screen; signing in then goes to the feed
  return <Redirect href="/sign-in" />;
}

import { Redirect } from "expo-router";
import { useProfile } from "../context/ProfileContext";

export default function RootIndex() {
  // Students must sign in (with a verified calvin.edu email) before using the app. Someone
  // still signed in on this device (on the web, a reload keeps you signed in) goes straight
  // to the games feed; everyone else lands on the sign-in screen
  const { sessionChecked, isSignedIn } = useProfile();

  // Still reading the saved sign-in (only while the web page starts up): show nothing yet,
  // rather than bouncing a signed-in student to the sign-in screen by mistake
  if (!sessionChecked) return null;

  return <Redirect href={isSignedIn ? "/(tabs)" : "/sign-in"} />;
}

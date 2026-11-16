import { usePushNotifications } from "./usePushNotifications";

// Renders nothing; lives inside ProfileProvider so it knows who is signed in
export function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

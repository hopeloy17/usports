// Web version of PushNotificationRegistrar. When the app is built for the web (including the
// server-rendered web pages), Metro uses this file instead of PushNotificationRegistrar.tsx.
//
// Phone push notifications don't exist in a browser (getPushTokenAsync already gives up on the
// web). Worse, expo-notifications throws on the web: its useLastNotificationResponse hook fails
// with "getLastNotificationResponse is not available on web", and since the registrar sits in
// the root layout, that one error blanked every page. So on the web the registrar does nothing
// and doesn't load expo-notifications at all. Phones keep using the .tsx version.
export function PushNotificationRegistrar() {
  return null;
}

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const GAME_ALERTS_CHANNEL_ID = "game-alerts";

// Show alerts as banners even while the app is open
export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// The EAS project id ties push tokens to this app (set by `eas init` in app.json)
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Asks for permission and returns this device's Expo push token, or null when
 * push isn't possible (web, simulator, permission denied, or no EAS project id).
 */
export async function getPushTokenAsync(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  // Android 13+ only shows the permission prompt once a channel exists
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(GAME_ALERTS_CHANNEL_ID, {
      name: "Game alerts",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  if (!(await hasNotificationPermission())) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn(
      "[USports] Push notifications need an EAS project id. Run `eas init` in client/.",
    );
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// Pulls the event id out of a tapped notification, if it is about an event
export function getEventIdFromResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const eventId = response.notification.request.content.data?.eventId;
  return typeof eventId === "string" && eventId.length > 0 ? eventId : null;
}

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { registerPushTokenApi } from "../api/pushTokens";
import { useProfile } from "../context/ProfileContext";
import {
  configureForegroundNotifications,
  getEventIdFromResponse,
  getPushTokenAsync,
} from "./pushNotifications";

configureForegroundNotifications();

/**
 * Registers this phone for push notifications under the signed-in student, and
 * opens the game's details when a notification about it is tapped.
 */
export function usePushNotifications(): void {
  const { profile } = useProfile();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        const token = await getPushTokenAsync();
        if (token && !isCancelled) {
          await registerPushTokenApi(profile.id, token);
        }
      } catch (error) {
        // Push is a nice-to-have; the app keeps working without it
        console.warn("[USports] Could not register for push notifications", error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [profile.id]);

  useEffect(() => {
    if (
      !lastResponse ||
      lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }

    const eventId = getEventIdFromResponse(lastResponse);
    if (eventId) {
      router.push({ pathname: "/event/[id]", params: { id: eventId } });
    }

    // The last response sticks around until cleared, so clear it to avoid
    // reopening the same game every time the layout remounts
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse]);
}

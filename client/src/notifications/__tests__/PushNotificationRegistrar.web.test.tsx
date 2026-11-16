// Tests for the web version of the push-notification registrar
// (src/notifications/PushNotificationRegistrar.web.tsx).
//
// Phone push notifications don't exist in a browser. On the web, expo-notifications throws when
// its phone-only functions are called (for example "getLastNotificationResponse is not available
// on web"), and because the registrar sits in the root layout, that error took down every page of
// the web app. So the web registrar must render nothing and never call into expo-notifications.
import React from "react";
import { render } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { PushNotificationRegistrar } from "../PushNotificationRegistrar.web";

// Make expo-notifications act like it does in a browser: every function the phone version of
// the registrar uses throws instead of working
jest.mock("expo-notifications", () => {
  const notAvailableOnWeb = () =>
    jest.fn(() => {
      throw new Error("not available on web");
    });
  return {
    useLastNotificationResponse: notAvailableOnWeb(),
    setNotificationHandler: notAvailableOnWeb(),
    getPermissionsAsync: notAvailableOnWeb(),
    getExpoPushTokenAsync: notAvailableOnWeb(),
    clearLastNotificationResponseAsync: notAvailableOnWeb(),
  };
});

describe("PushNotificationRegistrar on the web", () => {
  it("renders without touching the phone-only notification functions", async () => {
    // If the registrar called any of them, the mock above would throw and this render would fail
    await render(<PushNotificationRegistrar />);

    expect(Notifications.useLastNotificationResponse).not.toHaveBeenCalled();
    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
  });
});

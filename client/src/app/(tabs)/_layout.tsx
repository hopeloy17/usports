import { Redirect, router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useProfile } from "../../context/ProfileContext";
import { colors } from "../../styles/common";

export default function TabsLayout() {
  // The tabs (feed, profile, add) are for signed-in students only. Anyone else, including
  // someone who types /profile into the address bar, goes to the sign-in screen
  const { sessionChecked, isSignedIn } = useProfile();

  // Still reading the saved sign-in (only while the web page starts up): show nothing yet
  if (!sessionChecked) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="black">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Find Games</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "sportscourt", selected: "sportscourt.fill" }}
          md="sports_basketball"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>

      {/* "Create" tab opens the /host screen */}
      <NativeTabs.Trigger name="add" role="search" disabled
        listeners={{
          tabPress: (e: any) => {
            e?.preventDefault?.();
            router.push("/host");
          },
        }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus", selected: "plus" }}
          md="add_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

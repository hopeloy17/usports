import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "../../styles/common";

export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={colors.surfaceTranslucent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Find Games</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "sportscourt", selected: "sportscourt.fill" }}
          md="sports_basketball"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          md="add_circle"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

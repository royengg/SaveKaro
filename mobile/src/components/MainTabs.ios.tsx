import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";
import { colors } from "../theme";

const selectedColor = DynamicColorIOS({
  light: colors.primary,
  dark: "#ffffff",
});
const inactiveColor = DynamicColorIOS({ light: colors.muted, dark: "#d4d4d4" });

export default function MainTabs() {
  const pathname = usePathname();
  return (
    <NativeTabs
      hidden={pathname === "/explore"}
      tintColor={selectedColor}
      iconColor={{ default: inactiveColor, selected: selectedColor }}
      labelStyle={{
        default: { color: inactiveColor },
        selected: { color: selectedColor },
      }}
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="submit">
        <NativeTabs.Trigger.Icon sf="plus" />
        <NativeTabs.Trigger.Label>Submit</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bookmark", selected: "bookmark.fill" }}
        />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { Tabs } from "expo-router";
import { colors } from "../../theme";
import BottomNav from "../../components/BottomNav";
import AppHeader from "../../components/AppHeader";
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <BottomNav />}
      screenOptions={{
        header: () => <AppHeader />,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIconStyle: { display: "none" },
        tabBarLabelStyle: { fontSize: 12, marginBottom: 8 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", headerShown: false }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
      <Tabs.Screen name="alerts" options={{ title: "Alerts", href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

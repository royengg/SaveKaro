import { Stack } from "expo-router";
import AppHeader from "../../../components/AppHeader";
import { colors } from "../../../theme";

export const unstable_settings = { initialRouteName: "index" };

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        header: () => <AppHeader />,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

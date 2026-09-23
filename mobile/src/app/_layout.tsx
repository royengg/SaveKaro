import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import QueryProvider from "../providers/QueryProvider";
import AuthProvider from "../providers/AuthProvider";
import { CartProvider } from "../features/account/CartProvider";
import { colors } from "../theme";
import NotificationLinks from "../providers/NotificationLinks";
import AppHeader from "../components/AppHeader";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                header: () => <AppHeader />,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
                headerBackTitle: "Back",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="deal/[id]" options={{ title: "Deal" }} />
              <Stack.Screen
                name="submit"
                options={{ title: "Submit a deal" }}
              />
              <Stack.Screen
                name="notifications"
                options={{ title: "Notifications" }}
              />
              <Stack.Screen
                name="leaderboard"
                options={{ title: "Leaderboard" }}
              />
              <Stack.Screen name="guides" options={{ title: "Guides" }} />
              <Stack.Screen name="cart" options={{ title: "Your cart" }} />
              <Stack.Screen
                name="submitted"
                options={{ title: "My submissions" }}
              />
              <Stack.Screen name="profile" options={{ title: "Profile" }} />
              <Stack.Screen
                name="categories"
                options={{ title: "Categories" }}
              />
            </Stack>
            <NotificationLinks />
          </CartProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

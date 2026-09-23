import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import QueryProvider from "../providers/QueryProvider";
import AuthProvider from "../providers/AuthProvider";
import { CartProvider } from "../features/account/CartProvider";
import { colors } from "../theme";
import NotificationLinks from "../providers/NotificationLinks";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
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

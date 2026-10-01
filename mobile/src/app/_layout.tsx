import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import QueryProvider from "../providers/QueryProvider";
import AuthProvider from "../providers/AuthProvider";
import { CartProvider } from "../features/account/CartProvider";
import { colors } from "../theme";
import NotificationLinks from "../providers/NotificationLinks";
import FloatingCartButton from "../components/FloatingCartButton";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { ActivityIndicator, Platform, View } from "react-native";
import RegionProvider from "../providers/RegionProvider";

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
      <RegionProvider>
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <View style={{ flex: 1 }}>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                </Stack>
                {Platform.OS === "ios" && <FloatingCartButton />}
                <NotificationLinks />
              </View>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </RegionProvider>
    </SafeAreaProvider>
  );
}

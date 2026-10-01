import { useCallback, useState, type PropsWithChildren } from "react";
import { useFocusEffect } from "expo-router";
import { Platform, View } from "react-native";
import AppHeader from "./AppHeader";

// Native tabs mount eagerly. Keep expensive screens deferred until their first visit,
// then retain their state (including submission drafts) when switching tabs.
export default function TabScreen({
  children,
  header = true,
}: PropsWithChildren<{ header?: boolean }>) {
  const [visited, setVisited] = useState(Platform.OS !== "ios");
  useFocusEffect(
    useCallback(() => {
      setVisited(true);
    }, []),
  );
  if (!visited) return null;
  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === "ios" && header && <AppHeader />}
      {children}
    </View>
  );
}

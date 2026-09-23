import { router, usePathname, type Href } from "expo-router";
import { Bookmark, Home, Plus, Search, Settings } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { Text } from "./ui";
import FloatingCartButton from "./FloatingCartButton";

const items = [
  { path: "/", href: "/(tabs)", label: "Home", icon: Home },
  { path: "/explore", href: "/(tabs)/explore", label: "Explore", icon: Search },
  { path: "/submit", href: "/submit", label: "Submit", icon: Plus },
  { path: "/saved", href: "/(tabs)/saved", label: "Saved", icon: Bookmark },
  {
    path: "/settings",
    href: "/(tabs)/settings",
    label: "Settings",
    icon: Settings,
  },
] satisfies { path: string; href: Href; label: string; icon: typeof Home }[];

export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (pathname === "/explore") return null;

  return (
    <View style={[styles.surface, { paddingBottom: insets.bottom }]}>
      <FloatingCartButton />
      <View style={styles.row}>
        {items.map(({ path, href, label, icon: Icon }) => {
          const selected = pathname === path;
          return (
            <Pressable
              key={path}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => router.navigate(href)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            >
              {selected && (
                <View pointerEvents="none" style={styles.selection} />
              )}
              <View style={[styles.icon, selected && styles.selectedIcon]}>
                <Icon
                  size={selected ? 19.8 : 18}
                  color={selected ? colors.primary : colors.muted}
                  fill={selected ? colors.primary : "none"}
                />
              </View>
              <Text style={[styles.label, selected && styles.selectedLabel]}>
                {label}
              </Text>
              {selected && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { height: 56, paddingHorizontal: 8, flexDirection: "row" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  selection: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    right: 0,
    borderRadius: 19.2,
    backgroundColor: "rgba(23,23,23,0.1)",
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIcon: { transform: [{ translateY: -2 }, { scale: 1.08 }] },
  label: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    letterSpacing: -0.1,
    color: colors.muted,
    opacity: 0.85,
    transform: [{ translateY: 2 }],
  },
  selectedLabel: {
    color: colors.text,
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});

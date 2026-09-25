import { useState } from "react";
import { router, usePathname, type Href } from "expo-router";
import {
  Bell,
  Bookmark,
  Home,
  LogIn,
  Menu,
  Plus,
  Settings,
  Trophy,
  X,
} from "lucide-react-native";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme";
import SaveKaroMark from "./SaveKaroMark";
import { Text } from "./ui";

const publicLinks = [
  { title: "Home", path: "/(tabs)", icon: Home },
  { title: "Leaderboard", path: "/leaderboard", icon: Trophy },
] as const;
const accountLinks = [
  { title: "Saved Deals", path: "/(tabs)/saved", icon: Bookmark },
  { title: "Submit Deal", path: "/submit", icon: Plus },
  { title: "Notifications", path: "/notifications", icon: Bell },
  { title: "Price Alerts", path: "/(tabs)/alerts", icon: Bell },
  { title: "Settings", path: "/(tabs)/settings", icon: Settings },
] as const;

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const showSubmit =
    !!user &&
    !["/submit", "/notifications", "/settings", "/alerts", "/saved"].includes(
      pathname,
    );
  const useTightDealHeader = pathname.startsWith("/deal/") && width < 640;
  const insets = useSafeAreaInsets();
  const navigate = (path: Href) => {
    setOpen(false);
    router.navigate(path);
  };
  return (
    <View style={[styles.surface, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View
          style={[styles.left, useTightDealHeader && styles.tightHeaderGroup]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            hitSlop={6}
            onPress={() => setOpen(true)}
            style={styles.iconButton}
          >
            <Menu size={16} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="SaveKaro home"
            hitSlop={6}
            onPress={() => navigate("/(tabs)")}
            style={styles.iconButton}
          >
            <SaveKaroMark />
          </Pressable>
        </View>
        <View
          style={[
            styles.headerActions,
            useTightDealHeader && styles.tightHeaderActions,
          ]}
        >
          {showSubmit && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit deal"
              onPress={() => navigate("/submit")}
              style={[styles.submit, useTightDealHeader && styles.tightSubmit]}
            >
              <View style={styles.submitIcon}>
                <Plus size={14} color="white" />
              </View>
              <Text numberOfLines={1} style={styles.submitLabel}>
                Submit Deal
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? "Account settings" : "Sign in"}
            hitSlop={6}
            onPress={() => navigate("/(tabs)/settings")}
            style={user ? styles.avatar : styles.signIn}
          >
            {user ? (
              user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={{ fontWeight: "600" }}>
                  {(user.name || "You").slice(0, 1).toUpperCase()}
                </Text>
              )
            ) : (
              <>
                <LogIn size={16} color="white" />
                <Text style={styles.signInText}>Sign in</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={[styles.menu, { marginTop: insets.top + 8 }]}
          >
            <View style={styles.menuTitle}>
              <SaveKaroMark size={24} />
              <Text style={{ fontSize: 18, fontWeight: "600", flex: 1 }}>
                SaveKaro
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={() => setOpen(false)}
                style={styles.iconButton}
              >
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
            {[...publicLinks, ...(user ? accountLinks : [])].map(
              ({ title, path, icon: Icon }) => (
                <Pressable
                  key={path}
                  accessibilityRole="link"
                  onPress={() => navigate(path)}
                  style={styles.menuItem}
                >
                  <View style={styles.menuIcon}>
                    <Icon size={18} color={colors.text} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "500" }}>
                    {title}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 16,
  },
  tightHeaderGroup: { gap: 8 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
  },
  tightHeaderActions: { gap: 6 },
  iconButton: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  signIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 40,
    paddingHorizontal: 16,
  },
  signInText: { color: "white", fontSize: 14, fontWeight: "500" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 32, height: 32 },
  submit: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: colors.button,
    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
  },
  tightSubmit: { paddingHorizontal: 12, gap: 6 },
  submitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 0,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  menu: {
    marginLeft: 8,
    width: 240,
    maxWidth: "95%",
    borderRadius: 30,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    gap: 6,
  },
  menuTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    padding: 10,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
});

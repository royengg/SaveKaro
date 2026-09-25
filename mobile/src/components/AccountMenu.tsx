import { router, type Href } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme";
import { Text } from "./ui";

const homeLinks: Array<{ label: string; path: Href }> = [
  { label: "Price Alerts", path: "/(tabs)/alerts" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Settings", path: "/(tabs)/settings" },
];
const pageLinks: Array<{ label: string; path: Href }> = [
  { label: "Saved Deals", path: "/(tabs)/saved" },
  { label: "Notifications", path: "/notifications" },
  { label: "Price Alerts", path: "/(tabs)/alerts" },
  { label: "Settings", path: "/(tabs)/settings" },
];

export default function AccountMenu({
  visible,
  onClose,
  variant = "home",
}: {
  visible: boolean;
  onClose: () => void;
  variant?: "home" | "page";
}) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  function navigate(path: Href) {
    onClose();
    router.navigate(path);
  }

  function confirmSignOut() {
    onClose();
    Alert.alert(
      "Sign out?",
      "Cached account data will be removed from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () =>
            void signOut().catch((error: Error) =>
              Alert.alert("Sign-out status", error.message),
            ),
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible && !!user}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close account menu"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[styles.menu, { top: insets.top + 56 }]}
        >
          <View style={styles.identity}>
            {user?.name ? (
              <Text numberOfLines={1} style={styles.name}>
                {user.name}
              </Text>
            ) : null}
            {user?.email ? (
              <Text numberOfLines={1} style={styles.email}>
                {user.email}
              </Text>
            ) : null}
          </View>
          {(variant === "home" ? homeLinks : pageLinks).map(
            ({ label, path }) => (
              <Pressable
                key={path.toString()}
                accessibilityRole="link"
                onPress={() => navigate(path)}
                style={styles.item}
              >
                <Text style={styles.itemText}>{label}</Text>
              </Pressable>
            ),
          )}
          <View style={styles.separator} />
          <Pressable
            accessibilityRole="button"
            onPress={confirmSignOut}
            style={styles.item}
          >
            <Text style={styles.signOut}>Log out</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: "absolute",
    right: 8,
    width: 220,
    borderRadius: 24,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    boxShadow: "0 20px 40px -24px rgba(15,23,42,0.3)",
  },
  identity: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600" },
  email: { color: colors.muted, fontSize: 12 },
  item: {
    minHeight: 40,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  itemText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  separator: { height: 1, marginVertical: 4, backgroundColor: colors.border },
  signOut: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
});

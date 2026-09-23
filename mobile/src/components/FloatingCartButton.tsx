import { router, usePathname } from "expo-router";
import { ArrowRight, ShoppingCart } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../features/account/CartProvider";
import { Text } from "./ui";

const hidden = new Set(["/cart", "/submit", "/saved", "/settings", "/explore"]);
export default function FloatingCartButton() {
  const path = usePathname();
  const { items } = useCart();
  const insets = useSafeAreaInsets();
  if (hidden.has(path) || path.startsWith("/deal/")) return null;
  const lead = items[0];
  return (
    <View
      pointerEvents="box-none"
      style={[styles.position, { bottom: 84 + insets.bottom }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open cart${items.length ? ` with ${items.length} deals` : ""}`}
        onPress={() => router.navigate("/cart")}
        style={[styles.button, !!lead && styles.populated]}
      >
        <View style={lead ? styles.thumbnail : styles.icon}>
          {lead?.imageUrl ? (
            <Image
              source={{ uri: lead.imageUrl }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <ShoppingCart size={14} color={lead ? "#5b9637" : "white"} />
          )}
        </View>
        {lead ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>View cart</Text>
              <Text style={styles.count}>
                {items.length} item{items.length === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.arrow}>
              <ArrowRight size={16} color="white" />
            </View>
          </>
        ) : (
          <Text style={styles.label}>Cart</Text>
        )}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  position: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  button: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d10021",
    backgroundColor: "#e60023",
    paddingHorizontal: 14,
    paddingVertical: 8,
    boxShadow: "0 14px 28px -18px rgba(230,0,35,0.6)",
  },
  populated: {
    width: 240,
    maxWidth: "100%",
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  label: { color: "white", fontSize: 13, lineHeight: 20, fontWeight: "600" },
  count: { color: "white", fontSize: 11, lineHeight: 15 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
});

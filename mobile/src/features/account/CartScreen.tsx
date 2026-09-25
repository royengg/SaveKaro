import { router } from "expo-router";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  ArrowLeft,
  PackageSearch,
  ShoppingCart,
  Store,
  Trash2,
  ExternalLink,
} from "lucide-react-native";
import { PageBackButton, Text } from "../../components/ui";
import { formatPrice } from "../../components/DealCard";
import { openDealStore } from "../../lib/deal-links";
import { colors } from "../../theme";
import { useCart } from "./CartProvider";

export default function CartScreen() {
  const { items, remove, clear } = useCart();
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(deal) => deal.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={{ marginBottom: 8 }}>
            <PageBackButton />
          </View>
          <View style={styles.heading}>
            <View style={styles.headingIcon}>
              <ShoppingCart size={24} color={colors.text} />
            </View>
            <Text accessibilityRole="header" style={styles.headingText}>
              Your Cart
            </Text>
          </View>
          {items.length ? (
            <Pressable
              accessibilityRole="button"
              style={styles.clearButton}
              hitSlop={4}
              onPress={() =>
                Alert.alert(
                  "Clear your cart?",
                  "This removes every deal from this device's cart.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear cart",
                      style: "destructive",
                      onPress: clear,
                    },
                  ],
                )
              }
            >
              <Trash2 size={16} color={colors.text} />
              <Text style={styles.clearLabel}>Clear cart</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <PackageSearch size={32} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse deals"
            onPress={() => router.push("/(tabs)")}
            style={styles.browseButton}
          >
            <View style={styles.browseIcon}>
              <ArrowLeft size={14} color="white" />
            </View>
            <Text style={styles.browseLabel}>Browse deals</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.title}`}
            onPress={() =>
              router.push({ pathname: "/deal/[id]", params: { id: item.id } })
            }
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <PackageSearch size={48} color={colors.primary} />
              </View>
            )}
          </Pressable>
          <View>
            <View style={styles.badges}>
              <Text style={styles.badge}>{item.category.name}</Text>
              {item.store ? (
                <View style={styles.storeBadge}>
                  <Store size={12} color={colors.text} />
                  <Text style={styles.badgeText}>{item.store}</Text>
                </View>
              ) : null}
              {item.discountPercent ? (
                <Text style={[styles.badge, styles.discount]}>
                  {item.discountPercent}% OFF
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/deal/[id]", params: { id: item.id } })
              }
            >
              <Text style={styles.name}>{item.cleanTitle || item.title}</Text>
            </Pressable>
            <View style={styles.prices}>
              {item.dealPrice != null ? (
                <Text style={styles.price}>
                  {formatPrice(item.dealPrice, item.currency)}
                </Text>
              ) : (
                <Text style={styles.badgeText}>Check latest price</Text>
              )}
              {item.originalPrice != null &&
              Number(item.originalPrice) > Number(item.dealPrice ?? 0) ? (
                <Text style={styles.oldPrice}>
                  {formatPrice(item.originalPrice, item.currency)}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            style={styles.remove}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from cart`}
            onPress={() => remove(item.id)}
          >
            <Trash2 size={16} color={colors.text} />
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.detailButton}
              hitSlop={4}
              onPress={() =>
                router.push({ pathname: "/deal/[id]", params: { id: item.id } })
              }
            >
              <Text style={styles.actionLabel}>View details</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              style={[styles.detailButton, styles.storeButton]}
              hitSlop={4}
              onPress={() => void openDealStore(item)}
            >
              <Text style={[styles.actionLabel, { color: "white" }]}>
                Visit Store
              </Text>
              <ExternalLink size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
    paddingBottom: 40,
  },
  header: { gap: 16, marginBottom: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  headingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(23,23,23,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
  card: {
    padding: 16,
    gap: 16,
    borderRadius: 24,
    backgroundColor: "white",
    borderColor: colors.border,
    borderWidth: 1,
  },
  name: {
    fontSize: 18,
    lineHeight: 24.75,
    fontWeight: "600",
    color: "#171717",
  },
  price: { fontSize: 24, lineHeight: 32, fontWeight: "700", color: "#059669" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  storeButton: {
    paddingHorizontal: 14,
    backgroundColor: colors.button,
    borderColor: colors.button,
  },
  actionLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  clearButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  clearLabel: { color: colors.text, fontSize: 14, fontWeight: "500" },
  image: {
    height: 176,
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#f4f4f5",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
  },
  badges: {
    marginBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.text,
    backgroundColor: "#f4f4f5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.text,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  discount: { backgroundColor: "#10b981", color: "white" },
  remove: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  prices: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  oldPrice: {
    color: colors.muted,
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  empty: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 2px 4px rgba(15,23,42,0.08)",
    paddingHorizontal: 24,
    paddingVertical: 64,
    gap: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.text },
  browseButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.button,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  browseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  browseLabel: { color: "white", fontSize: 15, fontWeight: "600" },
});

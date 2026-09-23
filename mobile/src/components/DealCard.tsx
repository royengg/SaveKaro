import type { Deal } from "@savekaro/contracts";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./ui";
import { colors } from "../theme";

export function formatPrice(
  value: string | number | null | undefined,
  currency = "INR",
) {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      amount,
    );
  }
}
export default function DealCard({ deal }: { deal: Deal }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={deal.cleanTitle || deal.title}
      onPress={() =>
        router.push({ pathname: "/deal/[id]", params: { id: deal.id } })
      }
      style={styles.card}
    >
      {deal.imageUrl && (
        <Image
          source={{ uri: deal.imageUrl }}
          style={styles.image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
      <View style={styles.body}>
        <Text style={styles.store}>{deal.store || deal.category.name}</Text>
        <Text style={styles.title} numberOfLines={3}>
          {deal.cleanTitle || deal.title}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>
            {formatPrice(deal.dealPrice, deal.currency) ||
              (deal.discountPercent
                ? `${deal.discountPercent}% off`
                : "View offer")}
          </Text>
          {deal.originalPrice && (
            <Text style={styles.original}>
              {formatPrice(deal.originalPrice, deal.currency)}
            </Text>
          )}
        </View>
        <Text style={styles.store}>
          {deal.upvoteCount} votes · {deal._count?.comments ?? 0} comments
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  image: { height: 180, width: "100%", backgroundColor: "#fff" },
  body: { padding: 18, gap: 8 },
  title: { fontWeight: "600", fontSize: 18 },
  store: { color: colors.muted, fontSize: 13 },
  price: { fontWeight: "700", fontSize: 21 },
  original: { textDecorationLine: "line-through", color: colors.muted },
  row: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
});

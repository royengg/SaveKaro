import type { PriceHistoryPoint } from "@savekaro/contracts";
import { View } from "react-native";
import { Text } from "./ui";
import { formatPrice } from "./DealCard";
import { colors } from "../theme";

export default function PriceHistory({
  points,
  currency,
}: {
  points: PriceHistoryPoint[];
  currency: string;
}) {
  const ordered = points
    .filter(
      (point) =>
        Number.isFinite(Number(point.price)) &&
        Number(point.price) >= 0 &&
        Number.isFinite(Date.parse(point.createdAt)),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (!ordered.length) return null;
  const maximum = Math.max(...ordered.map((point) => Number(point.price)), 1);
  return (
    <View style={{ gap: 12 }}>
      <Text>Price history · oldest to newest</Text>
      <View
        style={{
          height: 132,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 3,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {ordered.map((point) => (
          <View
            key={point.id}
            style={{
              flex: 1,
              height: Math.max(3, (Number(point.price) / maximum) * 128),
              backgroundColor: colors.accent,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          />
        ))}
      </View>
      {ordered.map((point) => (
        <Text key={point.id}>
          {new Date(point.createdAt).toLocaleDateString()} ·{" "}
          {formatPrice(point.price, currency)}
        </Text>
      ))}
    </View>
  );
}

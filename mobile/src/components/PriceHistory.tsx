import { useState } from "react";
import type { PriceHistoryPoint } from "@savekaro/contracts";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
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
  const [width, setWidth] = useState(300);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ordered = points
    .filter(
      (point) =>
        point.price !== null &&
        String(point.price).trim() !== "" &&
        Number.isFinite(Number(point.price)) &&
        Number(point.price) >= 0 &&
        Number.isFinite(Date.parse(point.createdAt)),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (!ordered.length) return null;
  const price = (value: number) => formatPrice(value, currency);
  const first = Number(ordered[0].price);
  const last = Number(ordered[ordered.length - 1].price);
  if (ordered.length === 1)
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.muted}>Not enough price data to show a chart.</Text>
        <Text style={{ fontSize: 16, fontWeight: "500" }}>
          Current price: {price(last)}
        </Text>
      </View>
    );
  const prices = ordered.map((point) => Number(point.price));
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const padding = (maximum - minimum) * 0.1 || maximum * 0.1 || 1;
  const lower = minimum - padding;
  const upper = maximum + padding;
  const plotWidth = Math.max(1, width - 90);
  const chartPoints = ordered.map((point, index) => ({
    x: 85 + (index / (ordered.length - 1)) * plotWidth,
    y: 5 + ((upper - Number(point.price)) / (upper - lower)) * 152,
  }));
  const selectedIndex = ordered.findIndex((point) => point.id === selectedId);
  const currentIndex = selectedIndex < 0 ? ordered.length - 1 : selectedIndex;
  const selected = ordered[currentIndex];
  const dateLabel = (date: string, full = false) =>
    new Date(date).toLocaleDateString(
      "en-US",
      full
        ? { year: "numeric", month: "long", day: "numeric" }
        : { month: "short", day: "numeric" },
    );
  const change = last - first;
  const changeColor = change < 0 ? "#059669" : "#ef4444";
  const labelCount = Math.min(
    ordered.length,
    Math.max(2, Math.floor(plotWidth / 58) + 1),
  );
  const dateIndexes = Array.from({ length: labelCount }, (_, index) =>
    Math.round((index / (labelCount - 1)) * (ordered.length - 1)),
  );
  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.muted}>Price trend</Text>
          <Text style={styles.price}>{price(last)}</Text>
        </View>
        {change !== 0 && (
          <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                fontWeight: "500",
                color: changeColor,
              }}
            >
              {change < 0 ? "↓" : "↑"} {price(Math.abs(change))}
            </Text>
            <Text
              style={{
                fontSize: 12,
                lineHeight: 16,
                textAlign: "right",
                color: changeColor,
              }}
            >
              {change < 0 ? "" : "+"}
              {first > 0 ? ((change / first) * 100).toFixed(1) : "0"}% since
              first tracked
            </Text>
          </View>
        )}
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Price history. ${dateLabel(selected.createdAt, true)}: ${price(Number(selected.price))}`}
        accessibilityHint="Swipe up or down to read each recorded price."
        accessibilityValue={{
          min: 1,
          max: ordered.length,
          now: currentIndex + 1,
          text: `Point ${currentIndex + 1} of ${ordered.length}`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Next price" },
          { name: "decrement", label: "Previous price" },
        ]}
        onAccessibilityAction={(event) => {
          const direction =
            event.nativeEvent.actionName === "increment" ? 1 : -1;
          setSelectedId(
            ordered[
              Math.max(
                0,
                Math.min(ordered.length - 1, currentIndex + direction),
              )
            ].id,
          );
        }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onTouchEnd={(event) => {
          const index = Math.round(
            ((event.nativeEvent.locationX - 85) / plotWidth) *
              (ordered.length - 1),
          );
          setSelectedId(
            ordered[Math.max(0, Math.min(ordered.length - 1, index))].id,
          );
        }}
        style={{ height: 192 }}
      >
        <Svg width="100%" height={192} accessible={false} pointerEvents="none">
          {Array.from({ length: 5 }, (_, index) => {
            const y = 5 + (index / 4) * 152;
            return (
              <YAxisLabel
                key={index}
                y={y}
                label={price(upper - (index / 4) * (upper - lower))}
              />
            );
          })}
          {chartPoints.map((point, index) => (
            <Circle
              key={ordered[index].id}
              cx={point.x}
              cy={point.y}
              r={index === selectedIndex ? 6 : 4}
              fill={colors.primary}
            />
          ))}
          {dateIndexes.map((index) => (
            <SvgText
              key={`date-${index}`}
              x={chartPoints[index].x}
              y={173}
              textAnchor={index === ordered.length - 1 ? "end" : "middle"}
              fontSize={12}
              fontFamily="Inter_400Regular"
              fill={colors.text}
            >
              {dateLabel(ordered[index].createdAt)}
            </SvgText>
          ))}
        </Svg>
        {selectedIndex >= 0 && (
          <View pointerEvents="none" style={styles.tooltip}>
            <Text style={styles.muted}>
              {dateLabel(selected.createdAt, true)}
            </Text>
            <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: "700" }}>
              {price(Number(selected.price))}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.legend}>{ordered.length} price points tracked</Text>
    </View>
  );
}

function YAxisLabel({ y, label }: { y: number; label: string | null }) {
  return (
    <SvgText
      x={77}
      y={y + 4}
      textAnchor="end"
      fontSize={12}
      fontFamily="Inter_400Regular"
      fill={colors.text}
    >
      {label}
    </SvgText>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#fcfcfc", borderRadius: 12, padding: 16 },
  empty: { padding: 24, alignItems: "center", gap: 8 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  price: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
  tooltip: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,.1)",
  },
  legend: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
  },
});

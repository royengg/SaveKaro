import { useQuery } from "@tanstack/react-query";
import type { Category } from "@savekaro/contracts";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { ErrorState, PageBackButton, Screen, Text } from "../../components/ui";
import { colors } from "../../theme";

const categoryColors: Record<string, readonly [string, string]> = {
  electronics: ["#3b82f6", "#22d3ee"],
  fashion: ["#ec4899", "#fb7185"],
  gaming: ["#a855f7", "#818cf8"],
  "home-kitchen": ["#f59e0b", "#fb923c"],
  beauty: ["#f472b6", "#e879f9"],
  "food-groceries": ["#22c55e", "#34d399"],
  "mobile-accessories": ["#6366f1", "#a78bfa"],
  "books-stationery": ["#84cc16", "#4ade80"],
  travel: ["#0ea5e9", "#60a5fa"],
  other: ["#6b7280", "#94a3b8"],
};

export default function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Category[]>("/categories", { signal, authenticated: false }),
  });
  return (
    <Screen tone="plain" contentStyle={{ paddingTop: 24 }}>
      <PageBackButton />
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          Browse Categories
        </Text>
        <Text style={styles.subtitle}>
          Find the best deals across all categories
        </Text>
      </View>
      {categories.isPending ? (
        <ActivityIndicator />
      ) : categories.isError ? (
        <ErrorState retry={() => void categories.refetch()} />
      ) : (
        <View style={styles.grid}>
          {categories.data.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${category.name}${category.dealCount ? `, ${category.dealCount} deals` : ""}`}
              style={[styles.tile, { width: (width - 48) / 2 }]}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)",
                  params: { category: category.slug },
                })
              }
            >
              <LinearGradient
                colors={categoryColors[category.slug] ?? categoryColors.other!}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <Text style={styles.name}>{category.name}</Text>
                {category.dealCount > 0 ? (
                  <Text style={styles.count}>{category.dealCount} deals</Text>
                ) : null}
              </LinearGradient>
            </Pressable>
          ))}
          {!categories.data.length ? (
            <Text style={styles.empty}>No categories found</Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 8, marginTop: 8, marginBottom: 16 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "700" },
  subtitle: { color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  tile: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    opacity: 0.9,
  },
  name: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  count: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  empty: { color: colors.muted, textAlign: "center", width: "100%" },
});

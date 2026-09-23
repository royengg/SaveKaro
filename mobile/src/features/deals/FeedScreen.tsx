import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Category, Deal } from "@savekaro/contracts";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Field, Heading, Text } from "../../components/ui";
import { colors } from "../../theme";
import MerchantShowcases from "./MerchantShowcases";

export default function FeedScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);
  const [region, setRegion] = useState("INDIA");
  const [sortBy, setSort] = useState("newest");
  const [store, setStore] = useState("");
  const [minDiscount, setMinDiscount] = useState("");
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Category[]>("/categories", { signal, authenticated: false }),
  });
  const feed = useInfiniteQuery({
    queryKey: [
      "deals",
      { search, category, region, sortBy, store, minDiscount },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Deal>(
        `/deals?${new URLSearchParams({ page: String(pageParam), limit: "20", search, category, region, sortBy, ...(store ? { store } : {}), ...(minDiscount ? { minDiscount } : {}) })}`,
        { signal, authenticated: false },
      ),
    getNextPageParam: (last) =>
      (last.pagination.hasMore ??
      last.pagination.page < last.pagination.totalPages)
        ? last.pagination.page + 1
        : undefined,
    maxPages: 10,
  });
  const deals = Array.from(
    new Map(
      feed.data?.pages
        .flatMap((page) => page.data)
        .map((deal) => [deal.id, deal]),
    ).values(),
  );
  return (
    <FlatList
      data={deals}
      keyExtractor={(deal) => deal.id}
      renderItem={({ item }) => <DealCard deal={item} />}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage)
          void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={feed.isRefetching}
      onRefresh={() => void feed.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <Heading>SaveKaro</Heading>
          <View style={{ gap: 12 }}>
            <Field
              label="Filter by store"
              value={store}
              onChangeText={setStore}
              placeholder="Amazon, Myntra…"
            />
            <Field
              label="Minimum discount (%)"
              value={minDiscount}
              onChangeText={(value) =>
                setMinDiscount(value.replace(/\D/g, "").slice(0, 2))
              }
              keyboardType="number-pad"
            />
          </View>
          <Field
            label="Search deals"
            placeholder="Search products and stores"
            value={draft}
            onChangeText={setDraft}
            returnKeyType="search"
            onSubmitEditing={() => setSearch(draft.trim())}
          />
          <Button
            title="Search"
            secondary
            onPress={() => setSearch(draft.trim())}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {["INDIA", "CANADA", "WORLD"].map((value) => (
              <Chip
                key={value}
                label={
                  value === "INDIA"
                    ? "India"
                    : value === "CANADA"
                      ? "Canada"
                      : "Worldwide"
                }
                active={region === value}
                onPress={() => setRegion(value)}
              />
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="All categories"
              active={!category}
              onPress={() => setCategory("")}
            />
            {categories.data?.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                active={category === item.slug}
                onPress={() => setCategory(item.slug)}
              />
            ))}
          </ScrollView>
          <View style={styles.chips}>
            {["newest", "popular", "discount"].map((value) => (
              <Chip
                key={value}
                label={value.charAt(0).toUpperCase() + value.slice(1)}
                active={sortBy === value}
                onPress={() => setSort(value)}
              />
            ))}
          </View>
          {!search && !category && <MerchantShowcases region={region} />}
        </View>
      }
      ListEmptyComponent={
        feed.isPending ? (
          <ActivityIndicator />
        ) : feed.isError ? (
          <ErrorState retry={() => void feed.refetch()} />
        ) : (
          <Text>No deals match these filters.</Text>
        )
      }
      ListFooterComponent={
        <View style={{ gap: 12, marginTop: 16 }}>
          {feed.isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 20 }} />
          ) : feed.isError && deals.length ? (
            <ErrorState retry={() => void feed.fetchNextPage()} />
          ) : null}
        </View>
      }
    />
  );
}
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.text }]}
    >
      <Text
        style={{ color: active ? colors.surface : colors.text, fontSize: 14 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 40 },
  header: { gap: 16, marginBottom: 20 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});

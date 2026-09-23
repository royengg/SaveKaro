import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  ActivityIndicator,
  AccessibilityInfo,
  FlatList,
  Modal,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Field, Text } from "../../components/ui";
import { colors } from "../../theme";

interface Filters {
  search: string;
  region: "INDIA" | "CANADA" | "WORLD";
  sortBy: "newest" | "popular" | "discount";
}
const initialFilters: Filters = {
  search: "",
  region: "INDIA",
  sortBy: "newest",
};

export default function ExploreScreen() {
  const [height, setHeight] = useState(500);
  const [index, setIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const list = useRef<FlatList<Deal>>(null);
  const filtersKey = JSON.stringify(filters);
  const feed = useInfiniteQuery({
    queryKey: ["deals", "explore", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Deal>(
        `/deals?${new URLSearchParams({ page: String(pageParam), limit: "20", ...filters })}`,
        { signal, authenticated: false },
      ),
    getNextPageParam: (page) =>
      (page.pagination.hasMore ??
      page.pagination.page < page.pagination.totalPages)
        ? page.pagination.page + 1
        : undefined,
  });
  const deals = Array.from(
    new Map(
      feed.data?.pages
        .flatMap((page) => page.data)
        .map((deal) => [deal.id, deal]),
    ).values(),
  );
  function move(next: number) {
    if (next < 0 || next >= deals.length) return;
    list.current?.scrollToIndex({ index: next, animated: false });
    setIndex(next);
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text>Swipe to explore</Text>
        <Button
          title="Filters"
          secondary
          onPress={() => {
            setDraft(filters);
            setFiltersOpen(true);
          }}
        />
      </View>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          if (nextHeight > 0 && nextHeight !== height) {
            setHeight(nextHeight);
            setIndex(0);
          }
        }}
      >
        <FlatList
          key={`${filtersKey}:${height}`}
          ref={list}
          data={deals}
          keyExtractor={(deal) => deal.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, itemIndex) => ({
            length: height,
            offset: height * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={(event) =>
            setIndex(
              Math.max(
                0,
                Math.min(
                  deals.length - 1,
                  Math.round(event.nativeEvent.contentOffset.y / height),
                ),
              ),
            )
          }
          onEndReached={() => {
            if (
              feed.hasNextPage &&
              !feed.isFetching &&
              !feed.isFetchNextPageError
            )
              void feed.fetchNextPage();
          }}
          onEndReachedThreshold={2}
          renderItem={({ item }) => (
            <View style={{ height, padding: 20, gap: 12 }}>
              <DealCard deal={item} />
              <Text numberOfLines={3}>{item.description}</Text>
            </View>
          )}
          ListEmptyComponent={
            feed.isPending ? (
              <ActivityIndicator />
            ) : feed.isError ? (
              <ErrorState retry={() => void feed.refetch()} />
            ) : (
              <Text>No matching deals.</Text>
            )
          }
        />
        {deals.length > 0 && feed.isError && (
          <View
            style={{ position: "absolute", bottom: 8, left: 12, right: 12 }}
          >
            <ErrorState
              message={
                feed.isFetchNextPageError
                  ? "Could not load more deals."
                  : "Could not refresh deals. Your loaded deals are still available."
              }
              retry={() =>
                void (feed.isFetchNextPageError
                  ? feed.fetchNextPage()
                  : feed.refetch())
              }
            />
          </View>
        )}
        {feed.isFetchingNextPage && (
          <ActivityIndicator
            accessibilityLabel="Loading more deals"
            style={{ position: "absolute", bottom: 12, alignSelf: "center" }}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 16,
        }}
      >
        <Button
          title="Previous deal"
          secondary
          disabled={index === 0}
          onPress={() => move(index - 1)}
        />
        <Button
          title={
            index >= deals.length - 1 && feed.hasNextPage
              ? "Load more"
              : "Next deal"
          }
          secondary
          disabled={
            feed.isFetchingNextPage ||
            (index >= deals.length - 1 && !feed.hasNextPage)
          }
          onPress={() => {
            if (index >= deals.length - 1 && feed.hasNextPage)
              void feed.fetchNextPage();
            else move(index + 1);
          }}
        />
      </View>
      <Modal
        visible={filtersOpen}
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setFiltersOpen(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          onAccessibilityEscape={() => setFiltersOpen(false)}
        >
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 26, fontWeight: "700" }}
            >
              Explore filters
            </Text>
            <Field
              label="Search"
              value={draft.search}
              onChangeText={(search) =>
                setDraft((current) => ({ ...current, search }))
              }
            />
            <Text accessibilityRole="header">Region</Text>
            {(["INDIA", "CANADA", "WORLD"] as const).map((value) => (
              <FilterOption
                key={value}
                label={
                  value === "INDIA"
                    ? "India"
                    : value === "CANADA"
                      ? "Canada"
                      : "Worldwide"
                }
                selected={draft.region === value}
                onPress={() =>
                  setDraft((current) => ({ ...current, region: value }))
                }
              />
            ))}
            <Text accessibilityRole="header">Sort by</Text>
            {(["newest", "popular", "discount"] as const).map((value) => (
              <FilterOption
                key={value}
                label={value.charAt(0).toUpperCase() + value.slice(1)}
                selected={draft.sortBy === value}
                onPress={() =>
                  setDraft((current) => ({ ...current, sortBy: value }))
                }
              />
            ))}
            <Button
              title="Show deals"
              onPress={() => {
                const next = { ...draft, search: draft.search.trim() };
                if (JSON.stringify(next) !== filtersKey) {
                  setFilters(next);
                  setIndex(0);
                }
                setFiltersOpen(false);
              }}
            />
            <Button
              title="Cancel"
              secondary
              onPress={() => setFiltersOpen(false)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function FilterOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 48,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: selected ? colors.pink : colors.surface,
      }}
    >
      <Text>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

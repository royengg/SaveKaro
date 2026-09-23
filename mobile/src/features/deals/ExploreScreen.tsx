import { useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Field, Text } from "../../components/ui";
import { colors } from "../../theme";

export default function ExploreScreen() {
  const [height, setHeight] = useState(500);
  const [index, setIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("INDIA");
  const [sortBy, setSort] = useState("newest");
  const [draft, setDraft] = useState("");
  const list = useRef<FlatList<Deal>>(null);
  const feed = useInfiniteQuery({
    queryKey: ["deals", "explore", { search, region, sortBy }],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Deal>(
        `/deals?${new URLSearchParams({ page: String(pageParam), limit: "20", region, sortBy, search })}`,
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
          onPress={() => setFiltersOpen(true)}
        />
      </View>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <FlatList
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
            setIndex(Math.round(event.nativeEvent.contentOffset.y / height))
          }
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage)
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
          title="Next deal"
          secondary
          disabled={index >= deals.length - 1}
          onPress={() => move(index + 1)}
        />
      </View>
      <Modal
        visible={filtersOpen}
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 26, fontWeight: "700" }}
            >
              Explore filters
            </Text>
            <Field label="Search" value={draft} onChangeText={setDraft} />
            {["INDIA", "CANADA", "WORLD"].map((value) => (
              <Button
                key={value}
                title={`${region === value ? "✓ " : ""}${value}`}
                secondary
                onPress={() => setRegion(value)}
              />
            ))}
            {["newest", "popular", "discount"].map((value) => (
              <Button
                key={value}
                title={`${sortBy === value ? "✓ " : ""}${value}`}
                secondary
                onPress={() => setSort(value)}
              />
            ))}
            <Button
              title="Show deals"
              onPress={() => {
                setSearch(draft.trim());
                setIndex(0);
                setFiltersOpen(false);
                list.current?.scrollToOffset({ offset: 0, animated: false });
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

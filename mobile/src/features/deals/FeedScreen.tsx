import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Category, Deal } from "@savekaro/contracts";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  TrendingUp,
  ArrowDown,
  Menu,
  BookOpen,
} from "lucide-react-native";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Field, Text } from "../../components/ui";
import { colors } from "../../theme";
import MerchantShowcases, { FeaturedShowcases } from "./MerchantShowcases";

export default function FeedScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("INDIA");
  const [sortBy, setSort] = useState("newest");
  const [store, setStore] = useState("");
  const [minDiscount, setMinDiscount] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({
    region,
    sortBy,
    store,
    minDiscount,
  });
  function openFilters() {
    setFilterDraft({ region, sortBy, store, minDiscount });
    setFiltersOpen(true);
  }
  const [categoryMenu, setCategoryMenu] = useState(false);
  const categoryAnchor = useRef<View>(null);
  const [categoryTop, setCategoryTop] = useState(180);
  const { height: windowHeight } = useWindowDimensions();
  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);
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
        "/deals?" +
          new URLSearchParams({
            page: String(pageParam),
            limit: "20",
            search,
            category,
            region,
            sortBy,
            ...(store ? { store } : {}),
            ...(minDiscount ? { minDiscount } : {}),
          }),
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        key={JSON.stringify({
          search,
          category,
          region,
          sortBy,
          store,
          minDiscount,
        })}
        data={deals}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        keyExtractor={(deal) => deal.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "50%" }}>
            <DealCard deal={item} />
          </View>
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (
            feed.hasNextPage &&
            !feed.isFetching &&
            !feed.isFetchNextPageError
          )
            void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshing={feed.isRefetching}
        onRefresh={() => void feed.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.search}>
              <Search size={19} color={colors.muted} />
              <TextInput
                accessibilityLabel="Search deals and stores"
                placeholder="Search deals and stores"
                placeholderTextColor={colors.muted}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => setSearch(draft.trim())}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {draft.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setDraft("");
                    setSearch("");
                  }}
                >
                  <X size={18} color={colors.muted} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open filters"
                onPress={openFilters}
                style={styles.filterButton}
              >
                <SlidersHorizontal size={18} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.discovery}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  fontWeight: "600",
                  color: colors.muted,
                  alignSelf: "center",
                }}
              >
                DISCOVER
              </Text>
              {[
                {
                  label: "Today's picks",
                  Icon: Sparkles,
                  sort: "newest",
                  discount: "",
                },
                {
                  label: "Trending stores",
                  Icon: TrendingUp,
                  sort: "popular",
                  discount: "",
                },
                {
                  label: "Big drops",
                  Icon: ArrowDown,
                  sort: "discount",
                  discount: "50",
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => {
                    setSort(item.sort);
                    setMinDiscount(item.discount);
                  }}
                  style={styles.discoveryChip}
                >
                  <item.Icon size={15} color={colors.primary} />
                  <Text style={styles.chipText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !category }}
                onPress={() => setCategory("")}
                style={[
                  styles.discoveryChip,
                  { backgroundColor: !category ? "#e8eaee" : "#f3f4f6" },
                ]}
              >
                <Text style={styles.chipText}>All</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More categories"
                ref={categoryAnchor}
                onPress={() => {
                  categoryAnchor.current?.measureInWindow(
                    (_x, y, _width, height) => setCategoryTop(y + height + 6),
                  );
                  setCategoryMenu(true);
                }}
                style={styles.filterButton}
              >
                <Menu size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open guides"
                onPress={() => router.push("/guides")}
                style={styles.filterButton}
              >
                <BookOpen size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open filters"
                onPress={openFilters}
                style={styles.filterButton}
              >
                <SlidersHorizontal size={18} color={colors.muted} />
              </Pressable>
            </ScrollView>
            {!search && !category && !store && (
              <MerchantShowcases region={region} />
            )}
            <FeaturedShowcases deals={deals} />
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
          feed.isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 20 }} />
          ) : feed.isError && deals.length ? (
            <ErrorState
              retry={() =>
                void (feed.isFetchNextPageError
                  ? feed.fetchNextPage()
                  : feed.refetch())
              }
            />
          ) : null
        }
      />
      <Modal
        visible={categoryMenu}
        transparent
        animationType="none"
        onRequestClose={() => setCategoryMenu(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close categories"
            onPress={() => setCategoryMenu(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,.15)",
            }}
          />
          <ScrollView
            style={{
              position: "absolute",
              top: categoryTop,
              left: 60,
              right: 24,
              maxHeight: Math.min(
                400,
                Math.max(140, windowHeight - categoryTop - 24),
              ),
              borderRadius: 18,
              backgroundColor: colors.surface,
            }}
            contentContainerStyle={{ padding: 12, gap: 8 }}
          >
            {categories.data?.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={category === item.slug}
                onPress={() => {
                  setCategory(item.slug);
                  setCategoryMenu(false);
                }}
              />
            ))}
            {categories.isPending && <ActivityIndicator />}
            {categories.isError && (
              <ErrorState retry={() => void categories.refetch()} />
            )}
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={filtersOpen}
        animationType="none"
        onRequestClose={() => setFiltersOpen(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
            <View style={styles.modalHeading}>
              <Text style={{ fontSize: 24, fontWeight: "700" }}>Filters</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                onPress={() => setFiltersOpen(false)}
                style={styles.filterButton}
              >
                <X size={22} />
              </Pressable>
            </View>
            <Text style={styles.sectionLabel}>Region</Text>
            <View style={styles.options}>
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
                  selected={filterDraft.region === value}
                  onPress={() =>
                    setFilterDraft((current) => ({ ...current, region: value }))
                  }
                />
              ))}
            </View>
            <Text style={styles.sectionLabel}>Sort by</Text>
            <View style={styles.options}>
              {["newest", "popular", "discount"].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={filterDraft.sortBy === value}
                  onPress={() =>
                    setFilterDraft((current) => ({ ...current, sortBy: value }))
                  }
                />
              ))}
            </View>
            <Field
              label="Store"
              value={filterDraft.store}
              onChangeText={(store) =>
                setFilterDraft((current) => ({ ...current, store }))
              }
              placeholder="Amazon, Myntra…"
            />
            <Field
              label="Minimum discount (%)"
              value={filterDraft.minDiscount}
              onChangeText={(value) =>
                setFilterDraft((current) => ({
                  ...current,
                  minDiscount: value
                    ? String(
                        Math.min(
                          100,
                          Number(value.replace(/\D/g, "").slice(0, 3)),
                        ),
                      )
                    : "",
                }))
              }
              keyboardType="number-pad"
            />
            <Button
              title="Show deals"
              onPress={() => {
                setRegion(filterDraft.region);
                setSort(filterDraft.sortBy);
                setStore(filterDraft.store.trim());
                setMinDiscount(filterDraft.minDiscount);
                setFiltersOpen(false);
              }}
            />
            <Button
              title="Reset filters"
              secondary
              onPress={() => {
                setStore("");
                setMinDiscount("");
                setCategory("");
                setSort("newest");
                setFiltersOpen(false);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
function Chip({
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
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.discoveryChip,
        selected && { backgroundColor: colors.button },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: "white" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  header: { gap: 10, marginBottom: 18 },
  search: {
    height: 46,
    borderRadius: 24,
    backgroundColor: "#f1f1f3",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    gap: 8,
  },
  searchInput: {
    fontFamily: "Inter_400Regular",
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: 44,
    minWidth: 0,
  },
  filterButton: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  discovery: { gap: 8 },
  discoveryChip: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12, lineHeight: 18, fontWeight: "500" },
  categories: { gap: 8, paddingVertical: 4, alignItems: "center" },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontWeight: "600", fontSize: 16 },
  options: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});

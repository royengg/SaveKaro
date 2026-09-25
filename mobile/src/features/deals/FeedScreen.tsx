import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Category, Deal, DealRegion } from "@savekaro/contracts";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  CirclePlay,
  Store,
  Bell,
  Columns3,
  Heart,
  Mic,
  LogIn,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import SaveKaroMark from "../../components/SaveKaroMark";
import { useAuth } from "../../providers/AuthProvider";
import { api } from "../../lib/api";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Field, Text } from "../../components/ui";
import { colors } from "../../theme";
import MotionPlayerFrame from "../../components/motion/MotionPlayerFrame";
import {
  rankDealsForUser,
  type SavedDealSignal,
} from "../../lib/recommendations";
import MerchantShowcases, { FeaturedShowcases } from "./MerchantShowcases";
import { useRegion } from "../../providers/RegionProvider";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PROMPT_CYCLE_MS = 2_800;
const SEARCH_PROMPTS = [
  "Search for electronics",
  "Search for fashion",
  "Search for food",
  "Search for gaming",
  "Search for beauty",
  "Search for travel",
] as const;

export default function FeedScreen() {
  const { user } = useAuth();
  const { region, setRegion } = useRegion();
  const [demoOpen, setDemoOpen] = useState(false);
  const [columns, setColumns] = useState<1 | 2>(2);
  const params = useLocalSearchParams<{ category?: string }>();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchPromptIndex, setSearchPromptIndex] = useState(0);
  const searchInput = useRef<TextInput>(null);
  const [category, setCategory] = useState("");
  const [sortBy, setSort] = useState("newest");
  const [store, setStore] = useState("");
  const [minDiscount, setMinDiscount] = useState("");
  const [activeDiscoveryPreset, setActiveDiscoveryPreset] = useState<
    "liked" | null
  >(null);
  const rankingReferenceTime = useRef(Date.now()).current;
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
  useEffect(() => {
    if (draft.trim()) return;

    const timer = setTimeout(() => {
      setSearchPromptIndex((current) => (current + 1) % SEARCH_PROMPTS.length);
    }, SEARCH_PROMPT_CYCLE_MS);

    return () => clearTimeout(timer);
  }, [draft, searchPromptIndex]);
  useEffect(() => {
    const normalizedDraft = draft.trim();
    if (normalizedDraft === search) return;

    const timer = setTimeout(
      () => setSearch(normalizedDraft),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [draft, search]);

  function updateSearchDraft(value: string) {
    setDraft(value);
    if (!value.trim() && search) setSearch("");
  }
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) =>
      api.request<Category[]>("/categories", { signal, authenticated: false }),
  });
  const savedSignals = useQuery({
    queryKey: ["saved-signals", user?.id],
    queryFn: ({ signal }) =>
      api.request<{ savedSignals: SavedDealSignal[] }>(
        "/users/me/saved-signals",
        { signal },
      ),
    enabled: !!user,
    staleTime: 5 * 60 * 1_000,
  });
  const unreadNotifications = useQuery({
    queryKey: ["unread-notification-count", user?.id],
    queryFn: ({ signal }) =>
      api.request<{ unreadNotificationCount: number }>(
        "/users/me/unread-notification-count",
        { signal },
      ),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 30_000,
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
  const loadedDeals = useMemo(
    () =>
      Array.from(
        new Map(
          feed.data?.pages
            .flatMap((page) => page.data)
            .map((deal) => [deal.id, deal]),
        ).values(),
      ),
    [feed.data?.pages],
  );
  const deals = useMemo(() => {
    const savedIds = new Set(
      savedSignals.data?.savedSignals.map((deal) => deal.id) ?? [],
    );
    return loadedDeals.map((deal) =>
      savedIds.has(deal.id) && !deal.userSaved
        ? { ...deal, userSaved: true }
        : deal,
    );
  }, [loadedDeals, savedSignals.data?.savedSignals]);
  const recommendations = useMemo(
    () =>
      rankDealsForUser({
        deals,
        savedSignals: savedSignals.data?.savedSignals ?? [],
        region,
        referenceTime: rankingReferenceTime,
      }),
    [deals, rankingReferenceTime, region, savedSignals.data?.savedSignals],
  );
  useEffect(() => {
    if (activeDiscoveryPreset === "liked" && !recommendations.hasSignals) {
      setActiveDiscoveryPreset(null);
    }
  }, [activeDiscoveryPreset, recommendations.hasSignals]);
  const displayedDeals =
    activeDiscoveryPreset === "liked" ? recommendations.deals : deals;
  const unreadCount = unreadNotifications.data?.unreadNotificationCount ?? 0;
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={styles.homeBar}>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            flex: 1,
          }}
        >
          <SaveKaroMark size={24} />
          <Text style={{ fontWeight: "700", fontSize: 14 }}>SaveKaro</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Watch SaveKaro demo"
          onPress={() => setDemoOpen(true)}
          style={styles.demoButton}
        >
          <CirclePlay size={15} color={colors.text} />
          <Text style={{ fontSize: 12 }}>Demo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter by store"
          onPress={openFilters}
          style={styles.headerButton}
        >
          <Store size={16} color={colors.text} />
        </Pressable>
        {user ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={
              unreadCount
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            onPress={() => router.push("/notifications")}
            style={styles.headerButton}
          >
            <Bell size={16} color={colors.text} />
            {unreadCount ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Region ${region}, open region options`}
          onPress={openFilters}
          style={styles.headerButton}
        >
          <Text style={{ fontSize: 18 }}>
            {region === "INDIA" ? "🇮🇳" : region === "CANADA" ? "🇨🇦" : "🌐"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={user ? "Account settings" : "Sign in"}
          onPress={() => router.push("/(tabs)/settings")}
          style={[
            styles.headerButton,
            user && { backgroundColor: "#f4f4f5", borderRadius: 20 },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : user ? (
            <Text style={{ fontWeight: "600", fontSize: 13 }}>
              {user.name?.slice(0, 1).toUpperCase() || "Y"}
            </Text>
          ) : (
            <LogIn size={17} color={colors.text} />
          )}
        </Pressable>
      </View>
      <FlatList
        key={JSON.stringify({
          search,
          category,
          region,
          sortBy,
          store,
          minDiscount,
          activeDiscoveryPreset,
          columns,
        })}
        data={displayedDeals}
        numColumns={columns}
        columnWrapperStyle={columns === 2 ? { gap: 12 } : undefined}
        keyExtractor={(deal) => deal.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: columns === 2 ? "50%" : "100%" }}>
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
              <Search size={15} color={colors.muted} />
              <TextInput
                ref={searchInput}
                accessibilityLabel="Search deals and stores"
                placeholder={
                  searchFocused ? "" : SEARCH_PROMPTS[searchPromptIndex]
                }
                placeholderTextColor={colors.muted}
                value={draft}
                onChangeText={updateSearchDraft}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onSubmitEditing={() => setSearch(draft.trim())}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {draft.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setDraft("");
                    setSearch("");
                  }}
                  style={styles.searchControl}
                >
                  <X size={16} color={colors.muted} />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${columns === 2 ? "one column" : "two columns"}`}
                  onPress={() => setColumns(columns === 2 ? 1 : 2)}
                  style={styles.searchControl}
                >
                  <Columns3 size={16} color="#c39040" />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open search keyboard for voice dictation"
                accessibilityHint="Use the microphone on your device keyboard to dictate a search."
                onPress={() => searchInput.current?.focus()}
                style={styles.searchControl}
              >
                <Mic size={16} color={colors.muted} />
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
                    setActiveDiscoveryPreset(null);
                    setSort(item.sort);
                    setMinDiscount(item.discount);
                  }}
                  accessibilityState={{
                    selected:
                      activeDiscoveryPreset === null &&
                      sortBy === item.sort &&
                      minDiscount === item.discount,
                  }}
                  style={[
                    styles.discoveryChip,
                    activeDiscoveryPreset === null &&
                      sortBy === item.sort &&
                      minDiscount === item.discount && {
                        backgroundColor: "#fff8e1",
                        borderColor: "#fcd34d",
                      },
                  ]}
                >
                  <item.Icon size={15} color={colors.primary} />
                  <Text style={styles.chipText}>{item.label}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show recommendations based on deals you liked"
                accessibilityHint={
                  recommendations.hasSignals
                    ? undefined
                    : "Save or upvote a deal to unlock recommendations"
                }
                accessibilityState={{
                  selected: activeDiscoveryPreset === "liked",
                  disabled: !recommendations.hasSignals,
                }}
                disabled={!recommendations.hasSignals}
                onPress={() => {
                  setActiveDiscoveryPreset("liked");
                  setSort("newest");
                  setMinDiscount("");
                }}
                style={[
                  styles.discoveryChip,
                  activeDiscoveryPreset === "liked" && styles.likedChip,
                  !recommendations.hasSignals && styles.disabledChip,
                ]}
              >
                <Heart size={15} color={colors.primary} />
                <Text style={styles.chipText}>Because you liked this</Text>
              </Pressable>
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
              <View style={{ gap: 26, marginTop: 8 }}>
                <MotionPlayerFrame
                  kind="home"
                  active={!demoOpen}
                  style={styles.walkthrough}
                />
                <MerchantShowcases region={region} />
              </View>
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
              {(["INDIA", "CANADA", "WORLD"] as const).map((value) => (
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
                setRegion(filterDraft.region as DealRegion);
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
                setActiveDiscoveryPreset(null);
                setFiltersOpen(false);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={demoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDemoOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <SafeAreaView style={styles.demoModal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close demo"
            onPress={() => setDemoOpen(false)}
            style={styles.demoBackdrop}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.99)", "rgba(250,247,242,0.98)"]}
            style={styles.demoDialog}
          >
            <View style={styles.demoDialogHeader}>
              <Text style={styles.demoDialogTitle}>How SaveKaro works</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close demo"
                onPress={() => setDemoOpen(false)}
                hitSlop={8}
                style={styles.demoClose}
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.demoDialogBody}>
              {demoOpen ? (
                <MotionPlayerFrame kind="demo" style={styles.demoPlayer} />
              ) : null}
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  homeBar: {
    height: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerButton: {
    width: 28,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
  },
  walkthrough: {
    borderRadius: 30,
  },
  demoModal: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  demoBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  demoDialog: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    boxShadow: "0 40px 100px rgba(15,23,42,0.28)",
  },
  demoDialogHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  demoDialogTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.54,
  },
  demoClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  demoDialogBody: { padding: 16 },
  demoPlayer: { borderRadius: 28 },
  list: { padding: 16, paddingTop: 2, paddingBottom: 32 },
  header: { gap: 6, marginBottom: 18 },
  search: {
    height: 44,
    borderRadius: 24,
    backgroundColor: "#f4f4f5",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    gap: 9,
    marginHorizontal: -4,
  },
  searchInput: {
    fontFamily: "Inter_400Regular",
    flex: 1,
    fontSize: 15.5,
    lineHeight: 20,
    color: colors.text,
    height: 44,
    minWidth: 0,
  },
  searchControl: {
    width: 32,
    height: 38,
    flexShrink: 0,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
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
  likedChip: { backgroundColor: "#ffe4e6", borderColor: "#fda4af" },
  disabledChip: { opacity: 0.6 },
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

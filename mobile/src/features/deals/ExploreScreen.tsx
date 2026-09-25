import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  ActivityIndicator,
  AccessibilityInfo,
  FlatList,
  Modal,
  View,
  ScrollView,
  Pressable,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import {
  updateDealReadCaches,
  updateSavedSignalCaches,
} from "../../lib/deal-cache";
import type { SavedDealSignal } from "../../lib/recommendations";
import { formatPrice, timeAgo } from "../../components/DealCard";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  X,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  ExternalLink,
  Clock,
  ThumbsUp,
  ChevronUp,
  ChevronDown,
  Tag,
  Info,
} from "lucide-react-native";
import { useAuth } from "../../providers/AuthProvider";
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
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
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
  const deals = useMemo(() => {
    const savedIds = new Set(
      savedSignals.data?.savedSignals.map((deal) => deal.id) ?? [],
    );
    return Array.from(
      new Map(
        feed.data?.pages
          .flatMap((page) => page.data)
          .map((deal) => [
            deal.id,
            savedIds.has(deal.id) ? { ...deal, userSaved: true } : deal,
          ]),
      ).values(),
    );
  }, [feed.data?.pages, savedSignals.data?.savedSignals]);
  function move(next: number) {
    if (next < 0 || next >= deals.length) return;
    list.current?.scrollToIndex({ index: next, animated: false });
    setIndex(next);
  }
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close explore"
          onPress={() => router.replace("/(tabs)")}
          hitSlop={4}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} color="white" />
        </Pressable>
        {wide && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore filters"
            style={{
              padding: 10,
              borderRadius: 24,
              backgroundColor: "rgba(0,0,0,.3)",
              marginRight: 56,
            }}
            onPress={() => {
              setDraft(filters);
              setFiltersOpen(true);
            }}
          >
            <SlidersHorizontal size={22} color="white" />
          </Pressable>
        )}
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
            <ExploreDealCard deal={item} height={height} />
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
      {wide && (
        <View
          style={{
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 8,
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 5,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous deal"
            style={{
              padding: 12,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,.15)",
              opacity: index === 0 ? 0.3 : 1,
            }}
            disabled={index === 0}
            onPress={() => move(index - 1)}
          >
            <ChevronUp size={20} color="white" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              index >= deals.length - 1 && feed.hasNextPage
                ? "Load more"
                : "Next deal"
            }
            style={{
              padding: 12,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,.15)",
            }}
            disabled={
              feed.isFetchingNextPage ||
              (index >= deals.length - 1 && !feed.hasNextPage)
            }
            onPress={() => {
              if (index >= deals.length - 1 && feed.hasNextPage)
                void feed.fetchNextPage();
              else move(index + 1);
            }}
          >
            <ChevronDown size={20} color="white" />
          </Pressable>
        </View>
      )}
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

function ExploreDealCard({ deal, height }: { deal: Deal; height: number }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [saved, setSaved] = useState(!!deal.userSaved);
  const [voted, setVoted] = useState(deal.userUpvote === 1);
  const [votes, setVotes] = useState(deal.upvoteCount);
  useEffect(() => {
    setSaved(!!deal.userSaved);
  }, [deal.id, deal.userSaved, user?.id]);
  useEffect(() => {
    setVoted(deal.userUpvote === 1);
  }, [deal.id, deal.userUpvote, user?.id]);
  useEffect(() => {
    setVotes(deal.upvoteCount);
  }, [deal.id, deal.upvoteCount]);
  const mutation = useMutation({
    mutationFn: (kind: "saved" | "vote") =>
      api.request<{ upvoteCount?: number; saved?: boolean }>(
        "/deals/" + deal.id + "/" + kind,
        {
          method: kind === "saved" ? "PUT" : "POST",
          body: kind === "saved" ? { saved: !saved } : { value: voted ? 0 : 1 },
        },
      ),
    onSuccess: (result, kind) => {
      if (kind === "saved") {
        const nextSaved = result.saved ?? !saved;
        setSaved(nextSaved);
        updateDealReadCaches(client, deal.id, (current) => ({
          ...current,
          userSaved: nextSaved,
        }));
        updateSavedSignalCaches(client, deal, nextSaved);
        void client.invalidateQueries({ queryKey: ["saved-signals"] });
      } else {
        const nextVote = voted ? 0 : 1;
        const nextCount = result.upvoteCount ?? votes + (voted ? -1 : 1);
        setVotes(nextCount);
        setVoted(!voted);
        updateDealReadCaches(client, deal.id, (current) => ({
          ...current,
          userUpvote: nextVote || null,
          upvoteCount: nextCount,
        }));
      }
      void client.invalidateQueries({ queryKey: ["saved"] });
      void client.invalidateQueries({ queryKey: ["deal", deal.id] });
    },
    onError: (error) => Alert.alert("Could not update deal", error.message),
  });
  function act(kind: "saved" | "vote") {
    if (!user) {
      Alert.alert("Sign in required", "Sign in from Settings to continue.");
      return;
    }
    mutation.mutate(kind);
  }
  async function visit() {
    const url = deal.affiliateUrl || deal.productUrl;
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("Store link unavailable");
      return;
    }
    void api
      .request("/deals/" + deal.id + "/click", {
        method: "POST",
        authenticated: false,
      })
      .catch(() => undefined);
    await WebBrowser.openBrowserAsync(url).catch(() =>
      Alert.alert("Could not open store"),
    );
  }
  return (
    <View style={{ height, backgroundColor: "black" }}>
      {deal.imageUrl ? (
        <Image
          source={{ uri: deal.imageUrl }}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#3b185d",
          }}
        >
          <Tag size={96} color="#c4b5fd" />
        </View>
      )}
      <LinearGradient
        colors={["rgba(0,0,0,.5)", "rgba(0,0,0,.3)", "rgba(0,0,0,.9)"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", inset: 0 }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 96,
          left: 24,
          right: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {[
            deal.category?.name || "Other",
            deal.category?.name?.toLowerCase() !== "other" &&
            ![
              "other",
              "unknown",
              "n/a",
              "na",
              "null",
              "undefined",
              "-",
            ].includes(deal.store?.trim().toLowerCase() ?? "")
              ? deal.store?.trim()
              : null,
          ]
            .filter(Boolean)
            .map((label, index) => (
              <View
                key={index}
                style={{
                  backgroundColor:
                    index === 0 ? "rgba(255,255,255,.2)" : "transparent",
                  borderWidth: index === 0 ? 0 : 1,
                  borderColor: "rgba(255,255,255,.3)",
                  borderRadius: 16,
                  paddingHorizontal: 8,
                  paddingVertical: index === 0 ? 2 : 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "500",
                  }}
                >
                  {label}
                </Text>
              </View>
            ))}
        </View>
        <Pressable
          accessibilityRole="link"
          style={{ marginBottom: 12 }}
          onPress={() =>
            router.push({ pathname: "/deal/[id]", params: { id: deal.id } })
          }
        >
          <Text
            numberOfLines={2}
            style={{
              fontSize: 22.4,
              lineHeight: 24.192,
              fontWeight: "700",
              color: "white",
              maxWidth: 272,
            }}
          >
            {deal.cleanTitle || deal.title}
          </Text>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "baseline",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 37.6,
              lineHeight: 56.4,
              fontWeight: "700",
              color: "white",
            }}
          >
            {formatPrice(deal.dealPrice, deal.currency)}
          </Text>
          {deal.originalPrice && (
            <Text
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,.5)",
                textDecorationLine: "line-through",
              }}
            >
              {formatPrice(deal.originalPrice, deal.currency)}
            </Text>
          )}
          {deal.discountPercent != null && deal.discountPercent >= 10 && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 16,
                backgroundColor: "#ef4444",
              }}
            >
              <Text style={{ fontSize: 15, color: "white", fontWeight: "600" }}>
                {deal.discountPercent}% OFF
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ThumbsUp size={16} color="rgba(255,255,255,.7)" />
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: "rgba(255,255,255,.7)",
              }}
            >
              {votes} votes
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Clock size={16} color="rgba(255,255,255,.7)" />
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: "rgba(255,255,255,.7)",
              }}
            >
              {timeAgo(deal.createdAt)}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? "Unsave deal" : "Save deal"}
            accessibilityState={{ selected: saved }}
            disabled={mutation.isPending}
            onPress={() => act("saved")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: saved ? colors.primary : "rgba(255,255,255,.2)",
            }}
          >
            {saved ? (
              <BookmarkCheck size={16} color="white" />
            ) : (
              <Bookmark size={16} color="white" />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={voted ? "Remove vote" : "Upvote deal"}
            accessibilityState={{ selected: voted }}
            disabled={mutation.isPending}
            onPress={() => act("vote")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: voted ? "#10b981" : "rgba(255,255,255,.2)",
            }}
          >
            <ArrowUp size={16} color="white" />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Visit store"
          onPress={() => void visit()}
          style={{
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.button,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 18, color: "white", fontWeight: "600" }}>
            Visit Store
          </Text>
          <ExternalLink size={16} color="white" />
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 6,
            marginTop: 8,
            borderRadius: 6,
            backgroundColor: "rgba(0,0,0,.35)",
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Info
            size={14}
            color="rgba(255,255,255,.8)"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              lineHeight: 16.5,
              color: "rgba(255,255,255,.8)",
            }}
          >
            Some links may be affiliate links (currently Amazon only); we may
            earn a commission at no extra cost to you.{" "}
            <Text
              accessibilityRole="link"
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  "https://savekaro.online/affiliate-disclosure",
                ).catch(() => Alert.alert("Could not open disclosure"))
              }
              style={{
                fontSize: 11,
                lineHeight: 16.5,
                color: "white",
                fontWeight: "500",
                textDecorationLine: "underline",
              }}
            >
              Read full affiliate disclosure
            </Text>
            .
          </Text>
        </View>
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <ChevronUp size={16} color="rgba(255,255,255,.5)" />
        <Text
          style={{
            fontSize: 12,
            lineHeight: 16,
            color: "rgba(255,255,255,.5)",
          }}
        >
          Swipe up for next
        </Text>
      </View>
    </View>
  );
}

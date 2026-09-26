import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, PriceHistoryPoint } from "@savekaro/contracts";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Share,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  Share2,
  Check,
  Store,
  Clock,
  Tag,
  ExternalLink,
  Info,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "../../theme";
import * as WebBrowser from "expo-web-browser";
import { api } from "../../lib/api";
import {
  updateDealReadCaches,
  updateSavedSignalCaches,
} from "../../lib/deal-cache";
import { openDealStore } from "../../lib/deal-links";
import { ErrorState, PageBackButton, Screen, Text } from "../../components/ui";
import SiteFooter from "../../components/SiteFooter";
import { formatPrice, timeAgo } from "../../components/DealCard";
import PriceHistory from "../../components/PriceHistory";
import { useAuth } from "../../providers/AuthProvider";
import { useCart } from "../account/CartProvider";
import CommentsSection from "../community/CommentsSection";

interface EarnedBadge {
  id: string;
  badge: {
    name: string;
    icon: string;
  };
}

type DealAction =
  | { path: "vote"; body: { value: number }; method?: "POST" }
  | { path: "saved"; body: { saved: boolean }; method: "PUT" };

const descriptionUrlPattern = /https?:\/\/[^\s)\]<>]+/g;

function createDescriptionPreview(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  let previewEnd = maxLength;
  for (const match of text.matchAll(descriptionUrlPattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < previewEnd && end > previewEnd) {
      previewEnd = end;
      break;
    }
  }
  return `${text.slice(0, previewEnd).trimEnd()}…`;
}

function LinkedDescription({ text }: { text: string }) {
  const parts: Array<string | ReactElement> = [];
  let cursor = 0;
  for (const match of text.matchAll(descriptionUrlPattern)) {
    const url = match[0];
    const start = match.index ?? 0;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <Text
        key={`${start}-${url}`}
        accessibilityRole="link"
        style={styles.descriptionLink}
        onPress={() =>
          void Linking.openURL(url).catch(() =>
            Alert.alert("Could not open link"),
          )
        }
      >
        {url}
      </Text>,
    );
    cursor = start + url.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Text style={styles.description}>{parts}</Text>;
}

export default function DealDetailScreen() {
  const [expanded, setExpanded] = useState(false);
  const [imageRatio, setImageRatio] = useState(16 / 9);
  const [visitCtaHidden, setVisitCtaHidden] = useState(false);
  const visitCtaHiddenRef = useRef(false);
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const cart = useCart();
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["price-history", id],
    queryFn: ({ signal }) =>
      api.request<PriceHistoryPoint[]>(
        `/deals/${encodeURIComponent(id)}/price-history?limit=30`,
        { signal, authenticated: false },
      ),
    enabled: !!id,
  });
  const query = useQuery({
    queryKey: ["deal", id, user?.id],
    queryFn: ({ signal }) =>
      api.request<Deal>(`/deals/${encodeURIComponent(id)}`, { signal }),
    enabled: !!id,
  });
  const submitterId = query.data?.submittedBy?.id;
  const submitterBadges = useQuery({
    queryKey: ["user-badges", submitterId],
    queryFn: ({ signal }) =>
      api.request<EarnedBadge[]>(
        `/gamification/users/${encodeURIComponent(submitterId!)}/badges`,
        { signal, authenticated: false },
      ),
    enabled: !!submitterId,
    staleTime: 10 * 60 * 1_000,
  });
  const action = useMutation({
    mutationFn: ({ path, body, method = "POST" }: DealAction) =>
      api.request<{ upvoteCount?: number; saved?: boolean }>(
        `/deals/${id}/${path}`,
        { method, body },
      ),
    onSuccess: (result, mutation) => {
      updateDealReadCaches(client, id, (current) =>
        mutation.path === "vote"
          ? {
              ...current,
              userUpvote: mutation.body.value || null,
              upvoteCount: result.upvoteCount ?? current.upvoteCount,
            }
          : {
              ...current,
              userSaved: result.saved ?? mutation.body.saved,
            },
      );
      void client.invalidateQueries({ queryKey: ["deal", id] });
      void client.invalidateQueries({ queryKey: ["saved"] });
      if (mutation.path === "saved") {
        updateSavedSignalCaches(
          client,
          deal,
          result.saved ?? mutation.body.saved,
        );
        void client.invalidateQueries({ queryKey: ["saved-signals"] });
      }
    },
    onError: (error) => Alert.alert("Could not update deal", error.message),
  });
  const imageUrl = query.data?.imageUrl;
  useEffect(() => {
    let active = true;
    setImageRatio(16 / 9);
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          if (active && width > 0 && height > 0) setImageRatio(width / height);
        },
        () => undefined,
      );
    }
    return () => {
      active = false;
    };
  }, [imageUrl]);
  if (query.isPending) return <ActivityIndicator style={{ margin: 40 }} />;
  if (!query.data)
    return (
      <Screen>
        <ErrorState retry={() => void query.refetch()} />
      </Screen>
    );
  const deal = query.data;
  function mutate(mutation: DealAction) {
    if (!user) {
      Alert.alert("Sign in required", "Sign in from Settings to continue.");
      return;
    }
    action.mutate(mutation);
  }
  const inCart = cart.items.some((item) => item.id === deal.id);
  function updateVisitCtaVisibility(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const remaining =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const shouldHide = remaining <= 278;
    if (shouldHide === visitCtaHiddenRef.current) return;
    visitCtaHiddenRef.current = shouldHide;
    setVisitCtaHidden(shouldHide);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        onScroll={updateVisitCtaVisibility}
        scrollEventThrottle={100}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 20,
          gap: 16,
          paddingBottom: 110 + insets.bottom,
        }}
      >
        <PageBackButton />
        <View style={styles.imageFrame}>
          {deal.imageUrl ? (
            <Image
              source={{ uri: deal.imageUrl }}
              style={{
                width: "100%",
                height: Math.min(
                  (dimensions.width - 34) / imageRatio,
                  dimensions.height * 0.42,
                ),
              }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                height: 260,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tag size={42} color={colors.muted} />
            </View>
          )}
          {deal.discountPercent != null && deal.discountPercent >= 20 && (
            <View
              style={[
                styles.discount,
                {
                  backgroundColor:
                    deal.discountPercent >= 50 ? "#ef4444" : "#10b981",
                },
              ]}
            >
              <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>
                {deal.discountPercent}% OFF
              </Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <View style={styles.pills}>
            {[
              { Icon: Store, label: deal.store || "Unknown store" },
              { Icon: Clock, label: timeAgo(deal.createdAt) },
              { Icon: ArrowUp, label: deal.upvoteCount + " votes" },
            ].map(({ Icon, label }) => (
              <View key={label} style={styles.pill}>
                <Icon size={14} color={colors.muted} />
                <Text style={styles.pillText}>{label}</Text>
              </View>
            ))}
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {deal.title}
          </Text>
          <View style={styles.priceRow}>
            <Text
              style={
                Number(deal.dealPrice) > 0
                  ? styles.price
                  : styles.unavailablePrice
              }
            >
              {Number(deal.dealPrice) > 0
                ? formatPrice(deal.dealPrice, deal.currency)
                : "Check store pricing"}
            </Text>
            {Number(deal.originalPrice) > 0 &&
              Number(deal.originalPrice) > Number(deal.dealPrice ?? 0) && (
                <Text style={styles.original}>
                  {formatPrice(deal.originalPrice, deal.currency)}
                </Text>
              )}
            {Number(deal.dealPrice) > 0 &&
              Number(deal.originalPrice) > Number(deal.dealPrice) && (
                <Text style={styles.savings}>
                  Save{" "}
                  {formatPrice(
                    Number(deal.originalPrice) - Number(deal.dealPrice),
                    deal.currency,
                  )}
                </Text>
              )}
          </View>
          <View style={styles.actions}>
            <Action
              Icon={ArrowUp}
              label="Upvote deal"
              active={deal.userUpvote === 1}
              disabled={action.isPending}
              count={deal.upvoteCount}
              onPress={() =>
                mutate({
                  path: "vote",
                  body: { value: deal.userUpvote === 1 ? 0 : 1 },
                })
              }
            />
            <Action
              Icon={deal.userSaved ? BookmarkCheck : Bookmark}
              label={deal.userSaved ? "Unsave deal" : "Save deal"}
              active={deal.userSaved}
              disabled={action.isPending}
              onPress={() =>
                mutate({
                  path: "saved",
                  body: { saved: !deal.userSaved },
                  method: "PUT",
                })
              }
            />
            <Action
              Icon={inCart ? Check : ShoppingCart}
              label={inCart ? "Remove from cart" : "Add to cart"}
              active={inCart}
              onPress={() => (inCart ? cart.remove(deal.id) : cart.add(deal))}
            />
            <Action
              Icon={Share2}
              label="Share deal"
              onPress={() =>
                void Share.share({
                  message:
                    (deal.cleanTitle || deal.title) +
                    "\nhttps://savekaro.online/deal/" +
                    deal.id,
                })
              }
            />
          </View>
          <View style={styles.disclosureRow}>
            <Info size={14} color={colors.muted} style={{ marginTop: 1 }} />
            <Text style={styles.disclosure}>
              Some links may be affiliate links (currently Amazon only); we may
              earn a commission at no extra cost to you.{" "}
              <Text
                accessibilityRole="link"
                style={styles.disclosureLink}
                onPress={() => {
                  void WebBrowser.openBrowserAsync(
                    "https://savekaro.online/affiliate-disclosure",
                  ).catch(() => Alert.alert("Could not open disclosure"));
                }}
              >
                Read full affiliate disclosure
              </Text>
              .
            </Text>
          </View>
          {deal.description && (
            <>
              <LinkedDescription
                text={
                  expanded
                    ? deal.description
                    : createDescriptionPreview(deal.description, 360)
                }
              />
              {deal.description.length > 360 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setExpanded(!expanded)}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500" }}>
                    {expanded ? "Show less" : "Show more"}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
        <View style={[styles.section, styles.secondarySection]}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Price History
          </Text>
          {history.isPending ? (
            <ActivityIndicator />
          ) : history.isError ? (
            <ErrorState retry={() => void history.refetch()} />
          ) : history.data?.length ? (
            <PriceHistory points={history.data} currency={deal.currency} />
          ) : (
            <Text style={styles.historyEmpty}>
              No tracked price history for this deal yet.
            </Text>
          )}
        </View>
        <View style={[styles.section, styles.secondarySection]}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Deal Details
          </Text>
          <View style={{ gap: 12 }}>
            {[
              { label: "CATEGORY", value: deal.category.name, Icon: Tag },
              { label: "STORE", value: deal.store || "Unknown", Icon: Store },
              { label: "POSTED", value: timeAgo(deal.createdAt), Icon: Clock },
              {
                label: "COMMUNITY SCORE",
                value: deal.upvoteCount + " votes",
                Icon: ArrowUp,
              },
            ].map(({ label, value, Icon }) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.factLabel}>{label}</Text>
                <View
                  style={{ flexDirection: "row", gap: 7, alignItems: "center" }}
                >
                  <Icon size={16} color={colors.text} />
                  <Text style={{ fontWeight: "500" }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
          {deal.submittedBy && (
            <View style={styles.submitter}>
              <Text style={{ fontSize: 14, color: colors.muted }}>
                Submitted by
              </Text>
              {deal.submittedBy.avatarUrl && (
                <Image
                  source={{ uri: deal.submittedBy.avatarUrl }}
                  style={{ width: 20, height: 20, borderRadius: 10 }}
                />
              )}
              <Text style={{ fontSize: 14, fontWeight: "500" }}>
                {deal.submittedBy.name || "Anonymous"}
              </Text>
              {submitterBadges.data?.map((earned) => (
                <View
                  key={earned.id}
                  accessible
                  accessibilityLabel={earned.badge.name}
                  style={styles.submitterBadge}
                >
                  <Text style={styles.submitterBadgeIcon}>
                    {earned.badge.icon}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={{ marginTop: 48 }}>
          <CommentsSection dealId={id} />
        </View>
        <SiteFooter />
      </ScrollView>
      {!visitCtaHidden ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: 38,
            left: 16,
            right: 16,
            alignItems: "center",
          }}
        >
          <Pressable
            accessibilityRole="link"
            onPress={() => void openDealStore(deal)}
            style={styles.visit}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
              Visit Store
            </Text>
            <ExternalLink size={17} color="white" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
function Action({
  Icon,
  label,
  onPress,
  active = false,
  disabled = false,
  count,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.action,
        active && { backgroundColor: colors.primary },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon size={16} color={active ? "white" : colors.text} />
      {count !== undefined && (
        <Text style={{ fontSize: 14, color: active ? "white" : colors.text }}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  imageFrame: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "#f4f4f5",
  },
  discount: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
    backgroundColor: colors.surface,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f9f9fa",
  },
  pillText: { fontSize: 12, lineHeight: 20, fontWeight: "500" },
  title: {
    fontSize: 27.2,
    lineHeight: 29.376,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  price: { fontSize: 32, lineHeight: 32, fontWeight: "700", color: "#059669" },
  unavailablePrice: { fontSize: 18, lineHeight: 28, fontWeight: "600" },
  savings: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  submitter: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  submitterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
  },
  submitterBadgeIcon: { fontSize: 12, lineHeight: 16 },
  original: {
    fontSize: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  action: {
    height: 40,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  disclosureRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: -4,
  },
  disclosure: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.muted },
  disclosureLink: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  secondarySection: { padding: 20 },
  historyEmpty: { fontSize: 14, lineHeight: 20, color: colors.muted },
  description: { fontSize: 14, lineHeight: 24, color: colors.muted },
  descriptionLink: {
    color: colors.text,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  sectionTitle: { fontSize: 18, lineHeight: 28, fontWeight: "600" },
  fact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fafafa",
  },
  factLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    letterSpacing: 0.7,
  },
  visit: {
    height: 48,
    width: 282,
    maxWidth: "100%",
    borderRadius: 24,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

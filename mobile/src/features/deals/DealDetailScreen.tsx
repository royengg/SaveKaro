import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal, PriceHistoryPoint } from "@savekaro/contracts";
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUp,
  ArrowDown,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  Share2,
  Check,
  Store,
  Clock,
  Tag,
  ExternalLink,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "../../theme";
import * as WebBrowser from "expo-web-browser";
import { api } from "../../lib/api";
import { ErrorState, PageBackButton, Screen, Text } from "../../components/ui";
import { formatPrice, timeAgo } from "../../components/DealCard";
import PriceHistory from "../../components/PriceHistory";
import { useAuth } from "../../providers/AuthProvider";
import { useCart } from "../account/CartProvider";
import CommentsSection from "../community/CommentsSection";

export default function DealDetailScreen() {
  const [expanded, setExpanded] = useState(false);
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
  const action = useMutation({
    mutationFn: ({
      path,
      body,
      method = "POST",
    }: {
      path: string;
      body: unknown;
      method?: "POST" | "PUT";
    }) => api.request(`/deals/${id}/${path}`, { method, body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["deal", id] });
      void client.invalidateQueries({ queryKey: ["deals"] });
      void client.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: (error) => Alert.alert("Could not update deal", error.message),
  });
  if (query.isPending) return <ActivityIndicator style={{ margin: 40 }} />;
  if (!query.data)
    return (
      <Screen>
        <ErrorState retry={() => void query.refetch()} />
      </Screen>
    );
  const deal = query.data;
  function mutate(
    path: string,
    body: unknown,
    method: "POST" | "PUT" = "POST",
  ) {
    if (!user) {
      Alert.alert("Sign in required", "Sign in from Settings to continue.");
      return;
    }
    action.mutate({ path, body, method });
  }
  async function visit() {
    const url = deal.affiliateUrl || deal.productUrl;
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("Store link unavailable");
      return;
    }
    void api
      .request(`/deals/${id}/click`, { method: "POST", authenticated: false })
      .catch(() => undefined);
    await WebBrowser.openBrowserAsync(url).catch(() =>
      Alert.alert("Could not open store"),
    );
  }
  const inCart = cart.items.some((item) => item.id === deal.id);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
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
                height: Math.min(dimensions.height * 0.42, 380),
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
            <Text style={styles.price}>
              {formatPrice(deal.dealPrice, deal.currency) ||
                "Check store pricing"}
            </Text>
            {deal.originalPrice &&
              Number(deal.originalPrice) > Number(deal.dealPrice ?? 0) && (
                <Text style={styles.original}>
                  {formatPrice(deal.originalPrice, deal.currency)}
                </Text>
              )}
          </View>
          <View style={styles.actions}>
            <View style={styles.voteGroup}>
              <Action
                Icon={ArrowUp}
                label="Upvote deal"
                active={deal.userUpvote === 1}
                disabled={action.isPending}
                onPress={() =>
                  mutate("vote", { value: deal.userUpvote === 1 ? 0 : 1 })
                }
              />
              <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {deal.upvoteCount}
              </Text>
              <Action
                Icon={ArrowDown}
                label="Downvote deal"
                active={deal.userUpvote === -1}
                disabled={action.isPending}
                onPress={() =>
                  mutate("vote", { value: deal.userUpvote === -1 ? 0 : -1 })
                }
              />
            </View>
            <Action
              Icon={deal.userSaved ? BookmarkCheck : Bookmark}
              label={deal.userSaved ? "Unsave deal" : "Save deal"}
              active={deal.userSaved}
              disabled={action.isPending}
              onPress={() => mutate("saved", { saved: !deal.userSaved }, "PUT")}
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
          <Text style={styles.disclosure}>
            Some links may earn us a commission at no extra cost to you.
          </Text>
          {deal.description && (
            <>
              <Text style={styles.description}>
                {expanded
                  ? deal.description
                  : deal.description.slice(0, 360) +
                    (deal.description.length > 360 ? "…" : "")}
              </Text>
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
        <View style={styles.section}>
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
            <Text style={styles.description}>
              No tracked price history for this deal yet.
            </Text>
          )}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Deal Details
          </Text>
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
          {deal.submittedBy && (
            <Text style={styles.description}>
              Submitted by {deal.submittedBy.name || "Anonymous"}
            </Text>
          )}
        </View>
        <CommentsSection dealId={id} />
      </ScrollView>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          bottom: 14 + insets.bottom,
          left: 16,
          right: 16,
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityRole="link"
          onPress={() => void visit()}
          style={styles.visit}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "white" }}>
            Visit Store
          </Text>
          <ExternalLink size={17} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
function Action({
  Icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
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
        active && { backgroundColor: "#ede9fe" },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon size={18} color={active ? colors.primary : colors.text} />
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
    gap: 5,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f9f9fa",
  },
  pillText: { fontSize: 12, lineHeight: 20 },
  title: {
    fontSize: 27,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  price: { fontSize: 32, lineHeight: 37, fontWeight: "700", color: "#059669" },
  original: {
    fontSize: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  voteGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: colors.border,
  },
  action: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#f4f4f5",
  },
  disclosure: { fontSize: 11, lineHeight: 16, color: colors.muted },
  description: { fontSize: 14, lineHeight: 24, color: colors.muted },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "600" },
  fact: {
    padding: 12,
    gap: 5,
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

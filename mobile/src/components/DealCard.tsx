import { useEffect, useState } from "react";
import type { Deal } from "@savekaro/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  Check,
} from "lucide-react-native";
import { Text } from "./ui";
import { colors } from "../theme";
import { api } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";
import { useCart } from "../features/account/CartProvider";

export function formatPrice(
  value: string | number | null | undefined,
  currency = "INR",
) {
  if (value == null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      amount,
    );
  }
}
export function timeAgo(value: string) {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 3_600_000),
  );
  return hours < 1
    ? "Just now"
    : hours < 24
      ? hours + "h ago"
      : Math.floor(hours / 24) + "d ago";
}
export default function DealCard({ deal }: { deal: Deal }) {
  const [imageWidth, setImageWidth] = useState(156);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setImageRatio(null);
    if (deal.imageUrl)
      Image.getSize(
        deal.imageUrl,
        (width, height) => {
          if (active && width > 0 && height > 0) setImageRatio(width / height);
        },
        () => undefined,
      );
    return () => {
      active = false;
    };
  }, [deal.imageUrl]);
  const { user } = useAuth();
  const cart = useCart();
  const client = useQueryClient();
  const [saved, setSaved] = useState(!!deal.userSaved);
  const [vote, setVote] = useState(deal.userUpvote ?? 0);
  const [votes, setVotes] = useState(deal.upvoteCount);
  useEffect(() => {
    setSaved(!!deal.userSaved);
  }, [deal.id, deal.userSaved, user?.id]);
  useEffect(() => {
    setVote(deal.userUpvote ?? 0);
  }, [deal.id, deal.userUpvote, user?.id]);
  useEffect(() => {
    setVotes(deal.upvoteCount);
  }, [deal.id, deal.upvoteCount]);
  const inCart = cart.items.some((item) => item.id === deal.id);
  const mutation = useMutation({
    mutationFn: ({
      kind,
      value,
    }: {
      kind: "saved" | "vote";
      value: boolean | number;
    }) =>
      api.request<{ upvoteCount?: number; saved?: boolean }>(
        "/deals/" + deal.id + "/" + kind,
        {
          method: kind === "saved" ? "PUT" : "POST",
          body: kind === "saved" ? { saved: value } : { value },
        },
      ),
    onSuccess: (result, action) => {
      if (action.kind === "saved") setSaved(Boolean(action.value));
      else {
        const next = Number(action.value);
        setVotes((count) => result.upvoteCount ?? count + next - vote);
        setVote(next);
      }
      void client.invalidateQueries({ queryKey: ["deal", deal.id] });
      void client.invalidateQueries({ queryKey: ["saved"] });
      if (action.kind === "vote")
        void client.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (error) => Alert.alert("Could not update deal", error.message),
  });
  function act(kind: "saved" | "vote", value: boolean | number) {
    if (!user) {
      Alert.alert("Sign in required", "Sign in from Settings to continue.");
      return;
    }
    mutation.mutate({ kind, value });
  }
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          "Open deal page for " + (deal.cleanTitle || deal.title)
        }
        onPress={() =>
          router.push({ pathname: "/deal/[id]", params: { id: deal.id } })
        }
      >
        <View
          style={styles.imageFrame}
          onLayout={(event) => setImageWidth(event.nativeEvent.layout.width)}
        >
          {deal.imageUrl ? (
            <Image
              source={{ uri: deal.imageUrl }}
              style={[
                styles.image,
                {
                  height: Math.max(
                    100,
                    Math.min(400, imageWidth / (imageRatio ?? 0.8)),
                  ),
                },
              ]}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LinearGradient
              colors={["#dedede", "#b7b7b7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeholder}
            >
              <Text style={{ fontSize: 60, lineHeight: 76 }}>
                {deal.category.icon?.trim() ||
                  (
                    {
                      electronics: "💻",
                      fashion: "👕",
                      gaming: "🎮",
                      "home-kitchen": "🏠",
                      beauty: "💄",
                      "food-groceries": "🍕",
                      "mobile-accessories": "📱",
                      "books-stationery": "📚",
                      travel: "✈️",
                      other: "📦",
                    } as Record<string, string>
                  )[deal.category.slug] ||
                  "🏷️"}
              </Text>
            </LinearGradient>
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
              <Text style={styles.discountText}>
                {deal.discountPercent}% OFF
              </Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          {deal.brand && (
            <Text style={styles.brand}>{deal.brand.toUpperCase()}</Text>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {deal.cleanTitle || deal.title}
          </Text>
        </View>
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(deal.dealPrice, deal.currency) || "View offer"}
          </Text>
          {deal.originalPrice &&
            Number(deal.originalPrice) > Number(deal.dealPrice ?? 0) && (
              <Text style={styles.original}>
                {formatPrice(deal.originalPrice, deal.currency)}
              </Text>
            )}
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            accessibilityLabel={vote === 1 ? "Remove vote" : "Upvote deal"}
            accessibilityState={{
              selected: vote === 1,
              disabled: mutation.isPending,
            }}
            disabled={mutation.isPending}
            onPress={() => act("vote", vote === 1 ? 0 : 1)}
            style={styles.vote}
          >
            <View style={styles.circle}>
              <ArrowUp
                size={14}
                color={vote === 1 ? "#059669" : colors.muted}
              />
            </View>
            <Text style={styles.count}>
              {Math.abs(votes) >= 1000
                ? new Intl.NumberFormat("en", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(votes)
                : votes}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            accessibilityLabel={saved ? "Unsave deal" : "Save deal"}
            accessibilityState={{
              selected: saved,
              disabled: mutation.isPending,
            }}
            disabled={mutation.isPending}
            onPress={() => act("saved", !saved)}
            style={styles.circle}
          >
            {saved ? (
              <BookmarkCheck size={14} color={colors.primary} />
            ) : (
              <Bookmark size={14} color={colors.muted} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            accessibilityLabel={inCart ? "Remove from cart" : "Add to cart"}
            accessibilityState={{ selected: inCart }}
            onPress={() => (inCart ? cart.remove(deal.id) : cart.add(deal))}
            style={styles.circle}
          >
            {inCart ? (
              <Check size={14} color="#059669" />
            ) : (
              <ShoppingCart size={14} color={colors.muted} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,.075)",
    overflow: "hidden",
    backgroundColor: "#fafbfc",
  },
  imageFrame: { position: "relative", backgroundColor: "#f4f4f5" },
  image: { width: "100%" },
  placeholder: {
    aspectRatio: 4 / 5,
    alignItems: "center",
    justifyContent: "center",
  },
  discount: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "white",
  },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9, gap: 5 },
  brand: {
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.4,
    fontWeight: "600",
    color: colors.muted,
  },
  title: { fontSize: 14, lineHeight: 18, fontWeight: "500" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,.045)",
    marginHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    flexWrap: "wrap",
  },
  price: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: "#059669" },
  original: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,.06)",
    backgroundColor: "#f4f4f5",
  },
  vote: { flexDirection: "row", alignItems: "center", gap: 3 },
  count: { fontSize: 11, color: colors.muted },
});

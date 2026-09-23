import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowRight, Clock, Tag } from "lucide-react-native";
import { api } from "../../lib/api";
import { formatPrice } from "../../components/DealCard";
import { Text } from "../../components/ui";
import { colors } from "../../theme";
interface HomeData {
  amazonDeals: Deal[];
  myntraDeals: Deal[];
}
export function FeaturedShowcases({ deals }: { deals: Deal[] }) {
  function select(items: Deal[]) {
    return [...items]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 30)
      .sort(
        (a, b) =>
          (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      )
      .slice(0, 4);
  }
  const featured = select(deals);
  const coupons = select(
    deals.filter((deal) =>
      /\b(coupons?|promo|voucher|cashback|deal\s*code)\b/i.test(
        [deal.title, deal.cleanTitle, deal.description]
          .filter(Boolean)
          .join(" "),
      ),
    ),
  );
  return (
    <View style={{ gap: 20 }}>
      {featured.length > 0 && (
        <FeatureRail
          key={"featured:" + featured.map((deal) => deal.id).join(",")}
          title="Best featured deals today"
          deals={featured}
        />
      )}
      {coupons.length > 0 && (
        <FeatureRail
          key={"coupons:" + coupons.map((deal) => deal.id).join(",")}
          title="Coupon-only deals"
          deals={coupons}
        />
      )}
    </View>
  );
}
function FeatureRail({ title, deals }: { title: string; deals: Deal[] }) {
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);
  async function visit(deal: Deal) {
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
    <View style={{ gap: 12 }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 18,
          lineHeight: 24,
          fontWeight: "600",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      <View
        style={styles.rail}
        onLayout={(event) =>
          setWidth(Math.max(1, event.nativeEvent.layout.width - 2))
        }
      >
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setActive(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {deals.map((deal) => (
            <View
              key={deal.id}
              style={{ width, height: 224, backgroundColor: "#442a42" }}
            >
              {deal.imageUrl && (
                <Image
                  source={{ uri: deal.imageUrl }}
                  style={{ position: "absolute", inset: 0 }}
                  resizeMode="cover"
                />
              )}
              <LinearGradient
                colors={["rgba(0,0,0,.12)", "rgba(0,0,0,.7)"]}
                style={{ position: "absolute", inset: 0 }}
              />
              <View
                style={{
                  flex: 1,
                  padding: 16,
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {deal.discountPercent != null && (
                    <View
                      style={[
                        styles.brandBadge,
                        { backgroundColor: "#10b981" },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {deal.discountPercent}% OFF
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.brandBadge,
                      { backgroundColor: "rgba(255,255,255,.85)" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.text }]}>
                      {deal.category?.name || "Deal"}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 5 }}>
                  <Text style={{ fontSize: 11, color: "#ddd" }}>
                    {new Date(deal.createdAt).toLocaleDateString()}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() =>
                      router.push({
                        pathname: "/deal/[id]",
                        params: { id: deal.id },
                      })
                    }
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 16,
                        lineHeight: 21,
                        fontWeight: "600",
                        color: "white",
                      }}
                    >
                      {deal.cleanTitle || deal.title}
                    </Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 18,
                      lineHeight: 23,
                      fontWeight: "700",
                      color: "#6ee7b7",
                    }}
                  >
                    {formatPrice(deal.dealPrice, deal.currency) ||
                      "Check latest price"}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="View deal at store"
                    onPress={() => void visit(deal)}
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 20,
                      backgroundColor: "white",
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        lineHeight: 19,
                        fontWeight: "500",
                      }}
                    >
                      View deal
                    </Text>
                    <ArrowRight size={15} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {deals.map((deal, index) => (
            <Pressable
              key={deal.id}
              accessibilityRole="button"
              accessibilityLabel={"Go to featured slide " + (index + 1)}
              accessibilityState={{ selected: active === index }}
              onPress={() => {
                scroll.current?.scrollTo({ x: index * width, animated: false });
                setActive(index);
              }}
              style={styles.dotTarget}
            >
              <View
                style={[
                  styles.dot,
                  active === index && {
                    width: 20,
                    backgroundColor: colors.text,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
export default function MerchantShowcases({ region }: { region: string }) {
  const query = useQuery({
    queryKey: ["home", region],
    queryFn: ({ signal }) =>
      api.request<HomeData>("/deals/home?region=" + region + "&limit=20", {
        signal,
        authenticated: false,
      }),
  });
  if (!query.data) return null;
  const amazonDeals = [
    ...new Map(query.data.amazonDeals.map((deal) => [deal.id, deal])).values(),
  ]
    .filter((deal) => {
      if (deal.store?.trim().toLowerCase().includes("amazon")) return true;
      try {
        const host = new URL(deal.productUrl).hostname.toLowerCase();
        return host.includes("amazon.") || host.includes("amzn.");
      } catch {
        return false;
      }
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 18)
    .sort(
      (a, b) =>
        (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, 6);
  return (
    <View style={{ gap: 18 }}>
      {amazonDeals.length > 0 && (
        <View style={{ gap: 14 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.4 }}
          >
            Best Amazon deals today
          </Text>
          <MerchantRail
            key={region + ":Amazon"}
            deals={amazonDeals}
            brand="Amazon"
          />
        </View>
      )}
      {query.data.myntraDeals.length > 0 && (
        <MerchantRail
          key={region + ":Myntra"}
          deals={[
            ...new Map(
              query.data.myntraDeals.map((deal) => [deal.id, deal]),
            ).values(),
          ]
            .sort(
              (a, b) =>
                (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
                Date.parse(b.createdAt) - Date.parse(a.createdAt),
            )
            .slice(0, 5)}
          brand="Myntra"
        />
      )}
    </View>
  );
}
function MerchantRail({
  deals,
  brand,
}: {
  deals: Deal[];
  brand: "Amazon" | "Myntra";
}) {
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const slides =
    brand === "Amazon"
      ? Array.from({ length: Math.ceil(deals.length / 2) }, (_, index) =>
          deals.slice(index * 2, index * 2 + 2),
        )
      : deals.map((deal) => [deal]);
  async function visit(deal: Deal) {
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
    <View
      style={styles.rail}
      onLayout={(event) =>
        setWidth(Math.max(1, event.nativeEvent.layout.width - 2))
      }
    >
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setActive(Math.round(event.nativeEvent.contentOffset.x / width))
        }
      >
        {slides.map((slide, index) => (
          <View key={slide[0].id} style={{ width, flexDirection: "row" }}>
            {slide.map((deal, itemIndex) => (
              <LinearGradient
                key={deal.id}
                colors={
                  brand === "Amazon"
                    ? ["#fff2ed", "#ffffff", "#fff5e8"]
                    : ["#fff1f8", "#fff9fc", "#fbeaf2"]
                }
                style={[
                  styles.panel,
                  brand === "Amazon"
                    ? {
                        width: width / 2,
                        borderRightWidth: itemIndex === 0 ? 1 : 0,
                        borderRightColor: colors.border,
                      }
                    : { width },
                ]}
              >
                {brand === "Myntra" && (
                  <Text style={styles.heroHeading}>Best Myntra deals</Text>
                )}
                <View style={styles.badges}>
                  {brand === "Amazon" && (
                    <>
                      <View style={styles.brandBadge}>
                        <Text style={styles.badgeText}>Amazon</Text>
                      </View>
                      {deal.discountPercent != null && (
                        <View
                          style={[
                            styles.brandBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {deal.discountPercent}% OFF
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                <View
                  style={
                    brand === "Myntra" ? styles.myntraBody : styles.amazonBody
                  }
                >
                  <View style={{ flex: 1, gap: 9 }}>
                    <View style={styles.date}>
                      <Clock size={12} color={colors.muted} />
                      <Text style={styles.dateText}>
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() =>
                        router.push({
                          pathname: "/deal/[id]",
                          params: { id: deal.id },
                        })
                      }
                    >
                      <Text
                        numberOfLines={brand === "Amazon" ? 3 : 4}
                        style={
                          brand === "Amazon"
                            ? styles.amazonTitle
                            : styles.myntraTitle
                        }
                      >
                        {deal.cleanTitle || deal.title}
                      </Text>
                    </Pressable>
                    <Text
                      style={[
                        styles.price,
                        brand === "Myntra" && { fontSize: 27, lineHeight: 30 },
                        !formatPrice(deal.dealPrice, deal.currency) && {
                          fontSize: 14,
                          lineHeight: 19,
                          fontWeight: "400",
                          color: colors.text,
                          maxWidth: 100,
                        },
                      ]}
                    >
                      {formatPrice(deal.dealPrice, deal.currency) ||
                        "Check latest price"}
                    </Text>
                    {deal.originalPrice &&
                      Number(deal.originalPrice) >
                        Number(deal.dealPrice ?? 0) && (
                        <Text style={styles.original}>
                          {formatPrice(deal.originalPrice, deal.currency)}
                        </Text>
                      )}
                    {brand === "Myntra" && (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel="View deal on Myntra"
                        onPress={() => void visit(deal)}
                        style={styles.cta}
                      >
                        <Text style={styles.ctaText}>View deal</Text>
                        <ArrowRight size={15} color="white" />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={"Open " + deal.title}
                    onPress={() =>
                      router.push({
                        pathname: "/deal/[id]",
                        params: { id: deal.id },
                      })
                    }
                    style={
                      brand === "Myntra"
                        ? styles.myntraImage
                        : styles.amazonImage
                    }
                  >
                    {deal.imageUrl ? (
                      <Image
                        source={{ uri: deal.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Tag size={42} color={colors.muted} />
                    )}
                  </Pressable>
                </View>
                {brand === "Amazon" && (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="View deal on Amazon"
                    onPress={() => void visit(deal)}
                    style={styles.cta}
                  >
                    <Text style={styles.ctaText}>View deal</Text>
                    <ArrowRight size={14} color="white" />
                  </Pressable>
                )}
              </LinearGradient>
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {slides.map((_, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={"Go to " + brand + " slide " + (index + 1)}
            accessibilityState={{ selected: index === active }}
            onPress={() => {
              scroll.current?.scrollTo({ x: index * width, animated: false });
              setActive(index);
            }}
            style={styles.dotTarget}
          >
            <View
              style={[
                styles.dot,
                index === active && { width: 20, backgroundColor: colors.text },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  rail: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "white",
  },
  panel: { padding: 12, minHeight: 322 },
  heroHeading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  badges: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  brandBadge: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    color: "white",
    fontWeight: "600",
  },
  amazonBody: { marginTop: 12, flex: 1 },
  myntraBody: { flexDirection: "row", gap: 12, flex: 1 },
  date: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 10, lineHeight: 15, color: colors.muted },
  amazonTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  myntraTitle: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  price: { fontSize: 20, lineHeight: 24, fontWeight: "700", color: "#059669" },
  original: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  amazonImage: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  myntraImage: {
    width: "43%",
    minHeight: 220,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fce7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    backgroundColor: colors.button,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    borderRadius: 24,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 8,
  },
  ctaText: { fontSize: 12, lineHeight: 18, fontWeight: "500", color: "white" },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dotTarget: {
    height: 24,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: "#d4d4d8" },
});

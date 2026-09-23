import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Medal,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Heading, PageBackButton, Text } from "../../components/ui";
import PageSurface from "../../components/PageSurface";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";

interface RankedUser {
  id?: string;
  userId: string;
  reputationScore: number;
  weeklyUpvotes: number;
  weeklyDeals: number;
  user: {
    id?: string;
    name: string | null;
    avatarUrl?: string | null;
  };
}

type LeaderboardTab = "hunters" | "value";

function RankIcon({ index }: { index: number }) {
  if (index === 0) return <Trophy size={20} color="#f59e0b" />;
  if (index === 1) return <Medal size={20} color="#94a3b8" />;
  if (index === 2) return <Award size={20} color="#b45309" />;
  return <Text style={styles.rankNumber}>{index + 1}</Text>;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<LeaderboardTab>("hunters");
  const query = useQuery({
    queryKey: ["leaderboard", 100],
    queryFn: ({ signal }) =>
      api.request<RankedUser[]>("/gamification/leaderboard?limit=100", {
        signal,
        authenticated: false,
      }),
    staleTime: 120_000,
  });
  const topHunters = query.data ?? [];
  const currentUserIndex = user
    ? topHunters.findIndex((entry) => entry.userId === user.id)
    : -1;
  const userRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;
  const data = tab === "hunters" ? topHunters : [];

  return (
    <PageSurface tone="settings">
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={(item) => item.id ?? item.userId}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ItemSeparatorComponent={() =>
          tab === "hunters" && data.length > 0 ? (
            <View style={styles.panelSeparator} />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <PageBackButton />
            <Heading
              icon={Trophy}
              tone="settings"
              badges={[
                `${topHunters.length} ranked hunters`,
                ...(userRank ? [`Your rank: #${userRank}`] : []),
              ]}
            >
              Leaderboard
            </Heading>
            <View style={styles.tabs}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "hunters" }}
                onPress={() => setTab("hunters")}
                style={[styles.tab, tab === "hunters" && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "hunters" && styles.activeTabText,
                  ]}
                >
                  Top Hunters
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === "value" }}
                onPress={() => setTab("value")}
                style={[styles.tab, tab === "value" && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "value" && styles.activeTabText,
                  ]}
                >
                  Best Value Finds
                </Text>
              </Pressable>
            </View>
            {tab === "hunters" ? (
              <View style={styles.panelHeading}>
                <Text style={styles.panelTitle}>Weekly Top Hunters</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          tab === "value" ? (
            <View style={styles.comingSoon}>
              <View style={styles.comingSoonIcon}>
                <Award size={24} color={colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonCopy}>
                We're crunching the numbers to find the absolute best value
                deals.
              </Text>
            </View>
          ) : query.isPending ? (
            <View style={styles.panelEmptyRow}>
              <View style={styles.stateCard}>
                <ActivityIndicator color={colors.text} />
              </View>
            </View>
          ) : query.isError ? (
            <View style={styles.panelEmptyRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void query.refetch()}
                style={styles.stateCard}
              >
                <Text accessibilityRole="alert" style={styles.stateCopy}>
                  We couldn't load the leaderboard. Tap to try again.
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.panelEmptyRow}>
              <View style={styles.stateCard}>
                <Text style={styles.stateCopy}>
                  No rankings yet this week. Start posting deals!
                </Text>
              </View>
            </View>
          )
        }
        ListFooterComponent={
          tab === "hunters" && user && userRank && userRank > 10 ? (
            <View style={styles.yourRank}>
              <View style={styles.yourRankNumber}>
                <Text style={styles.yourRankNumberText}>#{userRank}</Text>
              </View>
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.smallAvatar}
                />
              ) : (
                <View style={styles.smallAvatarFallback}>
                  <Text style={styles.avatarInitial}>You</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.yourRankTitle}>You are climbing</Text>
                <Text style={styles.yourRankCopy}>
                  Current weekly rank: #{userRank}
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.panelRow,
              index === data.length - 1 && styles.panelLastRow,
            ]}
          >
            <View
              style={[
                styles.rankCard,
                index === 0
                  ? styles.first
                  : index === 1
                    ? styles.second
                    : index === 2
                      ? styles.third
                      : undefined,
              ]}
            >
              <View style={styles.rankChip}>
                <RankIcon index={index} />
              </View>
              {item.user.avatarUrl ? (
                <Image
                  accessibilityLabel={`${item.user.name ?? "Anonymous User"} avatar`}
                  source={{ uri: item.user.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <UserRound size={17} color={colors.muted} />
                </View>
              )}
              <View style={styles.details}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.user.name ?? "Anonymous User"}
                </Text>
                <View style={styles.metrics}>
                  <View style={styles.metricPill}>
                    <TrendingUp size={12} color="#52525b" />
                    <Text style={styles.metricText}>
                      {item.weeklyUpvotes} upvotes
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricText}>
                      {item.weeklyDeals} deals
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.points}>
                <Text
                  accessibilityLabel={`${item.reputationScore} reputation points`}
                  style={styles.pointsValue}
                >
                  {item.reputationScore}
                </Text>
                <Text style={styles.pointsLabel}>POINTS</Text>
              </View>
            </View>
          </View>
        )}
      />
    </PageSurface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: { gap: 16 },
  tabs: {
    marginTop: 4,
    minHeight: 48,
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  activeTab: { backgroundColor: colors.text },
  tabText: { color: "#52525b", fontSize: 13, fontWeight: "500" },
  activeTabText: { color: colors.surface },
  panelHeading: {
    marginTop: 0,
    paddingHorizontal: 16,
    paddingTop: 19,
    paddingBottom: 9,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  panelTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.36,
  },
  panelRow: {
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  panelLastRow: {
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  panelSeparator: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  panelEmptyRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  rankCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  first: { borderColor: "#fde68a", backgroundColor: "#fffbeb" },
  second: { borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  third: { borderColor: "#fef3c7", backgroundColor: "#fff7ed" },
  rankChip: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  rankNumber: { width: 24, textAlign: "center", fontWeight: "700" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.78)",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "#f4f4f5",
  },
  details: { flex: 1, minWidth: 0, gap: 5 },
  name: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.15,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metricPill: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  metricText: {
    color: "#52525b",
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
  points: { flexShrink: 0, alignItems: "flex-end" },
  pointsValue: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.69,
  },
  pointsLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  stateCard: {
    minHeight: 142,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.72)",
    boxShadow: "0 24px 48px -30px rgba(15,23,42,0.32)",
  },
  stateCopy: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  comingSoon: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 44,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  comingSoonIcon: {
    width: 56,
    height: 56,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  comingSoonTitle: { fontSize: 20, fontWeight: "600", letterSpacing: -0.4 },
  comingSoonCopy: {
    marginTop: 8,
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },
  yourRank: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  yourRankNumber: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  yourRankNumberText: { fontSize: 14, fontWeight: "700" },
  smallAvatar: { width: 36, height: 36, borderRadius: 18 },
  smallAvatarFallback: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f4f4f5",
  },
  avatarInitial: { fontSize: 11, fontWeight: "600" },
  yourRankTitle: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  yourRankCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});

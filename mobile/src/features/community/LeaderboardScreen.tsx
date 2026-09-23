import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../lib/api";

interface RankedUser {
  userId: string;
  reputationScore: number;
  weeklyUpvotes: number;
  weeklyDeals: number;
  user: { name: string | null };
}

export default function LeaderboardScreen() {
  const query = useQuery({
    queryKey: ["leaderboard"],
    queryFn: ({ signal }) =>
      api.request<RankedUser[]>("/gamification/leaderboard", {
        signal,
        authenticated: false,
      }),
    staleTime: 120_000,
  });

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={query.data ?? []}
      keyExtractor={(item) => item.userId}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      ListHeaderComponent={
        <Text accessibilityRole="header" style={styles.title}>
          Leaderboard
        </Text>
      }
      ListEmptyComponent={
        query.isPending ? (
          <ActivityIndicator />
        ) : (
          <Text>
            {query.isError
              ? "Could not load the leaderboard. Pull down to retry."
              : "No rankings yet."}
          </Text>
        )
      }
      renderItem={({ item, index }) => (
        <View style={styles.card}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.details}>
            <Text style={styles.name}>
              {item.user.name ?? "Community member"}
            </Text>
            <Text style={styles.muted}>
              {item.weeklyDeals} deals · {item.weeklyUpvotes} upvotes this week
            </Text>
          </View>
          <Text
            accessibilityLabel={`${item.reputationScore} reputation points`}
            style={styles.name}
          >
            {item.reputationScore}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffafb" },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    color: "#171717",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "white",
    borderColor: "#ece7e9",
    borderWidth: 1,
  },
  rank: { minWidth: 24, fontSize: 20, fontWeight: "700", color: "#c90020" },
  details: { flex: 1, gap: 4 },
  name: { fontWeight: "600", color: "#171717", fontSize: 16 },
  muted: { color: "#66616a", fontSize: 13 },
});

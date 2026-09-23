import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import {
  ArrowUp,
  Award,
  Bookmark,
  CalendarDays,
  Check,
  Flag,
  MessageSquare,
  Send,
  User,
} from "lucide-react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import {
  Card,
  ErrorState,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import { colors } from "../../theme";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}
interface EarnedBadge {
  id: string;
  earnedAt: string;
  badge: Badge;
}
interface Challenge {
  id: string;
  title: string;
  description: string;
  endDate: string;
}
interface Stats {
  savedDeals: number;
  submittedDeals: number;
  comments: number;
  totalUpvotesReceived: number;
}
export default function ProfileScreen() {
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: ["stats", user?.id],
    enabled: !!user,
    queryFn: ({ signal }) => api.request<Stats>("/users/me/stats", { signal }),
  });
  const earned = useQuery({
    queryKey: ["earned-badges", user?.id],
    enabled: !!user,
    queryFn: ({ signal }) =>
      api.request<EarnedBadge[]>(`/gamification/users/${user?.id}/badges`, {
        signal,
      }),
  });
  const badges = useQuery({
    queryKey: ["badges"],
    queryFn: ({ signal }) =>
      api.request<Badge[]>("/gamification/badges", {
        signal,
        authenticated: false,
      }),
  });
  const challenges = useQuery({
    queryKey: ["challenges"],
    queryFn: ({ signal }) =>
      api.request<Challenge[]>("/gamification/challenges", {
        signal,
        authenticated: false,
      }),
  });
  return (
    <Screen>
      <PageBackButton />
      <Heading icon={User}>{user?.name || "Community achievements"}</Heading>
      {user ? (
        <Card>
          <View style={styles.profile}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <User size={28} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.profileName}>
                {user.name || "Anonymous User"}
              </Text>
              <Text numberOfLines={1} style={styles.description}>
                {user.email}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
      {user && (
        <Card>
          <Text accessibilityRole="header" style={{ fontWeight: "700" }}>
            Your activity
          </Text>
          {stats.isPending ? (
            <ActivityIndicator />
          ) : stats.data ? (
            <View style={styles.stats}>
              {[
                {
                  icon: Bookmark,
                  count: stats.data.savedDeals,
                  label: "Saved deals",
                },
                {
                  icon: Send,
                  count: stats.data.submittedDeals,
                  label: "Submitted deals",
                },
                {
                  icon: MessageSquare,
                  count: stats.data.comments,
                  label: "Comments",
                },
                {
                  icon: ArrowUp,
                  count: stats.data.totalUpvotesReceived,
                  label: "Upvotes received",
                },
              ].map(({ icon: Icon, count, label }) => (
                <View key={label} style={styles.stat}>
                  <Icon size={18} color={colors.primary} />
                  <Text style={styles.statValue}>{count}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <ErrorState retry={() => void stats.refetch()} />
          )}
        </Card>
      )}
      <View style={styles.sectionTitle}>
        <Award size={20} color={colors.primary} />
        <Text accessibilityRole="header" style={styles.sectionText}>
          Badges
        </Text>
      </View>
      {badges.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {badges.isError && <ErrorState retry={() => void badges.refetch()} />}
      {user && earned.isError ? (
        <ErrorState
          message="Could not load your earned badges."
          retry={() => void earned.refetch()}
        />
      ) : null}
      {badges.data?.map((badge) => (
        <Card key={badge.id}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeIcon}>
              <Text style={{ fontSize: 28, lineHeight: 36 }}>{badge.icon}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "600" }}>{badge.name}</Text>
              <Text style={styles.tier}>{badge.tier}</Text>
            </View>
            {earned.data?.some((item) => item.badge.id === badge.id) ? (
              <View style={styles.earned}>
                <Check size={12} color="#047857" />
                <Text style={styles.earnedText}>Earned</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.description}>{badge.description}</Text>
        </Card>
      ))}
      <View style={styles.sectionTitle}>
        <Flag size={20} color={colors.primary} />
        <Text accessibilityRole="header" style={styles.sectionText}>
          Challenges
        </Text>
      </View>
      {challenges.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}
      {challenges.isError && (
        <ErrorState retry={() => void challenges.refetch()} />
      )}
      {challenges.data?.map((challenge) => (
        <Card key={challenge.id}>
          <Text style={{ fontWeight: "700" }}>{challenge.title}</Text>
          <Text style={styles.description}>{challenge.description}</Text>
          <View style={styles.deadline}>
            <CalendarDays size={14} color={colors.muted} />
            <Text style={styles.description}>
              Ends {new Date(challenge.endDate).toLocaleDateString()}
            </Text>
          </View>
        </Card>
      ))}
      {challenges.data?.length === 0 && (
        <Card>
          <Text style={styles.description}>No active challenges.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 18, fontWeight: "600" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    flexBasis: "45%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  statValue: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
  statLabel: { fontSize: 12, lineHeight: 18, color: colors.muted },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionText: { fontSize: 18, fontWeight: "600" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  tier: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textTransform: "capitalize",
  },
  earned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  earnedText: { fontSize: 11, lineHeight: 16, color: "#047857" },
  deadline: { flexDirection: "row", alignItems: "center", gap: 6 },
});

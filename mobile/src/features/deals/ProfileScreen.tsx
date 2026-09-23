import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator } from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { Card, ErrorState, Heading, Screen, Text } from "../../components/ui";

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
      <Heading>{user?.name || "Community achievements"}</Heading>
      {user && (
        <Card>
          <Text accessibilityRole="header" style={{ fontWeight: "700" }}>
            Your activity
          </Text>
          {stats.isPending ? (
            <ActivityIndicator />
          ) : stats.data ? (
            <>
              <Text>{stats.data.savedDeals} saved deals</Text>
              <Text>{stats.data.submittedDeals} submitted deals</Text>
              <Text>{stats.data.comments} comments</Text>
              <Text>{stats.data.totalUpvotesReceived} upvotes received</Text>
            </>
          ) : (
            <ErrorState retry={() => void stats.refetch()} />
          )}
        </Card>
      )}
      <Text
        accessibilityRole="header"
        style={{ fontSize: 22, fontWeight: "700" }}
      >
        Badges
      </Text>
      {badges.isError && <ErrorState retry={() => void badges.refetch()} />}{" "}
      {badges.data?.map((badge) => (
        <Card key={badge.id}>
          <Text style={{ fontWeight: "700" }}>
            {badge.icon} {badge.name}
            {earned.data?.some((item) => item.badge.id === badge.id)
              ? " · Earned"
              : ""}
          </Text>
          <Text>{badge.description}</Text>
          <Text>{badge.tier}</Text>
        </Card>
      ))}
      <Text
        accessibilityRole="header"
        style={{ fontSize: 22, fontWeight: "700" }}
      >
        Challenges
      </Text>
      {challenges.isError && (
        <ErrorState retry={() => void challenges.refetch()} />
      )}{" "}
      {challenges.data?.map((challenge) => (
        <Card key={challenge.id}>
          <Text style={{ fontWeight: "700" }}>{challenge.title}</Text>
          <Text>{challenge.description}</Text>
          <Text>Ends {new Date(challenge.endDate).toLocaleDateString()}</Text>
        </Card>
      ))}
      {challenges.data?.length === 0 && <Text>No active challenges.</Text>}
    </Screen>
  );
}

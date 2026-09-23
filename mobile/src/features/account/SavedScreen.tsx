import { useInfiniteQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  View,
} from "react-native";
import { router } from "expo-router";
import { Bookmark, BookmarkX, Send } from "lucide-react-native";
import DealCard from "../../components/DealCard";
import {
  Button,
  Card,
  ErrorState,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";

export default function SavedScreen({
  submitted = false,
}: {
  submitted?: boolean;
}) {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: [submitted ? "submitted" : "saved", user?.id],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Deal>(
        `/users/me/${submitted ? "submitted" : "saved"}?page=${pageParam}&limit=20`,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const deals = query.data?.pages.flatMap((page) => page.data) ?? [];
  if (!user)
    return (
      <Screen>
        <PageBackButton />
        <Card>
          <View style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}>
            <BookmarkX size={64} color={colors.muted} />
            <Text style={{ fontSize: 24, fontWeight: "700" }}>
              Sign in Required
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Sign in to view your {submitted ? "submitted" : "saved"} deals.
            </Text>
            <Button
              title="Sign in"
              onPress={() => router.push("/(tabs)/settings")}
            />
          </View>
        </Card>
      </Screen>
    );
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 20,
        gap: 16,
        paddingBottom: 40,
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
        />
      }
      scrollEventThrottle={100}
      onScroll={({ nativeEvent }) => {
        if (
          nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 400 &&
          query.hasNextPage &&
          !query.isFetching
        )
          void query.fetchNextPage();
      }}
    >
      <View style={{ gap: 16 }}>
        <PageBackButton />
        <Heading
          icon={submitted ? Send : Bookmark}
          badges={
            submitted
              ? undefined
              : [
                  `${query.data?.pages[0]?.pagination.total ?? 0} saved`,
                  "Quick revisit list",
                ]
          }
        >
          {submitted ? "My submissions" : "Saved Deals"}
        </Heading>
        {query.data?.pages[0]?.data.length ? (
          <Text style={{ fontSize: 14, fontWeight: "500" }}>
            {submitted ? "Your submissions" : "Your shortlist"}
          </Text>
        ) : null}
        {query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : null}
      </View>
      {!deals.length &&
        (query.isPending ? (
          <ActivityIndicator />
        ) : !query.isError ? (
          <Card>
            <View
              style={{ alignItems: "center", gap: 16, paddingVertical: 36 }}
            >
              <Bookmark size={64} color={colors.muted} />
              <Text
                style={{ fontSize: 20, fontWeight: "600", textAlign: "center" }}
              >
                {submitted
                  ? "You haven't submitted a deal yet."
                  : "No saved deals yet"}
              </Text>
              {!submitted ? (
                <Text style={{ color: colors.muted, textAlign: "center" }}>
                  Start saving deals by tapping the bookmark icon on any deal
                </Text>
              ) : null}
              <Button
                title={submitted ? "Submit a Deal" : "Browse Deals"}
                onPress={() => router.push(submitted ? "/submit" : "/(tabs)")}
              />
            </View>
          </Card>
        ) : null)}
      {!!deals.length && (
        <View
          style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}
        >
          {[0, 1].map((column) => (
            <View key={column} style={{ flex: 1, gap: 16 }}>
              {deals
                .filter((_, index) => index % 2 === column)
                .map((deal) => (
                  <View
                    key={deal.id}
                    style={{
                      padding: 6,
                      borderRadius: 28,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.3)",
                      backgroundColor: "rgba(255,255,255,0.18)",
                    }}
                  >
                    <DealCard deal={deal} />
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}
      {query.isFetchingNextPage ? <ActivityIndicator /> : null}
    </ScrollView>
  );
}

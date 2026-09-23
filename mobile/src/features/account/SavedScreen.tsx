import { useInfiniteQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import { FlatList, ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import DealCard from "../../components/DealCard";
import { Button, ErrorState, Heading, Screen, Text } from "../../components/ui";
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
  if (!user)
    return (
      <Screen>
        <Heading>{submitted ? "My submissions" : "Saved Deals"}</Heading>
        <Text>Sign in to see your deals.</Text>
        <Button
          title="Sign in"
          onPress={() => router.push("/(tabs)/settings")}
        />
      </Screen>
    );
  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      data={query.data?.pages.flatMap((page) => page.data) ?? []}
      keyExtractor={(deal) => deal.id}
      renderItem={({ item }) => <DealCard deal={item} />}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <Heading>{submitted ? "My submissions" : "Saved Deals"}</Heading>
          {query.isError ? (
            <ErrorState retry={() => void query.refetch()} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        query.isPending ? (
          <ActivityIndicator />
        ) : !query.isError ? (
          <Text>
            {submitted
              ? "You haven't submitted a deal yet."
              : "No saved deals yet."}
          </Text>
        ) : null
      }
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      }}
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator /> : null
      }
    />
  );
}

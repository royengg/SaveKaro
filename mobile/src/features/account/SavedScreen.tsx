import { useInfiniteQuery } from "@tanstack/react-query";
import type { Deal } from "@savekaro/contracts";
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Bookmark, BookmarkX, Send } from "lucide-react-native";
import DealCard from "../../components/DealCard";
import PageSurface from "../../components/PageSurface";
import SiteFooter from "../../components/SiteFooter";
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
  const { height } = useWindowDimensions();
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
  const showSiteFooter = query.isSuccess && !query.hasNextPage;
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
    <PageSurface>
      <ScrollView
        style={{ flex: 1 }}
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
            nativeEvent.layoutMeasurement.height +
              nativeEvent.contentOffset.y >=
              nativeEvent.contentSize.height - 400 &&
            query.hasNextPage &&
            !query.isFetching
          )
            void query.fetchNextPage();
        }}
      >
        <View
          style={{
            minHeight: showSiteFooter ? height - 84 : undefined,
            gap: 16,
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
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>
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
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 24,
                  paddingVertical: 56,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.68)",
                  backgroundColor: "rgba(255,255,255,0.82)",
                  boxShadow: "0 24px 48px -30px rgba(15,23,42,0.32)",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Bookmark
                    size={64}
                    color={colors.muted}
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    style={{
                      fontSize: 20,
                      lineHeight: 28,
                      fontWeight: "600",
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {submitted
                      ? "You haven't submitted a deal yet."
                      : "No saved deals yet"}
                  </Text>
                  {!submitted ? (
                    <Text
                      style={{
                        color: colors.muted,
                        textAlign: "center",
                        marginBottom: 24,
                      }}
                    >
                      Start saving deals by clicking the bookmark icon on any
                      deal
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(submitted ? "/submit" : "/(tabs)")
                    }
                    style={{
                      minHeight: 40,
                      paddingHorizontal: 16,
                      borderRadius: 24,
                      backgroundColor: colors.button,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      }}
                    >
                      <ArrowLeft size={14} color="white" />
                    </View>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      {submitted ? "Submit a Deal" : "Browse Deals"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null)}
          {!!deals.length && (
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                alignItems: "flex-start",
              }}
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
                        <DealCard
                          deal={submitted ? deal : { ...deal, userSaved: true }}
                        />
                      </View>
                    ))}
                </View>
              ))}
            </View>
          )}
          {query.isFetchingNextPage ? <ActivityIndicator /> : null}
        </View>
        {showSiteFooter ? <SiteFooter /> : null}
      </ScrollView>
    </PageSurface>
  );
}

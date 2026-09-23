import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

interface InboxItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data: { dealId?: string } | null;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ["notifications", user?.id];
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: !!user,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<InboxItem>(`/notifications?page=${pageParam}&limit=20`, {
        signal,
      }),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const update = useMutation({
    mutationFn: ({
      path,
      method,
    }: {
      path: string;
      method: "PUT" | "DELETE";
    }) => api.request(path, { method }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: (error) =>
      Alert.alert("Could not update notifications", error.message),
  });
  if (!user)
    return (
      <View style={styles.content}>
        <Text>Sign in from Settings to view your notifications.</Text>
      </View>
    );

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Notifications
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={update.isPending}
            onPress={() =>
              update.mutate({ path: "/notifications/read-all", method: "PUT" })
            }
          >
            <Text style={styles.action}>Mark all read</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={update.isPending}
            onPress={() =>
              Alert.alert(
                "Clear read notifications?",
                "This removes notifications you have already read.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: () =>
                      update.mutate({
                        path: "/notifications",
                        method: "DELETE",
                      }),
                  },
                ],
              )
            }
          >
            <Text style={styles.action}>Clear read</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        query.isPending ? (
          <ActivityIndicator />
        ) : (
          <Text>
            {query.isError
              ? "Could not load notifications. Pull down to retry."
              : "You're all caught up."}
          </Text>
        )
      }
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator /> : null
      }
      renderItem={({ item }) => (
        <View style={[styles.card, !item.isRead && styles.unread]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!item.isRead)
                update.mutate({
                  path: `/notifications/${item.id}/read`,
                  method: "PUT",
                });
              if (item.data?.dealId)
                router.push({
                  pathname: "/deal/[id]",
                  params: { id: item.data.dealId },
                });
            }}
          >
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete notification: ${item.title}`}
            disabled={update.isPending}
            onPress={() =>
              Alert.alert("Delete notification?", undefined, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () =>
                    update.mutate({
                      path: `/notifications/${item.id}`,
                      method: "DELETE",
                    }),
                },
              ])
            }
          >
            <Text style={styles.action}>Delete</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffafb" },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#171717" },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "white",
    borderColor: "#ece7e9",
    borderWidth: 1,
  },
  unread: { borderColor: "#e60023", backgroundColor: "#fff1f5" },
  name: { fontWeight: "600", color: "#171717", fontSize: 17 },
  message: { color: "#45414a", marginTop: 6, lineHeight: 21 },
  date: { color: "#66616a", marginTop: 8, fontSize: 12 },
  action: { color: "#bb001e", fontWeight: "600", paddingVertical: 12 },
});

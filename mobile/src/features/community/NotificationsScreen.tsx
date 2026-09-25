import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowUp,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  MessageCircle,
  Tag,
  TrendingDown,
  type LucideIcon,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Button,
  Card,
  Heading,
  PageBackButton,
  Screen,
  Text,
} from "../../components/ui";
import PageSurface from "../../components/PageSurface";
import SiteFooter, {
  SITE_FOOTER_STAGE_HEIGHT,
} from "../../components/SiteFooter";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";

type NotificationType =
  | "NEW_DEAL"
  | "PRICE_DROP"
  | "PRICE_ALERT"
  | "COMMENT_REPLY"
  | "DEAL_UPVOTED"
  | "SYSTEM";

interface InboxItem {
  id: string;
  type?: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data: { dealId?: string } | null;
}

const ICONS: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  NEW_DEAL: { icon: Tag, color: "#10b981" },
  PRICE_DROP: { icon: TrendingDown, color: "#ef4444" },
  PRICE_ALERT: { icon: TrendingDown, color: "#ef4444" },
  COMMENT_REPLY: { icon: MessageCircle, color: "#3b82f6" },
  DEAL_UPVOTED: { icon: ArrowUp, color: "#f97316" },
  SYSTEM: { icon: Info, color: colors.muted },
};

function formatTimeAgo(value: string): string {
  const timestamp = new Date(value).getTime();
  const elapsed = Date.now() - timestamp;
  if (!Number.isFinite(timestamp) || elapsed < 0) {
    return new Date(value).toLocaleDateString();
  }
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function NotificationSkeletons() {
  return (
    <View
      accessible
      accessibilityLabel="Loading notifications"
      style={styles.skeletonList}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={[styles.skeleton, styles.skeletonIcon]} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeleton, styles.skeletonTitle]} />
            <View style={[styles.skeleton, styles.skeletonMessage]} />
            <View style={[styles.skeleton, styles.skeletonPill]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { height } = useWindowDimensions();
  const client = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const baseKey = ["notifications", user?.id] as const;
  const query = useInfiniteQuery({
    queryKey: [...baseKey, showUnreadOnly],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<InboxItem>(
        `/notifications?page=${pageParam}&limit=20${showUnreadOnly ? "&unread=true" : ""}`,
        { signal },
      ),
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
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: baseKey });
      void client.invalidateQueries({
        queryKey: ["unread-notification-count"],
      });
    },
    onError: (error) =>
      Alert.alert("Could not update notifications", error.message),
  });

  if (!user) {
    return (
      <Screen tone="notifications">
        <PageBackButton />
        <Card>
          <View style={styles.signedOut}>
            <BellOff size={64} color={colors.muted} strokeWidth={1.6} />
            <Text style={styles.signedOutTitle}>Sign in Required</Text>
            <Text style={styles.signedOutCopy}>
              Sign in to view your notifications.
            </Text>
            <Button
              title="Sign in"
              onPress={() => router.push("/(tabs)/settings")}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const pages = query.data?.pages;
  const items = pages?.flatMap((page) => page.data) ?? [];
  const total = pages?.[0]?.pagination.total ?? items.length;
  const unreadCount =
    pages?.[0]?.unreadCount ?? items.filter((item) => !item.isRead).length;

  const markRead = (id: string) =>
    update.mutate({ path: `/notifications/${id}/read`, method: "PUT" });
  const openNotification = (item: InboxItem) => {
    if (!item.isRead) markRead(item.id);
    if (item.data?.dealId) {
      router.push({
        pathname: "/deal/[id]",
        params: { id: item.data.dealId },
      });
    }
  };

  const headerAction =
    unreadCount > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mark all notifications as read"
        disabled={update.isPending}
        onPress={() =>
          update.mutate({ path: "/notifications/read-all", method: "PUT" })
        }
        style={[styles.markAll, update.isPending && styles.disabled]}
      >
        <CheckCheck size={15} color={colors.surface} />
        <Text style={styles.markAllText}>Mark all read</Text>
      </Pressable>
    ) : (
      <View style={styles.caughtUp}>
        <CheckCheck size={14} color="#059669" />
        <Text style={styles.caughtUpText}>All caught up</Text>
      </View>
    );

  return (
    <PageSurface tone="notifications">
      <FlatList
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { minHeight: height + SITE_FOOTER_STAGE_HEIGHT },
        ]}
        ListFooterComponentStyle={{ marginTop: "auto" }}
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageBackButton />
            <Heading
              icon={Bell}
              iconColor={colors.text}
              tone="notifications"
              badges={[`${total} total`, `${unreadCount} unread`]}
              action={headerAction}
            >
              Notifications
            </Heading>
            <View style={styles.filterRow}>
              <View style={styles.segmented}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: !showUnreadOnly }}
                  onPress={() => setShowUnreadOnly(false)}
                  style={[
                    styles.segment,
                    !showUnreadOnly && styles.activeSegment,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !showUnreadOnly && styles.activeSegmentText,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: showUnreadOnly }}
                  onPress={() => setShowUnreadOnly(true)}
                  style={[
                    styles.segment,
                    showUnreadOnly && styles.activeSegment,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      showUnreadOnly && styles.activeSegmentText,
                    ]}
                  >
                    Unread ({unreadCount})
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <NotificationSkeletons />
          ) : query.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void query.refetch()}
              style={styles.emptyCard}
            >
              <Bell size={54} color={colors.muted} />
              <Text style={styles.emptyTitle}>
                Could not load notifications
              </Text>
              <Text style={styles.emptyCopy}>Tap to retry.</Text>
            </Pressable>
          ) : (
            <View style={styles.emptyCard}>
              <Bell size={64} color={colors.muted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyCopy}>
                {showUnreadOnly
                  ? "You've read all your notifications"
                  : "You don't have any notifications yet"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View>
            {query.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null}
            <SiteFooter />
          </View>
        }
        renderItem={({ item }) => {
          const iconConfig = ICONS[item.type ?? "SYSTEM"];
          const Icon = iconConfig.icon;
          return (
            <View style={styles.notification}>
              <View style={styles.notificationRow}>
                <View style={styles.iconChip}>
                  <Icon size={20} color={iconConfig.color} />
                </View>
                <View style={styles.notificationBody}>
                  <View style={styles.notificationTop}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openNotification(item)}
                      style={styles.notificationCopy}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.notificationTitle,
                          !item.isRead && styles.unreadTitle,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text numberOfLines={2} style={styles.message}>
                        {item.message}
                      </Text>
                    </Pressable>
                    {!item.isRead ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${item.title} as read`}
                        disabled={update.isPending}
                        onPress={() => markRead(item.id)}
                        hitSlop={5}
                        style={styles.iconAction}
                      >
                        <Check size={16} color="#3f3f46" />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.notificationActions}>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaText}>
                        {formatTimeAgo(item.createdAt)}
                      </Text>
                    </View>
                    {item.data?.dealId ? (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => openNotification(item)}
                        style={styles.metaPill}
                      >
                        <Text style={styles.linkText}>View deal</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
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
  header: { gap: 16, marginBottom: 16 },
  signedOut: { alignItems: "center", gap: 14, paddingVertical: 24 },
  signedOutTitle: { fontSize: 24, fontWeight: "700" },
  signedOutCopy: { color: colors.muted, textAlign: "center" },
  markAll: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  markAllText: {
    color: colors.surface,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  caughtUp: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  caughtUpText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  filterRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  segment: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 999,
  },
  activeSegment: { backgroundColor: colors.text },
  segmentText: { color: "#52525b", fontSize: 13, fontWeight: "500" },
  activeSegmentText: { color: colors.surface },
  skeletonList: { gap: 12 },
  skeletonCard: {
    minHeight: 132,
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  skeleton: { backgroundColor: "#e4e4e7" },
  skeletonIcon: { width: 44, height: 44, borderRadius: 18 },
  skeletonBody: { flex: 1, minWidth: 0, gap: 10 },
  skeletonTitle: { width: "75%", height: 16, borderRadius: 8 },
  skeletonMessage: { width: "50%", height: 12, borderRadius: 6 },
  skeletonPill: {
    width: 96,
    height: 32,
    marginTop: 2,
    borderRadius: 16,
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 58,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    backgroundColor: "rgba(255,255,255,0.72)",
    boxShadow: "0 24px 48px -30px rgba(15,23,42,0.32)",
  },
  emptyTitle: { marginTop: 8, fontSize: 20, fontWeight: "600" },
  emptyCopy: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  notification: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  notificationRow: { flexDirection: "row", gap: 14 },
  iconChip: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: -0.15,
  },
  unreadTitle: { fontWeight: "600" },
  message: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 20 },
  iconAction: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  notificationActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metaPill: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  metaText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  linkText: { color: "#3f3f46", fontSize: 12, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  footerLoader: { marginTop: 18 },
});

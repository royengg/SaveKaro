import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Tag,
  TrendingDown,
  MessageCircle,
  ArrowUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import api from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/Header";

interface Notification {
  id: string;
  type: "NEW_DEAL" | "PRICE_DROP" | "COMMENT_REPLY" | "DEAL_UPVOTED" | "SYSTEM";
  title: string;
  message: string;
  data?: { dealId?: string };
  isRead: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "NEW_DEAL":
      return <Tag className="h-5 w-5 text-emerald-500" />;
    case "PRICE_DROP":
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case "COMMENT_REPLY":
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case "DEAL_UPVOTED":
      return <ArrowUp className="h-5 w-5 text-orange-500" />;
    case "SYSTEM":
      return <Info className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
};

export default function Notifications() {
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const { data: notificationsData, isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const notifications = (notificationsData?.data as Notification[]) || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_26%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="surface-liquid-glass rounded-[28px] p-8">
            <BellOff className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h1 className="mb-4 text-2xl font-bold">Sign in Required</h1>
            <p className="mb-6 text-muted-foreground">
              Sign in to view your notifications.
            </p>
          </div>
          <Link to="/" onClick={resetFilters}>
            <Button className="mt-4 h-10 rounded-full px-4 text-[15px] font-semibold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_26%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-5 pb-24 md:pb-10">
        <Link
          to="/"
          className="surface-liquid-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.98]"
          onClick={resetFilters}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Deals
        </Link>

        <section className="surface-liquid-glass mt-4 rounded-[30px] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-[1.85rem] font-bold tracking-[-0.03em] text-foreground">
                  Notifications
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Fresh deal signals, price movement, replies, and community
                  activity in one quieter stream.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    {notifications.length} total
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    {unreadCount} unread
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {unreadCount > 0 ? (
                <Button
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-10 rounded-full bg-foreground px-4 text-[14px] font-semibold text-background shadow-[0_18px_32px_-24px_rgba(15,23,42,0.42)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-[1px] hover:bg-foreground/92 active:scale-[0.985]"
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all read
                </Button>
              ) : (
                <span className="surface-liquid-chip inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground">
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  All caught up
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="surface-liquid-chip inline-flex rounded-full p-1">
            <button
              type="button"
              onClick={() => setShowUnreadOnly(false)}
              className={cn(
                "min-h-9 rounded-full px-4 text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.98]",
                !showUnreadOnly
                  ? "bg-foreground text-background shadow-[0_14px_24px_-22px_rgba(15,23,42,0.32)]"
                  : "text-foreground/70 hover:bg-white/70 hover:text-foreground",
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setShowUnreadOnly(true)}
              className={cn(
                "min-h-9 rounded-full px-4 text-[13px] font-medium transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.98]",
                showUnreadOnly
                  ? "bg-foreground text-background shadow-[0_14px_24px_-22px_rgba(15,23,42,0.32)]"
                  : "text-foreground/70 hover:bg-white/70 hover:text-foreground",
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <p className="text-[13px] text-muted-foreground">
            {showUnreadOnly
              ? "Only unread activity is visible."
              : "Showing your full notification history."}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="surface-liquid-subtle rounded-[24px] p-4"
              >
                <div className="flex gap-4">
                  <Skeleton className="h-11 w-11 rounded-[18px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="surface-liquid-glass mt-4 rounded-[28px] px-6 py-14 text-center">
            <Bell className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No notifications</h2>
            <p className="text-muted-foreground">
              {showUnreadOnly
                ? "You've read all your notifications"
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "surface-liquid-subtle group rounded-[24px] p-4 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-[1px]",
                  !notification.isRead
                    ? "border-rose-200/70 bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,241,242,0.78))]"
                    : "border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.6))]",
                )}
              >
                <div className="flex gap-4">
                  <div className="surface-liquid-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          className={cn(
                            "line-clamp-1 text-[15px] font-medium tracking-[-0.01em]",
                            !notification.isRead && "font-semibold",
                          )}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>

                      {!notification.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="surface-liquid-chip h-9 w-9 rounded-full text-foreground/70 transition-[transform,color] duration-200 hover:text-foreground active:scale-[0.98]"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-muted-foreground">
                        {formatTimeAgo(notification.createdAt)}
                      </span>

                      {notification.data?.dealId ? (
                        <Link
                          to={`/deal/${notification.data.dealId}`}
                          className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold text-foreground/80 transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground"
                        >
                          View deal
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

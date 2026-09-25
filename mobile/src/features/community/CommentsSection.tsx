import { useState, type ReactNode } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  MessageCircle,
  Reply,
  Send,
  User,
  X,
  type LucideIcon,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../theme";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl?: string | null;
  };
  replies?: Comment[];
  repliesPagination?: { hasMore: boolean };
}

type ReplyTarget = {
  comment: Comment;
  parentId: string;
};

type MutationAction = {
  source: "root" | "reply";
  content?: string;
  parentId?: string;
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

function Avatar({
  name,
  avatarUrl,
  size,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size: 32 | 40;
}) {
  if (avatarUrl) {
    return (
      <Image
        accessibilityLabel={`${name ?? "Community member"} avatar`}
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <User size={size === 40 ? 20 : 16} color={colors.muted} />
    </View>
  );
}

function ToolbarAction({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={5}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarAction,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon size={12} color={colors.muted} />
      <Text style={styles.toolbarLabel}>{label}</Text>
    </Pressable>
  );
}

function InlineComposer({
  value,
  error,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  error: string;
  pending: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.inlineComposer}>
      <View style={styles.inlineInputWrap}>
        <TextInput
          accessibilityLabel="Your reply"
          accessibilityHint={error || undefined}
          value={value}
          onChangeText={onChange}
          multiline
          maxLength={1000}
          placeholder="Write a reply..."
          placeholderTextColor={colors.muted}
          editable={!pending}
          textAlignVertical="top"
          style={[styles.input, styles.inlineInput, error && styles.invalid]}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.inlineButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send reply"
          accessibilityState={{ disabled: pending || !value.trim() }}
          disabled={pending || !value.trim()}
          onPress={onSubmit}
          style={[
            styles.iconButton,
            (pending || !value.trim()) && styles.disabled,
          ]}
        >
          {pending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Send size={16} color={colors.surface} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel reply"
          disabled={pending}
          onPress={onCancel}
          style={[styles.cancelIconButton, pending && styles.disabled]}
        >
          <X size={16} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CommentsSection({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [newCommentError, setNewCommentError] = useState("");
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const [targetContent, setTargetContent] = useState("");
  const [targetError, setTargetError] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["comments", dealId],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Comment>(
        `/comments/deal/${dealId}?page=${pageParam}&limit=20`,
        { signal, authenticated: false },
      ),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const mutate = useMutation({
    mutationFn: (action: MutationAction) =>
      api.request(`/comments/deal/${dealId}`, {
        method: "POST",
        body: { content: action.content, parentId: action.parentId },
      }),
    onSuccess: (_result, action) => {
      if (action.source === "root") {
        setNewComment("");
        setNewCommentError("");
      } else {
        setTarget(null);
        setTargetContent("");
        setTargetError("");
      }
      void client.invalidateQueries({ queryKey: ["comments", dealId] });
      void client.invalidateQueries({ queryKey: ["comment-replies"] });
      void client.invalidateQueries({ queryKey: ["deal", dealId] });
    },
    onError: (failure, action) => {
      if (action.source === "root") setNewCommentError(failure.message);
      else setTargetError(failure.message);
    },
  });

  const comments = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.pagination.total ?? comments.length;

  function selectReply(comment: Comment) {
    setTarget({ comment, parentId: comment.id });
    setTargetContent("");
    setTargetError("");
  }

  function cancelTarget() {
    setTarget(null);
    setTargetContent("");
    setTargetError("");
  }

  function submitNewComment() {
    const nextContent = newComment.trim();
    if (!nextContent || mutate.isPending) return;
    mutate.mutate({
      source: "root",
      content: nextContent,
    });
  }

  function submitTarget() {
    if (!target) return;
    const nextContent = targetContent.trim();
    if (!nextContent || mutate.isPending) return;
    mutate.mutate({
      source: "reply",
      parentId: target.parentId,
      content: nextContent,
    });
  }

  function renderComment(comment: Comment, rootId?: string): ReactNode {
    const isReply = Boolean(rootId);
    const replyingHere = target?.comment.id === comment.id;

    return (
      <View
        key={comment.id}
        style={[styles.commentRow, isReply && styles.replyRow]}
      >
        <View style={styles.avatarColumn}>
          <Avatar
            name={comment.user.name}
            avatarUrl={comment.user.avatarUrl}
            size={32}
          />
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentBubble}>
            <View style={styles.commentMeta}>
              <Text numberOfLines={1} style={styles.author}>
                {comment.user.name ?? "Anonymous"}
              </Text>
              <Text style={styles.date}>
                {formatTimeAgo(comment.createdAt)}
              </Text>
            </View>
            <Text style={styles.commentContent}>{comment.content}</Text>
          </View>

          {user && !isReply ? (
            <View style={styles.toolbar}>
              <ToolbarAction
                icon={Reply}
                label="Reply"
                disabled={mutate.isPending}
                onPress={() => selectReply(comment)}
              />
            </View>
          ) : null}

          {replyingHere ? (
            <InlineComposer
              value={targetContent}
              error={targetError}
              pending={mutate.isPending}
              onChange={setTargetContent}
              onCancel={cancelTarget}
              onSubmit={submitTarget}
            />
          ) : null}

          {!isReply ? (
            <Replies
              comment={comment}
              render={(reply) => renderComment(reply, comment.id)}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <MessageCircle size={24} color={colors.text} />
        <Text accessibilityRole="header" style={styles.heading}>
          Comments ({total})
        </Text>
      </View>

      {user ? (
        <View style={styles.composer}>
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={40} />
          <View style={styles.composerBody}>
            <TextInput
              accessibilityLabel="Your comment"
              accessibilityHint={newCommentError || undefined}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={1000}
              placeholder="Share your thoughts about this deal..."
              placeholderTextColor={colors.muted}
              editable={!mutate.isPending}
              textAlignVertical="top"
              style={[styles.input, newCommentError && styles.invalid]}
            />
            {newCommentError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {newCommentError}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: mutate.isPending || !newComment.trim(),
              }}
              disabled={mutate.isPending || !newComment.trim()}
              onPress={submitNewComment}
              style={[
                styles.postButton,
                (mutate.isPending || !newComment.trim()) && styles.disabled,
              ]}
            >
              {mutate.isPending ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : null}
              <Text style={styles.postButtonText}>
                {mutate.isPending ? "Posting..." : "Post Comment"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.signInCard}>
          <Text style={styles.signInText}>Sign in to join the discussion</Text>
        </View>
      )}

      {query.isPending ? (
        <View style={styles.loadingCard}>
          <View style={styles.loadingMeta}>
            <View style={[styles.skeleton, styles.loadingAvatar]} />
            <View style={[styles.skeleton, styles.loadingName]} />
          </View>
          <View style={[styles.skeleton, styles.loadingBody]} />
        </View>
      ) : query.isError ? (
        <View style={styles.errorCard}>
          <Text accessibilityRole="alert" style={styles.errorCardText}>
            We couldn't load comments. Please try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: query.isFetching }}
            disabled={query.isFetching}
            onPress={() => void query.refetch()}
            style={[styles.retryButton, query.isFetching && styles.disabled]}
          >
            {query.isFetching ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : null}
            <Text style={styles.retryText}>
              {query.isFetching ? "Retrying..." : "Retry"}
            </Text>
          </Pressable>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyCard}>
          <MessageCircle size={48} color={colors.muted} opacity={0.5} />
          <Text style={styles.emptyText}>
            No comments yet. Be the first to share your thoughts!
          </Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => renderComment(comment))}
        </View>
      )}

      {query.hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: query.isFetchingNextPage }}
          disabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
          style={[
            styles.moreButton,
            query.isFetchingNextPage && styles.disabled,
          ]}
        >
          {query.isFetchingNextPage ? <ActivityIndicator size="small" /> : null}
          <Text style={styles.moreText}>
            {query.isFetchingNextPage ? "Loading..." : "More comments"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Replies({
  comment,
  render,
}: {
  comment: Comment;
  render: (reply: Comment) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["comment-replies", comment.id],
    enabled: expanded,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.requestPage<Comment>(
        `/comments/${comment.id}/replies?page=${pageParam}&limit=20`,
        { signal, authenticated: false },
      ),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const repliesById = new Map<string, Comment>();
  comment.replies?.forEach((reply) => repliesById.set(reply.id, reply));
  if (expanded) {
    query.data?.pages
      .flatMap((page) => page.data)
      .forEach((reply) => repliesById.set(reply.id, reply));
  }
  const replies = Array.from(repliesById.values());
  const hasMore = expanded
    ? Boolean(query.hasNextPage)
    : Boolean(comment.repliesPagination?.hasMore);

  if (!replies.length && !hasMore && !query.isError) return null;

  return (
    <View style={styles.replies}>
      {replies.map(render)}
      {query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={styles.replyError}
        >
          <Text accessibilityRole="alert" style={styles.error}>
            Could not load replies. Tap to retry.
          </Text>
        </Pressable>
      ) : null}
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: query.isFetching }}
          disabled={query.isFetching}
          onPress={() => {
            if (expanded) void query.fetchNextPage();
            else setExpanded(true);
          }}
          style={[styles.moreReplies, query.isFetching && styles.disabled]}
        >
          {query.isFetching ? <ActivityIndicator size="small" /> : null}
          <Text style={styles.moreRepliesText}>
            {query.isFetching ? "Loading..." : "More replies"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 16 },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  avatarColumn: { flexShrink: 0 },
  avatarFallback: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 32,
  },
  composerBody: { flex: 1, minWidth: 0, gap: 8 },
  input: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    backgroundColor: "transparent",
    color: colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  invalid: { borderColor: colors.danger, backgroundColor: "#fffafa" },
  postButton: {
    minHeight: 36,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.text,
  },
  postButtonText: {
    color: colors.surface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  signInCard: {
    marginBottom: 32,
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
  },
  signInText: { color: colors.muted, textAlign: "center", fontSize: 14 },
  loadingCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "rgba(244,244,245,0.25)",
  },
  loadingMeta: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeleton: { borderRadius: 999, backgroundColor: "#e4e4e7" },
  loadingAvatar: { width: 32, height: 32 },
  loadingName: { width: 96, height: 16 },
  loadingBody: { width: "100%", height: 80, borderRadius: 16 },
  errorCard: {
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  errorCardText: { textAlign: "center", fontSize: 14, lineHeight: 21 },
  retryButton: {
    minHeight: 36,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  retryText: { fontSize: 14, fontWeight: "500" },
  emptyCard: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "rgba(244,244,245,0.2)",
  },
  emptyText: {
    marginTop: 12,
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  commentsList: { gap: 16 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  replyRow: { marginTop: 12, marginLeft: 40 },
  commentBody: { flex: 1, minWidth: 0 },
  commentBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
  },
  commentMeta: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  author: {
    maxWidth: "70%",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  date: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  commentContent: { fontSize: 14, lineHeight: 21 },
  toolbar: {
    minHeight: 28,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2,
  },
  toolbarAction: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toolbarLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  inlineComposer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  inlineInputWrap: { flex: 1, minWidth: 0, gap: 6 },
  inlineInput: { minHeight: 64, fontSize: 14, lineHeight: 21 },
  inlineButtons: { gap: 4 },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.text,
  },
  cancelIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  replies: { marginTop: 8 },
  replyError: { alignSelf: "flex-start", paddingVertical: 8 },
  moreReplies: {
    minHeight: 32,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  moreRepliesText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  moreButton: {
    minHeight: 38,
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  moreText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});

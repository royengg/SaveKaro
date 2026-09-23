import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null };
  replies?: Comment[];
  repliesPagination?: { hasMore: boolean };
}
type EditTarget = { kind: "edit" | "reply"; comment: Comment };

export default function CommentsSection({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [content, setContent] = useState("");
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [error, setError] = useState("");
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
    mutationFn: (action: {
      method: "POST" | "PUT" | "DELETE";
      id?: string;
      content?: string;
      parentId?: string;
    }) =>
      api.request(
        action.id ? `/comments/${action.id}` : `/comments/deal/${dealId}`,
        {
          method: action.method,
          body:
            action.method === "DELETE"
              ? undefined
              : { content: action.content, parentId: action.parentId },
        },
      ),
    onSuccess: () => {
      setContent("");
      setTarget(null);
      setError("");
      void client.invalidateQueries({ queryKey: ["comments", dealId] });
      void client.invalidateQueries({ queryKey: ["comment-replies"] });
      void client.invalidateQueries({ queryKey: ["deal", dealId] });
    },
    onError: (failure) => setError(failure.message),
  });

  function selectTarget(kind: "reply" | "edit", comment: Comment) {
    setTarget({ kind, comment });
    setContent(kind === "edit" ? comment.content : "");
    setError("");
  }

  function renderComment(comment: Comment, rootId?: string) {
    return (
      <View key={comment.id} style={styles.comment}>
        <Text style={styles.author}>
          {comment.user.name ?? "Community member"}
        </Text>
        <Text style={styles.content}>{comment.content}</Text>
        <Text style={styles.date}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </Text>
        {user ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                selectTarget(
                  "reply",
                  rootId ? { ...comment, id: rootId } : comment,
                )
              }
            >
              <Text style={styles.action}>Reply</Text>
            </Pressable>
            {user.id === comment.user.id ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => selectTarget("edit", comment)}
                >
                  <Text style={styles.action}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={mutate.isPending}
                  onPress={() =>
                    Alert.alert(
                      "Delete comment?",
                      "Replies to this comment may also be removed.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () =>
                            mutate.mutate({ method: "DELETE", id: comment.id }),
                        },
                      ],
                    )
                  }
                >
                  <Text style={styles.action}>Delete</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
        {!rootId ? (
          <Replies
            comment={comment}
            render={(reply) => renderComment(reply, comment.id)}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Comments
      </Text>
      {user ? (
        <View style={styles.composer}>
          {target ? (
            <View style={styles.actions}>
              <Text>
                {target.kind === "edit"
                  ? "Editing comment"
                  : `Replying to ${target.comment.user.name ?? "community member"}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTarget(null);
                  setContent("");
                }}
              >
                <Text style={styles.action}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            accessibilityLabel={
              target?.kind === "edit" ? "Edit comment" : "Your comment"
            }
            style={styles.input}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={1000}
            placeholder="Join the discussion"
            editable={!mutate.isPending}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={mutate.isPending || !content.trim()}
            style={styles.send}
            onPress={() =>
              mutate.mutate({
                method: target?.kind === "edit" ? "PUT" : "POST",
                id: target?.kind === "edit" ? target.comment.id : undefined,
                parentId:
                  target?.kind === "reply" ? target.comment.id : undefined,
                content: content.trim(),
              })
            }
          >
            <Text style={styles.sendText}>
              {mutate.isPending
                ? "Sending…"
                : target?.kind === "edit"
                  ? "Save changes"
                  : "Send"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text>Sign in from Settings to join the discussion.</Text>
      )}
      {query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
        >
          <Text style={styles.error}>
            Could not load comments. Tap to retry.
          </Text>
        </Pressable>
      ) : null}
      {!query.isPending &&
      !query.isError &&
      !query.data?.pages[0]?.data.length ? (
        <Text>No comments yet.</Text>
      ) : null}
      {query.data?.pages
        .flatMap((page) => page.data)
        .map((comment) => renderComment(comment))}
      {query.hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          disabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          <Text style={styles.action}>
            {query.isFetchingNextPage ? "Loading…" : "More comments"}
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
  render: (reply: Comment) => React.ReactNode;
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
  const replies =
    expanded && query.data
      ? query.data.pages.flatMap((page) => page.data)
      : (comment.replies ?? []);
  return (
    <View style={styles.replies}>
      {replies.map(render)}
      {query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
        >
          <Text style={styles.error}>Could not load replies. Retry</Text>
        </Pressable>
      ) : null}
      {(!expanded && comment.repliesPagination?.hasMore) ||
      (expanded && query.hasNextPage) ? (
        <Pressable
          accessibilityRole="button"
          disabled={query.isFetching}
          onPress={() => {
            if (expanded) void query.fetchNextPage();
            else setExpanded(true);
          }}
        >
          <Text style={styles.action}>More replies</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16, paddingVertical: 16 },
  heading: { fontSize: 22, fontWeight: "700" },
  composer: { gap: 10 },
  input: {
    minHeight: 80,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d3ced1",
    borderRadius: 14,
    fontSize: 16,
    textAlignVertical: "top",
  },
  send: {
    padding: 14,
    backgroundColor: "#171717",
    borderRadius: 24,
    alignItems: "center",
  },
  sendText: { color: "white", fontWeight: "600" },
  comment: { gap: 6, paddingVertical: 10 },
  author: { fontWeight: "600", color: "#171717" },
  content: { lineHeight: 22, color: "#45414a" },
  date: { fontSize: 12, color: "#66616a" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
  },
  action: { paddingVertical: 12, color: "#bb001e", fontWeight: "600" },
  error: { color: "#bb001e" },
  replies: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: "#ece7e9" },
});

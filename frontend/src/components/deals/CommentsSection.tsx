import { useState } from "react";
import { MessageCircle, Send, Reply, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useComments, useCreateComment } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  replies?: Comment[];
}

interface CommentsSectionProps {
  dealId: string;
}

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

function CommentItem({
  comment,
  dealId,
  isReply = false,
}: {
  comment: Comment;
  dealId: string;
  isReply?: boolean;
}) {
  const { isAuthenticated } = useAuthStore();
  const createComment = useCreateComment();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    try {
      await createComment.mutateAsync({
        dealId,
        content: replyContent.trim(),
        parentId: comment.id,
      });
      setReplyContent("");
      setShowReplyForm(false);
      toast.success("Reply posted!");
    } catch (error) {
      toast.error("Failed to post reply");
    }
  };

  return (
    <div className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.user.avatarUrl ? (
          <img
            src={comment.user.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-secondary rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.user.name || "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        </div>

        {/* Reply button */}
        {!isReply && isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 text-muted-foreground h-7 text-xs"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        )}

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyContent.trim() || createComment.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReplyForm(false)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                dealId={dealId}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentsSection({ dealId }: CommentsSectionProps) {
  const { data: comments, isLoading } = useComments(dealId);
  const { isAuthenticated, user } = useAuthStore();
  const createComment = useCreateComment();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        dealId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted!");
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const commentsList = (comments as Comment[]) || [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-6 w-6" />
        <h2 className="text-xl font-bold">Comments ({commentsList.length})</h2>
      </div>

      {/* Add comment form */}
      {isAuthenticated ? (
        <div className="flex gap-3 mb-8">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <Textarea
              placeholder="Share your thoughts about this deal..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || createComment.isPending}
            >
              {createComment.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-secondary rounded-xl p-4 mb-8 text-center">
          <p className="text-muted-foreground">
            Sign in to join the discussion
          </p>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-secondary/25 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      ) : commentsList.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-secondary/20 px-4 py-8 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commentsList.map((comment) => (
            <CommentItem key={comment.id} comment={comment} dealId={dealId} />
          ))}
        </div>
      )}
    </div>
  );
}

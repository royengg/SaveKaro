import { Hono } from "hono";
import prisma from "../lib/prisma";
import { captureServerEvent } from "../lib/posthog";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import { createCommentSchema, CreateCommentInput, updateCommentSchema, UpdateCommentInput } from "../schemas";
import { createRateLimiter } from "../middleware/rate-limiter";
import { stripHtml } from "../lib/sanitize";
import { parsePaginationParams } from "../lib/pagination";
import {
  cacheGetOrSet,
  cacheInvalidate,
  cacheInvalidatePattern,
} from "../lib/cache";
import { CACHE_TTL } from "../config/constants";
import { setPublicCacheHeaders } from "../lib/http-cache";

const commentRateLimiter = createRateLimiter("submit"); // 5 per hour
const MAX_COMMENT_PAGE_SIZE = 50;
const DEFAULT_EMBEDDED_REPLY_LIMIT = 50;
const MAX_REPLY_PAGE_SIZE = 100;

const comments = new Hono();

function invalidateCommentCaches(
  dealId: string,
  relatedCommentIds: Array<string | null | undefined> = [],
) {
  const patterns = new Set([`comments:deal:${dealId}:*`]);
  for (const commentId of relatedCommentIds) {
    if (commentId) {
      patterns.add(`comments:replies:${commentId}:*`);
    }
  }

  return Promise.all(
    Array.from(patterns, (pattern) => cacheInvalidatePattern(pattern)),
  );
}

comments.get("/deal/:dealId", async (c) => {
  const dealId = c.req.param("dealId");
  const { page, limit, skip } = parsePaginationParams(
    c.req.query("page"),
    c.req.query("limit"),
    20,
    MAX_COMMENT_PAGE_SIZE,
  );
  const { limit: replyLimit } = parsePaginationParams(
    undefined,
    c.req.query("replyLimit"),
    DEFAULT_EMBEDDED_REPLY_LIMIT,
    MAX_REPLY_PAGE_SIZE,
  );

  const cacheKey = `comments:deal:${dealId}:${page}:${limit}:${replyLimit}`;
  const response = await cacheGetOrSet(cacheKey, CACHE_TTL.COMMENTS, async () => {
    const [commentsList, total] = await Promise.all([
      prisma.comment.findMany({
        where: { dealId, parentId: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: "asc" },
            take: replyLimit + 1,
          },
        },
      }),
      prisma.comment.count({ where: { dealId, parentId: null } }),
    ]);

    return {
      success: true,
      data: commentsList.map(({ replies, ...comment }) => ({
        ...comment,
        replies: replies.slice(0, replyLimit),
        repliesPagination: {
          limit: replyLimit,
          hasMore: replies.length > replyLimit,
        },
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  setPublicCacheHeaders(c, {
    maxAge: 0,
  });
  return c.json(response);
});

comments.get("/:id/replies", async (c) => {
  const parentId = c.req.param("id");
  const { page, limit, skip } = parsePaginationParams(
    c.req.query("page"),
    c.req.query("limit"),
    20,
    MAX_REPLY_PAGE_SIZE,
  );

  const cacheKey = `comments:replies:${parentId}:${page}:${limit}`;
  const result = await cacheGetOrSet(cacheKey, CACHE_TTL.COMMENTS, async () => {
    const [parent, replies, total] = await Promise.all([
      prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true },
      }),
      prisma.comment.findMany({
        where: { parentId },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      prisma.comment.count({ where: { parentId } }),
    ]);

    return { parent, replies, total };
  });

  if (!result.parent) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  setPublicCacheHeaders(c, {
    maxAge: 0,
  });
  return c.json({
    success: true,
    data: result.replies,
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  });
});

comments.post(
  "/deal/:dealId",
  requireAuth,
  commentRateLimiter,
  validate(createCommentSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const dealId = c.req.param("dealId");
    const data = getValidated<CreateCommentInput>(c);

    // Verify deal exists
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      return c.json({ success: false, error: "Deal not found" }, 404);
    }

    let recipientId = deal.submittedById;
    // If replying, notify the parent author instead of the deal owner.
    if (data.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.dealId !== dealId) {
        return c.json(
          { success: false, error: "Parent comment not found" },
          404,
        );
      }
      recipientId = parent.userId;
    }

    const comment = await prisma.$transaction(async (tx) => {
      const createdComment = await tx.comment.create({
        data: {
          content: stripHtml(data.content),
          userId,
          dealId,
          parentId: data.parentId,
        },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      await tx.deal.update({
        where: { id: dealId },
        data: { commentCount: { increment: 1 } },
      });

      if (recipientId && recipientId !== userId) {
        await tx.notification.create({
          data: {
            userId: recipientId,
            type: "COMMENT_REPLY",
            title: data.parentId ? "New reply to your comment" : "New comment on your deal",
            message: `${createdComment.user.name || "Someone"} ${data.parentId ? "replied to your comment" : "commented on your deal"}: ${createdComment.content.slice(0, 160)}`,
            data: { dealId, commentId: createdComment.id },
          },
        });
      }

      return createdComment;
    });

    await Promise.all([
      cacheInvalidate(`deals:detail:${dealId}`),
      invalidateCommentCaches(dealId, [data.parentId]),
    ]);

    captureServerEvent(c, "comment:create", {
      deal_id: dealId,
      comment_id: comment.id,
      is_reply: Boolean(data.parentId),
    });

    return c.json({ success: true, data: comment }, 201);
  },
);

// Update a comment (owner only)
comments.put("/:id", requireAuth, validate(updateCommentSchema), async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const data = getValidated<UpdateCommentInput>(c);

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (comment.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: stripHtml(data.content) },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  await invalidateCommentCaches(comment.dealId, [comment.parentId]);

  return c.json({ success: true, data: updated });
});

comments.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (comment.userId !== userId && !c.get("user")?.isAdmin) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id } });

    const remainingCommentCount = await tx.comment.count({
      where: { dealId: comment.dealId },
    });

    await tx.deal.update({
      where: { id: comment.dealId },
      data: { commentCount: remainingCommentCount },
    });
  });

  await Promise.all([
    cacheInvalidate(`deals:detail:${comment.dealId}`),
    invalidateCommentCaches(comment.dealId, [comment.parentId, comment.id]),
  ]);

  return c.json({ success: true, message: "Comment deleted" });
});

export default comments;

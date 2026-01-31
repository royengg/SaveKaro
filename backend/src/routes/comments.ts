import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import { createCommentSchema, CreateCommentInput } from "../schemas";

const comments = new Hono();

// Get comments for a deal
comments.get("/deal/:dealId", async (c) => {
  const dealId = c.req.param("dealId");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const skip = (page - 1) * limit;

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
        },
      },
    }),
    prisma.comment.count({ where: { dealId, parentId: null } }),
  ]);

  return c.json({
    success: true,
    data: commentsList,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Add a comment to a deal
comments.post("/deal/:dealId", requireAuth, validate(createCommentSchema), async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("dealId");
  const data = getValidated<CreateCommentInput>(c);

  // Verify deal exists
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  // If replying, verify parent exists
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
    if (!parent || parent.dealId !== dealId) {
      return c.json({ success: false, error: "Parent comment not found" }, 404);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
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

  // TODO: Send notification to deal owner or parent comment author

  return c.json({ success: true, data: comment }, 201);
});

// Update a comment (owner only)
comments.put("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const body = await c.req.json<{ content: string }>();

  if (!body.content || body.content.length > 1000) {
    return c.json({ success: false, error: "Invalid content" }, 400);
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  
  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (comment.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: body.content },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  return c.json({ success: true, data: updated });
});

// Delete a comment (owner only)
comments.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const comment = await prisma.comment.findUnique({ where: { id } });
  
  if (!comment) {
    return c.json({ success: false, error: "Comment not found" }, 404);
  }

  if (comment.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await prisma.comment.delete({ where: { id } });

  return c.json({ success: true, message: "Comment deleted" });
});

export default comments;

import { Hono } from "hono";
import prisma from "../lib/prisma";

const categories = new Hono();

// Get all categories
categories.get("/", async (c) => {
  const categoriesWithCounts = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { deals: { where: { isActive: true } } },
      },
    },
  });

  return c.json({
    success: true,
    data: categoriesWithCounts.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      dealCount: cat._count.deals,
    })),
  });
});

// Get single category with deals
categories.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { deals: { where: { isActive: true } } },
      },
    },
  });

  if (!category) {
    return c.json({ success: false, error: "Category not found" }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      color: category.color,
      dealCount: category._count.deals,
    },
  });
});

export default categories;

import { Hono } from "hono";
import prisma from "../lib/prisma";
import { cacheGet, cacheGetOrSet, cacheSet } from "../lib/cache";
import { CACHE_TTL } from "../config/constants";
import { setPublicCacheHeaders } from "../lib/http-cache";

const categories = new Hono();

categories.get("/", async (c) => {
  const cacheKey = "categories:list";
  const response = await cacheGetOrSet(
    cacheKey,
    CACHE_TTL.CATEGORIES,
    async () => {
      const categoriesWithCounts = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { deals: { where: { isActive: true } } },
          },
        },
      });

      const sortedCategories = categoriesWithCounts.sort((a, b) => {
        const aIsOther = a.slug === "other";
        const bIsOther = b.slug === "other";

        if (aIsOther !== bIsOther) {
          return aIsOther ? 1 : -1;
        }

        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        data: sortedCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          color: category.color,
          dealCount: category._count.deals,
        })),
      };
    },
  );

  setPublicCacheHeaders(c, {
    maxAge: CACHE_TTL.CATEGORIES,
    sMaxAge: CACHE_TTL.CATEGORIES,
    staleWhileRevalidate: CACHE_TTL.CATEGORIES,
    staleIfError: CACHE_TTL.CATEGORIES * 6,
  });
  return c.json(response);
});

categories.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const cacheKey = `categories:${slug}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    setPublicCacheHeaders(c, {
      maxAge: CACHE_TTL.CATEGORIES,
      sMaxAge: CACHE_TTL.CATEGORIES,
      staleWhileRevalidate: CACHE_TTL.CATEGORIES,
      staleIfError: CACHE_TTL.CATEGORIES * 6,
    });
    return c.json(cached);
  }

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

  const response = {
    success: true,
    data: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      color: category.color,
      dealCount: category._count.deals,
    },
  };

  await cacheSet(cacheKey, response, CACHE_TTL.CATEGORIES);
  setPublicCacheHeaders(c, {
    maxAge: CACHE_TTL.CATEGORIES,
    sMaxAge: CACHE_TTL.CATEGORIES,
    staleWhileRevalidate: CACHE_TTL.CATEGORIES,
    staleIfError: CACHE_TTL.CATEGORIES * 6,
  });
  return c.json(response);
});

export default categories;

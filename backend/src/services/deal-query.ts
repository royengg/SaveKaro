import { createPaginationResponse } from "../lib/pagination";
import { injectAffiliateTag } from "./affiliate-service";
import { preferModernImageUrl } from "../lib/image";
import { getStoreKeyFromFilter } from "../lib/store-key";
import type { DealQueryInput } from "../schemas";

// --- Active deal condition ---

export function getActiveDealCondition() {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

// --- Cache key builders ---

export function buildDealCacheKey(query: DealQueryInput) {
  return `deals:${query.page}:${query.limit}:${query.category || ""}:${query.store || ""}:${query.minDiscount || ""}:${query.sortBy || "newest"}:${query.region || ""}:${query.source || ""}:${query.status || ""}:${query.showInactive || false}`;
}

export function buildHomeBootstrapCacheKey(query: DealQueryInput) {
  return `deals:home:${query.limit}:${query.category || ""}:${query.store || ""}:${query.minDiscount || ""}:${query.sortBy || "newest"}:${query.region || ""}:${query.search || ""}`;
}

// --- Prisma `where` / `orderBy` builders ---

export function buildDealsWhere(query: DealQueryInput) {
  const {
    category,
    store,
    minDiscount,
    search,
    region,
    source,
    status,
    showInactive,
  } = query;

  const where: any = {};
  const andConditions: any[] = [];

  if (!showInactive) {
    where.isActive = true;
    andConditions.push(getActiveDealCondition());
  }

  if (region) {
    where.region = region;
  }

  if (source) {
    where.source = source;
  }

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = { slug: category };
  }

  if (store) {
    const storeKey = getStoreKeyFromFilter(store);
    if (storeKey) {
      where.storeKey = storeKey;
    } else {
      where.store = { contains: store, mode: "insensitive" };
    }
  }

  if (minDiscount) {
    where.discountPercent = { gte: minDiscount };
  }

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { store: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

export function buildDealsOrderBy(sortBy: DealQueryInput["sortBy"]) {
  if (sortBy === "popular") {
    return [
      { upvoteCount: "desc" as const },
      { createdAt: "desc" as const },
      { id: "desc" as const },
    ];
  }

  if (sortBy === "discount") {
    return [
      { discountPercent: "desc" as const },
      { createdAt: "desc" as const },
      { id: "desc" as const },
    ];
  }

  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

// --- Select / transform helpers ---

export function getDealListSelect(includeSubmittedBy: boolean) {
  return {
    id: true,
    title: true,
    cleanTitle: true,
    brand: true,
    originalPrice: true,
    dealPrice: true,
    discountPercent: true,
    productUrl: true,
    imageUrl: true,
    store: true,
    source: true,
    region: true,
    currency: true,
    redditScore: true,
    clickCount: true,
    upvoteCount: true,
    commentCount: true,
    createdAt: true,
    category: {
      select: { id: true, name: true, slug: true, icon: true, color: true },
    },
    ...(includeSubmittedBy
      ? {
          submittedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        }
      : {}),
  };
}

export function toClientDeal<T extends Record<string, any>>(deal: T) {
  const { commentCount, _count, ...rest } = deal;
  const comments =
    typeof commentCount === "number" ? commentCount : _count?.comments;

  return {
    ...rest,
    ...(typeof comments === "number"
      ? {
          _count: {
            ...(_count ?? {}),
            comments,
          },
        }
      : _count
        ? { _count }
        : {}),
  };
}

export function serializeDealsForClient<T extends Record<string, any>>(dealsList: T[]) {
  return dealsList.map((deal) => ({
    ...toClientDeal(deal),
    description: null,
    affiliateUrl: injectAffiliateTag(deal.productUrl, deal.store, deal.region),
    imageUrl: preferModernImageUrl(deal.imageUrl),
  }));
}

export function createDealsListResponse<T extends Record<string, any>>(
  listRows: T[],
  page: number,
  limit: number,
) {
  const hasMore = listRows.length > limit;
  const dealsList = hasMore ? listRows.slice(0, limit) : listRows;
  const estimatedTotal = hasMore ? page * limit + 1 : (page - 1) * limit + dealsList.length;
  const pagination = createPaginationResponse(estimatedTotal, page, limit);

  return {
    success: true,
    data: serializeDealsForClient(dealsList),
    pagination: {
      ...pagination,
      hasMore,
    },
  };
}

export function buildStoreShowcaseWhere(
  storeKey: "amazon" | "myntra",
  region?: DealQueryInput["region"],
) {
  return {
    isActive: true,
    storeKey,
    ...(region ? { region } : {}),
    AND: [getActiveDealCondition()],
  };
}

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { PageResult } from "@savekaro/api-client";
import type { Deal } from "@savekaro/contracts";
import type { SavedDealSignal } from "./recommendations";

/** List data is a temporary preview, never a complete detail-cache entry. */
export function getDealPreview(
  client: QueryClient,
  dealId: string,
  userId?: string,
  cart: readonly Deal[] = [],
): Deal | undefined {
  const queries = client
    .getQueryCache()
    .findAll({
      predicate: ({ queryKey: [source, owner] }) =>
        source === "deals" ||
        source === "home" ||
        (!!userId &&
          owner === userId &&
          (source === "saved" || source === "submitted")),
    })
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);

  let preview: Deal | undefined;
  for (const query of queries) {
    if (query.queryKey[0] === "home") {
      const home = query.state.data as
        { amazonDeals: Deal[]; myntraDeals: Deal[] } | undefined;
      preview =
        home?.amazonDeals.find((deal) => deal.id === dealId) ??
        home?.myntraDeals.find((deal) => deal.id === dealId);
    } else {
      const list = query.state.data as
        InfiniteData<PageResult<Deal>> | undefined;
      preview = list?.pages
        .flatMap((page) => page.data)
        .find((deal) => deal.id === dealId);
    }
    if (preview) break;
  }
  preview ??= cart.find((deal) => deal.id === dealId);
  // Public lists/cart may contain stale account state from earlier mutations.
  return preview
    ? { ...preview, userSaved: undefined, userUpvote: undefined }
    : undefined;
}

function updatePage(
  current: InfiniteData<PageResult<Deal>> | undefined,
  dealId: string,
  update: (deal: Deal) => Deal,
) {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.map((deal) => (deal.id === dealId ? update(deal) : deal)),
    })),
  };
}

/** Keeps feed, detail, and saved reads consistent after a deal mutation. */
export function updateDealReadCaches(
  client: QueryClient,
  dealId: string,
  update: (deal: Deal) => Deal,
) {
  client.setQueriesData<InfiniteData<PageResult<Deal>>>(
    { queryKey: ["deals"] },
    (current) => updatePage(current, dealId, update),
  );
  client.setQueriesData<Deal>({ queryKey: ["deal", dealId] }, (current) =>
    current ? update(current) : current,
  );
  client.setQueriesData<InfiniteData<PageResult<Deal>>>(
    { queryKey: ["saved"] },
    (current) => updatePage(current, dealId, update),
  );
}

function toSavedSignal(deal: Deal): SavedDealSignal {
  return {
    id: deal.id,
    title: deal.title,
    cleanTitle: deal.cleanTitle,
    brand: deal.brand,
    store: deal.store,
    region: deal.region,
    category: { slug: deal.category.slug },
  };
}

export function updateSavedSignalCaches(
  client: QueryClient,
  deal: Deal,
  saved: boolean,
) {
  client.setQueriesData<{ savedSignals: SavedDealSignal[] }>(
    { queryKey: ["saved-signals"] },
    (current) => {
      if (!current) return current;
      const withoutDeal = current.savedSignals.filter(
        (signal) => signal.id !== deal.id,
      );
      return {
        ...current,
        savedSignals: saved
          ? [toSavedSignal(deal), ...withoutDeal]
          : withoutDeal,
      };
    },
  );
}

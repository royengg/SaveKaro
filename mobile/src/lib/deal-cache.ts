import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { PageResult } from "@savekaro/api-client";
import type { Deal } from "@savekaro/contracts";
import type { SavedDealSignal } from "./recommendations";

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

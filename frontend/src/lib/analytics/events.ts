import type { Deal } from "@/store/filterStore";
import { getRouteName, isAnalyticsCapturing, posthog } from "./posthog";

type EventProperty = string | number | boolean | null | undefined;
type EventProperties = Record<string, EventProperty>;

export type DealPlacement =
  | "home_feed"
  | "saved_deals"
  | "deal_detail"
  | "explore"
  | "cart"
  | "amazon_carousel"
  | "myntra_carousel"
  | "featured_carousel"
  | "coupon_carousel";

interface AnalyticsEventMap {
  "entry:guest_mode_select": { entry_surface: "home_dialog" };
  "auth:google_login_start": { entry_surface: string };
  "discovery:search_submit": {
    query_length: number;
    region: string;
    active_filter_count: number;
  };
  "discovery:search_results": {
    query_length: number;
    result_count: number;
    region: string;
  };
  "discovery:preset_select": { preset: string; region: string };
  "discovery:filter_apply": {
    filter_name: "category" | "store" | "region";
    filter_value: string;
    region: string;
  };
  "deal:impression": DealEventProperties & { position?: number };
  "deal:detail_view": DealEventProperties;
  "deal:detail_open": DealEventProperties;
  "deal:merchant_click_intent": DealEventProperties;
  "deal:share": DealEventProperties & { share_method: "clipboard" };
  "cart:item_change": DealEventProperties & {
    action: "add" | "remove";
    cart_item_count: number;
  };
  "cart:clear": { previous_item_count: number };
  "explore:deal_advance": DealEventProperties & {
    direction: "next" | "previous";
    input_method: "touch" | "wheel" | "keyboard" | "button" | "unknown";
    position: number;
  };
}

export interface DealEventProperties extends EventProperties {
  deal_id: string;
  category_slug: string;
  store: string;
  region: string;
  source: string;
  discount_percent: number | null;
  placement: DealPlacement;
}

export function getDealEventProperties(
  deal: Pick<Deal, "id" | "category" | "store" | "region" | "discountPercent"> & {
    source: string;
  },
  placement: DealPlacement,
): DealEventProperties {
  return {
    deal_id: deal.id,
    category_slug: deal.category?.slug || "unknown",
    store: deal.store?.trim() || "unknown",
    region: deal.region,
    source: deal.source,
    discount_percent: deal.discountPercent ?? null,
    placement,
  };
}

export function captureEvent<K extends keyof AnalyticsEventMap>(
  event: K,
  properties: AnalyticsEventMap[K],
) {
  if (!isAnalyticsCapturing()) return;

  posthog.capture(event, {
    ...properties,
    route_name: getRouteName(window.location.pathname),
  });
}

export function captureAppException(
  error: unknown,
  properties: EventProperties = {},
) {
  if (!isAnalyticsCapturing()) return;
  posthog.captureException(error, {
    ...properties,
    route_name: getRouteName(window.location.pathname),
  });
}

export const DEAL_REGION_VALUES = ["INDIA", "CANADA", "WORLD"] as const;

export type DealRegion = (typeof DEAL_REGION_VALUES)[number];

type RegionMeta = {
  label: string;
  icon: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  originalPricePlaceholder: string;
  dealPricePlaceholder: string;
};

export const REGION_META: Record<DealRegion, RegionMeta> = {
  INDIA: {
    label: "India",
    icon: "🇮🇳",
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    originalPricePlaceholder: "999",
    dealPricePlaceholder: "599",
  },
  CANADA: {
    label: "Canada",
    icon: "🇨🇦",
    currencyCode: "CAD",
    currencySymbol: "C$",
    locale: "en-CA",
    originalPricePlaceholder: "129.99",
    dealPricePlaceholder: "89.99",
  },
  WORLD: {
    label: "World",
    icon: "🌍",
    currencyCode: "USD",
    currencySymbol: "$",
    locale: "en-US",
    originalPricePlaceholder: "19.99",
    dealPricePlaceholder: "12.99",
  },
};

export function getRegionMeta(region: DealRegion): RegionMeta {
  return REGION_META[region];
}

export function getNextRegion(region: DealRegion): DealRegion {
  const currentIndex = DEAL_REGION_VALUES.indexOf(region);
  return DEAL_REGION_VALUES[(currentIndex + 1) % DEAL_REGION_VALUES.length];
}

export function isDealRegion(value: string | null | undefined): value is DealRegion {
  return (
    typeof value === "string" &&
    (DEAL_REGION_VALUES as readonly string[]).includes(value)
  );
}

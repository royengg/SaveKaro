export const DEFAULT_CATEGORY_ICON = "🏷️";

export const CATEGORY_ICONS: Record<string, string> = {
  electronics: "💻",
  fashion: "👕",
  gaming: "🎮",
  "home-kitchen": "🏠",
  beauty: "💄",
  "food-groceries": "🍕",
  "mobile-accessories": "📱",
  "books-stationery": "📚",
  travel: "✈️",
  other: "📦",
};

export function getCategoryIcon(category?: {
  slug?: string | null;
  icon?: string | null;
} | null): string {
  const explicitIcon = category?.icon?.trim();
  if (explicitIcon) {
    return explicitIcon;
  }

  const slug = category?.slug?.trim().toLowerCase();
  if (slug && CATEGORY_ICONS[slug]) {
    return CATEGORY_ICONS[slug];
  }

  return DEFAULT_CATEGORY_ICON;
}

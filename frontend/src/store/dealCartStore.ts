import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Deal } from "@/store/filterStore";

const CART_STORAGE_KEY = "savekaro-deal-cart";
const MAX_CART_ITEMS = 50;

export interface DealCartItem {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  dealPrice: string | null;
  originalPrice: string | null;
  discountPercent: number | null;
  currency: string;
  region: Deal["region"];
  productUrl: string;
  affiliateUrl?: string | null;
  imageUrl: string | null;
  store: string | null;
  createdAt: string;
  category: Deal["category"];
  addedAt: string;
}

interface DealCartState {
  items: DealCartItem[];
  addDeal: (deal: Deal) => void;
  removeDeal: (dealId: string) => void;
  toggleDeal: (deal: Deal) => boolean;
  clearCart: () => void;
  hasDeal: (dealId: string) => boolean;
}

function toCartItem(deal: Deal): DealCartItem {
  return {
    id: deal.id,
    title: deal.title,
    cleanTitle: deal.cleanTitle ?? null,
    brand: deal.brand ?? null,
    dealPrice: deal.dealPrice ?? null,
    originalPrice: deal.originalPrice ?? null,
    discountPercent: deal.discountPercent ?? null,
    currency: deal.currency,
    region: deal.region,
    productUrl: deal.productUrl,
    affiliateUrl: deal.affiliateUrl ?? null,
    imageUrl: deal.imageUrl ?? null,
    store: deal.store ?? null,
    createdAt: deal.createdAt,
    category: deal.category,
    addedAt: new Date().toISOString(),
  };
}

export const useDealCartStore = create<DealCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addDeal: (deal) =>
        set((state) => {
          const nextItem = toCartItem(deal);
          const remainingItems = state.items.filter((item) => item.id !== deal.id);

          return {
            items: [nextItem, ...remainingItems].slice(0, MAX_CART_ITEMS),
          };
        }),
      removeDeal: (dealId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== dealId),
        })),
      toggleDeal: (deal) => {
        const exists = get().hasDeal(deal.id);

        if (exists) {
          get().removeDeal(deal.id);
          return false;
        }

        get().addDeal(deal);
        return true;
      },
      clearCart: () => set({ items: [] }),
      hasDeal: (dealId) => get().items.some((item) => item.id === dealId),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export default useDealCartStore;

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DealRegion = "INDIA" | "WORLD";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  dealCount: number;
}

export interface Deal {
  id: string;
  title: string;
  description: string | null;
  originalPrice: string | null;
  dealPrice: string | null;
  discountPercent: number | null;
  currency: string;
  region: DealRegion;
  productUrl: string;
  imageUrl: string | null;
  store: string | null;
  source: "REDDIT" | "USER_SUBMITTED";
  redditScore: number;
  clickCount: number;
  upvoteCount: number;
  createdAt: string;
  category: Category;
  submittedBy?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  _count?: {
    comments: number;
  };
  userUpvote?: number | null;
  userSaved?: boolean;
}

interface FilterState {
  search: string;
  category: string | null;
  store: string | null;
  minDiscount: number | null;
  sortBy: "newest" | "popular" | "discount";
  region: DealRegion;

  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setStore: (store: string | null) => void;
  setMinDiscount: (minDiscount: number | null) => void;
  setSortBy: (sortBy: "newest" | "popular" | "discount") => void;
  setRegion: (region: DealRegion) => void;
  toggleRegion: () => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      search: "",
      category: null,
      store: null,
      minDiscount: null,
      sortBy: "newest",
      region: "INDIA",

      setSearch: (search) => set({ search }),
      setCategory: (category) => set({ category }),
      setStore: (store) => set({ store }),
      setMinDiscount: (minDiscount) => set({ minDiscount }),
      setSortBy: (sortBy) => set({ sortBy }),
      setRegion: (region) => set({ region }),
      toggleRegion: () =>
        set((state) => ({
          region: state.region === "INDIA" ? "WORLD" : "INDIA",
        })),
      resetFilters: () =>
        set({
          search: "",
          category: null,
          store: null,
          minDiscount: null,
          sortBy: "newest",
          // Keep region on reset
        }),
    }),
    {
      name: "deal-filters",
      partialize: (state) => ({ region: state.region }), // Only persist region
    },
  ),
);

export default useFilterStore;

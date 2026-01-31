import { create } from "zustand";

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
  
  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setStore: (store: string | null) => void;
  setMinDiscount: (minDiscount: number | null) => void;
  setSortBy: (sortBy: "newest" | "popular" | "discount") => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  search: "",
  category: null,
  store: null,
  minDiscount: null,
  sortBy: "newest",

  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  setStore: (store) => set({ store }),
  setMinDiscount: (minDiscount) => set({ minDiscount }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () =>
    set({
      search: "",
      category: null,
      store: null,
      minDiscount: null,
      sortBy: "newest",
    }),
}));

export default useFilterStore;

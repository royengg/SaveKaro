import { create } from "zustand";

export type HomeMobileChromeMode = "full" | "primary" | "compact";

interface UiState {
  homeMobileChromeMode: HomeMobileChromeMode;
  isHomeChromeScrolling: boolean;
  isHomeSearchFocused: boolean;
  isHomeSearchExpanded: boolean;
  isMobileNavMenuOpen: boolean;
  setHomeMobileChromeMode: (mode: HomeMobileChromeMode) => void;
  setHomeChromeScrolling: (scrolling: boolean) => void;
  setHomeSearchFocused: (focused: boolean) => void;
  setHomeSearchExpanded: (expanded: boolean) => void;
  setMobileNavMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  homeMobileChromeMode: "full",
  isHomeChromeScrolling: false,
  isHomeSearchFocused: false,
  isHomeSearchExpanded: false,
  isMobileNavMenuOpen: false,
  setHomeMobileChromeMode: (mode) => set({ homeMobileChromeMode: mode }),
  setHomeChromeScrolling: (scrolling) =>
    set({ isHomeChromeScrolling: scrolling }),
  setHomeSearchFocused: (focused) => set({ isHomeSearchFocused: focused }),
  setHomeSearchExpanded: (expanded) =>
    set({ isHomeSearchExpanded: expanded }),
  setMobileNavMenuOpen: (open) => set({ isMobileNavMenuOpen: open }),
}));

export default useUiStore;

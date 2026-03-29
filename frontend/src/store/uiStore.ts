import { create } from "zustand";

interface UiState {
  isHomeTopBarHidden: boolean;
  isHomeChromeScrolling: boolean;
  isMobileNavMenuOpen: boolean;
  setHomeTopBarHidden: (hidden: boolean) => void;
  setHomeChromeScrolling: (scrolling: boolean) => void;
  setMobileNavMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isHomeTopBarHidden: false,
  isHomeChromeScrolling: false,
  isMobileNavMenuOpen: false,
  setHomeTopBarHidden: (hidden) => set({ isHomeTopBarHidden: hidden }),
  setHomeChromeScrolling: (scrolling) =>
    set({ isHomeChromeScrolling: scrolling }),
  setMobileNavMenuOpen: (open) => set({ isMobileNavMenuOpen: open }),
}));

export default useUiStore;

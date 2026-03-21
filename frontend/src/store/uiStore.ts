import { create } from "zustand";

interface UiState {
  isHomeTopBarHidden: boolean;
  isHomeChromeScrolling: boolean;
  setHomeTopBarHidden: (hidden: boolean) => void;
  setHomeChromeScrolling: (scrolling: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isHomeTopBarHidden: false,
  isHomeChromeScrolling: false,
  setHomeTopBarHidden: (hidden) => set({ isHomeTopBarHidden: hidden }),
  setHomeChromeScrolling: (scrolling) =>
    set({ isHomeChromeScrolling: scrolling }),
}));

export default useUiStore;

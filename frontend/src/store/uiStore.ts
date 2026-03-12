import { create } from "zustand";

interface UiState {
  isHomeUiCollapsed: boolean;
  setHomeUiCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isHomeUiCollapsed: false,
  setHomeUiCollapsed: (collapsed) => set({ isHomeUiCollapsed: collapsed }),
}));

export default useUiStore;

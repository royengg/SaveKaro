import { create } from "zustand";

export type HomeMobileChromeMode = "full" | "primary" | "compact";

interface UiState {
  homeMobileChromeMode: HomeMobileChromeMode;
  isHomeChromeScrolling: boolean;
  isHomeSearchFocused: boolean;
  isMobileNavMenuOpen: boolean;
  isDarkMode: boolean;
  setHomeMobileChromeMode: (mode: HomeMobileChromeMode) => void;
  setHomeChromeScrolling: (scrolling: boolean) => void;
  setHomeSearchFocused: (focused: boolean) => void;
  setMobileNavMenuOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  homeMobileChromeMode: "full",
  isHomeChromeScrolling: false,
  isHomeSearchFocused: false,
  isMobileNavMenuOpen: false,
  isDarkMode:
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  setHomeMobileChromeMode: (mode) => set({ homeMobileChromeMode: mode }),
  setHomeChromeScrolling: (scrolling) =>
    set({ isHomeChromeScrolling: scrolling }),
  setHomeSearchFocused: (focused) => set({ isHomeSearchFocused: focused }),
  setMobileNavMenuOpen: (open) => set({ isMobileNavMenuOpen: open }),
  toggleDarkMode: () => {
    const isDarkMode = !get().isDarkMode;
    document.documentElement.classList.toggle("dark", isDarkMode);
    set({ isDarkMode });
    try {
      localStorage.setItem("savekaro:theme", isDarkMode ? "dark" : "light");
    } catch {
      // The selected theme remains active for the current page.
    }
  },
}));

export default useUiStore;

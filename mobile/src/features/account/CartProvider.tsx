import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Deal } from "@savekaro/contracts";
import { ActivityIndicator } from "react-native";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../providers/AuthProvider";

interface CartContextValue {
  items: Deal[];
  add: (deal: Deal) => void;
  remove: (id: string) => void;
  clear: () => void;
}
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const key = `savekaro:cart:${user?.id ?? "guest"}`;
  const previousKey = useRef(key);
  const [state, setState] = useState<{ key: string; items: Deal[] } | null>(
    null,
  );
  const items = state?.key === key ? state.items : [];

  useEffect(() => {
    let cancelled = false;
    if (
      previousKey.current !== key &&
      previousKey.current !== "savekaro:cart:guest"
    ) {
      void AsyncStorage.removeItem(previousKey.current).catch(() => {});
    }
    previousKey.current = key;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled) return;
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const cached = Array.isArray(parsed)
          ? parsed
              .filter(
                (item): item is Deal =>
                  !!item &&
                  typeof item === "object" &&
                  typeof item.id === "string" &&
                  typeof item.title === "string" &&
                  typeof item.productUrl === "string",
              )
              .slice(0, 100)
          : [];
        setState({ key, items: cached });
      })
      .catch(() => {
        if (!cancelled) setState({ key, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (state?.key === key)
      void AsyncStorage.setItem(key, JSON.stringify(state.items)).catch(
        () => {},
      );
  }, [key, state]);

  function update(transform: (current: Deal[]) => Deal[]) {
    setState((current) =>
      current?.key === key ? { key, items: transform(current.items) } : current,
    );
  }
  // Do not accept cart actions until the current account's cart has loaded.
  if (state?.key !== key) return <ActivityIndicator style={{ flex: 1 }} />;
  return (
    <CartContext.Provider
      value={{
        items,
        add: (deal) =>
          update((current) =>
            [deal, ...current.filter((item) => item.id !== deal.id)].slice(
              0,
              100,
            ),
          ),
        remove: (id) =>
          update((current) => current.filter((item) => item.id !== id)),
        clear: () => update(() => []),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

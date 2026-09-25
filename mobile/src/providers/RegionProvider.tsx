import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DealRegion } from "@savekaro/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

const storageKey = "savekaro-region";
const validRegions = new Set<DealRegion>(["INDIA", "CANADA", "WORLD"]);

interface RegionContextValue {
  region: DealRegion;
  setRegion: (region: DealRegion) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function useRegion() {
  const value = useContext(RegionContext);
  if (!value) throw new Error("RegionProvider is missing");
  return value;
}

export default function RegionProvider({ children }: PropsWithChildren) {
  const [region, setRegionState] = useState<DealRegion>("INDIA");

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (active && validRegions.has(saved as DealRegion)) {
          setRegionState(saved as DealRegion);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setRegion = useCallback((next: DealRegion) => {
    setRegionState(next);
    void AsyncStorage.setItem(storageKey, next).catch(() => undefined);
  }, []);

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

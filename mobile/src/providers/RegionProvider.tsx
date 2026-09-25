import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DealRegion } from "@savekaro/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  const userSelectedRegion = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (
          active &&
          !userSelectedRegion.current &&
          validRegions.has(saved as DealRegion)
        ) {
          setRegionState(saved as DealRegion);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setRegion = useCallback((next: DealRegion) => {
    userSelectedRegion.current = true;
    setRegionState(next);
    void AsyncStorage.setItem(storageKey, next).catch(() => undefined);
  }, []);

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

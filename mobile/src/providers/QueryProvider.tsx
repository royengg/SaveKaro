import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  focusManager,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 120_000, gcTime: 86_400_000, retry: 1 },
    // Mutations fail while offline instead of resuming an unexpected action later.
    mutations: { retry: false, networkMode: "always" },
  },
});
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "savekaro-query-v1",
});
const persistedQueries = new Set([
  "deals",
  "home",
  "stats",
  "badges",
  "earned-badges",
  "challenges",
  "deal",
  "price-history",
  "categories",
  "saved",
  "alerts",
  "notifications",
  "leaderboard",
  "comments",
  "comment-replies",
  "submitted",
]);
export async function clearReadCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
  await persister.removeClient();
}
export async function clearPrivateReadCache() {
  const privateKeys = new Set([
    "saved",
    "alerts",
    "notifications",
    "submitted",
    "stats",
    "earned-badges",
  ]);
  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      privateKeys.has(String(query.queryKey[0])) ||
      (query.queryKey[0] === "deal" && !!query.queryKey[2]),
  };
  await queryClient.cancelQueries(filters);
  queryClient.removeQueries(filters);
}
export default function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const app = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    const network = NetInfo.addEventListener((state) =>
      onlineManager.setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      ),
    );
    return () => {
      app.remove();
      network();
    };
  }, []);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: `api-v1-app-1:${process.env.EXPO_PUBLIC_API_URL || "https://api.savekaro.online"}`,
        maxAge: 86_400_000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            persistedQueries.has(String(query.queryKey[0])),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient, type Persister, type PersistedClient } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";

/**
 * Custom IDB Persister for high-volume data.
 * Unlike localStorage, IndexedDB is async and has virtually no limit.
 */
const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set("jules-console-cache", client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>("jules-console-cache");
  },
  removeClient: async () => {
    await del("jules-console-cache");
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5-minute "stale" time (data is fresh for 5m)
      staleTime: 5 * 60 * 1000,
      // 24-hour "cache" time (data stays in DB for 24h)
      gcTime: 24 * 60 * 60 * 1000,
      // Prevents re-fetching if data is still fresh
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Setup background persistence
persistQueryClient({
  queryClient,
  persister: idbPersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // No implicit retries, including 401/409/422/429. Features opt in explicitly.
        retry: false,
      },
      mutations: { retry: false },
    },
  });
}

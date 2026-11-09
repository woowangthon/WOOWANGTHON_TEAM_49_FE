import { queryKeys } from "@/lib/query/keys";

export const authKeys = {
  me: (generation: number) => [...queryKeys.session(generation), "user"] as const,
};

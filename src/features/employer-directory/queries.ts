"use client";

import { useQuery } from "@tanstack/react-query";
import { mockEnabled } from "@/lib/config/mock";
import type { DirectoryEmployer } from "./models";

export function useEmployerDirectory() {
  return useQuery({
    queryKey: ["employer-directory", mockEnabled ? "example" : "unconnected"],
    queryFn: async (): Promise<{ example: boolean; items: DirectoryEmployer[] }> => {
      if (!mockEnabled) return { example: false, items: [] };
      const { demoEmployers } = await import("./demo-data");
      return { example: true, items: demoEmployers };
    },
    staleTime: Infinity,
  });
}

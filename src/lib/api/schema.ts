import { z } from "zod";

import { protocolError } from "./response";

export function decodeWith<T>(schema: z.ZodType<T>) {
  return (value: unknown): T => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw protocolError();
    return parsed.data;
  };
}

export function pageSchema<T>(item: z.ZodType<T>) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    size: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
  });
}

export interface PaginationInput { page: number; size: number }
export function paginationSearch(input: PaginationInput): string {
  return new URLSearchParams({ page: String(input.page), size: String(input.size) }).toString();
}

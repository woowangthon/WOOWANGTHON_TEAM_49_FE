import { z } from "zod";

import { protocolError } from "./response";

export function decodeWith<T>(schema: z.ZodType<T>) {
  return (value: unknown): T => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const error = protocolError(0, "dto");
      error.diagnostic!.issues = parsed.error.issues.map(issue => {
        let actual: unknown = value;
        for (const key of issue.path) actual = actual !== null && typeof actual === "object" ? Reflect.get(actual, key) : undefined;
        const allowed = new Set<string>();
        const visited = new Set<z.ZodType>();
        const collect = (node:z.ZodType) => {
          if(visited.has(node)) return;
          visited.add(node);
          if(node instanceof z.ZodObject) { for(const [key, child] of Object.entries(node.shape)) { allowed.add(key); collect(child as z.ZodType); } }
          else if(node instanceof z.ZodArray) collect(node.element as z.ZodType);
          else if(node instanceof z.ZodOptional || node instanceof z.ZodNullable) collect(node.unwrap() as z.ZodType);
        };
        collect(schema);
        return { path: issue.path.map(key => typeof key === "number" ? "*" : allowed.has(String(key)) ? String(key) : "*").join("."),
          expectedType: "expected" in issue ? String(issue.expected) : issue.code,
          actualType: actual === null ? "null" : Array.isArray(actual) ? "array" : typeof actual };
      });
      throw error;
    }
    return parsed.data;
  };
}

export function pageSchema<T>(item: z.ZodType<T>) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    size: z.number().int(),
    total: z.number().int(),
  });
}

export interface PaginationInput { page: number; size: number }
export function paginationSearch(input: PaginationInput): string {
  return new URLSearchParams({ page: String(input.page), size: String(input.size) }).toString();
}

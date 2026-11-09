import { queryKeys } from "./keys";

const root = (generation: number) => [...queryKeys.session(generation), "management"] as const;
export const businessKeys = {
  root,
  workplaces: (g: number) => [...root(g), "workplaces"] as const,
  workplaceLists: (g: number) => [...root(g), "workplaces", "lists"] as const,
  workplaceList: (g: number, page: number, size: number) => [...root(g), "workplaces", "lists", { page, size }] as const,
  workplace: (g: number, id: number) => [...root(g), "workplaces", "detail", id] as const,
  cases: (g: number) => [...root(g), "cases"] as const,
  caseLists: (g: number) => [...root(g), "cases", "lists"] as const,
  caseList: (g: number, page: number, size: number, workplaceId?: number) => [...root(g), "cases", "lists", { page, size, workplaceId }] as const,
  case: (g: number, id: number) => [...root(g), "cases", "detail", id] as const,
  impact: (g: number, id: number) => [...root(g), "cases", "detail", id, "deletion-impact"] as const,
};

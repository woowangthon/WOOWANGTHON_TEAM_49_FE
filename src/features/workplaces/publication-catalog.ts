import { z } from "zod";
import regionAliases from "./data/publication-region-aliases.json";

export const publicationSource = {
  year: 2025, publishedAt: "2026-01-29",
  pageUrl: "https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18907",
  pdfUrl: "https://www.moel.go.kr/common/downloadFile.do?bbs_id=12&bbs_seq=18907&file_ext=pdf&file_seq=20260101830",
} as const;
export const publicationCategories = ["FATALITIES", "FATALITY_RATE", "MAJOR_ACCIDENT", "CONCEALMENT", "NON_REPORTING", "CONTRACTOR_COMBINED", "LEGACY_MAJOR_ACCIDENT"] as const;
const recordSchema = z.object({
  id: z.string().min(1), category: z.enum(publicationCategories),
  name: z.string().min(1), address: z.string().min(1), industry: z.string().nullable(),
  incidentYear: z.number().int().min(1900).max(2024).nullable(),
  sourcePage: z.number().int().min(2).max(28),
});
export type PublicationRecord = z.infer<typeof recordSchema>;
// Local public reference data, deliberately separate from the Workplace API DTO.
const catalogSchema = z.object({
  publicationYear: z.literal(2025), publishedAt: z.literal("2026-01-29"),
  noticeNumber: z.literal("2026-60"), sourcePageCount: z.literal(28),
  sourceUrl: z.literal("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18907"),
  annexUrl: z.literal("https://www.moel.go.kr/common/downloadFile.do?bbs_id=12&bbs_seq=18907&file_ext=pdf&file_seq=20260101830"),
  categoryCounts: z.record(z.enum(publicationCategories), z.number().int().positive()),
  records: z.array(recordSchema).length(376),
}).superRefine((catalog, ctx) => {
  const ids = new Set<string>();
  for (const record of catalog.records) {
    if (ids.has(record.id)) ctx.addIssue({ code: "custom", message: "Duplicate source row" });
    ids.add(record.id);
  }
  for (const category of publicationCategories) {
    if (catalog.records.filter(record => record.category === category).length !== catalog.categoryCounts[category]) {
      ctx.addIssue({ code: "custom", message: "Incomplete publication category" });
    }
  }
});
export type PublicationCatalog = z.infer<typeof catalogSchema>;
export const parsePublicationCatalog = (input: unknown): PublicationCatalog => catalogSchema.parse(input);
export async function loadPublicationCatalog(): Promise<PublicationCatalog> {
  const data = await import("./data/industrial-accidents-2025.json");
  return parsePublicationCatalog(data.default);
}

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko")
    .replace(/주식회사|유한회사|농업회사법인|\(주\)|\(유\)/g, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}
function normalizeRegion(value: string) {
  let region = normalize(value);
  for (const [from, to] of Object.entries(regionAliases)) region = region.replaceAll(from, to);
  return region;
}
export function searchPublication(catalog: PublicationCatalog, name: string, region: string) {
  const query = normalize(name);
  const area = normalizeRegion(region);
  // Empty names and corporate-form-only inputs must never expose the whole list.
  if (!query) return [];
  return catalog.records.filter(record => normalize(record.name).includes(query) && (!area || normalizeRegion(record.address).includes(area)));
}

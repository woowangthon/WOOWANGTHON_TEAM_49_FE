import { describe, expect, it } from "vitest";
import data from "./data/industrial-accidents-2025.json";
import { loadPublicationCatalog, parsePublicationCatalog, searchPublication } from "./publication-catalog";

describe("the supplied 2025 occupational accident publication", () => {
  it("contains every annex entry and the seven press-release category totals", async () => {
    const catalog = await loadPublicationCatalog();
    expect(catalog.records).toHaveLength(376);
    expect(new Set(catalog.records.map(record => record.id)).size).toBe(376);
    expect(catalog.categoryCounts).toEqual({ FATALITIES: 11, FATALITY_RATE: 329, MAJOR_ACCIDENT: 7, CONCEALMENT: 2, NON_REPORTING: 9, CONTRACTOR_COMBINED: 2, LEGACY_MAJOR_ACCIDENT: 16 });
    for (const [year, count] of [[2024, 50], [2023, 152], [2022, 84], [2021, 26], [2020, 11], [2019, 6]]) {
      expect(catalog.records.filter(record => record.category === "FATALITY_RATE" && record.incidentYear === year)).toHaveLength(count);
    }
    expect(catalog.publicationYear).toBe(2025);
    expect(catalog.publishedAt).toBe("2026-01-29");
  });
  it("preserves source contractor roles, worksites, page numbers and unknown occurrence years", () => {
    const catalog = parsePublicationCatalog(data);
    const record = catalog.records.find(record => record.id === "p2-t1-r1")!;
    expect(record.name).toContain("바론건설㈜(구, 기성건설주식회사)(원청)");
    expect(record.name).toContain("㈜대신이엔씨(하청)");
    expect(record.name).toContain("안성아양지구폴리프라자신축공사");
    expect(record.address).toContain("경기 안성시 옥산동 593번지");
    expect(record.sourcePage).toBe(2);
    expect(record.incidentYear).toBe(2023);
    expect(catalog.records.filter(record => ["CONCEALMENT", "NON_REPORTING"].includes(record.category)).every(record => record.incidentYear === null)).toBe(true);
  });
  it("finds names across corporate forms and PDF line breaks and filters long region names", () => {
    const catalog = parsePublicationCatalog(data);
    const results = searchPublication(catalog, "(주) 포스플레이트", "전라남도 광양시");
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("CONCEALMENT");
    expect(searchPublication(catalog, "에이치디현대중공업", "울산광역시").length).toBeGreaterThan(5);
    expect(searchPublication(catalog, "포스플레이트", "서울특별시")).toHaveLength(0);
    for (const name of ["", "  ", "주식회사", "㈜", "(주)"]) expect(searchPublication(catalog, name, "")).toHaveLength(0);
  });
  it("rejects an incomplete or corrupted catalog instead of showing a false no-match result", () => {
    expect(() => parsePublicationCatalog({ ...data, records: data.records.slice(1) })).toThrow();
    expect(() => parsePublicationCatalog({ ...data, records: data.records.map((row, index) => index === 0 ? { ...row, sourcePage: 0 } : row) })).toThrow();
    expect(() => parsePublicationCatalog({ ...data, categoryCounts: { ...data.categoryCounts, FATALITIES: 12 } })).toThrow();
  });
});

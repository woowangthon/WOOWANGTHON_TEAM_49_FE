export type DisclosureStatus = "listed" | "not-listed" | "unavailable" | "unverified" | "error";

export interface Disclosure {
  status: DisclosureStatus;
  note: string;
  checkedOn?: string;
  publicationPeriod?: string;
}

/** UI read model. Public data ingestion and employer matching need a backend contract. */
export interface DirectoryEmployer {
  id: string;
  name: string;
  region: string;
  address: string;
  industry: string;
  products: string;
  foreignEmployees: string | null;
  referenceDate: string;
  sourceName: string;
  sourceUrl: string;
  wageDisclosure: Disclosure;
  safetyDisclosure: Disclosure;
}

export interface DirectoryFilters {
  q: string;
  region: string;
  industry: string;
  page: number;
}

export const pageSize = 5;
export const regions = ["경남 김해시", "충청북도", "충청남도", "부산 영도구"];
export const industries = ["금속가공", "플라스틱 제조", "기계 제조", "식품 제조"];

export const officialSources = {
  wages: "https://moel.go.kr/info/defaulter/defaulterList.do",
  safety: "https://moel.go.kr/info/publict/publictDataView.do?bbs_seq=20260101157",
};

export function parseDirectoryFilters(params: Record<string, string | string[] | undefined>): DirectoryFilters {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const page = Number(value("page"));
  return {
    q: value("q").trim().slice(0, 100),
    region: regions.includes(value("region")) ? value("region") : "",
    industry: industries.includes(value("industry")) ? value("industry") : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function directoryHref(filters: DirectoryFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.region) params.set("region", filters.region);
  if (filters.industry) params.set("industry", filters.industry);
  if (page > 1) params.set("page", String(page));
  return `/employers${params.size ? `?${params}` : ""}`;
}

export function directoryBackHref(from: string | string[] | undefined) {
  if (typeof from !== "string" || !from.startsWith("/employers?")) return "/employers";
  const filters = parseDirectoryFilters(Object.fromEntries(new URLSearchParams(from.slice("/employers?".length))));
  return directoryHref(filters, filters.page);
}

export function filterEmployers(items: DirectoryEmployer[], filters: DirectoryFilters) {
  const keyword = filters.q.replace(/\s/g, "").toLocaleLowerCase("ko-KR");
  return items.filter(item =>
    (!keyword || (item.name + item.address).replace(/\s/g, "").toLocaleLowerCase("ko-KR").includes(keyword))
    && (!filters.region || item.region === filters.region)
    && (!filters.industry || item.industry === filters.industry));
}

export const disclosureLabels: Record<DisclosureStatus, string> = {
  listed: "공표 대상",
  "not-listed": "공표 미대상",
  unavailable: "조회 불가",
  unverified: "확인 전",
  error: "조회 오류",
};

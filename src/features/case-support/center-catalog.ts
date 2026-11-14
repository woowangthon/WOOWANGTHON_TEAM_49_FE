import research from './data/consultation-centers.json';

// Public research records are intentionally separate from the server Center DTO.
export type ResearchedCenter = typeof research.institutions[number];
export type CenterGroup = 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';
export type CenterReach = 'PHONE' | 'ONLINE' | 'OFFICE';
const groups: Record<string, CenterGroup> = {
  'youth-union': 'COMMUNITY', gabjil119: 'COMMUNITY',
  dolbloom: 'PRIVATE', nodonglife: 'PRIVATE', 'moeum-labor-magok': 'PRIVATE',
};
const remote: Record<string, CenterReach> = {
  'moel-1350': 'PHONE', 'klac-132': 'PHONE',
  'hrdk-foreign-worker-counseling': 'PHONE', gabjil119: 'ONLINE',
};
export const centerCatalog = research.institutions;
export const catalogCheckedAt = research.metadata.checkedAt;
export const centerGroup = (center: ResearchedCenter): CenterGroup => groups[center.researchId] ?? 'PUBLIC';
export const centerReach = (center: ResearchedCenter): CenterReach => remote[center.researchId] ?? 'OFFICE';

export function filterCatalog(region: string, group: CenterGroup | '') {
  const term = region.normalize('NFKC').replace(/\s/g, '').toLocaleLowerCase();
  return centerCatalog.filter(center => (!group || centerGroup(center) === group) &&
    (!term || centerReach(center) !== 'OFFICE' ||
      center.officeRegion?.normalize('NFKC').replace(/\s/g, '').toLocaleLowerCase().includes(term)));
}

export function safeEmail(value?: string | null) {
  return value && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
    ? `mailto:${encodeURIComponent(value).replace('%40', '@')}` : undefined;
}

export function safeWebsite(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function safePhone(value?: string | null) {
  return value && /^\+?[0-9][0-9 ()-]{2,24}$/.test(value)
    ? `tel:${value.replace(/[ ()-]/g, "")}` : undefined;
}

export function addressSearch(center: ResearchedCenter) {
  // Phone-only services and multiple counseling offices are not one walk-in location.
  if (!center.address || centerReach(center) !== 'OFFICE' || center.address.includes(' / ')) return undefined;
  return `https://map.naver.com/p/search/${encodeURIComponent(center.address)}`;
}

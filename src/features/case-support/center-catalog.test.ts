import { expect, it } from 'vitest';
import { addressSearch, centerCatalog, filterCatalog, safeEmail } from './center-catalog';

it('preserves research identifiers, unknown contacts and provider type filtering',()=>{
 expect(centerCatalog).toHaveLength(12);
 expect(new Set(centerCatalog.map(c=>c.researchId)).size).toBe(12);
 expect(centerCatalog.every(c=>!('centerId' in c))).toBe(true);
 expect(centerCatalog.find(c=>c.researchId==='gabjil119')?.phone).toBeNull();
 expect(filterCatalog('')).toHaveLength(12);
 expect(filterCatalog('PUBLIC')).toHaveLength(7);
 expect(filterCatalog('COMMUNITY')).toHaveLength(2);
 expect(filterCatalog('PRIVATE')).toHaveLength(3);
 for(const id of ['moel-1350','klac-132','gyeonggi-labor-rights-center','gabjil119'])expect(addressSearch(centerCatalog.find(c=>c.researchId===id)!)).toBeUndefined();
 expect(addressSearch(centerCatalog.find(c=>c.researchId==='dolbloom')!)).toContain(encodeURIComponent('서울특별시 서대문구'));
 expect(safeEmail('person@example.org\r\nBcc:private@example.org')).toBeUndefined();
 expect(safeEmail('person?subject=bad@example.org')).not.toContain('?subject=');
});

import { expect, it } from 'vitest';
import { addressSearch, centerCatalog, filterCatalog, safeEmail } from './center-catalog';

it('preserves research identifiers and unknown contacts, with remote alternatives independent of office locations',()=>{
 expect(centerCatalog).toHaveLength(12);
 expect(new Set(centerCatalog.map(c=>c.researchId)).size).toBe(12);
 expect(centerCatalog.every(c=>!('centerId' in c))).toBe(true);
 expect(centerCatalog.find(c=>c.researchId==='gabjil119')?.phone).toBeNull();
 expect(filterCatalog('제주','').map(c=>c.researchId)).toEqual(['moel-1350','klac-132','hrdk-foreign-worker-counseling','gabjil119']);
 expect(filterCatalog('서울','PRIVATE')).toHaveLength(3);
 for(const id of ['moel-1350','klac-132','gyeonggi-labor-rights-center','gabjil119'])expect(addressSearch(centerCatalog.find(c=>c.researchId===id)!)).toBeUndefined();
 expect(addressSearch(centerCatalog.find(c=>c.researchId==='dolbloom')!)).toContain(encodeURIComponent('서울특별시 서대문구'));
 expect(safeEmail('person@example.org\r\nBcc:private@example.org')).toBeUndefined();
 expect(safeEmail('person?subject=bad@example.org')).not.toContain('?subject=');
});

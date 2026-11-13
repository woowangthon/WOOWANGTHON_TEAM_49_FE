import { describe, expect, it } from 'vitest';
import {deletionSchema, deletionPollInterval, createLocalizedFeaturesAuthDeletion} from './deletion';
import {createTranslation} from '@/i18n/translate';
const {deletionDescription}=createLocalizedFeaturesAuthDeletion(createTranslation('ko'));
describe('conditional receipt adapter',()=>{
 it('accepts missing optional fields',()=>expect(deletionSchema.parse({})).toEqual({}));
 it('preserves null schedule',()=>expect(deletionSchema.parse({normalStoragePurgeDueAt:null}).normalStoragePurgeDueAt).toBeNull());
 it.each([null,[],{status:4},{normalStoragePurgeDueAt:'tomorrow'}])('rejects malformed data %j',data=>expect(deletionSchema.safeParse(data).success).toBe(false));
 it('only polls the documented conditional pending state',()=>{expect(deletionPollInterval({status:'PENDING_PURGE'},null)).toBe(5000);for(const status of ['PURGED','LEGAL_HOLD','NEW_STATUS','FAILED'])expect(deletionPollInterval({status},null)).toBe(false);expect(deletionPollInterval({status:'PENDING_PURGE'},Error())).toBe(false)});
 it('unknown enum never implies completion',()=>expect(deletionDescription({status:'NEW_STATUS'})).toBe(deletionDescription({})));
});

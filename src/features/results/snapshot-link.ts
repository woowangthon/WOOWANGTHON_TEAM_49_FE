import { parseRouteId } from '@/lib/route-id';
export const snapshotKinds={calculation:{endpoint:'calculations',id:'calculationId'},comparison:{endpoint:'comparisons',id:'comparisonId'},payslipValidation:{endpoint:'payslip-validations',id:'validationId'},depositComparison:{endpoint:'deposit-comparisons',id:'depositComparisonId'}} as const;
export type SnapshotKind=keyof typeof snapshotKinds;
export function snapshotKind(type:string):SnapshotKind|undefined {
 const aliases=({CALCULATION:'calculation',COMPARISON:'comparison',PAYSLIP_VALIDATION:'payslipValidation',DEPOSIT_COMPARISON:'depositComparison',calculation:'calculation',comparison:'comparison',payslipValidation:'payslipValidation',depositComparison:'depositComparison'} as Record<string,SnapshotKind>);return Object.hasOwn(aliases,type)?aliases[type]:undefined;
}
export function safeChatReturn(value:unknown):string|undefined{return typeof value==='string'&&/^\/workplaces\/[1-9]\d*\/chats\/[1-9]\d*$/.test(value)?value:undefined;}
export function snapshotHref(caseId:number,ref:{type:string;snapshotId:number;version:number},returnTo?:string){const q=new URLSearchParams({snapshotType:ref.type,snapshotId:String(ref.snapshotId),snapshotVersion:String(ref.version)});const back=safeChatReturn(returnTo);if(back)q.set('returnTo',back);return `/cases/${caseId}/result?${q}`;}
export function parseSnapshot(q:Record<string,string|string[]|undefined>){if(!q.snapshotType&&!q.snapshotId&&!q.snapshotVersion)return undefined;const kind=typeof q.snapshotType==='string'?snapshotKind(q.snapshotType):undefined;const id=typeof q.snapshotId==='string'?parseRouteId(q.snapshotId):null;const version=typeof q.snapshotVersion==='string'?parseRouteId(q.snapshotVersion):null;return kind&&id&&version?{kind,id,version}:null;}

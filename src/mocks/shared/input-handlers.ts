import { paymentMocks } from "./payment-handlers";
import { http, HttpResponse } from "msw";
import type { CaseDetailDto } from "@/features/cases/schemas";
import { conditionsPutSchema, manualInputSchema, checkTypes, type Condition, type ManualRecord, type RecordType } from "@/features/case-inputs/schemas";
import { manualDefaults, manualFormSchema } from "@/features/case-inputs/manual-fields";
import { buildResultScenario, type MockEvidence } from "./result-scenario";
import type { DepositComparison } from "@/features/payments/comparison-schemas";
import type { Results } from "@/features/results/schemas";
import { apiResponse } from "./response";

/** Synthetic readiness policy for development/tests only; never an official wage engine. */
export function inputMocks(getCases: () => CaseDetailDto[], baseUrl = "http://127.0.0.1:8000/api/v1", getEvidence: (c:number)=>MockEvidence[] = ()=>[]) {
  const states = new WeakMap<CaseDetailDto, ReturnType<typeof initialState>>();
  let nextRecord = 1, nextJob = 1;
  const jobs = new Map<string, NonNullable<ReturnType<typeof initialState>["job"]>>();
  const requests: { method: string; path: string; body?: unknown }[] = [];
  const definitions: Pick<Condition, "conditionId" | "question" | "type" | "options" | "requiredFor">[] = [
    { conditionId: "workplace_size", question: "상시 근로자 수를 알고 있나요?", type: "SELECT", options: ["LESS_THAN_5", "AT_LEAST_5", "UNKNOWN"], requiredFor: ["WAGE_CALCULATION"] },
    { conditionId: "regular_minutes", question: "이 기간의 소정근로시간은 몇 분인가요?", type: "NUMBER", requiredFor: ["WAGE_CALCULATION"] },
    { conditionId: "base_scope_confirmed", question: "임금의 기본 적용 범위를 확인했나요?", type: "BOOLEAN", requiredFor: ["WAGE_CALCULATION"] },
    { conditionId: "comparison_basis_confirmed", question: "시급의 기간과 의미가 일치하나요?", type: "BOOLEAN", requiredFor: ["CONTRACT_ATTENDANCE_COMPARISON"] },
    { conditionId: "hours_basis_confirmed", question: "실근로시간의 기간과 의미가 일치하나요?", type: "BOOLEAN", requiredFor: ["CONTRACT_ATTENDANCE_COMPARISON"] },
    { conditionId: "base_pay_basis_confirmed", question: "기본급의 기간과 의미가 일치하나요?", type: "BOOLEAN", requiredFor: ["CONTRACT_ATTENDANCE_COMPARISON"] },
  ];
  function initialState(c: CaseDetailDto) {
    return { records: [] as ManualRecord[], transactions: [] as { transactionId: number; allocationId: number; data: ManualRecord["data"] }[], conditions: definitions.map(d => ({ ...d, value: null, status: "REQUIRED", source: null } as Condition)), observedVersion: c.inputVersion, job: null as null | { jobId: string; status: string; requestedInputVersion: number; errorCode: string | null }, polls: 0, resultVersion: 0, snapshotInputVersion:c.inputVersion, target:"recompute" };
  }
  function state(c: CaseDetailDto) { if (!states.has(c)) states.set(c, initialState(c)); return states.get(c)!; }
  getCases().forEach(c => state(c));
  const current = (id: unknown) => getCases().find(c => c.caseId === Number(id));
  const missing = () => apiResponse({ errorCode: "RESOURCE_NOT_FOUND" }, 404);
  const error = (code: string, status: number) => apiResponse({ errorCode: code }, status);
  function schedule(c: CaseDetailDto, increment = true, paymentOnly = false) {
    const s = state(c); result(c);
    if (paymentOnly && s.job && ["PENDING","RUNNING"].includes(s.job.status) && s.target!=="deposit") paymentOnly=false;
    if (increment) c.inputVersion++;
    if(s.job && ["PENDING","RUNNING"].includes(s.job.status))s.job.status="SUPERSEDED";
    s.observedVersion = c.inputVersion; s.polls = 0;s.target=paymentOnly?"deposit":"recompute";
    s.job = { jobId: `case-${c.caseId}-input-job-${nextJob++}`, requestedInputVersion: c.inputVersion, status: "PENDING", errorCode: null };
    jobs.set(s.job.jobId,s.job);
    return { inputVersion: c.inputVersion, recompute: { scheduled: true, jobId: s.job.jobId, affectedChecks: paymentOnly?["DEPOSIT_COMPARISON"]:[...checkTypes] } };
  }
  const parseManual = async (request: Request, c: CaseDetailDto, recordId?: number) => {
    const body = await request.json() as { recordType: RecordType; data: ManualRecord["data"]; source: string };
    requests.push({ method: request.method, path: new URL(request.url).pathname, body });
    const payload = manualInputSchema.safeParse(body);
    if (!payload.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: payload.error.issues.map(i => ({ field: i.path.join("."), reason: i.message })) }, 422);
    if (!body.data || !["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"].includes(body.recordType) || body.source !== "USER_INPUT") return error("VALIDATION_ERROR", 422);
    result(c); const s = state(c); const old = s.records.find(r => r.recordId === recordId);
    if (recordId && !old) return missing();
    if (old && old.recordType !== body.recordType) return error("VALIDATION_ERROR", 422);
    const fields = manualFormSchema(body.recordType, c.periodStart, c.periodEnd).safeParse(manualDefaults(body.recordType, body.data));
    if (!fields.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: fields.error.issues.map(i => ({ field: `data.${String(i.path.at(-1))}`, reason: i.message })) }, 422);
    if (body.recordType === "DEPOSIT") {
      const transaction = { ...payments.manual(c,body.data), data: structuredClone(body.data) }; s.transactions.push(transaction);
      return apiResponse({ recordId: null, canonicalResource: "PAYMENT_TRANSACTION", transactionId: transaction.transactionId, allocationId: transaction.allocationId, ...schedule(c,true,true) }, 201);
    }
    const now = new Date().toISOString();
    const record: ManualRecord = { recordId: old?.recordId ?? nextRecord++, caseId: c.caseId, recordType: body.recordType, data: structuredClone(body.data), source: "USER_INPUT", createdAt: old?.createdAt ?? now, updatedAt: now };
    if (old) Object.assign(old, record); else s.records.push(record);
    return apiResponse({ ...record, ...schedule(c) }, old ? 200 : 201);
  };
  const snapshots = new WeakMap<CaseDetailDto, Results[]>();
  const history = (c:CaseDetailDto) => {if(!snapshots.has(c))snapshots.set(c,[]);return snapshots.get(c)!;};
  function freshness(c:CaseDetailDto):"CURRENT"|"STALE"|"UPDATING"|"FAILED" {
    const s=state(c);
    if(s.observedVersion!==c.inputVersion)return "STALE";
    if(s.job?.status==="FAILED")return "FAILED";
    if(s.job?.status==="PENDING" || s.job?.status==="SUPERSEDED")return "STALE";
    if(s.job?.status==="RUNNING")return "UPDATING";
    return "CURRENT";
  }
  function publish(c:CaseDetailDto) {
    const s=state(c);s.resultVersion++;s.snapshotInputVersion=c.inputVersion;
    const next=buildResultScenario(c,s.resultVersion,s.records,s.conditions,getEvidence(c.caseId));
    const previous=history(c)[0];
    if(previous && s.target!=="recompute") {
      const target={calculations:"calculation",comparisons:"comparison","payslip-validations":"payslipValidation"}[s.target];
      if(target!=="calculation")next.calculation=previous.calculation;
      if(target!=="comparison")next.comparison=previous.comparison;
      if(target!=="payslipValidation")next.payslipValidation=previous.payslipValidation;
      for(const key of ["calculation","comparison","payslipValidation"] as const)if(key!==target)next.versions[key]=previous.versions[key];
    }
    if(s.target==="deposit"&&previous){next.calculation=previous.calculation;next.comparison=previous.comparison;next.payslipValidation=previous.payslipValidation;for(const key of ["calculation","comparison","payslipValidation"])next.versions[key]=previous.versions[key];}
    const deposit=buildDeposit(c);depositHistory(c).unshift(deposit);next.depositComparison=deposit;next.versions.depositComparison={snapshotId:deposit.depositComparisonId,version:deposit.version,inputVersion:c.inputVersion,createdAt:deposit.createdAt!,freshness:"CURRENT"};
    history(c).unshift(structuredClone(next));
  }
  function result(c:CaseDetailDto) {
    const s=state(c);const list=history(c);
    if(!list.length){const initial=freshness(c)==="CURRENT";
      list.push(buildResultScenario({...c,inputVersion:s.snapshotInputVersion},s.resultVersion,initial?s.records:[],initial?s.conditions:[],initial?getEvidence(c.caseId):[]));}
    const deposits=depositHistory(c);if(!deposits.length)deposits.push(buildDeposit(c));
    const snapshot=deposits[0];list[0].versions.depositComparison={snapshotId:snapshot.depositComparisonId,version:snapshot.version,inputVersion:snapshot.basedOnInputVersion!,createdAt:snapshot.createdAt!,freshness:"CURRENT"}; const current=freshness(c),active=s.job && ["PENDING","RUNNING"].includes(s.job.status);
    return {...list[0],depositComparison:{...deposits[0],freshness:current},currentInputVersion:c.inputVersion,freshness:{overall:current,hasOutdatedResults:current!=="CURRENT",activeJobId:active?s.job!.jobId:null},versions:Object.fromEntries(Object.entries(list[0].versions).map(([k,v])=>[k,{...v,freshness:s.target==="deposit"&&k!=="depositComparison"?v.freshness:current}]))};
  }
  function completion(c:CaseDetailDto) {
    const s=state(c);const p=buildResultScenario(c,s.resultVersion,s.records,s.conditions,getEvidence(c.caseId)).payslipValidation;
    return s.target==="payslip-validations" && [p?.paymentTotal.status,p?.deductionTotal.status,p?.netPay.status].every(v=>v==="MATCH"||v==="DIFFERENCE")?"SUCCEEDED":"PARTIAL";
  }
  const payments=paymentMocks(getCases,baseUrl,c=>schedule(c,true,true));
  const depositSnapshots=new WeakMap<CaseDetailDto,DepositComparison[]>();
  function depositHistory(c:CaseDetailDto){if(!depositSnapshots.has(c))depositSnapshots.set(c,[]);return depositSnapshots.get(c)!;}
  function buildDeposit(c:CaseDetailDto):DepositComparison {
    const links=payments.allocations.filter(a=>a.caseId===c.caseId);
    const records=state(c).records;const payslip=records.find(r=>r.recordType==="PAYSLIP");
    const evidenceValues=getEvidence(c.caseId).flatMap(e=>e.fields).filter(f=>f.key==="netPay"&&f.status==="CONFIRMED");const evidence=evidenceValues.length===1?evidenceValues[0]:undefined;
    const net=typeof payslip?.data.netPay==="number"?payslip.data.netPay:typeof evidence?.value==="number"?evidence.value:null;
    const total=(method:string)=>links.filter(a=>payments.transactions.find(t=>t.transactionId===a.transactionId)?.paymentMethod===method).reduce((sum,a)=>sum+a.allocatedAmount,0);
    const bank=links.length?total("BANK_TRANSFER"):null,cash=links.length?total("CASH"):null,linked=bank===null||cash===null?null:bank+cash;
    const review=(!payslip && evidenceValues.length>1) || links.some(a=>!["USER_REPORTED","DOCUMENT_SUPPORTED"].includes(payments.transactions.find(t=>t.transactionId===a.transactionId)?.confirmationStatus??""));
    const difference=net===null||linked===null?null:net-linked;
    const version=depositHistory(c).length+1;
    return {depositComparisonId:c.caseId*10000+version,version,basedOnInputVersion:c.inputVersion,createdAt:new Date().toISOString(),freshness:"CURRENT",payslipNetPay:net,linkedBankDepositTotal:bank,linkedCashPaymentTotal:cash,linkedPaymentTotal:linked,difference,status:review?"REVIEW_REQUIRED":difference===null?"INSUFFICIENT_INFORMATION":difference===0?"MATCH":"DIFFERENCE"};
  }
  const handlers = [...payments.handlers,
    http.get(`${baseUrl}/cases/:c/deposit-comparison`,({params})=>{const c=current(params.c);if(!c)return missing();result(c);return apiResponse({...depositHistory(c)[0],freshness:freshness(c)});}),
    http.get(`${baseUrl}/cases/:c/deposit-comparisons`,({params,request})=>{const c=current(params.c);if(!c)return missing();result(c);const page=Math.max(1,Number(new URL(request.url).searchParams.get("page")??1));const items=depositHistory(c);return apiResponse({items:items.slice((page-1)*20,page*20),page,size:20,total:items.length});}),
    http.get(`${baseUrl}/cases/:c/recompute-jobs/:jobId`,({params})=>{const c=current(params.c);if(!c)return missing();const job=jobs.get(String(params.jobId));return job && job.jobId.startsWith(`case-${c.caseId}-`)?apiResponse(job):missing();}),

    ...(["calculations","comparisons","payslip-validations"] as const).map(endpoint=>http.get(`${baseUrl}/cases/:c/${endpoint}`,({params,request})=>{const c=current(params.c);if(!c)return missing();result(c);const key={calculations:"calculation",comparisons:"comparison","payslip-validations":"payslipValidation"}[endpoint];const items=(snapshots.get(c)??[]).map(v=>v[key as "calculation"|"comparison"|"payslipValidation"]).filter(v=>v!==null).filter((v,i,list)=>list.findIndex(other=>other?.version===v?.version)===i);const q=new URL(request.url).searchParams;const page=Math.max(1,Number(q.get("page")??1)),size=Math.min(100,Math.max(1,Number(q.get("size")??20)));return apiResponse({items:items.slice((page-1)*size,page*size),page,size,total:items.length});})),
    http.get(`${baseUrl}/cases/:c/calculations/:id`,({params})=>{const c=current(params.c);if(!c)return missing();result(c);const found=(snapshots.get(c)??[]).flatMap(v=>v.calculation?[v.calculation]:[]).find(v=>v.calculationId===Number(params.id));return found?apiResponse(found):missing();}),

    ...["recompute","calculations","comparisons","payslip-validations"].map(endpoint=>http.post(`${baseUrl}/cases/:c/${endpoint}`,async({params,request})=>{const c=current(params.c);if(!c)return missing();const body=await request.json() as {expectedInputVersion?:number};if(body.expectedInputVersion!==c.inputVersion)return error("INPUT_VERSION_CONFLICT",409);const s=state(c);if(s.job && ["PENDING","RUNNING"].includes(s.job.status))return apiResponse({},409);const scenario=buildResultScenario(c,s.resultVersion,s.records,s.conditions,getEvidence(c.caseId));
      if(endpoint==="calculations" && scenario.calculation?.calculatedSubtotal===null)return error("CALCULATION_NOT_READY",409);
      if(endpoint==="comparisons" && scenario.summary.comparisonStatus==="INSUFFICIENT_INFORMATION")return error("CALCULATION_NOT_READY",409);
      if(endpoint==="payslip-validations" && [scenario.payslipValidation?.paymentTotal,scenario.payslipValidation?.deductionTotal,scenario.payslipValidation?.netPay].every(v=>v?.status==="INSUFFICIENT_INFORMATION"))return error("CALCULATION_NOT_READY",409);
      result(c);schedule(c,false);s.target=endpoint;return apiResponse({...s.job},202);})),

    http.get(`${baseUrl}/cases/:c/results`, ({params})=> { const c=current(params.c); return c?apiResponse(result(c)):missing(); }),

    http.get(`${baseUrl}/cases/:c/manual-records`, ({ request, params }) => {
      const c = current(params.c); if (!c) return missing();
      const q = new URL(request.url).searchParams; const page = Math.max(1, Number(q.get("page") ?? 1)), size = Math.min(100, Math.max(1, Number(q.get("size") ?? 20)));
      const records = state(c).records;
      return apiResponse({ items: records.slice((page - 1) * size, page * size), page, size, total: records.length });
    }),
    http.post(`${baseUrl}/cases/:c/manual-records`, ({ request, params }) => { const c = current(params.c); return c ? parseManual(request, c) : missing(); }),
    http.get(`${baseUrl}/cases/:c/manual-records/:r`, ({ params }) => {
      const c = current(params.c); const r = c && state(c).records.find(r => r.recordId === Number(params.r)); return r ? apiResponse(r) : missing();
    }),
    http.patch(`${baseUrl}/cases/:c/manual-records/:r`, ({ request, params }) => { const c = current(params.c); return c ? parseManual(request, c, Number(params.r)) : missing(); }),
    http.delete(`${baseUrl}/cases/:c/manual-records/:r`, ({ params, request }) => {
      const c = current(params.c); if (!c) return missing(); const s = state(c); const index = s.records.findIndex(r => r.recordId === Number(params.r)); if (index < 0) return missing();
      result(c); requests.push({ method: request.method, path: new URL(request.url).pathname }); s.records.splice(index, 1); schedule(c); return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${baseUrl}/cases/:c/conditions`, ({ params }) => { const c = current(params.c); return c ? apiResponse({ conditions: state(c).conditions, inputVersion: c.inputVersion }) : missing(); }),
    http.put(`${baseUrl}/cases/:c/conditions`, async ({ request, params }) => {
      const c = current(params.c); if (!c) return missing(); const body = await request.json(); requests.push({ method: request.method, path: new URL(request.url).pathname, body });
      const parsed = conditionsPutSchema.safeParse(body); if (!parsed.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: parsed.error.issues.map(i => ({ field: i.path.join("."), reason: i.message })) }, 422);
      if (parsed.data.expectedInputVersion !== c.inputVersion) return apiResponse({ errorCode: "INPUT_VERSION_CONFLICT", details: { currentInputVersion: c.inputVersion, expectedInputVersion: parsed.data.expectedInputVersion } }, 409);
      result(c); const s = state(c); parsed.data.answers.forEach(a => { const condition = s.conditions.find(v => v.conditionId === a.conditionId)!; condition.value = a.value; condition.status = a.value === "UNKNOWN" ? "UNKNOWN" : "ANSWERED"; });
      return apiResponse(schedule(c));
    }),
    http.get(`${baseUrl}/cases/:c/readiness`, ({ params }) => {
      const c = current(params.c); if (!c) return missing(); const s = state(c);
      const contract = s.records.find(r => r.recordType === "CONTRACT"); const attendance = s.records.some(r => r.recordType === "ATTENDANCE"); const payslip = s.records.find(r => r.recordType === "PAYSLIP");
      const answer = (id: string) => s.conditions.find(v => v.conditionId === id)?.value;
      const contractWage = !!contract && (typeof contract.data.hourlyWage === "number" || typeof contract.data.monthlyBasePay === "number");
      const wage = contractWage && typeof answer("regular_minutes") === "number";
      const comparison = contractWage && attendance && ["comparison_basis_confirmed", "hours_basis_confirmed", "base_pay_basis_confirmed"].every(id => answer(id) === true);
      const fullPayslip = !!payslip && ["grossPay", "totalDeductions", "netPay"].every(k => typeof payslip.data[k] === "number") && Array.isArray(payslip.data.paymentItems) && Array.isArray(payslip.data.deductionItems);
      const partialPayslip = !!payslip && ["grossPay", "totalDeductions", "netPay", "paymentItems", "deductionItems"].some(k => typeof payslip.data[k] === "number" || Array.isArray(payslip.data[k]));
      const deposit = buildDeposit(c).payslipNetPay!==null && payments.allocations.some(a=>a.caseId===c.caseId);
      const checks = [
        { checkType: checkTypes[0], available: !!wage, mode: wage ? "PARTIAL" : "NONE", missingInputs: wage ? ["verified_statutory_rules"] : ["contract_wage", "regular_minutes"], reasonCode: wage ? "PARTIAL_INPUTS" : "MISSING_REQUIRED_INPUT" },
        { checkType: checkTypes[1], available: comparison, mode: comparison ? "FULL" : "NONE", missingInputs: comparison ? [] : ["contract", "attendance", "comparison_basis_confirmation"] },
        { checkType: checkTypes[2], available: partialPayslip, mode: fullPayslip ? "FULL" : partialPayslip ? "PARTIAL" : "NONE", missingInputs: fullPayslip ? [] : ["confirmed_payslip_totals_and_items"] },
        { checkType: checkTypes[3], available: deposit, mode: deposit ? "FULL" : "NONE", missingInputs: deposit ? [] : ["payslip_net_pay", "allocated_payment"] },
      ];
      return apiResponse({ caseId: c.caseId, inputVersion: c.inputVersion, checks });
    }),
    http.get(`${baseUrl}/cases/:c/recompute-status`, ({ params }) => {
      const c = current(params.c); if (!c) return missing(); const s = state(c);
      if (s.observedVersion !== c.inputVersion) schedule(c, false);
      if (s.job && ["PENDING", "RUNNING"].includes(s.job.status)) {
        s.job.status = s.polls === 0 ? "PENDING" : s.polls === 1 ? "RUNNING" : completion(c);
        if (["PARTIAL","SUCCEEDED"].includes(s.job.status))publish(c);s.polls++;
      }
      const active = s.job && ["PENDING", "RUNNING"].includes(s.job.status);
      const refs=result(c);
      return apiResponse({caseId:c.caseId,currentInputVersion:c.inputVersion,pending:s.job?.status==="PENDING"?1:0,running:s.job?.status==="RUNNING"?1:0,activeJob:active?s.job:null,latestJob:s.job,results:refs.versions});
    }),
  ];
  return { handlers, requests, state, getResult(caseId:number) { const c=current(caseId); return c?structuredClone(result(c)):undefined; }, notifyInputChange(c:number) {const owner=current(c);if(!owner)throw new Error("Unknown mock Case");return schedule(owner,false).recompute;}, setJobStatus(c: number, status: string) { const owner = current(c); if (!owner) return; const s = state(owner); if (!s.job) schedule(owner, false); s.job!.status = status; if(["PARTIAL","SUCCEEDED"].includes(status))publish(owner); } };
}

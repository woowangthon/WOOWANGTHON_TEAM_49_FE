import { http, HttpResponse } from "msw";
import type { CaseDetailDto } from "@/features/cases/schemas";
import { conditionsPutSchema, manualInputSchema, checkTypes, type Condition, type ManualRecord, type RecordType } from "@/features/case-inputs/schemas";
import { manualDefaults, manualFormSchema } from "@/features/case-inputs/manual-fields";
import { apiResponse } from "./response";

/** Synthetic readiness policy for development/tests only; never an official wage engine. */
export function inputMocks(getCases: () => CaseDetailDto[], baseUrl = "http://127.0.0.1:8000/api/v1") {
  const states = new WeakMap<CaseDetailDto, ReturnType<typeof initialState>>();
  let nextRecord = 1, nextTransaction = 1, nextJob = 1;
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
    return { records: [] as ManualRecord[], transactions: [] as { transactionId: number; allocationId: number; data: ManualRecord["data"] }[], conditions: definitions.map(d => ({ ...d, value: null, status: "REQUIRED", source: null } as Condition)), observedVersion: c.inputVersion, job: null as null | { jobId: string; status: string; requestedInputVersion: number; errorCode: string | null }, polls: 0, resultVersion: 0 };
  }
  function state(c: CaseDetailDto) { if (!states.has(c)) states.set(c, initialState(c)); return states.get(c)!; }
  getCases().forEach(c => state(c));
  const current = (id: unknown) => getCases().find(c => c.caseId === Number(id));
  const missing = () => apiResponse({ errorCode: "RESOURCE_NOT_FOUND" }, 404);
  const error = (code: string, status: number) => apiResponse({ errorCode: code }, status);
  function schedule(c: CaseDetailDto, increment = true) {
    const s = state(c); if (increment) c.inputVersion++;
    s.observedVersion = c.inputVersion; s.polls = 0;
    s.job = { jobId: `input-job-${nextJob++}`, requestedInputVersion: c.inputVersion, status: "PENDING", errorCode: null };
    return { inputVersion: c.inputVersion, recompute: { scheduled: true, jobId: s.job.jobId, affectedChecks: [...checkTypes] } };
  }
  const parseManual = async (request: Request, c: CaseDetailDto, recordId?: number) => {
    const body = await request.json() as { recordType: RecordType; data: ManualRecord["data"]; source: string };
    requests.push({ method: request.method, path: new URL(request.url).pathname, body });
    const payload = manualInputSchema.safeParse(body);
    if (!payload.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: payload.error.issues.map(i => ({ field: i.path.join("."), reason: i.message })) }, 422);
    if (!body.data || !["CONTRACT", "ATTENDANCE", "PAYSLIP", "DEPOSIT"].includes(body.recordType) || body.source !== "USER_INPUT") return error("VALIDATION_ERROR", 422);
    const s = state(c); const old = s.records.find(r => r.recordId === recordId);
    if (recordId && !old) return missing();
    if (old && old.recordType !== body.recordType) return error("VALIDATION_ERROR", 422);
    const fields = manualFormSchema(body.recordType, c.periodStart, c.periodEnd).safeParse(manualDefaults(body.recordType, body.data));
    if (!fields.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: fields.error.issues.map(i => ({ field: `data.${String(i.path.at(-1))}`, reason: i.message })) }, 422);
    if (body.recordType === "DEPOSIT") {
      const transaction = { transactionId: nextTransaction++, allocationId: nextTransaction++, data: structuredClone(body.data) }; s.transactions.push(transaction);
      return apiResponse({ recordId: null, canonicalResource: "PAYMENT_TRANSACTION", transactionId: transaction.transactionId, allocationId: transaction.allocationId, ...schedule(c) }, 201);
    }
    const now = new Date().toISOString();
    const record: ManualRecord = { recordId: old?.recordId ?? nextRecord++, caseId: c.caseId, recordType: body.recordType, data: structuredClone(body.data), source: "USER_INPUT", createdAt: old?.createdAt ?? now, updatedAt: now };
    if (old) Object.assign(old, record); else s.records.push(record);
    return apiResponse({ ...record, ...schedule(c) }, old ? 200 : 201);
  };
  const snapshots = new WeakMap<CaseDetailDto, Record<string, unknown>[]>();
  function result(c: CaseDetailDto) {
    const s = state(c); const history = snapshots.get(c) ?? []; snapshots.set(c, history);
    const active = s.job && ["PENDING", "RUNNING"].includes(s.job.status);
    const freshness = s.observedVersion !== c.inputVersion ? "STALE" : s.job?.status === "FAILED" ? "FAILED" : active ? "UPDATING" : "CURRENT";
    if (!history.length || (!active && s.resultVersion > Number(history[0].resultVersion))) {
      const version = s.resultVersion;
      history.unshift({ caseId:c.caseId, currentInputVersion:c.inputVersion, resultVersion:version,
        summary:{ calculationStatus:"PARTIAL", comparisonStatus:"INSUFFICIENT_INFORMATION", counts:{match:1,difference:1,insufficientInformation:1,reviewRequired:1} },
        versions:Object.fromEntries(["calculation","comparison","payslipValidation"].map(k=>[k,{snapshotId:version,version,inputVersion:c.inputVersion,createdAt:"2026-11-08T00:00:00Z",freshness}])),
        items:[{id:"sample-review",title:"가상 자료 검토 예시",status:"REVIEW_REQUIRED",calculatedValue:null,documentValue:null,difference:null,unit:null,periodStart:c.periodStart,periodEnd:c.periodEnd,formula:null,rule:null,comparisonBasis:null,sources:[{documentId:101,page:1,text:"가상 명세서",boundingBox:null,coordinateSystem:"RELATIVE_0_1"}],confirmedAt:null,nextAction:"원문과 계산 조건을 확인해 주세요"}],
        calculation:{calculationId:version,version,basedOnInputVersion:c.inputVersion,status:"PARTIAL",items:[{type:"BASE_PAY",label:"기본급 (가상 예시)",status:"CALCULATED",amount:2000000,currency:"KRW"},{type:"OVERTIME_PAY",label:"연장수당",status:"REVIEW_REQUIRED",amount:null}],calculatedSubtotal:2000000,grossPay:null},
        comparison:{comparisonId:version,version,basedOnInputVersion:c.inputVersion,items:[{type:"HOURLY_WAGE",status:"INSUFFICIENT_INFORMATION",contractValue:null,payslipValue:null,difference:null,comparisonBasis:{unit:"KRW_PER_HOUR",semanticMatch:false}}]},
        payslipValidation:{validationId:version,version,paymentTotal:{status:"MATCH",itemSum:2300000,statedTotal:2300000,difference:0},deductionTotal:{status:"INSUFFICIENT_INFORMATION",itemSum:null,statedTotal:200000,difference:null},netPay:{status:"DIFFERENCE",calculated:2100000,stated:2090000,difference:10000}},depositComparison:null });
    }
    return {...history[0], currentInputVersion:c.inputVersion, freshness:{overall:freshness,hasOutdatedResults:freshness!=="CURRENT",activeJobId:active?s.job?.jobId:null},versions:Object.fromEntries(Object.entries(history[0].versions as Record<string,object>).map(([k,v])=>[k,{...v,freshness}]))};
  }
  const handlers = [
    http.get(`${baseUrl}/cases/:c/recompute-jobs/:jobId`,({params})=>{const c=current(params.c);if(!c)return missing();const job=state(c).job;return job?.jobId===params.jobId?apiResponse(job):missing();}),

    ...(["calculations","comparisons","payslip-validations"] as const).map(endpoint=>http.get(`${baseUrl}/cases/:c/${endpoint}`,({params})=>{const c=current(params.c);if(!c)return missing();result(c);const key={calculations:"calculation",comparisons:"comparison","payslip-validations":"payslipValidation"}[endpoint];const items=(snapshots.get(c)??[]).map(v=>v[key]);return apiResponse({items,page:1,size:20,total:items.length});})),
    http.get(`${baseUrl}/cases/:c/calculations/:id`,({params})=>{const c=current(params.c);if(!c)return missing();result(c);const found=(snapshots.get(c)??[]).map(v=>v.calculation as Record<string,unknown>).find(v=>v.calculationId===Number(params.id));return found?apiResponse(found):missing();}),

    ...["recompute","calculations","comparisons","payslip-validations"].map(endpoint=>http.post(`${baseUrl}/cases/:c/${endpoint}`,async({params,request})=>{const c=current(params.c);if(!c)return missing();const body=await request.json() as {expectedInputVersion?:number};if(body.expectedInputVersion!==c.inputVersion)return error("INPUT_VERSION_CONFLICT",409);const s=state(c);if(s.job && ["PENDING","RUNNING"].includes(s.job.status))return error("RECOMPUTE_IN_PROGRESS",409);schedule(c,false);return apiResponse({...s.job},202);})),

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
      requests.push({ method: request.method, path: new URL(request.url).pathname }); s.records.splice(index, 1); schedule(c); return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${baseUrl}/cases/:c/conditions`, ({ params }) => { const c = current(params.c); return c ? apiResponse({ conditions: state(c).conditions, inputVersion: c.inputVersion }) : missing(); }),
    http.put(`${baseUrl}/cases/:c/conditions`, async ({ request, params }) => {
      const c = current(params.c); if (!c) return missing(); const body = await request.json(); requests.push({ method: request.method, path: new URL(request.url).pathname, body });
      const parsed = conditionsPutSchema.safeParse(body); if (!parsed.success) return apiResponse({ errorCode: "VALIDATION_ERROR", errors: parsed.error.issues.map(i => ({ field: i.path.join("."), reason: i.message })) }, 422);
      if (parsed.data.expectedInputVersion !== c.inputVersion) return apiResponse({ errorCode: "INPUT_VERSION_CONFLICT", details: { currentInputVersion: c.inputVersion, expectedInputVersion: parsed.data.expectedInputVersion } }, 409);
      const s = state(c); parsed.data.answers.forEach(a => { const condition = s.conditions.find(v => v.conditionId === a.conditionId)!; condition.value = a.value; condition.status = a.value === "UNKNOWN" ? "UNKNOWN" : "ANSWERED"; });
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
      const deposit = !!payslip && typeof payslip.data.netPay === "number" && s.transactions.length > 0;
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
        s.job.status = s.polls === 0 ? "PENDING" : s.polls === 1 ? "RUNNING" : "PARTIAL";
        if (s.job.status === "PARTIAL") s.resultVersion++; s.polls++;
      }
      const active = s.job && ["PENDING", "RUNNING"].includes(s.job.status);
      const freshness = s.job?.status === "FAILED" ? "FAILED" : s.job?.status === "PENDING" ? "STALE" : active ? "UPDATING" : "CURRENT";
      return apiResponse({ caseId: c.caseId, currentInputVersion: c.inputVersion, pending: s.job?.status === "PENDING" ? 1 : 0, running: s.job?.status === "RUNNING" ? 1 : 0, activeJob: active ? s.job : null, latestJob: s.job,
        results: Object.fromEntries(["calculation", "comparison", "payslipValidation", "depositComparison"].map(key => [key, { snapshotId: s.resultVersion || null, version: s.resultVersion || null, inputVersion: c.inputVersion, freshness }])) });
    }),
  ];
  return { handlers, requests, state, setJobStatus(c: number, status: string) { const owner = current(c); if (!owner) return; const s = state(owner); if (!s.job) schedule(owner, false); s.job!.status = status; } };
}

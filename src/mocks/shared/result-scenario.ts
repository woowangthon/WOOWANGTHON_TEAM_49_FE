/** Development/test scenario only. No statutory wage formulas; confirmed base amounts are echoed.
 * Arithmetic below checks synthetic payslip totals and same-basis unit values only. */
import type { Results } from "@/features/results/schemas";
import type { Condition, ManualRecord } from "@/features/case-inputs/schemas";
import type { CaseDetailDto } from "@/features/cases/schemas";
import type { ExtractedField } from "@/features/documents/review/schemas";
export type MockEvidence = {documentId:number;fields:ExtractedField[]};
export function buildResultScenario(c:CaseDetailDto,version:number,records:ManualRecord[],conditions:Condition[],evidence:MockEvidence[]):Results {
 const now=new Date().toISOString();
 const last=(type:string)=>records.findLast(r=>r.recordType===type)?.data;
 const contract=last("CONTRACT");const manualPayslip=last("PAYSLIP");
 const confirmed=evidence.flatMap(d=>d.fields).filter(f=>f.status==="CONFIRMED");
 const fieldNumber=(key:string)=>{const values=confirmed.filter(f=>f.key===key);return values.length===1 && typeof values[0].value==="number"?values[0].value:null;};
 const payslip=manualPayslip ?? {grossPay:fieldNumber("grossPay"),totalDeductions:fieldNumber("deductions"),netPay:fieldNumber("netPay")};
 const num=(value:unknown)=>typeof value==="number"?value:null;
 const answer=(id:string)=>conditions.find(v=>v.conditionId===id)?.value;
 const base=num(contract?.monthlyBasePay);
 const baseAvailable=base!==null && typeof answer("regular_minutes")==="number" && answer("base_scope_confirmed")===true;
 const calcStatus=baseAvailable?"PARTIAL":"REVIEW_REQUIRED";
 const comparisonBasis={periodStart:c.periodStart,periodEnd:c.periodEnd,unit:"KRW_PER_HOUR",semanticMatch:answer("comparison_basis_confirmed")===true};
 const cv=num(contract?.hourlyWage),pv=num(payslip?.hourlyWage);
 const comparisonStatus=cv===null||pv===null?"INSUFFICIENT_INFORMATION":!comparisonBasis.semanticMatch?"REVIEW_REQUIRED":cv===pv?"MATCH":"DIFFERENCE";
 const difference=comparisonBasis.semanticMatch&&cv!==null&&pv!==null?cv-pv:null;
 const sum=(value:unknown)=>Array.isArray(value)&&value.every(v=>typeof v==="number")?value.reduce((a:number,b:number)=>a+b,0):null;
 const check=(computed:number|null,stated:number|null)=>({status:computed===null||stated===null?"INSUFFICIENT_INFORMATION" as const:computed===stated?"MATCH" as const:"DIFFERENCE" as const,difference:computed===null||stated===null?null:computed-stated});
 const gross=num(payslip.grossPay),deductions=num(payslip.totalDeductions),net=num(payslip.netPay);
 const paymentSum=sum(payslip.paymentItems),deductionSum=sum(payslip.deductionItems),calculatedNet=gross===null||deductions===null?null:gross-deductions;
 const item=(id:string,title:string,status:"MATCH"|"DIFFERENCE"|"INSUFFICIENT_INFORMATION"|"REVIEW_REQUIRED",computed:number|null,stated:number|null,diff:number|null,unit="KRW"):Results["items"][number]=>({id,title,status,calculatedValue:computed,documentValue:stated,difference:diff,unit,periodStart:c.periodStart,periodEnd:c.periodEnd,formula:null,rule:null,comparisonBasis:null,sources:[],confirmedAt:null,nextAction:status==="INSUFFICIENT_INFORMATION"?"수기 자료 또는 원문 확인값을 보완해 주세요":status==="REVIEW_REQUIRED"?"원문과 계산 조건을 검토해 주세요":null});
 const paymentCheck=check(paymentSum,gross),deductionCheck=check(deductionSum,deductions),netCheck=check(calculatedNet,net);
 const items=[item("hourly","시급 대응 항목",comparisonStatus,cv,pv,difference,"KRW_PER_HOUR"),item("payment-total","지급 합계 검사",paymentCheck.status,paymentSum,gross,paymentCheck.difference),item("deduction-total","공제 합계 검사",deductionCheck.status,deductionSum,deductions,deductionCheck.difference),item("net-pay","실수령액 합계 검사",netCheck.status,calculatedNet,net,netCheck.difference)];
 items[0].comparisonBasis=comparisonBasis;
 for(const doc of evidence)for(const field of doc.fields){
  const source=field.source;
  if(!source)continue;
  const row=item(`field-${doc.documentId}-${field.fieldId}`,`원문 확인: ${field.label}`,field.status==="CONFIRMED"?"INSUFFICIENT_INFORMATION":"REVIEW_REQUIRED",null,typeof field.value==="number"?field.value:null,null,field.valueType==="MONEY_KRW"?"KRW":field.valueType);
  row.sources=[{...source,documentId:doc.documentId,fieldId:field.fieldId}];row.confirmedAt=field.confirmedAt;items.push(row);
 }
 const counts={match:0,difference:0,insufficientInformation:0,reviewRequired:0};
 for(const row of items)counts[({MATCH:"match",DIFFERENCE:"difference",INSUFFICIENT_INFORMATION:"insufficientInformation",REVIEW_REQUIRED:"reviewRequired"} as const)[row.status]]++;
 return {caseId:c.caseId,currentInputVersion:c.inputVersion,resultVersion:version,summary:{calculationStatus:calcStatus,comparisonStatus,counts},freshness:{overall:"CURRENT",hasOutdatedResults:false,activeJobId:null},
 versions:Object.fromEntries(["calculation","comparison","payslipValidation"].map(k=>[k,{snapshotId:version,version,inputVersion:c.inputVersion,createdAt:now,freshness:"CURRENT" as const}])),items,
 calculation:{calculationId:version,version,basedOnInputVersion:c.inputVersion,status:calcStatus,items:[{type:"BASE_PAY",label:"확인 월 기본급 (Mock 입력값 시연)",status:baseAvailable?"CALCULATED":"INSUFFICIENT_INFORMATION",amount:baseAvailable?base:null,currency:"KRW",formula:{expression:"confirmedMonthlyBasePay",inputs:[{key:"confirmedMonthlyBasePay",value:base,unit:"KRW"}]}},{type:"STATUTORY_ALLOWANCES",label:"법정수당 규칙 검토",status:"REVIEW_REQUIRED",amount:null,currency:"KRW",reasonCode:"UNVERIFIED_STATUTORY_RULES"}],calculatedSubtotal:baseAvailable?base:null,grossPay:null,createdAt:now},
 comparison:{comparisonId:version,version,basedOnInputVersion:c.inputVersion,items:[{type:"HOURLY_WAGE",status:comparisonStatus,contractValue:cv,payslipValue:pv,difference,comparisonBasis}],createdAt:now},
 payslipValidation:{validationId:version,version,basedOnInputVersion:c.inputVersion,paymentTotal:{...paymentCheck,itemSum:paymentSum,statedTotal:gross},deductionTotal:{...deductionCheck,itemSum:deductionSum,statedTotal:deductions},netPay:{...netCheck,calculated:calculatedNet,stated:net},createdAt:now},depositComparison:null};
}

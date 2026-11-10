"use client";
import { useRef, useState } from "react";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive } from "@/features/documents/api";
import { useCase } from "@/features/cases/queries";
import { sourceSchema } from "@/features/documents/review/schemas";
import { OriginalViewer } from "@/features/documents/review/components/original-viewer";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { InputStatus } from "@/features/case-inputs/components/input-status";
import { useResultExecution, useResults, useResultHistory, useResultJob } from "./queries";
const labels: Record<string,string> = { MATCH:"✓ 자료상 일치", DIFFERENCE:"△ 차이 발견 — 미지급임금 확정이 아닙니다", INSUFFICIENT_INFORMATION:"? 정보 부족", REVIEW_REQUIRED:"! 검토 필요", COMPLETE:"계산 완료", PARTIAL:"부분 계산", CALCULATED:"계산됨", NOT_APPLICABLE:"적용 대상 아님", CURRENT:"최신", STALE:"오래된 결과", UPDATING:"갱신 중 · 이전 결과", FAILED:"갱신 실패 · 이전 결과", calculationStatus:"계산 상태", comparisonStatus:"대조 상태", calculatedSubtotal:"계산 가능한 소계", grossPay:"확정 가능한 범위의 세전 총액", paymentTotal:"지급 세부 합계와 지급총액", deductionTotal:"공제 세부 합계와 공제총액", netPay:"지급총액 − 공제총액과 실수령액", contractValue:"계약값", attendanceValue:"근태값", payslipValue:"명세서값", difference:"차이", comparisonBasis:"비교 범위·조건", semanticMatch:"기간·단위·의미 일치 여부", formula:"계산식", inputs:"입력값", expression:"산식", sources:"원문 출처", rule:"적용 규칙", ruleVersion:"규칙 버전", verified:"규칙 검증 여부", version:"결과 버전", basedOnInputVersion:"기준 입력 버전", inputVersion:"입력 버전", freshness:"최신성", confirmedAt:"확인 시각", nextAction:"다음 행동", itemSum:"세부 합계", statedTotal:"명세서 총액", calculated:"서버 계산값", stated:"명세서 값", amount:"금액", unit:"단위", periodStart:"시작일", periodEnd:"종료일", createdAt:"생성 시각" };
export function ServerValue({ value, caseId }: { value: unknown; caseId: number }) {
 const [showOriginal,setShowOriginal]=useState(false);
 if (value === null || value === undefined) return <span>미제공·확정 불가</span>;
 if (typeof value === "boolean") return <span>{value ? "예" : "아니요"}</span>;
 if (typeof value !== "object") return <span>{labels[String(value)] ?? String(value)}</span>;
 if (Array.isArray(value)) return value.length ? <div className="space-y-3">{value.map((v,i)=><div key={i} className="border-l-2 border-line pl-3"><ServerValue value={v} caseId={caseId}/></div>)}</div> : <span>제공된 항목 없음</span>;
 const obj = value as Record<string,unknown>;
 return <div className="min-w-0 space-y-2">{typeof obj.documentId === "number" && <Link className="underline" href={`/cases/${caseId}/review?documentId=${obj.documentId}`}>원문 문서 {obj.documentId} 검토</Link>}{typeof obj.documentId === "number" && <><button className={secondaryButton} aria-expanded={showOriginal} onClick={()=>setShowOriginal(v=>!v)}>원문 근거 펼치기·접기</button>{showOriginal && <SourcePreview caseId={caseId} source={obj}/>}</>}<dl className="space-y-2">{Object.entries(obj).map(([k,v])=><div key={k} className="min-w-0"><dt className="font-bold">{labels[k] ?? k}</dt><dd className="pl-2"><ServerValue value={v} caseId={caseId}/></dd></div>)}</dl></div>;
}
export function ResultScreen({caseId, compare=false}:{caseId:number;compare?:boolean}) {
 const q=useResults(caseId); const execution=useResultExecution(caseId); const status=useRecomputeStatus(caseId); const lock=useRef(false);
 const job=status.data?.activeJob ?? status.data?.latestJob;
 const detail=useResultJob(caseId,job?.jobId,job?.status);
 const busy=execution.isPending || status.isPending || status.isError || !!status.awaitingScheduledJob || (!!status.data && recomputeActive(status.data));
 return <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
 <h1 className="text-title font-bold">{compare ? "계약·근태 대조와 명세서 검사" : "임금 계산·통합 결과"}</h1>
 <nav className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}`}>사례로</Link><Link className={secondaryButton} href={`/cases/${caseId}/${compare ? "result" : "compare"}`}>{compare ? "통합 결과" : "대조·합계 검사"}</Link><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>조건 보완</Link></nav>
 <p>차이 발견은 미지급임금 확정을 의미하지 않습니다. 공제액의 적법성이나 세금·보험료의 적정성을 판단하지 않습니다.</p>
 <InputStatus caseId={caseId} compact/>{job?.jobId && <details className={cardStyle}><summary>작업 상세 · {job.jobId}</summary>{detail.isPending?<QueryFeedback pending/>:detail.isError?<QueryFeedback error={detail.error} retry={()=>void detail.refetch()}/>:<ServerValue value={detail.data} caseId={caseId}/>}</details>}{(["calculations","comparisons","payslip-validations"] as const).map(endpoint=><ResultHistory key={endpoint} caseId={caseId} endpoint={endpoint}/> )}
 {q.isPending ? <QueryFeedback pending/> : q.isError ? <QueryFeedback error={q.error} retry={()=>void q.refetch()}/> : <>
 <div className="flex flex-wrap gap-3">{(["recompute","calculations","comparisons","payslip-validations"] as const).map(endpoint=><button key={endpoint} className={secondaryButton} disabled={busy} onClick={async()=>{if(lock.current||busy)return;lock.current=true;try{await execution.mutateAsync({endpoint,version:q.data.currentInputVersion});}catch{}finally{lock.current=false;}}}>{{recompute:"전체 수동 재실행",calculations:"계산 재실행",comparisons:"대조 재실행","payslip-validations":"합계 검사 재실행"}[endpoint]}</button>)}</div>
 {execution.isError && <QueryFeedback error={execution.error} retry={()=>void q.refetch()}/>}{execution.data && <p role="status">수동 작업 접수: {execution.data.jobId}</p>}
 <section className={cardStyle}><h2 className="font-bold">결과 요약 · {labels[q.data.freshness.overall]}</h2><p>현재 입력 버전 {q.data.currentInputVersion} · 결과 버전 {q.data.resultVersion ?? "없음"}</p><ServerValue value={q.data.summary} caseId={caseId}/></section>
 <details className={cardStyle}><summary>결과별 최신성·버전·생성 시각</summary><ServerValue value={q.data.versions} caseId={caseId}/></details>
 {!q.data.items.length && <p>결과 항목이 없습니다. 자료와 계산 조건을 확인해 주세요.</p>}
 <div className="grid min-w-0 gap-4 lg:grid-cols-2">{q.data.items.map((v,i)=><article className={`${cardStyle} min-w-0`} key={i}><ServerValue value={v} caseId={caseId}/></article>)}</div>
 {(compare ? ["comparison","payslipValidation"] : ["calculation","comparison","payslipValidation"]).map(k=><section className={`${cardStyle} min-w-0`} key={k}><h2 className="text-title font-bold">{{calculation:"임금 계산 상세",comparison:"계약·근태·명세서 대조",payslipValidation:"명세서 독립 합계 검사"}[k]}</h2><ServerValue value={q.data[k]} caseId={caseId}/></section>)}
 </>}</div>;
}

function ResultHistory({caseId,endpoint}:{caseId:number;endpoint:"calculations"|"comparisons"|"payslip-validations"}) {
 const q=useResultHistory(caseId,endpoint); const [selected,setSelected]=useState<number>();
 const records=q.data && typeof q.data==="object" && "items" in q.data && Array.isArray(q.data.items) ? q.data.items : [];
 return <details className={cardStyle}><summary>{{calculations:"계산",comparisons:"대조","payslip-validations":"합계 검사"}[endpoint]} 스냅샷 이력 (서버 제공 순서)</summary><p>이력은 현재 결과와 구별하여 확인하세요.</p>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:<><ServerValue value={q.data} caseId={caseId}/>{endpoint==="calculations" && records.map((v:unknown,i:number)=>{const id=v && typeof v==="object" && "calculationId" in v ? v.calculationId : undefined;return typeof id==="number" ? <button key={i} className={secondaryButton} onClick={()=>setSelected(id)}>계산 스냅샷 {id} 상세 조회</button>:null;})}{selected!==undefined && <CalculationDetail caseId={caseId} id={selected}/>}</>}</details>;
}

function CalculationDetail({caseId,id}:{caseId:number;id:number}) { const q=useResultHistory(caseId,"calculations",id);return <section aria-label="선택한 과거 계산 스냅샷" className={cardStyle}>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:<ServerValue caseId={caseId} value={q.data}/>}</section>; }

function SourcePreview({caseId,source}:{caseId:number;source:Record<string,unknown>}) {
 const c=useCase(caseId);const parsed=sourceSchema.safeParse(source);
 if(!parsed.success)return <p>원문 좌표 계약이 확인되지 않아 강조할 수 없습니다. 표시된 페이지·근거 문구와 검토 링크를 확인해 주세요.</p>;
 if(c.isPending)return <QueryFeedback pending/>;
 if(c.isError)return <QueryFeedback error={c.error} retry={()=>void c.refetch()}/>;
 return <div className="min-w-0"><OriginalViewer workplaceId={c.data.workplaceId} documentId={parsed.data.documentId} source={parsed.data}/></div>;
}

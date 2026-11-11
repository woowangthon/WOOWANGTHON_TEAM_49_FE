"use client";
import { jobText } from "@/features/documents/api";
import { useCase } from "@/features/cases/queries";
import { caseCard } from "@/features/cases/view-models";
import { ResultSummary } from "./result-presentation";
import { ResultExplorer } from "./result-explorer";
import { SupportLinks } from "@/features/case-support/screens";
import { SelectedSnapshot } from "./selected-snapshot";
import type { SnapshotKind } from "./snapshot-link";
import { DepositComparisonPanel } from "@/features/payments/comparison-panel";
import { useRef, useState } from "react";
import { useRecomputeStatus } from "@/features/documents/queries";
import { recomputeActive } from "@/features/documents/api";
import { SourceEvidence } from "./source-evidence";
import { displayScalar, resultRows, statusLabels, toResultsViewModel } from "./view-models";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { InputStatus } from "@/features/case-inputs/components/input-status";
import { useResultExecution, useResults, useResultHistory, useResultJob } from "./queries";
export function ServerValue({value,caseId,fieldKey,unit}:{value:unknown;caseId:number;fieldKey?:string;unit?:string|null}) {
 if(value===null || typeof value!=="object")return <span>{displayScalar(value,fieldKey,unit)}</span>;
 if(Array.isArray(value))return value.length?<div className="space-y-3">{value.map((v,i)=><div key={i} className="border-l-2 border-line pl-3"><ServerValue value={v} caseId={caseId} fieldKey={fieldKey==="items"?"resultItem":undefined} unit={unit}/></div>)}</div>:<p>제공된 항목 없음</p>;
 const obj=value as Record<string,unknown>;
 if(typeof obj.documentId==="number")return <SourceEvidence caseId={caseId} value={obj}/>;
 const validation=fieldKey==="paymentTotal"||fieldKey==="deductionTotal"||fieldKey==="netPay";
 if(fieldKey==="resultItem" && !Object.keys(obj).length)return <p>서버 상세 항목 미제공</p>;
 return <dl className="min-w-0 space-y-3 [overflow-wrap:anywhere]">{resultRows(obj,validation?"KRW":fieldKey==="counts"?"COUNT":unit).map(row=><div key={row.key} className="min-w-0"><dt className="font-bold">{row.label}</dt><dd className="pl-2"><ServerValue value={row.value} caseId={caseId} fieldKey={row.key} unit={row.unit}/></dd></div>)}</dl>;
}
export function ResultScreen({caseId, compare=false, selection, returnTo}:{caseId:number;compare?:boolean;selection?:{kind:SnapshotKind;id:number;version:number}|null;returnTo?:string}) {
 const context=useCase(caseId);
 const q=useResults(caseId); const execution=useResultExecution(caseId); const status=useRecomputeStatus(caseId); const lock=useRef(false);
 const vm=q.data?toResultsViewModel(q.data):undefined;
 const job=status.data?.activeJob ?? status.data?.latestJob;
 const detail=useResultJob(caseId,jobText(job?.jobId),jobText(job?.status));
 const busy=execution.isPending || status.isPending || status.isError || !!status.awaitingScheduledJob || (!!status.data && recomputeActive(status.data));
 return <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
 <h1 className="text-[32px] leading-tight font-bold lg:text-[38px]">{compare ? "자료를 비교해 볼까요?" : "내 임금 결과를 확인해 보세요"}</h1>
 {context.data ? <p>{caseCard(context.data).workplaceName} · {caseCard(context.data).period} · {caseCard(context.data).payType}</p> : <QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>}
 <nav className="flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}`}>사례로</Link><Link className={secondaryButton} href={`/cases/${caseId}/${compare ? "result" : "compare"}`}>{compare ? "통합 결과" : "대조·합계 검사"}</Link><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>조건 보완</Link></nav>
 <p>차이 발견은 미지급임금 확정을 의미하지 않습니다. 공제액의 적법성이나 세금·보험료의 적정성을 판단하지 않습니다.</p>
 {returnTo&&<Link href={returnTo} className={secondaryButton}>원래 채팅으로 돌아가기</Link>}{selection!==undefined&&<SelectedSnapshot caseId={caseId} selection={selection}/>}
 {!q.data ? <QueryFeedback pending={q.isPending} error={q.error} retry={()=>void q.refetch()}/> : <>
 {q.isError && <><p role="alert">최신 결과 조회에 실패해 직전 조회 결과를 보존합니다. 최신성을 다시 확인해 주세요.</p><QueryFeedback error={q.error} retry={()=>void q.refetch()}/></>}
 {execution.isError && <><p role="alert">작업을 접수하지 못했습니다. 최신 입력 버전과 실행 가능성을 확인해 주세요. 상태 조회는 작업을 중복 생성하지 않습니다.</p><QueryFeedback error={execution.error} retry={()=>{void q.refetch();void status.refetch();}}/></>}{execution.data && <p role="status">수동 작업 접수: {execution.data.jobId} · {statusLabels[execution.data.status]}</p>}
 <ResultSummary compare={compare} value={{...vm!,title:q.isError?"직전 조회 결과 · 최신성 미확인":compare?"자료 비교 요약":vm!.title}}/>
 {q.data.freshness.overall==="FAILED"&&<p role="alert">이전 결과를 보존합니다. <button className={secondaryButton} onClick={()=>{void q.refetch();void status.refetch();}}>갱신 상태 다시 확인</button> 아래 보조 관리에서 재실행할 수 있습니다.</p>}
 <ResultExplorer key={caseId} data={q.data} compare={compare} before={!compare&&<section className={cardStyle}><h2 className="text-xl font-bold">부족한 정보와 다음 행동</h2><p>원문 확인과 조건 보완으로 계산 가능한 범위를 넓혀 보세요.</p><nav className="my-4 flex flex-wrap gap-3"><Link className={secondaryButton} href={`/cases/${caseId}/review`}>원문 검토</Link><Link className={secondaryButton} href={`/cases/${caseId}/conditions`}>조건 보완</Link><Link className={secondaryButton} href={`/cases/${caseId}/manual-records`}>수기 입력 보완</Link></nav><details><summary>실행 가능성과 부족한 입력 상세</summary><InputStatus caseId={caseId} compact/></details></section>}/>
 <details className={cardStyle}><summary className="font-bold">입금 거래·배분 관리 및 별도 입금 대조 이력</summary><p>이 영역은 별도 입금 조회 시점의 결과입니다. 위 결과와 버전·최신성을 각각 확인하세요.</p><DepositComparisonPanel caseId={caseId}/></details>
 <details className={`${cardStyle} space-y-4`}><summary className="font-bold">계산 상세·작업 상태·버전·이력·수동 실행</summary>
 <div className="flex flex-wrap gap-3">{(["recompute","calculations","comparisons","payslip-validations"] as const).map(endpoint=><button key={endpoint} className={secondaryButton} disabled={busy} onClick={async()=>{if(lock.current||busy)return;lock.current=true;try{await execution.mutateAsync({endpoint,version:q.data.currentInputVersion});}catch{}finally{lock.current=false;}}}>{{recompute:"전체 수동 재실행",calculations:"계산 재실행",comparisons:"대조 재실행","payslip-validations":"합계 검사 재실행"}[endpoint]}</button>)}</div>

 <p>입력 변경 후 자동 갱신됩니다. 아래 실행은 보조 관리 기능입니다.</p>
 {q.data.wire != null && <details><summary>서버 원본 결과 데이터</summary><p>내부 정보가 표시 형식과 다르면 미제공으로 표시하며 원본은 보존합니다.</p><ServerValue value={q.data.wire} caseId={caseId}/></details>}
 <p>현재 입력 버전 {q.data.currentInputVersion} · 결과 버전 {q.data.resultVersion ?? "없음"}</p><ServerValue value={q.data.versions} caseId={caseId}/>
{job?.jobId && <details className={cardStyle}><summary>작업 상세 · {jobText(job.jobId)}</summary>{detail.isPending?<QueryFeedback pending/>:detail.isError?<QueryFeedback error={detail.error} retry={()=>void detail.refetch()}/>:<ServerValue value={detail.data} caseId={caseId}/>}</details>}{(["calculations","comparisons","payslip-validations"] as const).map(endpoint=><ResultHistory key={endpoint} caseId={caseId} endpoint={endpoint}/> )}

 <details><summary>전체 서버 결과·추가 근거</summary><ServerValue value={q.data} caseId={caseId}/></details>
 </details>
 <section className={cardStyle}><h2 className="text-xl font-bold">상담 준비와 후속 행동</h2><SupportLinks caseId={caseId}/></section>
 </>}</div>;
}

function ResultHistory({caseId,endpoint}:{caseId:number;endpoint:"calculations"|"comparisons"|"payslip-validations"}) {
 const [page,setPage]=useState(1); const [open,setOpen]=useState(false);const [selected,setSelected]=useState<number>();
 const q=useResultHistory(caseId,endpoint,undefined,page,open);
 const records=q.data && "items" in q.data && Array.isArray(q.data.items)?q.data.items:[];
 const total=q.data && "total" in q.data && typeof q.data.total==="number"?q.data.total:0;
 return <details className={cardStyle} onToggle={e=>setOpen(e.currentTarget.open)}>
 <summary>{{calculations:"계산",comparisons:"대조","payslip-validations":"합계 검사"}[endpoint]} 스냅샷 이력 (서버 제공 순서)</summary>
 {open && <><p>이력은 현재 결과와 구별하여 확인하세요.</p><nav aria-label="결과 이력 페이지" className="flex flex-wrap gap-3"><button className={secondaryButton} disabled={page===1||q.isFetching} onClick={()=>setPage(v=>v-1)}>이전 이력</button><span>{page}페이지</span><button className={secondaryButton} disabled={q.isFetching||page*20>=total} onClick={()=>setPage(v=>v+1)}>다음 이력</button></nav>
 {q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:<><ServerValue value={q.data} caseId={caseId}/>{endpoint==="calculations" && records.map((v:unknown,i:number)=>{const id=v&&typeof v==="object"&&"calculationId" in v?v.calculationId:undefined;return typeof id==="number"?<button key={i} className={secondaryButton} onClick={()=>setSelected(id)}>계산 스냅샷 {id} 상세 조회</button>:null;})}{selected!==undefined && <CalculationDetail caseId={caseId} id={selected}/>}</>}
 </>}</details>;
}

function CalculationDetail({caseId,id}:{caseId:number;id:number}) { const q=useResultHistory(caseId,"calculations",id);return <section aria-label="선택한 과거 계산 스냅샷" className={cardStyle}>{q.isPending?<QueryFeedback pending/>:q.isError?<QueryFeedback error={q.error} retry={()=>void q.refetch()}/>:<ServerValue caseId={caseId} value={q.data}/>}</section>; }

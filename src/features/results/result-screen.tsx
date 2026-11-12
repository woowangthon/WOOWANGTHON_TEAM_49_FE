"use client";
import { useCase } from "@/features/cases/queries";
import { CaseStageHeader } from "@/features/cases/components/case-stage-header";
import { ResultNextSteps, ResultSummary } from "./result-presentation";
import { ResultExplorer } from "./result-explorer";
import { SupportLinks } from "@/features/case-support/screens";
import { SelectedSnapshot } from "./selected-snapshot";
import type { SnapshotKind } from "./snapshot-link";
import { useRecomputeStatus } from "@/features/documents/queries";
import { SourceEvidence } from "./source-evidence";
import { displayScalar, resultRows, toResultsViewModel } from "./view-models";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { useResults } from "./queries";
import { ArrowRight, Info } from "lucide-react";
import styles from "./result-screen.module.css";
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
 const q=useResults(caseId); const status=useRecomputeStatus(caseId);
 const vm=q.data?toResultsViewModel(q.data):undefined;
 return <div className={styles.screen}>
 {compare?<CaseStageHeader stage="compare" title="자료를 비교해 볼까요?" description="계약·근태·명세서를 함께 살펴보고, 차이가 생긴 항목과 근거를 확인해요."/>:<header className={styles.header}>
 <div><p className={styles.eyebrow}>내 급여 살펴보기</p><h1>내 임금, 어디까지 확인됐을까요?</h1><p>계산된 금액부터 차이가 생긴 이유까지 확인해 보세요.</p></div>
 <Link className={styles.headerLink} href={`/cases/${caseId}/reports`}>상담 자료 준비<ArrowRight size={16} aria-hidden="true"/></Link>
 </header>}
 {!context.data && <QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>}

 {returnTo&&<Link href={returnTo} className={secondaryButton}>원래 채팅으로 돌아가기</Link>}{selection!==undefined&&<SelectedSnapshot caseId={caseId} selection={selection}/>}
 {!q.data ? <QueryFeedback pending={q.isPending} error={q.error} retry={()=>void q.refetch()}/> : <>
 {q.isError && <><p role="alert">최신 결과 조회에 실패해 직전 조회 결과를 보존합니다. 최신성을 다시 확인해 주세요.</p><QueryFeedback error={q.error} retry={()=>void q.refetch()}/></>}
 <div className={styles.overview}><ResultSummary compare={compare} value={{...vm!,title:q.isError?"직전 조회 결과 · 최신성 미확인":compare?"자료 비교 요약":vm!.title}}/><ResultNextSteps value={vm!} caseId={caseId}/></div>
 <p className={styles.notice}><Info size={16} aria-hidden="true"/><span>차이 발견은 미지급임금 확정을 의미하지 않습니다. 공제액의 적법성이나 세금·보험료의 적정성을 판단하지 않습니다.</span></p>
 {q.data.freshness.overall==="FAILED"&&<p role="alert">결과 갱신에 실패해 이전 결과를 보여 드려요. <button className={secondaryButton} onClick={()=>{void q.refetch();void status.refetch();}}>갱신 상태 다시 확인</button></p>}
 <ResultExplorer key={caseId} data={q.data} compare={compare} freshnessUnverified={q.isError} showDetailsInitially={compare}/>
 <section className={styles.support}><h2>결과를 바탕으로 다음을 준비해요</h2><SupportLinks caseId={caseId}/></section>{compare&&<nav data-case-next aria-label="결과 관련 화면"><div><h2>계산 결과도 살펴볼까요?</h2><p>계산 결과를 함께 확인할 수 있어요.</p></div><Link className={secondaryButton} href={`/cases/${caseId}/result`}>통합 결과</Link></nav>}
 </>}</div>;
}

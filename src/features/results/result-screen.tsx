"use client";
import { Info } from "lucide-react";
import { useCase } from "@/features/cases/queries";
import styles from "./result-screen.module.css";
import { ResultNextSteps, ResultSummary } from "./result-presentation";
import { ResultExplorer } from "./result-explorer";
import { SelectedSnapshot } from "./selected-snapshot";
import type { SnapshotKind } from "./snapshot-link";
import { useRecomputeStatus } from "@/features/documents/queries";
import { SourceEvidence } from "./source-evidence";
import { displayScalar, resultRows, toResultsViewModel } from "./view-models";
import Link from "next/link";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { useResults } from "./queries";
export function ServerValue({value,caseId,fieldKey,unit}:{value:unknown;caseId:number;fieldKey?:string;unit?:string|null}) {
 if(value===null || typeof value!=="object")return <span>{displayScalar(value,fieldKey,unit)}</span>;
 if(Array.isArray(value))return value.length?<div className="space-y-3">{value.map((v,i)=><div key={i} className="border-l-2 border-line pl-3"><ServerValue value={v} caseId={caseId} fieldKey={fieldKey==="items"?"resultItem":undefined} unit={unit}/></div>)}</div>:<p>제공된 항목 없음</p>;
 const obj=value as Record<string,unknown>;
 if(typeof obj.documentId==="number")return <SourceEvidence caseId={caseId} value={obj}/>;
 const validation=fieldKey==="paymentTotal"||fieldKey==="deductionTotal"||fieldKey==="netPay";
 if(fieldKey==="resultItem" && !Object.keys(obj).length)return <p>서버 상세 항목 미제공</p>;
 return <dl className="min-w-0 space-y-3 [overflow-wrap:anywhere]">{resultRows(obj,validation?"KRW":fieldKey==="counts"?"COUNT":unit).map(row=><div key={row.key} className="min-w-0"><dt className="font-bold">{row.label}</dt><dd className="pl-2"><ServerValue value={row.value} caseId={caseId} fieldKey={row.key} unit={row.unit}/></dd></div>)}</dl>;
}
export function ResultScreen({caseId, selection, returnTo}:{caseId:number;compare?:boolean;selection?:{kind:SnapshotKind;id:number;version:number}|null;returnTo?:string}) {
 const context=useCase(caseId);
 const q=useResults(caseId); const status=useRecomputeStatus(caseId);
 const vm=q.data?toResultsViewModel(q.data):undefined;
 return <div className={styles.screen}>
 <header className={styles.header}><div><p className={styles.eyebrow}>내 급여 살펴보기</p><h1>내 임금, 어디까지 확인됐을까요?</h1><p>계산된 금액부터 차이가 생긴 이유까지 확인해 보세요.</p></div></header>
 {!context.data && <QueryFeedback pending={context.isPending} error={context.error} retry={()=>void context.refetch()}/>}

 {returnTo&&<Link href={returnTo} className={secondaryButton}>원래 채팅으로 돌아가기</Link>}{selection!==undefined&&<SelectedSnapshot caseId={caseId} selection={selection}/>}
 {!q.data ? <QueryFeedback pending={q.isPending} error={q.error} retry={()=>void q.refetch()}/> : <>
 {q.isError && <><p role="alert">최신 결과 조회에 실패해 직전 조회 결과를 보존합니다. 최신성을 다시 확인해 주세요.</p><QueryFeedback error={q.error} retry={()=>void q.refetch()}/></>}
 <div className={styles.overview}><ResultSummary compare={false} value={{...vm!,title:q.isError?"직전 조회 결과 · 최신성 미확인":vm!.title}}/><ResultNextSteps value={vm!} caseId={caseId}/></div>
 {q.data.interpretation==="interpretation-error" && <p role="alert">&#44208;&#44284; &#54364;&#49884; &#54644;&#49437;&#50640; &#49892;&#54056;&#54664;&#49845;&#45768;&#45796;. &#50896;&#48376; &#45936;&#51060;&#53552;&#45716; &#48372;&#51316;&#54664;&#49845;&#45768;&#45796;.</p>}
 <p className={styles.notice}><Info size={16} aria-hidden="true"/><span>차이 발견은 미지급임금 확정을 의미하지 않습니다. 공제액의 적법성이나 세금·보험료의 적정성을 판단하지 않습니다.</span></p>
 {q.data.freshness.overall==="FAILED"&&<p role="alert">결과 갱신에 실패해 이전 결과를 보여 드려요. <button className={secondaryButton} onClick={()=>{void q.refetch();void status.refetch();}}>갱신 상태 다시 확인</button></p>}
 <ResultExplorer key={caseId} data={q.data} compare={false} showDetailsInitially={false} freshnessUnverified={q.isError}/>
<nav data-case-next aria-label="결과 관련 화면"><div><h2>확인할 질문을 준비해 볼까요?</h2><p>부족한 자료와 회사에 물어볼 내용을 정리해요.</p></div><Link className={secondaryButton} href={`/cases/${caseId}/questions`}>확인 질문·상담 준비</Link></nav>
 </>}</div>;
}

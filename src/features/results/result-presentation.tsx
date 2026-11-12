import { cardStyle } from "@/components/ui/styles";
import { displayScalar, statusLabels, toResultsViewModel } from "./view-models";
import { ServerValue } from "./result-screen";
import Link from "next/link";
import { ArrowRight, FileCheck2, MessageSquareText, ReceiptText } from "lucide-react";
import styles from "./result-screen.module.css";
type Model = ReturnType<typeof toResultsViewModel>;
function Badge({status}:{status:string|null|undefined}) { return <span className="inline-block rounded-full bg-neutral-soft px-3 py-1 text-sm font-bold">{status ? statusLabels[status] ?? status : "상태 미제공"}</span>; }
export function ResultSummary({value,compare=false}:{value:Model;compare?:boolean}) {
 const d=value.dto;
 const grossAvailable=d.calculation?.grossPay!==null && d.calculation?.grossPay!==undefined;
 const subtotalAvailable=d.calculation?.calculatedSubtotal!==null && d.calculation?.calculatedSubtotal!==undefined;
 const hasAmount=grossAvailable||subtotalAvailable;
 const freshness=d.freshness.overall;
 const cached=value.title==="직전 조회 결과 · 최신성 미확인";
 return <section data-result-summary className={styles.summary} aria-label="임금 결과 요약">
 <div className={styles.summaryTop}><h2 className={styles.summaryTitle}>{value.title}</h2><ReceiptText size={21} aria-hidden="true"/></div>
 <p role="status" className={styles.freshness} data-current={freshness==="CURRENT"&&!cached}>{cached?"직전 조회 결과 · 최신성 미확인":freshness==="CURRENT"?"현재 입력 기준":freshness==="UPDATING"?"자동 갱신 중 · 이전 입력 기준 결과입니다.":freshness==="FAILED"?"갱신 실패 · 이전 입력 기준 결과입니다.":"이전 입력 기준 결과입니다."}</p>
 {!compare&&<>
 {!hasAmount&&<p className={styles.pendingAmount}>계산할 정보가<br/>더 필요해요</p>}
 <dl className={styles.amounts}>
 <div className={hasAmount?styles.mainAmount:styles.secondaryAmount}>
 <dt>{grossAvailable?"확정 가능한 범위의 세전 총액":"계산 가능한 부분 소계 · 전체 임금 아님"}</dt>
 <dd>{displayScalar(grossAvailable?d.calculation?.grossPay:d.calculation?.calculatedSubtotal,grossAvailable?"grossPay":"calculatedSubtotal")}</dd>
 </div>
 <div className={styles.secondaryAmount}>
 <dt>{grossAvailable?"계산 가능한 부분 소계 · 전체 임금 아님":"확정 가능한 범위의 세전 총액"}</dt>
 <dd>{displayScalar(grossAvailable?d.calculation?.calculatedSubtotal:d.calculation?.grossPay,grossAvailable?"calculatedSubtotal":"grossPay")}</dd>
 </div>
 </dl>
 <div className={styles.scope}><Badge status={d.summary.calculationStatus}/><p>{d.summary.calculationStatus==="COMPLETE"?"계산 범위는 서버가 제공한 항목에 한합니다.":d.summary.calculationStatus==="PARTIAL"?<>부분 계산은 전체 임금이 아니에요.<br/>확인되지 않은 값은 계산에 포함하지 않아요.</>:d.summary.calculationStatus===null?"계산 결과가 아직 제공되지 않았어요.":<>계산에 필요한 자료와 조건을<br/>먼저 확인해 주세요.</>}</p></div>
 </>}
 {compare&&<><p className={styles.comparisonTitle}>자료별 차이와<br/>확인할 내용을 살펴보세요</p><Badge status={d.summary.comparisonStatus}/><p className={styles.scopeCopy}>계약·근태·명세서 대조와 명세서 내부 합계는 각각 확인해 주세요. 일치 {d.summary.counts.match ?? "미제공"}개 · 서버 전체 요약</p></>}
 </section>;
}
export function ResultNextSteps({value,caseId}:{value:Model;caseId:number}) {
 const d=value.dto;
 const needsInput=d.summary.counts.insufficientInformation===null || d.summary.counts.reviewRequired===null || d.summary.counts.insufficientInformation>0 || d.summary.counts.reviewRequired>0 || d.summary.calculationStatus!=="COMPLETE";
 return <aside className={styles.nextSteps} aria-label="결과 확인 후 다음 행동">
 <span className={styles.nextIcon} aria-hidden="true">{needsInput?<FileCheck2 size={23}/>:<MessageSquareText size={23}/>}</span>
 <p className={styles.eyebrow}>다음으로 할 일</p>
 <h2>{needsInput?<><span>확인할 내용을</span>{" "}<span>하나씩 채워 보세요</span></>:<><span>결과를 확인했다면</span>{" "}<span>질문을 준비해 보세요</span></>}</h2>
 <p>{needsInput?"원문과 계산 조건을 확인하면 계산 가능한 범위를 넓힐 수 있어요.":"차이가 생긴 이유와 회사에 물어볼 내용을 정리할 수 있어요."}</p>
 <Link className={styles.primaryAction} href={`/cases/${caseId}/${needsInput?"conditions":"questions"}`}>{needsInput?"계산 조건 확인하기":"확인 질문 보기"}<ArrowRight size={18} aria-hidden="true"/></Link>
 <Link className={styles.textAction} href={`/cases/${caseId}/${needsInput?"review":"company-inquiry"}`}>{needsInput?"원문·추출값 확인":"회사 문의 초안 보기"}<ArrowRight size={16} aria-hidden="true"/></Link>
 </aside>;
}
export function ResultChecks({value,caseId}:{value:Model;caseId:number}) {
 const d=value.dto;
 return <section className="space-y-4"><h2 className="text-xl font-bold">검사별 주요 결과</h2>
 <article className={`${cardStyle} border-l-[5px] border-l-primary`}><h3 className="font-bold">계약·근태·명세서 대조</h3><Badge status={d.comparison?.status ?? d.summary.comparisonStatus}/>{d.comparison?.items.map((item,i)=><div key={i} className="my-4 space-y-3"><Badge status={item.status}/><dl className="grid gap-3 md:grid-cols-2">{(["contractValue","attendanceValue","payslipValue","difference"] as const).filter(k=>k in item).map(k=><div key={k}><dt>{{contractValue:"계약값",attendanceValue:"근태값",payslipValue:"명세서값",difference:"차이"}[k]}</dt><dd className="text-xl font-bold">{displayScalar(item[k],k,item.comparisonBasis?.unit)}</dd></div>)}</dl><details><summary>비교 범위·조건·검토 사유</summary><ServerValue caseId={caseId} value={item}/></details></div>)}</article>
 <h3 className="font-bold">명세서 독립 합계 검사</h3><div className="grid gap-4 xl:grid-cols-3">{(["paymentTotal","deductionTotal","netPay"] as const).map(key=>{const check=d.payslipValidation?.[key];return <article key={key} className={`${cardStyle} border-l-[5px] border-l-primary space-y-3`}><h4 className="font-bold">{{paymentTotal:"지급 합계",deductionTotal:"공제 합계",netPay:"실수령액"}[key]}</h4><Badge status={check?.status}/><dl>{check&&(["itemSum","statedTotal","calculated","stated","difference"] as const).filter(k=>k in check).map(k=><div key={k}><dt>{{itemSum:"세부 합계",statedTotal:"명세서 총액",calculated:"서버 계산값",stated:"명세서 값",difference:"차이"}[k]}</dt><dd className="font-bold">{displayScalar(check[k],k,"KRW")}</dd></div>)}</dl>{!check&&<p>검사 결과 없음</p>}</article>})}</div></section>;
}
export function ResultItem({item,caseId}:{item:Model["items"][number];caseId:number}) {
 return <article className={`${cardStyle} border-l-[5px] ${item.status==="MATCH"?"border-l-success":"border-l-warning"} space-y-4`}><h3 className="text-xl font-bold">{item.title}</h3><Badge status={item.status}/><p>산정 기간: {item.dto.periodStart ?? "미제공"} ~ {item.dto.periodEnd ?? "미제공"} · 단위: {item.dto.unit ?? "미제공"}</p><dl className="grid min-w-0 gap-3 md:grid-cols-3">{item.values.map(v=><div key={v.key} className="min-w-0 rounded-control bg-neutral-soft p-4"><dt>{v.label}</dt><dd className="mt-2 text-2xl font-bold">{v.text}</dd></div>)}</dl>{item.dto.nextAction&&<p>{item.dto.nextAction}</p>}<details><summary className="font-bold">근거·계산식·검토 사유 펼치기</summary><ServerValue caseId={caseId} value={item.dto}/></details></article>;
}


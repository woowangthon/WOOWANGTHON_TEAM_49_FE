import { cardStyle } from "@/components/ui/styles";
import { displayScalar, statusLabels, toResultsViewModel } from "./view-models";
import { ServerValue } from "./result-screen";
type Model = ReturnType<typeof toResultsViewModel>;
function Badge({status}:{status:string|null|undefined}) { return <span className="inline-block rounded-full bg-neutral-soft px-3 py-1 text-sm font-bold">{status ? statusLabels[status] ?? status : "상태 미제공"}</span>; }
export function ResultSummary({value,compare=false}:{value:Model;compare?:boolean}) {
 const d=value.dto;
 return <section data-case-summary className={`${cardStyle} space-y-4`}>
 <h2 className="text-xl font-bold">{value.title}</h2>
 <p role="status">{d.freshness.overall==="CURRENT"?"현재 입력 기준":d.freshness.overall==="UPDATING"?"자동 갱신 중 · 이전 입력 기준 결과입니다.":d.freshness.overall==="FAILED"?"갱신 실패 · 이전 입력 기준 결과입니다.":"이전 입력 기준 결과입니다."}</p>
 <Badge status={compare?d.summary.comparisonStatus:d.summary.calculationStatus}/>
 {!compare&&<><dl className="grid gap-4 sm:grid-cols-2"><div><dt>계산 가능한 부분 소계 · 전체 임금 아님</dt><dd className="text-2xl font-bold">{displayScalar(d.calculation?.calculatedSubtotal,"calculatedSubtotal")}</dd></div><div><dt>확정 가능한 범위의 세전 총액</dt><dd className="text-2xl font-bold">{displayScalar(d.calculation?.grossPay,"grossPay")}</dd></div></dl>
 <p>계산 범위는 서버가 제공한 항목에 한합니다. 부분 계산은 전체 임금 확정을 의미하지 않습니다.</p></>}
 {compare&&<p>계약·근태·명세서의 차이와 명세서 내부 합계를 각각 확인하세요. 일치 {d.summary.counts.match}개 · 서버 전체 요약</p>}
 </section>;
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


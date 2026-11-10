import { formatDate, formatQuantity } from "@/lib/format";
import type { Results } from "./schemas";
export const statusLabels:Record<string,string> = {MATCH:"✓ 자료상 일치",DIFFERENCE:"△ 차이 발견 — 미지급임금 확정이 아닙니다",INSUFFICIENT_INFORMATION:"? 정보 부족",REVIEW_REQUIRED:"! 검토 필요",COMPLETE:"계산 완료",PARTIAL:"부분 계산",CALCULATED:"계산됨",NOT_APPLICABLE:"적용 대상 아님",CURRENT:"최신",STALE:"오래된 결과",UPDATING:"갱신 중 · 이전 결과",FAILED:"갱신 실패 · 이전 결과",PENDING:"작업 대기",RUNNING:"작업 실행 중",SUCCEEDED:"작업 성공 (모든 계산 완료를 의미하지 않음)",SUPERSEDED:"새 입력으로 대체된 작업"};
export const fieldLabels:Record<string,string> = {calculationStatus:"계산 상태",comparisonStatus:"대조 상태",calculatedSubtotal:"계산 가능한 소계 (전체 세전 임금 아님)",grossPay:"확정 가능한 범위의 세전 총액",paymentTotal:"지급 세부 합계와 지급총액",deductionTotal:"공제 세부 합계와 공제총액",netPay:"지급총액 − 공제총액과 실수령액",contractValue:"계약값",attendanceValue:"근태값",payslipValue:"명세서값",calculatedValue:"계산값",documentValue:"문서값",difference:"차이",comparisonBasis:"비교 범위·조건",semanticMatch:"기간·단위·의미 일치 여부",formula:"서버 계산식",inputs:"입력값",expression:"산식",sources:"원문 출처",rule:"서버 적용 규칙 (원문 출처와 별도)",ruleVersion:"규칙 버전",verified:"규칙 검증 여부",version:"결과 버전",basedOnInputVersion:"기준 입력 버전",inputVersion:"입력 버전",freshness:"최신성",confirmedAt:"확인 시각",nextAction:"다음 행동",itemSum:"세부 합계",statedTotal:"명세서 총액",calculated:"서버 계산값",stated:"명세서 값",amount:"금액",unit:"단위",periodStart:"산정기간 시작일",periodEnd:"산정기간 종료일",createdAt:"생성 시각",counts:"항목 수",match:"일치",differenceCount:"차이",insufficientInformation:"정보 부족",reviewRequired:"검토 필요",label:"항목",title:"결과 항목",status:"상태",reasonCode:"서버 사유",requestedInputVersion:"요청 입력 버전",completedAt:"작업 종료 시각"};
const moneyKeys=new Set(["grossPay","calculatedSubtotal","amount","itemSum","statedTotal","calculated","stated"]);
const quantityKeys=new Set(["calculatedValue","documentValue","contractValue","attendanceValue","payslipValue","difference","value"]);
export function displayScalar(value:unknown,key?:string,unit?:string|null):string {
 if(value===undefined)return "미제공";if(value===null)return "미확정·확정 불가";
 if(typeof value==="boolean")return value?"예":"아니요";
 if(typeof value==="number" && unit==="COUNT")return formatQuantity(value,unit);
 if(typeof value==="number")return moneyKeys.has(key??"")?formatQuantity(value,"KRW"):quantityKeys.has(key??"")?formatQuantity(value,unit):String(value);
 if(typeof value==="string" && key && /(?:At|Start|End)$/.test(key))return formatDate(value);
 return statusLabels[String(value)] ?? String(value);
}
export function resultRows(value:Record<string,unknown>,inheritedUnit?:string|null) {
 const basis=value.comparisonBasis as {unit?:unknown}|undefined;
 const unit=typeof value.unit==="string"?value.unit:typeof basis?.unit==="string"?basis.unit:typeof value.currency==="string"?value.currency:inheritedUnit;
 return Object.entries(value).map(([key,data])=>({key,label:fieldLabels[key]??key,value:data,unit}));
}
export function toResultsViewModel(dto:Results) {
 return {dto,title:`결과 요약 · ${statusLabels[dto.freshness.overall]}`,inputVersion:dto.currentInputVersion,resultVersion:dto.resultVersion===null?"없음":String(dto.resultVersion)};
}

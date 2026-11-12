"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, FileText } from "lucide-react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { OriginalViewer } from "@/features/documents/review/components/original-viewer";
import { useFields } from "@/features/documents/review/queries";
import { fieldStatusLabels } from "@/features/documents/review/view-models";
import { resultSourceSchema, type ResultSource } from "./schemas";
import { useSourceDocument } from "./queries";
import styles from "./source-evidence.module.css";
const types:Record<string,string>={PAYSLIP:"급여명세서",CONTRACT:"계약서",ATTENDANCE:"근태 자료",DEPOSIT:"입금 자료"};
export function SourceEvidence({caseId,value,compact=false}:{caseId:number;value:Record<string,unknown>;compact?:boolean}) {
 const parsed=resultSourceSchema.safeParse(value);
 return parsed.success?<Evidence caseId={caseId} source={parsed.data} compact={compact}/>:<p role="alert">원문 출처 형식을 확인할 수 없습니다. 원문을 임의로 강조하지 않습니다.</p>;
}
function Evidence({caseId,source,compact}:{caseId:number;source:ResultSource;compact:boolean}) {
 const doc=useSourceDocument(caseId,source.documentId);
 const fields=useFields(caseId,source.documentId,!!doc.data && !doc.isError);
 const [open,setOpen]=useState(false);
 const matches=fields.data?.fields.filter(f=>source.fieldId!==undefined ? f.fieldId===source.fieldId : !!source.text && f.source?.text===source.text && f.source?.page===source.page && f.source?.documentId===source.documentId) ?? [];
 const field=matches.length===1?matches[0]:undefined;
 if(compact)return <section aria-label="결과 원문 근거" className={styles.compact}>
  {doc.isPending?<p role="status">원문 근거를 불러오는 중이에요.</p>:doc.isError?<><p role="alert">출처 문서가 삭제·연결 해제되었거나 접근할 수 없습니다. 이전 결과에 포함된 원문 문구도 표시하지 않습니다.</p><button className={secondaryButton} onClick={()=>void doc.refetch()}>출처 다시 조회</button></>:<>
   <Link href={`/cases/${caseId}/review?documentId=${source.documentId}`} aria-label={`문서 검토: ${doc.data.fileName}`} className={styles.row}>{doc.data.documentType==="DEPOSIT"?<ArrowDownToLine size={19} aria-hidden="true"/>:<FileText size={19} aria-hidden="true"/>}<div className={styles.identity}><h5>{types[doc.data.documentType]}</h5><p>{doc.data.fileName} · {source.page===null?"페이지 미제공":`${source.page}페이지`}</p></div><span className={styles.snapshot}>문서 검토<ArrowUpRight size={13} aria-hidden="true"/></span></Link>
   <p className={styles.snapshotLabel}>실행 시점 값</p>
   {!doc.isFetching&&<p className={styles.quote}>결과 스냅샷 근거: {source.text??"근거 문구 미제공"}</p>}
   <p className={styles.current}>{fields.isPending?"현재 필드 확인 중":fields.isError?"현재 필드 정보에 접근할 수 없습니다.":field?`현재 필드: ${field.label} · ${fieldStatusLabels[field.status]}`:"현재 대응 필드가 없거나 특정할 수 없습니다."} 현재 정보는 결과 실행 시점과 다를 수 있어요.</p>
  </>}
 </section>;
 return <section aria-label="결과 원문 근거" className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
 {doc.isPending?<QueryFeedback pending/>:doc.isError?<><p role="alert">출처 문서가 삭제·연결 해제되었거나 접근할 수 없습니다. 이전 결과에 포함된 원문 문구도 표시하지 않습니다.</p><button className={secondaryButton} onClick={()=>void doc.refetch()}>출처 다시 조회</button></>:<><h3 className="font-bold">{doc.data.fileName}</h3><p>{types[doc.data.documentType]} · {source.page===null?"페이지 미제공":`${source.page}페이지`}</p>
 {fields.isPending?<p role="status">필드 확인 중</p>:fields.isError?<p>현재 필드 정보에 접근할 수 없습니다. 저장된 결과 근거와 구분해 확인하세요.</p>:field?<p>현재 필드: {field.label} · {fieldStatusLabels[field.status]} · {field.editedByUser?"사용자 수정값":"문서 추출값 (AI/OCR 추출은 사용자 확인 상태와 별도)"} · {field.hasCaseOverride?"이 사례의 재정의":"공유 기본값"}</p>:<p>현재 대응 필드가 없거나 특정할 수 없습니다. 결과 생성 당시 근거를 확인하세요.</p>}
 <Link className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={`/cases/${caseId}/review?documentId=${source.documentId}`}>문서 검토: {doc.data.fileName}</Link><button className={secondaryButton} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>원문 근거 펼치기·접기</button>
 {open && <OriginalViewer workplaceId={doc.data.workplaceId} documentId={source.documentId} source={source}/>}</>}
 {doc.isSuccess&&!doc.isFetching&&<><p>결과 스냅샷 근거: {source.text ?? "근거 문구 미제공"}</p><p>결과 원문 페이지: {source.page ?? "미제공"}. 현재 필드 정보는 결과 생성 시점과 다를 수 있습니다.</p>{!source.boundingBox && <p>좌표가 없어 강조하지 않습니다. 페이지와 근거 문구를 확인하세요.</p>}</>}
 </section>;
}

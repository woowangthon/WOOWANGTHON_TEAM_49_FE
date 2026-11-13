"use client";
import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import {createLocalizedFeaturesResultsSchemas} from './schemas';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '@/features/documents/review/view-models';

import { useTranslation } from '@/i18n/use-translation';

import Link from "next/link";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, FileText } from "lucide-react";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { secondaryButton } from "@/components/ui/styles";
import { OriginalViewer } from "@/features/documents/review/components/original-viewer";
import { useFields } from "@/features/documents/review/queries";

import {type ResultSource} from "./schemas";
import { useSourceDocument } from "./queries";
import styles from "./source-evidence.module.css";

export function SourceEvidence({caseId,value,compact=false}:{caseId:number;value:Record<string,unknown>;compact?:boolean}) {
const {resultSourceSchema} = useLocalized(createLocalizedFeaturesResultsSchemas);

 const {translate} = useTranslation();

 const parsed=resultSourceSchema.safeParse(value);
 return parsed.success?<Evidence caseId={caseId} source={parsed.data} compact={compact}/>:<p role="alert">{translate("results.sourceEvidence_original_source_format_confirm_count_empty")}</p>;
}
function Evidence({caseId,source,compact}:{caseId:number;source:ResultSource;compact:boolean}) {
const {types} = useLocalized(createPresentation);

const {fieldStatusLabels} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate} = useTranslation();

 const doc=useSourceDocument(caseId,source.documentId);
 const fields=useFields(caseId,source.documentId,!!doc.data && !doc.isError);
 const [open,setOpen]=useState(false);
 const matches=fields.data?.fields.filter(f=>source.fieldId!==undefined ? f.fieldId===source.fieldId : !!source.text && f.source?.text===source.text && f.source?.page===source.page && f.source?.documentId===source.documentId) ?? [];
 const field=matches.length===1?matches[0]:undefined;
 if(compact)return <section aria-label={translate("results.sourceEvidence_result_original_evidence")} className={styles.compact}>
  {doc.isPending?<p role="status">{translate("results.sourceEvidence_original_evidence_load")}</p>:doc.isError?<><p role="alert">{translate("results.sourceEvidence_source_document_delete_link_release_access_count")}</p><button className={secondaryButton} onClick={()=>void doc.refetch()}>{translate("results.sourceEvidence_source_retry")}</button></>:<>
   <Link href={`/cases/${caseId}/review?documentId=${source.documentId}`} aria-label={translate("results.sourceEvidence_document_review", { value1: doc.data.fileName })} className={styles.row}>{doc.data.documentType==="DEPOSIT"?<ArrowDownToLine size={19} aria-hidden="true"/>:<FileText size={19} aria-hidden="true"/>}<div className={styles.identity}><h5>{types[doc.data.documentType]}</h5><p>{doc.data.fileName} · {source.page===null?translate("results.sourceEvidence_page_notProvided"):translate("results.sourceEvidence_page", { value1: source.page })}</p></div><span className={styles.snapshot}>{translate("results.sourceEvidence_document_review_2")}<ArrowUpRight size={13} aria-hidden="true"/></span></Link>
   {source.analysisValueOrigin==="SYSTEM_EXTRACTED_UNVERIFIED"&&<p>{translate("documents.reviewPolicy_automatic")}</p>}
   <p className={styles.snapshotLabel}>{translate("results.sourceEvidence_run")}</p>
   {!doc.isFetching&&<p className={styles.quote}>{translate("results.sourceEvidence_result_evidence", { value1: source.text??translate("results.sourceEvidence_evidence_notProvided") })}</p>}
   <p className={styles.current}>{translate("results.sourceEvidence_current_information_result_run_count", { value1: fields.isPending?translate("results.sourceEvidence_current_field_confirm"):fields.isError?translate("results.sourceEvidence_current_field_information_access_count_empty"):field?translate("results.sourceEvidence_current_field_2", { value1: field.label, value2: fieldStatusLabels[field.status] }):translate("results.sourceEvidence_current_field_none_count_empty") })}</p>
  </>}
 </section>;
 return <section aria-label={translate("results.sourceEvidence_result_original_evidence")} className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
 {doc.isPending?<QueryFeedback pending/>:doc.isError?<><p role="alert">{translate("results.sourceEvidence_source_document_delete_link_release_access_count")}</p><button className={secondaryButton} onClick={()=>void doc.refetch()}>{translate("results.sourceEvidence_source_retry")}</button></>:<><h3 className="font-bold">{doc.data.fileName}</h3><p>{types[doc.data.documentType]} · {source.page===null?translate("results.sourceEvidence_page_notProvided"):translate("results.sourceEvidence_page", { value1: source.page })}</p>
 {fields.isPending?<p role="status">{translate("results.sourceEvidence_field_confirm")}</p>:fields.isError?<p>{translate("results.sourceEvidence_current_field_information_access_count_empty_save")}</p>:field?<p>{translate("results.sourceEvidence_current_field", { value1: field.label, value2: fieldStatusLabels[field.status], value3: field.editedByUser?translate("results.sourceEvidence_user_edit"):translate("results.sourceEvidence_document_extractedValue_extraction_user_confirm_status"), value4: field.hasCaseOverride?translate("results.sourceEvidence_override"):translate("results.sourceEvidence_sharedDefault") })}</p>:<p>{translate("results.sourceEvidence_current_field_none_count_empty_result_evidence")}</p>}
 <Link className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={`/cases/${caseId}/review?documentId=${source.documentId}`}>{translate("results.sourceEvidence_document_review", { value1: doc.data.fileName })}</Link><button className={secondaryButton} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{translate("results.sourceEvidence_original_evidence_expand_collapse")}</button>
 {open && <OriginalViewer workplaceId={doc.data.workplaceId} documentId={source.documentId} source={source}/>}</>}
 {doc.isSuccess&&source.analysisValueOrigin==="SYSTEM_EXTRACTED_UNVERIFIED"&&<p>{translate("documents.reviewPolicy_automatic")}</p>}
 {doc.isSuccess&&!doc.isFetching&&<><p>{translate("results.sourceEvidence_result_evidence", { value1: source.text ?? translate("results.sourceEvidence_evidence_notProvided") })}</p><p>{translate("results.sourceEvidence_result_original_page_current_field_information_count", { value1: source.page ?? translate("common.notProvided") })}</p>{!source.boundingBox && <p>{translate("results.sourceEvidence_empty_page_evidence_confirm")}</p>}</>}
 </section>;
}

function createPresentation({translate}: Translation) {
const types:Record<string,string>={PAYSLIP:translate("results.sourceEvidence_payslip"),CONTRACT:translate("results.sourceEvidence_contract"),ATTENDANCE:translate("results.sourceEvidence_attendance_record"),DEPOSIT:translate("results.sourceEvidence_deposit_record")};
return {types};
}

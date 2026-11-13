"use client";
import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsReviewViewModels} from '../view-models';

import { useTranslation } from '@/i18n/use-translation';

import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { useFieldHistory } from "../queries";

export function FieldHistory({caseId,documentId,fieldId}:{caseId:number;documentId:number;fieldId:number}){
const {displayValue} = useLocalized(createLocalizedFeaturesDocumentsReviewViewModels);

 const {translate, locale: defaultLocale} = useTranslation();

  const [page,setPage]=useState(1);const q=useFieldHistory(caseId,documentId,fieldId,page);
  if(q.isPending)return <QueryFeedback pending />;if(q.isError)return <QueryFeedback error={q.error} retry={()=>{void q.refetch();}} />;
  return <section className="mt-4 min-w-0 space-y-3" aria-label={translate("documents.fieldHistory_field_editHistory")}><h4 className="text-body font-bold">{translate("documents.fieldHistory_editHistory")}</h4>
    {!q.data.items.length?<p>{translate("documents.fieldHistory_editHistory_empty")}</p>:<ol className="space-y-3">{q.data.items.map(h=><li className="break-words rounded-control border border-border p-3" key={h.historyId}><p>{displayValue(h.previousValue)} → {displayValue(h.newValue)}</p><p>{new Date(h.changedAt).toLocaleString(defaultLocale)}</p><p>{translate("documents.fieldHistory_change_scope", { value1: translate("documents.fieldHistory_value1_p"), value2: h.scope==="SHARED_DEFAULT"?translate("documents.fieldEditor_sharedDefault"):h.scope==="CASE_OVERRIDE"?translate("documents.viewModels_case_override"):h.scope })}</p></li>)}</ol>}
    <Pagination page={q.data.page} size={q.data.size} total={q.data.total} onPage={setPage} busy={q.isFetching} />
  </section>;
}

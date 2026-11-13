import {getTranslations} from 'next-intl/server';

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewScreen } from "@/features/documents/review/components/review-screen";
import { parseRouteId } from "@/lib/route-id";
export async function generateMetadata(): Promise<Metadata> {
 const t = await getTranslations();
 return {title:t("common.page_document_original_extractedValue_review")};
}
export default async function ReviewPage({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<{documentId?:string}>}){
  const id=parseRouteId((await params).caseId);if(id===null)notFound();
  const query=await searchParams;
  const documentId=query.documentId?parseRouteId(query.documentId):undefined;
  if(documentId===null)notFound();
  return <ReviewScreen id={id} initialDocumentId={documentId} />;
}

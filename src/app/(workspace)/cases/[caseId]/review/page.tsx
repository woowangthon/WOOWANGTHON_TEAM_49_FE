import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewScreen } from "@/features/documents/review/components/review-screen";
import { replacementIdSchema } from "@/features/documents/review/schemas";
import { parseRouteId } from "@/lib/route-id";
export const metadata: Metadata={title:"문서 원문·추출값 검토"};
export default async function ReviewPage({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<{documentId?:string;replacementId?:string}>}){
  const id=parseRouteId((await params).caseId);if(id===null)notFound();
  const query=await searchParams;
  if(query.replacementId!==undefined&&!replacementIdSchema.safeParse(query.replacementId).success)notFound();const documentId=query.documentId?parseRouteId(query.documentId):undefined;
  if(documentId===null)notFound();
  return <ReviewScreen id={id} initialDocumentId={documentId} initialReplacementId={query.replacementId} />;
}

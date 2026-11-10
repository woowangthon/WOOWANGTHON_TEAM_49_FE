import { notFound } from "next/navigation";
import { parseRouteId } from "@/lib/route-id";
import { InquiryScreen } from "@/features/case-support/screens";
export default async function Page({params}:{params:Promise<{caseId:string}>}){const id=parseRouteId((await params).caseId);if(id===null)notFound();return <InquiryScreen key={id} caseId={id}/>}

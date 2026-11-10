import { parseSnapshot,safeChatReturn } from "@/features/results/snapshot-link";
import { notFound } from "next/navigation";
import { ResultScreen } from "@/features/results/result-screen";
import { parseRouteId } from "@/lib/route-id";
export default async function Page({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const id=parseRouteId((await params).caseId); if(id===null) notFound();
 const q=await searchParams;return <ResultScreen caseId={id} compare={false} selection={parseSnapshot(q)} returnTo={safeChatReturn(q.returnTo)}/>;
}

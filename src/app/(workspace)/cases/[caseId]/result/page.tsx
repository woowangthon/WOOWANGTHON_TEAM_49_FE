import { notFound } from "next/navigation";
import { ResultScreen } from "@/features/results/result-screen";
import { parseRouteId } from "@/lib/route-id";
export default async function Page({params}:{params:Promise<{caseId:string}>}) {
 const id=parseRouteId((await params).caseId); if(id===null) notFound();
 return <ResultScreen caseId={id} compare={false}/>;
}

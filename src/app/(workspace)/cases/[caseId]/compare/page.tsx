import { notFound, redirect } from "next/navigation";
import { parseRouteId } from "@/lib/route-id";
export default async function Page({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const id=parseRouteId((await params).caseId); if(id===null) notFound();
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(await searchParams)) for(const item of Array.isArray(value)?value:value===undefined?[]:[value]) query.append(key,item);
 redirect(`/cases/${id}/result${query.size?`?${query}`:""}`);
}

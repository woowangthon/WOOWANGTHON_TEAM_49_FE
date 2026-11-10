"use client";
import { useMutation,useQuery } from "@tanstack/react-query";
import { useSessionScope } from "@/hooks/use-session-scope";
import { businessKeys } from "@/lib/query/business-keys";
import { paymentsApi } from "./api";
export function usePayments(w:number,page=1,c?:number) {
 const s=useSessionScope();const api=paymentsApi(s.api);
 const transactions=useQuery({queryKey:[...businessKeys.workplace(s.generation,w),"payments",page],queryFn:()=>api.list(w,page),enabled:s.enabled});
 const allocations=useQuery({queryKey:[...businessKeys.case(s.generation,c??0),"deposits"],queryFn:()=>api.allocations(c!),enabled:s.enabled&&!!c});
 const action=useMutation({gcTime:0,mutationFn:(run:()=>Promise<unknown>)=>run(),onSettled:async()=>{if(s.session.getSnapshot().generation!==s.generation)return;await s.queryClient.invalidateQueries({queryKey:businessKeys.root(s.generation)});}});
 return {api,transactions,allocations,action};
}

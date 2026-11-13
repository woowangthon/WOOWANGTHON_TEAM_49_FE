import {expect,it} from "vitest";
import {observeRecompute} from "./recompute-observation";
import type {recomputeSchema} from "./api";
import type {z} from "zod";
const result=(status:string):z.infer<typeof recomputeSchema>=>({caseId:15,currentInputVersion:63,results:{},activeJob:["RUNNING","PENDING"].includes(status)?{jobId:"a",status}:null,latestJob:{jobId:"a",status}});
it("does not refresh an idle status or an initial terminal snapshot",()=>{expect(observeRecompute(undefined,result("SUCCEEDED")).refresh).toBe(false);});
it.each(["SUCCEEDED","PARTIAL","FAILED","SUPERSEDED"])("refreshes %s once across cached observer/remount state",status=>{
 const active=observeRecompute(undefined,result("PENDING"));
 const running=observeRecompute(active.state,result("RUNNING"));
 expect(running.refresh).toBe(false);
 const done=observeRecompute(running.state,result(status));expect(done.refresh).toBe(true);
 expect(observeRecompute(done.state,result(status)).refresh).toBe(false);
});
it("consumes a mutation receipt once even if the job completed before the next poll",()=>{
 const done=observeRecompute(undefined,result("PARTIAL"),"a");expect(done.refresh).toBe(true);
 expect(observeRecompute(done.state,result("PARTIAL"),"a").refresh).toBe(false);
});
it("keeps case and generation observations independent",()=>{
 const prior=observeRecompute(undefined,result("RUNNING"));
 expect(observeRecompute(undefined,result("SUCCEEDED")).refresh).toBe(false);
 expect(observeRecompute(prior.state,result("SUCCEEDED")).refresh).toBe(true);
});

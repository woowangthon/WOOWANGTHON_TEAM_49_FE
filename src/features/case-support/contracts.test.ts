import { describe,it,expect } from "vitest";
import { questionsSchema,reportSchema } from "./schemas";
describe("support response adapters",()=>{
 it("preserves an empty server question list",()=>expect(questionsSchema.parse({questions:[]}).questions).toEqual([]));
 it("rejects fabricated question fields",()=>expect(questionsSchema.safeParse({questions:[{title:"invented"}]}).success).toBe(false));
 it("does not convert a failed report to ready",()=>{const r=reportSchema.parse({reportId:1,version:1,status:"FAILED",basedOnInputVersion:3,referencedSnapshots: {calculation:{snapshotId:1,version:1,inputVersion:1,createdAt:null,freshness:"CURRENT" as const}},selectedDocumentIds:[101],createdAt:"2026-11-10",isCurrent:false});expect(r.status).toBe("FAILED");expect(r.referencedSnapshots.calculation.snapshotId).toBe(1);expect(r.isCurrent).toBe(false)});
 it("does not accept an unknown report status",()=>expect(reportSchema.safeParse({status:"COMPLETED"}).success).toBe(false));
});

import { reportPdf,snapshotZip } from "@/mocks/shared/report-files";
import { writeFileSync,mkdirSync } from "node:fs";
it("produces inspectable synthetic PDF and ZIP artifacts for a fixed snapshot",()=>{
 const r={reportId:90,version:1,status:"READY" as const,basedOnInputVersion:7,referencedSnapshots: {calculation:{snapshotId:1,version:1,inputVersion:1,createdAt:null,freshness:"CURRENT" as const}},selectedDocumentIds:[],createdAt:"2026-11-10",isCurrent:true};
 const pdf=reportPdf(r),zip=snapshotZip(r);expect(new TextDecoder().decode(pdf)).toContain("Input version 7");expect(new DataView(zip.buffer).getUint32(0,true)).toBe(0x04034b50);mkdirSync("test-results",{recursive:true});writeFileSync("test-results/report-sample.pdf",pdf);writeFileSync("test-results/report-sample.zip",zip);
});

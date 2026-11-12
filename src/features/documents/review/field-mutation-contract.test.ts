import {describe, expect, it} from "vitest";
import {caseFieldUpdatedSchema, sharedFieldUpdatedSchema} from "./schemas";
import {createOpenApiContract} from "@/test/openapi/contract";

const contract=createOpenApiContract("contracts/openapi.json");
// API_REFERENCE.html API-044/045: caseUpdates is a map; previousValue may be null/string.
const recompute={scheduled:true,jobId:"job-example",affectedChecks:["PAYSLIP_VALIDATION"]};
const shared={fieldId:1,previousValue:"2290000",value:2300000,status:"CONFIRMED",editedByUser:true,hasCaseOverride:false,effectiveValueOrigin:"SHARED_DEFAULT",affectedCaseIds:[1],caseUpdates:{"1":{inputVersion:4,recompute}}};
const individual={...shared,hasCaseOverride:true,effectiveValueOrigin:"CASE_OVERRIDE",inputVersion:4,recompute};
describe("field mutation wire contract regression",()=>{
 it.each([shared,individual])("validates P0 envelope and converts the documented map",data=>{
   expect(contract.response({method:"PATCH",url:"/api/v1/cases/1/documents/1/fields/1"},200,{code:200,message:"ok",data})).toMatchObject({valid:true,coverage:"free-json"});
   const schema=data===shared?sharedFieldUpdatedSchema:caseFieldUpdatedSchema;
   expect(schema.parse(data).caseUpdates).toEqual([{caseId:1,inputVersion:4,recompute}]);
 });
 it("rejects legacy array, malformed versions, IDs and metadata",()=>{
   for(const caseUpdates of [[{caseId:1,inputVersion:4,recompute}],{"x":{inputVersion:4,recompute}},{"1":{inputVersion:null,recompute}},{"1":{inputVersion:4,recompute:{scheduled:"true"}}}]){
     expect(caseFieldUpdatedSchema.safeParse({...individual,caseUpdates}).success).toBe(false);
   }
 });
 it.each([null,0,false,"",{items:[null,0]}])("preserves value %j without defaults",value=>{
   expect(sharedFieldUpdatedSchema.parse({...shared,value,previousValue:null}).value).toEqual(value);
 });
 it("requires the individual version and retains empty shared impact maps",()=>{
   expect(caseFieldUpdatedSchema.safeParse({...individual,inputVersion:undefined}).success).toBe(false);
   const result=sharedFieldUpdatedSchema.parse({...shared,affectedCaseIds:[],caseUpdates:{}});
   expect(result.caseUpdates).toEqual([]); expect(result.inputVersion).toBeUndefined();
 });
});

import { describe, expect, it } from "vitest";
import { http } from "msw";
import { createOpenApiContract } from "./contract";
import { fieldWireSchema, fieldsSchema, fieldSchema } from "@/features/documents/review/schemas";
import { fieldView, reviewStateView } from "@/features/documents/review/view-models";
import { loginResponseSchema, userSchema } from "@/features/auth/schemas";
import { documentSchema } from "@/features/documents/schemas";
import { documentApi } from "@/features/documents/api";
import { createAppServices } from "@/lib/app-services";
import { apiResponse, server, testApiUrl } from "@/test/server";

const contract = createOpenApiContract();
const user = {userId:0,email:"opaque",name:""};
const login = {accessToken:"token",tokenType:"Bearer",expiresIn:1800,user};
const field = {fieldId:0,key:"a",label:"A",value:0,valueType:"number",status:"DEFERRED",editedByUser:false,effectiveValueOrigin:"SHARED_DEFAULT",hasCaseOverride:false,confirmedAt:"opaque",source:null};
const fields = {documentId:0,caseId:-1,processingStatus:"opaque",reviewStatus:"opaque",fields:[field]};
const document = {documentId:101,workplaceId:3,documentType:"PAYSLIP",fileName:"a.pdf",processingStatus:"READY",reviewStatus:"NOT_STARTED",progress:100,linkId:null,linkedCaseIds:[],uploadedAt:"opaque",errorCode:null,aiMetadata:null};
const parsers = {FieldDTO:fieldWireSchema,FieldsDTO:fieldsSchema,UserDTO:userSchema,LoginDTO:loginResponseSchema,DocumentDTO:documentSchema};
const examples = {FieldDTO:field,FieldsDTO:fields,UserDTO:user,LoginDTO:login,DocumentDTO:document};

describe("N01/N02/N03/N07 independent P0 and FE comparison", () => {
  for (const name of Object.keys(parsers) as (keyof typeof parsers)[]) {
    it(`${name}: accepts P0-valid values and rejects each missing required field`, () => {
      const value = examples[name];
      expect(contract.component(name,value).valid).toBe(true);
      expect(parsers[name].safeParse(value).success).toBe(true);
      for (const key of Object.keys(value)) {
        const missing: Record<string,unknown> = {...value}; delete missing[key];
        expect(contract.component(name,missing).valid, key).toBe(false);
        expect(parsers[name].safeParse(missing).success, key).toBe(false);
      }
    });
  }
  it.each([{...login,accessToken:""},{...login,expiresIn:-1}])("accepts wire values but refuses an unusable login session", async value => {
    expect(contract.component("LoginDTO",value).valid).toBe(true);
    expect(loginResponseSchema.safeParse(value).success).toBe(true);
    server.use(http.post(`${testApiUrl}/auth/login`,()=>apiResponse(value)));
    const app=createAppServices(testApiUrl);
    try {
      await expect(app.authApi.login({email:"a@b.com",password:"x"})).resolves.toEqual(value);
      await expect(app.auth.login({email:"a@b.com",password:"x"})).rejects.toMatchObject({kind:"protocol"});
      expect(app.auth.getSnapshot().status).toBe("anonymous");
      expect(app.session.getSnapshot().accessToken).toBeNull();
    } finally {app.session.clear();app.queryClient.clear();}
  });
  it("preserves opaque review state/date and disables unsafe actions",()=>{
    expect(fieldsSchema.parse(fields).reviewStatus).toBe("opaque");
    expect(reviewStateView("READY","opaque")).toEqual({reviewLabel:"opaque",canAct:false});
    expect(fieldView(fieldSchema.parse(field))).toMatchObject({confirmedLabel:"opaque",canEdit:false});
  });
  it.each(["tokenType","expiresIn","user","accessToken"])("refresh rejects missing %s and expires authentication",async key=>{
    const value:Record<string,unknown>={...login};delete value[key];
    expect(contract.component("LoginDTO",value).valid).toBe(false);
    server.use(http.post(`${testApiUrl}/auth/refresh`,()=>apiResponse(value)));
    const app=createAppServices(testApiUrl); app.session.start("old");
    try {
      await expect(app.api.refreshSession()).rejects.toBeDefined();
      expect(app.session.getSnapshot().accessToken).toBeNull();
    } finally {app.session.clear();app.queryClient.clear();}
  });
  it.each(["case","workplace"] as const)("validates the full GET DocumentDTO for %s status",async kind=>{
    const app=createAppServices(testApiUrl);app.session.start("token");
    const path=`${testApiUrl}/${kind==="case"?"cases":"workplaces"}/3/documents/101`;
    const values:unknown[]=[document,{documentId:101,processingStatus:"READY"},{...document,progress:0.5},...Object.keys(document).map(key=>{const v:Record<string,unknown>={...document};delete v[key];return v;})];
    try {
      for(const value of values){
        server.use(http.get(path,()=>apiResponse(value)));
        const valid=contract.component("DocumentDTO",value).valid;
        expect(documentSchema.safeParse(value).success).toBe(valid);
        const result=documentApi(app.api).status({kind,id:3},101);
        if(valid) await expect(result).resolves.toMatchObject({documentId:101,progress:100});
        else await expect(result).rejects.toMatchObject({kind:"protocol"});
      }
    } finally {app.session.clear();app.queryClient.clear();}
  });
});

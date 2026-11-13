import {createTranslation} from '@/i18n/translate';
import {describe, expect, it} from "vitest";
import {createOpenApiContract} from "./contract";
import {fieldSchema, fieldsSchema, valueSchema} from "@/features/documents/review/schemas";
import {processingSchema} from "@/features/documents/schemas";
import {createLocalizedFeaturesDocumentsReviewViewModels} from '@/features/documents/review/view-models';
import {createLocalizedFeaturesDocumentsViewModels} from '@/features/documents/view-models';

const {displayValue, fieldEditorView, parseFieldValue} = createLocalizedFeaturesDocumentsReviewViewModels(createTranslation('ko'));
const {isProcessing} = createLocalizedFeaturesDocumentsViewModels(createTranslation('ko'));
const contract=createOpenApiContract("contracts/openapi.json");
const field={fieldId:1,key:"items",label:"Items",value:null,valueType:"JSON",status:"DEFERRED",editedByUser:false,effectiveValueOrigin:"SHARED_DEFAULT",hasCaseOverride:false,confirmedAt:null,source:null};
describe("A03/A06 independent P0 alignment",()=>{
 it.each(["DEFERRED","NEEDS_RECONFIRMATION"])("retains %s without substitution",status=>{
   const dto={...field,status};expect(contract.component("FieldDTO",dto)).toMatchObject({valid:true});expect(fieldSchema.parse(dto).status).toBe(status);
 });
 it.each([null,0,false,"",[],{},[0,null,{nested:[false]}],{items:[null,0,false]}])("preserves JSON %j",value=>{
   const dto={...field,value};expect(contract.component("FieldDTO",dto).valid).toBe(true);
   expect(contract.component("FieldPatch",{value}).valid).toBe(true);
   const parsed=fieldSchema.parse(dto);expect(parsed.value).toEqual(value);expect(valueSchema.parse(value)).toEqual(value);
   if(value!==null&&typeof value==="object"){
     expect(JSON.parse(fieldEditorView(parsed).text)).toEqual(value);
     expect(JSON.parse(displayValue(parsed.value))).toEqual(value);
     expect(()=>parseFieldValue(parsed,"0",false)).toThrow();
   }
 });
 it("accepts arbitrary FieldsDTO processing strings and stops polling outside active states",()=>{
   const dto={documentId:1,caseId:1,processingStatus:"FUTURE_STATE",reviewStatus:"NOT_STARTED",fields:[field]};
   expect(contract.component("FieldsDTO",dto).valid).toBe(true);expect(fieldsSchema.parse(dto).processingStatus).toBe("FUTURE_STATE");
   expect(processingSchema.parse("READ_READY")).toBe("READ_READY");
   expect(isProcessing("READ_READY")).toBe(false);expect(isProcessing("FUTURE_STATE")).toBe(false);
   expect(isProcessing("PROCESSING")).toBe(true);
 });
});

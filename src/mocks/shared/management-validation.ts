import Ajv2020, { type SchemaObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import contract from "../../../contracts/openapi.json";
import type { CaseDetailDto } from "@/features/cases/schemas";

// Browser-compatible Mock boundary. P0 is the only contract input;
// no FE parsing, coercion, default injection or property stripping.
const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
addFormats(ajv);
type CaseCreate = Pick<CaseDetailDto, "workplaceId" | "payType" | "periodStart" | "periodEnd"> & { scheduledPayDate?: string | null };
type CasePatch = { expectedInputVersion?: number | null } & { [K in "payType" | "periodStart" | "periodEnd" | "scheduledPayDate"]?: CaseDetailDto[K] | null };
const schema = (name: "CaseCreate" | "CasePatch") => ({ ...contract.components.schemas[name], components: contract.components }) as SchemaObject;
export const caseCreateValidator = ajv.compile<CaseCreate>(schema("CaseCreate"));
export const casePatchValidator = ajv.compile<CasePatch>(schema("CasePatch"));

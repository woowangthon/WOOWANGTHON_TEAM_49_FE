import Ajv2020, { type SchemaObject } from "ajv/dist/2020";
import contract from "../../../contracts/openapi.json";
import type { LoginRequest } from "@/features/auth/types";

// Validate the wire body unchanged against P0, including additionalProperties.
const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
export const loginValidator = ajv.compile<LoginRequest>({
  ...contract.components.schemas.Login, components: contract.components,
} as SchemaObject);

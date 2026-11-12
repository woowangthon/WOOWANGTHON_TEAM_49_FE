import { expect, it } from "vitest";
import { duplicateSchema } from "./comparison-schemas";
import { impactSchema } from "@/features/documents/schemas";

it("validates the API-073 candidate pairs including an empty successful response", () => {
  expect(duplicateSchema.parse({candidates: []})).toEqual({candidates: []});
  const value = {candidates: [{transactionIds: [12, 13], reason: "SAME_DATE_AMOUNT_METHOD"}]};
  expect(duplicateSchema.parse(value)).toEqual(value);
  for (const invalid of [{items: []}, {candidates: null}, {candidates: [{transactionIds: ["12"], reason: "same"}]}, {candidates: [{transactionIds: [12]}]}]) expect(duplicateSchema.safeParse(invalid).success).toBe(false);
});
it("validates API-040 without equating direct links with all affected cases", () => {
  const value = {documentId: 1, affectedCaseIds: [15,16], linkedCaseCount: 1, derivedTransactionIds: [3], downloadedExternalCopiesCannotBeRecalled: true};
  expect(impactSchema.parse(value)).toEqual(value);
  expect(impactSchema.safeParse({...value, affectedCaseIds: undefined}).success).toBe(false);
});

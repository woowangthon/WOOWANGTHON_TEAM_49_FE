import {expect, it} from "vitest";
import {createOpenApiContract} from "./contract";
import {documentMocks, caseDocumentResponse} from "@/mocks/shared/document-handlers";

const contract = createOpenApiContract("contracts/openapi.json");
it.each([null, 777])("A05 validates actual mock projection against independent P0 (%s)", linkId => {
    const doc = caseDocumentResponse(documentMocks([]).getDocuments()[0], linkId);
    expect(doc).not.toHaveProperty("link");
    expect(contract.component("DocumentDTO", doc)).toMatchObject({valid: true});
    expect(contract.response({method: "GET", url: "/api/v1/cases/15/documents"}, 200,
        {code: 200, message: "OK", data: {items: [doc], page: 1, size: 20, total: 1}})).toMatchObject({
        valid: true,
        coverage: "concrete"
    });
    const missing = {...doc} as Partial<typeof doc>;
    delete missing.linkId;
    expect(contract.component("DocumentDTO", missing).valid).toBe(false);
});

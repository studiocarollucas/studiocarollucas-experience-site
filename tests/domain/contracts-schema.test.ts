import { describe, expect, it } from "vitest";
import { contractStatusValues, contracts } from "@/db/schema";

describe("contracts schema", () => {
  it("exposes only the immutable issued and voided statuses", () => {
    expect(contractStatusValues).toEqual(["issued", "voided"]);
  });

  it("stores the PDF path, issuer, template version and snapshots", () => {
    expect(Object.keys(contracts)).toEqual(
      expect.arrayContaining([
        "id",
        "contractNumber",
        "shootId",
        "clientId",
        "status",
        "templateVersion",
        "issuedByAuthUserId",
        "issuedAt",
        "imageUsageAuthorized",
        "snapshot",
        "pdfStoragePath",
      ]),
    );
  });
});

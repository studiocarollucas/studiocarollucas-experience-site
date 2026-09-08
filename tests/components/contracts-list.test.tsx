import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContractsList } from "@/components/admin/contracts-list";

describe("ContractsList", () => {
  it("uses the protected endpoint rather than a storage path", () => {
    render(
      <ContractsList
        contracts={[
          {
            id: "f8a1cdb8-0d69-41b5-9693-e8d1a76ef3dd",
            contractNumber: "SCL-F8A1",
            status: "issued",
            issuedAt: new Date("2026-09-08T12:00:00Z"),
            imageUsageAuthorized: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Baixar PDF SCL-F8A1" })).toHaveAttribute(
      "href",
      "/api/admin/contracts/f8a1cdb8-0d69-41b5-9693-e8d1a76ef3dd/download",
    );
    expect(screen.queryByText(/contracts\//)).not.toBeInTheDocument();
  });
});

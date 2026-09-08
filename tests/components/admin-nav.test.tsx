import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

import { AdminNav } from "@/components/admin/admin-nav";

describe("AdminNav", () => {
  it("links to the leads funnel", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/admin/leads");
  });

  it("links to contractor settings", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/admin/configuracoes/contratante",
    );
  });
});

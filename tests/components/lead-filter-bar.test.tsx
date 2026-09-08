import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/leads",
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams("query=Maria&page=3"),
}));

import { LeadFilterBar } from "@/components/admin/lead-filter-bar";

describe("LeadFilterBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a status filter and resets pagination while preserving the search", () => {
    render(<LeadFilterBar owners={[{ id: "staff-1", name: "Carol Lucas" }]} />);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "novo" } });

    expect(mocks.push).toHaveBeenCalledWith("/admin/leads?query=Maria&status=novo");
  });

  it("offers source and owner filters", () => {
    render(<LeadFilterBar owners={[{ id: "staff-1", name: "Carol Lucas" }]} />);

    expect(screen.getByLabelText("Origem")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Carol Lucas" })).toHaveValue("staff-1");
  });
});

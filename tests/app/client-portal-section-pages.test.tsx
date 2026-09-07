import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPortalChecklistSnapshot: vi.fn(),
  getPortalShootSnapshot: vi.fn(),
}));

vi.mock("@/domain/portal/server", () => ({
  getPortalChecklistSnapshot: mocks.getPortalChecklistSnapshot,
  getPortalShootSnapshot: mocks.getPortalShootSnapshot,
}));
vi.mock("@/components/client/client-checklist", () => ({
  ClientChecklist: () => <div>Checklist mínimo</div>,
}));
vi.mock("@/components/client/my-shoot", () => ({
  MyShoot: () => <div>Ensaio mínimo</div>,
}));

import ClientChecklistPage from "@/app/(client)/minha-experiencia/checklist/page";
import MyShootPage from "@/app/(client)/minha-experiencia/ensaio/page";

const snapshot = {
  client: { id: "client-1", name: "Mariana" },
  viewerAuthUserId: "auth-1",
  shoot: null,
  experience: null,
  tasks: [],
  payments: [],
  references: [],
};

describe("client portal section pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPortalChecklistSnapshot.mockResolvedValue(snapshot);
    mocks.getPortalShootSnapshot.mockResolvedValue(snapshot);
  });

  it("uses the checklist-only reader for the checklist route", async () => {
    render(await ClientChecklistPage());

    expect(screen.getByText("Checklist mínimo")).toBeInTheDocument();
    expect(mocks.getPortalChecklistSnapshot).toHaveBeenCalledOnce();
    expect(mocks.getPortalShootSnapshot).not.toHaveBeenCalled();
  });

  it("uses the shoot reader for experience, tasks, and payments", async () => {
    render(await MyShootPage());

    expect(screen.getByText("Ensaio mínimo")).toBeInTheDocument();
    expect(mocks.getPortalShootSnapshot).toHaveBeenCalledOnce();
    expect(mocks.getPortalChecklistSnapshot).not.toHaveBeenCalled();
  });
});

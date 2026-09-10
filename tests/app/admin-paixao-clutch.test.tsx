import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const id = "00000000-0000-4000-8000-000000000003";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/domain/inventory/clutch", () => ({
  listPaixaoClutchForAdmin: mocks.list,
  updatePaixaoClutch: mocks.update,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  usePathname: () => "/admin/paixao-clutch",
}));

import PaixaoClutchPage from "@/app/admin/(protected)/paixao-clutch/page";
import { updatePaixaoClutchAction } from "@/app/admin/(protected)/paixao-clutch/actions";
import { PaixaoClutchCatalog } from "@/components/admin/paixao-clutch-catalog";
import { AdminNav } from "@/components/admin/admin-nav";

const clutch = {
  id,
  code: "PC-01",
  name: "Clutch dourada",
  type: "clutch" as const,
  status: "available" as const,
  active: true,
  rentalPrice: "120.00",
  replacementValue: "600.00",
  paixaoClutchCopy: "Um brilho discreto para a produção.",
  paixaoClutchPublicImagePath: "public/paixao-clutch/dourada.jpg",
  paixaoClutchPublished: false,
  paixaoClutchFeatured: false,
  paixaoClutchSortOrder: 0,
};

const catalogClutch = {
  ...clutch,
  copy: clutch.paixaoClutchCopy,
  publicImagePath: clutch.paixaoClutchPublicImagePath,
  published: clutch.paixaoClutchPublished,
  featured: clutch.paixaoClutchFeatured,
  sortOrder: clutch.paixaoClutchSortOrder,
};

describe("Paixão Clutch admin curation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: "staff-1", email: "staff@example.test", role: "staff" });
    mocks.list.mockResolvedValue([clutch]);
    mocks.update.mockResolvedValue(clutch);
  });

  it("shows only the protected clutch curation controls and operational availability", async () => {
    render(await PaixaoClutchPage({ searchParams: Promise.resolve({ published: "false" }) }));

    expect(screen.getByRole("heading", { name: "Paixão Clutch" })).toBeInTheDocument();
    expect(screen.getByText("Disponível para operação")).toBeInTheDocument();
    expect(screen.getByLabelText("Preço de aluguel")).toHaveValue("120.00");
    expect(screen.getByLabelText("Valor de reposição")).toHaveValue("600.00");
    expect(screen.getByLabelText("Referência da imagem pública")).toHaveValue(
      "public/paixao-clutch/dourada.jpg"
    );
    expect(screen.queryByText(/valor de reposição.*públic/i)).not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({ published: false }, "staff-1");
  });

  it("keeps client interaction behind the catalog boundary and submits curated fields", async () => {
    render(<PaixaoClutchCatalog items={[catalogClutch]} />);

    fireEvent.change(screen.getByLabelText("Ordem editorial"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Publicar na Paixão Clutch"));
    fireEvent.submit(screen.getByRole("button", { name: "Salvar curadoria" }).closest("form")!);

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: id,
          rentalPrice: "120.00",
          replacementValue: "600.00",
          publicImagePath: "public/paixao-clutch/dourada.jpg",
          published: true,
          featured: false,
          sortOrder: 2,
        }),
        "staff-1"
      )
    );
  });

  it("rejects curation mutations for a client with a safe permission message", async () => {
    mocks.user.mockResolvedValue({ id: "client-1", email: "client@example.test", role: "client" });

    await expect(
      updatePaixaoClutchAction({
        itemId: id,
        rentalPrice: "120.00",
        published: false,
        featured: false,
        sortOrder: 0,
      })
    ).resolves.toMatchObject({ ok: false, error: expect.stringMatching(/permissão/i) });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("links the protected curation from the administration navigation", () => {
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Paixão Clutch" })).toHaveAttribute(
      "href",
      "/admin/paixao-clutch"
    );
  });
});

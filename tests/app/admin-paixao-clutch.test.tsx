import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const id = "00000000-0000-4000-8000-000000000003";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  reorder: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/domain/inventory/clutch", () => ({
  listPaixaoClutchForAdmin: mocks.list,
  updatePaixaoClutch: mocks.update,
  reorderPaixaoClutch: mocks.reorder,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  usePathname: () => "/admin/paixao-clutch",
}));

import PaixaoClutchPage from "@/app/admin/(protected)/paixao-clutch/page";
import { updatePaixaoClutchAction, reorderPaixaoClutchAction } from "@/app/admin/(protected)/paixao-clutch/actions";
import { PaixaoClutchCatalog } from "@/components/admin/paixao-clutch-catalog";
import { AdminNav } from "@/components/admin/admin-nav";

const clutch = {
  id,
  code: "PC-01",
  name: "Clutch dourada",
  type: "clutch" as const,
  status: "available" as const,
  active: true,
  paixaoClutchEligible: true,
  futureReservations: [],
  rentalPrice: "120.00",
  replacementValue: "600.00",
  paixaoClutchCopy: "Um brilho discreto para a produção.",
  paixaoClutchPublicImagePath: "/images/paixao-clutch/dourada.jpg",
  paixaoClutchPublished: false,
  paixaoClutchFeatured: false,
  paixaoClutchSortOrder: 0,
};

const catalogClutch = {
  ...clutch,
  eligible: clutch.paixaoClutchEligible,
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
    expect(screen.getByRole("link", { name: "Abrir ficha do item" })).toHaveAttribute("href", `/admin/inventario/${id}`);
    expect(screen.getByLabelText("Habilitar na Paixão Clutch")).toBeChecked();
    expect(screen.getByLabelText("Preço de aluguel")).toHaveValue("120.00");
    expect(screen.getByLabelText("Valor de reposição")).toHaveValue("600.00");
    expect(screen.getByLabelText("Referência da imagem pública")).toHaveValue(
      "/images/paixao-clutch/dourada.jpg"
    );
    expect(screen.queryByText(/valor de reposição.*públic/i)).not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({ published: false }, "staff-1");
  });

  it("removes eligibility and publication together without changing operational activity", async () => {
    render(<PaixaoClutchCatalog items={[{ ...catalogClutch, published: true }]} />);
    fireEvent.click(screen.getByLabelText("Habilitar na Paixão Clutch"));
    expect(screen.getByLabelText("Publicar na Paixão Clutch")).not.toBeChecked();
    expect(screen.getByLabelText("Publicar na Paixão Clutch")).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Salvar curadoria" }).closest("form")!);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ eligible: false, published: false }), "staff-1"));
    expect(mocks.revalidate).toHaveBeenCalledWith(`/admin/inventario/${id}`);
  });

  it.each(["pending", "confirmed"] as const)("derives current unavailability from a %s reservation", async (status) => {
    mocks.list.mockResolvedValue([{ ...clutch, futureReservations: [{ id: "r1", startsOn: "2000-01-01", endsOn: "2099-01-01", status }] }]);
    render(await PaixaoClutchPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Reservada no momento")).toBeInTheDocument();
    expect(screen.queryByText("Disponível para operação")).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(status === "confirmed" ? "Confirmada" : "Pendente"))).toBeInTheDocument();
  });

  it("shows future reservations without marking the item unavailable today", async () => {
    mocks.list.mockResolvedValue([{ ...clutch, futureReservations: [{ id: "r1", startsOn: "2099-01-01", endsOn: "2099-01-02", status: "confirmed" }] }]);
    render(await PaixaoClutchPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Disponível para operação")).toBeInTheDocument();
    expect(screen.getByText(/2099-01-01 a 2099-01-02/)).toBeInTheDocument();
  });

  it("keeps client interaction behind the catalog boundary and submits curated fields", async () => {
    render(<PaixaoClutchCatalog items={[catalogClutch]} />);

    expect(screen.queryByLabelText("Ordem editorial")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Publicar na Paixão Clutch"));
    fireEvent.submit(screen.getByRole("button", { name: "Salvar curadoria" }).closest("form")!);

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: id,
          rentalPrice: "120.00",
          replacementValue: "600.00",
          publicImagePath: "/images/paixao-clutch/dourada.jpg",
          published: true,
          featured: false,
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
      })
    ).resolves.toMatchObject({ ok: false, error: expect.stringMatching(/permissão/i) });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("submits the full published collection in its chosen order independently of filters", async () => {
    const secondId = "00000000-0000-4000-8000-000000000004";
    mocks.list.mockImplementation((filters) => Promise.resolve(filters.published === true
      ? [{ ...clutch, paixaoClutchPublished: true }, { ...clutch, id: secondId, name: "Clutch prata", paixaoClutchPublished: true }]
      : [clutch]));
    render(await PaixaoClutchPage({ searchParams: Promise.resolve({ published: "false" }) }));
    fireEvent.click(screen.getByRole("button", { name: "Subir Clutch prata" }));
    fireEvent.submit(screen.getByRole("button", { name: "Salvar ordem dos publicados" }).closest("form")!);
    await waitFor(() => expect(mocks.reorder).toHaveBeenCalledWith({ itemIds: [secondId, id] }, "staff-1"));
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/paixao-clutch");
  });

  it("rejects a client reorder action before reaching the domain", async () => {
    mocks.user.mockResolvedValue({ id: "client-1", role: "client" });
    await expect(reorderPaixaoClutchAction({ itemIds: [id] })).resolves.toMatchObject({ ok: false });
    expect(mocks.reorder).not.toHaveBeenCalled();
  });

  it("rejects a signed private image URL at the action boundary", async () => {
    await expect(updatePaixaoClutchAction({ itemId: id, published: true, featured: false,
      publicImagePath: "https://storage.test/storage/v1/object/sign/inventory-media/a.jpg?token=secret",
    })).resolves.toMatchObject({ ok: false, fieldErrors: { publicImagePath: expect.any(Array) } });
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

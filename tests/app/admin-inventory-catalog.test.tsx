import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  preview: vi.fn(),
  commit: vi.fn(),
  upload: vi.fn(),
  cover: vi.fn(),
  remove: vi.fn(),
  media: vi.fn(),
  select: vi.fn(),
  revalidate: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/domain/inventory/queries", () => ({ listInventoryItems: mocks.list }));
vi.mock("@/domain/inventory/catalog", () => ({
  createInventoryItem: mocks.create,
  updateInventoryItem: mocks.update,
  deactivateInventoryItem: mocks.deactivate,
}));
vi.mock("@/domain/inventory/import", () => ({
  previewInventoryImport: mocks.preview,
  commitInventoryImport: mocks.commit,
}));
vi.mock("@/domain/inventory/media", () => ({
  uploadInventoryMedia: mocks.upload,
  setInventoryMediaCover: mocks.cover,
  removeInventoryMedia: mocks.remove,
  readInventoryMediaUrls: mocks.media,
}));
vi.mock("@/db/client", () => ({ db: { select: mocks.select } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/admin/inventario",
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));

import InventoryPage from "@/app/admin/(protected)/inventario/page";
import InventoryDetailPage from "@/app/admin/(protected)/inventario/[id]/page";
import * as actions from "@/app/admin/(protected)/inventario/actions";
import { InventoryItemForm } from "@/components/admin/inventory-item-form";
import { InventoryImport } from "@/components/admin/inventory-import";
import { AdminNav } from "@/components/admin/admin-nav";

const id = "00000000-0000-4000-8000-000000000002";
const item = {
  id,
  code: "VT-01",
  name: "Vestido azul",
  type: "outfit" as const,
  status: "available" as const,
  active: true,
  description: null,
  color: "Azul",
  size: "M",
  internalPrice: null,
  futureReservations: [
    { id: "res-1", startsOn: "2030-05-10", endsOn: "2030-05-12", status: "confirmed" as const },
  ],
};

describe("admin inventory catalog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "staff-1", role: "staff" });
    mocks.list.mockResolvedValue({ rows: [item], total: 26, page: 1, pageSize: 25 });
    mocks.media.mockResolvedValue([]);
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({ limit: async () => [item], orderBy: async () => item.futureReservations }),
      }),
    });
  });

  it("exposes Acervo navigation, filters, catalog, future dates and template", async () => {
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Acervo" })).toHaveAttribute(
      "href",
      "/admin/inventario"
    );
    render(
      await InventoryPage({ searchParams: Promise.resolve({ search: "azul", type: "outfit" }) })
    );
    expect(screen.getByRole("heading", { name: "Acervo" })).toBeInTheDocument();
    for (const name of ["Buscar por código ou nome", "Tipo", "Status", "Cor", "Tamanho"])
      expect(screen.getByLabelText(name, { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Baixar modelo XLSX" })).toHaveAttribute(
      "href",
      "/api/admin/inventario/template"
    );
    expect(screen.getByRole("link", { name: /Editar Vestido azul/ })).toHaveAttribute(
      "href",
      `/admin/inventario/${id}`
    );
    expect(screen.getByText(/2030-05-10/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima página" })).toHaveAttribute(
      "href",
      expect.stringContaining("search=azul")
    );
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: "azul", type: "outfit" }),
      "staff-1"
    );
  });

  it("allows creation without a photo and takes staff to the detail", async () => {
    mocks.create.mockResolvedValue(item);
    render(<InventoryItemForm />);
    expect(screen.getByText(/foto é opcional/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "VT-01" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Vestido azul" } });
    fireEvent.submit(screen.getByRole("button", { name: "Criar item" }).closest("form")!);
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: "VT-01", name: "Vestido azul" }),
        "staff-1"
      )
    );
    expect(mocks.push).toHaveBeenCalledWith(`/admin/inventario/${id}`);
  });

  it("shows editable details, private photo controls, inactivation and future reservations", async () => {
    render(await InventoryDetailPage({ params: Promise.resolve({ id }) }));
    expect(screen.getByRole("button", { name: "Salvar item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inativar item" })).toBeInTheDocument();
    expect(screen.getByText("Sem foto cadastrada.")).toBeInTheDocument();
    expect(screen.getByLabelText("Adicionar foto")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp"
    );
    expect(screen.getByRole("heading", { name: "Reservas futuras" })).toBeInTheDocument();
    expect(screen.getByText(/2030-05-12/)).toBeInTheDocument();
  });

  it("blocks every catalog, import and media action for clients", async () => {
    mocks.user.mockResolvedValue({ id: "client-1", role: "client" });
    for (const action of [
      actions.createInventoryItemAction,
      actions.updateInventoryItemAction,
      actions.deactivateInventoryItemAction,
      actions.previewInventoryImportAction,
      actions.commitInventoryImportAction,
      actions.uploadInventoryMediaAction,
      actions.setInventoryMediaCoverAction,
      actions.removeInventoryMediaAction,
    ]) {
      await expect(action({})).resolves.toMatchObject({
        ok: false,
        error: expect.stringMatching(/permissão/),
      });
    }
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
    await expect(InventoryPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:");
    await expect(InventoryDetailPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
      "redirect:"
    );
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("maps duplicate codes to safe field guidance and revalidates successful changes", async () => {
    mocks.create.mockRejectedValueOnce(new Error("código já cadastrado"));
    await expect(
      actions.createInventoryItemAction({ code: "VT-01", name: "Vestido", type: "outfit" })
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { code: [expect.stringMatching(/código/i)] },
    });
    mocks.update.mockResolvedValue(item);
    await expect(
      actions.updateInventoryItemAction({ id, name: "Vestido novo" })
    ).resolves.toMatchObject({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith(id, { name: "Vestido novo" }, "staff-1");
    expect(mocks.revalidate).toHaveBeenCalledWith(`/admin/inventario/${id}`);
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin/agenda/[id]", "page");
    mocks.deactivate.mockResolvedValue({ ...item, active: false });
    await expect(actions.deactivateInventoryItemAction({ id })).resolves.toMatchObject({
      ok: true,
    });
    expect(mocks.deactivate).toHaveBeenCalledWith(id, "staff-1");
  });

  it("previews errors and commits only checked valid rows", async () => {
    mocks.preview.mockResolvedValue({
      previewToken: "token",
      rows: [
        {
          rowNumber: 2,
          input: { code: "VT-02", name: "Vestido novo", type: "outfit" },
          errors: [],
        },
        {
          rowNumber: 3,
          input: { code: "VT-01", name: "Duplicado", type: "outfit" },
          errors: ["código já cadastrado"],
        },
      ],
    });
    mocks.commit.mockResolvedValue({ created: 1 });
    render(<InventoryImport />);
    const file = new File(["xlsx"], "acervo.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(screen.getByLabelText("Planilha XLSX"), { target: { files: [file] } });
    fireEvent.submit(screen.getByRole("button", { name: "Gerar prévia" }).closest("form")!);
    await screen.findByText("código já cadastrado");
    expect(screen.getByLabelText("Importar linha 3")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Importar linha 2"));
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar importação" }).closest("form")!);
    await waitFor(() => expect(mocks.commit).toHaveBeenCalledWith("token", [2], "staff-1"));
    expect(await screen.findByText(/1 item importado/)).toBeInTheDocument();
  });

  it("preserves the actual File for the private upload domain service", async () => {
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    mocks.upload.mockResolvedValue({ id: "media-1" });
    await expect(
      actions.uploadInventoryMediaAction({ inventoryItemId: id, file })
    ).resolves.toMatchObject({ ok: true });
    expect(mocks.upload).toHaveBeenCalledWith({ inventoryItemId: id, file });
    expect(mocks.upload.mock.calls[0][0].file).toBe(file);
  });

  it("clears optional item fields when staff empties them", async () => {
    mocks.update.mockResolvedValue(item);
    render(
      <InventoryItemForm
        initialValues={{ ...item, description: "Antiga", internalPrice: "25.00" }}
      />
    );
    fireEvent.change(screen.getByLabelText("Descrição interna"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Cor do item"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Preço interno"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("button", { name: "Salvar item" }).closest("form")!);
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ description: "", color: "", internalPrice: null }),
        "staff-1"
      )
    );
  });

  it("keeps staff input after a duplicate code failure", async () => {
    mocks.create.mockRejectedValue(new Error("código já cadastrado"));
    render(<InventoryItemForm />);
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "VT-01" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Meu vestido" } });
    fireEvent.submit(screen.getByRole("button", { name: "Criar item" }).closest("form")!);
    await screen.findByText("Este código já pertence a outro item.");
    expect(screen.getByLabelText("Nome")).toHaveValue("Meu vestido");
    expect(screen.getByLabelText("Código")).toHaveValue("VT-01");
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/admin/(protected)/agenda/[id]/styling-actions", () => ({
  linkStylingReferenceToInventoryItemAction: mocks.save,
}));
import { StylingInventoryLink } from "@/components/admin/styling-inventory-link";
const props = {
  shootId: "shoot-1", referenceId: "ref-1", label: "Luz suave", value: null,
  items: [{ inventoryItemId: "item-1", itemName: "Vestido rosé", reservationState: "confirmed" as const }],
};
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ ok: true, data: null }); });
it("saves the selected piece and refreshes the server view", async () => {
  render(<StylingInventoryLink {...props} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "item-1" } });
  fireEvent.click(screen.getByRole("button", { name: /salvar vínculo/i }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ shootId: "shoot-1", referenceId: "ref-1", inventoryItemId: "item-1" }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(screen.getByRole("status")).toHaveTextContent(/salvo/i);
});
it("removes a stale link through the explicit no-link option", async () => {
  render(<StylingInventoryLink {...props} value="old-item" />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /salvar vínculo/i }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ inventoryItemId: null })));
});
it("keeps an actionable error visible without claiming success", async () => {
  mocks.save.mockResolvedValueOnce({ ok: false, error: "Esta peça não está reservada para este ensaio." });
  render(<StylingInventoryLink {...props} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "item-1" } });
  fireEvent.click(screen.getByRole("button", { name: /salvar vínculo/i }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/não está reservada/));
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it("handles an unexpected rejected action with a neutral error", async () => {
  mocks.save.mockRejectedValueOnce(new Error("private SQL detail"));
  render(<StylingInventoryLink {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /salvar vínculo/i }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Não foi possível/));
  expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
});

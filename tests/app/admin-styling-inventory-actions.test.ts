// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), link: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/domain/styling/inventory-links", () => ({
  linkStylingReferenceToInventoryItem: mocks.link,
  StylingInventoryLinkError: class StylingInventoryLinkError extends Error {},
}));
import { linkStylingReferenceToInventoryItemAction } from "@/app/admin/(protected)/agenda/[id]/styling-actions";
const input = {
  shootId: "00000000-0000-4000-8000-000000000001",
  referenceId: "00000000-0000-4000-8000-000000000002",
  inventoryItemId: "00000000-0000-4000-8000-000000000003",
};
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "staff-1", role: "staff" });
  mocks.link.mockResolvedValue(undefined);
});
it("uses the session actor and revalidates both authenticated views", async () => {
  expect(await linkStylingReferenceToInventoryItemAction({ ...input, actorUserId: "forged" })).toEqual({ ok: true, data: null });
  expect(mocks.link).toHaveBeenCalledWith(input, "staff-1");
  expect(mocks.revalidate).toHaveBeenCalledWith(`/admin/agenda/${input.shootId}`);
  expect(mocks.revalidate).toHaveBeenCalledWith("/minha-experiencia/styling");
});
it("rejects a client actor before the domain mutation", async () => {
  mocks.user.mockResolvedValueOnce({ id: "client-1", role: "client" });
  expect(await linkStylingReferenceToInventoryItemAction(input)).toMatchObject({ ok: false });
  expect(mocks.link).not.toHaveBeenCalled();
});
it("rejects invalid reference IDs and does not revalidate on failure", async () => {
  expect(await linkStylingReferenceToInventoryItemAction({ ...input, referenceId: "invalid" })).toMatchObject({ ok: false });
  expect(mocks.link).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

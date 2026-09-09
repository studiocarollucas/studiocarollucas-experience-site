import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shootId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createReservation: vi.fn(),
  cancelReservation: vi.fn(),
  dbSelect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/inventory/reservations", () => ({
  createShootInventoryReservation: mocks.createReservation,
  cancelInventoryReservation: mocks.cancelReservation,
}));
vi.mock("@/db/client", () => ({ db: { select: mocks.dbSelect } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createShootInventoryReservationAction } from "@/app/admin/(protected)/agenda/[id]/inventory-actions";
import { InventoryReservations } from "@/components/admin/inventory-reservations";
import { getShootDetail } from "@/domain/shoots/queries";

describe("shoot inventory reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", role: "staff" });
  });

  it("returns field-safe validation failures instead of database errors", async () => {
    await expect(createShootInventoryReservationAction({ shootId })).resolves.toMatchObject({
      ok: false,
      error: expect.any(String),
      fieldErrors: { inventoryItemId: expect.any(Array) },
    });
    expect(mocks.createReservation).not.toHaveBeenCalled();
  });

  it("renders confirmed, cancelled, and exception reservation history", () => {
    render(
      <InventoryReservations
        shootId={shootId}
        shootDate="2030-05-10"
        reservations={[
          {
            id: "reservation-1",
            itemName: "Clutch dourada",
            itemCode: "CL-01",
            itemType: "clutch",
            startsOn: "2030-05-10",
            endsOn: "2030-05-12",
            status: "confirmed",
            overrideReason: "Aprovada pela produção",
          },
          {
            id: "reservation-2",
            itemName: "Vestido azul",
            itemCode: "VT-02",
            itemType: "outfit",
            startsOn: "2030-05-11",
            endsOn: "2030-05-11",
            status: "cancelled",
            overrideReason: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Acervo reservado" })).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes("Clutch dourada") ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByText(/Aprovada pela produção/)).toBeInTheDocument();
    expect(screen.getByLabelText("Item do acervo")).toBeInTheDocument();
    expect(screen.getByLabelText("Registrar exceção por conflito")).toBeInTheDocument();
  });

  it("revalidates the shoot detail after a staff cancellation", async () => {
    mocks.cancelReservation.mockResolvedValue({ id: "reservation-1" });

    await expect(
      (await import("@/app/admin/(protected)/agenda/[id]/inventory-actions")).cancelShootInventoryReservationAction({
        reservationId: "00000000-0000-4000-8000-000000000003",
        shootId,
      }),
    ).resolves.toEqual({ ok: true, data: { id: "reservation-1" } });

    expect(mocks.cancelReservation).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000003", "staff-1", shootId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/agenda/${shootId}`);
  });

  it("does not cancel a reservation that is not part of this shoot", async () => {
    mocks.cancelReservation.mockRejectedValue(new Error("reserva inexistente ou não cancelável"));

    await expect(
      (await import("@/app/admin/(protected)/agenda/[id]/inventory-actions")).cancelShootInventoryReservationAction({
        reservationId: "00000000-0000-4000-8000-000000000003",
        shootId,
      }),
    ).resolves.toMatchObject({ ok: false, error: expect.any(String) });

    expect(mocks.cancelReservation).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000003", "staff-1", shootId);
  });

  it("projects inventory item fields into shoot reservations ordered by start date", async () => {
    const shoot = { id: shootId, agreedPrice: "0.00" };
    const chain = (value: unknown) => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({ where: () => ({ limit: async () => value }) }),
          where: () => ({ orderBy: async () => value }),
        }),
        where: () => ({ limit: async () => value, orderBy: async () => value }),
      }),
    });
    const reservationOrderBy = vi.fn().mockResolvedValue([
      { id: "reservation-1", itemName: "Clutch dourada", itemCode: "CL-01", itemType: "clutch", startsOn: "2030-05-10", endsOn: "2030-05-12", status: "confirmed", overrideReason: null },
    ]);
    mocks.dbSelect
      .mockReturnValueOnce(chain([{ shoot, clientName: "Ana", clientId: "client-1", packageName: "Clássico" }]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce({ from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: reservationOrderBy }) }) }) });

    await expect(getShootDetail(shootId)).resolves.toMatchObject({
      inventoryReservations: [{ itemName: "Clutch dourada", status: "confirmed" }],
    });
    expect(reservationOrderBy).toHaveBeenCalledOnce();
  });
});

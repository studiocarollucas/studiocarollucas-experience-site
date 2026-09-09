import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const shootId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createReservation: vi.fn(),
  cancelReservation: vi.fn(),
  dbSelect: vi.fn(),
  revalidatePath: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/domain/inventory/reservations", () => ({
  createShootInventoryReservation: mocks.createReservation,
  cancelInventoryReservation: mocks.cancelReservation,
  InventoryReservationConflictError: class InventoryReservationConflictError extends Error {},
}));
vi.mock("@/db/client", () => ({ db: { select: mocks.dbSelect } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/domain/inventory/queries", () => ({ searchReservableInventoryItems: mocks.search }));

import { createShootInventoryReservationAction } from "@/app/admin/(protected)/agenda/[id]/inventory-actions";
import { InventoryReservations } from "@/components/admin/inventory-reservations";
import { InventoryReservationConflictError } from "@/domain/inventory/reservations";
import { getShootDetail } from "@/domain/shoots/queries";

describe("shoot inventory reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-1", role: "staff" });
    mocks.search.mockResolvedValue([
      { id: itemId, code: "CL-01", name: "Clutch dourada", type: "clutch", status: "available" },
    ]);
  });

  it("uses searchable catalog selection and supports repeated additions without UUID entry", async () => {
    mocks.createReservation.mockResolvedValue({ id: "res-new", inventoryItemId: itemId });
    render(<InventoryReservations shootId={shootId} shootDate="2030-05-10" />);
    const picker = screen.getByRole("combobox", { name: "Item do acervo" });
    fireEvent.change(picker, { target: { value: "clutch" } });
    fireEvent.click(
      await screen.findByRole("option", { name: /CL-01.*Clutch dourada.*Disponível/ })
    );
    fireEvent.submit(screen.getByRole("button", { name: "Reservar item" }).closest("form")!);
    await waitFor(() => expect(mocks.createReservation).toHaveBeenCalledTimes(1));
    expect(mocks.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryItemId: itemId, shootId }),
      "staff-1"
    );
    expect(await screen.findByText(/Reserva adicionada/)).toBeInTheDocument();
    expect(picker).toHaveValue("");
    fireEvent.change(picker, { target: { value: "CL-01" } });
    await screen.findByRole("option", { name: /Clutch dourada/ });
    fireEvent.keyDown(picker, { key: "ArrowDown" });
    fireEvent.keyDown(picker, { key: "Enter" });
    fireEvent.submit(screen.getByRole("button", { name: "Reservar item" }).closest("form")!);
    await waitFor(() => expect(mocks.createReservation).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Invalid UUID|Informe o ID/)).not.toBeInTheDocument();
  });

  it("returns a human instruction when no catalog item is selected", async () => {
    const result = await createShootInventoryReservationAction({
      shootId,
      inventoryItemId: "bad",
      startsOn: "2030-05-10",
      endsOn: "2030-05-10",
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { inventoryItemId: ["Selecione um item do acervo."] },
    });
  });

  it("preserves the chosen item and dates across conflict feedback and requires an explicit override", async () => {
    mocks.createReservation
      .mockRejectedValueOnce(new InventoryReservationConflictError())
      .mockResolvedValueOnce({ id: "res-override" });
    render(<InventoryReservations shootId={shootId} shootDate="2030-05-10" />);
    fireEvent.change(screen.getByRole("combobox", { name: "Item do acervo" }), {
      target: { value: "Clutch" },
    });
    fireEvent.click(await screen.findByRole("option", { name: /Clutch dourada/ }));
    fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2030-05-12" } });
    fireEvent.submit(screen.getByRole("button", { name: "Reservar item" }).closest("form")!);
    await screen.findByText(/O item já está reservado neste período/);
    expect(screen.getByLabelText("Fim")).toHaveValue("2030-05-12");
    expect(screen.getByRole("combobox", { name: "Item do acervo" })).toHaveValue(
      "CL-01 · Clutch dourada"
    );
    fireEvent.click(screen.getByLabelText("Registrar exceção por conflito"));
    fireEvent.change(screen.getByLabelText("Motivo da exceção"), {
      target: { value: "Produção aprovou" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Reservar item" }).closest("form")!);
    await waitFor(() => expect(mocks.createReservation).toHaveBeenCalledTimes(2));
    expect(mocks.createReservation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        inventoryItemId: itemId,
        endsOn: "2030-05-12",
        overrideConflict: true,
        overrideReason: "Produção aprovou",
      }),
      "staff-1"
    );
  });

  it("requires staff for searching catalog results", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "client-1", role: "client" });
    const { searchInventoryItemsAction } =
      await import("@/app/admin/(protected)/agenda/[id]/inventory-actions");
    await expect(searchInventoryItemsAction({ query: "clutch", shootId })).resolves.toMatchObject({
      ok: false,
    });
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("returns field-safe validation failures instead of database errors", async () => {
    await expect(createShootInventoryReservationAction({ shootId })).resolves.toMatchObject({
      ok: false,
      error: expect.any(String),
      fieldErrors: { inventoryItemId: expect.any(Array) },
    });
    expect(mocks.createReservation).not.toHaveBeenCalled();
  });

  it("returns actionable conflict guidance so staff can submit an explicit exception", async () => {
    mocks.createReservation.mockRejectedValue(new InventoryReservationConflictError());

    await expect(
      createShootInventoryReservationAction({
        shootId,
        inventoryItemId: itemId,
        startsOn: "2030-05-10",
        endsOn: "2030-05-10",
      })
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/Registrar exceção por conflito/),
      fieldErrors: {
        overrideConflict: [expect.any(String)],
        overrideReason: [expect.any(String)],
      },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
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
      />
    );

    expect(screen.getByRole("heading", { name: "Acervo reservado" })).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Clutch dourada") ?? false)
        .length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByText(/Aprovada pela produção/)).toBeInTheDocument();
    expect(screen.getByLabelText("Item do acervo")).toBeInTheDocument();
    expect(screen.getByLabelText("Registrar exceção por conflito")).toBeInTheDocument();
  });

  it("revalidates the shoot detail after a staff cancellation", async () => {
    mocks.cancelReservation.mockResolvedValue({ id: "reservation-1" });

    await expect(
      (
        await import("@/app/admin/(protected)/agenda/[id]/inventory-actions")
      ).cancelShootInventoryReservationAction({
        reservationId: "00000000-0000-4000-8000-000000000003",
        shootId,
      })
    ).resolves.toEqual({ ok: true, data: { id: "reservation-1" } });

    expect(mocks.cancelReservation).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000003",
      "staff-1",
      shootId
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/agenda/${shootId}`);
  });

  it("does not cancel a reservation that is not part of this shoot", async () => {
    mocks.cancelReservation.mockRejectedValue(new Error("reserva inexistente ou não cancelável"));

    await expect(
      (
        await import("@/app/admin/(protected)/agenda/[id]/inventory-actions")
      ).cancelShootInventoryReservationAction({
        reservationId: "00000000-0000-4000-8000-000000000003",
        shootId,
      })
    ).resolves.toMatchObject({ ok: false, error: expect.any(String) });

    expect(mocks.cancelReservation).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000003",
      "staff-1",
      shootId
    );
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
    const reservationOrderBy = vi
      .fn()
      .mockResolvedValue([
        {
          id: "reservation-1",
          itemName: "Clutch dourada",
          itemCode: "CL-01",
          itemType: "clutch",
          startsOn: "2030-05-10",
          endsOn: "2030-05-12",
          status: "confirmed",
          overrideReason: null,
        },
      ]);
    mocks.dbSelect
      .mockReturnValueOnce(
        chain([{ shoot, clientName: "Ana", clientId: "client-1", packageName: "Clássico" }])
      )
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce({
        from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: reservationOrderBy }) }) }),
      });

    await expect(getShootDetail(shootId)).resolves.toMatchObject({
      inventoryReservations: [{ itemName: "Clutch dourada", status: "confirmed" }],
    });
    expect(reservationOrderBy).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReservation: vi.fn(),
}));

vi.mock("@/domain/inventory/public-rental-reservation", () => ({
  createPublicClutchRentalReservation: mocks.createReservation,
}));

import { submitPublicClutchRentalReservationAction } from "@/app/(site)/paixao-clutch/[slug]/reservation-actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

describe("public clutch reservation action", () => {
  it("passes only the public slug and guest form fields to the public domain", async () => {
    mocks.createReservation.mockResolvedValue({
      reservationCode: "RQ-2030-001",
      status: "pending",
      expiresAt: "2030-05-11T12:00:00.000Z",
    });

    await expect(submitPublicClutchRentalReservationAction(
      "clutch-dourada",
      null,
      formData({
        startsOn: "2030-05-10",
        endsOn: "2030-05-12",
        guestName: "Ana Silva",
        guestPhone: "(92) 99999-0000",
        guestEmail: "ana@example.com",
        inventoryItemId: "private-item-id",
      }),
    )).resolves.toEqual({
      ok: true,
      reservationCode: "RQ-2030-001",
      expiresAt: "2030-05-11T12:00:00.000Z",
    });

    expect(mocks.createReservation).toHaveBeenCalledWith({
      slug: "clutch-dourada",
      startsOn: "2030-05-10",
      endsOn: "2030-05-12",
      guestName: "Ana Silva",
      guestPhone: "(92) 99999-0000",
      guestEmail: "ana@example.com",
    });
    expect(mocks.createReservation.mock.calls[0]?.[0]).not.toHaveProperty("inventoryItemId");
  });

  it("returns safe field guidance for malformed submissions", async () => {
    mocks.createReservation.mockRejectedValue(new Error("devolução anterior à retirada"));

    await expect(submitPublicClutchRentalReservationAction(
      "clutch-dourada",
      null,
      formData({ startsOn: "2030-05-12", endsOn: "2030-05-10", guestName: "Ana", guestPhone: "99999" }),
    )).resolves.toEqual(expect.objectContaining({
      ok: false,
      message: expect.stringMatching(/revise/i),
      fieldErrors: expect.objectContaining({ endsOn: expect.any(String) }),
    }));
  });

  it("does not expose conflict details when the clutch is unavailable", async () => {
    mocks.createReservation.mockRejectedValue(new Error("reserva em conflito 00000000-0000-4000-8000-000000000123"));

    await expect(submitPublicClutchRentalReservationAction(
      "clutch-dourada",
      null,
      formData({ startsOn: "2030-05-10", endsOn: "2030-05-12", guestName: "Ana Silva", guestPhone: "92999990000" }),
    )).resolves.toEqual({
      ok: false,
      message: expect.stringMatching(/indisponível/i),
    });
  });
});

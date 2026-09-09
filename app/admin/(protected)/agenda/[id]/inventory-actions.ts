"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createShootInventoryReservationSchema } from "@/domain/inventory/reservation-schema";
import {
  cancelInventoryReservation,
  createShootInventoryReservation,
} from "@/domain/inventory/reservations";

export const createShootInventoryReservationAction = defineAdminAction(
  { role: "staff", input: createShootInventoryReservationSchema },
  async (input, ctx) => {
    const reservation = await createShootInventoryReservation(input, ctx.user.id);
    revalidatePath(`/admin/agenda/${input.shootId}`);
    return { id: reservation.id };
  },
);

export const cancelShootInventoryReservationAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({ reservationId: z.string().uuid(), shootId: z.string().uuid() }),
  },
  async (input, ctx) => {
    const reservation = await cancelInventoryReservation(input.reservationId, ctx.user.id, input.shootId);
    revalidatePath(`/admin/agenda/${input.shootId}`);
    return { id: reservation.id };
  },
);

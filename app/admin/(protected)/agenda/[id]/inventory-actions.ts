"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { createShootInventoryReservationSchema } from "@/domain/inventory/reservation-schema";
import {
  cancelInventoryReservation,
  createShootInventoryReservation,
  InventoryReservationConflictError,
} from "@/domain/inventory/reservations";

export const createShootInventoryReservationAction = defineAdminAction(
  { role: "staff", input: createShootInventoryReservationSchema },
  async (input, ctx) => {
    let reservation;
    try {
      reservation = await createShootInventoryReservation(input, ctx.user.id);
    } catch (err) {
      if (err instanceof InventoryReservationConflictError) {
        throw new ActionableAdminActionError(
          "O item já está reservado neste período. Marque \"Registrar exceção por conflito\" e informe o motivo para continuar.",
          {
            overrideConflict: ["Confirme a exceção para continuar."],
            overrideReason: ["Informe o motivo da exceção."],
          },
        );
      }
      throw err;
    }
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

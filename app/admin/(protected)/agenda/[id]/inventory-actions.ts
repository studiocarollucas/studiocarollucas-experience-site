"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { createShootInventoryReservationSchema } from "@/domain/inventory/reservation-schema";
import { searchReservableInventoryItems } from "@/domain/inventory/queries";
import {
  cancelInventoryReservation,
  createShootInventoryReservation,
  InventoryReservationConflictError,
} from "@/domain/inventory/reservations";

export const createShootInventoryReservationAction = defineAdminAction(
  {
    role: "staff",
    input: createShootInventoryReservationSchema.safeExtend({
      inventoryItemId: z
        .string({ error: "Selecione um item do acervo." })
        .uuid("Selecione um item do acervo."),
    }),
  },
  async (input, ctx) => {
    let reservation;
    try {
      reservation = await createShootInventoryReservation(input, ctx.user.id);
    } catch (err) {
      if (err instanceof InventoryReservationConflictError) {
        throw new ActionableAdminActionError(
          'O item já está reservado neste período. Marque "Registrar exceção por conflito" e informe o motivo para continuar.',
          {
            overrideConflict: ["Confirme a exceção para continuar."],
            overrideReason: ["Informe o motivo da exceção."],
          }
        );
      }
      throw err;
    }
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/inventario");
    revalidatePath(`/admin/inventario/${input.inventoryItemId}`);
    return { id: reservation.id };
  }
);

export const cancelShootInventoryReservationAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({ reservationId: z.string().uuid(), shootId: z.string().uuid() }),
  },
  async (input, ctx) => {
    const reservation = await cancelInventoryReservation(
      input.reservationId,
      ctx.user.id,
      input.shootId
    );
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/inventario/[id]", "page");
    return { id: reservation.id };
  }
);

export const searchInventoryItemsAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({ query: z.string().trim().max(120), shootId: z.string().uuid() }),
  },
  async ({ query, shootId }, ctx) => searchReservableInventoryItems(query, shootId, ctx.user.id)
);

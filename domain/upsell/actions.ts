"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { createUpsellProduct, deleteUpsellProduct, setGalleryUpsellOffers, updateUpsellProduct } from "./catalog";
import { UpsellError } from "./errors";
import { changeUpsellOrderStatus } from "./orders";
import { registerUpsellPayment } from "./payments";
import {
  deleteUpsellProductSchema,
  galleryUpsellOffersSchema,
  updateUpsellProductSchema,
  upsellOrderStatusChangeSchema,
  upsellPaymentSchema,
  upsellProductSchema,
} from "./schema";

// Studio OS writes for SCL-506/507. Every action is staff-only through
// defineAdminAction; the actor always comes from the session (ctx.user.id).

async function actionable<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof UpsellError) throw new ActionableAdminActionError(error.message);
    throw error;
  }
}

function revalidateCatalog() {
  revalidatePath("/admin/upsells");
}

export const createUpsellProductAction = defineAdminAction(
  { role: "staff", input: upsellProductSchema },
  async (input, ctx) => {
    const created = await actionable(() => createUpsellProduct(input, ctx.user.id));
    revalidateCatalog();
    return { id: created.id };
  },
);

export const updateUpsellProductAction = defineAdminAction(
  { role: "staff", input: updateUpsellProductSchema },
  async (input, ctx) => {
    const updated = await actionable(() => updateUpsellProduct(input, ctx.user.id));
    revalidateCatalog();
    return { id: updated.id };
  },
);

export const deleteUpsellProductAction = defineAdminAction(
  { role: "staff", input: deleteUpsellProductSchema },
  async (input, ctx) => {
    const deleted = await actionable(() => deleteUpsellProduct(input, ctx.user.id));
    revalidateCatalog();
    return deleted;
  },
);

const galleryOffersActionInput = galleryUpsellOffersSchema.extend({ shootId: z.string().uuid() });

export const setGalleryUpsellOffersAction = defineAdminAction(
  { role: "staff", input: galleryOffersActionInput },
  async ({ shootId, ...input }, ctx) => {
    const result = await actionable(() => setGalleryUpsellOffers(input, ctx.user.id));
    revalidatePath(`/admin/galerias/${shootId}`);
    return result;
  },
);

export const changeUpsellOrderStatusAction = defineAdminAction(
  { role: "staff", input: upsellOrderStatusChangeSchema },
  async (input, ctx) => {
    const result = await actionable(() => changeUpsellOrderStatus(input, ctx.user.id));
    revalidatePath("/admin/upsells/pedidos");
    revalidatePath(`/admin/upsells/pedidos/${result.orderId}`);
    return result;
  },
);

export const registerUpsellPaymentAction = defineAdminAction(
  { role: "staff", input: upsellPaymentSchema },
  async (input, ctx) => {
    const { orderId, shootId, money } = await actionable(() => registerUpsellPayment(input, ctx.user.id));
    revalidatePath(`/admin/upsells/pedidos/${orderId}`);
    revalidatePath("/admin/upsells/pedidos");
    revalidatePath(`/admin/agenda/${shootId}`);
    revalidatePath("/admin/financeiro");
    return { orderId, balance: money.balance, paymentStatus: money.paymentStatus };
  },
);

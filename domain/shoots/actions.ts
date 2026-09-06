"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { db } from "@/db/client";
import { shoots, shootStatusEnum } from "@/db/schema";
import { createConfirmedShoot } from "./create-confirmed-shoot";
import { recordAuditEvent } from "@/domain/audit/service";
import { newShootFormSchema } from "./form-schema";
import { getShootById, updateShoot } from "./service";
import { updateShootSchema } from "./schema";
import { canTransitionShootStatus } from "./status";

export const createShootAction = defineAdminAction(
  { role: "staff", input: newShootFormSchema },
  async (input, ctx) => {
    const { portalEnabled, ...shootInput } = input;
    const { shoot, productionJob, preparationTaskCount } = await createConfirmedShoot(shootInput, {
      portalEnabled,
    });
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "shoot.created",
      entityType: "shoot",
      entityId: shoot.id,
      before: null,
      after: {
        shoot,
        productionJobId: productionJob.id,
        preparationTaskCount,
      },
    });
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/producao");
    return { id: shoot.id };
  },
);

export const updateShootAction = defineAdminAction(
  { role: "staff", input: updateShootSchema.extend({ id: z.string().uuid() }) },
  async (input, ctx) => {
    const { id, ...patch } = input;
    const before = await getShootById(id);
    if (!before) throw new Error("ensaio inexistente");
    const after = await updateShoot(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "shoot.updated",
      entityType: "shoot",
      entityId: id,
      before,
      after,
    });
    revalidatePath(`/admin/agenda/${id}`);
    revalidatePath("/admin/agenda");
    return { id };
  },
);

// The only thing that advances shoots.status past its "reserva" default. Without
// it the production→shoot reflection in changeProductionJobStatus can never fire,
// because no shoot ever reaches a status the reflection is allowed to hop from.
export const changeShootStatusAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      id: z.string().uuid(),
      to: z.enum(shootStatusEnum.enumValues),
    }),
  },
  async (input, ctx) => {
    const before = await getShootById(input.id);
    if (!before) throw new Error("ensaio inexistente");
    if (!canTransitionShootStatus(before.status, input.to)) throw new Error("transição inválida");

    const [after] = await db
      .update(shoots)
      .set({ status: input.to })
      .where(eq(shoots.id, input.id))
      .returning();

    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "shoot.status_changed",
      entityType: "shoot",
      entityId: input.id,
      before,
      after,
    });
    revalidatePath(`/admin/agenda/${input.id}`);
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/producao");
    revalidatePath("/admin");
    return { id: input.id };
  },
);

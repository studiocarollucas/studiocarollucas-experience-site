"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createConfirmedShoot } from "./create-confirmed-shoot";
import { recordAuditEvent } from "@/domain/audit/service";
import { newShootFormSchema } from "./form-schema";
import { getShootById, updateShoot } from "./service";
import { updateShootSchema } from "./schema";

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

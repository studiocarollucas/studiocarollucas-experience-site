"use server";

import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createConfirmedShoot } from "./create-confirmed-shoot";
import { recordAuditEvent } from "@/domain/audit/service";
import { newShootFormSchema } from "./form-schema";

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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { productionJobStatusEnum } from "@/db/schema";
import {
  changeProductionJobStatus,
  getProductionJobById,
  updateProductionJobFields,
} from "./service";
import { recordAuditEvent } from "@/domain/audit/service";

export const changeProductionStatusAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      jobId: z.string().uuid(),
      to: z.enum(productionJobStatusEnum.enumValues),
    }),
  },
  async (input, ctx) => {
    const { job, previousStatus, shootStatusChanged } = await changeProductionJobStatus(
      input.jobId,
      input.to,
    );
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "production_job.status_changed",
      entityType: "production_job",
      entityId: job.id,
      before: { status: previousStatus },
      after: { status: job.status, shootStatusChanged },
    });
    revalidatePath("/admin/producao");
    revalidatePath(`/admin/agenda/${job.shootId}`);
    revalidatePath("/admin");
    return { jobId: job.id };
  },
);

export const updateProductionJobAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      jobId: z.string().uuid(),
      editorUserId: z.string().uuid().nullable().optional(),
      photosToEdit: z.coerce.number().int().positive().nullable().optional(),
      deliveryDueAt: z.iso.date().nullable().optional(),
      selectionStatus: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  },
  async (input, ctx) => {
    const { jobId, ...fields } = input;
    const before = await getProductionJobById(jobId);
    if (!before) throw new Error("job inexistente");
    const job = await updateProductionJobFields(jobId, fields);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "production_job.updated",
      entityType: "production_job",
      entityId: jobId,
      before,
      after: job,
    });
    revalidatePath("/admin/producao");
    revalidatePath(`/admin/agenda/${job.shootId}`);
    return { jobId };
  },
);

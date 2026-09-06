"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { preparationTaskStatusEnum } from "@/db/schema";
import { addPreparationTask, setPreparationTaskStatus } from "./service";
import { addPreparationTaskFormSchema } from "./schema";
import { recordAuditEvent } from "@/domain/audit/service";

export const addPreparationTaskAction = defineAdminAction(
  { role: "staff", input: addPreparationTaskFormSchema },
  async (input, ctx) => {
    const created = await addPreparationTask(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "preparation_task.created",
      entityType: "preparation_task",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath(`/admin/agenda/${input.shootId}/preparacao`);
    return { id: created.id };
  },
);

export const setPreparationTaskStatusAction = defineAdminAction(
  {
    role: "staff",
    input: z.object({
      taskId: z.string().uuid(),
      shootId: z.string().uuid(),
      status: z.enum(preparationTaskStatusEnum.enumValues),
    }),
  },
  async (input, ctx) => {
    const updated = await setPreparationTaskStatus(input.taskId, input.status);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "preparation_task.status_changed",
      entityType: "preparation_task",
      entityId: input.taskId,
      before: null,
      after: { status: updated.status },
    });
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath(`/admin/agenda/${input.shootId}/preparacao`);
    return { taskId: input.taskId };
  },
);

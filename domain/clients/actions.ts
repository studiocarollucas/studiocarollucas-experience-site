"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createClient, getClientById, updateClient } from "@/domain/clients/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { clientFormSchema } from "./form-schema";
import { updateClientSchema } from "./schema";

export const createClientAction = defineAdminAction(
  { role: "staff", input: clientFormSchema },
  async (input, ctx) => {
    const created = await createClient(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "client.created",
      entityType: "client",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidatePath("/admin/clientes");
    return { id: created.id };
  },
);

export const updateClientAction = defineAdminAction(
  { role: "staff", input: updateClientSchema.extend({ id: z.string().uuid() }) },
  async (input, ctx) => {
    const { id, ...patch } = input;
    const before = await getClientById(id);
    if (!before) throw new Error("cliente inexistente");
    const updated = await updateClient(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "client.updated",
      entityType: "client",
      entityId: id,
      before,
      after: updated,
    });
    revalidatePath(`/admin/clientes/${id}`);
    revalidatePath("/admin/clientes");
    return { id };
  },
);

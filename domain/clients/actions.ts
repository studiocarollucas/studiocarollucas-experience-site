"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { createClient, getClientById, updateClient } from "@/domain/clients/service";
import { recordAuditEvent } from "@/domain/audit/service";
import { clientFormSchema } from "./form-schema";
import { updateClientSchema } from "./schema";

const CIVIL_AUDIT_FIELDS = new Set([
  "cpf", "birthday", "addressStreet", "addressNumber", "addressComplement",
  "addressNeighborhood", "addressCity", "addressState", "addressPostalCode",
]);

function redactClientCivilData(client: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(client).filter(([key]) => !CIVIL_AUDIT_FIELDS.has(key)));
}

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
      after: redactClientCivilData(created),
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
      before: redactClientCivilData(before),
      after: redactClientCivilData(updated),
    });
    revalidatePath(`/admin/clientes/${id}`);
    revalidatePath("/admin/clientes");
    return { id };
  },
);

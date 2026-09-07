"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { defineAdminAction } from "@/lib/auth/admin-action";
import { recordAuditEvent } from "@/domain/audit/service";
import {
  createExperienceFamily,
  createExperienceFamilySchema,
  getExperienceFamilyById,
  updateExperienceFamily,
  updateExperienceFamilySchema,
} from "./family";
import {
  createExperiencePackage,
  createExperiencePackageSchema,
  getExperiencePackageById,
  updateExperiencePackage,
  updateExperiencePackageSchema,
} from "./experience-package";
import { canDeactivateExperienceFamily, countActivePackagesInFamily } from "./queries";

function revalidateCatalog() {
  revalidatePath("/admin/pacotes");
  revalidatePath("/admin/pacotes/familias");
  revalidatePath("/admin/agenda/novo");
}

export const createExperienceFamilyAction = defineAdminAction(
  { role: "staff", input: createExperienceFamilySchema },
  async (input, ctx) => {
    const created = await createExperienceFamily(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "experience_family.created",
      entityType: "experience_family",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidateCatalog();
    return { id: created.id };
  },
);

export const updateExperienceFamilyAction = defineAdminAction(
  { role: "staff", input: updateExperienceFamilySchema.extend({ id: z.string().uuid() }) },
  async ({ id, ...patch }, ctx) => {
    const before = await getExperienceFamilyById(id);
    if (!before) throw new Error("família inexistente");
    if (patch.active === false) {
      const activePackageCount = await countActivePackagesInFamily(id);
      if (!canDeactivateExperienceFamily(activePackageCount)) {
        throw new Error("desative os pacotes ativos antes de desativar a família");
      }
    }
    const after = await updateExperienceFamily(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "experience_family.updated",
      entityType: "experience_family",
      entityId: id,
      before,
      after,
    });
    revalidateCatalog();
    return { id };
  },
);

export const createExperiencePackageAction = defineAdminAction(
  { role: "staff", input: createExperiencePackageSchema },
  async (input, ctx) => {
    const created = await createExperiencePackage(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "experience_package.created",
      entityType: "experience_package",
      entityId: created.id,
      before: null,
      after: created,
    });
    revalidateCatalog();
    return { id: created.id };
  },
);

export const updateExperiencePackageAction = defineAdminAction(
  { role: "staff", input: updateExperiencePackageSchema.extend({ id: z.string().uuid() }) },
  async ({ id, ...patch }, ctx) => {
    const before = await getExperiencePackageById(id);
    if (!before) throw new Error("pacote inexistente");
    const after = await updateExperiencePackage(id, patch);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "experience_package.updated",
      entityType: "experience_package",
      entityId: id,
      before,
      after,
    });
    revalidateCatalog();
    return { id };
  },
);

"use server";

import { defineAdminAction } from "@/lib/auth/admin-action";
import { recordAuditEvent } from "@/domain/audit/service";
import { contractorProfileSchema } from "./schema";
import { upsertActiveContractorProfile } from "./service";

const CONTRACTOR_PROFILE_CHANGED_FIELDS = ["personType", "legalName", "document", "address"] as const;

export const saveContractorProfileAction = defineAdminAction(
  { role: "staff", input: contractorProfileSchema },
  async (input, ctx) => {
    const profile = await upsertActiveContractorProfile(input);
    await recordAuditEvent({
      actorUserId: ctx.user.id,
      action: "contractor_profile.updated",
      entityType: "contractor_profile",
      entityId: profile.id,
      before: null,
      after: {
        personType: profile.personType,
        changedFields: CONTRACTOR_PROFILE_CHANGED_FIELDS,
      },
    });
    return { id: profile.id };
  },
);

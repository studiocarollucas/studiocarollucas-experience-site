"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionableAdminActionError, defineAdminAction } from "@/lib/auth/admin-action";
import { linkStylingReferenceToInventoryItem, StylingInventoryLinkError } from "@/domain/styling/inventory-links";

export const linkStylingReferenceToInventoryItemAction = defineAdminAction(
  { role: "staff", input: z.object({
    shootId: z.string().uuid(),
    referenceId: z.string().uuid(),
    inventoryItemId: z.string().uuid().nullable(),
  }) },
  async (input, { user }) => {
    try {
      await linkStylingReferenceToInventoryItem(input, user.id);
    } catch (error) {
      if (error instanceof StylingInventoryLinkError) throw new ActionableAdminActionError(error.message);
      throw error;
    }
    revalidatePath(`/admin/agenda/${input.shootId}`);
    revalidatePath("/minha-experiencia/styling");
    return null;
  },
);

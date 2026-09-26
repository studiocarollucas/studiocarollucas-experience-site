"use server";

import { revalidatePath } from "next/cache";
import {
  PortalInventorySelectionError,
  setClientInventoryPreference,
} from "@/domain/inventory/portal-selection";
import type { PortalInventoryAvailability } from "@/domain/inventory/portal-selection-rules";
import { PortalReadError } from "@/domain/portal/read";
import { getPortalRequestContext } from "@/domain/portal/server";
import type { ActionResult } from "@/lib/auth/action-result";
import { logger } from "@/lib/observability/logger";

// Client-portal mutation (outside app/admin, so not a defineAdminAction): the
// client, her Auth user and her shoot are always resolved from the session on
// the server. The payload only carries the item and the desired state; any
// client/shoot id sent by the browser is dropped by the domain schema, and the
// domain re-checks shoot ownership in the database.
export async function setInventoryPreferenceAction(
  input: unknown,
): Promise<ActionResult<{ inventoryItemId: string; state: PortalInventoryAvailability }>> {
  try {
    const context = await getPortalRequestContext();
    if (!context.shoot) {
      return { ok: false, error: "A escolha de peças não está aberta para o seu ensaio." };
    }
    const data = await setClientInventoryPreference(
      {
        clientId: context.client.id,
        shootId: context.shoot.id,
        authUserId: context.viewerAuthUserId,
      },
      input,
    );
    revalidatePath("/minha-experiencia/styling");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof PortalInventorySelectionError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof PortalReadError && error.code !== "query_failed") {
      return { ok: false, error: "Sua sessão expirou. Entre novamente para escolher suas peças." };
    }
    logger.error("inventory preference failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Não foi possível salvar sua escolha. Tente novamente." };
  }
}

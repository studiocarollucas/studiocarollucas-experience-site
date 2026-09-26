"use server";

import { revalidatePath } from "next/cache";
import { PortalReadError } from "@/domain/portal/read";
import { getPortalRequestContext } from "@/domain/portal/server";
import { UpsellError } from "@/domain/upsell/errors";
import { requestUpsellOrder } from "@/domain/upsell/portal";
import type { ActionResult } from "@/lib/auth/action-result";
import { logger } from "@/lib/observability/logger";

// Client-portal mutation (outside app/admin, so not a defineAdminAction), same
// shape as setPhotoSelectionAction: the client comes from the session, never
// from the payload. The payload only chooses products and quantities; the
// domain reads prices on the server and dedupes by the form's request key.
export async function requestUpsellOrderAction(
  input: unknown,
): Promise<ActionResult<{ orderId: string; created: boolean }>> {
  try {
    const context = await getPortalRequestContext();
    const { order, created } = await requestUpsellOrder(context.client.id, context.viewerAuthUserId, input);
    revalidatePath("/minha-experiencia/galeria");
    return { ok: true, data: { orderId: order.id, created } };
  } catch (error) {
    if (error instanceof UpsellError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof PortalReadError && error.code !== "query_failed") {
      return { ok: false, error: "Sua sessão expirou. Entre novamente para enviar seu pedido." };
    }
    logger.error("upsell order request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Não foi possível enviar seu pedido. Tente novamente." };
  }
}

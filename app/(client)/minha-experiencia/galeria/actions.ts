"use server";

import { GallerySelectionError, setPhotoSelection } from "@/domain/gallery/selections";
import { PortalReadError } from "@/domain/portal/read";
import { getPortalRequestContext } from "@/domain/portal/server";
import type { ActionResult } from "@/lib/auth/action-result";
import { logger } from "@/lib/observability/logger";

// Client-portal mutation (outside app/admin, so not a defineAdminAction): the
// client is always resolved from the session on the server. The payload only
// carries the asset and the desired state; any client/gallery id sent by the
// browser is ignored by the domain schema.
export async function setPhotoSelectionAction(
  input: unknown,
): Promise<ActionResult<{ assetId: string; selected: boolean }>> {
  try {
    const context = await getPortalRequestContext();
    const data = await setPhotoSelection(context.client.id, input);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof GallerySelectionError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof PortalReadError && error.code !== "query_failed") {
      return { ok: false, error: "Sua sessão expirou. Entre novamente para salvar seus favoritos." };
    }
    logger.error("photo selection failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Não foi possível salvar seu favorito. Tente novamente." };
  }
}

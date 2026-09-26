import "server-only";

import { createClientAssetDownload } from "@/domain/gallery/downloads";
import { PortalReadError } from "@/domain/portal/read";
import { getPortalRequestContext } from "@/domain/portal/server";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

type GalleryDownloadRouteContext = { params: Promise<{ assetId: string }> };

function textResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { "cache-control": "no-store" } });
}

// SCL-505: the gallery links here, never to storage. The client is resolved from
// the session, the asset is authorized against her published Gallery, and only
// then is a 60-second signed URL issued as a redirect.
export async function GET(_request: Request, ctx: GalleryDownloadRouteContext) {
  let clientId: string;
  try {
    clientId = (await getPortalRequestContext()).client.id;
  } catch (error) {
    if (error instanceof PortalReadError && error.code === "unauthenticated") {
      return textResponse("Entre novamente para baixar suas fotos.", 401);
    }
    if (error instanceof PortalReadError && error.code === "unlinked") {
      return textResponse("Seu acesso ainda não está disponível.", 403);
    }
    logger.error("gallery download context failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return textResponse("Não foi possível preparar o download.", 500);
  }

  const { assetId } = await ctx.params;
  try {
    const download = await createClientAssetDownload(clientId, assetId);
    if (download.status === "not_found") return textResponse("Foto não encontrada.", 404);
    if (download.status === "blocked") {
      return textResponse("O download das fotos desta galeria não está liberado.", 403);
    }
    return new Response(null, {
      status: 307,
      headers: { location: download.signedUrl, "cache-control": "no-store" },
    });
  } catch (error) {
    logger.error("gallery download failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return textResponse("Não foi possível preparar o download.", 500);
  }
}

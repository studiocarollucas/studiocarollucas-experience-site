import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContractDownload } from "@/domain/contracts/queries";
import { CONTRACTS_BUCKET } from "@/domain/contracts/snapshot";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/contracts/[id]/download">,
) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const { id } = await ctx.params;
  const contract = await getContractDownload(id);
  if (!contract) return new Response("Documento não encontrado.", { status: 404 });

  const supabase = await createSupabaseServerClient();
  const signed = await supabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(contract.pdfStoragePath, 60);
  if (signed.error || !signed.data?.signedUrl) {
    return new Response("Não foi possível preparar o documento.", { status: 500 });
  }
  return Response.redirect(signed.data.signedUrl, 307);
}

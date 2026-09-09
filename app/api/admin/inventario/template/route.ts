import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { createInventoryImportTemplate } from "@/domain/inventory/import-template";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) {
    return new Response("Forbidden", { status: 403 });
  }
  const body = Uint8Array.from(createInventoryImportTemplate()).buffer;
  return new Response(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="modelo-acervo.xlsx"',
    },
  });
}

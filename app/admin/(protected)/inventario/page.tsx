import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { listInventoryItems, type InventoryListFilters } from "@/domain/inventory/queries";
import { InventoryCatalog } from "@/components/admin/inventory-catalog";
import { InventoryItemForm } from "@/components/admin/inventory-item-form";
import { InventoryImport } from "@/components/admin/inventory-import";
import { PageHeader } from "@/components/ui/page-header";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");
  const raw = await searchParams;
  const filters: InventoryListFilters = {};
  for (const key of ["search", "type", "status", "color", "size", "page", "pageSize"] as const) {
    const value = raw[key];
    if (typeof value === "string") filters[key] = value;
  }
  const catalog = await listInventoryItems(filters, user.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Acervo"
        description="Roupas, clutches, acessórios e objetos para os ensaios."
        action={
          <a
            href="/api/admin/inventario/template"
            className="border border-line px-5 py-3 font-sans text-xs uppercase tracking-widest"
          >
            Baixar modelo XLSX
          </a>
        }
      />
      <InventoryCatalog {...catalog} filters={filters} />
      <details className="border border-line bg-white p-6">
        <summary className="cursor-pointer font-serif text-lg text-ink">Novo item</summary>
        <div className="mt-5 max-w-2xl">
          <InventoryItemForm />
        </div>
      </details>
      <details className="border border-line bg-white p-6">
        <summary className="cursor-pointer font-serif text-lg text-ink">Importar planilha</summary>
        <div className="mt-5">
          <InventoryImport />
        </div>
      </details>
    </div>
  );
}

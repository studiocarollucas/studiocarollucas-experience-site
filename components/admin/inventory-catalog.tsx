import Link from "next/link";
import type { InventoryListFilters, InventoryListRow } from "@/domain/inventory/queries";
import { inventoryItemTypeValues, inventoryItemStatusValues } from "@/domain/inventory/schema";
import { inventoryTypeLabels, inventoryStatusLabels } from "@/components/admin/inventory-labels";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ClearInventoryFilters } from "@/components/admin/clear-inventory-filters";

export function InventoryCatalog({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: InventoryListRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: InventoryListFilters;
}) {
  const pageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    for (const key of ["search", "type", "status", "color", "size"] as const)
      if (filters[key]) query.set(key, filters[key]);
    query.set("page", String(nextPage));
    query.set("pageSize", String(pageSize));
    return `/admin/inventario?${query}`;
  };
  return (
    <div className="space-y-5">
      <form
        key={JSON.stringify([
          filters.search,
          filters.type,
          filters.status,
          filters.color,
          filters.size,
        ])}
        method="get"
        action="/admin/inventario"
        className="grid gap-4 border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field label="Buscar por código ou nome" htmlFor="inventory-search">
          <Input id="inventory-search" name="search" defaultValue={filters.search} />
        </Field>
        <Field label="Tipo" htmlFor="inventory-type">
          <Select id="inventory-type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">Todos os tipos</option>
            {inventoryItemTypeValues.map((type) => (
              <option key={type} value={type}>
                {inventoryTypeLabels[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="inventory-status">
          <Select id="inventory-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos os status</option>
            {inventoryItemStatusValues.map((status) => (
              <option key={status} value={status}>
                {inventoryStatusLabels[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cor" htmlFor="inventory-color">
          <Input id="inventory-color" name="color" defaultValue={filters.color} />
        </Field>
        <Field label="Tamanho" htmlFor="inventory-size">
          <Input id="inventory-size" name="size" defaultValue={filters.size} />
        </Field>
        <div className="flex items-end gap-4">
          <button type="submit" className="border border-ink px-5 py-3 font-sans text-sm">
            Filtrar
          </button>
          <ClearInventoryFilters />
        </div>
      </form>
      <p className="font-sans text-sm text-muted">
        {total} {total === 1 ? "item encontrado" : "itens encontrados"}
      </p>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        columns={[
          {
            key: "item",
            header: "Item",
            render: (row) => (
              <div>
                <Link
                  aria-label={`Editar ${row.name}`}
                  href={`/admin/inventario/${row.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {row.code} · {row.name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {[row.color, row.size].filter(Boolean).join(" · ") || "Sem cor ou tamanho"}
                </p>
              </div>
            ),
          },
          { key: "type", header: "Tipo", render: (row) => inventoryTypeLabels[row.type] },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Badge tone={row.status === "available" ? "success" : "neutral"}>
                  {inventoryStatusLabels[row.status]}
                </Badge>
                {!row.active ? <Badge tone="danger">Inativo</Badge> : null}
              </div>
            ),
          },
          {
            key: "reservations",
            header: "Reservas futuras",
            render: (row) =>
              row.futureReservations.length ? (
                <ul className="space-y-1">
                  {row.futureReservations.map((reservation) => (
                    <li key={reservation.id}>
                      {reservation.startsOn} a {reservation.endsOn} ·{" "}
                      {reservation.status === "confirmed" ? "Confirmada" : "Pendente"}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted">Sem reservas futuras</span>
              ),
          },
        ]}
        empty={
          <EmptyState
            title="Nenhum item encontrado"
            description="Ajuste os filtros ou cadastre o primeiro item do acervo."
          />
        }
      />
      <nav
        aria-label="Paginação do acervo"
        className="flex items-center justify-between gap-4 font-sans text-sm"
      >
        {page > 1 ? (
          <Link href={pageUrl(page - 1)} className="underline">
            Página anterior
          </Link>
        ) : (
          <span />
        )}
        <span>
          Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        {page * pageSize < total ? (
          <Link href={pageUrl(page + 1)} className="underline">
            Próxima página
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

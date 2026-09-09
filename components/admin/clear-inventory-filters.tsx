"use client";

import Link from "next/link";

export function ClearInventoryFilters() {
  return (
    <Link
      href="/admin/inventario"
      className="py-3 font-sans text-sm underline"
      onClick={(event) => event.currentTarget.closest("form")?.reset()}
    >
      Limpar filtros
    </Link>
  );
}

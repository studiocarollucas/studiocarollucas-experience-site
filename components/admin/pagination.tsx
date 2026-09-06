import Link from "next/link";

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;

  function href(targetPage: number): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v) next.set(k, v);
    next.set("page", String(targetPage));
    return `${basePath}?${next.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between font-sans text-xs text-muted">
      <span>
        Página {page} de {lastPage} · {total} registros
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="border border-line px-3 py-1 hover:border-ink">
            Anterior
          </Link>
        ) : null}
        {page < lastPage ? (
          <Link href={href(page + 1)} className="border border-line px-3 py-1 hover:border-ink">
            Próxima
          </Link>
        ) : null}
      </div>
    </div>
  );
}

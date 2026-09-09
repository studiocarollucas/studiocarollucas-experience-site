import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { studioDate } from "@/domain/portal/countdown";
import { db } from "@/db/client";
import { inventoryItems, inventoryReservations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/auth/rbac";
import { readInventoryMediaUrls } from "@/domain/inventory/media";
import {
  InventoryItemForm,
  InventoryDeactivateForm,
  InventoryMediaManager,
} from "@/components/admin/inventory-item-form";
import { DetailSection } from "@/components/admin/detail-section";
import { PageHeader } from "@/components/ui/page-header";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasMinimumRole(user.role, "staff")) redirect("/admin/login");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  if (!item) notFound();
  const [mediaResult, reservations] = await Promise.all([
    readInventoryMediaUrls(id)
      .then((media) => ({ media, error: false }))
      .catch(() => ({ media: [], error: true })),
    db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.inventoryItemId, id),
          inArray(inventoryReservations.status, ["pending", "confirmed"]),
          gte(inventoryReservations.endsOn, studioDate())
        )
      )
      .orderBy(asc(inventoryReservations.startsOn)),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${item.code} · ${item.name}`}
        description="Detalhes do acervo"
        action={
          <Link href="/admin/inventario" className="font-sans text-sm underline">
            Voltar ao acervo
          </Link>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DetailSection title="Editar item">
          <InventoryItemForm key={`item-${item.active}`} initialValues={item} />
          <InventoryDeactivateForm key={`deactivate-${item.active}`} id={id} active={item.active} />
        </DetailSection>
        <div className="space-y-6">
          <DetailSection title="Fotos do item">
            {mediaResult.error ? (
              <p role="alert" className="font-sans text-sm text-danger">
                Não foi possível carregar as fotos privadas. Atualize a página para tentar
                novamente.
              </p>
            ) : (
              <InventoryMediaManager itemId={id} name={item.name} media={mediaResult.media} />
            )}
          </DetailSection>
          <DetailSection title="Reservas futuras">
            {reservations.length ? (
              <ul className="space-y-3 font-sans text-sm">
                {reservations.map((reservation) => (
                  <li key={reservation.id} className="border-b border-line pb-3">
                    <p>
                      {reservation.startsOn} a {reservation.endsOn} ·{" "}
                      {reservation.status === "confirmed" ? "Confirmada" : "Pendente"}
                    </p>
                    {reservation.shootId ? (
                      <Link href={`/admin/agenda/${reservation.shootId}`} className="underline">
                        Abrir ensaio
                      </Link>
                    ) : null}
                    {reservation.overrideReason ? (
                      <p>Exceção: {reservation.overrideReason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-sm text-muted">Sem reservas futuras.</p>
            )}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

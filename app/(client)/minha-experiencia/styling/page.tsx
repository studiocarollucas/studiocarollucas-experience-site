import { ClientInventorySelection } from "@/components/client/inventory-selection";
import { StylingBoard } from "@/components/client/styling-board";
import { readPortalInventorySelection } from "@/domain/inventory/portal-selection";
import type { PortalInventorySelection } from "@/domain/inventory/portal-selection-rules";
import type { PortalContext } from "@/domain/portal/read";
import { getPortalStylingSnapshot } from "@/domain/portal/server";
import { logger } from "@/lib/observability/logger";
import { readStylingInventoryLinks } from "@/domain/styling/inventory-links";
import type { PortalReference } from "@/domain/portal/types";

async function loadInventoryLinks(shootId: string, references: PortalReference[]) {
  try {
    return { references: await readStylingInventoryLinks(shootId, references), available: true };
  } catch {
    logger.error("portal styling inventory links unavailable", { shootId });
    return { references: references.map((reference) => ({ ...reference, inventoryLink: null })), available: false };
  }
}

// The inventory section fails on its own: an acervo/storage outage must not
// take the moodboard down with it.
async function loadInventorySelection(
  context: PortalContext,
): Promise<{ ok: true; selection: PortalInventorySelection | null } | { ok: false }> {
  try {
    return { ok: true, selection: await readPortalInventorySelection(context) };
  } catch (error) {
    logger.error("portal inventory selection unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false };
  }
}

export default async function ClientStylingPage() {
  const snapshot = await getPortalStylingSnapshot();
  const [inventory, inventoryLinks] = snapshot.shoot ? await Promise.all([
    loadInventorySelection(snapshot), loadInventoryLinks(snapshot.shoot.id, snapshot.references),
  ]) : [null, null];

  return (
    <section className="flex flex-col gap-6" aria-labelledby="styling-title">
      <header className="border-b border-line pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Inspirações</p>
        <h1 id="styling-title" className="mt-2 font-serif text-4xl font-light sm:text-5xl">
          Styling e referências
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-muted">
          Um espaço compartilhado para alinhar atmosfera, figurino, cores e detalhes do seu ensaio.
        </p>
      </header>

      {snapshot.shoot ? (
        <>
          {inventory && !inventory.ok ? (
            <p role="status" className="border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
              Não foi possível carregar as peças do acervo agora. Tente novamente em instantes.
            </p>
          ) : inventory?.ok && inventory.selection ? (
            <ClientInventorySelection selection={inventory.selection} />
          ) : null}

          <section aria-labelledby="moodboard-title" className="flex flex-col gap-4">
            {inventoryLinks && !inventoryLinks.available ? <p role="status" className="font-sans text-sm text-muted">
              Não foi possível carregar os vínculos com o acervo agora. Tente novamente em instantes.
            </p> : null}
            <div className="border-b border-line pb-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">
                Inspiração · não é reserva
              </p>
              <h2 id="moodboard-title" className="mt-2 font-serif text-3xl font-light">
                Moodboard
              </h2>
              <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-muted">
                Referências livres de atmosfera, make e cenário. Imagens daqui não reservam peças do acervo.
              </p>
            </div>
            <StylingBoard
              shootId={snapshot.shoot.id}
              viewerAuthUserId={snapshot.viewerAuthUserId}
              references={inventoryLinks?.references ?? snapshot.references}
            />
          </section>
        </>
      ) : (
        <p className="border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Seu espaço de styling aparecerá quando o ensaio for liberado.
        </p>
      )}
    </section>
  );
}

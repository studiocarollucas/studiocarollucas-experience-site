import { StylingBoard } from "@/components/client/styling-board";
import { getPortalStylingSnapshot } from "@/domain/portal/server";

export default async function ClientStylingPage() {
  const snapshot = await getPortalStylingSnapshot();

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
        <StylingBoard
          shootId={snapshot.shoot.id}
          viewerAuthUserId={snapshot.viewerAuthUserId}
          references={snapshot.references}
        />
      ) : (
        <p className="border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Seu espaço de styling aparecerá quando o ensaio for liberado.
        </p>
      )}
    </section>
  );
}

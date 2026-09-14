import type { Metadata } from "next";
import { listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";
import { PaixaoClutchCatalog } from "@/components/site/paixao-clutch-catalog";
import { toPaixaoClutchCatalogItem } from "@/lib/site/paixao-clutch-catalog";
import { contactUrl } from "@/lib/site/contact";
import { PaixaoClutchWhatsAppLink } from "@/components/site/paixao-clutch-tracked-links";
import s from "../home.module.css";
import p from "./paixao-clutch.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paixão Clutch | Stúdio Carol Lucas",
  description: "Uma curadoria de clutches para compor sua experiência no Stúdio Carol Lucas.",
  alternates: { canonical: "/paixao-clutch" },
  openGraph: {
    title: "Paixão Clutch | Stúdio Carol Lucas",
    description: "Uma curadoria de clutches para compor sua experiência no Stúdio Carol Lucas.",
    url: "/paixao-clutch",
  },
  twitter: {
    title: "Paixão Clutch | Stúdio Carol Lucas",
    description: "Uma curadoria de clutches para compor sua experiência no Stúdio Carol Lucas.",
  },
};

export default async function PaixaoClutchPage() {
  const clutches = await listPublicPaixaoClutches();

  return (
    <main id="conteudo">
      <section className={p.intro}>
        <p className={s.eyebrow}>Paixão Clutch</p>
        <h1>O detalhe que<br />acompanha seu <em>momento.</em></h1>
        <p>Uma seleção especial para dar o toque final à sua produção e à experiência que você quer viver.</p>
      </section>
      {clutches.length > 0 ? (
        <PaixaoClutchCatalog clutches={clutches.map(toPaixaoClutchCatalogItem)} />
      ) : (
        <section className={p.empty} aria-labelledby="curadoria-em-breve">
          <p className={s.eyebrow}>Em breve</p>
          <h2 id="curadoria-em-breve">Nossa curadoria está ganhando forma.</h2>
          <p>Conte ao estúdio o que você imagina para a sua produção.</p>
          <PaixaoClutchWhatsAppLink className={s.cta} href={contactUrl()} target="_blank" rel="noreferrer">
            Conversar sobre uma clutch <span aria-hidden="true">↗</span>
          </PaixaoClutchWhatsAppLink>
        </section>
      )}
    </main>
  );
}

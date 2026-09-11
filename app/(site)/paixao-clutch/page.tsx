import type { Metadata } from "next";
import Link from "next/link";
import { listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";
import { formatBRL } from "@/lib/format";
import { contactUrl } from "@/lib/site/contact";
import { PaixaoClutchWhatsAppLink } from "@/components/site/paixao-clutch-tracked-links";
import s from "../home.module.css";
import p from "./paixao-clutch.module.css";

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
        <section className={p.catalog} aria-label="Curadoria Paixão Clutch">
          {clutches.map((clutch, index) => (
            <article key={clutch.slug} className={index === 0 && clutch.featured ? p.featured : undefined}>
              <Link href={`/paixao-clutch/${clutch.slug}`} aria-label={`Conhecer ${clutch.name}`}>
                <div className={p.photo}>
                  <img src={clutch.publicImagePath} alt={clutch.name} />
                </div>
                <div className={p.cardHeading}>
                  <h2>{clutch.name}</h2>
                  <span aria-hidden="true">↗</span>
                </div>
                <p>{clutch.copy}</p>
                <strong>{formatBRL(clutch.rentalPrice)}</strong>
                <span className={p.readMore}>Conhecer clutch</span>
              </Link>
            </article>
          ))}
        </section>
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

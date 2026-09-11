import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findPublicPaixaoClutch, listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";
import { formatBRL } from "@/lib/format";
import { paixaoClutchContactUrl } from "@/lib/site/contact";
import s from "../../home.module.css";
import p from "../paixao-clutch.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const clutch = await findPublicPaixaoClutch((await params).slug);
  if (!clutch) notFound();
  const title = `${clutch.name} | Paixão Clutch | Stúdio Carol Lucas`;
  const url = `/paixao-clutch/${clutch.slug}`;
  return {
    title,
    description: clutch.copy,
    alternates: { canonical: url },
    openGraph: { title, description: clutch.copy, url, images: [clutch.publicImagePath] },
    twitter: { title, description: clutch.copy, images: [clutch.publicImagePath] },
  };
}

export default async function PaixaoClutchDetailPage({ params }: Props) {
  const clutch = await findPublicPaixaoClutch((await params).slug);
  if (!clutch) notFound();
  const formattedPrice = formatBRL(clutch.rentalPrice);
  const related = (await listPublicPaixaoClutches()).filter((item) => item.slug !== clutch.slug);

  return (
    <main id="conteudo">
      <nav className={p.breadcrumb} aria-label="Caminho da página">
        <Link href="/paixao-clutch">Paixão Clutch</Link><span aria-hidden="true">/</span><span aria-current="page">{clutch.name}</span>
      </nav>
      <section className={p.detailHero}>
        <div className={p.detailCopy}>
          <p className={s.eyebrow}>Paixão Clutch · Stúdio Carol Lucas</p>
          <h1>{clutch.name}</h1>
          <p>{clutch.copy}</p>
          <strong>{formattedPrice}</strong>
          <a className={s.cta} href={paixaoClutchContactUrl({ name: clutch.name, formattedPrice })} target="_blank" rel="noreferrer">
            Consultar disponibilidade <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className={p.detailPhoto}><img src={clutch.publicImagePath} alt={clutch.name} /></div>
      </section>
      {related.length > 0 && (
        <section className={p.related} aria-labelledby="outras-clutches">
          <p className={s.eyebrow}>Continue explorando</p>
          <h2 id="outras-clutches">Outras clutches da curadoria</h2>
          <div>
            {related.map((item) => (
              <Link key={item.slug} href={`/paixao-clutch/${item.slug}`} aria-label={`Conhecer ${item.name}`}>
                <img src={item.publicImagePath} alt={item.name} />
                <span>{item.name} <i aria-hidden="true">↗</i></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

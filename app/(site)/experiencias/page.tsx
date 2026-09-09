import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { experiences } from "@/lib/site/experiences";
import { contactUrl } from "@/lib/site/contact";
import s from "../home.module.css";
import e from "./experiences.module.css";

export const metadata: Metadata = {
  title: "Experiências fotográficas | Stúdio Carol Lucas",
  description:
    "Conheça os ensaios de 15 anos, aniversário feminino, gestante e newborn. Escolha a experiência que combina com o seu momento.",
  alternates: { canonical: "/experiencias" },
};

export default function ExperiencesPage() {
  return (
    <main id="conteudo">
      <section className={e.intro}>
        <p className={s.eyebrow}>Experiências Carol Lucas</p>
        <h1>
          Qual fase da sua história
          <br />
          vamos <em>fotografar?</em>
        </h1>
        <p className={e.lead}>
          Conheça as possibilidades e encontre um ponto de partida. A conversa com o estúdio dá
          forma aos detalhes.
        </p>
      </section>
      <section className={e.catalog} aria-label="Tipos de ensaio">
        {experiences.map((experience, index) => (
          <article key={experience.slug}>
            <Link href={`/experiencias/${experience.slug}`}>
              <div className={e.catalogPhoto}>
                <Image
                  src={`/images/site/home/${experience.image}.webp`}
                  alt={experience.alt}
                  fill
                  sizes="(max-width: 700px) 90vw, 43vw"
                  preload={index === 0}
                  style={{ objectPosition: experience.position }}
                />
              </div>
              <div className={e.catalogTitle}>
                <h2>{experience.name}</h2>
                <span aria-hidden="true">↗</span>
              </div>
              <p>{experience.copy}</p>
              <span className={e.readMore}>Conhecer a experiência</span>
            </Link>
          </article>
        ))}
      </section>
      <section className={s.closing}>
        <div>
          <p className={s.eyebrow}>Ainda está descobrindo?</p>
          <h2>
            Vamos encontrar
            <br />o seu ponto de partida.
          </h2>
        </div>
        <a className={s.cta} href={contactUrl()} target="_blank" rel="noreferrer">
          Conversar com o estúdio <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}

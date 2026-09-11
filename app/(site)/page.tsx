import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listPublicPaixaoClutches } from "@/domain/inventory/public-clutch";
import { PaixaoClutchHomeLink } from "@/components/site/paixao-clutch-tracked-links";
import { experiences } from "@/lib/site/experiences";
import { contactUrl } from "@/lib/site/contact";
import s from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stúdio Carol Lucas | Experiências fotográficas autorais",
  description:
    "Uma experiência com a sua identidade. Fotografias com a nossa assinatura. Ensaios de 15 anos, aniversário feminino, gestante e newborn no Stúdio Carol Lucas.",
  alternates: { canonical: "/" },
};

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Photo({
  name,
  alt,
  sizes,
  preload = false,
  position,
}: {
  name: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  position?: string;
}) {
  return (
    <Image
      src={`/images/site/home/${name}.webp`}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      style={position ? { objectPosition: position } : undefined}
    />
  );
}

export default async function Home() {
  const [featuredClutch] = await listPublicPaixaoClutches();

  return (
    <div className={s.home}>
      <a className={s.skip} href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className={s.header}>
        <Link href="/" className={s.logo} aria-label="Stúdio Carol Lucas — início">
          Carol Lucas<small>STÚDIO FOTOGRÁFICO</small>
        </Link>
        <nav aria-label="Navegação principal" className={s.nav}>
          <Link href="/experiencias">Experiências</Link>
          <Link href="/paixao-clutch">Paixão Clutch</Link>
          <a href="#preparacao">Como acontece</a>
          <Link className={s.access} href="/minha-experiencia">
            Minha experiência <Arrow />
          </Link>
        </nav>
      </header>
      <main id="conteudo">
        <section className={s.intro} aria-labelledby="titulo">
          <p className={s.eyebrow}>
            Fotografia com direção autoral.
            <br />
            Uma experiência pensada para você.
          </p>
          <h1 id="titulo">
            Uma experiência com
            <br className={s.desktopBreak} /> a sua <em>identidade.</em>
            <span>Fotografias com a nossa assinatura.</span>
          </h1>
        </section>
        <div className={s.heroImages}>
          <figure className={s.heroMain}>
            <Photo
              name="quinze-guitarra"
              alt="Ensaio de 15 anos com guitarra, luz dramática e atitude"
              sizes="(max-width: 700px) 90vw, 56vw"
              preload
            />
            <figcaption>15 ANOS · ATITUDE EM CENA</figcaption>
          </figure>
          <figure className={s.heroSecondary}>
            <Photo
              name="aniversario-dourado"
              alt="Retrato feminino com vestido bronze e balões dourados"
              sizes="(max-width: 700px) 62vw, 34vw"
            />
            <figcaption>ANIVERSÁRIO · DO SEU JEITO</figcaption>
          </figure>
        </div>
        <div className={s.heroFoot}>
          <p>
            Seu jeito, suas referências, o momento que você está vivendo. É daí que começamos a
            imaginar o seu ensaio.
          </p>
          <a className={s.cta} href="#experiencias">
            Encontre sua experiência <Arrow />
          </a>
        </div>
        <section className={s.experiences} id="experiencias" aria-labelledby="experiencias-titulo">
          <div className={s.sectionHeading}>
            <div>
              <p className={s.eyebrow}>O que vamos celebrar?</p>
              <h2 id="experiencias-titulo">
                Cada fase pede
                <br />
                um novo olhar.
              </h2>
            </div>
            <p>
              Da vontade de se redescobrir à chegada de alguém. Um espaço para viver e guardar o que
              importa agora.
            </p>
          </div>
          <div className={s.gallery}>
            {experiences.map((e) => (
              <article key={e.name}>
                <Link
                  href={`/experiencias/${e.slug}`}
                  aria-label={`Conhecer a experiência ${e.name}`}
                >
                  <div className={s.galleryPhoto}>
                    <Photo
                      name={e.image}
                      alt={e.alt}
                      sizes="(max-width: 700px) 43vw, 22vw"
                      position={e.position}
                    />
                  </div>
                  <h3>
                    {e.name} <Arrow />
                  </h3>
                </Link>
                <p>{e.copy}</p>
              </article>
            ))}
          </div>
          <div className={s.quizCta}>
            <div>
              <p className={s.eyebrow}>Ainda escolhendo?</p>
              <h3>Comece pela sua história.</h3>
              <p>Em poucos passos, encontre uma experiência que acompanhe seu momento, suas ideias e o que faz sentido para você.</p>
            </div>
            <Link href="/quiz" className={s.cta}>Descubra a sua curadoria <Arrow /></Link>
          </div>
        </section>
        <section className={s.clutchTeaser} aria-labelledby="paixao-clutch-titulo">
          <div className={s.clutchTeaserCopy}>
            <p className={s.eyebrow}>Paixão Clutch</p>
            <h2 id="paixao-clutch-titulo">Detalhes que acompanham sua produção.</h2>
            <p>
              Uma curadoria especial para compor o styling e dar forma ao momento que você quer viver.
            </p>
            <PaixaoClutchHomeLink className={s.cta}>
              Conhecer Paixão Clutch <Arrow />
            </PaixaoClutchHomeLink>
          </div>
          {featuredClutch ? (
            <PaixaoClutchHomeLink className={s.clutchTeaserImage}>
              {/* Public Supabase media has no fixed host allowlist for next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featuredClutch.publicImagePath} alt={featuredClutch.name} />
            </PaixaoClutchHomeLink>
          ) : null}
        </section>
        <section className={s.process} id="preparacao" aria-labelledby="preparacao-titulo">
          <div>
            <p className={s.eyebrow}>Antes da primeira fotografia</p>
            <h2 id="preparacao-titulo">
              A experiência
              <br />
              já começou.
            </h2>
            <p className={s.lead}>
              O ensaio começa nas ideias que você traz. A preparação dá forma a elas, com espaço
              para acompanhar cada detalhe.
            </p>
            <ol className={s.steps}>
              <li>
                <h3>Começamos pelo seu olhar</h3>
                <p>Suas referências ajudam a contar o que você gosta e como quer se ver.</p>
              </li>
              <li>
                <h3>Damos forma ao seu ensaio</h3>
                <p>Styling, inspirações e orientações reunidos para preparar esse momento.</p>
              </li>
              <li>
                <h3>Você acompanha de perto</h3>
                <p>
                  No portal Minha Experiência, veja a preparação, o checklist e as informações do
                  seu ensaio.
                </p>
              </li>
            </ol>
          </div>
          <aside className={s.portal} aria-labelledby="portal-titulo">
            <div className={s.portalSheet}>
              <p className={s.eyebrow}>Minha experiência / seu espaço</p>
              <h3 id="portal-titulo">
                Seu ensaio está
                <br />
                ganhando forma.
              </h3>
              <p>As ideias, os preparativos e os próximos passos reunidos aqui.</p>
              <div className={s.moodboard}>
                <div>
                  <Photo
                    name="aniversario-rosa"
                    alt="Inspiração: cenário rosa e vestido prateado"
                    sizes="(max-width: 700px) 35vw, 17vw"
                    position="65% 50%"
                  />
                </div>
                <div>
                  <Photo
                    name="aniversario-dourado"
                    alt="Inspiração: tons dourados para celebrar"
                    sizes="(max-width: 700px) 35vw, 17vw"
                  />
                </div>
              </div>
              <ul>
                <li>Suas referências</li>
                <li>Checklist de preparação</li>
                <li>Informações do ensaio</li>
              </ul>
              <Link href="/minha-experiencia" className={s.portalLink}>
                Acessar minha experiência <Arrow />
              </Link>
            </div>
          </aside>
        </section>
        <section className={s.closing} id="contato" aria-labelledby="contato-titulo">
          <div>
            <p className={s.eyebrow}>Vamos começar por uma conversa</p>
            <h2 id="contato-titulo">
              O que você quer
              <br />
              viver em fotografias?
            </h2>
          </div>
          <div>
            <a className={s.cta} href={contactUrl()} target="_blank" rel="noreferrer">
              Vamos imaginar seu ensaio <Arrow />
            </a>
            <p className={s.contactCaption}>WhatsApp · (92) 98414-0492</p>
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <span>Stúdio Carol Lucas</span>
        <span>Fotografia · Direção · Experiência</span>
        <a href="#titulo">Voltar ao início ↑</a>
      </footer>
    </div>
  );
}

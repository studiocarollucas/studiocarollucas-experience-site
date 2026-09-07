import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { experiences, findExperience } from "@/lib/site/experiences";
import { contactUrl } from "@/lib/site/contact";
import s from "../../home.module.css";
import e from "../experiences.module.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return experiences.map(({slug})=>({slug})); }
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const experience = findExperience((await params).slug);
  if (!experience) notFound();
  return {title:`Ensaio ${experience.name} | Stúdio Carol Lucas`,description:experience.introduction};
}

export default async function ExperiencePage({params}: Props) {
  const experience = findExperience((await params).slug);
  if (!experience) notFound();
  return <main id="conteudo"><nav className={e.breadcrumb} aria-label="Caminho da página"><Link href="/experiencias">Experiências</Link><span aria-hidden="true">/</span><span aria-current="page">{experience.name}</span></nav><section className={e.detailHero}><div className={e.detailCopy}><p className={s.eyebrow}>{experience.name} · Stúdio Carol Lucas</p><h1>{experience.headline}</h1><p className={e.lead}>{experience.introduction}</p><a className={s.cta} href={contactUrl(experience.name)} target="_blank" rel="noreferrer">Quero conhecer esse ensaio <span aria-hidden="true">↗</span></a></div><div className={`${e.detailPhoto} ${experience.wide?e.wide:""}`}><Image src={`/images/site/home/${experience.hero}.webp`} alt={experience.heroAlt} fill sizes="(max-width: 850px) 90vw, 45vw" preload /></div></section><section className={e.story}><div><p className={s.eyebrow}>Com a sua identidade</p><h2>O seu olhar faz<br />parte da criação.</h2></div><div><p>{experience.story}</p><h3>Para começar a imaginar</h3><p>{experience.preparation}</p><Link className={e.readMore} href="/#preparacao">Conheça a preparação e o portal ↗</Link></div></section><section className={e.faq} aria-labelledby="duvidas"><h2 id="duvidas">Antes do seu ensaio</h2><div>{experience.questions.map(({question,answer})=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section><section className={s.closing}><div><p className={s.eyebrow}>O próximo passo é uma conversa</p><h2>Vamos imaginar<br />esse momento?</h2></div><a className={s.cta} href={contactUrl(experience.name)} target="_blank" rel="noreferrer">Falar sobre {experience.name} <span aria-hidden="true">↗</span></a></section><nav className={e.other} aria-label="Outras experiências"><p className={s.eyebrow}>Outras histórias para viver</p>{experiences.filter(x=>x.slug!==experience.slug).map(x=><Link key={x.slug} href={`/experiencias/${x.slug}`}>{x.name} <span aria-hidden="true">↗</span></Link>)}</nav></main>;
}

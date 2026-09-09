import type { Metadata } from "next";
import Link from "next/link";
import { getPublicQuizCatalog } from "@/domain/quiz/catalog";
import { QuizFlow } from "@/components/site/quiz/quiz-flow";
import s from "../home.module.css";
import q from "./quiz.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quiz de curadoria | Stúdio Carol Lucas",
  description: "Descubra uma experiência fotográfica a partir do seu momento, estilo e investimento.",
  alternates: { canonical: "/quiz" },
  robots: { index: false, follow: false },
};

export default async function QuizPage() {
  const { families } = await getPublicQuizCatalog();
  return (
    <div className={`${s.home} ${q.quiz}`}>
      <a className={s.skip} href="#conteudo">Ir para o conteúdo</a>
      <header className={s.header}>
        <Link href="/" className={s.logo} aria-label="Stúdio Carol Lucas — início">Carol Lucas<small>STÚDIO FOTOGRÁFICO</small></Link>
        <nav aria-label="Navegação principal" className={s.nav}>
          <Link href="/experiencias">Experiências</Link>
          <Link className={s.access} href="/minha-experiencia">Minha experiência ↗</Link>
        </nav>
      </header>
      <main id="conteudo"><QuizFlow families={families} /></main>
      <footer className={s.footer}><Link href="/">Stúdio Carol Lucas</Link><span>Fotografia · Direção · Experiência</span><Link href="/experiencias">Todas as experiências</Link></footer>
    </div>
  );
}

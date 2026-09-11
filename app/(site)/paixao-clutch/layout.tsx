import Link from "next/link";
import s from "../home.module.css";

export default function PaixaoClutchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.home}>
      <a className={s.skip} href="#conteudo">Ir para o conteúdo</a>
      <header className={s.header}>
        <Link href="/" className={s.logo} aria-label="Stúdio Carol Lucas — início">
          Carol Lucas<small>STÚDIO FOTOGRÁFICO</small>
        </Link>
        <nav className={s.nav} aria-label="Navegação principal">
          <Link href="/">Início</Link>
          <Link href="/experiencias">Experiências</Link>
          <Link href="/paixao-clutch">Paixão Clutch</Link>
          <Link className={s.access} href="/minha-experiencia">Minha experiência ↗</Link>
        </nav>
      </header>
      {children}
      <footer className={s.footer}>
        <Link href="/">Stúdio Carol Lucas</Link>
        <span>Fotografia · Direção · Experiência</span>
        <Link href="/paixao-clutch">Paixão Clutch</Link>
      </footer>
    </div>
  );
}

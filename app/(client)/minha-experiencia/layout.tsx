import { redirect } from "next/navigation";
import { ClientNav } from "@/components/client/client-nav";
import { ClientSignOutButton } from "@/components/client/client-sign-out-button";
import { getLinkedClientByAuthUserId } from "@/lib/auth/client-link";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MinhaExperienciaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=%2Fminha-experiencia");

  const client = await getLinkedClientByAuthUserId(user.id);
  if (!client) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-12">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">
          Minha Experiência
        </p>
        <h1 className="font-serif text-4xl font-light">Seu acesso ainda não está disponível.</h1>
        <p className="font-sans text-sm leading-6 text-muted">
          Fale com o estúdio para confirmarmos o e-mail do seu cadastro.
        </p>
        <ClientSignOutButton />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-20 text-ink md:pb-0">
      <a
        href="#portal-main"
        className="absolute left-5 top-0 z-50 -translate-y-full rounded-b bg-ink px-4 py-3 font-sans text-sm text-cream transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-rose motion-reduce:transition-none"
      >
        Ir para o conteúdo principal
      </a>
      <header className="border-b border-line px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          <div>
            <p className="font-serif text-xl font-light">Stúdio Carol Lucas</p>
            <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted">
              Minha Experiência
            </p>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <ClientNav />
            <ClientSignOutButton />
          </div>
        </div>
      </header>
      <main
        id="portal-main"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12"
      >
        {children}
      </main>
      <div className="md:hidden">
        <ClientNav />
      </div>
    </div>
  );
}

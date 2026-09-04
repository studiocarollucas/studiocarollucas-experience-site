import { sendMagicLink } from "./actions";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const sent = first(params.sent);
  const redirectTo = first(params.redirect) ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream p-6">
      <form action={sendMagicLink} className="max-w-sm w-full space-y-4">
        <h1 className="font-serif text-2xl font-light text-ink">Minha Experiência</h1>
        <p className="text-muted text-sm">Receba um link de acesso por e-mail.</p>
        {sent ? (
          <p role="status" className="border border-line bg-white px-4 py-3 font-sans text-sm">
            Link enviado. Confira seu e-mail para entrar.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="border border-line bg-white px-4 py-3 font-sans text-sm">
            {error === "auth" ? "Não foi possível validar o link de acesso." : error}
          </p>
        ) : null}
        <input type="hidden" name="redirect" value={redirectTo} />
        <input
          name="email"
          type="email"
          required
          placeholder="seu@email.com"
          className="w-full border border-line bg-white px-4 py-3 font-sans text-sm text-ink"
        />
        <button
          type="submit"
          className="w-full bg-ink text-white font-sans text-[10px] tracking-[0.2em] uppercase px-7 py-4"
        >
          Enviar link
        </button>
      </form>
    </main>
  );
}

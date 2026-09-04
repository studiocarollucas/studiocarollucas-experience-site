import { signInWithPassword } from "./actions";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = first(params.error);
  const redirectTo = first(params.redirect) ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <form action={signInWithPassword} className="max-w-sm w-full space-y-4">
        <h1 className="font-serif text-2xl font-light text-ink">Studio OS</h1>
        {error ? (
          <p role="alert" className="border border-line px-4 py-3 font-sans text-sm">
            {error}
          </p>
        ) : null}
        <input type="hidden" name="redirect" value={redirectTo} />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="w-full border border-line px-4 py-3 font-sans text-sm text-ink"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className="w-full border border-line px-4 py-3 font-sans text-sm text-ink"
        />
        <button
          type="submit"
          className="w-full bg-ink text-white font-sans text-[10px] tracking-[0.2em] uppercase px-7 py-4"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}

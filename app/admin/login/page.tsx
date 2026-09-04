import { signInWithPassword } from "./actions";

export default function AdminLoginPage() {
  async function action(formData: FormData) {
    "use server";
    await signInWithPassword(formData);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <form action={action} className="max-w-sm w-full space-y-4">
        <h1 className="font-serif text-2xl font-light text-ink">Studio OS</h1>
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

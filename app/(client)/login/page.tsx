import { sendMagicLink } from "./actions";

export default function ClientLoginPage() {
  async function action(formData: FormData) {
    "use server";
    await sendMagicLink(formData);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream p-6">
      <form action={action} className="max-w-sm w-full space-y-4">
        <h1 className="font-serif text-2xl font-light text-ink">Minha Experiência</h1>
        <p className="text-muted text-sm">Receba um link de acesso por e-mail.</p>
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

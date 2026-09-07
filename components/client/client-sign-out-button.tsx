import { clientSignOutAction } from "@/app/(client)/minha-experiencia/sign-out";

export function ClientSignOutButton() {
  return (
    <form action={clientSignOutAction}>
      <button
        className="min-h-11 min-w-11 px-2 font-sans text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        type="submit"
      >
        Sair
      </button>
    </form>
  );
}

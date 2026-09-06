import { signOutAction } from "@/app/admin/(protected)/sign-out";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="font-sans text-[11px] uppercase tracking-[0.16em] text-muted hover:text-ink"
      >
        Sair
      </button>
    </form>
  );
}

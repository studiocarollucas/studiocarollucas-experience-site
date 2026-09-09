"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/minha-experiencia", label: "Início" },
  { href: "/minha-experiencia/checklist", label: "Checklist" },
  { href: "/minha-experiencia/ensaio", label: "Meu ensaio" },
  { href: "/minha-experiencia/styling", label: "Styling" },
  { href: "/minha-experiencia/reveal", label: "Reveal" },
] as const;

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Minha Experiência"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-cream px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:flex md:border-0 md:p-0"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/minha-experiencia"
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center px-2 text-center font-sans text-[10px] uppercase tracking-[0.12em] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              active
                ? "text-ink underline underline-offset-8"
                : "text-muted hover:text-ink focus-visible:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

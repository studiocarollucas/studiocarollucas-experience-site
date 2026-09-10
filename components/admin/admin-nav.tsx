"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/pacotes", label: "Pacotes" },
  { href: "/admin/inventario", label: "Acervo" },
  { href: "/admin/paixao-clutch", label: "Paixão Clutch" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/producao", label: "Produção" },
  { href: "/admin/configuracoes/contratante", label: "Configurações" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-2 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors",
              active ? "bg-ink text-white" : "text-muted hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

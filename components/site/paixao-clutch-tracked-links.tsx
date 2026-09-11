"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { trackPublicEvent } from "@/lib/site/analytics";

export function PaixaoClutchHomeLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/paixao-clutch"
      className={className}
      onClick={() => trackPublicEvent({ name: "paixao_clutch_home_clicked", source: "home" })}
    >
      {children}
    </Link>
  );
}

export function PaixaoClutchWhatsAppLink({ onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackPublicEvent({ name: "paixao_clutch_whatsapp_clicked", source: "paixao_clutch" });
        onClick?.(event);
      }}
    />
  );
}

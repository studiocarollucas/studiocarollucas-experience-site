"use client";

import type { ComponentProps } from "react";
import { trackPublicEvent, type ExperienceWhatsAppSource } from "@/lib/site/analytics";

type ExperienceWhatsAppLinkProps = ComponentProps<"a"> & {
  source: ExperienceWhatsAppSource;
  /** Public experience slug from the editorial catalog. Never visitor data. */
  experience?: string;
};

export function ExperienceWhatsAppLink({
  source,
  experience,
  onClick,
  ...props
}: ExperienceWhatsAppLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackPublicEvent(
          experience
            ? { name: "experience_whatsapp_clicked", source, experience }
            : { name: "experience_whatsapp_clicked", source },
        );
        onClick?.(event);
      }}
    />
  );
}

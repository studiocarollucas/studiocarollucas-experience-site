const DEFAULT_SITE_URL = "https://studiocarollucas.com.br";

/**
 * Minha Experiência routes linked from emails. All of them sit behind the
 * portal login (proxy.ts + the portal layout), so links never carry tokens.
 */
export const portalPaths = {
  home: "/minha-experiencia",
  checklist: "/minha-experiencia/checklist",
  shoot: "/minha-experiencia/ensaio",
  reveal: "/minha-experiencia/reveal",
} as const;

function siteBase(siteUrl: string | undefined): URL {
  const candidate = siteUrl?.trim();
  if (candidate) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url;
    } catch {
      // Fall through: a misconfigured env must not abort the business action.
    }
  }
  return new URL(DEFAULT_SITE_URL);
}

/** Absolute URL on the public site, read from NEXT_PUBLIC_SITE_URL at call time. */
export function absoluteSiteUrl(pathname: string, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  return new URL(pathname, siteBase(siteUrl)).toString();
}

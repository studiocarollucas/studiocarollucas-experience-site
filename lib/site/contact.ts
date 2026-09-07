export function contactUrl(experience?: string) {
  const fallback = "https://wa.me/5592984140492";
  let url: URL;
  try {
    url = new URL(process.env.NEXT_PUBLIC_STUDIO_WHATSAPP_URL || fallback);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "wa.me" ||
      !/^\/\d{10,15}$/.test(url.pathname)
    )
      url = new URL(fallback);
  } catch {
    url = new URL(fallback);
  }
  url.searchParams.set(
    "text",
    experience
      ? `Olá! Quero conhecer a experiência ${experience} do Stúdio Carol Lucas.`
      : "Olá! Quero conversar sobre uma experiência fotográfica no Stúdio Carol Lucas."
  );
  return url.toString();
}

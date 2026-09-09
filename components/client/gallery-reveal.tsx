import Link from "next/link";

type GalleryRevealData = {
  title: string;
  message: string;
  cover: {
    alt: string;
    signedUrl: string;
  };
};

export function GalleryReveal({ reveal }: { reveal: GalleryRevealData | null }) {
  if (!reveal) {
    return (
      <section aria-labelledby="gallery-reveal-title" className="mx-auto max-w-xl py-8 sm:py-12">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Minha galeria</p>
        <h1 id="gallery-reveal-title" className="mt-2 font-serif text-4xl font-light sm:text-5xl">
          Sua galeria
        </h1>
        <p className="mt-6 border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Sua galeria ficará disponível quando for publicada pelo estúdio.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="gallery-reveal-title" className="mx-auto max-w-xl py-8 sm:py-12">
      <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Minha galeria</p>
      <h1 id="gallery-reveal-title" className="mt-2 font-serif text-4xl font-light sm:text-5xl">
        {reveal.title}
      </h1>
      <p className="mt-5 font-sans text-base leading-7 text-muted">{reveal.message}</p>
      <img
        src={reveal.cover.signedUrl}
        alt={reveal.cover.alt}
        className="mt-8 aspect-[4/5] w-full object-cover"
      />
      <Link
        href="/minha-experiencia/galeria"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded border border-ink bg-ink px-5 py-3 font-sans text-sm text-cream transition-colors hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none"
      >
        Abrir minha galeria
      </Link>
    </section>
  );
}

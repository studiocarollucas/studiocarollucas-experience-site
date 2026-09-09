import { readClientGallery } from "@/domain/gallery/portal";
import { getPortalRequestContext } from "@/domain/portal/server";

export default async function ClientGalleryPage() {
  const gallery = await readClientGallery(await getPortalRequestContext());

  return (
    <section aria-labelledby="gallery-title">
      <header className="border-b border-line pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted">Galeria</p>
        <h1 id="gallery-title" className="mt-2 font-serif text-4xl font-light sm:text-5xl">
          Suas fotos
        </h1>
      </header>

      {gallery ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.assets.map((asset, index) => (
            <img
              key={asset.id}
              src={asset.signedUrl}
              alt={`Foto ${index + 1} da sua galeria`}
              className="aspect-[4/5] w-full object-cover"
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 border-l-2 border-ink py-3 pl-5 font-sans text-sm leading-6 text-muted">
          Sua galeria ficará disponível quando for publicada pelo estúdio.
        </p>
      )}
    </section>
  );
}

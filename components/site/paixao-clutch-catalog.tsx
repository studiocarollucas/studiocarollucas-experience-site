"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import type { PaixaoClutchCatalogItem } from "@/lib/site/paixao-clutch-catalog";
import p from "@/app/(site)/paixao-clutch/paixao-clutch.module.css";

export function PaixaoClutchCatalog({ clutches }: { clutches: PaixaoClutchCatalogItem[] }) {
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const colors = useMemo(() => [...new Set(clutches.map((x) => x.color).filter(Boolean))] as string[], [clutches]);
  const sizes = useMemo(() => [...new Set(clutches.map((x) => x.size).filter(Boolean))] as string[], [clutches]);
  const results = clutches.filter((x) => (!color || x.color === color) && (!size || x.size === size));
  const clear = () => { setColor(null); setSize(null); };
  return <section className={p.catalogSection} aria-label="Curadoria Paixão Clutch">
    <div className={p.filters}>
      <div role="group" aria-label="Mostrar todas as clutches"><span>Mostrar</span><button aria-pressed={!color && !size} onClick={clear}>Todas</button></div>
      {colors.length > 0 ? <div role="group" aria-label="Filtrar por cor"><span>Cor</span>{colors.map((value) => <button key={value} aria-pressed={color === value} onClick={() => setColor(value)}>{value}</button>)}</div> : null}
      {sizes.length > 0 ? <div role="group" aria-label="Filtrar por tamanho"><span>Tamanho</span>{sizes.map((value) => <button key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>)}</div> : null}
    </div>
    <p className={p.count} aria-live="polite">{results.length} {results.length === 1 ? "clutch encontrada" : "clutches encontradas"}</p>
    {results.length ? <div className={p.catalog}>{results.map((clutch) => <article key={clutch.slug}><Link href={`/paixao-clutch/${clutch.slug}`} aria-label={`Conhecer ${clutch.name}`}><div className={p.photo}><img src={clutch.publicImagePath} alt={clutch.name} /></div><div className={p.cardHeading}><h2>{clutch.name}</h2><span aria-hidden="true">↗</span></div><strong>{formatBRL(clutch.rentalPrice)}</strong><p className={p.attributes}>{[clutch.color, clutch.size].filter(Boolean).join(" · ")}</p>{clutch.description ? <p className={p.description}>{clutch.description}</p> : null}<span className={p.readMore}>Ver detalhes</span></Link></article>)}</div> : <div className={p.noResults}><p>Nenhuma clutch encontrada com esses filtros.</p><button onClick={clear}>Limpar filtros</button></div>}
  </section>;
}

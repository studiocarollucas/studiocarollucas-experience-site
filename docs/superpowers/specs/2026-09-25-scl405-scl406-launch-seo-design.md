# SCL-405/406 — CTAs WhatsApp rastreáveis e SEO de lançamento

**Data:** 2026-09-25  
**Status:** implementado, aguarda revisão

## Objetivo

Fechar as lacunas que bloqueiam o lançamento público: todo CTA de WhatsApp do site precisa levar contexto útil sem PII, usar a URL configurável por ambiente e registrar clique com origem; o site precisa de dados estruturados schema.org, verificação do Search Console, eventos de início/conclusão do quiz e um sitemap com todas as rotas públicas indexáveis.

## Estado de partida (reconciliação 2026-09-25)

- `contactUrl()`, `quizContactUrl()` e `paixaoClutchContactUrl()` já validam `NEXT_PUBLIC_STUDIO_WHATSAPP_URL` (somente `https://wa.me/<dígitos>`, com fallback).
- Eventos existentes: `quiz_lead_created`, `quiz_whatsapp_clicked`, `paixao_clutch_home_clicked`, `paixao_clutch_whatsapp_clicked`.
- Metadata por página, canonical, Open Graph, `robots.ts`, `sitemap.ts` e GA4 condicional (somente no layout público) já existem.
- Lacunas: CTAs da home, `/experiencias` e `/experiencias/[slug]` sem evento; legenda de telefone da home fixa no código; CTAs da Paixão Clutch sem contexto de coleção/item no texto; sem JSON-LD; sem verificação do Search Console; sem `quiz_started`/`quiz_completed`; sitemap sem as páginas de experiência (incluindo Família).

## SCL-405 — CTAs WhatsApp

| Origem | Link | Contexto na mensagem | Evento |
| --- | --- | --- | --- |
| Home (`#contato`) | `contactUrl()` | conversa geral sobre experiência | `experience_whatsapp_clicked` `{ source: "home" }` |
| `/experiencias` | `contactUrl()` | conversa geral sobre experiência | `experience_whatsapp_clicked` `{ source: "experiences" }` |
| `/experiencias/[slug]` (hero e fechamento) | `contactUrl(nome)` | nome público da experiência | `experience_whatsapp_clicked` `{ source: "experience_detail", experience: slug }` |
| Quiz (resultado) | `quizContactUrl()` | curadoria sem preço | `quiz_whatsapp_clicked` (inalterado) |
| Paixão Clutch vazia | `paixaoClutchContactUrl()` | coleção Paixão Clutch | `paixao_clutch_whatsapp_clicked` (inalterado) |
| Paixão Clutch item / formulário | `paixaoClutchContactUrl({ name, formattedPrice? })` | nome público do item (e preço público, quando disponível) | `paixao_clutch_whatsapp_clicked` (inalterado) |

- Novo componente cliente `ExperienceWhatsAppLink`, no mesmo padrão de `PaixaoClutchWhatsAppLink`: renderiza `<a>` e chama `trackPublicEvent` antes do `onClick` recebido.
- `trackPublicEvent` continua enviando apenas campos allow-listed: `source` e, somente quando presente, `experience` (slug público do catálogo editorial). Nome, e-mail, telefone, respostas livres, paleta, preço e URL nunca vão ao GA.
- A legenda "WhatsApp · (92) …" da home passa a ser derivada da mesma URL validada (`studioWhatsAppLabel()`), para que trocar a variável de ambiente troque link e texto juntos.
- Nenhum CTA depende do quiz.

## SCL-406 — SEO técnico + Analytics

- **JSON-LD** (recomendação do guia `01-app/02-guides/json-ld.md` do Next 16): `<script type="application/ld+json">` nativo renderizado no `page.tsx`, serializado com `JSON.stringify(...).replace(/</g, "\\u003c")`.
  - Home: `ProfessionalService` (subtipo de `LocalBusiness`) com `@id`, nome, descrição, URL, imagem pública do repositório e `telephone` derivado do WhatsApp configurado. Endereço (`PostalAddress`) e `sameAs` são opcionais e só entram quando `STUDIO_PUBLIC_*` estiver preenchido; nada de endereço, preço, horário ou avaliação inventados.
  - `/experiencias/[slug]`: `Service` com nome, descrição, URL, imagem e `provider` apontando para o `@id` do estúdio. Sem `offers`/preço.
- **Search Console:** `metadata.verification.google` no layout raiz, alimentado por `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` e omitido quando vazio.
- **Quiz:** `quiz_started` na primeira escolha de cada rodada; `quiz_completed` quando a recomendação é recebida com sucesso. Ambos só com `source: "quiz"`. `quiz_lead_created` continua separado (SCL-404).
- **Sitemap:** inclui `/`, `/experiencias`, todas as `/experiencias/<slug>` (incluindo `familia`), `/paixao-clutch` e os itens públicos da Paixão Clutch. `/quiz` continua fora (noindex).

## Fora de escopo

- Migrations, novas dependências, tags de terceiros além do GA4 já existente.
- Evento com dados do item da Paixão Clutch (decisão anterior mantida: sem item/preço no GA).
- CTA de WhatsApp do portal Minha Experiência (área privada, fora do site público).

## Verificação

- Vitest: payload de analytics, componentes rastreados, páginas (home, catálogo, detalhe), fluxo do quiz, JSON-LD (escape de `<`, campos opcionais omitidos), verificação e sitemap.
- CI: lint, `check:admin-auth`, typecheck, testes e build.

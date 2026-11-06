# Checklist de cobertura — Stúdio Carol Lucas MVP

**Referência:** PRD v1.1 + TASKS v2.0 · reconciliado em 07/10/2026 com `main` e SCL-555 integrada (`56e6607`)

## Já implementado

- Infra, Supabase, Auth/RLS, CI, observabilidade
- Core Client/Lead/Package/Shoot/Payment/Expense/Preparation/Production/Audit
- Studio OS: dashboard, clientes, agenda, financeiro, produção, preparação
- Minha Experiência: auth, home, checklist, meu ensaio, styling colaborativo
- Site: home, experiências, cinco páginas verticais (Família com assets temporários), quiz
- Contratos PDF privados + contratante configurável (SCL-310)
- [x] UI/funil de Leads + conversão Lead → Client → Shoot (SCL-250–254)
- [x] Persistência consentida do Quiz (SCL-404)
- [x] Gallery: schema, assets privados, publicação no Admin, Reveal no portal (SCL-500–503)
- [x] Acervo físico: InventoryItem, mídia, CRUD/importação XLSX, reservas com conflito (SCL-550–553)
- [x] Paixão Clutch: curadoria Admin, mídia pública, vitrine/catálogo e pedido público de locação (SCL-556–557)
- [x] WhatsApp contextual e eventos de clique (SCL-405)
- [x] SEO, JSON-LD, verificação Search Console e eventos do quiz (SCL-406; ativação depende da configuração)
- [x] Galeria: favoritos, downloads autorizados, catálogo/pedido de upsell e recebimentos no financeiro (SCL-504–507; PR #9 integrado)
- [x] Seleção de peças do acervo pela cliente (SCL-554)
- [x] Infra e fluxos Resend: boas-vindas, D-7/D-1, Reveal, review, delivery log/retry/idempotência (SCL-700–705)
- [x] Reviews e indicação com tracking de conversão (SCL-720–722)

## Integração de código

- [x] SCL-555 integrada em `main` (`56e6607`): inspiração ligada a preferência/reserva ativa do mesmo ensaio, edição staff no Admin e indicador no portal. Migration `0053` incluída; aplicação no banco permanece pendente.

## Falta para lançamento validado

- [x] Migrations `0048`–`0053` aplicadas em produção em 06/11/2026; audit confirma 54/54 e `pending: []`. Eram seis, não cinco: o audit filtrava `idx >= 49` e escondia a `0048_public_clutch_rental_reservations` (colunas de locação avulsa do SCL-557). Filtro corrigido para comparar o journal inteiro.
- [x] Objetos conferidos por leitura: RLS ligada e nenhum `select` para `anon` em `automation_events`, `notification_deliveries`, `photo_selections`, `reviews`, `referrals`, `upsell_*`, `gallery_upsell_offers`; triggers `clients_referrer_client_id_frozen`, `referrals_guard_graph`, `reviews_shoot_matches_client`, `styling_references_inventory_link_guard`; policy `payments_client_read` recriada; `inventory_reservations.shoot_id` nullable; `payments.upsell_order_id` presente; nenhum grant de `inventory_item_id` para `anon`/`authenticated`.
- [x] RLS e contratos validados no banco migrado em 06/11/2026: `RUN_LIVE_DB_TESTS=true` com `--testTimeout=30000`, **842 de 843 aprovados**. A única falha era guard obsoleto da `styling-rls` (`column_count` 7→8 e FK nova da `0053`), corrigido. As 6 falhas da primeira tentativa eram timeout de 5 s contra banco remoto, não defeito. Os fixtures `@example.com` foram limpos pelos próprios testes; sobrou 1 evento + 1 entrega `boas-vindas` em `pending` apontando para ensaio já removido (o outbox não cascateia), removidos à mão.
- [ ] Exercitar os fluxos pelo app rodando (`npm run dev`) como staff e como cliente: preferência/reserva/styling, favoritos/downloads, upsell/pagamentos, reviews/indicações. Os testes live cobrem policies e contratos de schema, não a jornada na interface.
- [x] Agendamento do cron decidido: cron-job.org gratuito, três jobs em UTC. Ver `DECISIONS.md` e `runbooks/email-automation.md` seção 3. Falta criar os jobs e gerar o `CRON_SECRET`.
- [x] **Defeito de SEO corrigido e verificado no ar em 06/11/2026.** `canonical`, `og:url`, a linha `Sitemap:` do `robots.txt` e todas as `<loc>` do `sitemap.xml` serviam `https://studiocarollucas-experience-site.vercel.app`, domínio que responde 200 publicamente (está listado como Production em Domains, ao lado de `www.studiocarollucas.com.br`). `NEXT_PUBLIC_SITE_URL` estava **preenchida com esse valor** — não vazia, então o fallback do SCL-406 (`6b40bb5`) não cobria. A var era do tipo **Secret**, o que é errado para `NEXT_PUBLIC_*` (vai compilada no bundle do cliente) e travava a edição atrás de código por e-mail; foi apagada e recriada como **Config** com `https://www.studiocarollucas.com.br`, escopo Production and Preview. **Verificado no ar em 06/11/2026** (redeploy feito pelo dono; a tentativa automatizada foi bloqueada pelo classificador de permissões): `canonical` e `og:url` da home e das páginas internas, a linha `Sitemap:` do `robots.txt` e as 10 `<loc>` do `sitemap.xml` servem `https://www.studiocarollucas.com.br`, com **zero** ocorrências de `vercel.app`. O domínio `.vercel.app` continua como Production, mas agora **se autocanonicaliza para o domínio real**, então o Google consolida no lugar certo sem precisar removê-lo.
- [x] `RUN_LIVE_DB_TESTS` removida da Vercel (estava em Production and Preview). Essa flag só arma a suíte de testes live e não tem motivo para existir no ambiente de deploy.
- [ ] **Preview compartilha o banco de PRODUÇÃO.** Todas as vars restantes estão como "Production and Preview", incluindo `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — ou seja, cada deploy de preview lê e escreve no Supabase real. `runbooks/deploy.md` diz o contrário: "Preview deve apontar para um projeto Supabase de desenvolvimento, nunca para o de produção". Decisão pendente: criar um projeto Supabase de dev e apontar o Preview para ele, ou restringir as vars de banco a Production (o que quebra previews que acessam dados).
- [x] **GA4 e Search Console configurados em 06/11/2026.** Search Console não tinha **nenhuma** propriedade: criada `https://www.studiocarollucas.com.br` como **prefixo de URL** (a de domínio exigiria TXT no DNS da Hostinger). Verificação pelo método *HTML tag* — `lib/site/search-console.ts` alimenta `verification.google` do Next.js e espera **só o token**, não a tag inteira, então o botão COPY do Google serve o valor errado. GA4 já tinha a propriedade "Studio Carol Lucas" e o fluxo web do domínio certo, mas com "No data received in past 48 hours", porque a env var nunca existiu; measurement id `G-0YX9SRS1Y7`.
  Cadastradas na Vercel como tipo **Config** e escopo **Production apenas**: `NEXT_PUBLIC_GA_MEASUREMENT_ID` e `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Production-only de propósito — em Preview o GA mandaria tráfego de deploy interno para a mesma propriedade. Sem as vars nada quebra: `GoogleAnalytics` retorna `null` e `siteVerification()` retorna `undefined`; o GA só é montado em `app/(site)/layout.tsx`, então admin e portal não são rastreados.
  Verificado no ar: `gtag` com `id=G-0YX9SRS1Y7`, `meta google-site-verification` presente, canonical intacto e **0** ocorrências de GA em `/minha-experiencia`. Search Console **Ownership verified** (HTML tag) e `sitemap.xml` submetido.
- [ ] **GA4 não coletava: bug de código corrigido em 06/11/2026, falta deploy.** `window.gtag` empilhava um array em vez do objeto `arguments`, e o `gtag.js` descarta isso sem erro — script carregava, nenhum `collect` era criado. Atingia também todos os eventos de SCL-405/406 via `trackPublicEvent()`. Corrigido em `components/site/google-analytics.tsx` e `lib/site/analytics.ts` (tipo passa a `IArguments[]`), com teste de forma. Ver `DECISIONS.md`. **Depende de commit/push/deploy** e, depois, de confirmar no Realtime do GA4 a partir de um aparelho sem bloqueador — neste browser os `collect` voltam 503.
- [ ] Vars ainda **ausentes** da Vercel: `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_DELIVERY_ENABLED`, `CRON_SECRET`, `STUDIO_GOOGLE_REVIEW_URL`, `NEXT_PUBLIC_STUDIO_WHATSAPP_URL` (tem fallback em `lib/site/contact.ts`, por isso o número aparece no site), `STUDIO_CONTRACTOR_NAME`, `STUDIO_CONTRACTOR_CPF`, `STUDIO_PUBLIC_STREET_ADDRESS`, `INVENTORY_IMPORT_TOKEN_SECRET`. `RESEND_API_KEY` **está** presente, mas sem `EMAIL_FROM` e `EMAIL_DELIVERY_ENABLED` nada é enviado.
- [x] Contas identificadas: Vercel `studiocarollucas-9883` (plano **Hobby**, confirmado — a decisão do cron-job.org se sustenta), projeto `studiocarollucas-experience-site`; Supabase org "Studio Carol Lucas", projeto `site` em `us-west-2`, **plano Free — sem backup automático**, 0 usuários ativos. cron-job.org logado e com **0 jobs** criados.
- [ ] Validar entrega de e-mails no ambiente apropriado e somente então ativar os disparos de produção.
- [x] Vulnerabilidades: 27 → 17, nenhuma crítica. `next` 16.3.4 → 16.4.5 (RCE na otimização de imagem), `@sentry/nextjs` 10.78.0, `zod` 4.6.7, `vite` 8.3.6, `undici` 7.30.2. As 17 restantes são cadeia de build/dev. `npm audit fix --force` é proibido aqui: ele propõe downgrades (`drizzle-kit@0.18.1`, `eslint-config-next@15.5.29`). Ver `DECISIONS.md`.
- [ ] Assets definitivos da vertical Família (SCL-402) — depende de receber as fotos definitivas; hoje são dois WebP temporários em `public/images/site/home/familia-*`.

Auditoria repetível e sem escrita: `npm run check:launch-readiness`. O comando mostra apenas presença de configuração e hashes aplicados, sem valores de segredos.

## Pós-MVP

- [ ] Timeline enriquecida (SCL-306)
- [ ] Aluguel avulso Paixão Clutch completo — pagamento/cancelamento/notificações (SCL-558; pedido público já existe)
- [ ] Recorrência CRM (SCL-723)
- [ ] Virtual Try-On (SCL-800)
- [ ] Assistente/agente (SCL-810/811)
- [ ] Fidelidade (SCL-820)

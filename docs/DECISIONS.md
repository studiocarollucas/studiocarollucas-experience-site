# Decisões de arquitetura — Stúdio Carol Lucas Experience + Studio OS

Registrar aqui decisões que afetam múltiplos agentes/módulos (PRD §19.15). Formato: data, decisão, motivo, alternativas consideradas.

## 2026-09-03 — Estrutura do repositório

**Decisão:** monólito Next.js único (App Router) com route groups `(site)`, `(client)`, `admin`, compartilhando o mesmo backend Supabase/Drizzle. Sem microserviços no MVP.

**Motivo:** PRD §4 exige que os três ambientes usem a mesma fonte de verdade; PRD §11 recomenda evitar microserviços no MVP.

## 2026-09-03 — Design tokens

**Decisão:** tokens de cor/tipografia do site público e do admin partem dos valores já validados no protótipo V2.3 (`--rose`, `--rose2`, `--rose3`, `--blush`, `--champ`, `--taupe`, `--taupe2`, `--cream`, `--ink`, `--muted`, `--line`), fontes Cormorant Garamond (serif/títulos) + Jost (sans/corpo e UI).

**Motivo:** PRD §5.1 pede design editorial premium baseado no protótipo aprovado; reaproveitar os tokens evita divergir do visual já validado com o negócio.

## 2026-09-03 — Auth provider

**Decisão:** Supabase Auth para todos os ambientes. Cliente usa magic link (passwordless); staff/admin usa e-mail+senha, com arquitetura preparada para MFA.

**Motivo:** PRD §10.4; evita implementar e manter um sistema de auth próprio no MVP.

## 2026-09-03 — Tailwind v4 com configuração CSS-first (`@theme`)

**Decisão:** os design tokens vivem em `app/globals.css` — um bloco `:root` com as variáveis do protótipo V2.3 e um bloco `@theme` que as expõe como utilitários (`--color-ink`, `--font-serif`, `--shadow-soft`, ...). Não existe `tailwind.config.ts` no repositório.

**Motivo:** a versão do Next.js usada no scaffold (16.x) instala Tailwind v4 por padrão, e a v4 lê a configuração de tema do próprio CSS via `@theme` em vez de um arquivo JS/TS. Manter um `tailwind.config.ts` seria configuração morta. O plano P0 previa esse caminho alternativo (Task 3, Step 3).

## 2026-09-03 — `middleware.ts` → `proxy.ts` (Next.js 16)

**Decisão:** o middleware de refresh de sessão + proteção de rotas fica em `proxy.ts` na raiz, exportando `proxy(request)` e o mesmo objeto `config.matcher`.

**Motivo:** o Next.js 16 renomeou a convenção de arquivo `middleware.ts` para `proxy.ts` (mesma API, mesmo runtime); `middleware.ts` está depreciado e emite aviso no build.

## 2026-09-03 — Camada de acesso a dados: Drizzle ORM + postgres.js

**Decisão:** todo acesso a dados da aplicação passa por `db/client.ts`, que conecta via `DATABASE_URL` usando `postgres.js` + `drizzle-orm/postgres-js`. O schema vive em `db/schema/<tabela>.ts`, reexportado por `db/schema/index.ts`. A conexão é aberta com `postgres(connectionString, { prepare: false, max: 1 })`.

**Motivo:** PRD §10.3. `prepare: false` é obrigatório porque o `DATABASE_URL` documentado é o pooler do Supabase em modo **Transaction** (pgbouncer não suporta prepared statements, o padrão do `postgres.js`); `max: 1` mantém a contagem de conexões compatível com o runtime serverless do Vercel. Ver `docs/runbooks/supabase-setup.md`.

## 2026-09-03 — Migrations SQL escritas à mão + entrada manual no `meta/_journal.json`

**Decisão:** RLS, funções e triggers não são expressáveis no DSL de schema do Drizzle, então vivem em arquivos `.sql` escritos à mão em `db/migrations/` (`0001_profiles_rls.sql`, `0002_handle_new_user_trigger.sql`). Cada um exige uma entrada adicionada manualmente em `db/migrations/meta/_journal.json` (`idx` sequencial, `tag` igual ao nome do arquivo sem extensão, `breakpoints: true`), e os statements são separados por `--> statement-breakpoint`, a mesma convenção que o drizzle-kit gera.

**Motivo:** o `drizzle-kit generate` só emite DDL derivado do schema TypeScript e não registra arquivos que ele não criou; sem a entrada no journal, `drizzle-kit migrate` simplesmente ignora o arquivo. Os scripts `db:generate`/`db:migrate` rodam via `node --env-file-if-exists=.env.local node_modules/drizzle-kit/bin.cjs ...` porque o drizzle-kit só carrega `.env` automaticamente, não o `.env.local` da convenção Next.js.

## 2026-09-03 — Sentry: init condicional ao DSN e convenção `instrumentation*`

**Decisão:** os três runtimes inicializam o Sentry com `enabled: !!dsn`. Os arquivos de init seguem a convenção do Next 16 + Turbopack: `instrumentation.ts` na raiz (com `register()` importando `sentry.server.config.ts` ou `sentry.edge.config.ts` conforme `process.env.NEXT_RUNTIME`, e `export const onRequestError = Sentry.captureRequestError`) e `instrumentation-client.ts` (com `export const onRouterTransitionStart`) no lugar do antigo `sentry.client.config.ts`. `app/global-error.tsx` reporta erros de render não capturados.

**Motivo:** `enabled: !!dsn` permite rodar desenvolvimento local e CI sem um projeto Sentry real, sem erro e sem eventos espúrios. A convenção `instrumentation*` é obrigatória a partir do Next 16: `sentry.server.config.ts`/`sentry.edge.config.ts` não são carregados por nada sozinhos, e `sentry.client.config.ts` está formalmente depreciado sob Turbopack (o bundler padrão do Next 16 em dev e build) — com os arquivos antigos, o Sentry ficava inerte nos três runtimes.

## 2026-09-03 — RLS como defesa em profundidade; RBAC na aplicação como fronteira autoritativa

**Decisão:** a fronteira de autorização **autoritativa** desta aplicação é a camada de aplicação — `hasMinimumRole`/`requireRole` de `lib/auth/rbac.ts`, chamados a partir de Server Components, Server Actions e Route Handlers (o exemplo canônico é `app/admin/(protected)/layout.tsx`, que exige `role >= staff` para toda página de admin). As policies de RLS no Postgres são uma **camada adicional de defesa em profundidade**, não o mecanismo principal.

**Motivo:** todas as queries da aplicação passam por `db/client.ts`, que conecta com `DATABASE_URL` — o papel `postgres`, dono das tabelas, que por padrão **ignora** RLS (nada aqui usa `FORCE ROW LEVEL SECURITY`). Além disso, `auth.uid()` lê um GUC que o PostgREST define por requisição; numa conexão Drizzle crua ele é sempre `NULL`. Ou seja: as policies de `0001_profiles_rls.sql` não filtram nada no caminho que a aplicação de fato usa. A alternativa — rotear toda leitura por uma conexão por requisição com o JWT do usuário — traz complexidade e custo de conexões que não se justificam no MVP. As policies continuam valendo, e valendo a pena, para: acesso direto ao banco (SQL Editor, ferramentas de terceiros, chaves vazadas) e para qualquer uso futuro da Data API do Supabase / de um `supabase-js` no browser (`lib/supabase/client.ts` já existe, ainda sem tocar em `profiles`).

**Consequência para o Epic 1:** as tabelas futuras (Client, Shoot, Payment, ExperiencePackage, ...) devem seguir o mesmo padrão — policies de RLS como backstop (copiando o formato de `0001_profiles_rls.sql`, inclusive o helper `public.is_admin()` com `security definer` para evitar recursão de policy), e checagem explícita de papel via `lib/auth/rbac.ts` em **toda** rota/action que toque nesses dados. Nenhuma tabela nova pode depender apenas da RLS para autorização.

Onde uma coluna sensível precisar ficar protegida mesmo de quem só tem acesso de linha (RLS é por linha, não por coluna), o padrão é `revoke update on table "<tabela>" from "authenticated", "anon"` seguido de `grant update (<colunas seguras>) on table "<tabela>" to "authenticated"` — nunca só `revoke update (<coluna sensível>)`, que é um no-op quando a role já tem o grant de tabela (como é o caso das roles padrão do Supabase; ver `0001_profiles_rls.sql` para o exemplo comentado).

**Efeito colateral a lembrar:** como o Supabase mapeia todo usuário autenticado para a mesma role `authenticated` do Postgres, esse revoke bloqueia `UPDATE` de colunas restritas (como `role`) para **qualquer** sessão autenticada via Data API/`supabase-js` no browser — inclusive admins. Uma futura tela de "gerenciar papéis da equipe" que tente fazer isso direto do browser vai receber um erro de permissão que parece problema de RLS e não é. Mudanças de `role` (e equivalentes em outras tabelas) devem passar pela camada de aplicação (Drizzle via `DATABASE_URL`, que usa a role `postgres` e não sofre esse revoke) ou por uma function `security definer` dedicada — nunca por um update direto do cliente.

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

**Aviso de divergência (2026-09-05, achado da revisão final do Epic 1):** por causa dessa decisão, o banco real hoje tem coisas que **nenhum** `db/schema/*.ts` nem `meta/*_snapshot.json` conhece: todas as 11 foreign keys entre tabelas do Epic 1 (só `clients_auth_user_id_unique` e `production_jobs_shoot_id_unique` estão declaradas em TS via `.unique()`), 13 índices além das primary keys, 2 CHECK constraints (`payments`/`expenses`, valor não-negativo), e os `ON DELETE` de cada FK. Isso é intencional, mas cria um risco concreto de colisão de nomes: `drizzle-kit` gera nomes de constraint previsíveis (`<tabela>_<coluna>_unique`, `<tabela>_<coluna>_<tabela_ref>_id_fk`, etc.) — se uma task futura adicionar `.unique()`/`.references()`/`index()` num schema TS cujo nome gerado colida com uma constraint já existente à mão (ex.: `experience_packages_name_unique`, já criada à mão na migration `0022`), `db:generate` vai emitir um `ADD CONSTRAINT` que falha porque o objeto já existe — ou, pior, se o nome NÃO colidir, cria uma constraint duplicada equivalente. **Antes de declarar `.unique()`/`.references()`/`index()` em qualquer coluna do Epic 1 em uma task futura, verificar primeiro se já existe uma constraint/índice equivalente escrito à mão** (`db/migrations/00*_*.sql`) e, se existir, ou reaproveitar o nome exato já usado, ou remover a versão hand-written na mesma migration que introduz a versão TS. Nunca usar `drizzle-kit push` neste projeto — ele reconciliaria o banco só a partir do schema TS e apagaria silenciosamente tudo isso.

## 2026-09-03 — Sentry: init condicional ao DSN e convenção `instrumentation*`

**Decisão:** os três runtimes inicializam o Sentry com `enabled: !!dsn`. Os arquivos de init seguem a convenção do Next 16 + Turbopack: `instrumentation.ts` na raiz (com `register()` importando `sentry.server.config.ts` ou `sentry.edge.config.ts` conforme `process.env.NEXT_RUNTIME`, e `export const onRequestError = Sentry.captureRequestError`) e `instrumentation-client.ts` (com `export const onRouterTransitionStart`) no lugar do antigo `sentry.client.config.ts`. `app/global-error.tsx` reporta erros de render não capturados.

**Motivo:** `enabled: !!dsn` permite rodar desenvolvimento local e CI sem um projeto Sentry real, sem erro e sem eventos espúrios. A convenção `instrumentation*` é obrigatória a partir do Next 16: `sentry.server.config.ts`/`sentry.edge.config.ts` não são carregados por nada sozinhos, e `sentry.client.config.ts` está formalmente depreciado sob Turbopack (o bundler padrão do Next 16 em dev e build) — com os arquivos antigos, o Sentry ficava inerte nos três runtimes.

## 2026-09-03 — RLS como defesa em profundidade; RBAC na aplicação como fronteira autoritativa

**Decisão:** a fronteira de autorização **autoritativa** desta aplicação é a camada de aplicação — `hasMinimumRole`/`requireRole` de `lib/auth/rbac.ts`, chamados a partir de Server Components, Server Actions e Route Handlers (o exemplo canônico é `app/admin/(protected)/layout.tsx`, que exige `role >= staff` para toda página de admin). As policies de RLS no Postgres são uma **camada adicional de defesa em profundidade**, não o mecanismo principal.

**Motivo:** todas as queries da aplicação passam por `db/client.ts`, que conecta com `DATABASE_URL` — o papel `postgres`, dono das tabelas, que por padrão **ignora** RLS (nada aqui usa `FORCE ROW LEVEL SECURITY`). Além disso, `auth.uid()` lê um GUC que o PostgREST define por requisição; numa conexão Drizzle crua ele é sempre `NULL`. Ou seja: as policies de `0001_profiles_rls.sql` não filtram nada no caminho que a aplicação de fato usa. A alternativa — rotear toda leitura por uma conexão por requisição com o JWT do usuário — traz complexidade e custo de conexões que não se justificam no MVP. As policies continuam valendo, e valendo a pena, para: acesso direto ao banco (SQL Editor, ferramentas de terceiros, chaves vazadas) e para qualquer uso futuro da Data API do Supabase / de um `supabase-js` no browser (`lib/supabase/client.ts` já existe, ainda sem tocar em `profiles`).

**Consequência para o Epic 1:** as tabelas futuras (Client, Shoot, Payment, ExperiencePackage, ...) devem seguir o mesmo padrão — policies de RLS como backstop (copiando o formato de `0001_profiles_rls.sql`, inclusive o helper `public.is_admin()` com `security definer` para evitar recursão de policy), e checagem explícita de papel via `lib/auth/rbac.ts` em **toda** rota/action que toque nesses dados. Nenhuma tabela nova pode depender apenas da RLS para autorização.

Onde uma coluna sensível precisar ficar protegida mesmo de quem só tem acesso de linha (RLS é por linha, não por coluna), o padrão é `revoke update on table "<tabela>" from "authenticated", "anon"` seguido de `grant update (<colunas seguras>) on table "<tabela>" to "authenticated"` — nunca só `revoke update (<coluna sensível>)`, que é um no-op quando a role já tem o grant de tabela (foi exatamente o caso de `profiles`; ver `0001_profiles_rls.sql` para o exemplo comentado).

**Efeito colateral a lembrar:** como o Supabase mapeia todo usuário autenticado para a mesma role `authenticated` do Postgres, esse revoke bloqueia `UPDATE` de colunas restritas (como `role`) para **qualquer** sessão autenticada via Data API/`supabase-js` no browser — inclusive admins. Uma futura tela de "gerenciar papéis da equipe" que tente fazer isso direto do browser vai receber um erro de permissão que parece problema de RLS e não é. Mudanças de `role` (e equivalentes em outras tabelas) devem passar pela camada de aplicação (Drizzle via `DATABASE_URL`, que usa a role `postgres` e não sofre esse revoke) ou por uma function `security definer` dedicada — nunca por um update direto do cliente.

**Correção (2026-09-04, achado da SCL-107):** o parágrafo acima presumia que "as roles padrão do Supabase" sempre chegam com grant de tabela para `anon`/`authenticated` — isso **não é verdade de forma geral neste projeto**. `profiles` (a primeira tabela, criada antes/durante a configuração inicial do projeto) tem esse grant, o que é exatamente por que o revoke de coluna nela foi um no-op (daí a lição acima). Mas a verificação ao vivo feita na SCL-107 (`information_schema.role_table_grants`) mostrou que **nenhuma** das 8 tabelas do Epic 1 (`experience_packages`, `clients`, `leads`, `shoots`, `payments`, `expenses`, `preparation_tasks`, `production_jobs`) tem qualquer grant básico (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) para `anon`/`authenticated` — só `REFERENCES`/`TRIGGER`/`TRUNCATE`, e `audit_log` (SCL-107) idem. Não investigamos a causa exata (provavelmente a opção "Automatically expose new tables", desmarcada na criação deste projeto, afeta tabelas criadas depois do bootstrap inicial de forma diferente de `profiles`), mas a conclusão prática é: **nunca assumir que uma tabela nova tem grant básico — verificar por query antes de depender disso**, e lembrar que isso significa que RLS-como-defesa-em-profundidade está **hoje inerte para toda tabela do Epic 1** no caminho da Data API/`supabase-js` (não só na conexão Drizzle, que já era sabido) — não é um problema agora porque nada usa esse caminho, mas quem for o primeiro a ligar a Data API/`supabase-js` a alguma dessas tabelas vai precisar adicionar `grant select ...` (e o que mais for necessário) explicitamente, além das policies de RLS que já existem.

## 2026-09-04 — FK auto-referencial via statement hand-written, não `.references()` do Drizzle

**Decisão:** `clients.referrer_client_id` (indicação de uma cliente por outra, PRD §7.2) é declarado no schema Drizzle (`db/schema/clients.ts`) como uma coluna `uuid` simples, sem `.references()`. A constraint `foreign key ("referrer_client_id") references "clients"("id")` é adicionada como um segundo statement, `--> statement-breakpoint`, escrito à mão logo após o `CREATE TABLE "clients"` gerado por `drizzle-kit generate`, no mesmo arquivo de migration.

**Motivo:** Drizzle consegue expressar FKs auto-referenciais via `.references(() => clients.id)`, mas isso exige que a tabela já exista antes de sua própria constraint — uma ordem de statements que vale a pena verificar manualmente contra um projeto ao vivo em vez de confiar cegamente na geração do drizzle-kit para esse caso específico. Confirmado por query direta (`pg_constraint`) que a constraint `clients_referrer_client_id_fkey` existe e aponta `clients(id)` corretamente.

**Consequência:** qualquer tabela futura deste plano que precise de uma FK auto-referencial (ex.: hierarquia entre tabelas) deve seguir o mesmo padrão — coluna sem `.references()` no schema TypeScript, constraint adicionada à mão no mesmo arquivo de migration gerado.

## 2026-09-04 — `test` carrega `.env.local` explicitamente (mesmo gap do drizzle-kit)

**Decisão:** o script `test` em `package.json` roda como `node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run`, em vez de `vitest run` puro.

**Motivo:** Vitest, assim como o drizzle-kit (ver decisão de 2026-09-03 acima), não carrega `.env.local` automaticamente — só o Next.js faz isso por convenção própria. Um teste de integração que abre conexão real com o Postgres via `db/client.ts` (`tests/domain/clients.test.ts`, SCL-100) falhava com `ECONNREFUSED ::1:5432`/`127.0.0.1:5432` porque `process.env.DATABASE_URL` chegava `undefined` ao `postgres.js`, que cai para o host/porta padrão local. Mesma classe de bug já vista duas vezes neste projeto (drizzle-kit em SCL-005, timestamps de journal em SCL-102) — nenhuma ferramenta de linha de comando do Node carrega `.env.local` sozinha; cada script que precisa de env reais do Supabase tem que pedir isso explicitamente via `--env-file-if-exists`.

## 2026-09-04 — `z.input`, não `z.infer`, para o tipo de input de schemas com `.default()`

**Decisão:** `domain/clients/schema.ts` exporta `CreateClientInput` como `z.input<typeof createClientSchema>`, não `z.infer<typeof createClientSchema>` (que é um alias de `z.output`).

**Motivo:** `createClientSchema.marketingConsent` usa `.default(false)`. `z.infer`/`z.output` descreve o formato **depois** do parse, onde esse campo já foi preenchido e portanto é obrigatório no tipo — o que faria `createClient({ name: "..." })` (uso pretendido, e exatamente o que o teste de integração de SCL-100 faz) falhar em `npm run typecheck` mesmo passando em runtime, já que `.parse()` de fato aceita a omissão. `z.input` descreve o formato **antes** do parse, onde um campo com `.default()` é opcional — batendo com o comportamento real do Zod.

**Consequência:** qualquer schema futuro deste plano que use `.default()` em algum campo deve exportar seu tipo de input com `z.input`, não `z.infer`, para evitar essa mesma divergência entre o que o TypeScript exige e o que o Zod realmente aceita.

## 2026-09-04 — Testes de integração contra o banco real são opt-in (skip automático sem `DATABASE_URL`)

**Decisão:** `tests/domain/clients.test.ts` (primeiro arquivo de teste do repositório a importar `@/db/client` e abrir uma conexão real) usa `describeIfLiveDb = process.env.DATABASE_URL ? describe : describe.skip` para envolver o `describe` do teste de integração `createClient / getClientById`. Sem `DATABASE_URL` no ambiente, esse bloco inteiro é pulado (`skipped`), não falha.

**Motivo:** `.github/workflows/ci.yml` roda `npm run test` sem nenhum `DATABASE_URL` (diferente do passo `build`, que define um placeholder), e `.env.local` nunca é commitado — não há como esse teste alcançar um banco real em CI hoje. Sem esse guard, o teste falharia com erro de conexão (`ECONNREFUSED`) todo run de CI assim que a SCL-003 conectar este repositório a um remoto GitHub real, bloqueando `IN_REVIEW → MERGE_READY` de toda task subsequente. Os 5 testes Zod (`createClientSchema`, que não tocam o banco) continuam rodando incondicionalmente.

**Consequência:** enquanto este projeto não tiver um banco de CI/teste dedicado (decisão maior, de infraestrutura, fora do escopo desta task), qualquer teste futuro que precise de uma conexão real com o Postgres deve seguir o mesmo padrão — `describe.skip` condicional a uma variável de opt-in, nunca assumir que a variável está presente em CI só porque está presente em `.env.local` local.

**Correção (2026-09-04, revisão final do Epic 1): o guard passa a ser `RUN_LIVE_DB_TESTS`, não `DATABASE_URL`.** Condicionar a `DATABASE_URL` resolvia o problema de CI, mas criava outro, pior, no ambiente local: `DATABASE_URL` é necessária para *qualquer* trabalho local normal (`npm run dev`, `npm run db:migrate`), então tê-la no `.env.local` — o que todo mundo que mexe neste repositório tem — armava silenciosamente testes que **escrevem e apagam** linhas em qualquer banco que ela apontasse. Hoje isso é o único projeto Supabase real que este código tem. Um `npm run test` de rotina, sem nenhum opt-in consciente, escrevia em produção.

O guard passa a exigir uma segunda variável, dedicada e explícita:

```ts
const describeIfLiveDb = process.env.RUN_LIVE_DB_TESTS === "true" ? describe : describe.skip;
```

Comparação com a string literal `"true"` (não `!!process.env.RUN_LIVE_DB_TESTS`), para que um `RUN_LIVE_DB_TESTS=` vazio — exatamente como o `.env.example` a documenta — continue desarmado. `DATABASE_URL` continua sendo necessária para os testes rodarem, mas deixou de ser suficiente: as duas precisam estar presentes. Vale para `tests/domain/clients.test.ts`, `tests/domain/audit.test.ts` e `tests/domain/shoots.test.ts`.

**Consequência:** todo teste futuro que abra conexão real com o Postgres usa `RUN_LIVE_DB_TESTS === "true"` como guard, e documenta a variável no `.env.example`. Rodar a suíte com ela ligada é uma decisão consciente, tomada contra um projeto de dev/staging — nunca um efeito colateral de ter o ambiente de desenvolvimento configurado.

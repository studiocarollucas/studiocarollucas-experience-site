# TASKS — Stúdio Carol Lucas Experience + Studio OS

> Fonte de verdade operacional para desenvolvimento paralelo.
> Atualizar antes e depois de cada execução relevante.

## Status permitidos

`BACKLOG` · `READY` · `CLAIMED` · `IN_PROGRESS` · `BLOCKED` · `IN_REVIEW` · `CHANGES_REQUESTED` · `MERGE_READY` · `DONE` · `DEFERRED` · `CANCELLED`

## Regras rápidas

1. Nenhum agente inicia sem Task ID.
2. Antes de editar: `READY → CLAIMED`, preencher Owner, Branch e Files/Scope.
3. Ao começar a alterar código: `CLAIMED → IN_PROGRESS`.
4. Se houver overlap com outra task ativa, coordenar antes de editar.
5. Migrations são serializadas.
6. Ao abrir PR: `IN_REVIEW`.
7. CI + review aprovados: `MERGE_READY`.
8. Só depois do merge: `DONE`.
9. Toda interrupção deve deixar Hand-off notes atualizadas.

---

## Quadro resumido

| ID | Tarefa | Prioridade | Área | Status | Owner | Depends on |
|---|---|---:|---|---|---|---|
| SCL-001 | Inicializar repositório | P0 | infra | DONE | agent:claude-code | none |
| SCL-002 | Lint/format/typecheck/tests | P0 | infra | DONE | agent:claude-code | SCL-001 |
| SCL-003 | CI + preview deploys | P0 | infra | BLOCKED | agent:claude-code | SCL-001,SCL-002 |
| SCL-004 | Projeto Supabase + ambientes | P0 | db | DONE | agent:claude-code + human:Hudson | none |
| SCL-005 | Drizzle + migrations | P0 | db | DONE | agent:claude-code | SCL-001,SCL-004 |
| SCL-006 | Auth base | P0 | auth | DONE | agent:claude-code + human:Hudson | SCL-004,SCL-005 |
| SCL-007 | RBAC/RLS base | P0 | auth | DONE | agent:claude-code | SCL-006 |
| SCL-008 | Observabilidade (Sentry + logging) | P0 | infra | DONE | agent:claude-code | SCL-001 |
| SCL-009 | Design tokens + layout base | P0 | ui | DONE | agent:claude-code | SCL-001 |
| SCL-100 | Schema Client | P0 | db | DONE | agent:claude-code | SCL-005 |
| SCL-102 | Schema ExperiencePackage | P0 | db | DONE | agent:claude-code | SCL-005 |
| SCL-108 | Seeds de experiências | P0 | db | DONE | agent:claude-code | SCL-102 |
| SCL-103 | Schema Shoot | P0 | db | BACKLOG | unassigned | SCL-100,SCL-102 |
| SCL-104 | Schema Payment/Expense | P0 | db | BACKLOG | unassigned | SCL-103 |
| SCL-106 | Schema ProductionJob | P0 | db | BACKLOG | unassigned | SCL-103 |
| SCL-105 | Schema PreparationTask | P1 | db | BACKLOG | unassigned | SCL-103 |
| SCL-200 | Shell Admin | P1 | admin | BACKLOG | unassigned | SCL-007,SCL-009 |
| SCL-202 | Lista de clientes | P1 | admin | BACKLOG | unassigned | SCL-100,SCL-200 |
| SCL-203 | Ficha da cliente | P1 | admin | BACKLOG | unassigned | SCL-100,SCL-200 |
| SCL-210 | Agenda/Ensaios | P1 | admin | BACKLOG | unassigned | SCL-103,SCL-200 |
| SCL-211 | Criar ensaio | P1 | admin | BACKLOG | unassigned | SCL-103,SCL-106,SCL-105 |
| SCL-220 | Registrar pagamento | P1 | finance | BACKLOG | unassigned | SCL-104,SCL-200 |
| SCL-230 | Kanban Produção | P1 | production | BACKLOG | unassigned | SCL-106,SCL-200 |
| SCL-300 | Passwordless cliente | P1 | client | BACKLOG | unassigned | SCL-006,SCL-007 |
| SCL-301 | Shell Minha Experiência | P1 | client | BACKLOG | unassigned | SCL-300,SCL-009 |
| SCL-302 | Home cliente + progresso | P1 | client | BACKLOG | unassigned | SCL-103,SCL-105,SCL-301 |
| SCL-400 | Home pública editorial | P1 | site | BACKLOG | unassigned | SCL-009 |
| SCL-403 | Quiz | P1 | site | BACKLOG | unassigned | SCL-009 |
| SCL-500 | Schema Gallery | P2 | gallery | BACKLOG | unassigned | SCL-103 |
| SCL-503 | Reveal | P2 | gallery | BACKLOG | unassigned | SCL-500,SCL-301 |

---

## Template de task

```markdown
### SCL-XXX — Título curto

- Status: READY
- Priority: P0 | P1 | P2 | P3
- Area: auth | db | admin | client | site | finance | production | gallery | infra
- Owner: unassigned | human:<name> | agent:<id/name>
- Branch: —
- PR: —
- Depends on: none
- Blocks: none
- Files/Scope: —
- Migration: no
- Updated at: YYYY-MM-DD HH:mm TZ

**Goal**

Descrever o resultado esperado, não apenas a atividade.

**Acceptance criteria**

- [ ] ...
- [ ] ...

**Implementation notes**

- ...

**Blocker/Hand-off notes**

- concluído:
- falta:
- arquivos alterados:
- testes:
- próximo passo:
```

---

# Tasks iniciais detalhadas

### SCL-001 — Inicializar repositório

- Status: DONE
- Priority: P0
- Area: infra
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: none
- Blocks: SCL-002, SCL-003, SCL-005, SCL-009
- Files/Scope: repository root
- Migration: no
- Updated at: 2026-09-03

**Goal**

Criar a base do projeto Next.js + TypeScript, pronta para desenvolvimento em equipe/agentes.

**Acceptance criteria**

- [ ] aplicação inicia localmente;
- [ ] TypeScript strict habilitado;
- [ ] estrutura base de pastas criada;
- [ ] `.env.example` criado sem segredos;
- [ ] README com setup local;
- [ ] `docs/PRD.md`, `docs/TASKS.md` e `docs/DECISIONS.md` adicionados.

**Blocker/Hand-off notes**

—

---

### SCL-003 — CI + preview deploys

- Status: BLOCKED
- Priority: P0
- Area: infra
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-001, SCL-002
- Blocks: `IN_REVIEW → MERGE_READY` transition (PRD §19.3) para todas as tasks dos Epics 1–6
- Files/Scope: `.github/workflows/ci.yml`, `docs/runbooks/deploy.md`
- Migration: no
- Updated at: 2026-09-03

**Goal**

Dar todo PR um sinal de CI (lint, typecheck, test, build) e documentar o procedimento de deploy via Vercel.

**Acceptance criteria**

- [x] `.github/workflows/ci.yml` criado rodando lint, typecheck, test e build em `push`/`pull_request`, com env vars placeholder no passo de build (nenhum segredo real commitado);
- [ ] branch enviada para um remoto GitHub e workflow confirmado rodando verde na aba Actions;
- [ ] repositório conectado a um projeto Vercel, com env vars reais configuradas separadamente em Production e Preview;
- [x] `docs/runbooks/deploy.md` documentando o procedimento de deploy.

**Blocker/Hand-off notes**

- concluído: workflow CI e runbook de deploy prontos; falta o usuário conectar um remoto GitHub e um projeto Vercel para validar o pipeline de verdade — mesma categoria de bloqueio de SCL-004/005/006/007, mas por falta de remoto/conta, não pela indisponibilidade do Supabase.
- falta: `git push -u origin HEAD` para um remoto GitHub real, confirmação visual do workflow `CI` verde na aba Actions, e a conexão do repositório a um projeto Vercel (import, framework preset, env vars de Production/Preview, deploy, e um PR de teste confirmando o Preview Deployment).
- arquivos alterados: `.github/workflows/ci.yml`, `docs/runbooks/deploy.md`.
- testes: verificação local equivalente aos passos do workflow — `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` (com as mesmas env vars placeholder do workflow) todos verdes na working tree atual.
- próximo passo: assim que o usuário criar/conectar o remoto GitHub e o projeto Vercel, fazer o push, confirmar o workflow `CI` verde na aba Actions, conectar o repositório no dashboard da Vercel conforme `docs/runbooks/deploy.md`, então marcar SCL-003 `DONE`.

---

### SCL-004 — Criar Supabase e ambientes

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code + human:Hudson
- Branch: —
- PR: —
- Depends on: none
- Blocks: SCL-005, SCL-006
- Files/Scope: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `docs/runbooks/supabase-setup.md`, `tests/lib/supabase-env.test.ts`
- Migration: no
- Updated at: 2026-09-04

**Goal**

Disponibilizar banco/Auth para desenvolvimento com separação clara de configuração.

**Acceptance criteria**

- [x] projeto criado (região Americas; criação estava bloqueada por instabilidade parcial do Supabase — resolvida em 2026-09-04);
- [x] URL/keys configuradas via environment variables;
- [x] nenhuma service role key no frontend;
- [x] conexão testada — `npm run build` e `npm run dev` verdes com `.env.local` real; queries diretas ao Postgres confirmaram schema/policies (ver SCL-005/SCL-007);
- [x] procedimento de setup documentado.

**Blocker/Hand-off notes**

Projeto Supabase real criado pelo usuário em 2026-09-04 assim que o incidente "Project Lifecycle Actions" do status.supabase.com foi resolvido. `.env.local` preenchido pelo usuário (nunca commitado). Nenhuma pendência restante.

---

### SCL-005 — Configurar Drizzle e migrations

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-001, SCL-004
- Blocks: SCL-100, SCL-102, SCL-103, SCL-104, SCL-105, SCL-106
- Files/Scope: `drizzle.config.ts`, `db/schema/profiles.ts`, `db/schema/index.ts`, `db/client.ts`, `db/migrations/0000_lazy_pete_wisdom.sql`, `db/migrations/0002_handle_new_user_trigger.sql`, `db/migrations/meta/_journal.json`, `package.json` (scripts `db:generate`/`db:migrate`), `tests/db/schema.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Definir a fonte de verdade do schema e o procedimento serializado de migrations.

**Acceptance criteria**

- [x] Drizzle configurado;
- [x] migration inicial executa em banco limpo — `npm run db:migrate` aplicado com sucesso em 2026-09-04 contra o projeto Supabase real (`0000_lazy_pete_wisdom.sql`, `0001_profiles_rls.sql`, `0002_handle_new_user_trigger.sql`, todas em sequência; segunda execução confirmou idempotência — "migrations applied successfully!" sem reaplicar nada);
- [x] scripts de generate/migrate definidos;
- [x] política de migrations documentada (ver PRD §19.7 — serializadas, uma por vez);
- [ ] CI consegue validar schema/migrations conforme estratégia definida (ainda não há CI rodando de verdade — depende de SCL-003/remoto GitHub; ver nota da SCL-003).

**Blocker/Hand-off notes**

Todas as três migrations aplicadas com sucesso contra o projeto Supabase real em 2026-09-04. Verificado diretamente via query (não só pelo log do drizzle-kit): tabela `profiles` existe com as 5 colunas esperadas, RLS habilitada (`relrowsecurity = true`), FK `profiles_id_fkey` → `auth.users` presente, trigger `on_auth_user_created` presente. `auth.users`/`profiles` com contagem 1:1 após o primeiro signup real, confirmando que o trigger dispara corretamente. Único item não fechado (CI validando migrations) depende de SCL-003, não desta task.

---

### SCL-006 — Auth base

- Status: DONE
- Priority: P0
- Area: auth
- Owner: agent:claude-code + human:Hudson
- Branch: —
- PR: —
- Depends on: SCL-004, SCL-005
- Blocks: SCL-007, SCL-300
- Files/Scope: `lib/auth/session.ts`, `lib/auth/safe-redirect.ts`, `proxy.ts`, `app/(client)/login/`, `app/admin/login/`, `app/auth/callback/route.ts`, `app/admin/(protected)/layout.tsx` (substitui os removidos `app/admin/layout.tsx` e `app/admin/page.tsx`), `tests/lib/session.test.ts`, `tests/lib/safe-redirect.test.ts`
- Migration: no
- Updated at: 2026-09-04

**Goal**

Dar a toda a aplicação (Admin e Minha Experiência) uma única forma server-side de saber quem está pedindo — `getCurrentUser()` — em vez de cada rota consultar o Supabase Auth diretamente, além de proteger `/admin` e `/minha-experiencia` por middleware/proxy e oferecer login passwordless (cliente) e email+senha (staff/admin).

**Acceptance criteria**

- [x] `getCurrentUser()` implementado combinando o usuário do Supabase Auth com o papel (`role`) da tabela `profiles` via Drizzle;
- [x] `resolveRole()` extraído como lógica pura e coberto por teste unitário (sem dependência de sessão/banco real);
- [x] `proxy.ts` (convenção atual do Next 16 para o antigo `middleware.ts`) faz refresh de sessão e redireciona requisições não autenticadas em `/admin` (exceto `/admin/login`) e `/minha-experiencia` para o login correspondente;
- [x] login do cliente via magic link (`signInWithOtp`) em `app/(client)/login`;
- [x] login de staff/admin via email+senha (`signInWithPassword`) em `app/admin/login`;
- [x] fluxo de autenticação real verificado contra um projeto Supabase real em 2026-09-04: signup via magic link disparou o trigger `handle_new_user` (1 linha em `profiles` para 1 linha em `auth.users`), `/admin` corretamente bloqueado até o bootstrap de admin, `/admin` acessível e renderizando após a promoção via SQL Editor.

**Implementation notes**

- Next 16.3.4 deprecia o arquivo `middleware.ts` em favor de `proxy.ts` (mesma API — `request`/`response`, `config.matcher` — apenas o nome do arquivo e da função exportada mudam de `middleware` para `proxy`). O brief da task ainda cita `middleware.ts`; usamos `proxy.ts` para não introduzir um novo projeto já com aviso de depreciação no build. Confirmado com `node_modules/next/dist/docs/.../file-conventions/proxy.md` e o próprio warning do `next build`.
- `db/schema/profiles.ts` já usa `pgEnum("role", ["admin", "staff", "client"])`, então o tipo inferido de `profiles.role` bate exatamente com o `Role` de `lib/auth/session.ts` sem necessidade de cast.

**Blocker/Hand-off notes**

- concluído: código completo (`lib/auth/session.ts`, `proxy.ts`, `lib/auth/safe-redirect.ts`, páginas/ações de login do cliente e do admin, `app/auth/callback/route.ts`, `app/admin/(protected)/layout.tsx`) e testes unitários passando; `npm run test`, `npm run typecheck`, `npm run build` verdes com credenciais reais carregadas via `.env.local`. Fluxo real verificado manualmente em 2026-09-04 pelo usuário: login por magic link em `/login` completou (rota de callback PKCE funcionou), acesso a `/admin` sem papel suficiente foi bloqueado, e após bootstrap de admin via SQL Editor o `/admin` renderizou corretamente (`Studio OS` / "Dashboard real chega em SCL-201").
- falta: nada pendente nesta task. `getCurrentUser()`/`proxy.ts` ainda não têm teste de integração automatizado (só verificação manual) — considerar para uma task futura de qualidade, não bloqueante para o P0.
- arquivos alterados (acumulado, incluindo as rodadas de correção da revisão final): `lib/auth/session.ts`, `proxy.ts`, `lib/auth/safe-redirect.ts`, `app/(client)/login/actions.ts`, `app/(client)/login/page.tsx`, `app/admin/login/actions.ts`, `app/admin/login/page.tsx`, `app/auth/callback/route.ts`, `app/admin/(protected)/layout.tsx`, `tests/lib/session.test.ts`, `tests/lib/safe-redirect.test.ts`.
- testes: `tests/lib/session.test.ts`, `tests/lib/safe-redirect.test.ts` (automatizados) + verificação manual completa do fluxo real em 2026-09-04.
- próximo passo: nenhum para esta task. SCL-300 (passwordless cliente na Minha Experiência) e SCL-200 (shell Admin) já podem começar.

---

### SCL-007 — RBAC/RLS base

- Status: DONE
- Priority: P0
- Area: auth
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-006
- Blocks: SCL-200, SCL-300
- Files/Scope: `lib/auth/rbac.ts`, `db/migrations/0001_profiles_rls.sql`, `db/migrations/meta/_journal.json`, `tests/lib/rbac.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Dar a toda Server Action/Route Handler admin uma checagem de papel padronizada (`hasMinimumRole`/`requireRole`) e reforçar essa checagem na camada de dados via Row Level Security na tabela `profiles` — esconder UI não é controle de acesso (PRD §3.6).

**Acceptance criteria**

- [x] `hasMinimumRole(role, minimum)` e `requireRole(user, minimum)` implementados em `lib/auth/rbac.ts`, reaproveitando `Role`/`CurrentUser` de `lib/auth/session.ts` (Task 6) sem redefini-los;
- [x] testes unitários cobrindo hierarquia de papéis (admin ⊇ staff ⊇ client) e os casos de exceção `requireRole` (papel insuficiente, usuário nulo);
- [x] migration `0001_profiles_rls.sql` escrita: `enable row level security` em `profiles`, políticas `select`/`update own` via `auth.uid() = id`, e bypass de admin via `exists` contra a própria `profiles`;
- [x] migration registrada em `db/migrations/meta/_journal.json` para que `db:migrate` a aplique e `db:generate` continue a numeração a partir do próximo índice;
- [x] migration aplicada e verificada em um projeto Supabase real em 2026-09-04: `select public.is_admin()` executa sem erro `42P17` (a policy de admin não é mais autorrecursiva — corrigida na revisão final via helper `security definer`); as 3 policies aparecem em `pg_policies` com o `qual` esperado; `authenticated` não tem `UPDATE` em nível de tabela em `profiles` e, em nível de coluna, só tem `UPDATE` em `full_name` — a escalação de privilégio (cliente alterando o próprio `role`) está bloqueada, confirmado por query direta ao Postgres, não só pelo código.

**Implementation notes**

- Políticas de RLS não fazem parte do DSL de schema do Drizzle, então essa migration é escrita à mão (não gerada por `npm run db:generate`) e aplicada da mesma forma que as geradas — por isso a entrada manual em `_journal.json` (idx 1, tag `0001_profiles_rls`), sem `0001_snapshot.json` correspondente (não há mudança estrutural rastreada pelo Drizzle nesta migration).
- Esse é o padrão (enable RLS, `select`/`update own`, bypass admin via `exists` em `profiles`) que as próximas tabelas do Epic 1 (`clients`, `shoots`, `payments`, ...) devem reaproveitar.

**Blocker/Hand-off notes**

- concluído: `lib/auth/rbac.ts` e `tests/lib/rbac.test.ts` completos; migration `db/migrations/0001_profiles_rls.sql` aplicada e verificada contra o projeto Supabase real em 2026-09-04, incluindo os dois fixes que saíram da revisão final do branch (policy de admin autorrecursiva → helper `security definer` `public.is_admin()`; revoke de coluna que era no-op contra o grant padrão de tabela do Supabase → `revoke update` em nível de tabela seguido de `grant update ("full_name")` de volta). Decisão de arquitetura registrada em `docs/DECISIONS.md` (RLS como defesa em profundidade; `lib/auth/rbac.ts` como fronteira autoritativa da aplicação, via `app/admin/(protected)/layout.tsx`).
- falta: nada pendente nesta task. Como recomendação de qualidade (não bloqueante): um teste de migration automatizado (PGlite/Testcontainers) aplicando `db/migrations/` inteiro contra um Postgres descartável pegaria esse tipo de bug de RLS mecanicamente, em vez de depender de revisão manual.
- arquivos alterados: `lib/auth/rbac.ts`, `tests/lib/rbac.test.ts`, `db/migrations/0001_profiles_rls.sql`, `db/migrations/meta/_journal.json`, `docs/DECISIONS.md`.
- testes: `tests/lib/rbac.test.ts` (6 casos) + verificação por query direta ao Postgres real (policies, ACL de tabela/coluna) em 2026-09-04.
- próximo passo: nenhum para esta task. SCL-200 e SCL-300 já podem começar.

---

### SCL-008 — Observabilidade (Sentry + structured logging)

- Status: DONE
- Priority: P0
- Area: infra
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-001
- Blocks: SCL-220 (e futuras tasks do Epic 1 com mutação financeira)
- Files/Scope: `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx`, `next.config.ts`, `lib/observability/logger.ts`, `tests/lib/logger.test.ts`
- Migration: no
- Updated at: 2026-09-03

**Goal**

Instrumentar erros com Sentry nos três runtimes do Next.js (client/server/edge) e fornecer um logger estruturado (`lib/observability/logger.ts`) que as tasks futuras de mutação financeira (registrar pagamento, recalcular saldo) devem usar em vez de `console.log` puro, por PRD §14 e §10.8.

**Acceptance criteria**

- [x] `@sentry/nextjs` instalado;
- [x] `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` criados, cada um com `enabled: !!dsn` — inertes sem DSN real; `instrumentation.ts` carrega os dois últimos conforme `NEXT_RUNTIME` e exporta `onRequestError`;
- [x] `next.config.ts` envolvido com `withSentryConfig`;
- [x] `logger.debug/info/warn/error(message, context)` implementado emitindo JSON estruturado (`level`, `message`, `timestamp`, ...context), roteando `error`→`console.error`, `warn`→`console.warn`, demais→`console.log`;
- [x] teste (`tests/lib/logger.test.ts`) escrito antes da implementação (TDD: RED confirmado — módulo inexistente — depois GREEN);
- [x] `npm run build` bem-sucedido sem `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` configurados (Sentry fica desabilitado, não quebra o build);
- [x] `npm run test`, `npm run typecheck`, `npm run lint` verdes.

**Implementation notes**

- Não depende de projeto Supabase nem de credenciais reais — diferente de SCL-004/005/006/007, este task fica genuinamente `DONE` sem infraestrutura externa, já que `enabled: !!dsn` torna o Sentry um no-op sem DSN.
- `next.config.ts` importa `withSentryConfig` de `@sentry/nextjs/config`. O import a partir da raiz do pacote (`@sentry/nextjs`) é depreciado no v10 e emitia aviso a cada build; foi migrado durante a rodada de correções de revisão do P0. O build agora não emite nenhum aviso do Sentry.
- Os arquivos `sentry.client.config.ts` / carregamento implícito de `sentry.server.config.ts` e `sentry.edge.config.ts` não funcionam com o Turbopack (bundler padrão do Next 16), o que deixava o Sentry inerte nos três runtimes. A instrumentação foi migrada para a convenção `instrumentation.ts` + `instrumentation-client.ts` (esta última exportando `onRouterTransitionStart`, exigido pelo SDK), com `app/global-error.tsx` reportando erros de render não capturados.
- `.env.example` já continha `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` desde a SCL-001. `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` (lidos por `next.config.ts`/`withSentryConfig` para upload de source maps) foram adicionados nesta task.

**Blocker/Hand-off notes**

—

---

### SCL-102 — Schema ExperiencePackage

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-005
- Blocks: SCL-103
- Files/Scope: `db/schema/experience-packages.ts`, `db/schema/index.ts`, `db/migrations/0003_harsh_ogun.sql`, `db/migrations/0004_experience_packages_rls.sql`, `db/migrations/meta/_journal.json`, `db/seeds/experience-packages.ts`, `domain/catalog/experience-package.ts`, `tests/domain/experience-package.test.ts`, `package.json`, `tsconfig.json`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `experience_packages` (catálogo de pacotes vendidos) e o helper `public.is_staff_or_admin()` que toda tabela de negócio do Studio OS (Epic 1 em diante) vai reaproveitar como backstop de RLS.

**Acceptance criteria**

- [x] schema Drizzle criado (`experience_packages`: nome, preço base decimal, fotos incluídas, duração, cenas, maquiagem/clutch inclusos, limite de trocas de roupa, ativo, criado em);
- [x] migration gerada por `db:generate` aplicada contra o projeto Supabase real (`0003_harsh_ogun.sql`) — tabela confirmada em `information_schema.columns` com as 11 colunas esperadas;
- [x] `public.is_staff_or_admin()` criado (generaliza `public.is_admin()` de `0001_profiles_rls.sql` para também admitir `staff`) e RLS habilitada em `experience_packages` com policy `experience_packages_staff_access` — confirmado via `pg_class.relrowsecurity`, `pg_policies` e `pg_proc.prosecdef` no projeto real;
- [x] 4 pacotes seedados (Cinderela, Bella, Aurora, Diana), todos `active = true`, `base_price = 0.00` (placeholder) — confirmado por query direta contando exatamente 4 linhas;
- [x] `createExperiencePackageSchema` (Zod) testado via TDD: RED confirmado (`@/domain/catalog/experience-package` sem exports) antes da implementação, GREEN depois (3 testes: pacote válido aceito, nome vazio rejeitado, `includedPhotos` não positivo rejeitado).

**Implementation notes**

- `public.is_staff_or_admin()` agora existe para toda migration de RLS das próximas tasks deste plano reaproveitar (mesmo padrão `security definer`/`stable` de `public.is_admin()`), em vez de cada tabela reimplementar a checagem de papel.
- Bug de journal descoberto e corrigido durante esta task: as entradas `idx 1`/`idx 2` de `db/migrations/meta/_journal.json` (herdadas de SCL-005/SCL-007) têm timestamps `when` no futuro em relação ao horário real (`2026-09-04T21:00:00Z` e `2026-09-05T21:00:00Z`). O migrator do drizzle-orm só aplica uma migration se seu `folderMillis` for maior que o `created_at` já registrado em `__drizzle_migrations` — como a migration `0003` recém-gerada recebeu um `Date.now()` real, menor que esse teto artificial, `db:migrate` retornou exit 0 e "migrations applied successfully!" sem aplicar nada (tabela não existia, nenhuma linha nova em `__drizzle_migrations`). Corrigido ajustando os `when` de `0003`/`0004` para valores acima desse teto, sem tocar nas entradas já aplicadas (`idx 0-2`) nem em dado nenhum do banco real. Esse mesmo teto pode voltar a colidir com a próxima migration gerada por uma task futura até o relógio real ultrapassar 2026-09-05T21:00:00Z — vale checar `_journal.json` antes de assumir que `db:migrate` aplicou algo só pelo exit code.
- `db/seeds/experience-packages.ts` roda via `node --env-file-if-exists=.env.local --experimental-strip-types` (sem bundler) — o resolvedor ESM nativo do Node não entende o alias `@/` nem o import de diretório sem extensão `"./schema"` de `db/client.ts` (ambos são conveniências de TypeScript/bundler). O script monta seu próprio client mínimo (mesmas opções `prepare: false, max: 1` de `db/client.ts`) importando `../schema/experience-packages.ts` diretamente, em vez de reusar `db/client.ts`/`db/schema/index.ts`. `allowImportingTsExtensions` foi habilitado em `tsconfig.json` (seguro porque `noEmit` já é `true`) para o `.ts` explícito no import não quebrar `npm run typecheck`.
- `zod` era apenas dependência transitiva de dev (via `eslint-config-next` → `eslint-plugin-react-hooks`), não uma dependência direta — promovido para `dependencies` em `package.json`, já que `domain/catalog/experience-package.ts` o importa diretamente e todo `create*` futuro deste plano depende dele.

**Blocker/Hand-off notes**

- concluído: schema, migrations (0003 gerada + 0004 manual), seed, módulo de domínio e teste Zod completos; `npm run test` (28/28), `npm run typecheck`, `npm run lint`, `npm run build` verdes. Verificado contra o Supabase real (não só pelo exit code): 11 colunas de `experience_packages`, RLS habilitada, policy e função `is_staff_or_admin()` presentes, exatamente 4 linhas seedadas.
- falta: nada pendente nesta task.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/experience-package.test.ts` (3 casos, TDD RED→GREEN) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-103 (Schema Shoot) já pode começar, reaproveitando `public.is_staff_or_admin()` para sua própria migration de RLS.

---

### SCL-100 — Schema Client

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-005
- Blocks: SCL-103, SCL-202, SCL-203
- Files/Scope: `db/schema/clients.ts`, `db/schema/index.ts`, `db/migrations/0005_lazy_martin_li.sql`, `db/migrations/0006_clients_rls.sql`, `db/migrations/meta/_journal.json`, `domain/clients/schema.ts`, `domain/clients/service.ts`, `tests/domain/clients.test.ts`, `package.json` (script `test`), `docs/DECISIONS.md`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `clients` (registro CRM de cada cliente, PRD §7) que SCL-103 (Shoot) e futuras tasks de Admin/Minha Experiência referenciam via FK, incluindo o vínculo opcional com a identidade de Auth do Supabase e o suporte a indicação (cliente que indicou outra).

**Acceptance criteria**

- [x] schema Drizzle criado (`clients`: nome, telefone, email, instagram, aniversário, origem, `referrer_client_id` auto-referencial, perfil de estilo, notas, consentimento de marketing, `auth_user_id` nulável+único ligando ao `auth.users` do Supabase, criado em);
- [x] migration gerada por `db:generate` (`0005_lazy_martin_li.sql`) confirmada sem FK auto-referencial inferida automaticamente (Drizzle não expressa isso sem `.references()`); FK `clients_referrer_client_id_fkey` adicionada como statement escrito à mão no mesmo arquivo, aplicada e confirmada via `pg_constraint` no projeto Supabase real;
- [x] RLS habilitada em `clients` (`0006_clients_rls.sql`) reaproveitando `public.is_staff_or_admin()` (SCL-102) via policy `clients_staff_access` — confirmado via `pg_class.relrowsecurity` e `pg_policy` no projeto real; policy de auto-leitura da cliente via `auth_user_id = auth.uid()` deliberadamente adiada para o Epic 3 (nada na aplicação lê essa tabela via Supabase client hoje — ver `docs/DECISIONS.md`, RLS como defesa em profundidade);
- [x] `createClientSchema` (Zod) testado via TDD: RED confirmado (`@/domain/clients/schema` sem exports) antes da implementação, GREEN depois (5 casos: nome mínimo aceito, nome vazio rejeitado, email inválido rejeitado, email válido aceito, `marketingConsent` default `false`);
- [x] `createClient()`/`getClientById()` cobertos por teste de integração real contra o Supabase (não só unitário/mockado): cria uma linha, lê de volta por id, e remove a linha em `afterAll` — confirmado por query direta ao Postgres que a tabela fica vazia depois do teste.

**Implementation notes**

- `referrer_client_id` não usa `.references()` no schema Drizzle de propósito — FKs auto-referenciais exigem que a tabela já exista antes de sua própria constraint, uma ordem de statements arriscada de confiar cegamente à geração do drizzle-kit. A constraint foi adicionada como um segundo `--> statement-breakpoint` no mesmo arquivo de migration gerado, escrita à mão. Padrão registrado em `docs/DECISIONS.md` para qualquer FK auto-referencial futura deste plano.
- Bug descoberto durante esta task (mesma classe do gap do drizzle-kit em SCL-005 e dos timestamps de journal em SCL-102): o script `test` (`vitest run` puro) não carregava `.env.local`, então o teste de integração conectava em `localhost:5432` em vez do Supabase real (`ECONNREFUSED`). Corrigido trocando o script para `node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run`, mesmo padrão já usado por `db:generate`/`db:migrate`. Registrado em `docs/DECISIONS.md`.
- `CreateClientInput` usa `z.input<typeof createClientSchema>`, não `z.infer` (= `z.output`): como `marketingConsent` tem `.default(false)`, `z.infer` o torna obrigatório no tipo (correto pós-parse, mas `npm run typecheck` rejeitava `createClient({ name: "..." })`, uso pretendido e exatamente o que o teste de integração faz, mesmo sendo válido em runtime via `.parse()`). Registrado em `docs/DECISIONS.md` como padrão para qualquer schema futuro com `.default()`.
- `domain/clients/schema.ts` e `domain/clients/service.ts` ficam em arquivos separados (diferente do precedente de SCL-102, que juntou tudo em `domain/catalog/experience-package.ts`) — decisão explícita do plano para esta task, mantida como especificado no brief.

**Blocker/Hand-off notes**

- concluído: schema, migrations (0005 gerada + FK manual, 0006 RLS manual), módulo de domínio, testes Zod (TDD RED→GREEN) e teste de integração real completos. `npm run test` (34/34), `npm run typecheck`, `npm run lint`, `npm run build` verdes. Verificado contra o Supabase real (não só pelo exit code): 13 colunas de `clients`, constraint única em `auth_user_id`, FK auto-referencial em `referrer_client_id`, RLS habilitada, policy `clients_staff_access` presente, ambas as entradas de migration (`idx 5`/`idx 6`) registradas em `drizzle.__drizzle_migrations`, e tabela vazia (0 linhas) após o teste de integração limpar sua própria linha de teste.
- falta: nada pendente nesta task. Policy de auto-leitura da cliente (`auth_user_id = auth.uid()`) fica para o Epic 3, quando algo na aplicação de fato ler essa tabela via Supabase client no browser.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/clients.test.ts` (6 casos: 5 Zod via TDD RED→GREEN + 1 integração real com `afterAll` de limpeza) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-103 (Schema Shoot) já pode começar, reaproveitando `public.is_staff_or_admin()` e referenciando `clients.id` via FK.

---

### SCL-103 — Implementar contrato de Shoot

- Status: BACKLOG
- Priority: P0
- Area: db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-102
- Blocks: SCL-104, SCL-105, SCL-106, SCL-210, SCL-211, SCL-302
- Files/Scope: db/schema/shoot*, domain/shoots/**
- Migration: yes
- Updated at: 2026-09-03

**Goal**

Criar a entidade operacional central usada por Admin e Minha Experiência.

**Acceptance criteria**

- [ ] vínculo obrigatório com Client;
- [ ] vínculo com ExperiencePackage;
- [ ] data/horário/status/valor acordado persistidos;
- [ ] estados de domínio documentados;
- [ ] validação de input;
- [ ] testes do serviço/contrato;
- [ ] nenhuma regra financeira derivada duplicada no Shoot.

---

### SCL-211 — Criar ensaio ponta a ponta

- Status: BACKLOG
- Priority: P1
- Area: admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-105, SCL-106, SCL-200
- Blocks: primeiro marco E2E
- Files/Scope: app/admin/**, domain/shoots/**, domain/preparation/**, domain/production/**
- Migration: no
- Updated at: 2026-09-03

**Goal**

Permitir que Admin crie um ensaio confirmado e que o sistema derive os registros operacionais relacionados.

**Acceptance criteria**

- [ ] selecionar/criar cliente;
- [ ] selecionar experiência;
- [ ] informar data/horário/valor;
- [ ] criar Shoot;
- [ ] criar ProductionJob em Aguardando;
- [ ] criar checklist inicial;
- [ ] portal_enabled configurado;
- [ ] operação consistente em caso de falha parcial;
- [ ] teste de integração cobrindo o fluxo.

---

### SCL-220 — Registrar pagamento conectado

- Status: BACKLOG
- Priority: P1
- Area: finance
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-104, SCL-200
- Blocks: dashboard financeiro, marco E2E
- Files/Scope: domain/payments/**, app/admin/**
- Migration: no
- Updated at: 2026-09-03

**Goal**

Registrar pagamento uma única vez e derivar saldo/status financeiro do ensaio.

**Acceptance criteria**

- [ ] Payment persistido;
- [ ] somente pagamentos confirmados entram no saldo;
- [ ] saldo calculado como valor acordado menos pagamentos confirmados;
- [ ] pagamento parcial suportado;
- [ ] histórico preservado;
- [ ] teste para saldo zero, parcial e excesso/erro de entrada;
- [ ] nenhuma segunda receita precisa ser digitada em outra tela.

---

### SCL-302 — Home Minha Experiência conectada

- Status: BACKLOG
- Priority: P1
- Area: client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-105, SCL-301
- Blocks: primeiro marco E2E
- Files/Scope: app/(client)/**, domain/shoots/read*, domain/preparation/read*
- Migration: no
- Updated at: 2026-09-03

**Goal**

Exibir para a cliente autenticada a visão do mesmo Shoot usado pelo Studio OS.

**Acceptance criteria**

- [ ] cliente não consegue acessar Shoot de outra cliente;
- [ ] nome/experiência/data corretos;
- [ ] countdown correto;
- [ ] checklist correto;
- [ ] próximo passo derivado do estado;
- [ ] layout mobile aprovado;
- [ ] alterações de preparação no backend aparecem sem duplicação de dados.

---

## Hand-off global atual

- PRD: concluído.
- Protótipo de referência: V2.3 Studio OS.
- Modelo de dados: V2.3 disponível.
- Controle legado: planilha disponível para futura migração.
- Domínio: `studiocarollucas.com.br` registrado na Hostinger.
- Stack proposta: Next.js + TypeScript + Tailwind + shadcn/ui + Supabase + Drizzle + Zod + R2 + Resend + Vercel.
- Próximo passo recomendado: SCL-001 e SCL-004 podem começar em paralelo.

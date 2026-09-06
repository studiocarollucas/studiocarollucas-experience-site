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
| SCL-003 | CI + preview deploys | P0 | infra | DONE | agent:claude-code + human:Hudson | SCL-001,SCL-002 |
| SCL-004 | Projeto Supabase + ambientes | P0 | db | DONE | agent:claude-code + human:Hudson | none |
| SCL-005 | Drizzle + migrations | P0 | db | DONE | agent:claude-code | SCL-001,SCL-004 |
| SCL-006 | Auth base | P0 | auth | DONE | agent:claude-code + human:Hudson | SCL-004,SCL-005 |
| SCL-007 | RBAC/RLS base | P0 | auth | DONE | agent:claude-code | SCL-006 |
| SCL-008 | Observabilidade (Sentry + logging) | P0 | infra | DONE | agent:claude-code | SCL-001 |
| SCL-009 | Design tokens + layout base | P0 | ui | DONE | agent:claude-code | SCL-001 |
| SCL-100 | Schema Client | P0 | db | DONE | agent:claude-code | SCL-005 |
| SCL-101 | Schema Lead + transições de status | P0 | db | DONE | agent:claude-code | SCL-005,SCL-100 |
| SCL-102 | Schema ExperiencePackage | P0 | db | DONE | agent:claude-code | SCL-005 |
| SCL-108 | Seeds de experiências | P0 | db | DONE | agent:claude-code | SCL-102 |
| SCL-103 | Schema Shoot | P0 | db | DONE | agent:claude-code | SCL-100,SCL-102 |
| SCL-104 | Schema Payment/Expense | P0 | db | DONE | agent:claude-code | SCL-103 |
| SCL-106 | Schema ProductionJob | P0 | db | DONE | agent:claude-code | SCL-103 |
| SCL-105 | Schema PreparationTask | P1 | db | DONE | agent:claude-code | SCL-103 |
| SCL-107 | Schema AuditLog | P0 | db | DONE | agent:claude-code | SCL-005 |
| SCL-200 | Shell Admin | P1 | admin | DONE | agent:claude-code | SCL-007,SCL-009,SCL-100 |
| SCL-201 | Dashboard | P1 | admin | DONE | agent:claude-code | SCL-103,SCL-104,SCL-106,SCL-200 |
| SCL-202 | Lista de clientes | P1 | admin | DONE | agent:claude-code | SCL-100,SCL-200 |
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

- Status: DONE
- Priority: P0
- Area: infra
- Owner: agent:claude-code + human:Hudson
- Branch: —
- PR: —
- Depends on: SCL-001, SCL-002
- Blocks: `IN_REVIEW → MERGE_READY` transition (PRD §19.3) para todas as tasks dos Epics 1–6
- Files/Scope: `.github/workflows/ci.yml`, `docs/runbooks/deploy.md`, `.npmrc`, `package.json` (`@types/node`)
- Migration: no
- Updated at: 2026-09-06

**Goal**

Dar todo PR um sinal de CI (lint, typecheck, test, build) e documentar o procedimento de deploy via Vercel.

**Acceptance criteria**

- [x] `.github/workflows/ci.yml` criado rodando lint, typecheck, test e build em `push`/`pull_request`, com env vars placeholder no passo de build (nenhum segredo real commitado);
- [x] branch enviada para um remoto GitHub (`github.com/studiocarollucas/studiocarollucas-experience-site`) e workflow confirmado rodando verde na aba Actions (commits `1d714ef` e `f2f5de0`, branch `main`);
- [x] repositório conectado a um projeto Vercel, deploy de produção confirmado ao vivo em `studiocarollucas-experience-site.vercel.app` renderizando a home real;
- [x] `docs/runbooks/deploy.md` documentando o procedimento de deploy.

**Implementation notes**

- O push inicial foi feito para `master` (nome default do `git init` local); o repositório remoto e o próprio `ci.yml` (`on: push: branches: [main]`) esperavam `main`. Renomeado localmente (`git branch -m master main`) e reenviado; branch `master` remoto removido para não duplicar.
- O primeiro deploy na Vercel falhou (`npm error ERESOLVE`): `@types/node` estava fixado em `^20` no `package.json`, mas `vitest@5.0.0` exige `^22.0.0 || >=24.0.0` via peer dependency — conflito nunca visível localmente porque o `~/.npmrc` global do usuário tinha `legacy-peer-deps=true`, mascarando o erro. Corrigido: `@types/node` → `^22` (compatível com `engines.node >=22.9` já declarado), e adicionado `.npmrc` no projeto fixando `legacy-peer-deps=false` para que esse tipo de "funciona local, quebra no deploy" não se repita para nenhum colaborador futuro. `package-lock.json` regenerado do zero sob resolução estrita (reproduzindo o mesmo erro da Vercel localmente antes do fix, confirmando a causa raiz).

**Blocker/Hand-off notes**

—
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
- Blocks: SCL-100, SCL-101, SCL-102, SCL-103, SCL-104, SCL-105, SCL-106, SCL-107
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
- Blocks: SCL-103, SCL-108
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
- Bug de journal descoberto e corrigido durante esta task: as entradas `idx 1`/`idx 2` de `db/migrations/meta/_journal.json` (herdadas de SCL-005/SCL-007) têm timestamps `when` no futuro em relação ao horário real (`2026-09-04T21:00:00Z` e `2026-09-05T21:00:00Z`). O migrator do drizzle-orm só aplica uma migration se seu `folderMillis` for maior que o `created_at` já registrado em `__drizzle_migrations` — como a migration `0003` recém-gerada recebeu um `Date.now()` real, menor que esse teto artificial, `db:migrate` retornou exit 0 e "migrations applied successfully!" sem aplicar nada (tabela não existia, nenhuma linha nova em `__drizzle_migrations`). Contornado nesta task ajustando os `when` de `0003`/`0004` para valores acima desse teto, sem tocar nas entradas já aplicadas (`idx 0-2`) nem em dado nenhum do banco real. **A causa raiz foi corrigida em seguida, no commit `e0b33b4`**, que substituiu os timestamps futuros por valores reais tanto no `_journal.json` quanto na tabela de rastreamento `drizzle.__drizzle_migrations` do projeto ao vivo — o teto artificial de 2026-09-05T21:00:00Z não existe mais, e o risco de colisão descrito acima está fechado, não em aberto. A proteção durável contra recorrência é o hook `predb:migrate` (`scripts/check-migration-journal.mjs`, commit `c3b9c47`), que roda antes de todo `db:migrate` e falha ruidosamente se uma entrada nova do journal for não-monotônica ou datada no futuro — exatamente as duas condições que fazem o migrator pular uma migration em silêncio. Continua valendo, como prática geral, verificar o estado real do banco por query (`pg_constraint`, `pg_indexes`, `information_schema`) em vez de confiar só no exit code do `db:migrate`.
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

### SCL-101 — Schema Lead + transições de status

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-005, SCL-100
- Blocks: nenhuma task do backlog atual depende diretamente de SCL-101 (referenciada apenas informalmente pelo fluxo de captação do PRD)
- Files/Scope: `db/schema/leads.ts`, `db/schema/index.ts`, `db/migrations/0007_lazy_nick_fury.sql`, `db/migrations/0008_leads_rls.sql`, `db/migrations/meta/_journal.json`, `domain/leads/schema.ts`, `domain/leads/service.ts`, `domain/leads/status.ts`, `tests/domain/leads.test.ts`, `tests/domain/lead-status.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `leads` (funil de captação: Instagram, indicação, quiz, WhatsApp — PRD §6) com FKs opcionais para `clients` (cliente já existente) e `profiles` (vendedora/responsável), e as regras puras de transição de status do funil (`novo → contato → proposta → negociacao → ganho`, com `perdido` alcançável a partir de qualquer estágio ativo e nenhuma transição permitida a partir de um estado terminal).

**Acceptance criteria**

- [x] schema Drizzle criado (`leads`: `client_id` nulável, dados temporários de contato (nome/telefone/email) para lead sem `Client` ainda, origem obrigatória, ocasião, resultado de quiz, `status` via `pgEnum` com default `novo`, motivo de perda, `owner` nulável referenciando `profiles`, criado em);
- [x] migration gerada por `db:generate` (`0007_lazy_nick_fury.sql`) confirmada sem nenhuma FK auto-inferida (schema não usa `.references()`); ambas as FKs (`leads_client_id_fkey` → `clients.id`, `leads_owner_fkey` → `profiles.id`) adicionadas como statements escritos à mão no mesmo arquivo, aplicadas e confirmadas via `pg_constraint` no projeto Supabase real;
- [x] RLS habilitada em `leads` (`0008_leads_rls.sql`) reaproveitando `public.is_staff_or_admin()` (SCL-102) via policy `leads_staff_access` — confirmado via `pg_class.relrowsecurity` e `pg_policy` no projeto real;
- [x] `canTransitionLeadStatus()` (lógica pura, sem banco) testada via TDD: RED confirmado (`@/domain/leads/status` inexistente) antes da implementação, GREEN depois (5 casos: pipeline direta completa, `perdido` a partir de qualquer estágio ativo, rejeição de pular estágio, rejeição de sair de estado terminal, rejeição de transição para o mesmo estado);
- [x] `createLeadSchema` (Zod) testado via TDD: RED confirmado (`@/domain/leads/schema` sem exports) antes da implementação, GREEN depois (4 casos: lead só com `source` aceito, `status` default `novo`, `source` ausente rejeitado, valor de `status` inválido rejeitado);
- [x] `createLead()`/`getLeadById()` implementados seguindo o mesmo padrão create+getById de `domain/clients/service.ts` (sem update/delete/list nesta task).

**Implementation notes**

- Mesmo padrão de FK explícita de SCL-100 (`referrer_client_id`), mas aqui por ter duas colunas FK (`client_id`, `owner`) em vez de uma auto-referencial: `npm run db:generate` confirmou "0 fks" gerados para as 4 tabelas do schema, então ambas as constraints foram acrescentadas como um segundo e terceiro `--> statement-breakpoint` no mesmo arquivo gerado, escritas à mão, e verificadas por query direta a `pg_constraint` (não só pelo exit code do `db:migrate`).
- `db/migrations/meta/_journal.json`: os dois novos índices (`idx 7`, `idx 8`) receberam `when` gerado automaticamente pelo próprio `drizzle-kit generate` (para `0007`) e por `Date.now()` capturado manualmente no momento da edição (para `0008`, migration de RLS escrita à mão) — ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` (`scripts/check-migration-journal.mjs`) antes de cada `db:migrate`, sem repetir o bug de timestamp futuro descoberto em SCL-102.
- `domain/leads/schema.ts` exporta `CreateLeadInput` como `z.input<typeof createLeadSchema>`, não `z.infer` — reaproveitando a decisão registrada em `docs/DECISIONS.md` (2026-09-04) para qualquer schema futuro com `.default()`: `status` tem `.default("novo")`, então `z.infer` tornaria o campo obrigatório no tipo TypeScript mesmo sendo opcional em runtime via `.parse()`. O brief desta task citava `z.infer` no snippet, mas a decisão documentada em SCL-100 já cobre explicitamente "qualquer schema futuro deste plano" — aplicada aqui por consistência, sem alterar o comportamento em runtime.
- `domain/leads/status.ts` não toca o banco — `LeadStatus` é derivado do próprio `leadStatusEnum.enumValues` do Drizzle (`db/schema/leads.ts`), então o enum Postgres e o tipo TypeScript nunca podem divergir.

**Blocker/Hand-off notes**

- concluído: schema, migrations (0007 gerada + 2 FKs manuais, 0008 RLS manual), módulo de domínio (`schema.ts`/`service.ts`/`status.ts`) e testes (TDD RED→GREEN, transições primeiro conforme o brief, depois Zod/service) completos. `npm run test` (43/43), `npm run typecheck`, `npm run lint`, `npm run build` verdes. Verificado contra o Supabase real (não só pelo exit code): 12 colunas de `leads`, ambas as FKs (`leads_client_id_fkey` → `clients(id)`, `leads_owner_fkey` → `profiles(id)`) presentes em `pg_constraint`, RLS habilitada (`relrowsecurity = true`), policy `leads_staff_access` presente em `pg_policy`, e ambas as entradas de migration (`idx 7`/`idx 8`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. Esta task não inclui teste de integração real contra o banco (diferente de SCL-100) — o brief só pede testes puros de Zod e de transição de status, nenhum dos dois toca o banco.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/lead-status.test.ts` (5 casos, TDD RED→GREEN) + `tests/domain/leads.test.ts` (4 casos, TDD RED→GREEN) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: nenhum bloqueio direto no backlog atual depende de SCL-101; a task fica disponível para uma futura camada de Admin/captação (fora do escopo do backlog atual) reaproveitar `createLead()`/`canTransitionLeadStatus()`.

---

### SCL-103 — Implementar contrato de Shoot

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-102
- Blocks: SCL-104, SCL-105, SCL-106, SCL-210, SCL-211, SCL-302
- Files/Scope: `db/schema/shoots.ts`, `db/schema/index.ts`, `db/migrations/0009_happy_pixie.sql`, `db/migrations/0010_shoots_rls.sql`, `db/migrations/meta/_journal.json`, `domain/shoots/schema.ts`, `domain/shoots/service.ts`, `domain/shoots/status.ts`, `tests/domain/shoots.test.ts`, `tests/domain/shoot-status.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a entidade operacional central usada por Admin e Minha Experiência — a tabela `shoots` — com FKs obrigatórias para `clients` e `experience_packages`, e as regras puras de transição de status do pipeline operacional (`reserva → preparacao → realizado → edicao → finalizado → reveal → entregue`, com `cancelado` alcançável a partir de quase todos os estágios não-terminais, `reagendado` alcançável só a partir de estágios pré-ensaio, e `reagendado → reserva` como o único caminho de volta ao pipeline).

**Acceptance criteria**

- [x] vínculo obrigatório com Client (`client_id` `NOT NULL`, FK `shoots_client_id_fkey` → `clients.id`);
- [x] vínculo com ExperiencePackage (`experience_package_id` `NOT NULL`, FK `shoots_experience_package_id_fkey` → `experience_packages.id`);
- [x] data/horário/status/valor acordado persistidos (`shoot_date` `date` obrigatório, `start_time` `time` opcional, `status` via `pgEnum` com default `reserva`, `agreed_price` `numeric(10,2)` obrigatório como string, nunca `number`);
- [x] estados de domínio documentados (`canTransitionShootStatus()` em `domain/shoots/status.ts`, com comentário explicando por que `reagendado` só é possível pré-`realizado`);
- [x] validação de input (`createShootSchema`, Zod, testado via TDD);
- [x] testes do serviço/contrato (`tests/domain/shoot-status.test.ts`: 6 casos; `tests/domain/shoots.test.ts`: 5 casos; ambos TDD RED→GREEN);
- [x] nenhuma regra financeira derivada duplicada no Shoot — `payment_status` é explicitamente um cache denormalizado, não fonte de verdade (ver Implementation notes abaixo); `createShoot()` é um insert puro, sem nenhuma orquestração de `ProductionJob`/`PreparationTask` (deliberadamente adiada para SCL-211, Epic 2).

**Implementation notes**

- **Nota de design para o implementador de SCL-104 (Payment) / SCL-220 (Registrar pagamento)**: `shoots.payment_status` é um cache/denormalizado, **não** uma segunda fonte de verdade. Essa coluna existe só para que telas de listagem do Admin não precisem re-somar as linhas de `Payment` a cada render. Ela só pode ser escrita pela função de domínio de registro de pagamento (SCL-220, que chama `deriveShootPaymentStatus()` de `domain/payments`, Task 5 deste plano) — nunca editável diretamente pelo usuário. A fonte de verdade real é sempre a soma das linhas `Payment` confirmadas deste ensaio; ver PRD §7.5 e a função de derivação da task de Payment para o cálculo real. Este mesmo comentário está reproduzido verbatim em `db/schema/shoots.ts`.
- Mesmo padrão de FK explícita das tasks anteriores (SCL-100, SCL-101): `npm run db:generate` confirmou "0 fks" gerados para as 5 tabelas do schema (`shoots` incluída), então ambas as constraints (`shoots_client_id_fkey`, `shoots_experience_package_id_fkey`) foram acrescentadas como statements escritos à mão no mesmo arquivo gerado (`0009_happy_pixie.sql`), e verificadas por query direta a `pg_constraint` no projeto Supabase real (não só pelo exit code do `db:migrate`).
- `db/migrations/meta/_journal.json`: `idx 9` (`0009_happy_pixie`) recebeu `when` gerado automaticamente pelo próprio `drizzle-kit generate`; `idx 10` (`0010_shoots_rls`, migration de RLS escrita à mão) recebeu `Date.now()` capturado manualmente no momento da edição. Ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` antes de cada `db:migrate` — nenhuma recorrência do bug de timestamp futuro descoberto em SCL-102.
- `canTransitionShootStatus()` (`domain/shoots/status.ts`) não toca o banco — `ShootStatus` é derivado do próprio `shootStatusEnum.enumValues` do Drizzle (`db/schema/shoots.ts`), mesmo padrão de `domain/leads/status.ts`. A regra é mais complexa que a de Lead: pipeline linear de 7 estágios, `cancelado` alcançável de qualquer estágio não-terminal (inclusive pós-`realizado`, já que o cliente pode cancelar edição/entrega), `reagendado` alcançável só de `reserva`/`preparacao` (pré-ensaio — depois que o ensaio aconteceu, "reagendar" deixa de fazer sentido), e `reagendado → reserva` como único caminho de volta ao pipeline principal.
- `domain/shoots/schema.ts` exporta `CreateShootInput` como `z.input<typeof createShootSchema>`, não `z.infer` (o brief citava `z.infer` no snippet, mas a decisão registrada em `docs/DECISIONS.md`, 2026-09-04, já cobre "qualquer schema futuro deste plano" com campo `.default()`) — aqui há três campos assim (`status`, `paymentStatus`, `portalEnabled`).
- Desvio pontual do brief, restrito às strings de fixture do teste: os testes de UUID do brief usavam literais como `"00000000-0000-0000-0000-000000000001"`, que a versão de `zod` instalada neste repositório (4.5.4) rejeita — seu validador `.uuid()` exige um nibble de versão `1-8` na terceira posição (exceto os casos especiais all-zero/all-f), e `...0001` não satisfaz isso. Trocado por UUIDs v4-válidos (`"00000000-0000-4000-8000-000000000001"`/`"...002"`) em `tests/domain/shoots.test.ts` — mesma estrutura de teste do brief, só a string do fixture mudou; `createShootSchema`/`domain/shoots/schema.ts` permanecem exatamente como especificado (`z.string().uuid()`).
- `agreedPrice` permanece string ponta a ponta: `numeric("agreed_price", ...)` no Drizzle, `z.string().regex(...)` no Zod, sem nenhuma conversão numérica em `domain/shoots/service.ts` — confirmado por leitura de todo o caminho create→insert.
- `createShoot()` é um insert puro (parse + insert + returning), sem nenhuma orquestração de `ProductionJob`/checklist de `PreparationTask` — essa composição é explicitamente escopo de SCL-211 (Epic 2), que vai chamar `createShoot()` junto com os helpers de Task 6/7 dentro de uma transação, quando a UI de Admin de fato precisar disso.

**Blocker/Hand-off notes**

- concluído: schema, migrations (0009 gerada + 2 FKs manuais, 0010 RLS manual), módulo de domínio (`schema.ts`/`service.ts`/`status.ts`) e testes (TDD RED→GREEN, transições primeiro conforme o brief, depois Zod/service) completos. `npm run test` (54/54), `npm run typecheck`, `npm run lint` (0 erros, 2 warnings pré-existentes do padrão de desestruturação do próprio brief), `npm run build` verdes. Verificado contra o Supabase real (não só pelo exit code): 14 colunas de `shoots`, ambas as FKs (`shoots_client_id_fkey` → `clients(id)`, `shoots_experience_package_id_fkey` → `experience_packages(id)`) presentes em `pg_constraint`, RLS habilitada (`relrowsecurity = true`), policy `shoots_staff_access` presente em `pg_policy`, e ambas as entradas de migration (`idx 9`/`idx 10`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. Esta task não inclui teste de integração real contra o banco (mesmo padrão de SCL-101) — o brief só pede testes puros de transição de status e de Zod/schema.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/shoot-status.test.ts` (6 casos, TDD RED→GREEN) + `tests/domain/shoots.test.ts` (5 casos, TDD RED→GREEN, com fixtures de UUID v4-válidas por causa da versão de `zod` instalada) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-104 (Payment/Expense), SCL-105 (PreparationTask) e SCL-106 (ProductionJob) já podem começar, todas com FK para `shoots.id`. SCL-104/SCL-220 em particular devem ler a nota de design sobre `shoots.payment_status` acima antes de implementar qualquer escrita nessa coluna.

---

### SCL-104 — Schema Payment/Expense + derivação de saldo/status financeiro

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103
- Blocks: SCL-220
- Files/Scope: `db/schema/payments.ts`, `db/schema/expenses.ts`, `db/schema/index.ts`, `db/migrations/0011_brown_sentry.sql`, `db/migrations/0012_payments_and_expenses_rls.sql`, `db/migrations/meta/_journal.json`, `domain/payments/schema.ts`, `domain/payments/service.ts`, `domain/payments/balance.ts`, `tests/domain/balance.test.ts`, `tests/domain/payments.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar as tabelas `payments` (com FK obrigatória para `shoots`) e `expenses` (independente, sem FK — PRD §7.5), e a lógica pura de derivação financeira (`calculateBalance()`/`deriveShootPaymentStatus()`) que é a prioridade nº1 de teste unitário de todo o produto (PRD §15: "cálculo de saldo... status financeiro"), garantindo que `saldo = valor_acordado - soma(pagamentos confirmados)` nunca seja duplicado como um segundo valor digitado à mão em nenhum lugar do sistema.

**Acceptance criteria**

- [x] `payments` com `shoot_id` `NOT NULL` + FK `payments_shoot_id_fkey` → `shoots.id`; `expenses` sem FK (registro financeiro independente por ensaio, PRD §7.5);
- [x] todos os campos monetários como `numeric(10,2)`/string ponta a ponta (Drizzle `numeric`, Zod `decimalString` regex), nunca `number`;
- [x] `calculateBalance(agreedPrice, payments)` — soma apenas pagamentos `confirmado`, ignora `pendente`/`estornado`, saldo negativo (overpayment) não é clampado em zero;
- [x] `deriveShootPaymentStatus(agreedPrice, payments)` — deriva só os 3 estados calculáveis a partir da soma (`nao_iniciado`/`parcial`/`pago`); `reembolsado`/`cancelado` são eventos explícitos fora do escopo desta função (ver nota abaixo);
- [x] validação de input (`createPaymentSchema`/`createExpenseSchema`, Zod, testado via TDD);
- [x] testes puros de aritmética/derivação (`tests/domain/balance.test.ts`: 8 casos, incluindo overpayment e o caso "ignora pendente e estornado") + testes de Zod/schema (`tests/domain/payments.test.ts`: 4 casos), ambos TDD RED→GREEN;
- [x] `createPayment()`/`createExpense()` são inserts puros — nenhuma orquestração de recálculo de `shoots.payment_status` (deliberadamente adiada para SCL-220, Epic 2);
- [x] RLS habilitada em ambas as tabelas com policy `*_staff_access` (`public.is_staff_or_admin()`), verificada por query direta ao Postgres real.

**Implementation notes**

- **Nota para o implementador de SCL-220 (Registrar pagamento)**: não reimplemente a aritmética de saldo/status inline. Importe `calculateBalance()` e `deriveShootPaymentStatus()` diretamente de `domain/payments/balance.ts` — ambas são funções puras (sem I/O), já cobertas por 8 casos de teste (incluindo o caso de overpayment com saldo negativo não-clampado e o caso "ignora pendente e estornado"), e são a única fonte de verdade para essa regra (PRD §7.5). SCL-220 é responsável por orquestrar a transação "registrar pagamento + recalcular e persistir `shoots.payment_status`" — este task só garante que o cálculo em si esteja correto e testado isoladamente.
- Mesmo padrão de FK explícita das tasks anteriores: `npm run db:generate` confirmou "0 fks" para `payments`/`expenses`, então `payments_shoot_id_fkey` foi acrescentada como statement escrito à mão no arquivo gerado (`0011_brown_sentry.sql`); `expenses` não recebeu nenhuma FK, por design (PRD §7.5: despesa é registro independente por ensaio, não vinculado a nenhum `shoot` específico).
- `db/migrations/meta/_journal.json`: `idx 11` (`0011_brown_sentry`, gerada) recebeu `when` automático do próprio `drizzle-kit generate`; `idx 12` (`0012_payments_and_expenses_rls`, RLS escrita à mão, cobrindo as duas tabelas no mesmo arquivo) recebeu `Date.now()` capturado manualmente. Ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` antes de cada `db:migrate`.
- Desvio pontual do brief, mecânico e não relacionado à aritmética financeira: o brief especificava `paidAt: timestamp("paid_at", { withTimezone: true })` sem `mode`, mas o modo default do Drizzle para `timestamp()` é `"date"` (retorna/aceita `Date`), enquanto `domain/payments/schema.ts` trata `paidAt` como `z.string().optional()` (ISO datetime) — mesmo padrão de string ponta a ponta usado para `shootDate`/`agreedPrice` em `shoots`. Isso quebrava `npm run typecheck` em `domain/payments/service.ts` (`string` não atribuível a `Date | SQL | Placeholder | null | undefined`). Corrigido acrescentando `mode: "string"` à coluna (`db/schema/payments.ts`) — `mode` é só uma anotação de tipo do lado do driver/TS, não afeta a coluna SQL gerada (`timestamp with time zone`, inalterada); confirmado rodando `npm run db:generate` de novo após o ajuste, que reportou "No schema changes, nothing to migrate".
- Aritmética de ponto fixo em centavos (`toCents`/`fromCents`/`sumConfirmed`, `domain/payments/balance.ts`) verificada manualmente, não só pelos testes: `calculateBalance("1000.00", [{amount:"1200.00", status:"confirmado"}])` → `toCents("1000.00")=100000`, `sumConfirmed=120000`, `100000-120000=-20000`, `fromCents(-20000)` → sinal `"-"`, `abs=20000`, `whole=200`, `fraction="00"` → `"-200.00"` (bate com o teste, sem artefato de arredondamento). Round-trip de string decimal negativa também verificado à mão (`toCents("-200.50")` → `-20050` → `fromCents(-20050)` → `"-200.50"`).
- `domain/payments/schema.ts` exporta `CreatePaymentInput`/`CreateExpenseInput` como `z.input<typeof ...>`, não `z.infer` (mesmo padrão de `docs/DECISIONS.md`, 2026-09-04, e de `domain/clients|leads|shoots/schema.ts`) — `status`/`recurring` têm `.default()`.
- Sem teste de integração contra o banco real nesta task (mesmo padrão de SCL-101/SCL-103) — o brief só pede testes puros de aritmética/derivação e de Zod/schema; a verificação contra o Supabase real foi feita por query direta (colunas, FK, RLS, policies, `drizzle.__drizzle_migrations`), não só pelo exit code do `db:migrate`.

**Blocker/Hand-off notes**

- concluído: schemas (`payments`/`expenses`), migrations (0011 gerada + FK manual, 0012 RLS manual cobrindo as duas tabelas), módulo de domínio (`schema.ts`/`service.ts`/`balance.ts`) e testes (TDD RED→GREEN, aritmética/derivação primeiro conforme o brief, depois Zod/service) completos. `npm run test` (66/66), `npm run typecheck`, `npm run lint` (0 erros, 3 warnings pré-existentes do padrão de desestruturação já visto em SCL-103), `npm run build` verdes. Verificado contra o Supabase real: colunas de `payments` (9) e `expenses` (10), FK `payments_shoot_id_fkey` → `shoots(id)` presente em `pg_constraint` (nenhuma FK em `expenses`, por design), RLS habilitada (`relrowsecurity = true`) em ambas, policies `payments_staff_access`/`expenses_staff_access` presentes em `pg_policies`, e ambas as entradas de migration (`idx 11`/`idx 12`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. `createPayment()` deliberadamente não chama `deriveShootPaymentStatus()` nem escreve em `shoots.payment_status` — essa orquestração é escopo de SCL-220 (Epic 2).
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/balance.test.ts` (8 casos, TDD RED→GREEN, cobrindo full-balance/parcial/exato/overpayment para `calculateBalance` e os 3 estados + caso "ignora pendente/estornado" para `deriveShootPaymentStatus`) + `tests/domain/payments.test.ts` (4 casos, TDD RED→GREEN) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-220 (Registrar pagamento) já pode começar, importando `calculateBalance()`/`deriveShootPaymentStatus()` de `domain/payments/balance.ts` diretamente (ver nota de implementação acima) em vez de reimplementar a aritmética.

---

### SCL-105 — Schema PreparationTask

- Status: DONE
- Priority: P1
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103
- Blocks: SCL-211, SCL-302
- Files/Scope: `db/schema/preparation-tasks.ts`, `db/schema/index.ts`, `db/migrations/0013_empty_donald_blake.sql`, `db/migrations/0014_preparation_tasks_rls.sql`, `db/migrations/meta/_journal.json`, `domain/preparation/schema.ts`, `domain/preparation/service.ts`, `tests/domain/preparation-tasks.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `preparation_tasks` (com FK obrigatória para `shoots`), representando o checklist de preparação de cada ensaio (moodboard, figurino, clutch, make, pagamento, etc. — PRD §7.6/§7.7). Cada linha é uma tarefa avulsa com `status` (`pendente`/`em_andamento`/`concluida`) e uma flag `visible_to_client` que controla o que aparece no futuro portal da cliente (Epic 3).

**Acceptance criteria**

- [x] `preparation_tasks` com `shoot_id` `NOT NULL` + FK `preparation_tasks_shoot_id_fkey` → `shoots.id`;
- [x] `status` como enum Postgres (`preparation_task_status`: `pendente`/`em_andamento`/`concluida`), default `'pendente'`;
- [x] `visible_to_client` boolean, default `true`;
- [x] `due_at`/`completed_at` como `timestamp with time zone`, nulável, tratados como string ISO ponta a ponta (Zod `z.string().optional()`), mesmo padrão de `paidAt` em `domain/payments`;
- [x] validação de input (`createPreparationTaskSchema`, Zod, testado via TDD, 4 casos);
- [x] `createPreparationTask()` é um insert puro (parse + insert + returning), sem nenhuma regra de transição de status — esta task não define regras de negócio para `PreparationTask`, só o schema e o CRUD mínimo (create + list);
- [x] `getPreparationTasksByShootId()` retorna um array (`PreparationTask[]`), não uma linha única — primeira função de leitura em lista do plano até aqui, já que um ensaio tem várias tarefas de preparação;
- [x] RLS habilitada com policy `preparation_tasks_staff_access` (`public.is_staff_or_admin()`), verificada por query direta ao Postgres real. (Uma cliente lendo só as tarefas do próprio ensaio com `visible_to_client = true` é escopo do Epic 3, mesma lógica de adiamento das Tasks 2 e 4.)

**Implementation notes**

- Mesmo padrão de FK explícita das tasks anteriores: `npm run db:generate` confirmou "0 fks" para `preparation_tasks`, então `preparation_tasks_shoot_id_fkey` foi acrescentada como statement escrito à mão no arquivo gerado (`0013_empty_donald_blake.sql`).
- `db/migrations/meta/_journal.json`: `idx 13` (`0013_empty_donald_blake`, gerada) recebeu `when` automático do próprio `drizzle-kit generate`; `idx 14` (`0014_preparation_tasks_rls`, RLS escrita à mão) recebeu `Date.now()` capturado manualmente, estritamente maior que o `when` do `idx 13`. Ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` antes de cada `db:migrate`.
- Desvio pontual do brief, aplicado proativamente desde o início (mesma classe de bug já diagnosticada na Task 5/SCL-104, não redescoberta aqui): o brief especificava `dueAt`/`completedAt` como `timestamp(..., { withTimezone: true })` sem `mode`, o que o Drizzle infere como `Date` no TypeScript, enquanto `domain/preparation/schema.ts` trata os dois campos como `z.string().optional()` (ISO string) ponta a ponta. Corrigido acrescentando `mode: "string"` às duas colunas (`db/schema/preparation-tasks.ts`) antes de rodar `npm run typecheck` pela primeira vez. Confirmado que o fix é realmente necessário (não só assumido): removendo `mode: "string"` temporariamente, `npm run typecheck` falha com `Type 'string' is not assignable to type 'SQL<unknown> | Date | Placeholder<...> | null | undefined'` em `domain/preparation/service.ts`, exatamente o erro visto em SCL-104 para `paidAt`; restaurado o fix, typecheck volta a passar limpo. `mode` é só anotação de tipo do lado do driver/TS — a coluna SQL gerada (`timestamp with time zone`) e o diff de migration não mudam com ou sem `mode` (confirmado: `0013_empty_donald_blake.sql` gerado com o fix já em vigor bate exatamente com o SQL literal do brief).
- `domain/preparation/schema.ts` exporta `CreatePreparationTaskInput` como `z.input<typeof createPreparationTaskSchema>`, não `z.infer` (mesmo padrão de `docs/DECISIONS.md`, 2026-09-04) — `status` e `visibleToClient` têm `.default()`.
- Sem teste de integração contra o banco real nesta task (mesmo padrão de SCL-101/SCL-103/SCL-104) e sem função pura de lógica de negócio — `PreparationTask` não tem regras de transição de status nesta task, só `createPreparationTask()`/`getPreparationTasksByShootId()`. Verificação contra o Supabase real feita por query direta (colunas, FK, RLS, policy, `drizzle.__drizzle_migrations`), não só pelo exit code do `db:migrate`.

**Blocker/Hand-off notes**

- concluído: schema (`preparationTasks`), migrations (0013 gerada + FK manual, 0014 RLS manual), módulo de domínio (`schema.ts`/`service.ts`) e teste (TDD RED→GREEN) completos. `npm run test` (70/70), `npm run typecheck`, `npm run lint` (0 erros, 5 warnings pré-existentes do mesmo padrão de desestruturação já visto em SCL-103/SCL-104), `npm run build` verdes. Verificado contra o Supabase real: 9 colunas de `preparation_tasks`, FK `preparation_tasks_shoot_id_fkey` → `shoots(id)` presente em `pg_constraint`, RLS habilitada (`relrowsecurity = true`), policy `preparation_tasks_staff_access` presente em `pg_policies`, e ambas as entradas de migration (`idx 13`/`idx 14`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. Nenhuma regra de transição de status nem orquestração com `shoots`/`ProductionJob` — essa composição é escopo de SCL-211 (Epic 2), que vai chamar `createPreparationTask()` junto com os helpers de Task 5/7 dentro de uma transação, quando a UI de Admin de fato precisar disso (mesma nota de escopo já registrada em SCL-103 para `createShoot()`).
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/preparation-tasks.test.ts` (4 casos: aceita mínimo válido, aplica defaults de `status`/`visibleToClient`, rejeita `title`/`shootId` ausentes — TDD RED→GREEN) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-211 (Criar ensaio ponta a ponta) e SCL-302 (Home cliente + progresso) já podem começar, importando `createPreparationTask()`/`getPreparationTasksByShootId()` de `domain/preparation/service.ts` diretamente.

---

### SCL-106 — Schema ProductionJob + regras de transição de status

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103
- Blocks: SCL-211, SCL-230
- Files/Scope: `db/schema/production-jobs.ts`, `db/schema/index.ts`, `db/migrations/0015_early_rogue.sql`, `db/migrations/0016_production_jobs_rls.sql`, `db/migrations/meta/_journal.json`, `domain/production/schema.ts`, `domain/production/service.ts`, `domain/production/status.ts`, `tests/domain/production-jobs.test.ts`, `tests/domain/production-status.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `production_jobs`, relação 1:1 com `shoots` (`shoot_id` `NOT NULL` + `UNIQUE`), representando o pipeline de pós-produção/edição de cada ensaio (PRD §7.6, Kanban de Produção da SCL-230), e a lógica pura de transição de status (`canTransitionProductionStatus()`) que valida o pipeline `aguardando → iniciado → parcial → finalizado → entregue`.

**Acceptance criteria**

- [x] `production_jobs` com `shoot_id` `NOT NULL` + `UNIQUE` (relação 1:1 com Shoot) + FK `production_jobs_shoot_id_fkey` → `shoots.id`;
- [x] `editor_user_id` opcional (nulável) + FK `production_jobs_editor_user_id_fkey` → `profiles.id` (sem `NOT NULL` — job pode existir antes de um editor ser designado);
- [x] `status` como enum Postgres (`production_job_status`: `aguardando`/`iniciado`/`parcial`/`finalizado`/`entregue`), default `'aguardando'`;
- [x] `delivery_due_at`/`delivery_at` como `date` (não `timestamp`), nulável, tratados como string ISO ponta a ponta (Zod `z.string().optional()`) — sem o gap de `mode` visto em SCL-104/SCL-105, porque `date()` do Drizzle já infere `string` por padrão (confirmado em `node_modules/drizzle-orm/pg-core/columns/date.js`), diferente de `timestamp()`;
- [x] `canTransitionProductionStatus()` (`domain/production/status.ts`) implementa o pipeline linear de 5 estágios, com `entregue` como único estado terminal, rejeita transições de "pular estágio" (`aguardando→finalizado`, `iniciado→entregue`), rejeita no-op (`from === to`), **e permite deliberadamente `iniciado→finalizado` pulando `parcial`** (ver Implementation notes abaixo — única exceção documentada nas regras de transição desta task);
- [x] validação de input (`createProductionJobSchema`, Zod, testado via TDD, 3 casos);
- [x] `createProductionJob()`/`getProductionJobByShootId()` são funções mínimas (insert puro + leitura por `shoot_id`) — sem update/delete/list, mesmo padrão de escopo mínimo das Tasks 5/6;
- [x] testes puros de transição de status (`tests/domain/production-status.test.ts`: 5 casos, incluindo o caso de skip deliberado) + testes de Zod/schema (`tests/domain/production-jobs.test.ts`: 3 casos), ambos TDD RED→GREEN;
- [x] RLS habilitada com policy `production_jobs_staff_access` (`public.is_staff_or_admin()`), verificada por query direta ao Postgres real.

**Implementation notes**

- **Desvio deliberado da PRD, não um bug**: o diagrama da PRD mostra um pipeline estritamente linear (`aguardando → iniciado → parcial → finalizado → entregue`), mas `canTransitionProductionStatus()` permite `iniciado → finalizado` pulando `parcial` diretamente. Motivo: `parcial` representa uma entrega parcial de lote de fotos (útil para ensaios grandes com múltiplas entregas), que nem todo job tem — um ensaio pequeno pode terminar toda a edição em uma única passada, e forçar esse job por um estado `parcial` que nunca de fato ocorreu misrepresentaria o status real de produção. Esta é a única exceção às regras de transição desta task; toda transição "pule um estágio" — `aguardando→finalizado`, `iniciado→entregue`, `parcial→entregue` (implícito, `toIndex - fromIndex` > 1 sem ser o caso especial `iniciado→finalizado`) — continua rejeitada. Testado explicitamente em `tests/domain/production-status.test.ts` ("allows iniciado to skip directly to finalizado").
- Mesmo padrão de FK explícita das tasks anteriores: `npm run db:generate` confirmou "0 fks" para `production_jobs` (mas **1** constraint `UNIQUE` — `production_jobs_shoot_id_unique`, gerada corretamente a partir do `.unique()` do schema Drizzle, statement `CONSTRAINT ... UNIQUE("shoot_id")` dentro do próprio `CREATE TABLE`). Ambas as FKs (`production_jobs_shoot_id_fkey`, `production_jobs_editor_user_id_fkey`) foram acrescentadas como statements escritos à mão, logo após o `CREATE TABLE`, no mesmo arquivo gerado (`0015_early_rogue.sql`) — sem duplicar a constraint `UNIQUE` já gerada.
- `db/migrations/meta/_journal.json`: `idx 15` (`0015_early_rogue`, gerada) recebeu `when` automático do próprio `drizzle-kit generate`; `idx 16` (`0016_production_jobs_rls`, RLS escrita à mão) recebeu `Date.now()` capturado manualmente, estritamente maior que o `when` do `idx 15`. Ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` antes de cada `db:migrate`.
- `domain/production/schema.ts` exporta `CreateProductionJobInput` como `z.input<typeof createProductionJobSchema>`, não `z.infer` (o brief citava `z.infer` no snippet, mas a decisão registrada em `docs/DECISIONS.md`, 2026-09-04, cobre "qualquer schema futuro deste plano" com campo `.default()`) — `status` tem `.default("aguardando")`.
- `ProductionJobStatus` (`domain/production/status.ts`) é derivado do próprio `productionJobStatusEnum.enumValues` do Drizzle (`db/schema/production-jobs.ts`), mesmo padrão de `domain/shoots/status.ts`/`domain/leads/status.ts` — nenhuma lista de status duplicada à mão.
- Sem teste de integração contra o banco real nesta task (mesmo padrão de SCL-101/SCL-103/SCL-104/SCL-105) — o brief só pede testes puros de transição de status e de Zod/schema. Verificação contra o Supabase real feita por query direta (colunas, ambas as FKs, constraint `UNIQUE`, RLS, policy, `drizzle.__drizzle_migrations`), não só pelo exit code do `db:migrate`.

**Blocker/Hand-off notes**

- concluído: schema (`productionJobs`), migrations (0015 gerada + 2 FKs manuais, 0016 RLS manual), módulo de domínio (`schema.ts`/`service.ts`/`status.ts`) e testes (TDD RED→GREEN, transições primeiro conforme o brief, depois Zod/service) completos. `npm run test` (78/78), `npm run typecheck`, `npm run lint` (0 erros, 5 warnings pré-existentes do mesmo padrão de desestruturação já visto em SCL-103/SCL-104/SCL-105), `npm run build` verdes. Verificado contra o Supabase real por query direta (não só pelo exit code): 10 colunas de `production_jobs`, ambas as FKs (`production_jobs_shoot_id_fkey` → `shoots(id)`, `production_jobs_editor_user_id_fkey` → `profiles(id)`) presentes em `pg_constraint`, constraint `production_jobs_shoot_id_unique` (`UNIQUE (shoot_id)`) presente em `pg_constraint`, RLS habilitada (`relrowsecurity = true`), policy `production_jobs_staff_access` presente em `pg_policies`, e ambas as entradas de migration (`idx 15`/`idx 16`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. Nenhuma orquestração com `shoots`/`preparation_tasks` — essa composição é escopo de SCL-211 (Epic 2), que vai chamar `createProductionJob()` junto com os helpers das Tasks 5/6 dentro de uma transação, quando a UI de Admin de fato precisar disso (mesma nota de escopo já registrada em SCL-103/SCL-105).
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/production-status.test.ts` (5 casos: pipeline linear em ordem, rejeita pular estágio, rejeita sair do estado terminal, rejeita no-op, permite o skip deliberado `iniciado→finalizado` — TDD RED→GREEN) + `tests/domain/production-jobs.test.ts` (3 casos: aceita mínimo válido, aplica default de `status`, rejeita `shootId` ausente — TDD RED→GREEN) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: SCL-211 (Criar ensaio ponta a ponta) e SCL-230 (Kanban Produção) já podem começar, importando `createProductionJob()`/`getProductionJobByShootId()`/`canTransitionProductionStatus()` de `domain/production/` diretamente.

---

### SCL-107 — Schema AuditLog

- Status: DONE
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-005
- Blocks: nenhuma task do backlog atual depende diretamente de SCL-107 (Epic 2 vai chamar `recordAuditEvent()` a partir das ações de mutação financeira/status — PRD §12 — mas nenhuma dessas tasks está detalhada neste plano ainda)
- Files/Scope: `db/schema/audit-log.ts`, `db/schema/index.ts`, `db/migrations/0017_slow_black_cat.sql`, `db/migrations/0018_audit_log_rls.sql`, `db/migrations/meta/_journal.json`, `domain/audit/service.ts`, `tests/domain/audit.test.ts`
- Migration: yes
- Updated at: 2026-09-04

**Goal**

Criar a tabela `audit_log` — um registro append-only e tamper-evident de "operações críticas" (PRD §12) — e `recordAuditEvent()`, que as ações de mutação financeira/status do Epic 2 vão chamar para gravar snapshots de antes/depois. Última task do Epic 1.

**Acceptance criteria**

- [x] schema Drizzle criado (`audit_log`: `actor_user_id` nulável referenciando `profiles` — nulo significa ação automatizada/sistema —, `action`, `entity_type`, `entity_id` obrigatórios, `before`/`after` como `jsonb` nuláveis, `created_at`);
- [x] migration gerada por `db:generate` (`0017_slow_black_cat.sql`) confirmada sem FK auto-inferida (Drizzle não expressa `references()` implícito); FK `audit_log_actor_user_id_fkey` → `profiles.id` adicionada como statement escrito à mão no mesmo arquivo, aplicada e confirmada via `pg_constraint` no projeto Supabase real;
- [x] RLS habilitada em `audit_log` (`0018_audit_log_rls.sql`) com **assimetria deliberada** em relação a toda outra tabela deste epic: nenhuma policy `for all` de staff — só uma policy `audit_log_admin_read` (`for select`, via `public.is_admin()`, não `public.is_staff_or_admin()`), mais um `revoke insert, update, delete on table "audit_log" from "authenticated", "anon"` explícito. Confirmado por query direta ao Postgres real: `pg_policies` mostra exatamente 1 policy (SELECT-only, `is_admin()`), e `information_schema.role_table_grants` confirma ausência de INSERT/UPDATE/DELETE para `authenticated`/`anon`;
- [x] nenhum schema Zod criado — `recordAuditEvent()` é chamada internamente por outros módulos de domínio (Epic 2), não a partir de input externo não confiável, então o tipo TypeScript de `RecordAuditEventInput` é a própria fronteira de validação (decisão explícita do brief, não uma omissão);
- [x] `recordAuditEvent()` (`domain/audit/service.ts`) é um insert puro (parse implícito via tipo + insert + returning) — sem update/delete/list;
- [x] teste de integração real (`tests/domain/audit.test.ts`) grava uma linha com snapshots `before`/`after`, lê de volta os campos, e remove a própria linha em `afterAll` — confirmado por query direta ao Postgres que a tabela fica sem a linha de teste depois.

**Implementation notes**

- Mesmo padrão de FK explícita das tasks anteriores: `npm run db:generate` confirmou "0 fks" para `audit_log`, então `audit_log_actor_user_id_fkey` foi acrescentada como statement escrito à mão no arquivo gerado (`0017_slow_black_cat.sql`).
- `db/migrations/meta/_journal.json`: `idx 17` (`0017_slow_black_cat`, gerada) recebeu `when` automático do próprio `drizzle-kit generate`; `idx 18` (`0018_audit_log_rls`, RLS escrita à mão) recebeu `Date.now()` capturado manualmente, estritamente maior que o `when` do `idx 17`. Ambos monotônicos e não futuros, confirmados pelo hook `predb:migrate` antes de cada `db:migrate`.
- Diferente de toda outra tabela deste epic (`clients`, `leads`, `shoots`, `payments`, `expenses`, `preparation_tasks`, `production_jobs`), `audit_log` não recebe a policy padrão `*_staff_access` (`for all` via `public.is_staff_or_admin()`). Um log de auditoria append-only e tamper-evident não pode ter `staff` com UPDATE/DELETE via Data API — só admins podem ler (`public.is_admin()`, o helper original do P0, não o `is_staff_or_admin()` deste epic), e ninguém (nem admin) tem INSERT/UPDATE/DELETE via Data API. Escritas acontecem exclusivamente por `domain/audit/service.ts`, através da conexão `DATABASE_URL`/`postgres` da aplicação, que não está sujeita a RLS (`docs/DECISIONS.md`, decisão C4) — por isso o `revoke` é redundante com a ausência de policy de escrita (RLS nega por padrão quando nenhuma policy casa com o comando), mas explícito por design para deixar a intenção auditável no próprio schema, não só implícita pela ausência de uma policy.
- Verificação adicional feita nesta task, além do que os outros 7 tasks do epic já verificam: consulta a `information_schema.role_table_grants` (não só `pg_policies`) para confirmar que INSERT/UPDATE/DELETE estão de fato ausentes para `authenticated`/`anon` a nível de GRANT, não só bloqueados por RLS. Achado incidental, não um bug desta task: o ACL base (`pg_class.relacl`) de `audit_log` já não concede SELECT/INSERT/UPDATE/DELETE a `anon`/`authenticated` por padrão neste projeto Supabase (só `REFERENCES`/`TRIGGER`/`TRUNCATE`/`MAINTAIN`) — mesmo comportamento confirmado em `clients`/`shoots`, ou seja, uma característica pré-existente do projeto em todas as tabelas do epic, não algo introduzido ou revertido por esta task.
- `tests/domain/audit.test.ts` é um teste de integração contra o banco real (mesma categoria do teste de `createClient`/`getClientById` em SCL-100), então recebeu o mesmo guard `describeIfLiveDb` (`process.env.DATABASE_URL ? describe : describe.skip`) que SCL-100 estabeleceu — o brief original não incluía esse guard; adicionado porque CI (`npm run test` sem `DATABASE_URL`) quebraria a cada execução sem ele.

**Blocker/Hand-off notes**

- concluído: schema (`auditLog`), migrations (0017 gerada + FK manual, 0018 RLS manual com policy admin-only e revoke explícito), módulo de domínio (`domain/audit/service.ts`, só `recordAuditEvent()`) e teste de integração completos. `npm run test` (79/79 com `.env.local`; suíte de audit pula graciosamente sem `DATABASE_URL`, confirmado rodando sem a env var), `npm run typecheck`, `npm run lint` (0 erros, 5 warnings pré-existentes de outras tasks), `npm run build` verdes. Verificado contra o Supabase real por query direta (não só pelo exit code): 8 colunas de `audit_log`, FK `audit_log_actor_user_id_fkey` → `profiles(id)` presente em `pg_constraint`, RLS habilitada (`relrowsecurity = true`), exatamente 1 policy (`audit_log_admin_read`, `cmd = SELECT`, `qual = is_admin()`) em `pg_policies`, `information_schema.role_table_grants` confirmando ausência de INSERT/UPDATE/DELETE para `authenticated`/`anon`, e ambas as entradas de migration (`idx 17`/`idx 18`) registradas em `drizzle.__drizzle_migrations`.
- falta: nada pendente nesta task. Última task do Epic 1 — Epic 1 ("Core de Dados") está completo (SCL-100 a SCL-108, todas `DONE`).
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/audit.test.ts` (1 caso, integração real com `afterAll` de limpeza, guardado por `describeIfLiveDb`) + verificação por query direta ao Postgres real em 2026-09-04.
- próximo passo: nenhum bloqueio direto no backlog atual depende de SCL-107; fica disponível para as ações de mutação financeira/status do Epic 2 (ainda não detalhadas neste plano) chamarem `recordAuditEvent()` diretamente. Revisão de consistência de `Depends on`/`Blocks` feita nesta task em todo o Epic 1 (SCL-100–SCL-108): corrigido `Blocks` de SCL-102, que citava só `SCL-103` mas faltava `SCL-108` (Seeds de experiências, que também depende de SCL-102 conforme o Quadro resumido). Nenhuma outra inconsistência encontrada nas próprias linhas do Epic 1; `SCL-200`'s `Depends on: SCL-007,SCL-009` (Epic 2) provavelmente vai ganhar `SCL-100` quando o planejamento do Epic 2 começar, mas isso é trabalho do próximo plano, não desta task.

---

### SCL-200 — Shell Admin

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-007, SCL-009, SCL-100
- Blocks: SCL-202, SCL-203, SCL-210, SCL-220, SCL-230 (toda tela do Studio OS)
- Files/Scope: `lib/cn.ts`, `lib/money.ts`, `lib/format.ts`, `lib/auth/admin-action.ts`, `scripts/check-admin-auth.mjs`, `components/ui/*` (field, input, textarea, select, card, badge, data-table, modal, page-header, empty-state), `components/admin/admin-nav.tsx`, `components/admin/sign-out-button.tsx`, `app/admin/(protected)/sign-out.ts`, `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`, `app/globals.css`, `package.json`, `.github/workflows/ci.yml`, `domain/payments/balance.ts` (refactor), `tests/lib/{money,format,admin-action}.test.ts`, `tests/scripts/check-admin-auth.test.ts`
- Migration: no
- Updated at: 2026-09-05

**Goal**

Primeira task do Epic 2 (Studio OS): a casca do admin (layout com sidebar + nav + sign-out), o conjunto de primitivas de UI que todas as telas seguintes consomem, o wrapper `defineAdminAction` que toda mutação do Studio OS atravessa, e um guard estrutural de CI (`check-admin-auth.mjs`) que falha o build se uma página escapar do route group `(protected)` ou se um arquivo `"use server"` não passar pelo wrapper.

**Modelo de enforcement de autorização**

Três camadas, verificáveis por máquina:

1. **Leituras** — toda página/layout/route do admin vive sob `app/admin/(protected)/`, cujo `layout.tsx` roda o guard `getCurrentUser()` + `hasMinimumRole(user.role, "staff")` antes de renderizar qualquer `children`. Uma página fora desse route group renderiza sem guard nenhum.
2. **Escritas** — toda Server Action do Studio OS é criada por `defineAdminAction({ role }, handler)`, que resolve `getCurrentUser()`, aplica `requireRole` (retornando `{ ok: false, error }` em pt-BR em vez de lançar), valida o input com o schema Zod opcional (`{ ok: false, fieldErrors }` no fracasso), e captura qualquer throw do handler em um erro genérico logado via `logger.error` — o handler nunca roda sem um `CurrentUser` autorizado. `toFormAction` adapta o resultado para a assinatura `useActionState` do React 19 (dropa strings vazias, coage `numbers`, trata `booleans` como presença de checkbox).
3. **Guard de CI** — `scripts/check-admin-auth.mjs` (`findAdminAuthViolations(dir)`, testado; rodado por `npm run check:admin-auth`, plugado no `ci.yml` logo após `npm run lint`) faz um walk estático em `app/admin/` e falha se: (a) um arquivo declara `"use server"` mas nunca chama `defineAdminAction(`, ou (b) um `page`/`layout`/`route` está fora de `(protected)/`. `app/admin/login/` é o único caminho isento das duas regras — é o ponto de entrada não autenticado (o sign-in não tem `CurrentUser` para atravessar o wrapper, e a página de login renderiza antes de qualquer papel existir).

**Decisões de implementação**

- **Primitivas de UI escritas à mão sobre os tokens do Tailwind v4, não shadcn/ui.** Dez componentes pequenos e sem estado (`Field`, `Input`, `Textarea`, `Select` nativo, `Card`, `Badge`, `DataTable`, `Modal` sobre `<dialog>`, `PageHeader`, `EmptyState`), cada um em seu próprio arquivo, todos consumindo `cn()` (`lib/cn.ts`, um `filter(Boolean).join(" ")` — sem `clsx`/`tailwind-merge`) e os tokens editoriais do protótipo V2.3 (`border-line`, `bg-champ`, `text-muted`, `font-serif`). Novo token `--danger`/`--color-danger` (`#b3261e`) em `app/globals.css` para estados de erro. Ver `docs/DECISIONS.md` (2026-09-05).
- **`lib/money.ts` extraído** (desvio aprovado do brief, que originalmente reimplementava o parse em `lib/format.ts`): `toCents`/`fromCents`/`addDecimal`/`sumCents`, ponto-fixo puro sobre strings decimais (Postgres `numeric`), nunca `parseFloat`. `domain/payments/balance.ts` (Epic 1) foi refatorado para importar `toCents`/`fromCents` daqui em vez de manter cópias privadas; seus exports públicos e `tests/domain/balance.test.ts` seguem verdes e inalterados. `lib/format.ts`'s `formatBRL` normaliza via `fromCents(toCents(value))` antes de agrupar milhares. Ver `docs/DECISIONS.md` (2026-09-05).
- **`app/admin/login/actions.ts` isento do guard `"use server"`.** O brief só isentava `login/` da regra de página/route; o `sign-in` legítimo (usuário anônimo, sem `CurrentUser`) não pode passar por `defineAdminAction`, então a isenção foi estendida às duas regras — mudança mínima para o 4º teste do brief ("real app/admin tree as clean") passar contra o repo atual.

**Blocker/Hand-off notes**

- concluído: `lib/cn.ts`, `lib/money.ts` (+ refactor de `balance.ts`), `lib/format.ts`, `lib/auth/admin-action.ts`, `scripts/check-admin-auth.mjs` (+ script `check:admin-auth` + passo no `ci.yml`), 10 primitivas em `components/ui/`, `components/admin/{admin-nav,sign-out-button}.tsx`, `app/admin/(protected)/sign-out.ts`, casca em `layout.tsx` (guard + comentário existentes preservados verbatim), placeholder em `page.tsx`, token `--danger` em `globals.css`. `npm run test` / `typecheck` / `lint` / `check:admin-auth` / `build` verdes.
- testes: `tests/lib/money.test.ts` (25 casos), `tests/lib/format.test.ts` (7), `tests/lib/admin-action.test.ts` (7), `tests/scripts/check-admin-auth.test.ts` (4) — todos TDD RED→GREEN. `tests/domain/balance.test.ts` (8) segue passando inalterado após o refactor.
- próximo passo: SCL-201 substitui o placeholder de `page.tsx` pelo dashboard real; SCL-202+ constroem as telas sobre as primitivas e o wrapper.

---

### SCL-201 — Dashboard

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-104, SCL-106, SCL-200
- Blocks: —
- Files/Scope: `domain/dashboard/kpis.ts`, `domain/dashboard/queries.ts`, `components/admin/kpi-tile.tsx`, `app/admin/(protected)/page.tsx` (substitui o placeholder de SCL-200), `tests/domain/dashboard-kpis.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Segunda task do Epic 2: substituir o placeholder de `app/admin/(protected)/page.tsx` pelo dashboard real do Studio OS — KPIs do período (mês corrente) e a lista "Ações que exigem atenção", tudo derivado dos dados normalizados (PRD §7.1), sem indicadores armazenados.

**Decisões de implementação**

- **Todos os KPIs são derivados, nada é lido de coluna de indicador.** `computeDashboardKpis` é um reducer puro e testado (`domain/dashboard/kpis.ts`): recebe shoots/payments/expenses do período e devolve `shootsInPeriod`, `billed` (soma dos `agreedPrice`), `received` (só pagamentos `confirmado`), `receivable` (soma por-shoot de `agreedPrice - confirmado`, com clamp em zero por shoot antes de somar), `expenses`, `result` (`received - expenses`), `averageTicket` (`billed / count`, `0.00` sem shoots), `productionInProgress` (`realizado`/`edicao`), `finishedShoots` (`finalizado`/`reveal`/`entregue`).
- **Aritmética em centavos via `@/lib/money`.** `kpis.ts` importa `toCents`/`fromCents` de `@/lib/money` (desvio do brief, que reinlinava cópias privadas byte-idênticas) — mesma convenção de ponto-fixo de `domain/payments/balance.ts`, nunca `parseFloat`.
- **`upcomingDeliveries` e `attention` vêm de `production_jobs` e do `paymentStatus` do shoot, fora do reducer puro.** `getDashboardData` (`domain/dashboard/queries.ts`) faz as leituras Drizzle (guarda de leitura = `app/admin/(protected)/layout.tsx`, sem `defineAdminAction` — read-only), monta o input do reducer, conta production jobs vencidos (`deliveryDueAt <= hoje`, status ainda não `entregue`) para `upcomingDeliveries`, e monta `AttentionItem[]` (`unpaid` para shoots `nao_iniciado`/`parcial`; `delivery_overdue` para os jobs vencidos).
- **Página é Server Component read-only.** `currentMonthRange()` calcula o período em UTC; `KpiTile` (`components/admin/kpi-tile.tsx`) é apresentação pura sobre `Card`.

**Blocker/Hand-off notes**

- concluído: `domain/dashboard/kpis.ts` (reducer puro), `domain/dashboard/queries.ts` (leituras Drizzle + `AttentionItem`), `components/admin/kpi-tile.tsx`, `app/admin/(protected)/page.tsx` (dashboard real no lugar do placeholder). `npm run test` / `typecheck` / `lint` / `check:admin-auth` / `build` verdes.
- testes: `tests/domain/dashboard-kpis.test.ts` (8 casos) — TDD RED (módulo inexistente) → GREEN. Suíte completa: 140 passando, 3 skipped, inalterada fora do novo arquivo.
- próximo passo: SCL-202+ constroem as telas de lista/ficha sobre as mesmas primitivas.

---

### SCL-202 — Lista de clientes

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-200
- Blocks: —
- Files/Scope: `domain/clients/queries.ts`, `app/admin/(protected)/clientes/page.tsx`, `components/admin/search-input.tsx`, `components/admin/pagination.tsx`, `tests/domain/clients-queries.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Terceira task do Epic 2: tela de lista do CRM em `/admin/clientes` — busca por nome/telefone/e-mail/Instagram e paginação server-side (PRD §14), sobre as primitivas de SCL-200 (`DataTable`, `PageHeader`, `EmptyState`, `Input`).

**Decisões de implementação**

- **Query paginada no domínio, `normalizeListParams` como unidade testada.** `domain/clients/queries.ts` exporta `normalizeListParams` (pura: default page 1 / pageSize 25, parse de string de query param, clamp de page em `>= 1` e pageSize em `1..100`, trim de `search` com vazio/whitespace → `undefined`), `buildClientSearchPredicate` (helper puro que devolve `SQL | undefined` — `ilike` em `name`/`phone`/`email`/`instagramHandle`; testado indiretamente via `listClients`) e `listClients` (count + página de linhas, `orderBy(desc(createdAt))`, `limit`/`offset`). `createdAt` é serializado com `::text` para o Server Component.
- **Página é Server Component read-only.** Guarda de leitura = `app/admin/(protected)/layout.tsx`, sem `defineAdminAction`. Lê `searchParams` (Promise, `await`) → a rota é `ƒ` (dynamic) no build, esperado para uma tela que depende da query string. Com a tabela `clients` vazia o build não executa a query (rota dinâmica) e a tela renderiza o `EmptyState` em runtime.
- **`SearchInput` e `Pagination` (`components/admin/`) são criados aqui e reutilizados por SCL-210/SCL-221.** `SearchInput` é Client Component (`useRouter`/`usePathname`/`useSearchParams`), faz `router.push` no submit e reseta `page`. `Pagination` é apresentação pura (links Anterior/Próxima), retorna `null` quando há só uma página.

**Blocker/Hand-off notes**

- concluído: `domain/clients/queries.ts`, `app/admin/(protected)/clientes/page.tsx`, `components/admin/search-input.tsx`, `components/admin/pagination.tsx`. `npm run test` / `typecheck` / `lint` / `check:admin-auth` / `build` verdes.
- testes: `tests/domain/clients-queries.test.ts` (4 casos para `normalizeListParams`) — TDD RED (módulo inexistente) → GREEN. Suíte completa: 144 passando, 3 skipped, inalterada fora do novo arquivo.
- próximo passo: SCL-203 (ficha da cliente) e SCL-210+ constroem sobre `listClients` e os componentes `SearchInput`/`Pagination`.

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

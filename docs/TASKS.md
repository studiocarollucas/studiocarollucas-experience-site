# TASKS — Stúdio Carol Lucas Experience + Studio OS

**Versão:** 2.0 — revisão de cobertura funcional · 07/09/2026
**PRD canônico:** `PRD-Studio-Carol-Lucas-Experience-Studio-OS-v1.1.md`

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

## Revisão 2.0 — escopo faltante identificado

Esta revisão preserva todas as tasks já concluídas e adiciona cobertura explícita para partes do produto que estavam no PRD/protótipos, mas sem backlog operacional completo.

**Novos blocos obrigatórios para fechamento do MVP:**

1. Leads/Comercial: `SCL-250–254`;
2. Quiz persistido + conversão: `SCL-404–406`;
3. Galeria/Reveal/Upsell: `SCL-500–507`;
4. Acervo físico + Paixão Clutch: `SCL-550–558`;
5. Automações/e-mail: `SCL-700–705`;
6. Reviews/indicação: `SCL-720–723`;
7. Futuro registrado: `SCL-800+`.

**Importante:** Styling References (`SCL-305`) não equivale a Acervo físico. A entidade de inspiração não substitui `InventoryItem`/`InventoryReservation`.

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
| SCL-204 | Criar cliente | P1 | admin | DONE | agent:claude-code | SCL-100,SCL-200 |
| SCL-203 | Ficha da cliente | P1 | admin | DONE | agent:claude-code | SCL-100,SCL-200 |
| SCL-210 | Agenda/Ensaios | P1 | admin | DONE | agent:claude-code | SCL-103,SCL-200 |
| SCL-211 | Criar ensaio | P1 | admin | DONE | agent:claude-code | SCL-103,SCL-106,SCL-105 |
| SCL-212 | Ficha do ensaio | P1 | admin | DONE | agent:claude-code | SCL-103,SCL-104,SCL-106,SCL-105,SCL-211 |
| SCL-220 | Registrar pagamento | P1 | finance | DONE | agent:claude-code | SCL-104,SCL-200 |
| SCL-221 | Livro-caixa + dashboard financeiro | P1 | finance | DONE | agent:claude-code | SCL-104,SCL-201,SCL-220 |
| SCL-222 | Despesas | P1 | finance | DONE | agent:claude-code | SCL-104,SCL-221 |
| SCL-230 | Kanban Produção | P1 | production | DONE | agent:claude-code | SCL-106,SCL-200 |
| SCL-231 | Mudar status do ProductionJob | P1 | production | DONE | agent:claude-code | SCL-106,SCL-230 |
| SCL-240 | Checklist de preparação interno | P1 | admin | DONE | agent:claude-code | SCL-105,SCL-212 |
| SCL-300 | Passwordless cliente | P1 | client | DONE | agent:codex | SCL-006,SCL-007 |
| SCL-301 | Shell Minha Experiência | P1 | client | DONE | agent:codex | SCL-300,SCL-009 |
| SCL-302 | Home cliente + progresso | P1 | client | DONE | agent:codex | SCL-103,SCL-105,SCL-301 |
| SCL-303 | Checklist acionável pela cliente | P1 | client/admin | DONE | agent:codex | SCL-240,SCL-302 |
| SCL-304 | Meu ensaio | P1 | client/admin | DONE | agent:codex | SCL-220,SCL-302 |
| SCL-305 | Styling e referências colaborativas | P1 | client/admin | DONE | agent:codex | SCL-103,SCL-105,SCL-302 |
| SCL-310 | Contratos PDF privados | P1 | admin/db | DONE | agent:codex | SCL-100,SCL-103,SCL-104,SCL-107 |
| SCL-400 | Home pública editorial | P1 | site | DONE | codex | SCL-009 |
| SCL-401 | Catálogo de experiências | P1 | site | DONE | codex | SCL-400 |
| SCL-402 | Páginas verticais — quatro entregues; família pendente | P1 | site | IN_PROGRESS | codex | SCL-401 |
| SCL-403 | Quiz de curadoria | P1 | site/admin | DONE | codex | SCL-009,SCL-102 |
| SCL-404 | Persistência consentida da curadoria | P1 | site/client | BACKLOG | unassigned | SCL-403,SCL-101 |
| SCL-500 | Schema Gallery | P1 | gallery | BACKLOG | unassigned | SCL-103 |
| SCL-503 | Reveal | P1 | gallery | BACKLOG | unassigned | SCL-500,SCL-301 |
| SCL-250 | Funil de Leads no Admin | P1 | admin/commercial | BACKLOG | unassigned | SCL-101,SCL-200 |
| SCL-251 | Ficha do Lead | P1 | admin/commercial | BACKLOG | unassigned | SCL-250 |
| SCL-252 | Transição de estágio + auditoria | P1 | admin/commercial | BACKLOG | unassigned | SCL-101,SCL-107,SCL-251 |
| SCL-253 | Converter Lead → Client | P1 | admin/commercial | BACKLOG | unassigned | SCL-100,SCL-101,SCL-252 |
| SCL-254 | Converter Lead ganho → Shoot | P1 | admin/commercial | BACKLOG | unassigned | SCL-103,SCL-211,SCL-253 |
| SCL-306 | Timeline da experiência | P2 | client | BACKLOG | unassigned | SCL-302,SCL-303,SCL-304 |
| SCL-405 | CTA WhatsApp contextual + tracking | P1 | site/commercial | BACKLOG | unassigned | SCL-403,SCL-404 |
| SCL-406 | SEO técnico + Analytics | P1 | site | BACKLOG | unassigned | SCL-400,SCL-401,SCL-402 |
| SCL-501 | GalleryAsset + storage privado | P1 | gallery | BACKLOG | unassigned | SCL-500 |
| SCL-502 | Gestão/publicação da galeria | P1 | gallery/admin | BACKLOG | unassigned | SCL-500,SCL-501,SCL-230 |
| SCL-504 | Favoritos / PhotoSelection | P1 | gallery/client | BACKLOG | unassigned | SCL-500,SCL-503 |
| SCL-505 | Downloads autorizados | P1 | gallery/client | BACKLOG | unassigned | SCL-501,SCL-503 |
| SCL-506 | Catálogo de produtos/upsells | P1 | gallery/commerce | BACKLOG | unassigned | SCL-500,SCL-503 |
| SCL-507 | Pedido de upsell + Financeiro | P1 | gallery/finance | BACKLOG | unassigned | SCL-104,SCL-506 |
| SCL-550 | Schema InventoryItem | P1 | inventory/db | BACKLOG | unassigned | SCL-005 |
| SCL-551 | Mídia dos itens de acervo | P1 | inventory/storage | BACKLOG | unassigned | SCL-550 |
| SCL-552 | CRUD Admin do Acervo | P1 | inventory/admin | BACKLOG | unassigned | SCL-550,SCL-551,SCL-200 |
| SCL-553 | InventoryReservation + conflitos | P1 | inventory/db | BACKLOG | unassigned | SCL-103,SCL-550 |
| SCL-554 | Seleção de figurinos/clutches pela cliente | P1 | inventory/client | BACKLOG | unassigned | SCL-305,SCL-553 |
| SCL-555 | Styling ↔ itens reais reservados | P1 | inventory/client/admin | BACKLOG | unassigned | SCL-305,SCL-553 |
| SCL-556 | Curadoria Paixão Clutch no Admin | P1 | inventory/admin | BACKLOG | unassigned | SCL-552 |
| SCL-557 | Paixão Clutch pública | P1 | site/inventory | BACKLOG | unassigned | SCL-551,SCL-556,SCL-400 |
| SCL-558 | Aluguel avulso Paixão Clutch | P2 | inventory/commerce | DEFERRED | unassigned | SCL-553,SCL-557 |
| SCL-700 | Infra eventos + Resend + templates | P1 | automation | BACKLOG | unassigned | SCL-008 |
| SCL-701 | Boas-vindas após reserva | P1 | automation | BACKLOG | unassigned | SCL-211,SCL-700 |
| SCL-702 | Scheduler D-7 / D-1 | P1 | automation | BACKLOG | unassigned | SCL-700,SCL-103 |
| SCL-703 | Notificações de Reveal/Galeria | P1 | automation/gallery | BACKLOG | unassigned | SCL-502,SCL-503,SCL-700 |
| SCL-704 | Pedido de review pós-entrega | P1 | automation/growth | BACKLOG | unassigned | SCL-503,SCL-700,SCL-720 |
| SCL-705 | Delivery log + retry + idempotência | P1 | automation | BACKLOG | unassigned | SCL-700 |
| SCL-720 | Schema/serviços Review + Referral | P1 | growth/db | BACKLOG | unassigned | SCL-100,SCL-103 |
| SCL-721 | Fluxo de avaliação / Google | P1 | growth/client | BACKLOG | unassigned | SCL-704,SCL-720 |
| SCL-722 | Tracking de indicação e conversão | P1 | growth/admin | BACKLOG | unassigned | SCL-720,SCL-253 |
| SCL-723 | Oportunidades de recorrência no CRM | P2 | growth/admin | BACKLOG | unassigned | SCL-203,SCL-720 |
| SCL-800 | Virtual Try-On / Prévia de Styling | P3 | client/ai | DEFERRED | unassigned | SCL-554 |
| SCL-810 | Assistente contextual de preparação | P3 | client/ai | DEFERRED | unassigned | SCL-302,SCL-303 |
| SCL-811 | Agente de dúvidas da cliente | P3 | client/ai | DEFERRED | unassigned | SCL-301 |
| SCL-820 | Programa de fidelidade | P3 | growth | DEFERRED | unassigned | SCL-720,SCL-723 |

---

## Template de task

```markdown
### SCL-XXX — Título curto

- Status: READY
- Priority: P0 | P1 | P2 | P3
- Area: auth | db | admin | client | site | finance | production | gallery | inventory | commercial | automation | growth | infra
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

### SCL-204 — Criar cliente

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-200
- Blocks: —
- Files/Scope: `domain/clients/form-schema.ts`, `domain/clients/actions.ts`, `domain/clients/schema.ts` (+`updateClientSchema`), `domain/clients/service.ts` (+`updateClient`), `app/admin/(protected)/clientes/novo/page.tsx`, `components/admin/{client-form,form-status,submit-button}.tsx`, `lib/auth/action-result.ts` (novo), `lib/auth/admin-action.ts` (re-export), `scripts/check-admin-auth.mjs`, `tests/domain/clients-form-schema.test.ts`, `tests/scripts/check-admin-auth.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Quarta task do Epic 2: cadastro de cliente em `/admin/clientes/novo` (PRD §14 / SCL-204) — formulário do CRM sobre as primitivas de SCL-200, submetido por um Server Action envolvido no wrapper RBAC de SCL-200.

**Decisões de implementação**

- **`createClientAction` via `defineAdminAction({ role: "staff", input: clientFormSchema })`.** Toda export de `domain/clients/actions.ts` (`"use server"`) passa pelo wrapper. Handler chama `createClient(input)` e grava `recordAuditEvent({ action: "client.created", entityType: "client", before: null, after: created })` com `actorUserId = ctx.user.id`, depois `revalidatePath("/admin/clientes")` e retorna `{ id }`.
- **`updateClientAction` + `updateClient`/`updateClientSchema` entregues junto** (o form e os componentes são reusados pela SCL-203 para edição). `updateClientSchema = createClientSchema.partial().extend({ name: z.string().min(1).optional() })`; a action valida `updateClientSchema.extend({ id: z.string().uuid() })`, lê o `before` via `getClientById`, aplica o patch e audita `client.updated`.
- **`clientFormSchema` é re-export de `createClientSchema`.** `toFormAction({ booleans: ["marketingConsent"] })` já normaliza o checkbox para `true`/`false` antes da action; o schema só precisa aceitar o booleano e manter `.default(false)`. TDD: `tests/domain/clients-form-schema.test.ts` (6 casos) — RED (módulo inexistente) → GREEN.
- **`lib/auth/action-result.ts` novo (client-safe).** `ClientForm` é `"use client"` e precisa de `toFormAction` + `type ActionResult`; importar de `@/lib/auth/admin-action` arrastava o grafo `session`→`supabase/server` (`next/headers`) + `db`/`postgres` para o bundle do browser e quebrava `next build`. `toFormAction` e `ActionResult` moveram para `lib/auth/action-result.ts`; `admin-action.ts` re-exporta ambos para os callers server-side existentes.
- **`ClientForm`/`FormStatus`/`SubmitButton` (`components/admin/`) criados aqui e reusados por SCL-203 e formulários futuros.** `SubmitButton` usa `useFormStatus` (pending → "Salvando…"/disabled). `FormStatus` renderiza `state.error` quando `!state.ok`. `ClientForm` usa `useActionState` + `toFormAction`, mapeia `fieldErrors` por campo, aceita `initialValues`/`submitLabel`/`hiddenId` para o modo edição. A página `/novo` é `"use client"` e faz `router.push(/admin/clientes/${id})` no sucesso.
- **CI guard estendido para `domain/**/actions.ts`.** `scripts/check-admin-auth.mjs` (run direto) agora percorre `app/admin/` **e** `domain/`, então todo arquivo `"use server"` do repo é coberto — `domain/clients/actions.ts` mora fora de `app/admin/`. `findAdminAuthViolations` já era agnóstico de diretório (a checagem de page/route no-opa para `domain/`). Fixture test novo em `tests/scripts/check-admin-auth.test.ts` roda o CLI contra um repo temporário com `domain/widgets/actions.ts` compliant vs. `"use server"` cru — TDD RED (guard antigo só varria `app/admin/`, CLI saía 0) → GREEN (sai 1, aponta o arquivo).

**Blocker/Hand-off notes**

- concluído: todos os arquivos acima. `npm run test` (153 passando, 3 skipped) / `typecheck` / `lint` (0 erros) / `check:admin-auth` / `build` verdes.
- desvio do brief: o Step 8 do brief importava `toFormAction` de `@/lib/auth/admin-action` num Client Component, o que não compila (`next build`). Resolvido com o split `lib/auth/action-result.ts` + re-export; nenhuma mudança de comportamento em `defineAdminAction`.
- próximo passo: SCL-203 reusa `ClientForm` (com `initialValues`/`hiddenId`) e `updateClientAction` para a edição na ficha da cliente.

---

### SCL-203 — Ficha da cliente

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-200
- Blocks: —
- Files/Scope: `domain/clients/queries.ts` (+`summarizeClientHistory`, `getClientDetail`), `domain/clients/service.ts` (guard de patch vazio em `updateClient`), `components/admin/detail-section.tsx`, `app/admin/(protected)/clientes/[id]/page.tsx`, `app/admin/(protected)/clientes/[id]/editar/page.tsx`, `app/admin/(protected)/clientes/[id]/editar/edit-client-form.tsx`, `tests/domain/client-detail.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Quinta task do Epic 2: ficha da cliente em `/admin/clientes/[id]` — dados do CRM, métricas de relacionamento e histórico de ensaios, tudo somente-leitura, mais uma página de edição em `/admin/clientes/[id]/editar` que reusa o `ClientForm` de SCL-204.

**Decisões de implementação**

- **Histórico, receita e saldo são todos derivados na hora — nenhum agregado armazenado (PRD §7.2).** `summarizeClientHistory(shootRows, paymentRows)` (pura, em `domain/clients/queries.ts`) agrupa pagamentos por ensaio e, por ensaio, calcula `confirmedPaid` (soma dos pagamentos `confirmado`) e `balance` via `calculateBalance` (valor acordado menos pagamentos confirmados — PRD §7.5). `lifetimeRevenue` é a soma dos `confirmedPaid` de todos os ensaios; `openBalance` soma apenas os saldos por ensaio estritamente positivos (ignora `"0.00"` e negativos/pagamento a maior). Toda soma de string decimal passa por `addDecimal` de `@/lib/money` (cents de ponto fixo, nunca `parseFloat`); `calculateBalance` cuida só do saldo por ensaio.
- **`summarizeClientHistory` pura e testada via TDD.** `tests/domain/client-detail.test.ts` (4 casos: `confirmedPaid`/`balance` por ensaio com pagamentos mistos confirmado/pendente, soma de receita vitalícia, saldo em aberto só de positivos, cliente sem ensaios) — RED (`summarizeClientHistory` não exportado) → GREEN. `getClientDetail(id)` faz o join `shoots` + `experiencePackages` (ordenado por `shootDate` desc), carrega os pagamentos com `inArray` e delega a matemática à função pura; devolve `null` se a cliente não existe (página chama `notFound()`).
- **Página de detalhe é Server Component somente-leitura.** Guarda = `app/admin/(protected)/layout.tsx`, sem `defineAdminAction`. `DetailSection`/`DetailRow` (`components/admin/detail-section.tsx`) são apresentação pura reusável; o histórico usa o `DataTable`/`EmptyState` de SCL-200.
- **Edição reusa `ClientForm` e a `updateClientAction` já embrulhada de SCL-204 — nenhuma Server Action nova nesta task.** A página `/editar` é Server Component (carrega o `before` via `getClientById`, `notFound()` se ausente) e passa os valores atuais para um wrapper `"use client"` (`edit-client-form.tsx`) que chama `updateClientAction` e faz `router.push` para a ficha no sucesso. O wrapper importa `ActionResult` de `@/lib/auth/action-result` (client-safe), não de `@/lib/auth/admin-action`.
- **Guard de patch vazio em `updateClient`.** Se o patch parseado não tem nenhuma chave, `updateClient` devolve `getClientById(id)` (lança se `null`) em vez de chamar `.set({})`, que o Drizzle rejeita com "No values to set". Limitação de MVP documentada em comentário de uma linha: um campo opcional não pode ser limpo de volta para `null` por aqui — `toFormAction` descarta strings vazias, então um campo apagado simplesmente permanece inalterado.

**Blocker/Hand-off notes**

- concluído: todos os arquivos acima. `npm run test` (157 passando, 3 skipped) / `typecheck` / `lint` (0 erros; 5 warnings pré-existentes em `tests/domain/*` não relacionados) / `check:admin-auth` / `build` verdes.
- desvio do brief: o Step 3 do brief definia um `addDecimal` quebrado (auxiliar de raciocínio) e um hack `sumViaBalance()` que somava strings decimais via `calculateBalance`; ambos descartados em favor de `addDecimal` de `@/lib/money`. O import de `updateClientAction` não usado na página server `/editar` do brief foi removido (falharia no lint).
- próximo passo: SCL-210 (agenda/ensaios) usa o link `/admin/agenda/[id]` que as linhas do histórico já apontam (rota ainda inexistente até lá — link morto inofensivo).

---

### SCL-210 — Agenda / shoot list

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-200
- Blocks: —
- Files/Scope: `domain/shoots/queries.ts` (`normalizeShootFilters`, `listShoots`), `components/admin/filter-bar.tsx`, `app/admin/(protected)/agenda/page.tsx`, `tests/domain/shoots-queries.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Sexta task do Epic 2: tela de agenda em `/admin/agenda` — visão em lista dos ensaios (PRD §7.4, "visão por lista no MVP"), paginada server-side, com filtro por status/data e busca por cliente ou experiência. Server Component somente-leitura sobre as primitivas de SCL-200 e os componentes `SearchInput`/`Pagination` de SCL-202.

**Decisões de implementação**

- **`normalizeShootFilters` pura e testada via TDD.** `tests/domain/shoots-queries.test.ts` (4 casos: defaults `page 1`/`pageSize 25` com todo o resto `undefined`; só aceita `status` que é valor real de `shoot_status` — `"edicao"` passa, `"bogus"` cai para `undefined`; só aceita `from`/`to` no formato ISO `YYYY-MM-DD` — `"01/01/2026"` cai para `undefined`; faz trim de `search` e clampa `page` para `>= 1`) — RED (`@/domain/shoots/queries` sem exports) → GREEN. A lista canônica de status vem de `shootStatusValues` (`domain/shoots/schema.ts`), então nenhum status inválido chega ao `WHERE`.
- **`listShoots` traduz os filtros normalizados em predicados que de fato escopam a query.** `search` → `ilike` em `clients.name` OR `experiencePackages.name`; `status` → `eq(shoots.status, …)`; `from`/`to` → `gte`/`lte` em `shoots.shootDate`. Join `shoots` ⋈ `clients` ⋈ `experiencePackages`, ordenado por `shootDate` desc, `limit`/`offset` da paginação. `total` vem de um `count()` separado com o mesmo `WHERE`. `pageSize` é fixo em 25 (sem override por query nesta task).
- **`FilterBar` é Client Component genérico e reutilizável (produção/financeiro).** `useRouter`/`usePathname`/`useSearchParams`; `<select>` de status + dois `<input type="date">` (De/Até com `aria-label`), cada mudança faz `router.push` e reseta `page`. Recebe `statusOptions` do server (derivado de `shootStatusValues`), sem acoplamento ao domínio de ensaios.
- **Página somente-leitura.** Guarda = `app/admin/(protected)/layout.tsx`, sem `defineAdminAction`. As linhas do `DataTable` linkam para `/admin/agenda/[id]` (rota de detalhe chega em SCL-211 — link morto inofensivo até lá, mesma convenção já usada pelo histórico da ficha da cliente). `/admin/agenda` renderiza dinâmico (`ƒ`) por ler `searchParams`.

**Blocker/Hand-off notes**

- concluído: todos os arquivos acima. `npm run test` (161 passando, 3 skipped) / `typecheck` / `lint` (0 erros; 5 warnings pré-existentes em `tests/domain/*` não relacionados) / `check:admin-auth` / `build` verdes.
- desvio do brief: nenhum. Todos os imports do Step 3 (`and`, `or`, `ilike`, `eq`, `gte`, `lte`, `desc`, `count`, `sql`, `SQL`) são usados; nada foi removido.
- próximo passo: SCL-211 (criar ensaio ponta a ponta) adiciona a rota de detalhe `/admin/agenda/[id]` que as linhas da lista já apontam. `FilterBar` fica disponível para SCL-230 (Kanban Produção) e views financeiras.

---

### SCL-211 — Criar ensaio ponta a ponta

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-105, SCL-106, SCL-200
- Blocks: primeiro marco E2E
- Files/Scope: `domain/shoots/create-confirmed-shoot.ts`, `domain/shoots/form-schema.ts`, `domain/shoots/actions.ts`, `domain/clients/queries.ts` (+`listClientOptions`), `domain/catalog/queries.ts` (+`listActivePackages`), `app/admin/(protected)/agenda/novo/page.tsx`, `app/admin/(protected)/agenda/novo/new-shoot-form.tsx`, `tests/domain/create-confirmed-shoot.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Permitir que Admin crie um ensaio confirmado e que o sistema derive os registros operacionais relacionados.

**Acceptance criteria**

- [x] selecionar/criar cliente — `listClientOptions()` popula o `<Select>` de cliente (criação de cliente permanece na tela dedicada SCL-204);
- [x] selecionar experiência — `listActivePackages()` popula o `<Select>` de experiência (só pacotes `active = true`);
- [x] informar data/horário/valor — campos `shootDate`/`startTime`/`agreedPrice` no formulário, validados por `createShootSchema` (Zod) antes do insert;
- [x] criar Shoot — insert dentro da transação;
- [x] criar ProductionJob em Aguardando — insert de `production_jobs` com `status: "aguardando"` na mesma transação;
- [x] criar checklist inicial — `buildInitialPreparationTasks()` (pura, testada) produz as 6 tarefas canônicas (moodboard, figurino, clutch, make, confirmacao_horario, pagamento); `pagamento` com `visibleToClient: false`, as demais `true`;
- [x] portal_enabled configurado — checkbox `portalEnabled` no formulário, aplicado no insert do Shoot na criação;
- [x] operação consistente em caso de falha parcial — os três inserts (shoot + production job + checklist) vivem num único `db.transaction`; qualquer erro faz rollback de todos (PRD §7.4.2, "operação consistente em caso de falha parcial");
- [x] teste de integração cobrindo o fluxo — `tests/domain/create-confirmed-shoot.test.ts`, bloco `describeIfLiveDb` guardado por `RUN_LIVE_DB_TESTS === "true"`, com `beforeAll` que insere um cliente `Teste Epic2 SCL-211` e `afterAll` que apaga toda linha sintética criada.

**Implementation notes**

- `domain/shoots/create-confirmed-shoot.ts` contém `buildInitialPreparationTasks` (pura, TDD RED→GREEN, 4 casos) + `createConfirmedShoot` (o `db.transaction`). `createConfirmedShoot` faz exatamente shoot + job + checklist — nenhuma orquestração extra. A composição adiada por SCL-103/SCL-105/SCL-106 (cada `create*` de domínio é insert puro) acontece aqui, dentro da transação, como aquelas tasks anteciparam.
- `domain/shoots/actions.ts` é `"use server"`, envolvido por `defineAdminAction({ role: "staff", input: newShootFormSchema })`, audita `shoot.created` via `recordAuditEvent` e chama `revalidatePath("/admin/agenda")` + `revalidatePath("/admin/producao")`.
- Client form (`new-shoot-form.tsx`) importa `toFormAction`/`ActionResult` de `@/lib/auth/action-result` (não de `@/lib/auth/admin-action`) para não puxar o grafo session/db pro bundle do browser. Em sucesso, `router.push('/admin/agenda/${id}')` — a rota de detalhe ainda não existe (link morto inofensivo, mesma convenção da lista de agenda), chega numa task futura.
- `newShootFormSchema` = `createShootSchema` + `z.coerce` em `participantCount` e `portalEnabled` (tolerante a string caso a action seja chamada direto; `toFormAction` já coage os campos declarados).
- Teste live-DB rodado uma vez contra o Supabase real (`RUN_LIVE_DB_TESTS=true npm run test`): 170/170 verdes (5 blocos de integração antes pulados agora executaram). Limpeza verificada por query direta ao Postgres após a run: `clients LIKE 'Teste Epic2 %'` = 0, `clients LIKE 'Teste Epic%'` = 0, shoots com as datas/valores de teste = 0, `production_jobs` órfãos = 0, `preparation_tasks` órfãos = 0.
- Desbloqueia o primeiro marco E2E (PRD §23): criar ensaio → produção/preparação derivadas → visão da cliente.

**Blocker/Hand-off notes**

- concluído: `buildInitialPreparationTasks` (pura/testada) + `createConfirmedShoot` (transação), option queries, form-schema, action auditada, página + formulário. `npm run test` (165 + 5 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes. Uma run live-DB verde com limpeza confirmada em zero linhas.
- falta: nada pendente nesta task. A rota de detalhe `/admin/agenda/[id]` (alvo do redirect pós-criação) fica para uma task futura.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/create-confirmed-shoot.test.ts` (4 puros TDD RED→GREEN + 2 integração guardados por `RUN_LIVE_DB_TESTS` com `afterAll` completo).
- próximo passo: SCL-220 (registrar pagamento) e SCL-302 (home da cliente) para fechar o marco E2E.

---

### SCL-212 — Ficha do ensaio (shoot detail)

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-104, SCL-105, SCL-106, SCL-211
- Blocks: SCL-220 (registrar pagamento parte desta ficha), SCL-240 (checklist de preparação)
- Files/Scope: `domain/shoots/queries.ts` (+`getShootDetail`/`ShootDetail`), `domain/shoots/service.ts` (+`updateShoot`), `domain/shoots/schema.ts` (+`updateShootSchema`), `domain/shoots/actions.ts` (+`updateShootAction`), `app/admin/(protected)/agenda/[id]/page.tsx`, `app/admin/(protected)/agenda/[id]/edit-shoot-panel.tsx`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Uma única ficha por ensaio reunindo o registro central + financeiro + produção + preparação (PRD §7.4), com edição inline dos campos operacionais do ensaio.

**Acceptance criteria**

- [x] `getShootDetail(id)` retorna `ShootDetail` (shoot + cliente + pacote + pagamentos + saldo + job de produção + tarefas de preparação) ou `null`;
- [x] saldo exibido é derivado por `calculateBalance()` de `domain/payments/balance.ts` — nenhuma aritmética financeira reimplementada na página;
- [x] página `/admin/agenda/[id]` mostra as quatro seções (registro central, financeiro, pagamentos, produção & experiência) + painel de edição; `notFound()` para id inexistente;
- [x] `updateShootSchema` — campos editáveis: `startTime`, `agreedPrice`, `participantCount`, `occasion`, `referral`, `notes`, `portalEnabled`; exclui deliberadamente `paymentStatus` (cache derivado, escrito só por SCL-220) e `status` (passa pela action de status dedicada, não por este update genérico);
- [x] `updateShoot(id, input)` com guarda de patch vazio (Drizzle `.set({})` lança) — patch sem chaves retorna a linha atual via `getShootById`, lança se inexistente;
- [x] `updateShootAction` é `"use server"`, envolvida por `defineAdminAction({ role: "staff" })`, busca `before` via `getShootById`, audita `shoot.updated` com before/after reais e `revalidatePath` de `/admin/agenda/[id]` + `/admin/agenda`;
- [x] painel de edição é `"use client"` e importa `toFormAction`/`ActionResult` de `@/lib/auth/action-result` (não de `@/lib/auth/admin-action`).

**Implementation notes**

- Links `/admin/agenda/[id]/pagamento` (SCL-220) e `/admin/agenda/[id]/preparacao` (SCL-240) apontam para rotas ainda inexistentes — links mortos inofensivos até essas tasks, mesma convenção já usada pela lista de agenda e pelo histórico da ficha da cliente.
- `updateShoot` reaproveita a mesma guarda de patch vazio que `updateClient` (SCL-203/Task 5). Como `toFormAction` sempre injeta `portalEnabled` (checkbox presença → boolean), o patch do fluxo de formulário raramente fica vazio, mas a guarda protege chamadas diretas.
- `updateShootAction` usa `updateShootSchema.extend({ id: z.string().uuid() })`, mesmo padrão de `updateClientAction`.

**Blocker/Hand-off notes**

- concluído: `getShootDetail`/`ShootDetail`, `updateShootSchema`, `updateShoot` (com guarda), `updateShootAction` (auditada), página de detalhe e painel de edição inline. `npm run test` (165 + 5 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes.
- falta: nada pendente nesta task. Rotas `/pagamento` e `/preparacao` linkadas ficam para SCL-220 e SCL-240.
- arquivos alterados: ver Files/Scope acima.
- testes: sem unidade de função pura dedicada (esta task é queries + update envolvido + páginas); coberto pela suíte completa + typecheck/build.
- próximo passo: SCL-220 (registrar pagamento) preenche o link "Registrar pagamento" desta ficha; SCL-240 preenche o checklist de preparação.

---

### SCL-220 — Registrar pagamento conectado

- Status: DONE
- Priority: P1
- Area: finance
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-104, SCL-200
- Blocks: dashboard financeiro, marco E2E
- Files/Scope: `domain/payments/register-payment.ts`, `domain/payments/actions.ts`, `app/admin/(protected)/agenda/[id]/pagamento/page.tsx`, `app/admin/(protected)/agenda/[id]/pagamento/payment-form.tsx`, `tests/domain/register-payment.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Registrar pagamento uma única vez e derivar saldo/status financeiro do ensaio.

**Acceptance criteria**

- [x] Payment persistido — `registerPayment()` faz `tx.insert(payments)` dentro de um único `db.transaction`;
- [x] somente pagamentos confirmados entram no saldo — a aritmética é delegada a `calculateBalance()`/`deriveShootPaymentStatus()` (Epic 1), que já filtram `status === "confirmado"`; SCL-220 não reimplementa nada;
- [x] saldo calculado como valor acordado menos pagamentos confirmados — idem, `calculateBalance(agreedPrice, todasAsLinhas)`;
- [x] pagamento parcial suportado — `nextStatus: "parcial"` quando `0 < confirmado < valor_acordado`;
- [x] histórico preservado — cada registro é uma linha nova em `payments`; nada é sobrescrito;
- [x] teste para saldo zero, parcial e excesso/erro de entrada — `planPaymentStatusUpdate` puro, TDD RED→GREEN, 5 casos (`nao_iniciado`/`parcial`/`pago`/overpayment com saldo negativo não-clampado/ignora `estornado`); `createPaymentSchema` (Epic 1) rejeita `amount` negativo/malformado;
- [x] nenhuma segunda receita precisa ser digitada em outra tela — o formulário `/admin/agenda/[id]/pagamento` é a única entrada; `shoots.payment_status` e o saldo saem derivados.

**Implementation notes**

- `domain/payments/register-payment.ts` = `planPaymentStatusUpdate` (puro, TDD RED→GREEN, 5 casos) + `registerPayment` (a transação). `planPaymentStatusUpdate` só delega para `deriveShootPaymentStatus`/`calculateBalance` sobre `[...existing, newPayment]` — nenhuma aritmética própria (PRD §7.5, fonte única).
- `shoots.payment_status` é escrito em **exatamente um lugar**: o `db.transaction` de `registerPayment`, logo após o insert do pagamento, recomputado sobre **todas** as linhas de `payments` daquele ensaio via `deriveShootPaymentStatus`. Sequência da transação: select do shoot (throw `"ensaio inexistente"` se não existir) → `tx.insert(payments)` → re-select de todas as linhas do shoot → `deriveShootPaymentStatus` + `calculateBalance` → `tx.update(shoots).set({ paymentStatus })`. Tudo em `tx`; rollback conjunto. Não é editável pelo usuário e não é escrito em nenhum outro lugar.
- Overpayment: `calculateBalance` devolve saldo negativo sem clamp; `deriveShootPaymentStatus` devolve `"pago"`. Coberto no teste (`-200.00`).
- `domain/payments/actions.ts` é `"use server"`, envolvido por `defineAdminAction({ role: "staff", input: createPaymentSchema })`, audita `payment.registered` via `recordAuditEvent` e chama `revalidatePath` em `/admin/agenda/[id]`, `/admin/financeiro` e `/admin`.
- Client form (`payment-form.tsx`) importa `toFormAction`/`ActionResult` de `@/lib/auth/action-result` (não de `@/lib/auth/admin-action`). O `<Select name="status">` é o status da **linha de pagamento** (`pendente`/`confirmado`/`estornado`), não o `payment_status` do ensaio.
- `paidAt`: `createPaymentSchema.paidAt` é `z.iso.datetime({ offset: true })` (Epic 1, não afrouxado). O `<input type="datetime-local">` emite `"YYYY-MM-DDTHH:mm"` (sem segundos, sem offset), então o campo se chama `paidAtLocal` e o reducer do `useActionState` o reescreve antes de chamar a action: comprimento 16 → `"${local}:00Z"`, senão `"${local}Z"`.
- Teste live-DB (`tests/domain/register-payment.test.ts`, guardado por `RUN_LIVE_DB_TESTS === "true"`, `afterAll` apaga o cliente `Teste Epic2 SCL-220` + shoot + pagamentos) rodado uma vez contra o Supabase real: `npm run test` = 176/176 verdes (6 blocos de integração antes pulados executaram). O `it` de integração leva `timeout: 30_000` — duas chamadas de `registerPayment`, cada uma um `db.transaction` multi-round-trip contra o pooler remoto, estouram o default de 5s do vitest. Limpeza verificada por query direta ao Postgres depois da run: `clients LIKE 'Teste Epic2 %'` = 0, `clients LIKE 'Teste Epic%'` = 0, shoots de cliente `Teste Epic2 SCL-220` = 0, pagamentos órfãos = 0, shoots `shoot_date=2026-12-01 agreed_price=1000.00` = 0.
- Com SCL-211 (criar ensaio) já feito, SCL-220 fecha a espinha do marco E2E do Studio OS: criar ensaio → registrar pagamento → saldo/status financeiro derivados na ficha.

**Blocker/Hand-off notes**

- concluído: `planPaymentStatusUpdate` (puro/testado) + `registerPayment` (transação), action auditada, página + formulário. `npm run test` (170 + 6 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes. Uma run live-DB verde (176/176) com limpeza confirmada em zero linhas.
- falta: nada pendente nesta task. `/admin/financeiro` é revalidado mas ainda não existe (link/rota morta inofensiva até a task do dashboard financeiro).
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/register-payment.test.ts` (5 puros TDD RED→GREEN + 1 integração guardado por `RUN_LIVE_DB_TESTS` com `afterAll` completo).
- próximo passo: dashboard financeiro consome `payment.registered` / `shoots.payment_status`; SCL-302 (home da cliente) fecha o marco E2E completo do lado da cliente.

---

### SCL-221 — Livro-caixa financeiro + dashboard financeiro

- Status: DONE
- Priority: P1
- Area: finance
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-104, SCL-201, SCL-220
- Blocks: —
- Files/Scope: `domain/finance/ledger.ts`, `domain/finance/queries.ts`, `app/admin/(protected)/financeiro/page.tsx`, `components/admin/period-picker.tsx`, `tests/domain/finance-ledger.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Livro-caixa (recebimentos + despesas) e KPIs financeiros, tudo recalculado a partir de `payments`/`expenses`/`shoots` a cada render (PRD §7.5, §16 "dashboard recalcula indicadores"). A planilha-dashboard legada não é migrada como dado (PRD §13).

**Acceptance criteria**

- [x] `buildLedger` puro/testado — TDD RED→GREEN, 6 casos em `tests/domain/finance-ledger.test.ts` (só recebimentos `confirmado` + todas as despesas; ordenação por data desc; `signedAmount` negativo para despesa e positivo para recebimento; `summary` received/expenses/net/receivable; fallback `createdAt` quando `paidAt` é nulo; `id` único e estável por entrada);
- [x] aritmética de dinheiro em cents inteiros — `ledger.ts` importa `toCents`/`fromCents` de `@/lib/money` (sem cópia privada), nunca `parseFloat`;
- [x] "A receber (total)" derivado via `calculateBalance` (`domain/payments/balance.ts`) sobre **todos** os ensaios, somando só os saldos por-ensaio positivos — não limitado ao período;
- [x] página somente-leitura sob `app/admin/(protected)/` — guarda = `layout.tsx`, sem `defineAdminAction`, sem auth, sem nenhuma mutação;
- [x] período por `searchParams` `from`/`to` (validados por regex ISO, fallback = mês corrente); `PeriodPicker` é Client Component (`useRouter`/`usePathname`/`useSearchParams`);
- [x] DB vazio → `EmptyState` + KPIs zerados, correto.

**Implementation notes**

- `domain/finance/ledger.ts` = só o redutor puro `buildLedger`; `domain/finance/queries.ts` = as leituras Drizzle + a derivação do "a receber". `computeDashboardKpis` (SCL-201) **não** é reusado — granularidade diferente (livro-caixa por lançamento vs. KPIs agregados).
- `LedgerEntry` ganhou um campo `id: string` (não estava no brief original) porque o `DataTable` precisa de `rowKey` estável e dois lançamentos podem compartilhar data+descrição. Setado **antes** do `.sort()`: recebimentos `receipt-${i}`, despesas `expense-${i}` pelo índice do `.map`. Coberto por teste (`entries.every((e) => e.id)` + unicidade via `Set`).
- `getFinancialLedger`: pagamentos filtrados por `coalesce(paid_at, created_at)` dentro de `[from, to T23:59:59Z]`, join `payments→shoots→clients` para o nome da cliente; despesas por `expenses.date` no intervalo. O "a receber" faz um segundo passe sobre **todos** os ensaios (não o período): `calculateBalance(agreedPrice, pagamentos do ensaio)`, acumulando em cents só quando o saldo é positivo (`!bal.startsWith("-") && bal !== "0.00"`), fechado com `fromCents`.
- `/admin/financeiro` renderiza dinâmico (`ƒ`) por ler `searchParams`. Link "Despesas" aponta para `/admin/financeiro/despesas` (rota ainda inexistente — link morto inofensivo, mesma convenção das tasks anteriores).
- Sem migração: task só de leitura/apresentação.

**Blocker/Hand-off notes**

- concluído: `buildLedger` (puro/testado, TDD RED→GREEN 6 casos), `getFinancialLedger` (Drizzle + derivação do "a receber" via `calculateBalance`), `PeriodPicker`, página `/admin/financeiro`. `npm run test` (176 + 6 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes.
- falta: nada pendente nesta task. `/admin/financeiro/despesas` (CRUD de despesas) fica para uma task futura — link morto inofensivo até lá.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/finance-ledger.test.ts` (6 puros, TDD RED→GREEN).
- próximo passo: CRUD de despesas preenche o link "Despesas"; nenhum bloqueio pendente.

---

### SCL-222 — Despesas

- Status: DONE
- Priority: P1
- Area: finance
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-104, SCL-221
- Blocks: —
- Files/Scope: `domain/finance/expense-form-schema.ts`, `domain/finance/expense-queries.ts`, `domain/finance/expense-actions.ts`, `app/admin/(protected)/financeiro/despesas/page.tsx`, `app/admin/(protected)/financeiro/despesas/expense-form.tsx`, `tests/domain/expense-form-schema.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Tela `/admin/financeiro/despesas` para registrar e listar despesas — saídas independentes de um ensaio (PRD §7.5). Preenche o link "Despesas" que a página `/admin/financeiro` (SCL-221) já apontava.

**Acceptance criteria**

- [x] `expenseFormSchema` puro/testado — TDD RED→GREEN, 4 casos em `tests/domain/expense-form-schema.test.ts` (mínimo válido com `recurring` default `false`; `recurring: true` normalizado sobrevive; rejeita `type` desconhecido; rejeita `amount` e `date` malformados);
- [x] `expenses` não tem FK para um ensaio — por design (PRD §7.5), é um registro independente; `listExpenses` filtra só por `expenses.date` no intervalo;
- [x] `createExpenseAction` passa pelo wrapper RBAC (`defineAdminAction`, `role: "staff"`) e audita `expense.created` (`before: null`, `after: created`) via `recordAuditEvent`;
- [x] action revalida `/admin/financeiro/despesas`, `/admin/financeiro` e `/admin`;
- [x] período por `searchParams` `from`/`to` (validados por regex ISO, fallback = últimos ~3 meses); página renderiza dinâmico por ler `searchParams`;
- [x] DB vazio no período → `EmptyState`.

**Implementation notes**

- `expenseFormSchema = createExpenseSchema.extend({ recurring: z.coerce.boolean().default(false) })` — única extensão necessária. `createExpenseSchema` (Epic 1, `domain/payments/schema.ts`, **frozen — não tocado**) já valida `date` como `z.iso.date()` e `type` como `z.enum(expenseTypeValues)`, então os casos "rejeita 10/09/2026" e "rejeita type desconhecido" passam sem override. O `.extend` só troca `recurring` pela versão `z.coerce.boolean()` para o valor do checkbox (já normalizado por `toFormAction({ booleans: ["recurring"] })`) sobreviver.
- `domain/finance/expense-queries.ts` = leitura Drizzle pura (`listExpenses`, ordena por `date` desc); `domain/finance/expense-actions.ts` = `"use server"`, só a `createExpenseAction` embrulhada. `createExpense` (Epic 1, `domain/payments/service.ts`) é reusado como está — insert puro com re-parse do schema.
- `expense-form.tsx` é `"use client"` e importa `toFormAction`/`ActionResult` de `@/lib/auth/action-result` (client-safe), nunca de `@/lib/auth/admin-action` — mesma convenção de SCL-203/SCL-220. `router.refresh()` no sucesso para a lista re-renderizar.
- Sem migração: a tabela `expenses` já existe desde SCL-104.

**Blocker/Hand-off notes**

- concluído: `expenseFormSchema` (puro/testado, TDD RED→GREEN 4 casos), `listExpenses`, `createExpenseAction` (embrulhada + auditada), página `/admin/financeiro/despesas` + form. `npm run test` (181 + 6 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes.
- falta: nada pendente nesta task.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/expense-form-schema.test.ts` (4 puros, TDD RED→GREEN).
- próximo passo: nenhum bloqueio pendente; SCL-221 "próximo passo" (preencher o link "Despesas") está fechado.

---

### SCL-230 — Kanban Produção

- Status: DONE
- Priority: P1
- Area: production
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-106, SCL-200
- Blocks: —
- Files/Scope: `domain/production/queries.ts`, `app/admin/(protected)/producao/page.tsx`, `components/admin/kanban-column.tsx`, `components/admin/production-card.tsx`, `tests/domain/production-board.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Tela `/admin/producao` — Kanban de pós-produção/edição (PRD §7.6). Uma coluna por status de `production_jobs`, um card por ensaio, com o controle de transição de status embutido em cada card (entregue por SCL-231).

**Acceptance criteria**

- [x] `groupJobsByStatus` puro/testado — TDD RED→GREEN, 3 casos em `tests/domain/production-board.test.ts` (retorna as 5 colunas na ordem canônica mesmo vazio; distribui cada job na sua coluna; ignora — sem lançar — um card com status desconhecido);
- [x] as colunas vêm de `productionJobStatusEnum.enumValues`, então o board nunca diverge do schema e toda coluna sempre aparece (inclusive as vazias);
- [x] `getProductionBoard()` = leitura Drizzle pura: `production_jobs` `innerJoin` shoots/clients/experience_packages + `leftJoin` `profiles` pelo `editor_user_id`, agrupada por `groupJobsByStatus`;
- [x] card linka para `/admin/agenda/${shootId}`, mostra pacote + data (`formatShootDate`), editor, fotos a editar e prazo de entrega;
- [x] página é `force-dynamic` — lê dados de produção ao vivo a cada request, nada a prerender (as demais telas de lista do Studio OS chegam ao mesmo estado via `searchParams`).

**Implementation notes**

- `domain/production/queries.ts` (novo) = `groupJobsByStatus` (puro) + `getProductionBoard` (leitura). `groupJobsByStatus` é `COLUMNS.map(column => ({ column, cards: jobs.filter(j => j.status === column) }))` — um card com status fora do enum simplesmente não entra em nenhuma coluna.
- Nome do editor: `profiles.fullName` (`full_name`) existe em `db/schema/profiles.ts` e é usado direto; `leftJoin` porque `editor_user_id` é nullable. Sem migração.
- `production-card.tsx` importa `ProductionStatusControl` de `@/app/admin/(protected)/producao/production-status-control` (SCL-231) — por isso as duas tasks entram no mesmo commit de implementação.
- `page.tsx` acrescenta `export const dynamic = "force-dynamic"` (a única linha fora do código literal do brief). Sem esse marcador o Next tenta prerenderizar a página no build, roda `getProductionBoard()` contra o pooler remoto e derruba o build (o worker de `/admin` estoura os 60s). Com o marcador o build fica verde e `/admin/producao` é `ƒ` como toda página de lista do Studio OS.

**Blocker/Hand-off notes**

- concluído: `groupJobsByStatus` (puro/testado, TDD RED→GREEN 3 casos), `getProductionBoard`, página `/admin/producao` + `KanbanColumn` + `ProductionCardView`.
- falta: nada pendente nesta task.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/production-board.test.ts` (3 puros, TDD RED→GREEN).
- próximo passo: nenhum bloqueio pendente.

---

### SCL-231 — Mudar status do ProductionJob (+ campos editor / entrega)

- Status: DONE
- Priority: P1
- Area: production
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-106, SCL-230
- Blocks: —
- Files/Scope: `domain/production/status.ts` (append `allowedProductionTransitions`), `domain/production/service.ts` (append `changeProductionJobStatus`, `updateProductionJobFields`), `domain/production/actions.ts`, `app/admin/(protected)/producao/production-status-control.tsx`, `tests/domain/change-production-status.test.ts`
- Migration: no
- Updated at: 2026-09-06

**Goal**

Mudar o status de um `production_job` pelo card do Kanban, validando a transição pela regra pura do Epic 1 e refletindo `finalizado`/`entregue` no shoot na mesma transação (PRD §7.6). Também expõe `updateProductionJobFields` para editor/fotos/prazo.

**Acceptance criteria**

- [x] `allowedProductionTransitions(from)` puro/testado — TDD RED→GREEN, 4 casos em `tests/domain/change-production-status.test.ts` (`aguardando` → só `iniciado`; `iniciado` → `parcial` + `finalizado`, o skip deliberado; `entregue` → `[]`; toda transição oferecida passa em `canTransitionProductionStatus`);
- [x] `allowedProductionTransitions` é `ORDER.filter(to => canTransitionProductionStatus(from, to))` — derivado do guard, nunca um mapa hardcoded, então dropdown e guard não divergem;
- [x] `changeProductionJobStatus(jobId, to)` roda em um único `db.transaction`: carrega o job (lança se não existe); `if (!canTransitionProductionStatus(current.status, to)) throw new Error("transição inválida")`; grava o status (e `deliveryAt` = hoje quando `to === "entregue"`); reflete no shoot — `finalizado`→`finalizado`, `entregue`→`entregue` — só quando o shoot ainda não está lá **e** `canTransitionShootStatus` permite; tudo em `tx`;
- [x] `changeProductionStatusAction` e `updateProductionJobAction` são `"use server"`, embrulhadas por `defineAdminAction({ role: "staff" })`, auditadas (`production_job.status_changed` / `production_job.updated`) e revalidam `/admin/producao`, `/admin/agenda/${shootId}` e `/admin`;
- [x] `ProductionStatusControl` é `"use client"`, importa a action de `@/domain/production/actions`, monta o `<select>` com `allowedProductionTransitions`, chama a action num `useTransition` e faz `router.refresh()` no sucesso.

**Implementation notes**

- `domain/production/status.ts`: só o append de `allowedProductionTransitions`; `canTransitionProductionStatus` e o array `ORDER` não foram tocados.
- `domain/production/service.ts`: append de `changeProductionJobStatus` + `updateProductionJobFields`. A reflexão no shoot é guardada por `shoot.status !== reflect && canTransitionShootStatus(shoot.status, reflect)` — se o shoot já passou do ponto (ou a regra do shoot não permite o hop), o job muda mesmo assim e `shootStatusChanged` volta `null`. A transação é atômica: erro em qualquer passo desfaz tudo.
- `domain/production/actions.ts` (novo): `"use server"`. O import de `getProductionJobByShootId` que o brief listava foi removido — não era usado e o lint falharia com ele.
- `production-status-control.tsx` não usa `toFormAction`, então não importa nada de `@/lib/auth/action-result`; chama a action diretamente (mesma convenção de `edit-shoot-panel.tsx`).
- Sem migração: `production_jobs` já tem `status`, `delivery_at`, `editor_user_id`, `photos_to_edit`, `delivery_due_at`, `selection_status`, `notes` desde SCL-106.
- Sem teste live-DB: a cobertura pura (`groupJobsByStatus`, `allowedProductionTransitions`) mais as suítes existentes carregam a task; nenhum arquivo de integração foi adicionado.

**Blocker/Hand-off notes**

- concluído: `allowedProductionTransitions` (puro/testado, TDD RED→GREEN 4 casos), `changeProductionJobStatus` (transação atômica job + reflexão no shoot), `updateProductionJobFields`, as duas actions embrulhadas + auditadas, `ProductionStatusControl`. `npm run test` (187 + 6 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes.
- falta: nada pendente nesta task.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/change-production-status.test.ts` (4 puros, TDD RED→GREEN) + `tests/domain/production-status.test.ts` (Epic 1, reusado).
- próximo passo: nenhum bloqueio pendente.

---

### SCL-240 — Checklist de preparação interno

- Status: DONE
- Priority: P1
- Area: admin
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-105, SCL-212
- Blocks: —
- Files/Scope: `domain/preparation/queries.ts` (novo, `summarizePreparationProgress` puro), `domain/preparation/service.ts` (append `setPreparationTaskStatus`, `addPreparationTask`), `domain/preparation/schema.ts` (append `addPreparationTaskFormSchema`), `domain/preparation/actions.ts` (novo), `app/admin/(protected)/agenda/[id]/preparacao/{page,checklist}.tsx` (novo), `tests/domain/preparation-progress.test.ts` (novo)
- Migration: no
- Updated at: 2026-09-06

**Goal**

Rota `/admin/agenda/[id]/preparacao` (link já existente na ficha do ensaio, SCL-212): checklist interno de preparação do ensaio — as **mesmas** linhas de `preparation_tasks` que o portal da cliente (Epic 3) vai ler, uma única fonte de verdade (PRD §6.2 / §7.4, princípio §7). Ciclo de status por clique em cada tarefa, formulário de adicionar tarefa com toggle `visible_to_client`, e barra de progresso derivada.

**Acceptance criteria**

- [x] `summarizePreparationProgress(tasks)` puro/testado — TDD RED→GREEN, 4 casos em `tests/domain/preparation-progress.test.ts` (0% e `nextTaskTitle` null sem tarefas; `concluida` conta como done e `pct` é `Math.round` inteiro; `nextTaskTitle` = primeira não-`concluida` na ordem; 100% e null quando todas `concluida`);
- [x] `pct` é inteiro `0..100` (`Math.round((done/total)*100)`, 0 quando `total === 0`); `nextTaskTitle` = título da primeira tarefa não-`concluida` na ordem, ou `null`;
- [x] `setPreparationTaskStatus(taskId, status)` atualiza somente `status`; o trigger `preparation_tasks_sync_completed_at` é o único dono de `completed_at`;
- [x] `addPreparationTaskFormSchema` = `createPreparationTaskSchema.extend({ visibleToClient: z.coerce.boolean().default(true) })` — única extensão; `domain/preparation/schema.ts` só recebeu esse append;
- [x] `addPreparationTaskAction` e `setPreparationTaskStatusAction` são `"use server"`, embrulhadas por `defineAdminAction({ role: "staff" })`, auditadas (`preparation_task.created` / `preparation_task.status_changed`) e revalidam `/admin/agenda/${shootId}` + `/admin/agenda/${shootId}/preparacao`;
- [x] `checklist.tsx` é `"use client"`, importa `toFormAction`/`ActionResult` de `@/lib/auth/action-result` (não de `admin-action`), cicla o status por clique via `setPreparationTaskStatusAction` num `useTransition` + `router.refresh()`, e adiciona tarefa via `useActionState` + `toFormAction(..., { booleans: ["visibleToClient"] })`.

**Implementation notes**

- `domain/preparation/queries.ts` (novo): só a função pura `summarizePreparationProgress` + o tipo `PreparationProgress`. Nenhum acesso a `db`.
- `domain/preparation/service.ts`: append de `setPreparationTaskStatus` + `addPreparationTask` (wrapper fino sobre `createPreparationTask`, para simetria da superfície de actions); `preparationTaskStatusEnum` adicionado ao import existente de `@/db/schema`.
- `domain/preparation/schema.ts`: só o append de `addPreparationTaskFormSchema`; `createPreparationTaskSchema` e o `z.input` não foram tocados.
- `checklist.tsx`: import `useState` do brief removido — não era usado e o lint falharia com ele. Import de `toFormAction`/`ActionResult` corrigido para `@/lib/auth/action-result` (o brief listava `@/lib/auth/admin-action`, que puxaria o grafo de sessão/db para o bundle do browser).
- Sem `export const dynamic = "force-dynamic"` na página: a rota já é `ƒ` (server-rendered on demand) por ser segmento dinâmico `[id]` sem `generateStaticParams`, então `npm run build` não tenta prerender contra o DB remoto. Diferente de `/admin/producao`, que precisou da linha por ser rota estática.
- Sem migração: `preparation_tasks` já tem `status`, `visible_to_client`, `completed_at` desde SCL-105.
- Sem teste live-DB: a cobertura pura (`summarizePreparationProgress`) mais `tests/domain/preparation-tasks.test.ts` (Epic 1) carregam a task.

**Blocker/Hand-off notes**

- concluído: `summarizePreparationProgress` (puro/testado, TDD RED→GREEN 4 casos), `setPreparationTaskStatus` (somente `status`, deixando `completed_at` ao trigger), `addPreparationTask`, `addPreparationTaskFormSchema`, as duas actions embrulhadas + auditadas, página + `Checklist` client component. `npm run test` (191 + 6 skip), `npm run typecheck`, `npm run lint` (0 erros; 5 warnings pré-existentes em outros testes), `npm run check:admin-auth`, `npm run build` todos verdes.
- falta: nada pendente nesta task. Última task do Epic 2.
- arquivos alterados: ver Files/Scope acima.
- testes: `tests/domain/preparation-progress.test.ts` (4 puros, TDD RED→GREEN) + `tests/domain/preparation-tasks.test.ts` (Epic 1, reusado).
- próximo passo: portal da cliente (Epic 3, SCL-302) lê as mesmas `preparation_tasks` filtrando `visible_to_client`.

---

### SCL-300 — Passwordless cliente

- Status: DONE
- Priority: P1
- Area: client
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-006, SCL-007
- Blocks: SCL-301
- Files/Scope: `lib/auth/client-link.ts`, `app/auth/callback/route.ts`, `app/(client)/login/page.tsx`, `tests/lib/client-link.test.ts`, `tests/app/auth-callback.test.ts`
- Migration: no
- Updated at: 2026-09-07

**Goal**

Vincular com segurança cada usuário verificado por Magic Link a exatamente um registro CRM `clients`, pelo e-mail normalizado, antes de liberar a Minha Experiência.

**Acceptance criteria**

- [x] `normalizeClientEmail` e `decideClientLink` são puros e cobertos por teste: normalização, vínculo novo, idempotência, ausência, ambiguidade e vínculo de outro usuário;
- [x] o lookup limita a dois candidatos pelo e-mail normalizado; zero, múltiplos ou um registro de outro usuário são negados;
- [x] a atualização usa compare-and-set (`id` e `auth_user_id IS NULL`) e relê o registro após corrida, aceitando somente o mesmo `auth_user_id`;
- [x] após o exchange PKCE, o callback verifica o usuário Supabase e exige o vínculo antes do redirect; toda falha posterior ao exchange — `getUser` com erro/usuário ausente/e-mail ausente, rejeição ou exceção de vínculo — chama `signOut` antes do erro neutro;
- [x] a falha é neutra (`/login?error=access`), sem enumerar clientes ou motivo interno, e a página mostra a cópia aprovada;
- [x] `getLinkedClientByAuthUserId` fornece a leitura mínima (`id`, `name`) para o shell do portal seguinte.

**Implementation notes**

- O vínculo não cria nem escolhe um CRM Client: ele só associa uma correspondência única pelo `lower(trim(email))`. A unicidade de `clients.auth_user_id` continua como defesa do banco.
- A rota mantém `safeRedirect`; `denyClientAccess` centraliza o `signOut` + redirect neutro de toda falha posterior ao exchange. O pedido usa dados de request e Supabase/cookies, portanto permanece dinâmico conforme a convenção de Route Handlers do Next 16.

**Blocker/Hand-off notes**

- concluído: decisão pura, vínculo Drizzle race-safe, callback PKCE fail-closed com log estruturado e `signOut` em toda falha pós-exchange, e mensagem neutra na tela de login.
- falta: nada para esta task.
- arquivos alterados: `lib/auth/client-link.ts`, `app/auth/callback/route.ts`, `app/(client)/login/page.tsx`, `tests/lib/client-link.test.ts`, `tests/app/auth-callback.test.ts`, `docs/TASKS.md`.
- testes: TDD RED (`npm run test -- tests/lib/client-link.test.ts`, import inexistente) e GREEN (6 testes); cobertura cumulativa de vínculo/callback/redirect: `npm run test -- tests/lib/client-link.test.ts tests/app/auth-callback.test.ts tests/lib/safe-redirect.test.ts` — 25/25.
- fechamento: gate não-live de 2026-09-07 passou com 366 testes/20 skips; gate live completo passou com 386/386 e zero skips. O callback/vínculo continua provado pelos testes unitários acima; as identidades Auth descartáveis usadas pelas integrações do portal foram removidas e a auditoria final encontrou zero e-mails `scl302-*`, `scl304-*` ou `scl305-*`.
- próximo passo: aceitação browser descartável do fluxo Magic Link na Task 10; não há implementação pendente em SCL-300.

---

### SCL-301 — Shell Minha Experiência

- Status: DONE
- Priority: P1
- Area: client
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-300, SCL-009
- Blocks: SCL-302, SCL-503
- Files/Scope: `app/(client)/minha-experiencia/{layout,sign-out}.ts(x)`, `components/client/{client-nav,client-sign-out-button}.tsx`, `tests/components/client-nav.test.tsx`, `tests/app/client-layout.test.tsx`
- Migration: no
- Updated at: 2026-09-07

**Goal**

Proteger toda a Minha Experiência por sessão Supabase e vínculo CRM, oferecendo uma navegação responsiva somente para os destinos do portal que serão implementados neste epic.

**Acceptance criteria**

- [x] layout servidor redireciona sessão ausente para o login e não renderiza conteúdo de cliente sem vínculo por `auth_user_id`;
- [x] sem vínculo, mostra a mensagem neutra de acesso indisponível e permite encerrar a própria sessão;
- [x] ClientNav contém apenas Início, Checklist, Meu ensaio e Styling, marca o destino atual com `aria-current="page"` e não expõe Gallery;
- [x] mobile recebe barra inferior com targets de no mínimo 44 px; desktop reutiliza a navegação no cabeçalho;
- [x] `clientSignOutAction` lê apenas a sessão cookie-bound, encerra-a e redireciona para `/login`;
- [x] o primeiro foco do shell autenticado é um skip link visível ao foco para `#portal-main`; o alvo é o único `<main>` e aceita foco programático sem reintroduzir landmark aninhado;
- [x] TDD: RED por módulo ausente; GREEN com `tests/components/client-nav.test.tsx` — 2 passed. Typecheck, lint, guard de admin, build e uma suíte completa executados com exit 0.

**Implementation notes**

- Layout/auth permanecem Server Components; somente a leitura reativa de pathname é uma Client Component, sem serializar dados da cliente.
- A action não é uma mutação administrativa e não aceita ID de usuário; por isso não usa `defineAdminAction`.
- O shell usa tokens existentes e inclui foco visível e `motion-reduce` na navegação/saída.

**Blocker/Hand-off notes**

- concluído: shell protegido, logout, navegação responsiva e skip link. O fix final seguiu TDD: `tests/app/client-layout.test.tsx` falhou por link ausente e passou 1/1 após o link/target, comprovando primeiro elemento focável e exatamente um `<main>`.
- fechamento: gate não-live de 2026-09-07 passou com 366 testes/20 skips; gate live completo passou com 386/386 e zero skips; build Next 16.3.4 manteve as quatro rotas da Minha Experiência dinâmicas.
- próximo passo: aceitação visual/teclado em 320 px e desktop na Task 10; nenhuma correção de shell conhecida permanece aberta.

---

### SCL-302 — Home Minha Experiência conectada

- Status: DONE
- Priority: P1
- Area: client
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-103, SCL-105, SCL-301
- Blocks: primeiro marco E2E
- Files/Scope: `domain/portal/read.ts`, `components/client/journey-home.tsx`, `app/(client)/minha-experiencia/{page,error}.tsx`, `tests/{app/client-home-page,components/journey-home,domain/portal-read,domain/portal-rls.integration}.test.ts(x)`, `tests/support/live-auth-cleanup*`
- Migration: yes — `0024_epic3_client_fields.sql`, `0025_epic3_client_access.sql`
- Updated at: 2026-09-07

**Goal**

Exibir para a cliente autenticada a visão do mesmo Shoot usado pelo Studio OS.

**Acceptance criteria**

- [x] cliente não consegue acessar Shoot de outra cliente;
- [x] nome/experiência/data corretos;
- [x] countdown correto;
- [x] checklist correto;
- [x] próximo passo derivado do estado;
- [x] layout mobile aprovado;
- [x] alterações de preparação no backend aparecem sem duplicação de dados.

**Task 2 — fundação do portal concluída (2026-09-06)**

- Schemas incluem localização/orientações client-safe e `clientActionable`; cinco starters visíveis são actionable e pagamento permanece interno. O schema rejeita actionable oculto.
- Migrations 0024/0025 aplicadas no Supabase real após autorização explícita. A gerada adiciona somente quatro colunas; hashes do journal live conferidos contra os arquivos locais. As 15 constraints hand-written anteriores continuam presentes.
- `information_schema.role_column_grants`: authenticated recebe SELECT em 37 colunas seguras das cinco tabelas e UPDATE somente em `preparation_tasks.status`. Verificadas 360 combinações de privilégios efetivos por role/coluna/operação; anon sem SELECT/INSERT/UPDATE nessas tabelas.
- `pg_policies`: seis policies confirmadas — `clients_client_read`, `shoots_client_read`, `experience_packages_client_read`, `payments_client_read`, `preparation_tasks_client_read`, `preparation_tasks_client_update`.
- `pg_proc`: `owns_portal_shoot(uuid)` pertence a postgres, SECURITY DEFINER, stable, search_path vazio; EXECUTE authenticated=true/anon=false. `sync_preparation_completed_at()` confirmado. `pg_trigger`: `preparation_tasks_sync_completed_at` habilitado, BEFORE INSERT OR UPDATE OF status.
- `pg_constraint`: `preparation_tasks_actionable_requires_visible` e `preparation_tasks_status_completed_consistent` validados; zero registros violando as invariantes.
- Fixtures UUID únicas provaram isolamento A/B, portal desativado/cancelado, pagamentos confirmados, visibilidade/actionable, negação de notes/proof e escrita fora de status, conclusão/reabertura e rejeição de invariantes. Rollback e query final: zero resíduos em auth.users, profiles, clients, experience_packages, shoots, preparation_tasks e payments.
- TDD RED/GREEN; focados originais: 15 passed/2 skipped. Na revisão, `tests/domain/shoot-client-fields.test.ts` adicionou cobertura parametrizada aos dois schemas para trim/preservação, omissão, limites 120/300/2000 e excesso; `npm run test -- tests/domain/shoot-client-fields.test.ts` — 24/24. O teste falhou controladamente com os campos removidos (18 failed/6 passed) e voltou a GREEN após restauração; conjunto focado final `npm run test -- tests/domain/shoot-client-fields.test.ts tests/domain/create-confirmed-shoot.test.ts tests/domain/preparation-tasks.test.ts tests/db/client-portal-migrations.test.ts` — 39 passed/2 skipped. Suíte completa: 232 passed/9 skipped. Typecheck e guard admin passaram; lint sem erros (cinco warnings preexistentes). Ajuste de tipos Zod: `z.coerce.boolean<boolean>()` para compatibilidade de input com `safeExtend`, preservando coerção/refinement.
- Verificação live repetida com `node --env-file-if-exists=.env.local .superpowers/sdd/task-2-verify-live.mjs` (usuário autorizou explicitamente com “sim”): `PRESERVED_HISTORICAL_COMPLETED_AT 2020-02-03T04:05:06.789Z`, `SUCCESS {"passed":9,...}`, e cleanup final `auth.users=0, profiles=0, clients=0, experience_packages=0, shoots=0, preparation_tasks=0, payments=0`. A repetição de `status='concluida'` preservou exatamente o timestamp histórico.
- Neste checkpoint histórico, a home ainda estava pendente; ela foi entregue na Task 5 abaixo. Privilégios legados REFERENCES/TRIGGER/TRUNCATE já documentados em DECISIONS permanecem fora desta mudança.

**Task 4 — núcleo puro do portal concluído (2026-09-06)**

- Adicionados tipos client-safe e funções puras para seleção canônica do ensaio, calendário `America/Manaus`, countdown, jornada, próximo passo de preparação e resumo financeiro.
- A seleção não altera a entrada, ignora ensaios cancelados/desabilitados, prefere o próximo ensaio ativo e usa ID como desempate determinístico. Os resumos não criam estado persistido: contam apenas tarefas visíveis e pagamentos confirmados.
- TDD RED/GREEN registrado em `.superpowers/sdd/task-4-report.md`; testes focados, typecheck, lint, guard de auth admin e suíte completa executados antes do commit.

**Task 5 — read model compartilhado e home C+ concluídos (2026-09-07)**

- `readPortalContext()` valida o JWT com `auth.getUser()`, descobre o Client exclusivamente por RLS e seleciona o Shoot canônico. `React.cache` deduplica esse contexto por request entre layout e page; leitores separados carregam só as seções de cada rota (Home: experiência+tarefas; Checklist: tarefas; Ensaio: experiência+tarefas+pagamentos; Styling: referências).
- A seleção continua canônica e pura: próximo ensaio habilitado/não cancelado em ordem crescente; sem futuro, o mais recente elegível em ordem decrescente. Somente depois da seleção, pacote, tarefas e pagamentos independentes são lidos em paralelo para o Shoot escolhido.
- O PostgREST live serializou `numeric` como número, diferente da string decimal do Drizzle. O boundary normaliza `agreed_price` e `amount` textualmente para duas casas dentro de `numeric(10,2)`, rejeitando `null`/fora da faixa/malformado com `PortalReadError` neutro e causa preservada apenas para observabilidade.
- A home C+ usa a jornada de seis etapas como estrutura narrativa, texto para concluída/atual/próxima, countdown Manaus, progresso com texto e ARIA e um único CTA primário. Empty/error states têm orientação e retry nativo; somente o error boundary é Client Component.
- Revisão visual local em 320 px e 1280 px confirmou ausência de overflow horizontal, headings H1→H2, targets de 44–45 px e foco visível. Não há emoji, gradiente, biblioteca ou asset novo.
- Teste live opt-in criou dois Auth users e dois Clients/Shoots com pagamentos e tarefas. Cada JWT compôs somente seu Client/Shoot; pagamento pendente e tarefa oculta ficaram ausentes; guessed IDs de Shoot e Client retornaram `[]`. O `afterAll` removeu tasks, payments, jobs, shoots, clients e ambos Auth users nessa ordem e consultou zero resíduos em cada relação/identidade.
- RED/GREEN, gates e revisão detalhados em `.superpowers/sdd/task-5-report.md`.
- Fix round 1: os dois UUIDs de Auth agora são pré-alocados e registrados antes de qualquer `createUser`, passados explicitamente ao SDK e sempre percorridos no teardown. A ausência é aceita somente no shape real `AuthApiError` + HTTP 404 + `user_not_found`; rede, permissão, resposta ambígua ou usuário ainda existente entram no `AggregateError`. O live A/B foi repetido com 2/2 e zero resíduos.
- A página captura um único `Date` para seleção e calendário Manaus, evitando divergência ao cruzar meia-noite; tarefas de styling visíveis mas não acionáveis agora preservam o destino e usam o rótulo coerente `Ver styling`.
- Fechamento de 2026-09-07: gate não-live 366 testes/20 skips e gate live 386/386, zero skips. Auditoria externa após a suíte: zero Client/Shoot/Payment/PreparationTask/Profile/Auth dos prefixos Epic 3 e zero objeto Storage correspondente.

---

### SCL-303 — Checklist acionável pela cliente

- Status: DONE
- Priority: P1
- Area: client/admin
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-240, SCL-302
- Blocks: primeiro marco E2E
- Files/Scope: `domain/portal/checklist.ts`, `components/client/client-checklist.tsx`, `app/(client)/minha-experiencia/checklist/page.tsx`, `app/admin/(protected)/agenda/[id]/preparacao/{page,checklist}.tsx`, `tests/{domain/client-checklist,components/client-checklist,domain/portal-rls.integration}.test.ts(x)`
- Migration: no
- Updated at: 2026-09-07

**Goal**

Permitir que a cliente autenticada altere somente o status das tarefas explicitamente acionáveis, mantendo tarefas acompanhadas pelo estúdio em modo somente leitura e os controles de visibilidade/acionabilidade no Admin.

**Acceptance criteria**

- [x] checklist usa as mesmas `preparation_tasks` do Admin, sem fonte ou estado otimista paralelo;
- [x] browser envia somente `{ status }`, filtra por task ID e usa o JWT Supabase da sessão;
- [x] Server Component projeta ao browser somente ID da tarefa, título, status, prazo e acionabilidade;
- [x] tarefa acionável tem select rotulado e target de 44 px; somente leitura não renderiza controle e informa “Acompanhada pelo estúdio”;
- [x] loading desabilita os controles de status, anuncia progresso e `router.refresh()` ocorre somente após sucesso;
- [x] falha apresenta mensagem neutra com `role="alert"`, sem expor `PostgrestError`;
- [x] Admin distingue interno, visível somente e editável pela cliente; criação envia os dois booleanos à action protegida, cujo schema rejeita acionável oculta e cujo fluxo registra auditoria;
- [x] teste live A/B prova update permitido, trigger de `completed_at`, negação read-only/hidden/portal desabilitado/cross-client e persistência inalterada das negações, com cleanup verificado;
- [x] testes focados, typecheck, lint, guard admin, build e suíte completa passaram.

**Implementation notes**

- `setClientTaskStatus()` usa uma interface estrutural browser-safe e a cadeia `from("preparation_tasks").update({ status }).eq("id", taskId).select("id,status,completed_at").single()`; o boundary converte qualquer falha em erro neutro.
- A página permanece Server Component e `ClientChecklist` concentra apenas a interação. O contrato serializado é um `Pick<PortalTask, ...>` sem `shootId`, Client ID, tipo interno ou timestamps não usados.
- O select mantém o valor anterior durante a escrita e só aplica um overlay local depois que o banco devolve a linha confirmada; a key derivada dos statuses do RSC descarta esse overlay na reconciliação, sem effect ou loop.
- O Admin continua usando `defineAdminAction`, `addPreparationTaskFormSchema` e `recordAuditEvent`; nenhuma credencial privilegiada foi introduzida no caminho da cliente.
- Layouts cliente e Admin permanecem fluidos em 320 px; selects, labels dos checkboxes e botão de ciclo têm área mínima de 44 px e usam somente tokens existentes.
- Contrato concorrente aprovado para o MVP: o banco e a RLS garantem autorização, e a última escrita válida vence (last-write-wins). Versionamento/CAS e aviso de conflito ficam como follow-up somente se concorrência real justificar, sem ampliar este brief.

**Blocker/Hand-off notes**

- concluído: mutação client-side RLS-bound, checklist cliente, rota, controles Admin, cobertura live e gates.
- concern: lint mantém cinco warnings `no-unused-vars` preexistentes em testes não tocados; zero erros.
- decisão consciente: não há detecção de conflito concorrente neste MVP; vale last-write-wins conforme o contrato aprovado.
- fechamento: `tests/domain/portal-rls.integration.test.ts` participou do gate live completo de 2026-09-07; suíte total 386/386, zero skips, seguida de auditoria com zero resíduos. Gate não-live: 366 testes/20 skips.
- próximo passo: apenas a caminhada browser da Task 10 para observar a mesma row no Admin; nenhuma aresta de persistência ficou sem prova automatizada.

---

### SCL-304 — Meu Ensaio e composição Shoot+Payment

- Status: DONE
- Priority: P1
- Area: client/admin
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-220, SCL-302
- Blocks: primeiro marco E2E
- Files/Scope: `components/client/my-shoot.tsx`, `app/(client)/minha-experiencia/ensaio/page.tsx`, formulários/detalhe de ensaio do Admin, contrato `NEXT_PUBLIC_STUDIO_WHATSAPP_URL`, runbooks e testes `my-shoot`, `admin-shoot-logistics` e `portal-shoot-payment.integration`
- Migration: no
- Updated at: 2026-09-07

**Goal**

Refletir no portal os detalhes client-safe do ensaio ativo e a mesma composição financeira do Studio OS, dando ao Admin um lugar explícito para manter local, ponto de encontro e orientações da cliente.

**Acceptance criteria**

- [x] rota protegida `/minha-experiencia/ensaio` lê o `PortalSnapshot` existente com o cliente Supabase da sessão, sem nova fonte de dados ou estado financeiro paralelo;
- [x] página apresenta data/horário, experiência, etapa atual da jornada, resumo de preparação, logística e financeiro em português, com hierarquia semântica e layout fluido;
- [x] financeiro mostra exatamente valor contratado, total confirmado pago, saldo derivado e status client-facing; linhas pendentes/estornadas não entram no total;
- [x] props do componente não aceitam notas ou comprovantes de Payment, e a tela não renderiza observações internas do Shoot;
- [x] ausência de ensaio, pacote, horário, logística ou URL de contato tem copy orientativa e não produz link incompleto;
- [x] CTA externo “Falar com o estúdio” usa `NEXT_PUBLIC_STUDIO_WHATSAPP_URL`, `rel="noreferrer"`, target de 44 px e foco visível;
- [x] formulários Admin de criação/edição coletam `locationName`, `locationAddress` e `clientGuidance`, exibem erros por campo e o detalhe separa logística da cliente de observações internas;
- [x] teste live cria Auth/Client/Shoot pelo fluxo transacional, registra pagamentos confirmado e pendente, lê com JWT da cliente e comprova somente `250.00` pago, saldo `750.00` e status `parcial`;
- [x] teardown live remove e verifica zero resíduos em pagamentos, tarefas iniciais, job de produção, ensaio, cliente e Auth user;
- [x] testes focados, suíte completa, typecheck, lint, guard admin, build e diff-check passaram.

**Implementation notes**

- `MyShoot` permanece Server Component e recebe somente o snapshot client-safe já aprovado. Usa `formatShootDate`, `formatBRL`, `getJourney`, `summarizePortalPreparation` e `summarizePortalMoney`; não há JavaScript de interação novo no browser.
- A narrativa C+ organiza os dados em quatro capítulos reais da experiência — data, pacote, logística e financeiro — usando somente tokens existentes, sem asset, gradiente, emoji ou dependência adicional.
- O WhatsApp é configuração pública por ambiente no formato completo `https://wa.me/...`; o contrato foi documentado em `.env.example`, setup Supabase e checklist Vercel.
- A limitação de edição opcional permanece deliberadamente a mesma do Studio OS: `toFormAction` descarta string vazia, portanto apagar um campo e enviar não o converte em `null`; o valor anterior fica inalterado. O refactor de nullable clearing continua como follow-up registrado em `docs/DECISIONS.md`.

**Blocker/Hand-off notes**

- concluído: leitura client-safe do ensaio, logística Admin, resumo Shoot+Payment compartilhado, contrato WhatsApp, cobertura unitária/live e todos os gates.
- concern: lint mantém cinco warnings `no-unused-vars` preexistentes em testes não tocados; zero erros.
- infraestrutura: o primeiro comando live dentro do sandbox foi bloqueado com `EACCES` antes de criar a identidade; a repetição autorizada com rede passou e validou o teardown completo.
- fechamento: `tests/domain/portal-shoot-payment.integration.test.ts` participou do gate live completo de 2026-09-07; suíte total 386/386, zero skips, e auditoria final sem resíduos. Gate não-live: 366 testes/20 skips.
- próximo passo: conferir a apresentação e o CTA na caminhada browser descartável da Task 10; composição financeira não tem pendência conhecida.

---

### SCL-305 — Styling e referências colaborativas

- Status: DONE
- Priority: P1
- Area: client/admin
- Owner: agent:codex
- Branch: main
- PR: —
- Depends on: SCL-103, SCL-105, SCL-302
- Blocks: primeiro marco E2E
- Files/Scope: `db/schema/styling-references.ts`, migrations `0026`–`0031`, `domain/styling/*`, `components/{client/styling-board,admin/styling-manager}.tsx`, páginas de Styling/agenda e testes de schema, migration, RLS, Storage, read model e UI
- Migration: yes — `0026_styling_references.sql` a `0031_serialize_styling_lifecycle.sql` aplicadas no Supabase real
- Updated at: 2026-09-07

**Goal**

Oferecer um moodboard privado e colaborativo do ensaio ativo, no qual cliente e estúdio compartilham referências sem transformar o bucket de Storage em galeria pública.

**Acceptance criteria**

- [x] tabela `styling_references` guarda somente metadata e caminho privado; nenhuma URL pública é persistida;
- [x] bucket `styling-references` é privado, limitado a JPEG/PNG/WebP, 8 MB por arquivo e 20 referências por ensaio;
- [x] path canônico usa `<auth-user-uuid>/<shoot-uuid>/<object-key>`; o browser gera UUID e extensão pelo MIME, nunca pelo nome original;
- [x] RLS de tabela e Storage isola clientes por ensaio, permite leitura das referências do estúdio para o próprio ensaio e restringe exclusão da cliente às referências `origin = client` enviadas por ela;
- [x] staff/admin pode ler, adicionar e remover todas as referências por policies autenticadas; `anon` não recebe grants;
- [x] upload reserva metadata antes de tocar Storage; falha do upload remove objeto parcial antes de liberar a row; exclusão é object-first e mantém a row se a ausência do objeto não for confirmada; erros de lifecycle mantêm mensagem neutra e chegam ao Sentry com `shootId`/`storagePath`/`referenceId`;
- [x] `readStylingReferences` assina URLs privadas em lote por uma hora e falha fechado em erro ou cardinalidade divergente;
- [x] `PortalSnapshot` inclui o Auth viewer e as referências do ensaio selecionado sem cachear signed URLs além do render;
- [x] cliente e Admin usam o mesmo board responsivo, com autoria, legenda opcional, empty/loading/error states, ownership de remoção, targets de 44 px, foco visível e reduced motion;
- [x] a página Admin cria um único cliente Supabase cookie-bound, valida `auth.getUser()` fail-closed e reutiliza o mesmo JWT na leitura staff, sem passar por `readPortalSnapshot`;
- [x] testes live comprovam upload e delete pelas funções reais, URL assinada, isolamento A/B, persistência após tentativa alheia, cota sobre objetos órfãos, serialização concorrente upload/delete/insert, rejeição `23514` da 21ª ocupação e teardown sem resíduos;
- [x] testes focados, suíte completa, typecheck, lint, guard Admin e build passaram.

**Implementation notes**

- O limite client-side oferece feedback antecipado; o banco conta rows e objetos, e os helpers de Storage/delete compartilham com o trigger o advisory transaction lock por Shoot.
- O board usa `<img>` nativo com exceção eslint local e documentada: as URLs Supabase são privadas, efêmeras e o host não integra a configuração de `next/image` neste marco.
- O grid cronológico mantém a direção editorial C+: numeração funcional, autoria “Você/Estúdio” e um único formulário de contribuição, usando somente os tokens visuais existentes.
- O SDK Storage responde sucesso vazio quando uma policy de delete filtra todos os objetos. Por isso o fluxo lê a row autorizada, remove e confirma a ausência do objeto, e só então apaga a metadata; a policy do banco também impede apagar a row enquanto o objeto existir.
- No harness jsdom, `File` pertence a outra realm e o fetch Node o serializa como `text/plain`; o teste live usa `Blob` nativo de `node:buffer` somente na borda do fixture. Os testes unitários continuam usando `File` browser real.

**Blocker/Hand-off notes**

- concluído: schema/bucket/policies, operações browser-safe, signed reads, board cliente/Admin, integração no snapshot e cobertura unitária/live.
- concern: lint mantém cinco warnings `no-unused-vars` preexistentes em testes não tocados; zero erros e zero warnings novos.
- infraestrutura: migrations `0029`–`0031` aplicadas no Supabase real; integração focada final passou em RLS 5/5 e Storage 2/2, incluindo a corrida upload/delete/insert.
- QA visual autenticada concluída com 25 verificações em viewport mobile/desktop: navegação por skip link, responsividade, checklist acionável/read-only, composição financeira, URLs assinadas, upload/visualização, cancelamento/confirmação de exclusão, avanço Admin refletido no portal, logout mobile e link inválido. Screenshots descartáveis ficaram em `.superpowers/sdd/screenshots/`.
- fechamento: a revisão inteira teve duas ondas de hardening. A primeira eliminou autorização admin dependente de layout, TOCTOU do vínculo, upload sem reserva, leitura excessiva por rota e timestamp escrito pela aplicação. A segunda fechou objetos órfãos e serializou reserva/Storage/delete pelo mesmo lock. Revisão final dupla: nenhum Critical/Important; um minor não bloqueante de idempotência em deletes simultâneos.
- gates finais: `npm run test` — 385 passed/20 skipped; full live — 405/405; `typecheck` — 0 erro; `lint` — 0 erro/5 warnings históricos; `check:admin-auth` — OK; `predb:migrate` — OK; `build` — 18 entradas processadas e as quatro rotas do portal dinâmicas; `git diff --check` — 0 erro. Auditoria externa final: zero rows, Auth users e objetos Storage dos fixtures Epic 3.
- próximo passo: nenhum para o Epic 3; após o push, confirmar GitHub Actions verde e deploy de produção da Vercel disponível.

---

### SCL-310 — Contratos PDF privados

- Status: DONE
- Priority: P1
- Area: admin/db
- Owner: agent:codex
- Branch: codex/contracts-pdf
- PR: —
- Depends on: SCL-100, SCL-103, SCL-104, SCL-107
- Blocks: emissão administrativa de contratos
- Files/Scope: contratos, campos civis da cliente, Storage privado e emissão Admin
- Migration: yes
- Updated at: 2026-09-08 America/Manaus

**Goal**

Estabelecer o registro imutável de contratos e a base privada de Storage para futuras emissões administrativas.

**Acceptance criteria**

- [x] schema expõe o contrato imutável, snapshots e estados emitido/anulado;
- [x] dados civis da cliente permanecem opcionais;
- [x] tabela e objetos de contrato permitem acesso somente a staff autenticado;
- [x] bucket `contracts` permanece privado;
- [x] migration serial e testes de contrato passam.

**Implementation notes**

- Nenhum dado pessoal real é registrado nesta task; valores civis existem somente no runtime privado.

**Blocker/Hand-off notes**

- concluído (2026-09-08): implementação de contratos privados, migration serial, emissão administrativa e download protegido.
- evidência live aprovada: ambiente autorizado de dev/staging confirmou acesso de staff, negação no portal e cleanup completo de fixtures; sem registrar identidades, segredos ou URLs assinadas.
- gates locais (2026-09-08): regressões focadas de contratos; `predb:migrate`, `test`, `lint`, `typecheck`, `check:admin-auth`, `build` e `git diff --check` concluídos sem falha.
- concluído após merge (2026-09-08): integrado em `main` no commit `bdc8da0`.

---

# Release Gate revisado — fechamento do MVP

O produto **não deve ser declarado funcionalmente completo** apenas porque Admin/Portal estão prontos. Para o release de produto planejado, os seguintes blocos precisam estar `DONE` ou conscientemente removidos do release pelo Product Owner:

- Comercial: SCL-250–254 + SCL-404/405;
- Site: SCL-400–406 + SCL-557;
- Acervo: SCL-550–557;
- Galeria/Reveal/Pós-venda: SCL-500–507;
- Comunicação: SCL-700–705;
- Review/indicação: SCL-720–722;
- SCL-310 contratos, ou decisão explícita de lançamento sem emissão administrativa.

`SCL-306`, `SCL-558`, `SCL-723`, `SCL-800`, `SCL-810`, `SCL-811` e `SCL-820` não bloqueiam o MVP.

---

# Tasks novas detalhadas — revisão 2.0

### SCL-250 — Funil de Leads no Admin

- Status: BACKLOG
- Priority: P1
- Area: admin/commercial
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-101, SCL-200
- Blocks: SCL-251, SCL-252, SCL-253
- Files/Scope: `app/admin/**/leads/**`, `domain/leads/**`, `components/admin/**`
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Goal**

Transformar o schema Lead já existente em ferramenta comercial real do Studio OS.

**Acceptance criteria**

- [ ] lista/funil por status `novo`, `contato`, `proposta`, `negociacao`, `ganho`, `perdido`;
- [ ] busca e filtros por origem, status e responsável;
- [ ] exibe ocasião e resultado de quiz quando consentido;
- [ ] link para ficha do Lead;
- [ ] leitura protegida por staff/admin;
- [ ] estado vazio e paginação/limites coerentes com o restante do Admin.

---

### SCL-251 — Ficha do Lead

- Status: BACKLOG
- Priority: P1
- Area: admin/commercial
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-250
- Blocks: SCL-252, SCL-253
- Files/Scope: `app/admin/**/leads/[id]/**`, `domain/leads/**`
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Goal**

Centralizar contexto, origem, contatos, quiz e histórico de movimentação do Lead antes da conversão.

**Acceptance criteria**

- [ ] mostra contato/origem/ocasião/status/responsável;
- [ ] mostra curadoria/quiz consentido sem expor dados além do necessário;
- [ ] permite notas comerciais;
- [ ] apresenta CTAs de avançar estágio, converter em Cliente ou marcar perdido;
- [ ] histórico/auditoria das mudanças relevantes.

---

### SCL-252 — Transição de estágio + auditoria

- Status: BACKLOG
- Priority: P1
- Area: commercial
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-101, SCL-107, SCL-251
- Blocks: SCL-253
- Files/Scope: `domain/leads/**`, Admin Lead actions
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Goal**

Usar `canTransitionLeadStatus()` como única regra de estágio e auditar toda alteração.

**Acceptance criteria**

- [ ] UI oferece somente transições válidas;
- [ ] Server Action revalida a transição;
- [ ] `perdido` solicita motivo;
- [ ] `AuditLog` registra before/after;
- [ ] nenhuma UI grava status diretamente sem serviço de domínio.

---

### SCL-253 — Converter Lead → Client

- Status: BACKLOG
- Priority: P1
- Area: commercial/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-100, SCL-101, SCL-252
- Blocks: SCL-254
- Files/Scope: `domain/leads/**`, `domain/clients/**`
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Goal**

Converter Lead ganho em Client sem recadastro manual e sem duplicar pessoas.

**Acceptance criteria**

- [ ] detecta Client existente por regras seguras de deduplicação;
- [ ] cria ou vincula Client;
- [ ] preserva origem, indicação e perfil/quiz consentido;
- [ ] marca Lead como `ganho` conforme regra de domínio;
- [ ] operação auditada e idempotente.

---

### SCL-254 — Converter Lead ganho → Shoot/reserva

- Status: BACKLOG
- Priority: P1
- Area: commercial/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-103, SCL-211, SCL-253
- Blocks: first-contact-to-reservation E2E
- Files/Scope: `domain/leads/**`, `domain/shoots/**`, Admin Lead UI
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Goal**

Criar um Shoot confirmado a partir do Lead convertido reutilizando `createConfirmedShoot()`.

**Acceptance criteria**

- [ ] Client vinculado é reutilizado;
- [ ] experiência/data/valor passam pelo contrato de Shoot existente;
- [ ] criação deriva ProductionJob + checklist exatamente como SCL-211;
- [ ] origem comercial permanece rastreável;
- [ ] não há segundo fluxo de criação de ensaio com regras próprias.

---

### SCL-404 — Persistência consentida da curadoria

- Status: BACKLOG
- Priority: P1
- Area: site/client/commercial
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-403, SCL-101
- Blocks: SCL-405, Lead qualification E2E
- Files/Scope: quiz result domain, leads, consent UI
- Migration: evaluate; prefer existing Lead columns if sufficient
- Updated at: 2026-09-07 America/Manaus

**Goal**

Fazer o quiz gerar qualificação comercial persistível somente com consentimento, conectando Site → Lead → CRM.

**Acceptance criteria**

- [ ] resultado não cria Client prematuramente;
- [ ] consentimento explícito antes de persistir identificação/resultado;
- [ ] salva persona/respostas relevantes/origem no Lead;
- [ ] resultado pode ser reaproveitado após conversão;
- [ ] recusa de consentimento não impede usar o quiz anonimamente;
- [ ] analytics diferencia quiz concluído de Lead criado.

---

### SCL-405 — CTA WhatsApp contextual + tracking

- Status: BACKLOG
- Priority: P1
- Area: site/commercial
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-403, SCL-404
- Blocks: none
- Files/Scope: public CTAs, analytics events
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] CTA inclui contexto útil do quiz/experiência sem PII sensível;
- [ ] funciona sem quiz;
- [ ] registra evento de clique/origem;
- [ ] URLs configuráveis por ambiente.

---

### SCL-406 — SEO técnico + Analytics

- Status: BACKLOG
- Priority: P1
- Area: site
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-400, SCL-401, SCL-402
- Blocks: public launch gate
- Files/Scope: metadata, sitemap, robots, structured data, analytics
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] metadata/title/description por página;
- [ ] canonical, Open Graph, sitemap e robots;
- [ ] LocalBusiness/schema.org quando aplicável;
- [ ] GA4 e Search Console preparados;
- [ ] eventos: CTA WhatsApp, quiz started/completed, lead created;
- [ ] nenhuma PII em eventos de analytics.

---

### SCL-500 — Schema Gallery

- Status: BACKLOG
- Priority: P1
- Area: gallery/db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-103
- Blocks: SCL-501,SCL-502,SCL-503
- Files/Scope: `db/schema/galleries*`, `domain/gallery/**`
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] uma Gallery pertence a um Shoot;
- [ ] estados `draft`, `published`, `archived` ou contrato equivalente documentado;
- [ ] cover/title/message/publishedAt modelados;
- [ ] RLS/servidor isolam cada cliente;
- [ ] provider de storage não faz parte da identidade de domínio.

---

### SCL-501 — GalleryAsset + storage privado

- Status: BACKLOG
- Priority: P1
- Area: gallery/storage
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-500
- Blocks: SCL-502,SCL-505
- Files/Scope: gallery asset schema, storage abstraction, R2/Supabase adapter
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] asset guarda metadata/object key, nunca depende de URL pública permanente;
- [ ] originais privados;
- [ ] thumbnails/variants quando necessário;
- [ ] URLs assinadas/temporárias;
- [ ] upload/delete idempotente e observável;
- [ ] arquitetura permite R2 sem contaminar o domínio.

---

### SCL-502 — Gestão/publicação da galeria

- Status: BACKLOG
- Priority: P1
- Area: gallery/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-500,SCL-501,SCL-230
- Blocks: SCL-503
- Files/Scope: Admin gallery UI/actions
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] staff cria/edita galeria de um Shoot;
- [ ] ordena assets e define cover;
- [ ] preview antes de publicar;
- [ ] publicação é auditada;
- [ ] publicação dispara evento para Reveal/notificação;
- [ ] cliente não vê draft.

---

### SCL-503 — Reveal

- Status: BACKLOG
- Priority: P1
- Area: gallery/client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-500,SCL-502,SCL-301
- Blocks: SCL-504,SCL-505,SCL-506,SCL-703
- Files/Scope: client Reveal + gallery read model
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] experiência de abertura/reveal com mensagem/cover;
- [ ] somente a cliente do Shoot publicado acessa;
- [ ] mobile-first e acessível;
- [ ] entra na galeria sem expor storage direto;
- [ ] estado de entrega alimenta pós-venda/review.

---

### SCL-504 — Favoritos / PhotoSelection

- Status: BACKLOG
- Priority: P1
- Area: gallery/client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-500,SCL-503
- Blocks: SCL-506
- Files/Scope: gallery selections domain/UI
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] cliente favorita/desfavorita somente assets da própria Gallery;
- [ ] persistência única por cliente/gallery/asset;
- [ ] contagem disponível para Admin e upsell;
- [ ] concorrência/idempotência tratadas.

---

### SCL-505 — Downloads autorizados

- Status: BACKLOG
- Priority: P1
- Area: gallery/client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-501,SCL-503
- Blocks: none
- Files/Scope: download authorization, signed URLs
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] download só de assets autorizados;
- [ ] signed URL com expiração;
- [ ] opção de bloquear originais/download por Gallery;
- [ ] nenhuma chave privada no browser.

---

### SCL-506 — Catálogo de produtos/upsells

- Status: BACKLOG
- Priority: P1
- Area: gallery/commerce
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-500,SCL-503
- Blocks: SCL-507
- Files/Scope: upsell product schema/domain/UI
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] produtos configuráveis: foto adicional, coleção completa, álbum, quadro, Reel/Stories;
- [ ] preço interno/ativo/descrição;
- [ ] ofertas podem ser habilitadas por Gallery/Shoot;
- [ ] não hardcodear catálogo na UI.

---

### SCL-507 — Pedido de upsell + Financeiro

- Status: BACKLOG
- Priority: P1
- Area: gallery/finance
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-104,SCL-506
- Blocks: none
- Files/Scope: UpsellOrder/OrderItem, finance integration
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] pedido vinculado a Client/Shoot/Gallery;
- [ ] itens e valor snapshotados no pedido;
- [ ] status de pedido separado de pagamento;
- [ ] cobrança reutiliza Payment/Financeiro ou fluxo documentado, sem saldo paralelo;
- [ ] Admin acompanha pedidos.

---

### SCL-550 — Schema InventoryItem

- Status: BACKLOG
- Priority: P1
- Area: inventory/db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-005
- Blocks: SCL-551,SCL-552,SCL-553
- Files/Scope: inventory schema/domain
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Goal**

Criar fonte de verdade para o acervo físico do estúdio, incluindo Paixão Clutch.

**Acceptance criteria**

- [ ] tipos iniciais: outfit, clutch, accessory, prop/scenery;
- [ ] código, nome, descrição, cor, tamanho opcional, status, ativo e preço interno opcional;
- [ ] status não é derivado só pela UI;
- [ ] RLS staff/admin;
- [ ] estrutura preparada para fotos e reservas.

---

### SCL-551 — Mídia dos itens de acervo

- Status: BACKLOG
- Priority: P1
- Area: inventory/storage
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-550
- Blocks: SCL-552,SCL-557
- Files/Scope: inventory media schema/storage
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] múltiplas fotos por item;
- [ ] cover/order;
- [ ] mídia de Admin privada e variante publicável quando item entra no catálogo público;
- [ ] sem URL pública persistente como fonte de verdade.

---

### SCL-552 — CRUD Admin do Acervo

- Status: BACKLOG
- Priority: P1
- Area: inventory/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-550,SCL-551,SCL-200
- Blocks: SCL-556
- Files/Scope: Admin inventory screens/actions
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] listar/buscar/filtrar por tipo/status/cor/tamanho;
- [ ] criar/editar/inativar item;
- [ ] gerenciar fotos;
- [ ] ficha mostra reservas futuras;
- [ ] ações auditadas.

---

### SCL-553 — InventoryReservation + conflitos

- Status: BACKLOG
- Priority: P1
- Area: inventory/db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-103,SCL-550
- Blocks: SCL-554,SCL-555,SCL-558
- Files/Scope: reservation schema/domain, shoot integration
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] reserva vincula InventoryItem a Shoot;
- [ ] intervalo/status/cancelamento modelados;
- [ ] não confirma conflito de datas sem decisão explícita;
- [ ] fluxo de ensaio mostra itens reservados;
- [ ] cancelamento/liberação mantém histórico.

---

### SCL-554 — Seleção de figurinos/clutches pela cliente

- Status: BACKLOG
- Priority: P1
- Area: inventory/client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-305,SCL-553
- Blocks: none
- Files/Scope: Minha Experiência styling inventory UI
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] cliente vê somente itens elegíveis/ativos para seu fluxo;
- [ ] diferencia preferência de reserva confirmada;
- [ ] fotos e detalhes suficientes para decisão;
- [ ] staff confirma/ajusta reserva;
- [ ] indisponibilidade aparece sem prometer item conflitante.

---

### SCL-555 — Styling ↔ itens reais reservados

- Status: BACKLOG
- Priority: P1
- Area: inventory/client/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-305,SCL-553
- Blocks: none
- Files/Scope: styling/inventory integration
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] moodboard continua aceitando referências livres;
- [ ] item real do acervo é exibido com identidade própria;
- [ ] portal mostra o que é inspiração vs. reservado;
- [ ] Admin consegue relacionar referência a item quando útil.

---

### SCL-556 — Curadoria Paixão Clutch no Admin

- Status: BACKLOG
- Priority: P1
- Area: inventory/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-552
- Blocks: SCL-557
- Files/Scope: inventory clutch fields/curation
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] filtrar `InventoryItem.type = clutch`;
- [ ] marcar itens publicáveis/destaque;
- [ ] definir ordem/cover/copy curta;
- [ ] disponibilidade operacional vem das reservas, não de flag manual isolada.

---

### SCL-557 — Paixão Clutch pública

- Status: BACKLOG
- Priority: P1
- Area: site/inventory
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-551,SCL-556,SCL-400
- Blocks: public launch gate
- Files/Scope: public Paixão Clutch section/page
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] seção/página coerente com o branding Carol Lucas;
- [ ] usa somente itens marcados como publicáveis;
- [ ] CTA “consultar disponibilidade”/WhatsApp;
- [ ] integra a clutch como parte do styling dos ensaios;
- [ ] não exige preço público;
- [ ] SEO/analytics cobrem a página/CTA.

---

### SCL-558 — Aluguel avulso Paixão Clutch

- Status: DEFERRED
- Priority: P2
- Area: inventory/commerce
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-553,SCL-557
- Blocks: none
- Files/Scope: standalone rental workflow
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Goal**

Evoluir a consulta pública para um fluxo completo de aluguel independente de ensaio.

**Acceptance criteria**

- [ ] reserva avulsa com cliente/período/item;
- [ ] retirada/devolução;
- [ ] valor/caução quando aplicável;
- [ ] conflito usa o mesmo motor de InventoryReservation;
- [ ] financeiro reutilizado.

---

### SCL-700 — Infra de eventos + Resend + templates

- Status: BACKLOG
- Priority: P1
- Area: automation
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-008
- Blocks: SCL-701,SCL-702,SCL-703,SCL-704,SCL-705
- Files/Scope: automation events/outbox, email provider, templates
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] evento persistido/idempotente antes ou junto da ação relevante;
- [ ] provider Resend encapsulado;
- [ ] templates versionados;
- [ ] nenhuma PII em logs desnecessários;
- [ ] delivery status modelado;
- [ ] ambiente dev/test não envia e-mail real por padrão.

---

### SCL-701 — Boas-vindas após reserva

- Status: BACKLOG
- Priority: P1
- Area: automation
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-211,SCL-700
- Blocks: none
- Files/Scope: reservation event handler/template
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] 1 envio por reserva confirmada/idempotente;
- [ ] CTA para Minha Experiência;
- [ ] conteúdo não expõe informação interna;
- [ ] falha entra no retry/log.

---

### SCL-702 — Scheduler D-7 / D-1

- Status: BACKLOG
- Priority: P1
- Area: automation
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-700,SCL-103
- Blocks: none
- Files/Scope: scheduler/reminders
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] calcula datas em timezone do estúdio;
- [ ] não envia para ensaio cancelado/reagendado fora da janela;
- [ ] D-7 e D-1 idempotentes;
- [ ] conteúdo contextualiza preparação/portal.

---

### SCL-703 — Notificações de Reveal/Galeria

- Status: BACKLOG
- Priority: P1
- Area: automation/gallery
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-502,SCL-503,SCL-700
- Blocks: none
- Files/Scope: gallery publish event/templates
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] publica e comunica em eventos separados/idempotentes;
- [ ] link autenticado para Reveal;
- [ ] draft nunca dispara comunicação;
- [ ] retry sem duplicar envio.

---

### SCL-704 — Pedido de review pós-entrega

- Status: BACKLOG
- Priority: P1
- Area: automation/growth
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-503,SCL-700,SCL-720
- Blocks: SCL-721
- Files/Scope: post-delivery review automation
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] só dispara após entrega/reveal conforme regra definida;
- [ ] não dispara novamente se review concluído;
- [ ] CTA configurável para Google;
- [ ] status registrado no Review.

---

### SCL-705 — Delivery log + retry + idempotência

- Status: BACKLOG
- Priority: P1
- Area: automation
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-700
- Blocks: production reliability gate
- Files/Scope: automation delivery workers/logging
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] chave idempotente por evento/template/destinatário;
- [ ] estados pending/sent/failed/retry ou equivalentes;
- [ ] retry com limite/backoff;
- [ ] erro observável no Sentry/log estruturado;
- [ ] reprocessamento manual seguro pelo Admin/runbook.

---

### SCL-720 — Schema/serviços Review + Referral

- Status: BACKLOG
- Priority: P1
- Area: growth/db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-100,SCL-103
- Blocks: SCL-704,SCL-721,SCL-722
- Files/Scope: review/referral schema/domain
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] Review vincula Client/Shoot quando aplicável, requestedAt/completedAt/source/external target;
- [ ] Referral registra referrer e referred Client/Lead quando conhecido;
- [ ] conversão de indicação mensurável;
- [ ] RLS/admin access definidos;
- [ ] não duplicar `clients.referrer_client_id`: decidir papel do campo legado e registrar em DECISIONS.

---

### SCL-721 — Fluxo de avaliação / Google

- Status: BACKLOG
- Priority: P1
- Area: growth/client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-704,SCL-720
- Blocks: none
- Files/Scope: client review CTA/admin tracking
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] CTA de avaliação aparece no momento pós-entrega correto;
- [ ] link externo configurável;
- [ ] pedido/conclusão rastreáveis;
- [ ] sem dark patterns ou bloqueio de uso do portal.

---

### SCL-722 — Tracking de indicação e conversão

- Status: BACKLOG
- Priority: P1
- Area: growth/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-720,SCL-253
- Blocks: none
- Files/Scope: referral conversion/domain/admin
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] Lead pode apontar origem por indicação;
- [ ] conversão preserva a relação;
- [ ] dashboard/CRM conseguem medir indicações convertidas;
- [ ] não criar loops/relações inconsistentes.

---

### SCL-723 — Oportunidades de recorrência no CRM

- Status: BACKLOG
- Priority: P2
- Area: growth/admin
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-203,SCL-720
- Blocks: none
- Files/Scope: CRM opportunities/insights
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

**Goal**

Sinalizar ocasiões futuras e histórico para recompra, sem implementar ainda programa formal de fidelidade.

---

### SCL-306 — Timeline da experiência

- Status: BACKLOG
- Priority: P2
- Area: client
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-302,SCL-303,SCL-304
- Blocks: none
- Files/Scope: client journey timeline
- Migration: no
- Updated at: 2026-09-07 America/Manaus

**Acceptance criteria**

- [ ] mostra Reserva → Preparação → Ensaio → Produção → Reveal → Entrega;
- [ ] todos os estados são derivados das entidades existentes;
- [ ] nenhuma timeline paralela persistida.

---

### SCL-800 — Virtual Try-On / Prévia de Styling

- Status: DEFERRED
- Priority: P3
- Area: client/ai
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-554
- Blocks: none
- Files/Scope: future
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

**Goal**

Avaliar e, somente após aprovação de qualidade/custo/LGPD, integrar API especializada de virtual try-on. Não bloqueia o MVP.

---

### SCL-810 — Assistente contextual de preparação

- Status: DEFERRED
- Priority: P3
- Area: client/ai
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-302,SCL-303
- Blocks: none
- Files/Scope: future
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

---

### SCL-811 — Agente de dúvidas da cliente

- Status: DEFERRED
- Priority: P3
- Area: client/ai
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-301
- Blocks: none
- Files/Scope: future
- Migration: evaluate
- Updated at: 2026-09-07 America/Manaus

---

### SCL-820 — Programa de fidelidade

- Status: DEFERRED
- Priority: P3
- Area: growth
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-720,SCL-723
- Blocks: none
- Files/Scope: future
- Migration: yes
- Updated at: 2026-09-07 America/Manaus

---

## Hand-off global atual

- PRD: concluído.
- Protótipo de referência: V2.3 Studio OS.
- Modelo de dados: V2.3 disponível.
- Controle legado: planilha disponível para futura migração.
- Domínio: `studiocarollucas.com.br` registrado na Hostinger.
- Stack proposta: Next.js + TypeScript + Tailwind + shadcn/ui + Supabase + Drizzle + Zod + R2 + Resend + Vercel.
- Próximo passo recomendado (revisão 2.0): concluir SCL-310/SCL-402 em andamento e iniciar em paralelo os contratos SCL-500/501 (Galeria), SCL-550/551 (Acervo), SCL-700 (Automações) e a UI SCL-250 (Leads), respeitando migrations serializadas.

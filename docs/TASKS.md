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
| SCL-004 | Projeto Supabase + ambientes | P0 | db | BLOCKED | agent:claude-code | none |
| SCL-005 | Drizzle + migrations | P0 | db | BLOCKED | agent:claude-code | SCL-001,SCL-004 |
| SCL-006 | Auth base | P0 | auth | BLOCKED | agent:claude-code | SCL-004,SCL-005 |
| SCL-007 | RBAC/RLS base | P0 | auth | BLOCKED | agent:claude-code | SCL-006 |
| SCL-008 | Observabilidade (Sentry + logging) | P0 | infra | DONE | agent:claude-code | SCL-001 |
| SCL-009 | Design tokens + layout base | P0 | ui | DONE | agent:claude-code | SCL-001 |
| SCL-100 | Schema Client | P0 | db | BACKLOG | unassigned | SCL-005 |
| SCL-102 | Schema ExperiencePackage | P0 | db | BACKLOG | unassigned | SCL-005 |
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

- Status: BLOCKED
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: none
- Blocks: SCL-005, SCL-006
- Files/Scope: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `docs/runbooks/supabase-setup.md`, `tests/lib/supabase-env.test.ts`
- Migration: no
- Updated at: 2026-09-03

**Goal**

Disponibilizar banco/Auth para desenvolvimento com separação clara de configuração.

**Acceptance criteria**

- [ ] projeto criado;
- [x] URL/keys configuradas via environment variables;
- [x] nenhuma service role key no frontend;
- [ ] conexão testada;
- [x] procedimento de setup documentado.

**Blocker/Hand-off notes**

aguardando o usuário criar o projeto Supabase real e preencher .env.local — código e docs prontos, falta verificação com credenciais reais.

---

### SCL-005 — Configurar Drizzle e migrations

- Status: BLOCKED
- Priority: P0
- Area: db
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-001, SCL-004
- Blocks: SCL-100, SCL-102, SCL-103, SCL-104, SCL-105, SCL-106
- Files/Scope: `drizzle.config.ts`, `db/schema/profiles.ts`, `db/schema/index.ts`, `db/client.ts`, `db/migrations/0000_lazy_pete_wisdom.sql`, `db/migrations/0002_handle_new_user_trigger.sql`, `db/migrations/meta/_journal.json`, `package.json` (scripts `db:generate`/`db:migrate`), `tests/db/schema.test.ts`
- Migration: yes
- Updated at: 2026-09-03

**Goal**

Definir a fonte de verdade do schema e o procedimento serializado de migrations.

**Acceptance criteria**

- [x] Drizzle configurado;
- [ ] migration inicial executa em banco limpo;
- [x] scripts de generate/migrate definidos;
- [x] política de migrations documentada (ver PRD §19.7 — serializadas, uma por vez);
- [ ] CI consegue validar schema/migrations conforme estratégia definida.

**Blocker/Hand-off notes**

Drizzle configurado, schema `profiles` (com `roleEnum`) e client escritos, e a migration inicial (`db/migrations/0000_lazy_pete_wisdom.sql`, com `CREATE TYPE "role"` e `CREATE TABLE "profiles"`) já foi gerada via `npm run db:generate` — isso não exige conexão com banco real, só faz diff do schema TypeScript contra os snapshots em `db/migrations/meta/`. Falta aplicar a migration (`npm run db:migrate`) contra um banco Supabase real: aguardando o mesmo projeto Supabase do SCL-004, bloqueado pela instabilidade parcial do Supabase relatada pelo usuário. Assim que o projeto SCL-004 estiver disponível, rodar `npm run db:migrate` e confirmar a tabela `profiles` no Table Editor antes de marcar DONE.

---

### SCL-006 — Auth base

- Status: BLOCKED
- Priority: P0
- Area: auth
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-004, SCL-005
- Blocks: SCL-007, SCL-300
- Files/Scope: `lib/auth/session.ts`, `lib/auth/safe-redirect.ts`, `proxy.ts`, `app/(client)/login/`, `app/admin/login/`, `app/auth/callback/route.ts`, `app/admin/(protected)/layout.tsx` (substitui os removidos `app/admin/layout.tsx` e `app/admin/page.tsx`), `tests/lib/session.test.ts`, `tests/lib/safe-redirect.test.ts`
- Migration: no
- Updated at: 2026-09-03

**Goal**

Dar a toda a aplicação (Admin e Minha Experiência) uma única forma server-side de saber quem está pedindo — `getCurrentUser()` — em vez de cada rota consultar o Supabase Auth diretamente, além de proteger `/admin` e `/minha-experiencia` por middleware/proxy e oferecer login passwordless (cliente) e email+senha (staff/admin).

**Acceptance criteria**

- [x] `getCurrentUser()` implementado combinando o usuário do Supabase Auth com o papel (`role`) da tabela `profiles` via Drizzle;
- [x] `resolveRole()` extraído como lógica pura e coberto por teste unitário (sem dependência de sessão/banco real);
- [x] `proxy.ts` (convenção atual do Next 16 para o antigo `middleware.ts`) faz refresh de sessão e redireciona requisições não autenticadas em `/admin` (exceto `/admin/login`) e `/minha-experiencia` para o login correspondente;
- [x] login do cliente via magic link (`signInWithOtp`) em `app/(client)/login`;
- [x] login de staff/admin via email+senha (`signInWithPassword`) em `app/admin/login`;
- [ ] fluxo de autenticação real (sessão de usuário de verdade, redirecionamento pós-login, RLS aplicada) verificado contra um projeto Supabase real.

**Implementation notes**

- Next 16.3.4 deprecia o arquivo `middleware.ts` em favor de `proxy.ts` (mesma API — `request`/`response`, `config.matcher` — apenas o nome do arquivo e da função exportada mudam de `middleware` para `proxy`). O brief da task ainda cita `middleware.ts`; usamos `proxy.ts` para não introduzir um novo projeto já com aviso de depreciação no build. Confirmado com `node_modules/next/dist/docs/.../file-conventions/proxy.md` e o próprio warning do `next build`.
- `db/schema/profiles.ts` já usa `pgEnum("role", ["admin", "staff", "client"])`, então o tipo inferido de `profiles.role` bate exatamente com o `Role` de `lib/auth/session.ts` sem necessidade de cast.

**Blocker/Hand-off notes**

- concluído: código completo (`lib/auth/session.ts`, `proxy.ts`, páginas/ações de login do cliente e do admin) e teste unitário de `resolveRole()` passando; `npm run test`, `npm run typecheck` e `npm run build` verdes.
- falta: verificar o fluxo de autenticação real (magic link entregue por email, login com senha, `getCurrentUser()` retornando o papel correto, redirecionamento do proxy) contra um projeto Supabase real — mesmo bloqueio de SCL-004/SCL-005 (instabilidade parcial do Supabase relatada pelo usuário, nenhum projeto real criado ainda).
- arquivos alterados: `lib/auth/session.ts`, `proxy.ts`, `app/(client)/login/actions.ts`, `app/(client)/login/page.tsx`, `app/admin/login/actions.ts`, `app/admin/login/page.tsx`, `tests/lib/session.test.ts`.
- testes: `tests/lib/session.test.ts` (2 casos, `resolveRole`) — únicos testáveis sem sessão/banco real; `getCurrentUser()` e o `proxy.ts` continuam sem cobertura de integração até existir um projeto Supabase real.
- próximo passo: assim que SCL-004/SCL-005 forem desbloqueadas (projeto Supabase real disponível), rodar o fluxo de login manualmente (cliente via magic link, staff via senha), confirmar `getCurrentUser()` e o redirecionamento do `proxy.ts`, então marcar SCL-006 `DONE`.

---

### SCL-007 — RBAC/RLS base

- Status: BLOCKED
- Priority: P0
- Area: auth
- Owner: agent:claude-code
- Branch: —
- PR: —
- Depends on: SCL-006
- Blocks: SCL-200, SCL-300
- Files/Scope: `lib/auth/rbac.ts`, `db/migrations/0001_profiles_rls.sql`, `db/migrations/meta/_journal.json`, `tests/lib/rbac.test.ts`
- Migration: yes
- Updated at: 2026-09-03

**Goal**

Dar a toda Server Action/Route Handler admin uma checagem de papel padronizada (`hasMinimumRole`/`requireRole`) e reforçar essa checagem na camada de dados via Row Level Security na tabela `profiles` — esconder UI não é controle de acesso (PRD §3.6).

**Acceptance criteria**

- [x] `hasMinimumRole(role, minimum)` e `requireRole(user, minimum)` implementados em `lib/auth/rbac.ts`, reaproveitando `Role`/`CurrentUser` de `lib/auth/session.ts` (Task 6) sem redefini-los;
- [x] testes unitários cobrindo hierarquia de papéis (admin ⊇ staff ⊇ client) e os casos de exceção `requireRole` (papel insuficiente, usuário nulo);
- [x] migration `0001_profiles_rls.sql` escrita: `enable row level security` em `profiles`, políticas `select`/`update own` via `auth.uid() = id`, e bypass de admin via `exists` contra a própria `profiles`;
- [x] migration registrada em `db/migrations/meta/_journal.json` para que `db:migrate` a aplique e `db:generate` continue a numeração a partir do próximo índice;
- [ ] migration aplicada e verificada em um projeto Supabase real (Table Editor → profiles → RLS mostrando as 3 políticas).

**Implementation notes**

- Políticas de RLS não fazem parte do DSL de schema do Drizzle, então essa migration é escrita à mão (não gerada por `npm run db:generate`) e aplicada da mesma forma que as geradas — por isso a entrada manual em `_journal.json` (idx 1, tag `0001_profiles_rls`), sem `0001_snapshot.json` correspondente (não há mudança estrutural rastreada pelo Drizzle nesta migration).
- Esse é o padrão (enable RLS, `select`/`update own`, bypass admin via `exists` em `profiles`) que as próximas tabelas do Epic 1 (`clients`, `shoots`, `payments`, ...) devem reaproveitar.

**Blocker/Hand-off notes**

- concluído: `lib/auth/rbac.ts` e `tests/lib/rbac.test.ts` completos (lógica pura, sem dependência de sessão/banco real); migration `db/migrations/0001_profiles_rls.sql` escrita e registrada no journal; `npm run test`, `npm run typecheck`, `npm run lint` e `npm run build` verdes.
- falta: RLS migration escrita e pronta em `db/migrations/0001_profiles_rls.sql`, aguardando projeto Supabase real para aplicar via `npm run db:migrate` — mesmo bloqueio de SCL-004/SCL-005/SCL-006 (instabilidade parcial do Supabase relatada pelo usuário, nenhum projeto real criado ainda).
- arquivos alterados: `lib/auth/rbac.ts`, `tests/lib/rbac.test.ts`, `db/migrations/0001_profiles_rls.sql`, `db/migrations/meta/_journal.json`.
- testes: `tests/lib/rbac.test.ts` (6 casos: `hasMinimumRole` e `requireRole`) — únicos testáveis sem banco real; a aplicação e o comportamento das políticas de RLS em si só podem ser verificados contra um projeto Supabase real.
- próximo passo: assim que SCL-004/SCL-005/SCL-006 forem desbloqueadas (projeto Supabase real disponível), rodar `npm run db:migrate`, confirmar as 3 políticas em `profiles` no dashboard do Supabase, então marcar SCL-007 `DONE`.

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
- `.env.example` já continha `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` desde a SCL-001, nenhuma alteração necessária ali.

**Blocker/Hand-off notes**

—

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

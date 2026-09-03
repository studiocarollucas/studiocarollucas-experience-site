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
| SCL-001 | Inicializar repositório | P0 | infra | READY | unassigned | none |
| SCL-002 | Lint/format/typecheck/tests | P0 | infra | BACKLOG | unassigned | SCL-001 |
| SCL-003 | CI + preview deploys | P0 | infra | BACKLOG | unassigned | SCL-001,SCL-002 |
| SCL-004 | Projeto Supabase + ambientes | P0 | db | READY | unassigned | none |
| SCL-005 | Drizzle + migrations | P0 | db | BACKLOG | unassigned | SCL-001,SCL-004 |
| SCL-006 | Auth base | P0 | auth | BACKLOG | unassigned | SCL-004,SCL-005 |
| SCL-007 | RBAC/RLS base | P0 | auth | BACKLOG | unassigned | SCL-006 |
| SCL-009 | Design tokens + layout base | P0 | ui | BACKLOG | unassigned | SCL-001 |
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

- Status: READY
- Priority: P0
- Area: infra
- Owner: unassigned
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

### SCL-004 — Criar Supabase e ambientes

- Status: READY
- Priority: P0
- Area: db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: none
- Blocks: SCL-005, SCL-006
- Files/Scope: Supabase project + env docs
- Migration: no
- Updated at: 2026-09-03

**Goal**

Disponibilizar banco/Auth para desenvolvimento com separação clara de configuração.

**Acceptance criteria**

- [ ] projeto criado;
- [ ] URL/keys configuradas via environment variables;
- [ ] nenhuma service role key no frontend;
- [ ] conexão testada;
- [ ] procedimento de setup documentado.

---

### SCL-005 — Configurar Drizzle e migrations

- Status: BACKLOG
- Priority: P0
- Area: db
- Owner: unassigned
- Branch: —
- PR: —
- Depends on: SCL-001, SCL-004
- Blocks: SCL-100, SCL-102, SCL-103, SCL-104, SCL-105, SCL-106
- Files/Scope: db/**, drizzle config
- Migration: yes
- Updated at: 2026-09-03

**Goal**

Definir a fonte de verdade do schema e o procedimento serializado de migrations.

**Acceptance criteria**

- [ ] Drizzle configurado;
- [ ] migration inicial executa em banco limpo;
- [ ] scripts de generate/migrate definidos;
- [ ] política de migrations documentada;
- [ ] CI consegue validar schema/migrations conforme estratégia definida.

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

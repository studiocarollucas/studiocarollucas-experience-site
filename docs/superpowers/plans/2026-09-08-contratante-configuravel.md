# Contratante configurável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar contratante PF ou PJ pela UI para emissão de contratos com snapshots imutáveis.

**Architecture:** Um perfil ativo em `contractor_profiles`, protegido por RLS, substitui as variáveis de ambiente. Um domínio server-only valida e busca o perfil; emissão, snapshot e PDF o consomem.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Drizzle, PostgreSQL/Supabase RLS, Zod e Vitest.

## Global Constraints

- Não adicionar dependências; toda mutação usa `defineAdminAction({ role: "staff" })`.
- Não registrar CPF/CNPJ, endereço ou valores anteriores em logs/auditoria.
- `staff` e `admin` acessam; `client` não acessa; snapshots já emitidos permanecem imutáveis.
- Antes de commit, executar os testes afetados, `npm run check:admin-auth`, lint, typecheck e `git diff --check`.

---

### Task 1: Persistir o perfil ativo e adaptar snapshots

**Files:** Create `db/schema/contractor-profiles.ts`, `db/migrations/0035_contractor_profiles.sql`, `tests/db/contractor-profiles-migration.test.ts`; Modify `db/schema/index.ts`, `db/schema/contracts.ts`, migration metadata.

**Interfaces:** Exportar `contractorProfiles`; `ContractSnapshot["contractor"]` passa a `{ personType: "individual" | "company"; legalName: string; document: string; address: string }`.

- [ ] Escrever teste primeiro, verificando enum PF/PJ, tabela, `scope = 'active'`, unicidade, RLS com `public.is_staff_or_admin()` e conversão JSON legada.
- [ ] Rodar `npx vitest run tests/db/contractor-profiles-migration.test.ts --reporter=verbose --maxWorkers=1`; esperar falha pois a migration ainda não existe.
- [ ] Criar enum `contractor_person_type`, tabela com UUID, scope fixo, nome legal, documento, endereço e timestamps. Aplicar RLS: revogar anon/authenticated, conceder apenas select/insert/update e policies staff/admin. Converter snapshots `{ name, cpf, address }` em PF `{ personType, legalName, document, address }`.
- [ ] Rodar `npm run db:generate`, depois o teste de migration; esperar PASS.
- [ ] Commit: `feat: persist configurable contractor profile`.

### Task 2: Validar, salvar e auditar sem dados pessoais

**Files:** Create `domain/contractor-profile/schema.ts`, `service.ts`, `actions.ts`, `tests/domain/contractor-profile.test.ts`, `tests/domain/contractor-profile-actions.test.ts`.

**Interfaces:** `contractorProfileSchema`, `getActiveContractorProfile()`, `upsertActiveContractorProfile(input)` e `saveContractorProfileAction`.

- [ ] Criar testes para CPF válido/inválido, CNPJ válido/inválido, normalização para dígitos, `staff`/`admin` autorizados, `client` negado e auditoria sem documento/endereço.
- [ ] Rodar os dois testes de domínio; esperar falha por módulos ausentes.
- [ ] Usar `z.discriminatedUnion("personType", ...)`, regras atuais de CPF e algoritmo de dois dígitos do CNPJ; persistir via upsert de `scope: "active"`. A auditoria `contractor_profile.updated` só recebe `personType` e `changedFields`.
- [ ] Rodar os testes; esperar PASS. Commit: `feat: manage contractor profile securely`.

### Task 3: Entregar a tela e navegação administrativa

**Files:** Modify `components/admin/admin-nav.tsx`; Create `app/admin/(protected)/configuracoes/contratante/page.tsx`, `contractor-profile-form.tsx`, testes de página/form/nav.

- [ ] Criar testes que verificam link `Configurações`, redirecionamento antes da consulta para não-staff, formulário vazio e formulário PF/PJ preenchido.
- [ ] Rodar testes; esperar falha por rota ausente.
- [ ] Construir página protegida com `getCurrentUser`/`hasMinimumRole`, `PageHeader`, `Card` e perfil ativo. Construir client form com `useActionState(toFormAction(saveContractorProfileAction))`, `FormStatus`, seletor PF/PJ, rótulos Nome completo/CPF ou Razão social/CNPJ, endereço e `router.refresh()` no sucesso.
- [ ] Rodar testes; esperar PASS. Commit: `feat: add contractor configuration screen`.

### Task 4: Integrar emissão, PDF e limpeza operacional

**Files:** Delete `domain/contracts/contractor.ts`, `tests/domain/contractor-config.test.ts`; Modify `domain/contracts/service.ts`, `snapshot.ts`, `pdf.tsx`, emissão de contrato e seus testes; Modify `.env.example`, `docs/runbooks/supabase-setup.md`, `docs/TASKS.md`.

- [ ] Criar regressões de snapshot PF/PJ, PDF com CPF/CNPJ condicional e página de emissão sem perfil exibindo “Cadastre a contratante antes de emitir o contrato.” com link para configurações.
- [ ] Rodar os testes de serviço, snapshot, PDF e painel; esperar falha pois ainda usam `STUDIO_CONTRACTOR_*`.
- [ ] Trocar a dependência por `await getActiveContractorProfile()` e manter a guarda server-side. Sem perfil, desabilitar/omitir emissão e mostrar link; no PDF usar `legalName` e rótulo CPF/CNPJ. Remover variáveis e documentar o cadastro pela UI.
- [ ] Rodar `npm test`, `npm run check:admin-auth`, `npm run lint`, `npm run typecheck` e `git diff --check`; esperar PASS. Confirmar que `rg -n "STUDIO_CONTRACTOR_|getContractorProfile" .env.example docs domain app tests` não retorna referências ativas. Commit: `feat: issue contracts from configurable contractor`.

## Plan self-review

- Cobertura: modelo/RLS e migração (Task 1), validação e privacidade (Task 2), UI/permissão (Task 3), emissão/PDF/documentação/verificação (Task 4).
- Sem pendências ou placeholders; interfaces aparecem antes de seus consumidores.

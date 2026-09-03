# Stúdio Carol Lucas Experience + Studio OS

Site público + Minha Experiência (portal da cliente) + Studio OS (admin), uma única aplicação Next.js sobre a mesma base de dados Supabase.

## Documentação

- `docs/PRD.md` — requisitos e escopo do produto.
- `docs/TASKS.md` — fonte de verdade das tasks (protocolo de agentes em paralelo).
- `docs/DECISIONS.md` — decisões de arquitetura.
- `docs/reference/` — protótipo V2.3, modelo de dados de referência e planilha legada.

## Setup local

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as variáveis (ver `docs/DECISIONS.md` para como obter as chaves do Supabase).
3. `npm run dev` — app em `http://localhost:3000`.

## Scripts

- `npm run dev` — desenvolvimento.
- `npm run build` — build de produção.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test` — Vitest.
- `npm run db:generate` — gera migration a partir do schema Drizzle.
- `npm run db:migrate` — aplica migrations pendentes.

## Convenções

- Task ID obrigatório em commits: `SCL-123: mensagem`.
- Branch: `feat/SCL-123-slug`.
- Nunca editar uma migration já mergeada.
- Ver `docs/TASKS.md` §Regras rápidas antes de iniciar qualquer trabalho.

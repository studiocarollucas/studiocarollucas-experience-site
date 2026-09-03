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

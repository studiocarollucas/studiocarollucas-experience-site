# Supabase — setup de ambiente

1. Criar projeto em supabase.com (região `sa-east-1`).
2. Copiar credenciais de **Project Settings → API** e **Database → Connection string** para `.env.local` (nunca commitar `.env.local`).
3. Variáveis necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`.
4. `SUPABASE_SERVICE_ROLE_KEY` só pode ser usada em código server-side (Route Handlers, Server Actions). Nunca importar em um Client Component nem prefixar com `NEXT_PUBLIC_`.
5. Ambiente de produção deve usar um projeto Supabase separado do ambiente de desenvolvimento; configurar as mesmas variáveis nas env vars do Vercel (ver `docs/runbooks/deploy.md`, Task 9).

## `DATABASE_URL` — usar o pooler em modo Transaction

Em **Database → Connection string**, copiar a URI do **Transaction pooler** (porta `6543`), não a de _Session mode_ nem a conexão direta. O `db/client.ts` abre a conexão com `postgres(connectionString, { prepare: false, max: 1 })`: o pgbouncer em modo transaction não suporta prepared statements (padrão do `postgres.js`), e `max: 1` mantém a contagem de conexões adequada para o runtime serverless do Vercel.

## `NEXT_PUBLIC_SITE_URL` — magic link

O fluxo passwordless do cliente usa PKCE (padrão do `@supabase/ssr`): o Supabase envia um link com `?code=...` que precisa cair em `/auth/callback` desta aplicação. `NEXT_PUBLIC_SITE_URL` é a origem absoluta usada para montar esse `emailRedirectTo` — `http://localhost:3000` em desenvolvimento, a URL publicada em produção. A mesma URL (`<site>/auth/callback`) precisa estar cadastrada em **Authentication → URL Configuration → Redirect URLs** no dashboard do Supabase.

## `npm run db:generate` / `npm run db:migrate` e o `.env.local`

O `drizzle-kit` carrega automaticamente apenas o arquivo `.env` do diretório atual — ele não conhece a convenção `.env.local` do Next.js. Por isso os scripts em `package.json` invocam o entrypoint real do drizzle-kit via `node --env-file-if-exists=.env.local node_modules/drizzle-kit/bin.cjs ...` (flag nativa do Node ≥ 22.9; a variante `-if-exists` evita falhar em CI ou em um clone novo, onde o arquivo ainda não existe e as variáveis vêm do ambiente).

## Bootstrap do primeiro admin (passo manual, uma única vez)

Não existe promoção self-service de admin neste sistema — é intencional (modelo RBAC do plano). A trigger `on_auth_user_created` (migration `0002_handle_new_user_trigger.sql`) cria toda `profiles` nova com `role = 'client'`. Depois do primeiro cadastro real, rodar no **SQL Editor** do Supabase:

```sql
update profiles set role = 'admin' where email = '<e-mail do primeiro admin>';
```

Só a partir daí `/admin` fica acessível (o layout `app/admin/(protected)/layout.tsx` exige `role >= staff`).

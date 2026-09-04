# Supabase — setup de ambiente

1. Criar projeto em supabase.com (região `sa-east-1`).
2. Copiar credenciais de **Project Settings → API** e **Database → Connection string** para `.env.local` (nunca commitar `.env.local`).
3. Variáveis necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.
4. `SUPABASE_SERVICE_ROLE_KEY` só pode ser usada em código server-side (Route Handlers, Server Actions). Nunca importar em um Client Component nem prefixar com `NEXT_PUBLIC_`.
5. Ambiente de produção deve usar um projeto Supabase separado do ambiente de desenvolvimento; configurar as mesmas variáveis nas env vars do Vercel (ver `docs/runbooks/deploy.md`, Task 9).

# Deploy

- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, test e build em cada push/PR.
- **Deploy:** Vercel, conectado ao repositório GitHub. Cada PR gera um Preview Deployment automaticamente.
- **Produção:** branch `main`, domínio `studiocarollucas.com.br` (registrado na Hostinger — configurar DNS apontando para o Vercel quando o site estiver pronto para ir ao ar).
- **Variáveis de ambiente:** configuradas separadamente em Production e Preview no dashboard do Vercel. Preview deve apontar para um projeto Supabase de desenvolvimento, nunca para o de produção. Conferir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_STUDIO_WHATSAPP_URL` (URL completa `https://wa.me/...`).
- **Antes de promover para produção:** confirmar que a migration mais recente (`db/migrations/`) já foi aplicada no projeto Supabase de produção via `npm run db:migrate` com o `DATABASE_URL` de produção.

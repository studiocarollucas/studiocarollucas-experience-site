# Supabase — setup de ambiente

1. Criar projeto em supabase.com (região `sa-east-1`).
2. Copiar credenciais de **Project Settings → API** e **Database → Connection string** para `.env.local` (nunca commitar `.env.local`).
3. Variáveis necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STUDIO_WHATSAPP_URL`.
4. `SUPABASE_SERVICE_ROLE_KEY` só pode ser usada em código server-side (Route Handlers, Server Actions). Nunca importar em um Client Component nem prefixar com `NEXT_PUBLIC_`.
5. O estado desejado é separar produção de desenvolvimento/teste e configurar as mesmas variáveis nas env vars do Vercel (ver `docs/runbooks/deploy.md`). Hoje o projeto ainda tem apenas um Supabase real; por isso testes live são opt-in e devem ser executados conscientemente, nunca como parte do CI comum.

## `DATABASE_URL` — usar o pooler em modo Transaction

Em **Database → Connection string**, copiar a URI do **Transaction pooler** (porta `6543`), não a de _Session mode_ nem a conexão direta. O `db/client.ts` abre a conexão com `postgres(connectionString, { prepare: false, max: 1 })`: o pgbouncer em modo transaction não suporta prepared statements (padrão do `postgres.js`), e `max: 1` mantém a contagem de conexões adequada para o runtime serverless do Vercel.

## `NEXT_PUBLIC_SITE_URL` — magic link

O fluxo passwordless do cliente usa PKCE (padrão do `@supabase/ssr`): o Supabase envia um link com `?code=...` que precisa cair em `/auth/callback` desta aplicação. `NEXT_PUBLIC_SITE_URL` é a origem absoluta usada para montar esse `emailRedirectTo` — `http://localhost:3000` em desenvolvimento, a URL publicada em produção. A mesma URL (`<site>/auth/callback`) precisa estar cadastrada em **Authentication → URL Configuration → Redirect URLs** no dashboard do Supabase.

## `NEXT_PUBLIC_STUDIO_WHATSAPP_URL` — contato da Minha Experiência

O CTA “Falar com o estúdio” usa uma URL pública completa no formato `https://wa.me/<DDI><DDD><numero>`, somente com dígitos depois do domínio (por exemplo, `https://wa.me/5592999999999`). Configure o mesmo valor nos ambientes locais e no checklist de variáveis da Vercel. Se a variável ficar vazia, o portal orienta a cliente a usar o contato habitual e não renderiza um link incompleto.

## `npm run db:generate` / `npm run db:migrate` e o `.env.local`

O `drizzle-kit` carrega automaticamente apenas o arquivo `.env` do diretório atual — ele não conhece a convenção `.env.local` do Next.js. Por isso os scripts em `package.json` invocam o entrypoint real do drizzle-kit via `node --env-file-if-exists=.env.local node_modules/drizzle-kit/bin.cjs ...` (flag nativa do Node ≥ 22.9; a variante `-if-exists` evita falhar em CI ou em um clone novo, onde o arquivo ainda não existe e as variáveis vêm do ambiente).

## Bootstrap do primeiro admin (passo manual, uma única vez)

Não existe promoção self-service de admin neste sistema — é intencional (modelo RBAC do plano). A trigger `on_auth_user_created` (migration `0002_handle_new_user_trigger.sql`) cria toda `profiles` nova com `role = 'client'`. Depois do primeiro cadastro real, rodar no **SQL Editor** do Supabase:

```sql
update profiles set role = 'admin' where email = '<e-mail do primeiro admin>';
```

Só a partir daí `/admin` fica acessível (o layout `app/admin/(protected)/layout.tsx` exige `role >= staff`).

## Minha Experiência — migrations, RLS e grants

O portal usa um caminho híbrido. O Admin continua no servidor via Drizzle e RBAC; a cliente lê e altera somente dados autorizados com o JWT Supabase cookie-bound e a Data API. A ordem append-only do Epic 3 é:

1. `0024_epic3_client_fields.sql` — colunas client-safe de logística e `client_actionable`;
2. `0025_epic3_client_access.sql` — grants por coluna, policies RLS, `owns_portal_shoot`, trigger de `completed_at` e checks;
3. `0026_styling_references.sql` — enum e tabela de metadata do moodboard;
4. `0027_styling_storage_access.sql` — FKs/index/check, limite concorrente, bucket privado e policies de tabela/Storage;
5. `0028_harden_styling_paths.sql` — hardening append-only do path canônico e exclusão da cliente limitada a `origin = 'client'`;
6. `0029_styling_upload_reservations.sql` — Storage só aceita upload quando a row de metadata correspondente já reservou a cota;
7. `0030_guard_styling_row_deletion.sql` — delete da row exige objeto ausente e a cota conta a união de rows e objetos;
8. `0031_serialize_styling_lifecycle.sql` — upload, exclusão e nova reserva usam o mesmo advisory transaction lock por Shoot.

Aplique com `npm run db:migrate`; o script valida primeiro o journal. Não recrie nem edite migrations já aplicadas e não crie o bucket manualmente no Dashboard: `0027` é a fonte de verdade da configuração. Depois, confira que `authenticated` tem `SELECT` somente nas colunas client-safe, `UPDATE` somente em `preparation_tasks.status`, e que `anon` não tem acesso. `owns_portal_shoot(uuid)` deve continuar `SECURITY DEFINER`, com `search_path` vazio e `EXECUTE` apenas para `authenticated`.

O vínculo de linha nasce em `clients.auth_user_id = auth.uid()`. O helper exige também `shoots.portal_enabled = true` e status diferente de `cancelado`; as policies derivadas limitam pacote, pagamentos confirmados, tarefas visíveis e referências ao Shoot pertencente à cliente. O trigger `preparation_tasks_sync_completed_at` é o único dono do timestamp: status `concluida` implica timestamp não nulo; qualquer outro status implica `null`.

## Storage privado de Styling

O bucket `styling-references` permanece privado. Não existe variável de ambiente adicional: o browser usa URL + anon key e o servidor usa as credenciais Supabase já listadas. O contrato é JPEG/PNG/WebP, no máximo 8 MiB por objeto e 20 referências por Shoot. Paths têm exatamente três segmentos, `<auth-user-uuid>/<shoot-uuid>/<object-key>`; URLs públicas não são persistidas, e a leitura gera URLs assinadas efêmeras.

Ao investigar falhas, consulte metadata e objetos, mas remova objetos pelo SDK de Storage, não com `DELETE` direto em `storage.objects`. O upload reserva primeiro a row de metadata; se o envio falhar, remove um possível objeto parcial antes de liberar a reserva. A exclusão remove o objeto, confirma sua ausência e só então apaga a row. Se o último passo falhar, a metadata permanece ocupando cota e a operação pode ser tentada novamente. Falhas parciais chegam ao Sentry com `shootId`, `storagePath` e `referenceId`.

## Testes live e limpeza

`npm run test` comum não toca o banco. Para armar integrações reais em PowerShell:

```powershell
$env:RUN_LIVE_DB_TESTS='true'
npm run test
$exitCode = $LASTEXITCODE
Remove-Item Env:RUN_LIVE_DB_TESTS
exit $exitCode
```

Os fixtures usam nomes `Teste Epic3 ...` e e-mails descartáveis `scl302-*`, `scl304-*` e `scl305-*`. Todo teste deve apagar objetos de Storage antes das rows, depois Shoot/Client e por fim o Auth user, acumulando erros de teardown e verificando ausência. Como ainda não há banco dedicado, uma falha de rede durante o teardown exige auditoria e limpeza explícitas antes da próxima execução live.

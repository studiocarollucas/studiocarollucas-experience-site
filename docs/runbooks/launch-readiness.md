# Retomada e validação de lançamento

## Auditoria sem escrita

Execute `npm run check:launch-readiness` no ambiente alvo. O comando carrega `.env.local` quando existir, verifica presença de configuração e compara hashes de todas as migrations do journal com `drizzle.__drizzle_migrations` em transação read-only. Nenhum segredo é exibido e nenhuma migration é aplicada. Flags presentes não comprovam credenciais válidas, domínio verificado ou entrega de e-mail.

Resultado em 06/11/2026, depois da aplicação: `journalEntries` 54, `appliedRows` 54, `lastAppliedInOrder` `0053_styling_inventory_links`, `pending` vazio. Configuração de lançamento permanece ausente e o envio de e-mail desabilitado. O `DATABASE_URL` configurado aponta para o banco de produção, que ainda não atende usuários — por isso a janela para aplicar e corrigir foi agora. Antes da aplicação o banco estava em `0047` e faltavam seis migrations: o filtro `idx >= 49` escondia a `0048`.

## Ordem de implantação

1. Identificar explicitamente o banco e o ambiente de destino; conferir backup disponível e instruções de implantação em `deploy.md`.
2. Feito em 06/11/2026 (`npm run db:migrate`, exit 0). Para a próxima leva: validar o journal com `node scripts/check-migration-journal.mjs`, revisar e aplicar em ordem. A leva de lançamento foi `0048` locação avulsa (Paixão Clutch/SCL-557, colunas `guest_*`/`expires_at` em `inventory_reservations`), `0049` outbox, `0050` seleções/downloads, `0051` reviews/indicações, `0052` upsell, `0053` vínculo de styling. Não editar migrations já aplicadas.
3. Repetir a auditoria e validar permissões e fluxos em ambiente atualizado. Para `0053`: cliente cria/exclui referência livre, cliente não insere/altera vínculo direto, staff vincula/desvincula apenas preferência/reserva ativa do mesmo ensaio, reserva cancelada some do indicador e remoção da peça preserva a referência.
4. Validar favoritos/downloads, upsell e pagamento separado do saldo do ensaio, review e indicação. Testes unitários/contratos não substituem essa verificação de RLS no banco.
5. Conferir variáveis públicas e integrações de produção, fotos definitivas de Família e configuração de cron. Seguir `email-automation.md` para validar Resend/remetente e ativar envio real somente após a validação do ambiente.

## Ambiente local

Em 06/11/2026 o checkout voltou a ser autossuficiente em `C:`. Os junctions de `node_modules` e `.next` que apontavam para `D:\CodexCaches` foram removidos (sem tocar nos alvos) e `npm ci` instalou 628 pacotes dentro do próprio checkout. Com isso `npm run typecheck` e `npm run build` encerram com código 0 na raiz do projeto — os comandos padrão são `npm run dev` e `npm run build`, sem cópia intermediária.

Não recriar esses junctions. Turbopack rejeita dependências por symlink fora da raiz do filesystem, e era isso que obrigava a validar o build numa cópia em `D:`. As dependências e o cache antigos seguem preservados em `D:\CodexCaches\studio-carollucas-runtime-20261007` e `D:\CodexCaches\studio-carollucas-build-20261007`, porque um serviço MCP os usava; não são mais necessários para este projeto.

Espaço em disco continua apertado e é risco operacional, não resolvido: `C:` em 96% (≈11 GB livres) e **`D:` em 100% (≈29 MB livres de 917 GB)**. `D:` guarda dados pessoais e de clientes (`Backup Carol`, pastas de ensaios), então a limpeza é decisão do dono da máquina.

Testes locais sem acesso live: `npm test -- tests --exclude '**/*.integration.test.ts' --pool=vmForks --maxWorkers=2`. O modo `vmThreads` produz o mesmo resultado funcional, mas sofre queda nativa ao encerrar; a configuração versionada do runner foi preservada. Não existe reporter `basic` no Vitest 5 — passar `--reporter=basic` faz o runner tentar carregar um reporter customizado e falhar antes de rodar qualquer teste. As integrações opt-in devem ser executadas somente com o banco e o ambiente identificados. Não habilitar `RUN_LIVE_DB_TESTS` contra um banco desconhecido.

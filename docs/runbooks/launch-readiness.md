# Retomada e validação de lançamento

## Auditoria sem escrita

Execute `npm run check:launch-readiness` no ambiente alvo. O comando carrega `.env.local` quando existir, verifica presença de configuração e compara hashes das migrations a partir de `0049` com `drizzle.__drizzle_migrations` em transação read-only. Nenhum segredo é exibido e nenhuma migration é aplicada. Flags presentes não comprovam credenciais válidas, domínio verificado ou entrega de e-mail.

Resultado local em 07/10/2026: banco acessível; hashes das migrations `0049`–`0053` ausentes; configuração de lançamento ausente e envio de e-mail desabilitado. O ambiente do banco ainda precisa ser identificado. Não inferir o estado da produção a partir deste resultado.

## Ordem de implantação

1. Identificar explicitamente o banco e o ambiente de destino; conferir backup disponível e instruções de implantação em `deploy.md`.
2. Validar o journal com `node scripts/check-migration-journal.mjs`, revisar e aplicar migrations em ordem: `0049` outbox, `0050` seleções/downloads, `0051` reviews/indicações, `0052` upsell, `0053` vínculo de styling. Não editar migrations já aplicadas.
3. Repetir a auditoria e validar permissões e fluxos em ambiente atualizado. Para `0053`: cliente cria/exclui referência livre, cliente não insere/altera vínculo direto, staff vincula/desvincula apenas preferência/reserva ativa do mesmo ensaio, reserva cancelada some do indicador e remoção da peça preserva a referência.
4. Validar favoritos/downloads, upsell e pagamento separado do saldo do ensaio, review e indicação. Testes unitários/contratos não substituem essa verificação de RLS no banco.
5. Conferir variáveis públicas e integrações de produção, fotos definitivas de Família e configuração de cron. Seguir `email-automation.md` para validar Resend/remetente e ativar envio real somente após a validação do ambiente.

## Ambiente local desta retomada

O disco C estava cheio e as dependências incompletas. Foram preservados o cache anterior e as dependências antigas em `D:\CodexCaches`; `node_modules` e `.next` do checkout apontam por junction para o disco D. O serviço MCP que usava as dependências anteriores foi preservado.

Turbopack rejeita dependências por symlink fora da raiz do filesystem; Webpack também encontrou caminhos inválidos entre os discos C e D. A validação de build utilizou uma cópia dos 803 arquivos versionados/novos em `D:\CodexCaches\studio-carollucas-runtime-20261007`, junto das dependências instaladas e da configuração local: `npm run build` encerrou com código 0, incluindo compilação, TypeScript e páginas. Execute esse comando nesse diretório, após sincronizar a cópia com o checkout. Edite os fontes no checkout principal e atualize essa cópia antes de validar alterações futuras. Em um checkout com dependências dentro da raiz, os comandos padrão continuam sendo `npm run dev` e `npm run build`.

Testes locais sem acesso live: `npm test -- tests --exclude '**/*.integration.test.ts'`. Nesta máquina, a execução completa com `--pool=vmForks --maxWorkers=2` encerrou com código 0: 1.362 aprovados e 9 ignorados. O modo `vmThreads` produziu o mesmo resultado funcional, mas sofreu queda nativa ao encerrar; a configuração versionada do runner foi preservada. As integrações opt-in devem ser executadas somente com o banco e o ambiente identificados. Não habilitar `RUN_LIVE_DB_TESTS` contra um banco desconhecido.

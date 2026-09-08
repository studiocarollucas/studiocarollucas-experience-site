# Baseline revisado e fechamento de contratos — design

## Objetivo

Incorporar o PRD v1.1, TASKS v2.0 e checklist de cobertura ao repositório como a nova referência do MVP. Concluir SCL-310 com a experiência administrativa de emissão e histórico de contratos PDF privados, incluindo provas de isolamento de acesso e atualização do backlog somente após evidências verificadas.

## Escopo

Este incremento abrange duas entregas dependentes:

1. Sincronizar `docs/PRD.md` e `docs/TASKS.md` com as revisões recebidas e criar `docs/CHECKLIST-MVP.md` a partir do checklist de cobertura.
2. Completar SCL-310: revisão e emissão administrativa, histórico de documentos, download privado e verificação integrada de RLS/Storage.

O próximo incremento comercial (`SCL-250` a `SCL-254`, `SCL-404` e `SCL-405`) não faz parte desta implementação. O backlog revisado o registra como próximo ciclo de produto após o fechamento de contratos.

## Contexto existente

O repositório já possui a infraestrutura de contratos em `db/schema/contracts.ts`, migration `0034_contracts.sql`, `domain/contracts/*`, a rota protegida `app/api/admin/contracts/[id]/download/route.ts` e testes de schema, snapshot, PDF, serviço e rota. O contrato é gerado a partir de um snapshot imutável de cliente, ensaio, pacote, pagamentos confirmados, configuração protegida da contratante e escolha de uso de imagem.

Ainda não existem a rota administrativa de emissão, o painel client-side de revisão, a listagem de documentos nas fichas de ensaio/cliente e a prova integrada do bucket privado `contracts`.

## Arquitetura

### Fonte documental

`docs/PRD.md` passa a conter literalmente a revisão funcional v1.1. `docs/TASKS.md` passa a conter a revisão operacional v2.0, preservando as regras de status e a nova matriz de dependências. O checklist passa a viver em `docs/CHECKLIST-MVP.md` como leitura rápida da cobertura do release.

Depois da verificação de SCL-310, somente a entrada desse item em `docs/TASKS.md` é atualizada de `IN_PROGRESS` para `DONE`, com hand-off que cite os comandos e resultados reais. Nenhum outro item de backlog será antecipado como concluído.

### Emissão administrativa

A página protegida `/admin/agenda/[id]/contrato` carrega `getContractIssueContext(id)` no servidor e retorna `notFound()` para ensaio inexistente. Ela renderiza uma revisão somente leitura de pacote, data, local, valor contratado, total confirmado e saldo derivado.

Um painel client-side envia a ação `issueContractAction` com CPF, data de nascimento, endereço completo e uma escolha obrigatória de autorização de uso de imagem. Os dados civis podem ser preenchidos a partir do cadastro existente somente no browser autenticado da equipe; a validação Zod da Server Action permanece autoritativa. A emissão chama o serviço já existente, que renderiza o PDF, carrega-o no bucket privado e, em uma transação, atualiza dados civis, insere o contrato imutável e grava a auditoria redigida.

Após sucesso, a interface atualiza o Server Component e mostra o download por rota interna com ID de contrato. Não serializa URL assinada, caminho de Storage, snapshot ou dados civis ao browser além dos campos editáveis do formulário.

### Histórico e download

Um componente compartilhado de lista recebe apenas ID, número, estado, data de emissão e escolha de uso de imagem. Ele aparece na ficha do ensaio e na ficha da cliente. O link usa a rota administrativa existente, que valida a sessão e o papel antes de criar uma URL assinada de curta duração no servidor.

### Privacidade e falhas

O bucket `contracts` permanece privado. Clientes do portal não podem listar, inserir, alterar, apagar, baixar ou assinar URLs de contratos. A equipe autorizada pode ler contratos e obter download temporário, sem URL pública persistente.

Erros de formulário usam mensagens por campo. Erros inesperados de emissão, Storage, rota e autorização retornam cópia neutra, preservando detalhes somente no logger estruturado. Se o upload ocorrer e a transação falhar, o serviço tenta remover o objeto antes de retornar a falha; nunca exibe um contrato parcialmente emitido como sucesso.

## Testes e verificação

Cada componente ou comportamento novo começa por teste que falha pelo motivo esperado. A sequência inclui:

- testes de painel para campos obrigatórios, escolha explícita de uso de imagem, feedback de sucesso e link interno de download;
- testes de página/lista para contexto de ensaio inexistente, valores de revisão e histórico serializado sem dados privados;
- teste integrado opt-in (`RUN_LIVE_DB_TESTS=true`) para verificar RLS e Storage com uma equipe autorizada e uma cliente do portal, removendo objetos antes de linhas e comprovando ausência de resíduos;
- gates do projeto: `npm run predb:migrate`, `npm run test`, `npm run lint`, `npm run typecheck`, `npm run check:admin-auth`, `npm run build` e `git diff --check`.

O teste integrado só será executado depois de confirmar que as variáveis locais apontam para Supabase de desenvolvimento ou staging, nunca produção.

## Critérios de aceite

- Os três documentos revisados estão versionados no repositório e o checklist separa claramente MVP e pós-MVP.
- Uma pessoa da equipe emite um contrato sem copiar dados entre telas e encontra o histórico pelo ensaio ou pela cliente.
- O PDF e seus valores continuam representando o snapshot mesmo que CRM, pacote ou pagamentos mudem depois.
- A escolha de uso de imagem é explícita, aparece no snapshot/PDF e é auditável.
- Cliente do portal e usuário não autorizado não conseguem acessar registros, objetos ou URLs de contratos.
- SCL-310 só é marcado `DONE` depois de todos os gates e da auditoria de limpeza do teste integrado.

## Fora de escopo

- assinatura eletrônica;
- envio automático por e-mail ou WhatsApp;
- editor livre de cláusulas ou múltiplos modelos;
- acesso ao contrato pelo portal da cliente;
- implementação dos novos blocos comercial, galeria, acervo, automação, reviews ou SEO.

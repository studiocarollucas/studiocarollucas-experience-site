# Catálogo de Acervo, mídia e importação — design

**Data:** 2026-09-09  
**Escopo:** SCL-551 e SCL-552, com integração de seleção na reserva SCL-553

## Objetivo

Transformar o contrato técnico de `InventoryItem` em uma operação usável para o estúdio: uma área própria de Acervo no Admin, fotos opcionais e privadas, importação em massa por planilha e seleção por nome/código na ficha do ensaio. O fluxo não exigirá que a equipe conheça UUIDs.

## Catálogo administrativo

O Admin terá uma seção **Acervo** com listagem paginada, busca por nome/código e filtros por tipo, status, cor e tamanho. A ficha do item permite criar, editar e inativar itens, preservando histórico de reservas. O código interno permanece único e é o identificador de operação que a equipe pode ver e pesquisar.

O item pode ser criado sem fotografia. Foto não é pré-requisito para aparecer no catálogo, ser pesquisado ou reservado. Uma ficha sem imagem terá um estado visual neutro; itens com fotos terão capa e ordenação configuráveis.

## Mídia privada

Cada item possui múltiplos metadados de mídia desacoplados do provider de storage. Os arquivos administrativos ficam em bucket privado, com URLs assinadas temporárias emitidas no servidor. A equipe envia, remove, reordena e define a capa da ficha.

O modelo inclui uma marca explícita de elegibilidade/variante publicável para evolução de Paixão Clutch. Esta etapa não publica automaticamente nenhuma mídia nem constrói a vitrine pública; a foto administrativa continua privada por padrão.

## Importação em massa

O Admin permite baixar um template `.xlsx` com as colunas: `codigo`, `nome`, `tipo`, `descricao`, `cor`, `tamanho`, `status`, `preco_interno` e `ativo`. Há exemplos, lista de valores permitidos e instruções na própria planilha.

O upload cria uma prévia validada, sem gravar dados. Ela informa número de linhas válidas, erros por linha/campo e colisões de código dentro do arquivo ou contra o banco. A confirmação só grava linhas válidas explicitamente selecionadas pela equipe; nenhuma linha inválida é aceita silenciosamente. O resultado apresenta totais de criação, atualização quando autorizado e rejeição.

Fotos não são importadas pela planilha: são incluídas posteriormente, de forma privada, na ficha do item. Assim não dependemos de URLs públicas externas e não bloqueamos o cadastro de itens sem imagem.

## Integração com a reserva do ensaio

A ficha do ensaio troca o input de UUID por um seletor pesquisável que mostra código, nome, tipo e estado do item. Cada confirmação adiciona uma reserva; portanto o mesmo ensaio pode reservar diversos itens. A disponibilidade permanece calculada por `InventoryReservation`, inclusive para conflito e exceção auditada, e não por uma flag manual no catálogo.

## Segurança e auditoria

- Apenas `staff` e `admin` acessam catálogo, importação e mídia.
- RLS, grants e serviços server-only protegem itens, metadados e arquivos.
- Criação, edição, inativação, importação e operações de mídia geram eventos de auditoria.
- Itens inativados preservam reservas e não aparecem como elegíveis para novas reservas.
- Não há checkout, preço público, aluguel avulso ou publicação pública nesta onda.

## Validação

- Testes de schema/migration cobrem relações, RLS, grants e bucket privado.
- Testes de domínio cobrem template, parsing, validação de prévia, códigos duplicados e importação transacional.
- Testes de ações/UI cobrem autorização, filtros, CRUD, seleção pesquisável no ensaio e mídia sem URL pública persistente.
- Typecheck, lint e testes focados validam cada frente antes da integração.

## Execução paralela

1. **SCL-551:** schema/migration e lifecycle de mídia privada.
2. **SCL-552:** catálogo Admin, CRUD, importação `.xlsx` e troca do seletor técnico da reserva.

As migrations serão serializadas; a interface do catálogo consome os contratos entregues pela frente de mídia.

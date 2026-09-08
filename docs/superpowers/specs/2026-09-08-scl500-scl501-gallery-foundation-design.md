# SCL-500/501 — Fundação de Galeria privada

## Objetivo

Criar o contrato de dados e storage privado que permitirá publicação, Reveal, favoritos, downloads e upsells em etapas posteriores, sem antecipar as interfaces dessas etapas.

## Escopo

- Novo schema Gallery vinculado ao Shoot, com estado de publicação e metadados mínimos.
- Novo schema GalleryAsset vinculado à Gallery, com chave de storage, ordem, estado e metadados de imagem seguros.
- Migration serial, RLS para staff/admin e leitura da cliente limitada ao ensaio a que tem acesso.
- Bucket privado e serviço server-side para upload/listagem, seguindo o padrão dos contratos privados.

## Contratos e limites

- Esta é a única frente autorizada a criar migration nesta onda e a editar `db/schema/index.ts` e o journal.
- Não haverá URL pública permanente, seleção, download, pedido de upsell ou tela Reveal: esses pertencem a SCL-502–507.
- Chaves de storage nunca são expostas como URL assinada em auditoria ou dados públicos.
- Cada Shoot terá no máximo uma Gallery ativa; a regra é garantida por constraint/índice apropriado e serviço de domínio.

## Fluxo

1. Staff cria ou obtém a Gallery do Shoot no servidor.
2. Upload privado grava asset com metadados mínimos e posição.
3. Leituras passam por políticas de acesso e serviços server-side; URL temporária só será criada em SCL-503/505.

## Verificação

- TDD do schema, regra de unicidade e serviço de criação.
- Teste de integração opcional, guardado por `RUN_LIVE_DB_TESTS=true`, para RLS/storage e cleanup.
- Journal/migration, typecheck, lint, build e testes de storage existentes.


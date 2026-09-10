# Mídia pública da Paixão Clutch

## Objetivo

Permitir que staff/admin defina a imagem pública de uma clutch pela tela de curadoria, enviando uma imagem nova ou promovendo conscientemente uma foto privada já cadastrada no próprio item.

## Arquitetura

Mídia administrativa continua no bucket privado `inventory-media`. A mídia pública vai para bucket público separado, com metadado próprio vinculado ao item e URL/caminho gerado pelo servidor; a UI não aceita mais caminhos manuais. Promover uma foto privada copia seus bytes para o bucket público, sem mudar a privacidade ou permissões da origem.

## Fluxo

- A equipe escolhe “Enviar imagem pública” ou uma foto interna daquele item.
- O servidor valida tipo JPEG/PNG/WebP e tamanho máximo de 4 MB, cria/copia o objeto público e atualiza a referência editorial em transação auditada.
- A tela mostra prévia, substituição e remoção.
- Remover a imagem despublica a clutch na mesma operação; publicação só usa uma mídia pública confirmada por este fluxo.

## Segurança e limites

Somente staff/admin executa ou lê os controles administrativos. Nunca há URL pública da mídia privada, nem promoção automática. Upload/cópia/remover são auditados e recuperáveis diante de falha. Não haverá recorte/editor, checkout ou publicação de outras categorias nesta entrega.

## Aceitação

- enviar e promover foto interna criam mídia pública sem expor a origem;
- somente fotos do mesmo item podem ser promovidas;
- troca/remoção atualizam prévia e auditoria;
- remoção despublica item publicado;
- referências manuais inseguras deixam de ser aceitas.

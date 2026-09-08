# Contratante configurável para contratos — design

**Data:** 2026-09-08  
**Status:** aprovado para especificação; aguarda revisão do documento antes do plano de implementação

## Objetivo

Substituir a configuração da contratante baseada em variáveis de ambiente por um cadastro administrativo persistido. A contratante poderá ser pessoa física ou jurídica e poderá ser atualizada por pessoas com perfil `staff` ou `admin`, sem novo deploy.

O contrato emitido continuará imutável: os dados usados na emissão serão copiados para o snapshot do próprio contrato. Alterar a configuração afeta somente emissões futuras.

## Escopo

- Um único perfil de contratante ativo para o estúdio.
- Tipos de pessoa `individual` e `company`.
- Campos: tipo de pessoa, nome completo ou razão social, CPF ou CNPJ e endereço completo.
- Tela administrativa em `Configurações → Contratante` para consultar e atualizar o perfil.
- Acesso de leitura e alteração para `staff` e `admin`; nenhum acesso para `client`.
- Auditoria redigida de cada atualização.
- Emissão de PDF usando o perfil persistido, sem depender de `STUDIO_CONTRACTOR_*`.

Não fazem parte deste incremento: múltiplas contratantes ativas, alternância entre empresas, assinatura eletrônica, ou alteração/reatualização de contratos já emitidos.

## Modelo de dados

Será criada a tabela `contractor_profiles` com uma chave de escopo única e fixa (`active`), para garantir um único perfil ativo. Ela terá um identificador UUID, `person_type`, `legal_name`, `document`, `address`, e timestamps de criação/atualização.

`person_type` será um enum com `individual` e `company`. O serviço normalizará o documento para dígitos antes de persistir e validará CPF para pessoa física e CNPJ para pessoa jurídica. A interface aplica máscara apenas como ajuda de entrada; a validação definitiva permanece no servidor.

O tipo `ContractSnapshot` passará a guardar a contratante como `{ personType, legalName, document, address }`. A migração de dados converterá snapshots legados que contenham `{ name, cpf, address }` em pessoa física, preservando o documento e endereço originais. Assim, contratos existentes permanecem interpretáveis e os novos carregam a forma geral PF/PJ.

## Interface e fluxo

A nova página protegida exibirá o perfil atual ou o estado vazio. O formulário terá:

- seletor de pessoa física ou jurídica;
- rótulo e máscara adequados para CPF ou CNPJ;
- nome completo ou razão social conforme o tipo;
- campo de endereço completo;
- confirmação de sucesso ou erros de validação no próprio formulário.

Quando não houver perfil cadastrado, a página de emissão de contrato exibirá uma orientação clara e um link para a configuração. O botão de emitir ficará indisponível até existir uma contratante válida. A emissão também consulta o perfil no servidor, evitando depender somente da interface.

Em uma emissão válida, o serviço lê o perfil, cria o snapshot, gera o PDF e persiste contrato, auditoria e caminho privado do arquivo na mesma operação já existente. O PDF renderiza o nome/razão social e CPF/CNPJ conforme o tipo cadastrado.

## Autorização, privacidade e auditoria

As ações de leitura e alteração usarão a autorização atual de papel `staff`, que aceita tanto `staff` quanto `admin`. A tabela receberá políticas RLS equivalentes para selecionar, inserir e atualizar somente para esses perfis; `client` não poderá ler nem modificar os dados.

Cada atualização cria um evento `contractor_profile.updated`. Os metadados de auditoria conterão apenas o tipo de pessoa e a lista de campos alterados; não registrarão CPF/CNPJ, endereço, nem valores anteriores/posteriores desses campos. A tela e o PDF continuam protegidos por autenticação de equipe e pelo fluxo privado de contratos já existente.

## Migração e operação

A migration cria a tabela, enum, índice/garantia de perfil ativo e políticas RLS. Ela também adapta snapshots de contratos já armazenados para o formato genérico PF/PJ.

As variáveis `STUDIO_CONTRACTOR_NAME`, `STUDIO_CONTRACTOR_CPF` e `STUDIO_CONTRACTOR_ADDRESS` deixam de ser requisitos da aplicação e serão removidas do exemplo de ambiente e do runbook correspondente. A primeira configuração será feita pela UI, por `staff` ou `admin`; nenhum dado de CPF/CNPJ será incluído em seed, documentação ou logs.

## Testes e critérios de aceite

- Salvar pessoa física válida e pessoa jurídica válida; rejeitar CPF/CNPJ inválido ou campos obrigatórios vazios.
- Confirmar que `staff` e `admin` podem consultar e alterar, enquanto `client` não pode.
- Confirmar RLS para leitura e escrita direta nos papéis relevantes.
- Confirmar que emissão sem perfil apresenta orientação e não tenta gerar PDF.
- Confirmar que emissão PF e PJ grava o snapshot correto e o PDF recebe os dados adequados.
- Confirmar que atualizar a contratante não altera snapshots de contratos já emitidos.
- Confirmar que a auditoria não inclui documento, endereço ou seus valores anteriores/posteriores.
- Confirmar que a emissão não lê mais variáveis `STUDIO_CONTRACTOR_*`.

## Decisões registradas

| Decisão | Escolha |
| --- | --- |
| Quem administra | `admin` e `staff` |
| Natureza da contratante | Pessoa física e pessoa jurídica |
| Quantidade de perfis | Um perfil ativo |
| Efeito de alterações | Apenas contratos futuros |
| Dados sensíveis em auditoria | Nunca registrar valores de documento ou endereço |

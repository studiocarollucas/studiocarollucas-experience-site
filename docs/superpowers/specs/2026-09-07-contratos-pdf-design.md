# Contratos PDF no Studio OS — design

## Objetivo

Permitir que a equipe gere, a partir da ficha de um ensaio, um contrato PDF pronto para impressão ou envio. A primeira versão não coleta assinatura eletrônica nem envia o documento automaticamente.

## Escopo

- Um modelo único de contrato fotográfico.
- Geração manual pela equipe a partir da ficha do ensaio.
- PDF privado, arquivado no histórico do ensaio e da cliente.
- Captura de dados civis da cliente apenas quando forem necessários para emitir o contrato.
- Autorização de uso de imagem como cláusula com escolha explícita da cliente.

Não entram neste marco: assinatura eletrônica, múltiplos modelos por experiência, envio automático, editor livre de cláusulas ou automação de cobrança.

## Fluxo

1. Na ficha do ensaio, a equipe escolhe **Gerar contrato**.
2. O OS verifica se a cliente possui CPF, data de nascimento e endereço completos. Campos ausentes são solicitados antes de continuar; o cadastro inicial da cliente continua leve.
3. A equipe confirma a autorização de uso de imagem e revisa os dados pré-preenchidos do ensaio.
4. O sistema cria um snapshot imutável e gera o PDF.
5. O documento aparece no histórico da cliente e do ensaio para download por link temporário.

## Conteúdo do contrato

O modelo terá:

- identificação das partes;
- objeto do ensaio, pacote e entregas contratadas;
- valores, pagamentos e saldo;
- data, horário e local;
- reagendamento: taxa de R$ 50 quando solicitado nos 15 dias anteriores ao ensaio;
- cancelamento: reembolso integral do valor já pago até 30 dias antes do ensaio; após esse prazo, não há reembolso;
- autorização de uso de imagem, opt-in separado no contrato;
- tratamento de dados pessoais;
- blocos para assinatura manual.

As cláusulas deverão passar por revisão de profissional jurídico antes de uso comercial. O sistema organiza dados e geração de documento; não promete validade jurídica automática.

## Dados e privacidade

Os dados cadastrais da contratante do estúdio serão mantidos em configuração protegida do ambiente, nunca no código ou no Git. O repositório não armazena CPF ou endereço pessoal em seeds, testes, documentação ou variáveis públicas.

O registro de contrato guardará número, versão do modelo, status, emissor, data, opções confirmadas, dados de cliente/ensaio/pacote usados e o caminho do PDF. O snapshot evita que alterações futuras do CRM mudem um contrato já emitido.

PDFs ficam em Storage privado. Somente integrantes autorizados do Studio OS podem criar, listar e obter URLs assinadas temporárias. As ações de emissão ficam registradas em auditoria.

## Experiência no admin

- Ficha de cliente: seção de documentos emitidos.
- Ficha de ensaio: ação principal **Gerar contrato** e histórico de contratos daquele ensaio.
- Formulário de emissão: mostra campos faltantes, permite completar dados, confirma uso de imagem e apresenta uma revisão antes da geração.
- Erros impedem emissão parcial e informam qual dado obrigatório falta.

## Verificação

- Testes de schema e snapshot: campos obrigatórios, valores, cláusula de imagem e imutabilidade.
- Testes de autorização/RLS/Storage: cliente e usuário sem papel de equipe não acessam contratos ou PDFs.
- Teste de composição: dados de cliente, ensaio, pacote e pagamentos aparecem corretamente no contrato.
- Teste de PDF: conteúdo obrigatório, ausência de dados secretos e geração repetível.
- Teste de interface: bloqueio por campos ausentes, revisão, criação e download temporário.

## Critérios de aceite

- A equipe gera um PDF sem copiar dados manualmente entre telas.
- O documento emitido permanece igual mesmo após alteração do CRM ou do pacote.
- A escolha de uso de imagem é visível no contrato e auditável.
- Nenhum PDF ou dado civil fica público.
- O contrato pode ser impresso ou enviado manualmente à cliente.

# SCL-404/405 — Quiz consentido e aquisição

## Objetivo

Transformar a curadoria pública em um Lead somente quando a visitante consentir, mantendo o Quiz anônimo útil e levando contexto não sensível ao WhatsApp.

## Escopo

- Após a recomendação, oferecer captura opcional de nome, e-mail e telefone com consentimento explícito.
- Criar um Lead com `source = quiz`, resultado serializado da curadoria e contatos fornecidos apenas após aceite.
- Manter o uso anônimo sem criação de Lead quando houver recusa ou ausência de envio.
- Ajustar o CTA do WhatsApp para preservar apenas o contexto de curadoria e registrar a origem por uma interface local de eventos, sem PII.

## Contratos e limites

- A frente usa `createLead()` como interface de criação; não modifica rotas ou ações da ficha de Lead.
- Sem Client, conta ou autenticação no fluxo público.
- `quizResult` guarda apenas resultado e escolhas de curadoria necessárias; não armazena identificadores de analytics nem dados fora do consentimento.
- Não haverá provider externo de analytics nesta frente. O contrato de evento será reutilizável por SCL-406 e inicialmente será seguro como no-op quando não configurado.

## Fluxo

1. Visitante conclui o Quiz e recebe recomendação.
2. Pode abrir voluntariamente o formulário de contato e consentimento.
3. Com campos válidos e aceite, a Server Action cria o Lead e retorna confirmação sem expor dados enviados.
4. O link de WhatsApp usa persona, pacote e escolhas de curadoria; o evento de clique registra somente tipo e origem.

## Verificação

- Testes de schema e action: recusa não persiste, consentimento persiste Lead, e-mail inválido falha.
- Testes de componente: o formulário é opcional e o CTA mantém contexto.
- Regressões de Quiz, contato e Leads; typecheck, lint e build.


# Paixão Clutch: reserva pública sem pagamento

## Objetivo

Permitir que uma visitante solicite a reserva de uma clutch publicada, sem login e sem pagamento, enquanto o estúdio preserva a aprovação final e o controle de disponibilidade.

## Escopo

- A página pública de detalhe terá o CTA **Reservar esta clutch** e um formulário inline.
- O formulário solicita retirada, devolução, nome e WhatsApp; e-mail é opcional.
- Retirada e devolução são inclusivas, obrigatórias e a devolução não pode anteceder a retirada.
- Uma submissão válida cria uma reserva `rental` em estado `pending` por 24 horas.
- Reservas `pending` ainda válidas e `confirmed` bloqueiam o mesmo item em períodos sobrepostos.
- A cliente recebe confirmação em tela com protocolo, sem dados de outras reservas.
- O admin de Paixão Clutch mostra pedidos pendentes, período, contato e expiração; permite aprovar, recusar/liberar e abrir uma conversa de WhatsApp contextual.
- A disponibilidade trata pendências expiradas como não bloqueantes, mesmo antes da limpeza persistente.

## Fora de escopo

- Pagamento, checkout, reembolso ou política automática de cancelamento.
- Login e histórico de reservas da cliente.
- Envio automático de WhatsApp ou e-mail. O projeto não possui provedor transacional configurado; nesta fase o admin usa um link de WhatsApp contextual.
- Exposição de dados administrativos, mídia privada, URLs assinadas, dados de terceiros ou notas internas.

## Arquitetura

Reutilizar `inventory_reservations`, com `purpose: "rental"`, e as proteções de conflito existentes. Uma migration mínima torna `shoot_id` opcional para locações e acrescenta `guest_name`, `guest_phone`, `guest_email` e `expires_at`. A locação interna já vinculada a um ensaio continua válida; a nova locação pública não tem ensaio e exige contato. Reservas de ensaio continuam exigindo o ensaio vinculado pela validação de domínio. Criar uma fronteira pública específica para:

1. validar dados de convidada e o intervalo;
2. localizar exclusivamente a clutch pela projeção pública publicada;
3. verificar e gravar a reserva de modo concorrente e auditável;
4. retornar um DTO mínimo para o formulário; e
5. aplicar o tempo de expiração de 24 horas na consulta e na operação administrativa.

O formulário é um componente cliente focado. Dados da clutch, rotas e consultas de reserva permanecem no servidor. A ação pública não aceita ID arbitrário de inventário: resolve o item pelo slug público e pelas invariantes de publicação.

## Experiência

Na página do item, o CTA atual de consulta dá lugar ao convite de reserva, mantendo uma alternativa discreta para falar pelo WhatsApp. O formulário fica próximo do preço e dos atributos. Erros de datas e indisponibilidade aparecem junto aos campos; a confirmação não promete pagamento nem aprovação final.

No admin, a curadoria atual ganha a leitura de pedidos de locação e decisões explícitas. A aprovação mantém o bloqueio; recusa/liberação elimina o bloqueio. O link de WhatsApp preenche o nome da cliente, a clutch, as datas e a decisão escolhida, sem enviar mensagens automaticamente.

## Segurança e qualidade

- Validação de entrada no servidor e limitação básica de abuso na rota pública.
- Controle de concorrência para impedir dois pedidos no mesmo intervalo.
- Autorização de equipe em toda decisão administrativa, com auditoria.
- DTOs públicos mínimos; nenhuma URL privada ou dado de outra cliente chega ao navegador.
- Testes de intervalo, conflito, expiração, autorização, serialização pública e estados de interface.

## Critérios de aceite

1. Uma visitante consegue pedir uma clutch publicada como convidada.
2. Conflitos ativos são recusados sem vazamento de dados.
3. O pedido pendente expira operacionalmente após 24 horas.
4. Equipe aprova, recusa ou libera o pedido pelo admin.
5. O admin consegue iniciar o WhatsApp contextual manualmente.
6. Não há pagamento, envio automático, login obrigatório ou exposição de dados privados.

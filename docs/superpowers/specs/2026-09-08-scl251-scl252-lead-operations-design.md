# SCL-251/252 — Operação do Lead

## Objetivo

Completar o funil já entregue com uma ficha operacional de Lead e mudanças de estágio auditáveis. A lista em `/admin/leads` já aponta para essa ficha; esta frente torna esse link útil sem criar um segundo CRM.

## Escopo

- Rota protegida `/admin/leads/[id]` para staff/admin.
- Consulta única do Lead com seus dados comerciais e histórico de auditoria.
- Formulários server-side para atribuir responsável, atualizar notas, avançar/retroceder estágio e registrar motivo ao perder.
- Serviço de domínio que usa `canTransitionLeadStatus()` e grava `AuditLog` com before/after.
- CTAs de conversão ficam visíveis somente como próximos passos indisponíveis; SCL-253/254 serão responsáveis pela conversão efetiva.

## Contratos e limites

- `domain/leads/**` desta frente é exclusivo para leitura detalhada e transições. A frente de Quiz chama apenas o contrato já estável `createLead()` e não altera esses fluxos.
- Não há migration: `leads.status`, `leads.lost_reason` e `audit_log` já existem.
- Nenhuma mutação é autorizada só pela interface: as Server Actions revalidam papel, input e transição.
- O motivo é obrigatório ao entrar em `perdido`; alterações inválidas não gravam nada.

## Fluxo

1. A lista abre a ficha pelo ID.
2. A ficha consulta o Lead e os eventos de auditoria relacionados.
3. Uma ação valida sessão staff/admin, estado atual e estado destino.
4. A transação lógica atualiza o Lead e registra o evento; a rota é revalidada.

## Verificação

- Testes de página: acesso, Lead inexistente e apresentação de contato/quiz permitido.
- Testes de domínio: transições válidas/inválidas, motivo obrigatório e payload de auditoria.
- Typecheck, lint, build e regressões de Leads.


# Checklist de cobertura — Stúdio Carol Lucas MVP

**Referência:** PRD v1.1 + TASKS v2.0 · reconciliado em 07/10/2026 com `main` (`9a52a16`) e desenvolvimento local de SCL-555

## Já implementado

- Infra, Supabase, Auth/RLS, CI, observabilidade
- Core Client/Lead/Package/Shoot/Payment/Expense/Preparation/Production/Audit
- Studio OS: dashboard, clientes, agenda, financeiro, produção, preparação
- Minha Experiência: auth, home, checklist, meu ensaio, styling colaborativo
- Site: home, experiências, cinco páginas verticais (Família com assets temporários), quiz
- Contratos PDF privados + contratante configurável (SCL-310)
- [x] UI/funil de Leads + conversão Lead → Client → Shoot (SCL-250–254)
- [x] Persistência consentida do Quiz (SCL-404)
- [x] Gallery: schema, assets privados, publicação no Admin, Reveal no portal (SCL-500–503)
- [x] Acervo físico: InventoryItem, mídia, CRUD/importação XLSX, reservas com conflito (SCL-550–553)
- [x] Paixão Clutch: curadoria Admin, mídia pública, vitrine/catálogo e pedido público de locação (SCL-556–557)
- [x] WhatsApp contextual e eventos de clique (SCL-405)
- [x] SEO, JSON-LD, verificação Search Console e eventos do quiz (SCL-406; ativação depende da configuração)
- [x] Galeria: favoritos, downloads autorizados, catálogo/pedido de upsell e recebimentos no financeiro (SCL-504–507; PR #9 integrado)
- [x] Seleção de peças do acervo pela cliente (SCL-554)
- [x] Infra e fluxos Resend: boas-vindas, D-7/D-1, Reveal, review, delivery log/retry/idempotência (SCL-700–705)
- [x] Reviews e indicação com tracking de conversão (SCL-720–722)

## Implementação local, antes de integrar

- [ ] Integrar SCL-555: inspiração ligada a preferência/reserva ativa do mesmo ensaio, edição staff no Admin e indicador no portal. Código e migration `0053` disponíveis na branch `codex/scl-555-styling-inventory`; DONE somente após merge.

## Falta para lançamento validado

- [ ] Identificar o ambiente do banco e aplicar migrations `0049`–`0053` em ordem no destino adequado; a consulta somente de leitura de 07/10 confirmou hashes ausentes no banco configurado localmente.
- [ ] Validar RLS e fluxos completos em ambiente atualizado: preferência/reserva/styling, favoritos/downloads, upsell/pagamentos, reviews/indicações.
- [ ] Conferir configuração de produção: domínio/WhatsApp, GA, Search Console, Resend/remetente, segredo e agenda do cron, review Google. O `.env.local` não possui essas flags e tem envio de e-mail desabilitado; produção ainda não foi auditada.
- [ ] Validar entrega de e-mails no ambiente apropriado e somente então ativar os disparos de produção.
- [ ] Assets definitivos da vertical Família (SCL-402)

Auditoria repetível e sem escrita: `npm run check:launch-readiness`. O comando mostra apenas presença de configuração e hashes aplicados, sem valores de segredos.

## Pós-MVP

- [ ] Timeline enriquecida (SCL-306)
- [ ] Aluguel avulso Paixão Clutch completo — pagamento/cancelamento/notificações (SCL-558; pedido público já existe)
- [ ] Recorrência CRM (SCL-723)
- [ ] Virtual Try-On (SCL-800)
- [ ] Assistente/agente (SCL-810/811)
- [ ] Fidelidade (SCL-820)

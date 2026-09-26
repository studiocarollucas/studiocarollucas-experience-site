# Favoritos (PhotoSelection) e downloads autorizados da Galeria (SCL-504 + SCL-505)

## Objetivo

Permitir que a cliente dona de uma Gallery publicada marque as fotos favoritas e, quando o estúdio liberar, baixe as fotos por links temporários — sem expor storage, chaves ou caminhos de objeto ao browser. A contagem de favoritos fica visível no Admin e disponível como consulta de domínio para o upsell (SCL-506).

## Escopo

- Tabela `photo_selections` (PhotoSelection, PRD §8: `Gallery 1 ─── N PhotoSelection`), única por cliente/galeria/foto.
- Coluna `galleries.downloads_enabled boolean not null default false`.
- Server Action do portal `setPhotoSelectionAction({ assetId, selected })` e botão acessível de favorito na galeria da cliente.
- Route Handler `GET /minha-experiencia/galeria/fotos/[assetId]/download` que autoriza e redireciona para URL assinada de 60 s.
- Admin: contagem por galeria e por foto; opção de liberar/bloquear downloads com auditoria.
- Consulta `getGallerySelectionSummary(galleryId)` para Admin e upsell.
- Migration `0050_gallery_selections_downloads` + snapshot + journal.

## Fora de escopo

- Catálogo/pedido de upsell (SCL-506/507): só a consulta de contagem fica pronta.
- Variantes web/thumbnail: o modelo atual guarda um único arquivo por foto (o enviado pela equipe). O download entrega esse arquivo; a decisão de liberar é por Gallery. Quando existirem variantes (evolução de SCL-501), a opção "bloquear originais" vira uma segunda coluna sem mudar o contrato do endpoint.
- Download em lote (.zip), limite de seleção pelo pacote e notificações de seleção.

## Decisões

### Autorização

A cliente nunca informa o próprio id. Toda operação resolve o `PortalContext` no servidor (`getPortalRequestContext` → RLS vincula `auth.uid()` à única linha de `clients` legível) e usa `context.client.id`. Uma foto é autorizada somente quando:

```text
gallery_assets.id = :assetId
  AND galleries.status = 'published'
  AND shoots.client_id = :clientId      (gallery_assets → galleries → shoots)
```

É o mesmo escopo de `readClientGallery`. Foto de outra cliente, de galeria em rascunho ou inexistente recebe a mesma resposta neutra ("não disponível" / 404), sem revelar existência.

### Persistência e concorrência (SCL-504)

- `photo_selections(id, gallery_id, asset_id, client_id, created_at)`, FKs com `on delete cascade` (remover foto, galeria ou cliente remove a seleção), constraint `photo_selections_client_gallery_asset_unique (client_id, gallery_id, asset_id)` e índice `photo_selections_gallery_asset_idx (gallery_id, asset_id)` para as contagens.
- `gallery_id` gravado é sempre o da foto autorizada, nunca um valor vindo do browser.
- A ação recebe o **estado desejado** (`selected: true | false`), não um "inverter": repetir a mesma requisição é idempotente e cliques concorrentes convergem para o último estado pedido.
  - `selected = true` → `INSERT … ON CONFLICT DO NOTHING` (duas abas simultâneas não geram erro nem duplicata).
  - `selected = false` → `DELETE` pela chave cliente/galeria/foto (apagar o que não existe é no-op).
- A UI é otimista (marca na hora, desabilita o botão da foto enquanto a ação roda) mas o servidor é a autoridade: o estado final vem do retorno da ação e é revertido com mensagem se a ação falhar. A ação não revalida a página, para não reassinar todas as URLs a cada clique.

### Downloads (SCL-505)

- `downloads_enabled` nasce `false` em todas as galerias, inclusive nas já publicadas: o padrão seguro é **bloqueado**, e o PRD fala em "controle de download quando permitido" e em upsell de "fotos adicionais/coleção completa". A equipe libera por galeria.
- O link na galeria aponta para o endpoint do próprio app, nunca para o storage. O endpoint:
  1. resolve a cliente pela sessão (sem sessão → 401; sessão sem cliente vinculada → 403);
  2. autoriza a foto pelo escopo acima (senão 404);
  3. com downloads bloqueados → 403;
  4. assina com a service role (somente no servidor, como `readClientGallery`) `createSignedUrl(path, 60, { download: "studio-carol-lucas-<id>.<ext>" })` e responde `307` com `Cache-Control: no-store`.
- A URL assinada expira em 60 s (mesma política dos contratos); o caminho do objeto só existe dentro dela.
- A visualização continua usando as URLs de 10 min já emitidas por `readClientGallery`; elas não são link de download e o bloqueio de download não esconde as fotos.

### Admin

- `/admin/galerias/[shootId]` mostra "N favoritos da cliente" e, em cada foto, "n favorito(s)".
- Seção **Downloads** com estado atual e botão Liberar/Bloquear, pela action `setGalleryDownloadsAction` (`defineAdminAction`, role `staff`).
- `setGalleryDownloadsEnabled` faz `UPDATE … WHERE downloads_enabled <> :enabled RETURNING` e grava `gallery.downloads_updated` no `audit_log` na mesma transação (`before`/`after` com `downloadsEnabled`). Repetir o mesmo valor não gera auditoria nem erro; galeria inexistente falha.

### Consulta para upsell

`getGallerySelectionSummary(galleryId): Promise<{ totalSelections: number; byAssetId: Record<string, number> }>` — agrega `count(*)` por foto. SCL-506 pode usar `totalSelections` (ex.: favoritas além das incluídas no pacote) sem nova migration.

## Segurança e RLS

- `photo_selections`: RLS ligada, `REVOKE ALL` de `anon`/`authenticated`, `GRANT SELECT` para `authenticated` e policy `photo_selections_staff_access` (somente staff/admin leem via PostgREST). A cliente não tem acesso direto à tabela: escreve apenas pela Server Action, que roda com a conexão do servidor (Drizzle) depois da autorização no domínio — mesmo desenho de `gallery_assets`.
- A coluna nova em `galleries` herda os grants/policies de 0036 (staff).
- Nenhuma chave privada, service role ou `storage_path` chega ao browser: o componente da galeria recebe apenas `id` e a URL assinada de visualização.
- `check:admin-auth`: a nova action do Admin usa `defineAdminAction`; a action e o route handler do portal ficam em `app/(client)`, fora do escopo do guard do Studio OS, e fazem a própria autorização pela sessão da cliente.

## Critérios de aceite

1. Cliente favorita/desfavorita somente fotos da própria Gallery publicada (SCL-504).
2. Persistência única por cliente/gallery/foto (constraint) (SCL-504).
3. Contagem disponível para Admin e para upsell (SCL-504).
4. Concorrência/idempotência: estado desejado + `ON CONFLICT DO NOTHING`/`DELETE` por chave (SCL-504).
5. Download só de fotos autorizadas (SCL-505).
6. URL assinada com expiração de 60 s (SCL-505).
7. Bloqueio de download por Gallery, padrão bloqueado, auditado (SCL-505).
8. Nenhuma chave privada ou caminho de storage no browser (SCL-505).

## Verificação

- Testes de migration/snapshot/journal (`tests/db/gallery-selections-migration.test.ts`).
- Testes de domínio com Drizzle mockado: escopo da autorização, idempotência, contagem, bloqueio e auditoria.
- Testes da Server Action, do Route Handler, da página da galeria, do componente e do Admin.
- Teste opcional contra banco real (`RUN_LIVE_DB_TESTS=true`) para constraint, default e RLS.

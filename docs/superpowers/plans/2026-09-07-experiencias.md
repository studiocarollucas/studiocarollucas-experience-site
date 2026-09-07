# Experiências e páginas de ensaio

Objetivo: completar SCL-401 e a primeira entrega de SCL-402 na direção editorial aprovada.

Escopo: catálogo `/experiencias`, páginas estáticas `/experiencias/15-anos`, `/experiencias/aniversario-feminino`, `/experiencias/gestante`, `/experiencias/newborn`. Home passa a encaminhar para detalhes; contato final continua contextual no WhatsApp. Família fica para expansão de acervo/conteúdo. Sem preços, pacotes ou prazos inventados.

- [x] Centralizar catálogo e WhatsApp em `lib/site/experiences.ts` e `lib/site/contact.ts`.
- [x] Implementar catálogo e rota `[slug]` com metadata individual, geração estática e 404 para slug inexistente. Reutilizar tokens e seis imagens WebP; navegação compartilhada entre novas páginas.
- [x] Atualizar links de home, verificar HTTP das cinco novas rotas e 404, textos e contato contextual; revisar desktop/mobile; lint e build.
- [x] Registrar entrega e commit local. Publicação inicial autorizada da home é independente deste novo incremento.

Validação: build e TypeScript passaram; lint sem erros (cinco avisos preexistentes em testes de domínio). Cinco páginas retornam HTTP 200 com metadata própria e contato válido; slug inexistente retorna 404. Catálogo com quatro imagens carregadas; página de 15 anos revisada em desktop e 390 px, sem overflow horizontal e com FAQ funcional.

Home publicada no commit 79bbb96: CI 34148082977 concluído com sucesso e Vercel success. Domínio principal verificado com HTTP 200 e conteúdo atualizado: https://studiocarollucas-experience-site.vercel.app/.

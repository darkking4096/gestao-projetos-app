# Handoff - UX do Plano Diario e Navegacao Mobile

Data: 2026-04-15

## Pedido do Usuario

O usuario validou o plano diario por prints em desktop/mobile e esta incomodado com a experiencia visual e de navegacao.

Principais queixas:

- a tela de Relatorios/Plano Diario fica comprimida porque sidebar, lista de relatorios e conteudo aparecem juntos;
- no Android em modo paisagem sobra pouco espaco para ler e escrever;
- no Android em modo retrato a experiencia precisa priorizar uma acao por vez;
- a area de escrita fica grande e exposta mesmo quando nao esta sendo usada;
- o chat do planejamento deveria parecer mais uma conversa imersiva;
- ao sair do chat, o registro deve continuar aparecendo como documento/plano organizado;
- o botao voltar do Android pode sair do app em vez de voltar para o estado anterior;
- gestos horizontais ou de borda podem trocar tela/sair do app e causar perda de texto;
- pequenos deslizes nao devem trocar de aba imediatamente;
- se houver gesto horizontal, ele deve acompanhar o dedo e permitir cancelamento.

O usuario pediu para criar uma story e depois um handoff para outro chat entender o contexto e comecar a executar.

## Prints Recebidos

Arquivos locais usados como referencia visual:

- `image.png`
- `WhatsApp Image 2026-04-15 at 14.54.44 (1).jpeg`

Observacao: estes arquivos sao contexto local de conversa e nao devem ser tratados automaticamente como fonte do produto. Evitar commitar imagens de WhatsApp/prints sem pedido explicito.

## Fonte de Verdade

Story nova criada:

- `docs/stories/2026-04-15-ux-plano-diario-mobile.md`

Story relacionada:

- `docs/stories/2026-04-15-planejamento-diario-ia.md`

A story de planejamento diario ja recebeu uma nota em "Riscos e Decisoes Pendentes" apontando a nova story de UX.

## Estado Atual da Implementacao

O plano diario com IA ja existe em Relatorios:

- cria/abre plano do dia em `reportNotes`;
- salva mensagens em `messages`;
- salva cards em `actionCards`;
- aceita cards e cria tarefas, tarefas de projeto, rotinas e projetos conforme stories ja feitas;
- usa `src/planejamento-ia.js` para prompt, contexto e parser.

Atualizacao apos primeira rodada de execucao em 2026-04-15:

- `App.jsx` foi ajustado para considerar altura da viewport no criterio de desktop (`winW >= 768 && winH >= 560`), evitando shell desktop em Android paisagem baixo.
- `App.jsx` tambem removeu o limite fixo de 430px para mobile largo/paisagem, mantendo esse limite apenas em mobile estreito.
- `src/abas/relatorios.jsx` agora mede viewport localmente e usa o mesmo criterio de desktop por largura + altura.
- `src/abas/relatorios.jsx` ganhou estado `reportListCollapsed`, botao para recolher a lista de Relatorios, trilho compacto de 44px e botao para reabrir.
- Quando o plano diario esta selecionado em tela compacta, a lista de Relatorios recolhe por padrao no layout desktop compacto.
- O compositor do plano diario agora usa rascunhos em `localStorage` por nota, na chave `coofe:dailyPlanDrafts`.
- O rascunho e removido somente apos envio de mensagem para a IA.
- `npm run build` passou apos essas mudancas.

Atualizacao apos continuidade em 2026-04-15:

- `src/abas/relatorios.jsx` ganhou estado `plannerChatOpen`.
- O plano diario agora abre em modo documento, com botao explicito para abrir/fechar o chat.
- Com o chat fechado, o compositor nao fica exposto; se houver texto em andamento, aparece apenas uma previa compacta de rascunho salvo.
- Com o chat aberto, as mensagens aparecem em formato de conversa e o compositor fica dentro da area do chat.
- Cards aprovaveis continuam visiveis fora do chat, inclusive depois de fechar a conversa.
- `App.jsx` agora dispara `app:internalBack` antes do `navBack()` global no `popstate`.
- Em Relatorios, o voltar interno fecha o chat, recolhe a lista compacta ou volta do editor para a lista mobile antes do fallback global.
- Swipe horizontal global continua desativado; o shell mobile segue com `touchAction: "pan-y pinch-zoom"`.
- `npm run build` passou apos esta continuidade.

Arquivos importantes para executar esta frente:

- `src/abas/relatorios.jsx`
  - concentra layout de Relatorios;
  - contem drag mobile/touch da lista;
  - contem UI do plano diario, chat, cards e area "Comece a escrever...";
  - pontos encontrados por busca:
    - `Chat de planejamento`
    - `Plano diario`
    - `Comece a escrever...`
    - bloco de `DRAG & DROP — Mobile (touch)`
- `App.jsx`
  - contem navegacao principal;
  - contem controle de `popstate` para botao voltar Android/browser;
  - contem shell mobile com `touchAction`;
  - historico antigo de swipe aparece como referencia no codigo/comentarios.
- `src/componentes-base.jsx`
  - componentes compartilhados, se precisar extrair botao/painel.
- `src/utilidades.js`
  - regras de dominio, datas e agenda; evitar mexer salvo necessidade real.

## Story Criada

Arquivo: `docs/stories/2026-04-15-ux-plano-diario-mobile.md`

Stories internas planejadas:

1. Layout Clean do Plano Diario
2. Chat Imersivo com Compositor Minimizado
3. Voltar do Android Navega Dentro do App
4. Gestos Horizontais Seguros
5. Persistencia de Rascunho e Recuperacao

## Ordem Recomendada de Execucao

### 1. Layout e rascunho - feito parcialmente

Ja implementado:

- painel/lista de relatorios recolhivel no desktop/compacto;
- layout mobile sem lista lateral fixa em Android retrato;
- colapso da lista no Android paisagem via criterio de altura;
- estado local persistido de rascunho do compositor.

Ainda validar manualmente:

- se a rolagem principal ficou previsivel em desktop estreito e Android paisagem;
- se notas comuns continuam confortaveis com a lista recolhida/expandida;
- se o trilho compacto de Relatorios esta suficientemente claro para o usuario.

### 2. Depois transformar chat/compositor

Implementar:

- estado `chatOpen` ou equivalente para o plano diario;
- botao/acao compacta para abrir chat;
- compositor minimizado quando chat fechado;
- mensagens em formato de conversa quando aberto;
- fechar chat sem apagar rascunho.

Manter compatibilidade com `messages`, `aiRuns`, `actionCards`, `createdItemRefs`.

Observacao: ainda nao foi criado `chatOpen`. O chat continua sempre visivel quando o plano diario esta aberto; apenas o rascunho ficou protegido.

### 3. Em seguida ajustar voltar Android

Revisar `App.jsx`:

- fechar chat/painel antes de sair;
- voltar de detalhe/relatorio para estado anterior;
- nao apagar rascunho;
- nao criar loop de `history.pushState`.

Testar manualmente no navegador e depois Android real.

Observacao: `App.jsx` ainda tem o controle atual de `popstate` chamando `navBack()` e empurrando `history.pushState`. O proximo chat deve revisar esse fluxo com cuidado antes de mexer.

### 4. Por ultimo, gestos horizontais

Auditar antes de reintroduzir qualquer swipe:

- gestos devem ser bloqueados em `input`, `textarea`, editor, card editavel e chat;
- pequenos deslizes nao podem trocar aba;
- se existir preview, ele precisa acompanhar o dedo e cancelar se voltar antes do limite;
- respeitar borda do Android para nao disputar com gesto do sistema.

Se ficar inseguro implementar preview completo, melhor desativar troca horizontal global por padrao e registrar decisao na story.

Observacao: nesta rodada nao foi adicionado swipe horizontal global. O shell mobile segue com `touchAction: "pan-y pinch-zoom"`.

## Acceptance Criteria Criticos

Prioridade alta:

- no Android retrato, plano diario sem lista lateral fixa ocupando espaco;
- no Android paisagem, lista de relatorios recolhivel;
- chat abre/fecha explicitamente;
- campo de escrita nao ocupa espaco grande quando chat fechado;
- texto em andamento nao e perdido ao fechar chat, voltar ou trocar painel;
- voltar Android fecha chat/painel antes de sair do app;
- pequenos deslizes horizontais nao trocam aba;
- `npm run build` passa.

## Cuidados Tecnicos

- Nao mudar backend nem schema Supabase.
- Nao remover `totalXp` ou campos legados.
- Nao quebrar notas comuns de Relatorios.
- Nao criar biblioteca nova para gestos sem necessidade.
- Preservar padrao do app: JavaScript/JSX, estilos inline, tokens `C.*`, SVG inline.
- Evitar alterar regras de IA nesta frente.
- Nao apagar imagens/arquivos locais do usuario.
- Atualizar a story conforme itens forem implementados.

## Validacao Recomendada

Rodar:

```bash
npm run build
```

Testes manuais:

- desktop largura ampla;
- desktop estreito simulando mobile;
- Android retrato;
- Android paisagem;
- abrir plano diario, digitar rascunho, fechar chat, reabrir e confirmar texto;
- digitar e apertar voltar Android: deve fechar chat/painel antes de sair;
- pequenos deslizes durante digitacao: nao deve trocar aba nem apagar texto;
- scroll vertical em cards longos;
- notas comuns ainda abrem/editam.

## Estado do Git no Momento do Handoff

Status atual apos a primeira rodada de execucao:

```text
 M App.jsx
 M docs/stories/2026-04-15-planejamento-diario-ia.md
 M src/abas/relatorios.jsx
?? docs/HANDOFF_UX_PLANO_DIARIO_MOBILE_2026-04-15.md
?? docs/stories/2026-04-15-ux-plano-diario-mobile.md
```

Arquivos alterados pela primeira rodada:

- `App.jsx`
- `src/abas/relatorios.jsx`
- `docs/stories/2026-04-15-planejamento-diario-ia.md`
- `docs/stories/2026-04-15-ux-plano-diario-mobile.md`
- `docs/HANDOFF_UX_PLANO_DIARIO_MOBILE_2026-04-15.md`

Arquivos locais nao rastreados vistos no `git status`:

- `image.png`
- `WhatsApp Image 2026-04-15 at 14.54.44.jpeg`
- `WhatsApp Image 2026-04-15 at 14.54.44 (1).jpeg`

Nao commitar esses prints sem confirmacao do usuario.

## Proximo Passo Sugerido Para o Chat Executor

1. Ler `docs/stories/2026-04-15-ux-plano-diario-mobile.md`.
2. Conferir `src/abas/relatorios.jsx` nos trechos de `PLANNER_DRAFTS_KEY`, `reportListCollapsed`, `renderReportListRail` e `renderPlannerChat`.
3. Validar visualmente Story 1 e Story 5 em desktop estreito e Android paisagem/retrato.
4. Story 2 foi implementada com `plannerChatOpen`; validar visualmente em Android real.
5. Story 3 foi implementada parcialmente via `app:internalBack`; ainda confirmar comportamento de estado raiz em Android real.
6. Story 4 ficou com decisao conservadora: manter swipe global desativado ate existir preview/cancelamento completo.
7. Rodar `npm run build`.
8. Atualizar checklist e notas de implementacao da story.

## Pontos de Atencao Para o Proximo Chat

- O criterio de desktop agora depende de altura. Testar telas de tablet e desktop pequeno para evitar regressao inesperada.
- `localStorage` guarda rascunhos por `note.id`; se uma nota for excluida, o rascunho antigo pode ficar na chave local. Isso nao afeta dados do app, mas pode ser limpo futuramente se necessario.
- O botao recolher lista aparece no cabecalho da lista de Relatorios apenas em desktop/compacto. No mobile retrato continua usando `mobileView`.
- O trilho compacto tem atalhos para reabrir a lista e para abrir o plano de hoje.
- Nao houve mudanca de schema, backend, prompt ou parser da IA.
- A story nova esta como `In Progress`; nem todos os acceptance criteria foram fechados.

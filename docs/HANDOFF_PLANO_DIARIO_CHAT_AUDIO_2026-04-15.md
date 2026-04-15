# Handoff - Plano Diario, Chat, Pendencias e Audio

Data: 2026-04-15

## Pedido Mais Recente do Usuario

O usuario explicou que a tela de sugestoes/pendencias do planejamento diario ainda incomodava porque:

- no desktop, ao enviar texto para a IA, a area de sugestoes e processamento ocupava quase toda a tela;
- mesmo quando conseguia minimizar, a parte inferior/documento continuava ocupando espaco demais;
- ao aceitar ou recusar uma sugestao, ela nao deveria continuar aparecendo na tela de pendencias;
- decisoes aceitas/recusadas devem ficar registradas no historico do chat/plano, como um relatorio;
- o fluxo ideal e alternar entre modo conversa e modo documento;
- ao ativar modo conversa, o usuario continua falando com a IA;
- ao sair do chat, o plano vira um documento normal com historico, respostas, tarefas aceitas/recusadas e registros;
- o mesmo modelo deve funcionar no desktop e no mobile;
- o usuario quer comecar a pensar na entrada por audio, transcrevendo fala para texto.

## Estado Atual Depois Desta Rodada

Arquivos alterados nesta rodada:

- `src/abas/relatorios.jsx`
- `docs/stories/2026-04-15-ux-plano-diario-mobile.md`
- `docs/stories/2026-04-15-planejamento-diario-ia.md`
- `docs/HANDOFF_PLANO_DIARIO_CHAT_AUDIO_2026-04-15.md`

Arquivo nao versionado ja existente:

- `image.png`

Nao mexer nem commitar `image.png` sem pedido explicito.

## Mudancas Implementadas

### Audio / Ditado

Em `src/abas/relatorios.jsx`:

- o chat do plano diario agora detecta suporte a `window.SpeechRecognition || window.webkitSpeechRecognition`;
- quando houver suporte, aparece um botao de microfone ao lado de `Enviar`;
- o ditado usa `pt-BR`;
- a transcricao e concatenada no rascunho do chat do plano atual;
- o texto transcrito nao e enviado automaticamente;
- o envio continua passando por `handlePlannerText(text)`;
- erros de permissao, suporte ou inicializacao aparecem como aviso curto dentro do chat;
- nenhuma dependencia nova foi adicionada.

### Chat e Pendencias

Em `src/abas/relatorios.jsx`:

- aceitar uma acao agora cria uma mensagem `role: "system"` com label visual `Registro`;
- recusar uma acao tambem cria uma mensagem `Registro`;
- cards com `status: "accepted"` ou `status: "rejected"` deixam de aparecer na lista ativa de pendencias;
- no desktop, `renderActionCards(note)` so aparece quando `plannerChatOpen` esta aberto;
- quando o chat esta fechado, o documento fica livre da tela de pendencias;
- no mobile, a aba `Acoes` so conta e mostra cards ainda decidiveis;
- o modo documento do plano diario agora usa `renderPlannerDocument(note)`, que mostra:
  - mensagens do usuario;
  - respostas da IA;
  - registros de aceite/recusa;
  - decisoes antigas sem mensagem de registro, em uma secao de compatibilidade;
  - uma area menor de `Notas livres`.

Pontos de codigo importantes:

- `buildDecisionMessage(card, status, createdRef)` monta o texto do registro.
- `appendDecisionMessage(noteId, card, status, createdRef)` adiciona registro simples ao historico.
- `rejectActionCard(note, card)` rejeita e registra em uma unica atualizacao.
- `acceptActionCard(note, card)` cria item quando aplicavel e tambem adiciona o registro no historico.
- `renderActionCards(note)` filtra cards aceitos/recusados.
- `renderPlannerChat(note)` mostra conversa e cards ativos somente quando o chat esta aberto no desktop.
- `renderPlannerDocument(note)` e a nova visao documento/relatorio do plano.

## Validacao Ja Executada

Comando:

```bash
npm run build
```

Resultado:

- passou em 2026-04-15 apos o ajuste de chat e pendencias.
- passou novamente em 2026-04-15 apos adicionar o ditado por Web Speech API.

## Stories Atualizadas

### `docs/stories/2026-04-15-ux-plano-diario-mobile.md`

Adicionada a secao:

- `Implementacao 2026-04-15 - Ajuste de Chat e Pendencias`

Ela registra:

- cards aparecem no desktop apenas com chat aberto;
- aceitar/recusar registra decisao no historico;
- modo documento mostra relatorio com mensagens e decisoes;
- mobile considera apenas cards decidiveis na aba `Acoes`;
- build passou.

### `docs/stories/2026-04-15-planejamento-diario-ia.md`

Na Story 10 de audio:

- marcado que a pipeline de texto ja esta isolada/reutilizavel;
- registrado que ainda nao foi adicionada dependencia de audio;
- registrado que a primeira versao de ditado Web Speech foi implementada;
- registrado que texto transcrito preenche o mesmo rascunho usado por `handlePlannerText(text)`;
- documentadas opcoes futuras:
  - Web Speech API;
  - plugin nativo Capacitor/speech-to-text;
  - API externa de transcricao.

Decisao de produto registrada:

- audio deve ser apenas uma forma de preencher/enviar texto para `handlePlannerText(text)`;
- nao criar uma segunda pipeline de planejamento.

## Proximo Passo Recomendado

Comecar por validacao visual e teste real de microfone antes de trocar a estrategia de audio.

Ordem sugerida:

1. Rodar o app e validar o Plano Diario no desktop:
   - abrir Relatorios;
   - abrir Plano de hoje;
   - confirmar que o modo documento nao mostra pendencias o tempo todo;
   - abrir chat;
   - enviar texto;
   - conferir cards pendentes;
   - aceitar e recusar cards;
   - confirmar que os cards somem da lista ativa;
   - confirmar que aparecem como `Registro` no historico/documento.

2. Validar mobile:
   - modo `Plano` deve mostrar documento/relatorio;
   - modo `Chat` deve focar conversa;
   - modo `Acoes` deve mostrar somente pendencias reais;
   - aceitar/recusar deve esvaziar a aba `Acoes` quando nao houver mais nada pendente.

3. Ajustar visual se necessario:
   - altura do chat no desktop;
   - leitura do `renderPlannerDocument`;
   - separacao visual entre resposta da IA e registro;
   - texto dos botoes `Abrir chat` / `Fechar`.

4. Testar ditado:
   - abrir chat do plano diario em navegador desktop com suporte a Web Speech API;
   - clicar no microfone;
   - permitir microfone;
   - confirmar que a fala aparece no rascunho;
   - revisar e enviar manualmente;
   - validar Android/WebView, esperando que o recurso possa nao estar disponivel.

## Como Evoluir Audio Sem Quebrar o Fluxo

Implementacao atual:

- estado local em `ReportsTab`:
  - `plannerSpeechSupported`;
  - `plannerListeningNoteId`;
  - `plannerSpeechError`.
- funcao `startPlannerDictation(noteId)`;
- se `window.SpeechRecognition || window.webkitSpeechRecognition` existir:
  - inicia reconhecimento em `pt-BR`;
  - ao receber resultado, concatena texto em `plannerDrafts[noteId]`;
  - nao envia automaticamente;
  - permite revisar o texto antes de enviar.
- se nao houver suporte ou permissao:
  - mostra mensagem curta no chat;
  - nao adiciona dependencia.

Ponto de UI sugerido:

- botao pequeno de microfone ao lado do botao `Enviar` dentro do formulario do chat;
- manter escondido/desabilitado se nao houver suporte;
- usar SVG inline, sem emoji.

Importante:

- nao enviar audio bruto para lugar nenhum nesta primeira etapa;
- nao adicionar biblioteca nova sem decisao explicita;
- preservar compatibilidade com WebView/Capacitor;
- manter `handlePlannerText(text)` como unica entrada para a IA.
- se o WebView Android nao suportar Web Speech API, proxima opcao e plugin nativo Capacitor ou API externa de transcricao.

## Riscos e Pontos de Atencao

- `actionLabels`, `getCardDestination` e callbacks de decisao estao em escopo do componente; antes de refatorar, verificar ordem de declaracao para nao recriar erro de runtime por inicializacao.
- A mensagem de registro usa `role: "system"` dentro de `messages`; hoje a UI trata isso como `Registro`. Se outra parte do app assumir apenas `user`/`assistant`, revisar antes de reaproveitar.
- Decisoes antigas ja aceitas/recusadas podem nao ter mensagem `Registro`; `renderPlannerDocument` cobre isso em `legacyDecisions`.
- Validar em Android real, porque o comportamento de altura, teclado e `popstate` no WebView pode diferir do navegador desktop.
- Se implementar Web Speech API, ela pode nao funcionar no WebView Android dependendo do ambiente. Tratar como recurso opcional.

## Comandos Uteis

Build:

```bash
npm run build
```

Busca rapida:

```bash
rg -n "renderPlannerDocument|buildDecisionMessage|rejectActionCard|plannerChatOpen|handlePlannerText" src/abas/relatorios.jsx
```

Status:

```bash
git status --short
```

## Estado Git No Momento do Handoff

Antes de criar este handoff, o status era:

```text
 M docs/stories/2026-04-15-planejamento-diario-ia.md
 M docs/stories/2026-04-15-ux-plano-diario-mobile.md
 M src/abas/relatorios.jsx
?? image.png
```

Depois deste arquivo, tambem deve aparecer:

```text
?? docs/HANDOFF_PLANO_DIARIO_CHAT_AUDIO_2026-04-15.md
```

Atualizacao apos inicio do audio:

```text
 M docs/HANDOFF_PLANO_DIARIO_CHAT_AUDIO_2026-04-15.md
 M docs/stories/2026-04-15-planejamento-diario-ia.md
 M docs/stories/2026-04-15-ux-plano-diario-mobile.md
 M src/abas/relatorios.jsx
```

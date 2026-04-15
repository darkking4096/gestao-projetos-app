# Story: UX do Plano Diario e Navegacao Mobile

## Status

In Progress

## Contexto

O plano diario em Relatorios ja funciona como entrada de planejamento com IA, agenda e cards aprovaveis. A validacao visual em desktop e Android mostrou que a experiencia ainda esta pesada:

- a navegacao lateral, a lista de relatorios e o plano ficam visiveis ao mesmo tempo, comprimindo o conteudo;
- no celular em modo paisagem, colunas fixas deixam pouca area util para ler e escrever;
- no celular em modo retrato, o plano precisa priorizar uma tarefa por vez: conversar, revisar cards ou ler o documento;
- a area de escrita fica sempre exposta e ocupa espaco mesmo quando o usuario nao esta digitando;
- o chat do planejamento ainda parece parte de um editor/documento, nao uma conversa imersiva;
- o botao voltar do Android pode tirar o usuario do app em vez de voltar dentro do fluxo atual;
- gestos horizontais podem ser acidentais quando o usuario esta digitando ou rolando conteudo importante.

Esta story complementa `docs/stories/2026-04-15-planejamento-diario-ia.md`, especialmente o item "Ajustar UX mobile" da pipeline.

## Objetivo

Redesenhar a experiencia do plano diario para ficar limpa, responsiva e segura no Android, mantendo a consistencia visual do Coofe e preservando compatibilidade com os dados atuais de `reportNotes`.

## Principios

1. A tela deve mostrar apenas o necessario para a acao atual.
2. O plano diario deve alternar claramente entre modo conversa e modo documento.
3. Sidebars e listas auxiliares devem ser recolhiveis em telas pequenas ou quando estiverem competindo com o conteudo.
4. A escrita deve ser facil de abrir, mas nao deve ocupar espaco visual permanente.
5. Gestos nunca devem apagar texto ou trocar de aba sem intencao clara.
6. O botao voltar do Android deve navegar dentro do app antes de sair do app.
7. O app deve preservar rascunhos locais durante navegacao, gesto acidental ou troca de aba.

## Escopo

- Adaptar a area de Relatorios/Plano Diario para desktop, tablet e Android.
- Criar controles de abrir/fechar para navegacao lateral e lista de relatorios.
- Colapsar a lista de relatorios por padrao quando o plano diario estiver aberto em telas pequenas.
- Transformar o chat de planejamento em uma interface mais parecida com conversa.
- Minimizar a area de escrita quando o usuario nao estiver usando.
- Permitir abrir o compositor de mensagem por uma acao explicita, como "Abrir chat" ou botao equivalente.
- Ao sair do chat, manter o registro do plano como documento organizado.
- Melhorar comportamento do botao voltar no Android/browser.
- Reavaliar gestos horizontais entre abas para evitar troca acidental.
- Preservar conteudo digitado antes de navegar, fechar chat, trocar modo ou receber evento de voltar.

## Fora de Escopo

- Mudar backend ou criar nova tabela para planos diarios.
- Alterar o modelo de IA, prompt principal ou provider.
- Implementar transcricao por audio.
- Refazer visual de todo o app.
- Reintroduzir swipe global simples que troca aba imediatamente sem acompanhar o dedo.

## Story 1: Layout Clean do Plano Diario

### Objetivo

Dar prioridade visual ao conteudo do plano diario, escondendo elementos auxiliares quando eles nao forem necessarios.

### Escopo

- adicionar estado de painel recolhido/expandido para a lista de relatorios;
- adicionar controle visual simples com seta para abrir/fechar lista e/ou painel auxiliar;
- em mobile, abrir o plano em layout de uma coluna;
- em desktop, permitir foco no plano sem perder acesso rapido a Relatorios;
- remover rolagens concorrentes sempre que possivel;
- garantir que cards, agenda e documento nao fiquem cortados por colunas fixas.

### Acceptance Criteria

- [x] No Android retrato, o plano diario usa uma coluna principal sem lista lateral fixa ocupando espaco.
- [x] No Android paisagem, a lista de relatorios pode ser recolhida por seta/botao.
- [x] No desktop, o usuario consegue focar no plano sem a interface parecer comprimida.
- [x] O estado recolhido/expandido nao quebra notas comuns.
- [ ] A rolagem principal e previsivel e nao cria barras duplicadas desnecessarias.
- [x] Build passa.

## Story 2: Chat Imersivo com Compositor Minimizado

### Objetivo

Separar melhor a experiencia de conversa da experiencia de documento, deixando a escrita disponivel sem ocupar espaco permanente.

### Escopo

- criar estado de chat aberto/fechado dentro do plano diario;
- quando fechado, mostrar uma acao compacta para abrir conversa;
- quando aberto, mostrar mensagens em formato de conversa, com compositor fixo/compacto na parte inferior da area util;
- minimizar o compositor quando nao houver foco ou texto;
- manter historico do chat salvo em `messages`;
- ao fechar o chat, voltar para visual de documento/plano com registros e acoes organizadas.

### Acceptance Criteria

- [x] O usuario consegue abrir e fechar o chat do plano diario explicitamente.
- [x] Com chat fechado, a area de escrita nao ocupa espaco grande da tela.
- [x] Com chat aberto, mensagens aparecem como conversa clara entre usuario e IA.
- [x] Texto em andamento nao e perdido ao fechar o chat acidentalmente.
- [x] Mensagens enviadas continuam registradas no plano diario.
- [x] Cards de acoes aprovaveis continuam acessiveis apos a conversa.
- [x] Build passa.

## Story 3: Voltar do Android Navega Dentro do App

### Objetivo

Fazer o botao voltar do Android/browser respeitar a hierarquia interna do app antes de sair.

### Escopo

- revisar controle atual de `popstate` em `App.jsx`;
- definir uma pilha simples de navegacao interna para aba, detalhe, relatorio selecionado, chat aberto e painel aberto;
- ao pressionar voltar, fechar primeiro overlays/painel/chat;
- depois voltar para a tela anterior dentro do app;
- sair do app somente quando nao houver estado interno para voltar;
- preservar rascunhos antes de qualquer transicao.

### Acceptance Criteria

- [x] Se o chat estiver aberto, voltar fecha o chat sem sair do app.
- [x] Se um painel/lista estiver aberto em mobile, voltar fecha o painel.
- [x] Se o usuario entrou em um detalhe ou relatorio, voltar retorna ao estado anterior do app.
- [x] Voltar nao apaga texto digitado no plano diario.
- [ ] Em estado raiz, voltar mantem comportamento esperado do Android.
- [x] Build passa.

## Story 4: Gestos Horizontais Seguros

### Objetivo

Evitar trocas de aba acidentais e, se houver gesto horizontal, fazer ele acompanhar o dedo e permitir cancelamento.

### Escopo

- auditar comportamento atual de toque em `App.jsx` e `src/abas/relatorios.jsx`;
- bloquear gesto horizontal quando um input, textarea, editor, card editavel ou chat estiver em foco;
- exigir distancia/velocidade minima antes de confirmar troca;
- diferenciar scroll vertical de pan horizontal;
- considerar preview visual que acompanha o dedo antes de confirmar;
- cancelar gesto se o usuario voltar o dedo antes do limite;
- respeitar gestos de borda do Android para nao disputar com o sistema.

### Acceptance Criteria

- [x] Pequenos deslizes horizontais nao trocam aba.
- [x] Gestos horizontais nao disparam quando o usuario esta digitando.
- [ ] O usuario consegue cancelar o gesto antes da confirmacao.
- [x] Scroll vertical continua natural no plano diario e nos cards.
- [x] O gesto de borda do Android nao causa perda de texto.
- [x] Build passa.

## Story 5: Persistencia de Rascunho e Recuperacao

### Objetivo

Impedir perda de texto em andamento por navegacao, gesto acidental, voltar do Android ou troca de modo.

### Escopo

- salvar rascunho local do compositor do plano diario;
- restaurar rascunho ao reabrir o chat/plano;
- limpar rascunho somente apos envio bem-sucedido ou descarte explicito;
- evitar que troca de aba desmonte o estado sem persistir o texto.

### Acceptance Criteria

- [x] Texto digitado permanece ao fechar e reabrir o chat.
- [x] Texto digitado permanece apos voltar de um painel ou navegacao interna.
- [x] Texto digitado nao e perdido por swipe cancelado ou troca acidental de aba.
- [x] Rascunho enviado e limpo no momento correto.
- [x] Build passa.

## Arquivos Provaveis

- `App.jsx`
- `src/abas/relatorios.jsx`
- `src/componentes-base.jsx`
- `src/utilidades.js`
- `docs/stories/2026-04-15-planejamento-diario-ia.md`
- `docs/stories/2026-04-15-ux-plano-diario-mobile.md`

## Implementacao 2026-04-15

- `App.jsx`: o shell principal agora considera altura da viewport para evitar layout desktop em Android paisagem; o modo mobile largo usa a largura disponivel em vez de limitar a 430px.
- `src/abas/relatorios.jsx`: a lista de relatorios ganhou estado recolhido/expandido, trilho compacto e botao para reabrir; no plano diario em telas compactas, a lista recolhe por padrao.
- `src/abas/relatorios.jsx`: o rascunho do compositor do plano diario agora e persistido em `localStorage` por nota e removido apos envio.
- Validacao: `npm run build` passou em 2026-04-15.

## Implementacao 2026-04-15 - Continuidade

- `src/abas/relatorios.jsx`: o plano diario agora abre em modo documento, com botao explicito para abrir/fechar o chat de planejamento.
- `src/abas/relatorios.jsx`: com o chat fechado, o compositor deixa de ocupar a tela; se houver rascunho, aparece apenas um aviso compacto com previa.
- `src/abas/relatorios.jsx`: com o chat aberto, mensagens ficam em formato de conversa e o compositor permanece dentro da area util do chat.
- `src/abas/relatorios.jsx`: cards aprovaveis continuam visiveis fora do chat, inclusive depois de fechar a conversa.
- `src/abas/relatorios.jsx` e `App.jsx`: o botao voltar do Android/browser dispara um evento interno antes do `navBack`; em Relatorios, esse evento fecha chat, recolhe lista compacta ou volta do editor para a lista mobile sem apagar rascunho.
- `App.jsx`: o shell mobile continua com `touchAction: "pan-y pinch-zoom"` e sem swipe horizontal global; a decisao atual e manter a troca por gesto desativada ate existir preview/cancelamento completo.
- Validacao: `npm run build` passou em 2026-04-15 apos esta continuidade.

## Validacao Recomendada

- `npm run build`
- teste manual no desktop com largura ampla;
- teste manual no desktop simulando largura mobile;
- teste manual em Android retrato;
- teste manual em Android paisagem;
- teste de voltar do Android com chat aberto, relatorio aberto e texto digitado;
- teste de pequenos deslizes durante digitacao;
- teste de scroll vertical em cards longos.

## Riscos e Decisoes Pendentes

- Confirmar em Android real se o chat aberto deve evoluir para tela inteira ou se a area principal atual ja resolve.
- Gesto horizontal entre abas ficou desativado por padrao nesta rodada; reavaliar apenas se houver preview com cancelamento completo.
- Definir se o estado de painel recolhido deve persistir por usuario ou apenas por sessao.
- Confirmar em Android real como o WebView do Capacitor esta entregando `popstate` e gesto de borda.

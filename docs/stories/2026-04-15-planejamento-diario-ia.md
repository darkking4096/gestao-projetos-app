# Story: Planejamento Diario com IA

## Status

In Progress

## Contexto

O app ja possui:

- uma area de Relatorios que funciona como sistema de notas;
- uma area de Atividades separada por projetos, rotinas, tarefas e objetivos;
- um chat IA focado em sugestoes novas de atividades;
- notificacoes locais funcionando no app mobile;
- persistencia via Supabase usando `app_data`.

Hoje, o usuario ainda precisa transformar manualmente pensamentos soltos em atividades estruturadas. A nova frente transforma Relatorios em uma entrada pratica de planejamento diario: o usuario escreve um texto natural sobre o que pretende fazer, a IA interpreta esse texto com base no contexto real do app e devolve acoes aprovaveis.

O objetivo nao e gerar ideias livres. O objetivo e organizar o que o usuario disse, identificar relacao com atividades existentes, evitar duplicidade e criar tarefas, rotinas, projetos ou tarefas de projeto somente apos aprovacao.

## Objetivo

Entregar uma pipeline de planejamento diario que permita:

- abrir/criar automaticamente o plano do dia;
- escrever texto livre sobre o dia ou sobre atividades futuras;
- interpretar o texto com IA usando o historico recente e dados atuais;
- sugerir acoes concretas sem criar nada automaticamente;
- aprovar, editar ou recusar cada acao;
- exibir uma agenda unificada do dia;
- suportar atividades futuras quando o usuario mencionar datas futuras;
- preparar a base para transcricao por audio em etapa posterior.

## Principios do Produto

1. O texto do usuario e a fonte principal.
2. A IA deve extrair intencoes, nao inventar um plano fora do que foi dito.
3. A IA pode sugerir rotina/projeto novo por padrao percebido, mas isso deve vir separado como sugestao opcional.
4. Nada e criado sem aprovacao explicita do usuario.
5. Itens futuros devem ser criados com data futura e nao devem aparecer como pendencia de hoje.
6. Itens ja existentes devem ser reconhecidos para evitar duplicidade.
7. Quando houver baixa confianca, a interface deve deixar claro e permitir edicao.
8. O fluxo inicial sera somente texto. Audio fica para etapa posterior.

## Acceptance Criteria Gerais

- [x] Existe uma visao unificada "Hoje" ou "Agenda do Dia".
- [x] A agenda mostra tarefas avulsas, tarefas de projeto e rotinas devidas no dia.
- [x] A agenda ordena itens por data/hora, prioridade e tipo.
- [x] Relatorios possui um modo "Plano de Hoje" ou equivalente.
- [x] Ao abrir o fluxo diario, o app cria no maximo um plano por data.
- [x] Reabrir o app no mesmo dia abre o plano existente, sem duplicar.
- [x] O usuario consegue enviar texto livre para interpretacao.
- [x] A IA recebe contexto dos ultimos 7 dias e dados ativos atuais.
- [x] A IA recebe a hora local atual para nao sugerir horarios passados no plano de hoje.
- [x] A IA retorna JSON estruturado com acoes aprovaveis.
- [x] O app reconhece e exibe itens para hoje.
- [x] O app reconhece e exibe itens futuros.
- [x] O app reconhece possiveis duplicatas ou itens ja existentes.
- [x] O app permite aceitar, editar ou recusar cada acao.
- [x] Aceitar uma tarefa avulsa cria uma tarefa com prazo correto.
- [x] Aceitar uma tarefa de projeto adiciona a tarefa no projeto/fase correta ou exige confirmacao quando ambiguo.
- [x] Aceitar uma rotina cria rotina ou vincula a rotina existente conforme a acao proposta.
- [x] Aceitar um projeto cria projeto com dados iniciais consistentes.
- [x] O historico do plano registra texto original, resposta da IA e decisoes do usuario.
- [x] Dados antigos de relatorios continuam carregando.
- [ ] Dados antigos de projetos, rotinas e tarefas continuam carregando.
- [x] `npm run build` passa ao final de cada etapa implementada.

## Fora de Escopo Inicial

- Transcricao por audio.
- Criacao automatica sem aprovacao.
- Chat geral fora do planejamento.
- Notificacoes inteligentes novas baseadas em IA.
- Mudanca de backend para tabelas especificas antes de validar o fluxo com `app_data`.
- Introducao de TypeScript.
- Biblioteca nova de IA ou agente local.

## Pipeline Recomendada

1. Criar utilitarios puros para agenda do dia.
2. Criar a UI da agenda unificada sem IA.
3. Criar modelo de dados do plano diario em Relatorios.
4. Abrir/criar o plano diario automaticamente.
5. Criar chat de planejamento somente texto.
6. Criar construtor de contexto dos ultimos 7 dias.
7. Criar prompt e parser JSON do planejador.
8. Renderizar cards de acoes aprovaveis.
9. Implementar aceitar/editar/recusar.
10. Implementar criacao de tarefas futuras. `[feito]`
11. Implementar tarefas dentro de projeto existente.
12. Implementar rotina/projeto novo com aprovacao. `[feito]`
13. Registrar decisoes no plano diario.
14. Ajustar UX mobile. `[em andamento na story dedicada]`
15. Rodar build e atualizar esta story. `[feito em 2026-04-15 para a primeira rodada de UX mobile]`

## Modelo Conceitual

### Plano Diario

O plano diario pode ser salvo inicialmente dentro de `reportNotes`, sem exigir tabela nova.

Campos sugeridos:

```js
{
  id: "uid",
  title: "Plano do dia - 15/04/2026",
  content: "",
  folderId: null,
  kind: "daily-plan",
  planDate: "2026-04-15",
  messages: [],
  aiRuns: [],
  actionCards: [],
  createdItemRefs: [],
  createdAt: "2026-04-15",
  updatedAt: "2026-04-15"
}
```

### Mensagem do Plano

```js
{
  id: "uid",
  role: "user" | "assistant" | "system",
  content: "texto",
  createdAt: "2026-04-15T10:00:00.000Z"
}
```

### Acao Interpretada

```js
{
  id: "uid",
  status: "pending" | "accepted" | "rejected" | "edited",
  action: "create_task" | "create_project_task" | "create_routine" | "create_project" | "already_exists" | "suggest_routine" | "suggest_project",
  targetDate: "2026-04-15",
  targetTime: "07:00",
  name: "Participar da reuniao",
  description: "Reuniao mencionada pelo usuario.",
  category: "Trabalho",
  priority: "Alta",
  difficulty: 3,
  projectId: "",
  projectName: "",
  existingId: "",
  existingType: "",
  confidence: "alta" | "media" | "baixa",
  reason: "Por que a IA classificou assim.",
  originText: "trecho original do usuario",
  createdRef: null
}
```

## Contexto Enviado para IA

A IA deve receber um contexto compacto e estruturado:

- data atual em formato absoluto;
- timezone;
- texto original do usuario;
- projetos ativos;
- fases e tarefas pendentes dos projetos ativos;
- tarefas avulsas pendentes;
- rotinas ativas e se vencem hoje;
- objetivos ativos;
- atividades concluidas nos ultimos 7 dias;
- tarefas criadas nos ultimos 7 dias;
- rotinas completadas nos ultimos 7 dias;
- itens ja criados pelo plano de hoje;
- itens recusados no plano de hoje.

O contexto deve ser resumido para evitar prompt excessivo. Comecar com limites:

- ate 20 projetos ativos;
- ate 40 tarefas de projeto pendentes;
- ate 30 tarefas avulsas pendentes;
- ate 30 rotinas ativas;
- ate 30 eventos recentes do historico;
- todos os itens criados/recusados no plano atual.

## Regras de Interpretacao da IA

1. Retornar somente JSON puro.
2. Responder sempre em portugues brasileiro.
3. Nao usar emoji.
4. Nao criar atividades fora do que o usuario disse.
5. Se o usuario mencionar uma data relativa, devolver `targetDate` absoluto.
6. Se o usuario mencionar horario, devolver `targetTime`.
7. Se uma atividade for futura, manter `targetDate` futuro.
8. Se parecer redundante com item existente, usar `already_exists`.
9. Se o projeto existente for provavel, usar `create_project_task` com `projectId`.
10. Se o projeto for ambiguo, devolver baixa confianca e pedir confirmacao via card editavel.
11. Se a fala indicar uma recorrencia, usar `suggest_routine`, nao criar rotina direta.
12. Se a fala indicar um objetivo maior com varias etapas, usar `suggest_project`.
13. Se a fala indicar tarefa pontual, usar `create_task`.
14. Se o item ja esta marcado para hoje, nao duplicar.
15. Se o item ja existe mas esta marcado para data futura, informar como existente.

## Formato JSON Esperado

```json
{
  "tipo": "planejamento_diario",
  "resumo": "Organizei seu texto em acoes para hoje e para datas futuras.",
  "acoes": [
    {
      "action": "create_task",
      "name": "Participar da reuniao",
      "description": "Reuniao mencionada pelo usuario para hoje.",
      "targetDate": "2026-04-15",
      "targetTime": "07:00",
      "category": "Trabalho",
      "priority": "Alta",
      "difficulty": 3,
      "confidence": "alta",
      "reason": "O usuario disse que tem reuniao as 7.",
      "originText": "hoje tem reuniao as 7"
    }
  ]
}
```

## Story 1: Agenda Unificada do Dia

### Objetivo

Mostrar em uma unica visao tudo que o usuario precisa fazer no dia, sem exigir navegar por Projetos, Rotinas e Tarefas separadamente.

### Escopo

- criar funcao utilitaria para calcular itens do dia;
- incluir tarefas avulsas pendentes com prazo hoje ou vencidas;
- incluir tarefas de projeto pendentes com prazo hoje ou vencidas;
- incluir rotinas ativas que vencem hoje;
- incluir informacoes de horario quando existir;
- ordenar por horario, prazo, prioridade, dificuldade e tipo;
- exibir estado vazio claro;
- permitir concluir itens quando a operacao ja existir no app.

### Acceptance Criteria

- [x] Usuario acessa uma visao "Hoje" ou "Agenda".
- [x] Tarefas avulsas de hoje aparecem.
- [x] Tarefas vencidas aparecem com indicacao visual.
- [x] Tarefas de projeto de hoje aparecem com nome do projeto.
- [x] Rotinas devidas hoje aparecem.
- [x] Itens concluidos hoje nao aparecem como pendentes ou aparecem em secao separada.
- [x] Clicar em item navega para detalhe quando possivel.
- [x] Build passa.

### Arquivos Provaveis

- `src/utilidades.js`
- `src/abas/atividades.jsx`
- `App.jsx`

## Story 2: Plano Diario em Relatorios

### Objetivo

Transformar Relatorios em um ponto de entrada diario sem quebrar o sistema de notas existente.

### Escopo

- criar identificacao de nota diaria por `kind: "daily-plan"` e `planDate`;
- criar plano do dia somente se nao existir;
- abrir plano existente ao retornar no mesmo dia;
- manter notas comuns funcionando;
- permitir alternar entre notas e plano diario;
- registrar mensagens e acoes dentro da nota diaria.

### Acceptance Criteria

- [x] Abrir o fluxo diario cria no maximo um plano por data.
- [x] Reabrir no mesmo dia seleciona o plano existente.
- [x] Planos de dias anteriores permanecem acessiveis.
- [x] Notas comuns continuam editaveis.
- [x] Dados antigos sem `kind` continuam funcionando.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `App.jsx`
- `src/utilidades.js`

## Story 3: Chat de Planejamento Somente Texto

### Objetivo

Permitir que o usuario envie texto livre no plano diario e receba acoes interpretadas pela IA.

### Escopo

- criar interface de chat dentro do plano diario;
- usar chave Groq ja existente em `profile.groqApiKey`;
- criar prompt proprio para planejamento diario;
- criar parser JSON robusto;
- exibir erro amigavel quando chave nao estiver configurada;
- salvar texto enviado e resposta da IA no plano.

### Acceptance Criteria

- [x] Usuario consegue enviar texto livre.
- [x] Sem chave Groq, o app explica como configurar.
- [x] IA retorna JSON parseado.
- [x] Resposta invalida nao quebra a tela.
- [x] Mensagens ficam registradas no plano diario.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/abas/chat-ia.jsx`
- `src/planejamento-ia.js` ou arquivo equivalente
- `App.jsx`

### Implementado

- `ReportsTab` recebe `groqApiKey` a partir de `profile.groqApiKey`.
- Planos diarios exibem um chat de planejamento somente texto.
- O envio salva a mensagem do usuario em `messages` antes da chamada.
- A resposta da IA e salva em `messages`, `aiRuns` e, quando parseada, em `actionCards`.
- Respostas invalidas ou falhas de conexao geram mensagem amigavel e nao quebram a tela.
- `src/planejamento-ia.js` concentra prompt, chamada Groq e parser JSON robusto.

## Story 4: Contexto dos Ultimos 7 Dias

### Objetivo

Dar contexto suficiente para a IA entender projetos existentes, rotinas, tarefas, objetivos e padroes recentes.

### Escopo

- montar resumo dos projetos ativos;
- montar resumo de tarefas de projeto pendentes;
- montar resumo de tarefas avulsas pendentes;
- montar resumo de rotinas ativas e vencimento no dia;
- montar resumo de objetivos;
- montar resumo do historico dos ultimos 7 dias;
- incluir itens criados, aceitos e recusados no plano atual;
- limitar tamanho do contexto.

### Acceptance Criteria

- [x] Contexto inclui projetos ativos.
- [x] Contexto inclui tarefas pendentes de projetos.
- [x] Contexto inclui tarefas avulsas pendentes.
- [x] Contexto inclui rotinas ativas.
- [x] Contexto inclui objetivos.
- [x] Contexto inclui ultimos 7 dias.
- [x] Contexto inclui decisoes do plano diario atual.
- [x] Prompt nao inclui dados desnecessarios em excesso.
- [x] Build passa.

### Arquivos Provaveis

- `src/utilidades.js`
- `src/planejamento-ia.js`
- `src/abas/relatorios.jsx`

### Implementado

- `ReportsTab` recebe projetos, rotinas, tarefas, objetivos e perfil atuais.
- A chamada do planejador envia contexto estruturado do app junto do texto do usuario.
- `src/planejamento-ia.js` monta contexto compacto com limites para projetos ativos, tarefas de projeto pendentes, tarefas avulsas pendentes, rotinas ativas, objetivos ativos, historico dos ultimos 7 dias e decisoes ja registradas no plano.
- O historico recente inclui log diario, tarefas criadas/concluidas, tarefas de projeto criadas/concluidas e rotinas concluidas.
- As decisoes do plano atual separam cards pendentes, aceitos, editados, recusados e referencias criadas.

## Story 5: Cards de Acoes Aprovaveis

### Objetivo

Mostrar cada acao interpretada em um card claro, permitindo aceitar, editar ou recusar.

### Escopo

- criar cards por tipo de acao;
- separar itens "Para hoje", "Para o futuro", "Ja existe" e "Sugestoes opcionais";
- exibir confianca da IA;
- exibir trecho original que gerou a acao;
- permitir editar campos principais antes de aceitar;
- salvar estado do card no plano.

### Acceptance Criteria

- [x] Card mostra tipo da acao.
- [x] Card mostra nome, descricao, data, horario e destino.
- [x] Card mostra confianca quando media/baixa.
- [x] Card permite aceitar.
- [x] Card permite recusar.
- [x] Card permite editar antes de aceitar.
- [x] Estado do card persiste ao sair e voltar.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/componentes-base.jsx`
- `src/formularios.jsx`

### Implementado

- Os cards interpretados aparecem no plano diario, separados em "Para hoje", "Para o futuro", "Ja existe" e "Sugestoes opcionais".
- Cada card mostra tipo, status, nome, descricao, data, horario, destino, prioridade, dificuldade, confianca, motivo e trecho original quando disponiveis.
- Confianca media ou baixa aparece em destaque no cabecalho do card; confianca alta aparece nos metadados.
- O usuario pode editar campos principais antes de aceitar, incluindo nome, descricao, data, horario, dificuldade, prioridade, categoria, projeto, confianca, motivo e trecho original.
- Aceitar, recusar e salvar edicao persistem no `actionCards` do plano diario.
- Aceitar ainda nao cria tarefas, rotinas ou projetos; essa criacao fica reservada para as Stories 6, 7 e 8.

## Story 6: Criacao de Tarefas Avulsas Hoje e Futuras

### Objetivo

Criar tarefas avulsas a partir de cards aceitos, respeitando datas mencionadas pelo usuario.

### Escopo

- mapear `create_task` para estrutura atual de tarefa;
- preencher `deadline` com `targetDate`;
- preencher `deadlineTime` com `targetTime`, quando houver;
- preservar descricao, categoria, prioridade e dificuldade;
- marcar status como `Pendente`;
- registrar referencia criada no plano;
- nao criar duplicatas se o card ja foi aceito.

### Acceptance Criteria

- [x] Aceitar tarefa de hoje cria tarefa com prazo hoje.
- [x] Aceitar tarefa futura cria tarefa com prazo futuro.
- [x] Tarefa futura nao aparece como pendencia de hoje.
- [x] Tarefa de hoje aparece na agenda do dia.
- [x] Reabrir o plano mostra o card como aceito.
- [x] Aceitar duas vezes nao duplica.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `App.jsx`
- `src/utilidades.js`

### Implementado

- `ReportsTab` recebe um callback de criacao de tarefas planejadas sem navegar para outra aba.
- Aceitar card `create_task` cria uma tarefa avulsa com `deadline` a partir de `targetDate`, `deadlineTime` a partir de `targetTime`, `status: "Pendente"` e preserva nome, descricao, categoria, prioridade e dificuldade.
- A tarefa criada recebe `createdFromPlan` com `planId`, `cardId` e action para rastreabilidade.
- O card aceito registra `createdRef` e o plano registra `createdItemRefs`.
- Cards ja aceitos deixam de exibir a acao de aceite, e um guard em memoria evita duplo clique criando duplicata na mesma sessao.
- Tarefas futuras usam prazo futuro, portanto continuam fora da agenda de hoje pelo filtro atual de `getTodayAgendaItems`.

## Story 7: Tarefas Dentro de Projetos Existentes

### Objetivo

Permitir que a IA adicione tarefas a projetos existentes quando o texto do usuario fizer referencia a eles.

### Escopo

- mapear `create_project_task`;
- identificar projeto por `projectId` retornado pela IA;
- quando faltar fase, escolher uma fase padrao ou pedir confirmacao;
- preservar prazo, horario, prioridade, categoria, descricao e dificuldade;
- registrar referencia criada no plano;
- evitar duplicidade dentro do mesmo projeto.

### Acceptance Criteria

- [x] Card mostra o projeto destino.
- [x] Usuario pode trocar o projeto antes de aceitar.
- [x] Usuario pode escolher fase quando necessario.
- [x] Aceitar adiciona tarefa ao projeto correto.
- [x] Tarefa de projeto com prazo hoje aparece na agenda.
- [x] Tarefa de projeto futura aparece na data correta.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/abas/detalhes.jsx`
- `App.jsx`
- `src/utilidades.js`
- `src/planejamento-ia.js`

### Implementado

- `ReportsTab` trata card `create_project_task` criando tarefa dentro de `project.phases[].tasks` via callback dedicado.
- O card permite trocar o projeto antes do aceite e escolher a fase quando o projeto possui fases.
- Quando o projeto nao tem fases, a criacao cria uma fase padrao `Planejamento` para preservar a estrutura atual de projetos.
- A tarefa de projeto preserva nome, descricao, categoria, prioridade, dificuldade, prazo e horario.
- A tarefa criada recebe `createdFromPlan` com `planId`, `cardId` e action para rastreabilidade.
- O card aceito registra `createdRef` com `type: "projectTask"`, `projectId` e `phaseId`, e o plano registra em `createdItemRefs`.
- A criacao evita duplicidade no mesmo projeto para tarefas com mesmo nome, prazo e horario.
- Como `getTodayAgendaItems` ja le `project.phases[].tasks`, tarefas de projeto com prazo hoje entram na agenda e futuras permanecem fora ate a data correta.
- `src/planejamento-ia.js` passou a aceitar `phaseId` e `phaseName` no JSON do planejador.
- Validacao executada: `npm run build` passou apos a Story 7.

## Story 8: Rotinas e Projetos Sugeridos por Padrao

### Objetivo

Permitir que o planejador sugira rotina ou projeto quando o texto e o historico indicarem recorrencia ou iniciativa maior, sem criar automaticamente.

### Escopo

- mapear `suggest_routine`;
- mapear `suggest_project`;
- diferenciar sugestao opcional de tarefa direta;
- mostrar motivo baseado no texto/historico;
- permitir aceitar, editar ou recusar;
- se houver rotina/projeto parecido, sugerir usar existente em vez de duplicar.

### Acceptance Criteria

- [x] Sugestoes opcionais aparecem separadas dos itens extraidos diretamente.
- [x] Rotina sugerida nao e criada automaticamente.
- [x] Projeto sugerido nao e criado automaticamente.
- [x] Usuario pode editar antes de aceitar.
- [x] App evita criar rotina/projeto duplicado quando ha item semelhante.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/formularios.jsx`
- `App.jsx`
- `src/planejamento-ia.js`

### Implementado

- Cards `suggest_routine`, `create_routine`, `suggest_project` e `create_project` agora so criam itens apos aceite explicito.
- O aceite de rotina cria uma rotina ativa com dados iniciais consistentes, preservando nome, descricao, categoria, prioridade, dificuldade, horario sugerido e rastreabilidade em `createdFromPlan`.
- O aceite de projeto cria um projeto ativo com dados iniciais consistentes, preservando nome, descricao/objetivo, categoria, prioridade, prazo e rastreabilidade em `createdFromPlan`.
- Se ja existir rotina ou projeto com nome semelhante, o app registra a referencia existente no card em vez de criar duplicata.
- O card aceito registra `createdRef` e o plano registra em `createdItemRefs`, incluindo quando a referencia aponta para item existente.
- O prompt/parser do planejador aceita `frequency` e `frequencyDays` para sugestoes de rotina, mantendo compatibilidade quando esses campos nao vierem.
- O planejador agora recebe data/hora local atual e aplica uma trava local para ajustar ou remover horarios de hoje que ja passaram.
- O painel do plano recebeu limite de altura, rolagem interna e cards com enquadramento mais claro para evitar sensacao de sobreposicao.
- Validacao executada: `npm run build` passou apos a Story 8.

## Story 9: Reconhecimento de Itens Existentes

### Objetivo

Evitar duplicidade quando o usuario mencionar algo que ja existe no app.

### Escopo

- mapear `already_exists`;
- exibir item existente com origem e motivo;
- permitir abrir o item existente;
- permitir marcar rotina/tarefa como concluida quando aplicavel;
- permitir criar mesmo assim somente via acao explicita futura, se necessario.

### Acceptance Criteria

- [ ] Item existente nao cria duplicata.
- [ ] Card informa por que foi considerado existente.
- [ ] Usuario consegue abrir o item existente.
- [ ] Usuario consegue concluir quando for item de hoje e a operacao existir.
- [ ] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/abas/atividades.jsx`
- `App.jsx`

## Story 10: Preparacao para Audio

### Objetivo

Preparar e iniciar a entrada por audio sem criar uma pipeline paralela de planejamento.

### Escopo

- isolar funcao `handlePlannerText(text)`;
- garantir que texto digitado e texto transcrito usem a mesma pipeline;
- adicionar ponto de UI para microfone quando houver suporte do navegador;
- documentar opcoes futuras de transcricao;
- nao adicionar dependencia de audio nesta etapa;
- nao enviar audio bruto automaticamente.

### Acceptance Criteria

- [x] Pipeline de texto fica isolada e reutilizavel.
- [x] Texto transcrito entra no mesmo rascunho usado por `handlePlannerText(text)`.
- [x] O usuario revisa o texto antes de enviar.
- [x] Nao ha dependencia de audio na primeira entrega.
- [x] Story documenta opcoes para Web Speech API, plugin Capacitor ou API externa.
- [x] Build passa.

### Arquivos Provaveis

- `src/abas/relatorios.jsx`
- `src/planejamento-ia.js`
- `docs/stories/2026-04-15-planejamento-diario-ia.md`

### Nota de Produto

- O usuario quer evoluir o planejamento para entrada por audio, transcrevendo fala para texto e reutilizando a mesma funcao `handlePlannerText(text)`.
- A primeira opcao a avaliar e Web Speech API para navegador quando disponivel; no Android/Capacitor, avaliar plugin nativo de speech-to-text ou uma API externa de transcricao.
- A UI deve tratar audio como uma forma de preencher/enviar texto para o chat, sem criar uma pipeline separada de planejamento.

### Implementacao 2026-04-15 - Ditado Web Speech

- `src/abas/relatorios.jsx`: o chat do plano diario detecta `window.SpeechRecognition || window.webkitSpeechRecognition`.
- `src/abas/relatorios.jsx`: quando houver suporte, o compositor mostra um botao de microfone ao lado de `Enviar`.
- `src/abas/relatorios.jsx`: o ditado usa `pt-BR`, captura a transcricao e concatena o texto no rascunho local do plano.
- `src/abas/relatorios.jsx`: o texto transcrito nao e enviado automaticamente; o usuario revisa e envia pelo mesmo `handlePlannerText(text)`.
- `src/abas/relatorios.jsx`: erros de permissao ou suporte aparecem como aviso curto no chat.
- Nenhuma dependencia nova foi adicionada.

## Prompt Base Sugerido

```text
Voce e o interpretador de planejamento diario do app Coofe.

Seu trabalho e transformar o texto livre do usuario em acoes estruturadas para o app.

Regras:
- Responda somente JSON puro.
- Use portugues brasileiro.
- Nao use emoji.
- O texto do usuario e a fonte principal.
- Nao invente atividades fora do que foi dito.
- Pode sugerir rotina/projeto quando houver indicio claro no texto ou padrao no historico, mas marque como sugestao opcional.
- Se a atividade ja existe, retorne already_exists.
- Se o usuario mencionar data relativa, converta para data absoluta considerando a data atual e timezone informados.
- Se o usuario mencionar projeto existente, prefira create_project_task.
- Se houver ambiguidade, use confidence baixa e explique no reason.
- Nunca mande criar automaticamente. O app vai pedir aprovacao.

Retorne:
{
  "tipo": "planejamento_diario",
  "resumo": "...",
  "acoes": [...]
}
```

## Validacao

Ao final de cada story implementada:

- rodar `npm run build`;
- revisar `git status --short`;
- atualizar checklists desta story;
- atualizar File List;
- registrar riscos ou decisoes pendentes.

## File List

- `App.jsx`
- `src/abas/atividades.jsx`
- `src/abas/relatorios.jsx`
- `src/planejamento-ia.js`
- `src/utilidades.js`
- `docs/stories/2026-04-15-planejamento-diario-ia.md`

## Validacao Executada

- 2026-04-15: `npm run build` passou apos a Story 1.
- 2026-04-15: `npm run build` passou apos a Story 2.
- 2026-04-15: `npm run build` passou apos a Story 3.
- 2026-04-15: `npm run build` passou apos a Story 4.
- 2026-04-15: `npm run build` passou apos a Story 5.
- 2026-04-15: `npm run build` passou apos a Story 6.
- 2026-04-15: `npm run build` passou apos ajuste de hora local e UX do plano diario.

## Riscos e Decisoes Pendentes

- Definir se "Hoje" entra como subaba de Atividades ou bloco no Dashboard.
- Story 2 abriu o plano diario por acao explicita em Relatorios; decidir depois se deve abrir automaticamente ao iniciar o app.
- Definir como escolher fase padrao em projeto existente.
- Definir se tarefas futuras recebem notificacao automaticamente ou apenas prazo.
- Definir estrategia de transcricao por audio depois da primeira versao de texto.
- Avaliar se `reportNotes` continua suficiente ou se planos diarios merecem chave propria no `app_data`.
- UX mobile, chat recolhivel, paineis colapsaveis, voltar do Android e gestos seguros foram separados na story `docs/stories/2026-04-15-ux-plano-diario-mobile.md`.

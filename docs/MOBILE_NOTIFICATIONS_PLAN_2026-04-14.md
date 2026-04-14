# Plano Mobile e Notificacoes

Data: 2026-04-14

## Objetivo

Transformar o aplicativo em uma experiencia mobile publicavel na Google Play e na App Store, com notificacoes reais e configuraveis para tarefas, tarefas de projeto, rotinas, missoes e fechamento do dia.

O foco nao e apenas "baixar o app", mas fazer ele funcionar como um aplicativo normal de celular: instalado, com permissao de notificacao, lembretes confiaveis e configuracoes claras para o usuario.

## Decisao de Produto

O caminho sustentavel e preparar o app para publicacao nas lojas usando um empacotamento mobile real, mantendo a base atual React + Vite.

Publicar na Google Play ou App Store nao cria notificacoes automaticamente. A publicacao distribui o aplicativo. As notificacoes precisam ser implementadas dentro do app, com permissao do usuario e agendamento.

## Principios

- Notificacao deve ser opcional.
- Prazo e lembrete sao coisas diferentes.
- O usuario deve escolher quando quer ser avisado.
- O app nao deve mandar notificacoes em excesso.
- A primeira versao deve priorizar confianca: se o usuario marcou um lembrete, ele precisa chegar.
- A interface deve manter a consistencia visual atual.
- Dados antigos precisam continuar funcionando mesmo sem os novos campos.

## Conceitos

### Prazo

Prazo e a data ou data/hora limite de uma atividade.

Exemplo:

- tarefa vence em 2026-04-20 as 18:00
- missao vence hoje as 23:59

### Lembrete

Lembrete e a data/hora em que o usuario quer receber uma notificacao.

Exemplo:

- tarefa vence sexta, mas o usuario quer ser avisado quinta as 20:00
- rotina diaria deve avisar todo dia as 08:00

### Aviso de Vencimento

Aviso de vencimento e uma notificacao automatica baseada no prazo, com antecedencia configuravel.

Exemplo:

- tarefas: avisar 1 hora antes
- rotinas: avisar 30 minutos antes, se tiverem vencimento
- missoes: avisar 15 minutos antes

## Tipos de Notificacao

### Lembrete Manual de Tarefa

Disponivel para:

- tarefas isoladas
- tarefas dentro de projetos

Configuracao por tarefa:

- ativar lembrete
- dia do lembrete
- hora do lembrete

Exemplo de texto:

> Lembrete: revisar proposta do cliente

Este lembrete nao depende do prazo. Ele representa o momento em que o usuario quer ser lembrado de executar a tarefa.

### Aviso de Vencimento

Disponivel para:

- tarefas isoladas
- tarefas dentro de projetos
- rotinas com vencimento, se esse campo for adicionado
- missoes

Configuracao global:

- ligar/desligar por tipo
- antecedencia por tipo

Opcoes iniciais sugeridas:

- 15 minutos antes
- 30 minutos antes
- 1 hora antes
- 1 dia antes

### Lembrete de Rotina

A rotina usa a frequencia que ja existe no app:

- diaria
- semanal
- mensal
- livre
- personalizada

Configuracao por rotina:

- ativar notificacao
- horario do lembrete

Regras:

- rotina diaria avisa todo dia no horario escolhido
- rotina semanal avisa no dia da semana escolhido
- rotina personalizada avisa nos dias configurados
- rotina livre nao deve gerar notificacao automatica por padrao

### Nova Missao Disponivel

Notificacao opcional para avisar quando houver possibilidade de nova missao.

Configuracao:

- ativar/desativar
- horario preferido, se necessario

Exemplo:

> Nova missao disponivel para hoje

### Fechamento do Dia

Notificacao opcional para lembrar o usuario de revisar pendencias antes do fim do dia.

Objetivo:

- ajudar quem esqueceu de marcar algo como concluido
- lembrar que ainda existe tempo para finalizar atividades
- trazer o usuario de volta em um horario confortavel antes de dormir

Configuracao:

- ativar/desativar
- horario escolhido pelo usuario

Exemplo:

> Voce ainda tem 3 atividades pendentes hoje

Regras iniciais:

- so enviar se houver atividades pendentes relevantes
- respeitar horario escolhido pelo usuario
- nao enviar depois do horario silencioso
- enviar no maximo uma vez por dia

Atividades consideradas inicialmente:

- tarefas pendentes com prazo hoje
- tarefas de projeto pendentes com prazo hoje
- rotinas devidas no dia
- missoes disponiveis ou pendentes, quando esse fluxo estiver implementado

## Tela de Configuracoes

Adicionar uma area "Notificacoes" em configuracoes.

Campos sugeridos:

- ativar notificacoes do app
- horario silencioso
- lembretes de tarefas
- lembretes de rotinas
- avisos de vencimento
- nova missao disponivel
- fechamento do dia

Configuracoes de vencimento:

- tarefas: antecedencia
- rotinas: antecedencia
- missoes: antecedencia

Configuracao de fechamento do dia:

- ativar fechamento do dia
- horario do fechamento do dia

Valor padrao sugerido:

- fechamento do dia as 20:00

## Campos de Dados Sugeridos

### Tarefas

```js
{
  deadline: "2026-04-20",
  deadlineTime: "18:00",
  notificationEnabled: true,
  notificationDate: "2026-04-19",
  notificationTime: "20:00",
  deadlineWarningEnabled: true,
  notificationIds: []
}
```

### Rotinas

```js
{
  notificationEnabled: true,
  notificationTime: "08:00",
  deadline: "2026-04-30",
  deadlineTime: "23:59",
  deadlineWarningEnabled: false,
  notificationIds: []
}
```

### Perfil

```js
{
  notificationsEnabled: false,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  taskDeadlineWarningEnabled: true,
  taskDeadlineWarningBefore: "1h",
  routineDeadlineWarningEnabled: true,
  routineDeadlineWarningBefore: "30m",
  missionDeadlineWarningEnabled: true,
  missionDeadlineWarningBefore: "15m",
  newMissionNotificationEnabled: true,
  dayClosingNotificationEnabled: true,
  dayClosingNotificationTime: "20:00"
}
```

## Ordem Recomendada de Implementacao

1. Tornar tarefas de projeto editaveis com detalhes completos.
2. Adicionar prazo completo e lembrete opcional em tarefas.
3. Adicionar notificacao opcional em rotinas.
4. Adicionar configuracoes globais de notificacao.
5. Adicionar fechamento do dia.
6. Implementar notificacoes reais no app mobile.
7. Preparar empacotamento Android.
8. Preparar empacotamento iOS.
9. Publicar em teste interno.
10. Publicar nas lojas.

## Riscos e Decisoes Abertas

- iOS exige ambiente Apple, Xcode e conta Apple Developer.
- A App Store pode rejeitar aplicativos que parecam apenas um site embrulhado; a experiencia mobile precisa estar bem acabada.
- Notificacoes precisam ser testadas em dispositivo real.
- Tarefas de projeto precisam preservar compatibilidade com projetos existentes.
- O fluxo de missoes precisa ser revisado antes de notificar "nova missao disponivel".


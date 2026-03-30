# PRD — Gestão de Projetos Gamificado

**Versão:** 2.0
**Status:** Ativo / Em desenvolvimento contínuo

---

## 1. Visão do Produto

Um aplicativo pessoal de produtividade que transforma o gerenciamento de projetos e tarefas em uma experiência de RPG. O usuário acumula ENERGIA ⚡ ao concluir tarefas reais, sobe de Rank (F → MAX) e desbloqueia cosméticos — tornando a produtividade intrinsecamente motivante.

**Premissa central:** cada tarefa concluída é uma conquista real que se reflete visualmente no perfil do jogador.

---

## 2. Público-Alvo

- Pessoa individual (uso pessoal, não corporativo)
- Familiarizada com jogos RPG/competitivos (entende ranks, progressão)
- Quer ter controle sobre projetos pessoais e rotinas de forma engajante
- Usa smartphone ou computador para acompanhar tarefas

---

## 3. Funcionalidades Principais

### 3.1 Atividades

**Projetos** — atividade estruturada em fases e tarefas
- Fases com tarefas, cada tarefa com dificuldade 1–20
- Progresso calculado por tarefas concluídas
- Rank estimado com base na soma de ⚡ projetada
- Maestria: Bronze → Mestre conforme ⚡ acumulada no projeto
- Meta numérica opcional com histórico de valores

**Rotinas** — atividades recorrentes (diário, semanal, mensal, personalizado)
- Frequência configurável
- Streak próprio por rotina
- Recompensa de ENERGIA + moedas por conclusão

**Tarefas standalone** — tarefas avulsas sem projeto
- Dificuldade 1–20, categoria, prioridade
- Possibilidade de promover a projeto

**Objetivos** — metas de alto nível que agregam projetos/rotinas/tarefas
- Hierarquia: objetivo pai → sub-objetivos
- ENERGIA "espelhada" = soma das atividades vinculadas
- Rank estimado baseado na energia espelhada

### 3.2 Sistema de Gamificação

**ENERGIA ⚡** — moeda de progressão (antigo XP)
- Ganho ao concluir tarefas; escala por dificuldade (1⚡ a 100⚡)
- Multiplicada por streak e CULTIVO do rank

**PODER** — `floor(totalEnergia / 100)`
- Determina o rank atual

**Ranks** — F- até MAX (38 sub-ranks)
- Cada rank tem cor, CULTIVO% (bônus passivo) e frame visual único
- Exibido como emblema circular com decorações progressivas

**Moedas 🪙** — moeda de loja
- Ganhas ao concluir tarefas (não multiplicadas por streak/cultivo)
- Usadas na loja de cosméticos

**Streak 🔥** — dias consecutivos de atividade
- Multiplica ENERGIA (0.1x a 1.0x)
- Recuperável na loja por moedas

**CULTIVO%** — bônus passivo do rank atual
- Multiplica ENERGIA junto ao streak

**Maestria** — progressão por atividade individual
- Níveis: Bronze, Prata, Ouro, Platina, Diamante, Mestre

### 3.3 Loja de Cosméticos

- Ícones de perfil (avatares)
- Bordas de perfil (frames animados)
- Títulos (banners de nome)
- Temas visuais (paleta de cores do app)
- Consumíveis: escudos de streak, boosts de moedas

### 3.4 Social

- Sistema de amizades (@username)
- Ver perfil de amigos (PODER, streak, ⚡ total)
- Sincronização de perfil no Supabase

### 3.5 Dashboard

- Resumo do dia: ⚡ hoje, tarefas concluídas, streak
- Perfil com emblema de rank, título e borda equipados
- Barras de progresso de rank (EnergiaBarDupla)
- Próxima ação sugerida
- Missões diárias (10 missões rotativas)

### 3.6 Relatórios e Histórico

- Histórico de atividades concluídas com filtros
- Gráficos de ENERGIA por dia/semana/mês
- Estatísticas: tarefas, projetos, rotinas, objetivos

### 3.7 Painel Dev (oculto)

- Acessível via senha "darkking" na aba Configurações
- Edição direta de totalXp, moedas, streak, etc. para testes
- Atalhos de rank para pular direto para F-, S, MAX, etc.

---

## 4. Modelo de Dados (Principais campos)

### Profile
```
totalXp: number         // totalEnergia (nome legado no Supabase)
coins: number
streak: number
bestStreak: number
xpToday: number         // ENERGIA ganha hoje
coinsToday: number
bestXpDay: number
tasksCompleted: number
projectsCompleted: number
masteryGoldCount: number
hardTaskToday: boolean  // tarefa dificuldade B+ hoje
maxTaskToday: boolean   // tarefa MAX hoje
maxTaskEver: boolean
equippedIcon: string
equippedBorder: string
equippedTitle: string
equippedTheme: string
upgradeLevels: object   // { borderId: level, ... }
username: string
```

### Project
```
id, name, description, color, category, priority
status: "Ativo" | "Concluído" | "Arquivado"
phases: [{ id, name, tasks: [{ id, name, difficulty, status, notes }] }]
progress: number        // % calculado
xpAccum: number         // ENERGIA acumulada
objective: string       // objetivo textual livre
linkedObjectives: [{ id, relation }]
target, currentValue, unit, valueHistory: []
notes: []
```

### Routine
```
id, name, description, color, category, priority
difficulty: 1-20
freq: { type: "Diário"|"Semanal"|..., days: [], interval: number }
xpAccum: number
streak: number
lastDone: date
notes: []
```

### Task (standalone)
```
id, name, description, color, category, priority
difficulty: 1-20
status: "Pendente" | "Concluída"
dueDate: date
linkedObjectives: []
notes: []
```

### Objective
```
id, name, purpose, color, status
linkedActivities: [{ id, type: "project"|"routine"|"task" }]
linkedObjectives: [{ id, relation: "menor"|"maior" }]
notes: []
```

---

## 5. Fluxo Principal

```
Usuário conclui tarefa
  → earn(xp, coins, msg)
  → calcula finalXp com streak + cultivo
  → atualiza profile (totalXp, xpToday, coins, streak)
  → verifica rank up → exibe notificação de rank
  → exibe popup de recompensa
  → sincroniza Supabase (debounce 900ms)
```

---

## 6. Princípios de Design

- **Dark mode exclusivo** — app sempre escuro, paleta obsidiana
- **Sem modais de loading** — tudo responde imediatamente (otimista)
- **Inline styles** — sem dependências de CSS externas
- **Dados locais + sync** — state no React, persistência no Supabase
- **Retrocompatibilidade** — aliases para campos antigos (XP→ENERGIA, etc.)

---

## 7. Regras de Comportamento Automático

### Virada de dia
Executada na abertura do app quando a data mudou desde a última sessão: reset de `xpToday`/`coinsToday`, verificação de streak (ganho ou perda), geração de nova missão diária, desativação de rotinas com 5+ faltas consecutivas (exceto frequência "Livre"), auto-arquivamento de tarefas vencidas há 3+ dias.

### Tarefas (auto-arquivamento)
Tarefas com prazo vencido há 3+ dias são movidas automaticamente para a lixeira na virada de dia. Na lixeira, permanecem por 30 dias antes da remoção permanente.

### Rotinas (desativação automática)
Rotinas com frequência diferente de "Livre" são desativadas automaticamente após 5 dias consecutivos em que estavam devidas e não foram cumpridas. Podem ser reativadas manualmente. Rotinas com frequência "Livre" não acumulam streak, não aparecem como atrasadas no Dashboard e nunca são desativadas automaticamente.

### Projetos (conclusão)
A conclusão de projeto **nunca é automática** — sempre requer confirmação do usuário. O aviso de "pronto para concluir" aparece quando: todas as tarefas estão concluídas E a meta numérica foi atingida (se houver). A conclusão de projeto **não gera ENERGIA/moedas** — o XP vem exclusivamente das tarefas individuais.

### Fases (auto-conclusão)
Uma fase é concluída automaticamente quando 100% das suas tarefas estão concluídas. Pode ser reaberta a qualquer momento sem penalidade.

### Objetivos (XP espelhado)
O XP de um objetivo é **espelhado** — reflete a soma de XP de todas as atividades vinculadas. Se uma rotina está vinculada a 3 objetivos, cada objetivo mostra o XP integral dela. O XP real do personagem é calculado independentemente, sem duplicação.

### Lixeira
Itens na lixeira com 30+ dias são removidos permanentemente na virada de dia.

---

## 8. Roadmap Futuro (ideias)

- [ ] Notificações push para rotinas do dia e streak em risco
- [ ] Modo offline com localStorage como fallback (sync no retorno da conexão)
- [ ] IA para sugestão de "próxima ação" baseada em deadline, energia e histórico (campo `groqApiKey` já existe no perfil)
- [ ] Exportação de dados (JSON, CSV, PDF)
- [ ] App mobile (PWA aprimorado ou React Native)
- [ ] Integração com calendário
- [ ] Sistema de conquistas (achievements) expandido
- [ ] Perfil público visitável
- [ ] Histórico de ENERGIA por atividade ("linha do tempo de progresso")
- [ ] Atributos RPG integrados às categorias de atividade (ex: tarefas de "Saúde" aumentam "Vitalidade")
- [ ] Modo multiplayer / guilds

# Estrutura do Projeto Gestão de Projetos

Este diretório contém os módulos refatorados do aplicativo Gestão de Projetos, organizado de forma modular para melhor manutenibilidade e escalabilidade.

## Estrutura de Pastas

```
src/
├── constantes.js           # Constantes e dados estáticos (XP_TABLE, COIN_TABLE, BANDS, etc)
├── utilidades.js           # Funções utilitárias puras (uid, td, getLevelInfo, etc)
├── armazenamento.js        # Helpers de localStorage (S)
├── temas.js                # Sistema de temas com live binding de C
├── icones.jsx              # Componentes SVG de ícones (IconSVG, ConsumableSVG, etc)
├── componentes-base.jsx    # Componentes UI compartilhados (Btn, Card, Input, etc)
├── formularios.jsx         # Componentes de formulários (ProjectForm, RoutineForm, TaskForm, etc)
└── abas/
    ├── dashboard.jsx       # Aba Dashboard - visão geral e missões diárias
    ├── atividades.jsx      # Aba Atividades - gerenciamento de projetos, rotinas e tarefas
    ├── detalhes.jsx        # Componentes de detalhe (ProjectDetail, RoutineDetail, TaskDetail, ObjectiveDetail)
    ├── historico.jsx       # Aba Histórico - estatísticas e conquistas
    ├── loja.jsx            # Aba Loja - compra de itens e consumíveis
    └── configuracoes.jsx   # Aba Configurações - gerenciamento do perfil e temas
```

## Descrição dos Arquivos Principais

### constantes.js
Exporta todas as constantes do aplicativo:
- `XP_TABLE`, `COIN_TABLE`: Tabelas de experiência e moedas por dificuldade
- `BANDS`: Bandas de níveis (Despertar, Disciplina, etc)
- `MASTERY_LEVELS`: Níveis de maestria
- `CATEGORIES`, `PRIORITIES`, `FREQUENCIES`: Enumerações de opcões
- `MISSION_POOL`, `ACHIEVEMENTS`, `CHEST_TYPES`, `STREAK_MULT`: Definições de mecânicas de jogo

### utilidades.js
Funções puras e sem estado:
- `uid()`: Gerador de IDs únicos
- `td()`: Data no formato YYYY-MM-DD
- `getLevelInfo()`: Calcula nível e banda baseado em XP
- `getMastery()`: Retorna maestria baseado em XP
- `isRoutineDueToday()`: Verifica se rotina está ativa hoje
- `calcObjectiveXp()`: Calcula XP total de um objetivo
- `pickDailyMission()`: Seleciona missão diária (determinística por data)
- E muitas outras funções de cálculo...

### armazenamento.js
Exporta `S`, um objeto com métodos assíncronos para persistência:
- `S.get(key)`: Lê do localStorage
- `S.set(key, value)`: Escreve no localStorage

### temas.js
Sistema de temas com live binding:
- `THEMES`: Dicionário de temas pré-definidos (obsidiana, esmeralda, rubi, etc)
- `C`: Tema atual (live binding - pode ser lido de qualquer módulo)
- `setCurrentTheme(tema)`: Muda o tema atual
- `generateThemeTones()`: Gera tons de tema baseado em rarity e upgrade level

**Importante**: `C` usa live binding do ES6 - quando muda em um módulo, todos os outros veem a mudança imediatamente.

### icones.jsx
Componentes React para renderizar ícones SVG:
- `IconSVG({ id, size, color })`: Renderiza ícone padrão
- `ConsumableSVG({ id, size, color })`: Renderiza ícone de consumível
- `BorderSVG({ level, color, accentColor, size, children })`: Renderiza border/frame ornamental
- `TitleBanner({ level, color, accentColor, children })`: Renderiza banner de título
- `MaestriaSVG({ tier, size })`: Renderiza ícone de maestria
- `TitleSVG({ level, color, size })`: Renderiza ícone de título personalizado

### componentes-base.jsx
Componentes UI reutilizáveis:
- **Componentes visuais**: `Btn`, `Card`, `Badge`, `PBar`, `XpBar`, `Chk`, `TopBar`, `Modal`
- **Componentes de confirmação**: `ConfirmModal`, `DeleteModal`, `FilterModal`
- **Componentes de formulário**: `Field`, `Input`, `SelBtns`, `ColorPick`, `DiffPick`, `Toggle`, `SLabel`
- **Componentes especializados**: `NotesLog`, `FilterBtn`

### formularios.jsx
Componentes de formulários complexos:
- `ProjectForm`: Formulário para criar/editar projetos
- `RoutineForm`: Formulário para criar/editar rotinas
- `TaskForm`: Formulário para criar/editar tarefas
- `ObjectiveForm`: Formulário para criar/editar objetivos
- `ActivitySearchModal`: Modal para buscar e vincular atividades
- `ObjectiveSearchModal`: Modal para buscar e vincular objetivos

### Abas (src/abas/)

#### dashboard.jsx
Aba inicial com:
- Status do usuário (nível, XP, moedas)
- Missão diária com progresso
- Resumo de atividades
- Próximas ações recomendadas
- Widget de maestria

#### atividades.jsx
Gerenciador principal de atividades com:
- Abas para Projetos, Rotinas, Tarefas, Objetivos
- Filtros e busca
- Formulários para criação/edição
- Listas com ações em linha
- Suporte para exclusão e restauração

#### detalhes.jsx
Componentes de visualização/edição detalhada:
- `ProjectDetail`: Detalhe de projeto com fases e tarefas
- `RoutineDetail`: Detalhe de rotina com log de conclusão
- `TaskDetail`: Detalhe de tarefa com histórico
- `ObjectiveDetail`: Detalhe de objetivo com atividades vinculadas
- Gráficos de progresso para projetos numéricos

#### historico.jsx
Aba de histórico e estatísticas:
- Histórico de atividades completadas
- Estatísticas de streaks
- Sistema de conquistas desbloqueadas
- Recuperação de streaks com consumo de moedas

#### loja.jsx
Sistema de loja com:
- Temas para compra e equipamento
- Items de upgrade
- Abrir baús (com chances de shield/boost)
- Comprar consumíveis (escudos, boosts)

#### configuracoes.jsx
Aba de configurações com:
- Gerenciamento de perfil
- Seleção de tema
- Trash/lixeira para restauração de itens
- Exportação de dados
- Reset de progresso

## Fluxo de Dependências

```
App.jsx
├── temas.js ──────────────> (exporta C com live binding)
├── constantes.js
├── utilidades.js ──────────> usa constantes
├── armazenamento.js
├── abas/
│   ├── dashboard.jsx ───────> usa temas, utilidades, constantes
│   ├── atividades.jsx ───────> usa formularios, detalhes
│   ├── detalhes.jsx ────────> usa formularios
│   ├── historico.jsx
│   ├── loja.jsx
│   └── configuracoes.jsx
├── formularios.jsx ────────> usa componentes-base
└── componentes-base.jsx ──-> usa temas (C), icones

icones.jsx ──────────────────> usa temas (C), utilidades
```

## Como o Sistema de Temas Funciona

1. **Em temas.js**: `C` é uma variável module-level que começa com `THEMES.obsidiana`
2. **Em App.jsx**: No render, calcula o tema baseado no profile do usuário e chama `setCurrentTheme(computedTheme)`
3. **Em outros módulos**: Importam `C` de temas.js e usam diretamente
4. **Reatividade**: Quando App re-renderiza (devido a mudança de profile), chama setCurrentTheme antes de renderizar os filhos, então todos veem o novo C

## Padrões de Exportação

- **constantes.js**: Apenas exports nomeados (const, no default)
- **utilidades.js**: Apenas exports nomeados (functions)
- **armazenamento.js**: Apenas exports nomeados (const S)
- **temas.js**: Exports nomeados (THEMES, C, setCurrentTheme, generateThemeTones)
- **icones.jsx**: Apenas exports nomeados (componentes)
- **componentes-base.jsx**: Apenas exports nomeados (componentes)
- **formularios.jsx**: Apenas exports nomeados (componentes)
- **abas/*.jsx**: Cada arquivo exporta seu componente principal como `export default`
- **App.jsx**: Export default único (App root)

## Notas Importantes

1. **C é um live binding**: Não importar e armazenar em variável local - sempre ler C diretamente
2. **Componentes de formulário**: Usam `useState` para estado local durante edição
3. **Componentes de aba**: Recebem state e setters como props do App
4. **Sem circular imports**: A estrutura foi organizada para evitar dependências circulares
5. **CSS inline**: Todos os estilos usam `style={{...}}` sem arquivo CSS separado

## Arquivo Principal

O arquivo `App.jsx` (fora de src/) é o entry point da aplicação. Ele:
- Gerencia todo o estado global (profile, projects, routines, tasks, objectives)
- Calcula e atualiza o tema baseado no profile
- Renderiza a navegação de abas
- Passa handlers para cada aba (completeTask, earn, claimMission, etc)

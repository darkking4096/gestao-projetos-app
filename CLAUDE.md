# CLAUDE.md — Gestão de Projetos Gamificado

Instruções para agentes de IA trabalhando neste projeto. Leia antes de qualquer mudança.

---

## Visão Geral

Aplicativo web de **gestão de produtividade pessoal gamificado**, construído em React 18 + Vite, com backend Supabase e deploy no Vercel. O usuário gerencia projetos, rotinas e tarefas standalone, e é recompensado com um sistema de RPG (ENERGIA ⚡, PODER, Ranks F→MAX).

Repositório GitHub: `darkking4096/gestao-projetos-app` (branch `master`)
Deploy: Vercel (auto-deploy a cada push em `master`)
BD: Supabase (tabelas `app_data`, `user_profiles`, `friendships`)

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| UI | React 18 + JSX (sem TypeScript) |
| Build | Vite 5 |
| Backend/Auth | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel |
| CSS | Inline styles (sem Tailwind, sem CSS modules) |
| Estado | useState/useCallback — sem Redux |

**Não há TypeScript, não há rotas (React Router), não há testes automatizados.**
O app é uma SPA de arquivo único com navegação por estado interno (`nav(tab, section, view, id, type)`).

---

## Estrutura de Arquivos

```
/
├── App.jsx                  # Raiz: estado global, earn(), tabs, modais
├── main.jsx                 # Entry point React
├── index.html               # HTML base
├── vite.config.js           # Vite config
├── .env                     # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (nunca comitar)
├── src/
│   ├── constantes.js        # RANKS, ENERGIA_TABLE, COINS_TABLE, DIFF_CATEGORIES, MISSION_POOL...
│   ├── utilidades.js        # Funções puras: getPoderInfo, getRankInfo, getEnergia, earn helpers...
│   ├── temas.js             # Paleta de cores C.{bg, card, gold, tx, tx2, tx3, brd...}
│   ├── armazenamento.js     # Supabase: Auth, S.get/set/getAll, Social.*
│   ├── componentes-base.jsx # Btn, Card, Badge, PBar, TopBar, Modal, RankEmblemSVG, EnergiaBarDupla...
│   ├── icones.jsx           # IconSVG, BorderSVG, TitleBanner, SHOP_BORDERS, SHOP_TITLES...
│   ├── formularios.jsx      # ProjectForm, RoutineForm, TaskForm, ObjectiveForm, InlineDiffPick
│   ├── Login.jsx            # Tela de autenticação
│   └── abas/
│       ├── dashboard.jsx    # Tab inicial: perfil, barras, ações sugeridas, missões
│       ├── atividades.jsx   # Lista de projetos / rotinas / tarefas / objetivos
│       ├── detalhes.jsx     # Detalhe de projeto, rotina, tarefa, objetivo
│       ├── historico.jsx    # Histórico de atividades concluídas
│       ├── relatorios.jsx   # Relatórios e estatísticas
│       ├── loja.jsx         # Loja de cosméticos
│       ├── atributos.jsx    # Sistema de atributos RPG
│       └── configuracoes.jsx # Config de perfil, temas, amigos, painel dev
```

---

## Sistema de Gamificação

### ENERGIA ⚡ e PODER

- **ENERGIA** (antigo XP) = pontos ganhos ao concluir tarefas. Escala 1–20 por dificuldade (`ENERGIA_TABLE`).
- **PODER** = `Math.floor(totalEnergia / 100)`. Determina o rank atual.
- Campo no Supabase ainda se chama `totalXp` por retrocompatibilidade — **não renomear**.

```js
getPoderInfo(totalEnergia) // → { poder, totalEnergia, energiaInPoder, energiaForPoder: 100 }
getRankInfo(poder)          // → { rankMain, subRank, modifier, label, cultivo, color, colorSecondary, ... }
```

### Ranks (F- → MAX) — 38 sub-ranks

| Rank | PODER | Cultivo | Cor |
|---|---|---|---|
| F | 5–14 | 0% | #a0a0a0 |
| E | 15–49 | 70% | #5b9bd5 |
| D | 50–99 | 150% | #2ecc71 |
| C | 100–299 | 500% | #cd7f32 |
| B | 300–1499 | 1200% | #f0a500 |
| A | 1500–24999 | 5000% | #e74c3c |
| S | 25000–999999 | 100000% | #ff6b00 |
| MAX | 1000000+ | 10000% | #c0c0c0 |

Abaixo de PODER 5 → rank "Humano" (null).

### Bônus de ENERGIA

```
finalXp = xp * (1 + streakMult + cultivoPct)
finalCoins = coins  // ← moedas NÃO são multiplicadas por streak/cultivo
```

Exceção: boost ativo de baú adiciona +25% às moedas.

### CULTIVO%

Bônus passivo do rank atual (`rankInfo.cultivo / 100`). Multiplica ENERGIA, não moedas.

### Streak

`STREAK_MULT`: bônus de 0.1x (3 dias) a 1.0x (90 dias) na ENERGIA.

---

## Dificuldade de Tarefas

Escala 1–20. Agrupada em 8 categorias (`DIFF_CATEGORIES`):

| Cat | Dificuldade | ENERGIA |
|---|---|---|
| F | 1 | 1 |
| E | 2–4 | 3–7 |
| D | 5–7 | 10–15 |
| C | 8–10 | 18–24 |
| B | 11–13 | 28–34 |
| A | 14–16 | 42–44 |
| S | 17–19 | 50–70 |
| MAX | 20 | 100 |

Seletor de dificuldade: componente `InlineDiffPick` (formularios.jsx) — badge compacto + popup 8 categorias.

---

## Rank de Projetos e Objetivos

`getProjectRankEstimate(project)` e `getEnergyRankEstimate(totalEnergia)` em `utilidades.js`.

| ⚡ Total | Rank |
|---|---|
| < 10 | — (em desenvolvimento) |
| 10–19 | F- |
| 20–29 | F |
| 30–39 | F+ |
| 40–59 | E- |
| … | … |
| 800–999 | A+ |
| 1000–2999 | S- |
| 3000–4999 | S |
| 5000–9999 | S+ |
| ≥ 10000 | MAX |

---

## Componentes Chave

### `RankEmblemSVG` (componentes-base.jsx)

```jsx
<RankEmblemSVG
  rank="S"          // "F","E","D","C","B","A","S","MAX" ou null (Humano)
  modifier="-"      // "","−","−−","−−−","+","++","+++" — ou "" para não mostrar
  size={28}         // px
  color="#ff6b00"
  colorSecondary="#cc4400"
/>
```

Usa os frames SVG reais dos ranks (gerados por `_rankDeco`), tintados dinamicamente com a cor do rank.

### `EnergiaBarDupla` (componentes-base.jsx)

Barra dupla: sub-rank atual (primária) + progresso para próxima notificação (secundária).

```jsx
<EnergiaBarDupla poderInfo={_poderInfo} rankInfo={_rankInfo} />
```

### `InlineDiffPick` (formularios.jsx)

Seletor inline de dificuldade para tarefas dentro de fases de projeto.

```jsx
<InlineDiffPick value={task.difficulty} onChange={(val) => updateTask(val)} />
```

**Atenção**: o container pai NÃO pode ter `overflow: hidden` ou o popup será cortado.

---

## Bugs Conhecidos e Débitos Técnicos

### 🔴 Crítico

**Variável global mutável para temas (`temas.js`)** — `export let C = THEMES.obsidiana` é mutado diretamente via `setCurrentTheme(tema)`. React não detecta essa mudança. Funciona porque `setCurrentTheme` é chamado no render do App pai, mas é frágil. Solução correta: React Context para tema.

**`setCurrentTheme` no corpo do render (`App.jsx`)** — chamado diretamente fora de `useEffect`, executa a cada render. Em StrictMode (ativo em `main.jsx`) executa duas vezes, podendo causar cores inconsistentes em filhos que importam `C` diretamente.

**Proteção anti-ciclo em `calcObjectiveXp` (`utilidades.js`)** — a função é recursiva, mas sem Set de IDs visitados. Dados corrompidos com ciclo circular travam o browser. Solução: adicionar parâmetro `_visited = new Set()` com guard `if (_visited.has(id)) return 0`.

### 🟠 Alto

**Stale closure no reset diário (`App.jsx`)** — o `useEffect` de reset tem dependência `[loaded]`, capturando `tasks` do momento da montagem (array vazio). A funcionalidade de auto-arquivamento de tarefas vencidas há 3+ dias provavelmente não funciona por isso.

**Race condition em `earn()` (`App.jsx`)** — dentro do updater funcional de `setProfile`, variáveis externas (`popupXp`, `levelUpData`) são mutadas. Em StrictMode, o React executa updaters duas vezes, podendo sobrescrever com valores de estados diferentes. Popup pode mostrar XP incorreto e notificações de rank-up podem sumir.

**Carregamento sequencial (`App.jsx`)** — 9 chamadas `await S.get()` em sequência (~1800ms de latência total). Solução: `Promise.all` ou `S.getAll()` já implementado.

**`deleteObjective` com deleção permanente silenciosa** — quando o usuário escolhe "deletar tudo", projetos/rotinas/tarefas vinculados são removidos diretamente sem passar pela lixeira, contornando o sistema de recuperação.

### 🟡 Médio

**Swipe com variáveis globais em `window`** — `window._swipeX` e `window._swipeY` poluem o namespace global. Solução: usar `useRef`.

**Streak com gaps múltiplos** — o reset de streak executa uma única vez ao abrir o app. Se o usuário ficar ausente 15 dias, o streak só cai 5 (não 75). O reset não é executado uma vez por dia ausente.

**Mensagem de erro de storage enganosa** — o toast exibe "Verifique o armazenamento do dispositivo" quando o erro é na rede/Supabase.

---

## Painel Dev (DEV_PASSWORD = "darkking")

Disponível na aba Configurações. Clicar em "v2.0" no rodapé abre campo de senha. Senha correta → painel para editar todas as variáveis de perfil (totalXp, moedas, streak, etc.) e atalhos de rank para testes.

---

## Armazenamento (Supabase)

| Chave `app_data` | Conteúdo |
|---|---|
| `profile` | Todos os dados do perfil (totalXp, coins, streak, etc.) |
| `projects` | Array de projetos |
| `routines` | Array de rotinas |
| `tasks` | Array de tarefas standalone |
| `objectives` | Array de objetivos |

Escritas com debounce de 900ms. Auth por email/senha via Supabase Auth.

---

## Convenções de Código

- **Estilos**: 100% inline `style={{ ... }}`. Cores sempre via `C.{token}` (de `temas.js`).
- **IDs**: `uid()` de `utilidades.js` (baseado em Date.now + seq + random).
- **Datas**: formato `YYYY-MM-DD` via `td()`.
- **Sem imports de CSS**: zero arquivos `.css` — tudo inline.
- **Sem TypeScript**: `.jsx` e `.js` apenas.
- **Retrocompat**: aliases `getXp = getEnergia`, `getCoins = getMoedas`, `BANDS = []`.

---

## Como Rodar

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # gera /dist
```

`.env` obrigatório:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Deploy

Push em `master` → Vercel detecta e faz deploy automático.

```bash
git add .
git commit -m "feat: ..."
git push origin master
```

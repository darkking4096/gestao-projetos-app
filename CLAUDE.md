# CLAUDE.md — Gestão de Projetos Gamificado

Instruções para agentes de IA trabalhando neste projeto. Leia antes de qualquer mudança.

---

## TL;DR — Leia isso primeiro (contexto em 60 segundos)

**O que é:** SPA React 18 + Vite de gestão de tarefas gamificada com sistema RPG (ENERGIA, PODER, Ranks F→MAX). Backend Supabase, deploy Vercel, repo `darkking4096/gestao-projetos-app` (branch `master`).

**Regras de ouro (nunca violar):**
- ZERO emojis na interface — jamais, em nenhum elemento
- Cores SEMPRE via `C.{token}` de `temas.js` — nunca hex hardcoded
- Ícones SEMPRE SVG inline — nunca unicode, nunca libs de ícone externas
- Estilos SEMPRE inline `style={{...}}` — sem CSS files, sem Tailwind
- Sem TypeScript — só `.jsx` e `.js`
- Campo Supabase ainda se chama `totalXp` (não renomear — retrocompat)

**Arquivos-chave:**
- `App.jsx` → estado global, earn(), navegação por estado (`nav()`)
- `src/constantes.js` → RANKS, tabelas de ENERGIA/COINS
- `src/utilidades.js` → getPoderInfo(), getRankInfo(), earn helpers
- `src/temas.js` → paleta `C` (objeto de cores do tema atual)
- `src/armazenamento.js` → Supabase: Auth, S.get/set/getAll
- `src/componentes-base.jsx` → Btn, Card, Modal, RankEmblemSVG, EnergiaBarDupla
- `src/abas/` → uma aba por arquivo (dashboard, atividades, detalhes, loja, etc.)

**Gamificação em resumo:** ENERGIA = XP por tarefa (1–100 por dificuldade). PODER = floor(totalEnergia/100). Rank determinado por PODER (F- até MAX, 38 sub-ranks). finalXp = xp * (1 + streakMult + cultivoPct). Moedas NÃO são multiplicadas por streak/cultivo.

**Como commitar:** `git add . && git commit -m "feat/fix: ..." && git push origin master` → Vercel faz deploy automático.

**Estado atual relevante:** o app já usa `S.getAll()` no carregamento inicial, histórico foi regravado em UTF-8 limpo e as abas principais já estão em `lazy loading` com chunk splitting no Vite.

---

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
O app é uma SPA com navegação por estado interno (`nav(tab, section, view, id, type)`), ainda centralizada em `App.jsx`.

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
│       ├── configuracoes.jsx # Config de perfil, temas, amigos, painel dev (apenas modo dev)
│       └── chat-ia.jsx      # Assistente IA via Groq: sugestões de atividades (panel lateral/fullscreen)
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

**Variável global mutável para temas (`temas.js`)** — `export let C = THEMES.obsidiana` continua sendo mutado diretamente via `setCurrentTheme(tema)`. Ainda funciona, mas segue frágil. Solução correta: React Context para tema.

**Race condition potencial em `earn()` (`App.jsx`)** — a função já foi melhorada, mas continua concentrando muita responsabilidade de progressão, popup e rank-up.

### 🟠 Alto

**`App.jsx` continua grande e muito acoplado** — concentra estado global, sincronização, navegação, reward flow e montagem de telas.

**`configuracoes.jsx` ainda tem trechos com encoding inconsistente** — há texto visível com mojibake nessa tela.

**Painel dev removido de produção** — agora só renderiza em modo dev (`import.meta.env.DEV`). Em build de produção, o componente e a senha são eliminados pelo tree-shaking do Vite.

### 🟡 Médio

**Tema e design system ainda não são totalmente consistentes** — ainda há pontos com hardcodes e exceções visuais fora dos tokens.

**Ainda não há testes automatizados** — as regras de streak, recompensas, restore e sync continuam sem cobertura.

**Chunk principal ainda pode cair mais** — houve melhora relevante com `lazy loading` e `manualChunks`, mas o `index` principal continua relativamente grande.

---

## Painel Dev (DEV_PASSWORD = "333tesla")

Disponível **apenas em modo dev** (`npm run dev`) na aba Configurações. Clicar em "v2.0" no rodapé abre campo de senha. Senha correta → painel para editar todas as variáveis de perfil (totalXp, moedas, streak, etc.) e atalhos de rank para testes. **Em build de produção o painel não existe** (guard `import.meta.env.DEV`).

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

## Princípios de Design Visual

### Sem emojis — jamais

**Emojis são proibidos em toda a interface do app.** Isso inclui botões, títulos, mensagens do sistema, labels, placeholders, cards e qualquer outro elemento visível pelo usuário. O app tem estética minimalista e dark — emojis quebram completamente o padrão visual.

### Ícones: sempre SVG inline

Use únicamente SVG inline (`<svg>`) para representar ações e conceitos visuais. Referência de ícones existentes em `icones.jsx` (`IconSVG`, `BorderSVG`, `TitleSVG`, `ConsumableSVG`). Para novos ícones, use traço fino (strokeWidth 1.5–1.8), stroke=currentColor ou C.{token}, fill=none — estilo Lucide/Feather.

```jsx
// Correto
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>

// Errado
<span>✅</span>
<span>🔄</span>
```

### Cores: sempre via objeto `C` do tema

**Nunca use cores hexadecimais hardcoded** para elementos de interface. Toda cor deve vir de `C.{token}` importado de `temas.js`. O tema muda conforme configuração do usuário, então cores fixas criam inconsistências visuais graves.

| Uso | Token |
|---|---|
| Fundo principal | `C.bg` |
| Cards / superfícies | `C.card`, `C.card2` |
| Ação primária (dourado) | `C.gold` |
| Background de ação primária | `C.goldDim` |
| Borda de ação primária | `C.goldBrd` |
| Texto principal | `C.tx` |
| Texto secundário | `C.tx2`, `C.tx3`, `C.tx4` |
| Bordas | `C.brd`, `C.brd2` |
| Sucesso | `C.green` |
| Alerta | `C.orange` |
| Destaque roxo | `C.purple` |

### Botões flutuantes (FAB)

Botões de ação flutuante devem ser **circulares**, com ícone SVG centralizado, usando cores do tema:

```jsx
<div style={{
  position: "fixed", bottom: 28, right: 28, zIndex: 200,
  width: 46, height: 46, borderRadius: 23,
  background: C.goldDim, border: "1.5px solid " + C.goldBrd,
  boxShadow: "0 4px 16px " + C.gold + "30",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
}}>
  <svg ...stroke={C.gold}... />
</div>
```

### Consistência de tamanhos de texto

| Uso | fontSize |
|---|---|
| Label de seção / uppercase | 9–10px |
| Texto secundário / desc | 11px |
| Texto padrão | 12px |
| Título de card | 13px |
| Cabeçalho de tela | 14–15px |

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

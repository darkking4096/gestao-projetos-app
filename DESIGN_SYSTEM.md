# Design System — Gestão de Projetos Gamificado

---

## 1. Paleta de Cores

Todas as cores são acessadas via `C.{token}` importado de `src/temas.js`. O tema padrão é **Obsidiana** (dark).

| Token | Valor (Obsidiana) | Uso |
|---|---|---|
| `C.bg` | `#0d0d0d` | Fundo principal |
| `C.card` | `#1a1a1a` | Cards, inputs |
| `C.brd` | `#2a2a2a` | Bordas |
| `C.tx` | `#e8e8e8` | Texto primário |
| `C.tx2` | `#aaaaaa` | Texto secundário |
| `C.tx3` | `#666666` | Texto terciário/placeholder |
| `C.tx4` | `#444444` | Texto muito suave |
| `C.gold` | `#d4af37` | Accent principal (ouro) |
| `C.goldDim` | `#d4af3718` | Gold muito transparente |
| `C.goldBrd` | `#d4af3740` | Borda gold |
| `C.green` | `#2ecc71` | Sucesso |
| `C.red` | `#e74c3c` | Erro / perigo |
| `C.purple` | `#7b68ee` | Objetivos |

Múltiplos temas disponíveis: Obsidiana, Neon, Azul, Verde, etc. — selecionados na loja e aplicados globalmente.

---

## 2. Tipografia

- **Fonte**: system-ui / sans-serif (não há fonte customizada importada)
- **Escala de tamanhos** (em px, usados inline):

| Uso | Tamanho | Peso |
|---|---|---|
| Título de tela | 17–20 | 600–700 |
| Subtítulo | 14–15 | 600 |
| Corpo | 12–13 | 400 |
| Label/caption | 11 | 400–600 |
| Micro | 10 | 400 |
| Emblema de rank (letter) | 84 (dentro do SVG) | 900 |

---

## 3. Espaçamento

- **Padding de tela**: 14px
- **Gap entre elementos**: 4–12px
- **BorderRadius**:
  - Cards grandes: 12–14px
  - Botões / tags: 6–8px
  - Chips pequenos: 4–5px
  - Circular: 50%

---

## 4. Componentes

### Btn
```jsx
<Btn primary onClick={...}>Label</Btn>
<Btn small onClick={...}>Label</Btn>
<Btn danger onClick={...}>Label</Btn>
```
Variantes: `primary` (gold), `danger` (red), `small` (reduzido), sem prop = ghost.

### Card
```jsx
<Card style={{ marginBottom: 8 }}>conteúdo</Card>
```
Background `C.card`, borda `C.brd`, borderRadius 10px.

### Badge
```jsx
<Badge color={C.gold}>texto</Badge>
```
Pill pequena colorida.

### PBar (Progress Bar)
```jsx
<PBar pct={75} color={C.gold} />
```
Barra de progresso simples.

### TopBar
```jsx
<TopBar title="Título" onBack={handleBack} right={<BotoesAcao />} />
```
Cabeçalho de tela com botão voltar e área right.

### Modal / ConfirmModal / DeleteModal
```jsx
<Modal open={show} onClose={handleClose}>conteúdo</Modal>
<ConfirmModal title="..." msg="..." onConfirm={...} onCancel={...} />
<DeleteModal onTrash={...} onPerm={...} onCancel={...} />
```

### RankEmblemSVG
```jsx
<RankEmblemSVG
  rank="S"           // null = Humano (ícone pessoa)
  modifier="-"       // "" para não mostrar modificador
  size={28}
  color="#ff6b00"
  colorSecondary="#cc4400"
/>
```
Emblema circular com frame SVG real do rank, tintado com a cor do rank.

### EnergiaBarDupla
```jsx
<EnergiaBarDupla poderInfo={poderInfo} rankInfo={rankInfo} />
```
Barra dupla: progresso no sub-rank (primária) + progresso para próxima notificação (secundária).

### InlineDiffPick (formularios.jsx)
```jsx
<InlineDiffPick value={difficulty} onChange={setDifficulty} />
```
Badge compacto que abre popup com 8 categorias. **Atenção**: container pai não pode ter `overflow: hidden`.

---

## 5. Layout de Perfil (Dashboard + Config)

```
[BorderSVG+IconSVG] [RankEmblemSVG modifier=""] [coluna de texto]
```

- **BorderSVG**: 54px (dashboard) / 68px (config)
- **RankEmblemSVG**: 24px (dashboard) / 28px (config), **sem modificador** (modifier="")
- **Coluna de texto**:
  - Dashboard: TitleBanner com título equipado
  - Config: @username (topo) + TitleBanner (baixo)

O modificador de rank (-, +, etc.) é exibido nas barras de progresso abaixo, não no emblema do perfil.

---

## 6. Emblemas de Rank

Cada rank tem um frame SVG único com decorações progressivas:

| Rank | Decorações | Cor |
|---|---|---|
| Humano | Ícone pessoa (SVG simples) | #888888 |
| F | Apenas anel circular | #a0a0a0 |
| E | 2 diamantes (topo/base) | #5b9bd5 |
| D | Asas duplas topo + 2 diamantes | #2ecc71 |
| C | D + asas laterais na base | #cd7f32 |
| B | C (mais amplo) + esporas laterais | #f0a500 |
| A | B + mais pétalas + 4 esporas | #e74c3c |
| S | A + centro base + 6 esporas | #ff6b00 |
| MAX | S + anel externo + asas laterais | #c0c0c0 |

---

## 7. Cores dos Ranks

| Rank | Cor primária | Cor secundária |
|---|---|---|
| F | #a0a0a0 | #6a6a6a |
| E | #5b9bd5 | #2e6da4 |
| D | #2ecc71 | #1a7a44 |
| C | #cd7f32 | #8b5e1e |
| B | #f0a500 | #b07800 |
| A | #e74c3c | #9b2335 |
| S | #ff6b00 | #cc4400 |
| MAX | #c0c0c0 | #888888 |

---

## 8. Categorias de Dificuldade (`DIFF_CATEGORIES`)

| ID | Label | Dificuldades | Cor |
|---|---|---|---|
| F | Extremamente Fácil | 1 | #a0a0a0 |
| E | Muito Fácil | 2–4 | #5b9bd5 |
| D | Fácil | 5–7 | #2ecc71 |
| C | Médio | 8–10 | #cd7f32 |
| B | Difícil | 11–13 | #f0a500 |
| A | Muito Difícil | 14–16 | #e74c3c |
| S | Extremamente Difícil | 17–19 | #ff6b00 |
| MAX | IMPOSSÍVEL | 20 | #c0c0c0 |

---

## 9. Maestria

Progressão por atividade individual (projetos e rotinas):

| Nível | ⚡ Necessária | 🪙 Bônus |
|---|---|---|
| Bronze | 50 | 10 |
| Prata | 200 | 25 |
| Ouro | 500 | 50 |
| Platina | 1200 | 100 |
| Diamante | 2500 | 200 |
| Mestre | 5000 | 500 |

---

## 10. Princípios de UX

### Feedback Imediato
Toda ação dispara feedback visual instantâneo — popup de recompensa, animação de rank up, toast de confirmação. Nunca deixar o usuário em dúvida se a ação foi registrada.

### Progressão Visível
O progresso do usuário é sempre visível no header (barras de rank, emblem). A sensação de "subir de nível" deve ser frequente nos primeiros ranks, espaçando conforme avança.

### Dark Mode Exclusivo
O app é 100% dark. Cores vibrantes (gold, rank colors) se destacam no fundo escuro, criando contraste visual impactante.

### Hierarquia Clara
1. Perfil (quem sou) — emblema, rank, título
2. Progresso (onde estou) — barras de ENERGIA
3. Ações (o que fazer) — próximas tarefas, missões

### Cosméticos Não-P2W
Itens da loja são puramente estéticos. Progresso de rank não é acelerado por compras.

### Simplicidade nas Listas
Listas de projetos/rotinas/tarefas mostram o essencial (nome, progresso, rank). Detalhes só na tela de detalhe. Evitar info overload.

### Confirmação para Ações Destrutivas
Deletar item: modal com 2 opções (mover para lixeira vs. deletar permanentemente). Concluir projeto: modal de confirmação com celebração.

### Modificadores de Rank no Contexto Certo
- No **emblema do perfil**: apenas o símbolo do rank (sem modificador) — foco na identidade visual
- Na **barra de progresso**: label completo com modificador (S-, S, S+) — foco na progressão precisa

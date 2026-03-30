# 🎮 Design Doc — Reformulação do Sistema de Ranks
**Versão:** 2.0 — FINAL · Aprovado para implementação
**Status:** ✅ Todas as questões resolvidas

---

## 1. Visão Geral

Esta reformulação substitui completamente o sistema atual de Bandas (Despertar → Imortal) e Níveis (1–500) por um sistema de Ranks (F até MAX), com terminologia própria redesenhada. O objetivo é criar uma progressão que transmita **conquista real**, **crescimento de poder** e identidade de jogador da vida.

---

## 2. Renomeações Globais

| Termo Atual | Novo Termo | Sensação desejada |
|---|---|---|
| XP | **ENERGIA ⚡** | Conquista, combustível de evolução |
| Nível | **PODER** | Força, crescimento mensurável |
| +% de XP | **+% de CULTIVO** | Colheita do que foi plantado |
| Banda (Despertar, Disciplina...) | **Rank** (F, E, D...) | Classificação competitiva |
| "Humano Normal" *(estado inicial)* | **Humano** | Sem rank ainda |

> **Uso do SVG ⚡:** Sempre que o valor de ENERGIA for exibido na UI, usar o ícone SVG de energia ao lado do número (ex: `⚡ 350`). Substituir todas as ocorrências de "XP" nos textos da interface.

> **Importante:** O sistema de **Maestria** (Bronze, Prata, Ouro, Platina, Diamante, Mestre) por atividade **permanece inalterado** como sistema paralelo.

---

## 3. Sistema de Ranks e Sub-Ranks

### 3.1 Tabela Completa de Ranks

| Rank Principal | Sub-Ranks | Total Sub-Ranks | Range de PODER |
|---|---|---|---|
| *Humano* | — | — | 0 – 4 |
| **F** | F- · F · F+ | 3 | 5 – 14 |
| **E** | E- · E · E+ | 3 | 15 – 49 |
| **D** | D-- · D- · D · D+ · D++ | 5 | 50 – 99 |
| **C** | C-- · C- · C · C+ · C++ | 5 | 100 – 299 |
| **B** | B--- · B-- · B- · B · B+ · B++ · B+++ | 7 | 300 – 1.499 |
| **A** | A--- · A-- · A- · A · A+ · A++ · A+++ | 7 | 1.500 – 24.999 |
| **S** | S--- · S-- · S- · S · S+ · S++ · S+++ | 7 | 25.000 – 999.999 |
| **MAX** | MAX | 1 | 1.000.000 – ∞ |

**Total de emblemas distintos:** 38 sub-ranks + estado Humano = **39 estados visuais**

### 3.2 O Humano e o Primeiro Rank

- O jogador começa no PODER 0 como **"Humano"** — sem emblema de rank.
- Entre PODER 0 e 4, ele está no estado Humano.
- Ao atingir **PODER 5**, entra no rank **F-** e recebe **notificação especial de novo Rank** com a mensagem:

> *"Parabéns, Você começou a Jogar o Jogo de VERDADE (o da Vida). Conclua mais tarefas para alcançar novos patamares."*

---

## 4. Distribuição de PODER por Sub-Rank (Divisão Igual)

Divisão feita igualmente, excedente distribuído para os sub-ranks finais. Todos os valores foram verificados matematicamente.

### Rank F — PODER 5 a 14 (10 níveis · 3 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| F- | 5 – 7 | 3 |
| F  | 8 – 10 | 3 |
| F+ | 11 – 14 | 4 |

### Rank E — PODER 15 a 49 (35 níveis · 3 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| E- | 15 – 25 | 11 |
| E  | 26 – 37 | 12 |
| E+ | 38 – 49 | 12 |

### Rank D — PODER 50 a 99 (50 níveis · 5 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| D-- | 50 – 59 | 10 |
| D-  | 60 – 69 | 10 |
| D   | 70 – 79 | 10 |
| D+  | 80 – 89 | 10 |
| D++ | 90 – 99 | 10 |

### Rank C — PODER 100 a 299 (200 níveis · 5 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| C-- | 100 – 139 | 40 |
| C-  | 140 – 179 | 40 |
| C   | 180 – 219 | 40 |
| C+  | 220 – 259 | 40 |
| C++ | 260 – 299 | 40 |

### Rank B — PODER 300 a 1.499 (1.200 níveis · 7 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| B--- | 300 – 470 | 171 |
| B--  | 471 – 641 | 171 |
| B-   | 642 – 812 | 171 |
| B    | 813 – 983 | 171 |
| B+   | 984 – 1.155 | 172 |
| B++  | 1.156 – 1.327 | 172 |
| B+++ | 1.328 – 1.499 | 172 |

### Rank A — PODER 1.500 a 24.999 (23.500 níveis · 7 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| A--- | 1.500 – 4.856 | 3.357 |
| A--  | 4.857 – 8.213 | 3.357 |
| A-   | 8.214 – 11.570 | 3.357 |
| A    | 11.571 – 14.927 | 3.357 |
| A+   | 14.928 – 18.284 | 3.357 |
| A++  | 18.285 – 21.641 | 3.357 |
| A+++ | 21.642 – 24.999 | 3.358 |

### Rank S — PODER 25.000 a 999.999 (975.000 níveis · 7 sub-ranks)
| Sub-Rank | Range de PODER | Qtd. |
|---|---|---|
| S--- | 25.000 – 164.284 | 139.285 |
| S--  | 164.285 – 303.569 | 139.285 |
| S-   | 303.570 – 442.855 | 139.286 |
| S    | 442.856 – 582.141 | 139.286 |
| S+   | 582.142 – 721.427 | 139.286 |
| S++  | 721.428 – 860.713 | 139.286 |
| S+++ | 860.714 – 999.999 | 139.286 |

### Rank MAX — PODER 1.000.000+ (infinito)
| Sub-Rank | Range de PODER |
|---|---|
| MAX | 1.000.000 – ∞ |

---

## 5. Bônus de CULTIVO por Rank

O bônus de CULTIVO é somado ao bônus de Streak e aplicado multiplicativamente sobre a ENERGIA base da atividade.

**Fórmula:** `ENERGIA final = ENERGIA base × (1 + CULTIVO% + Streak%)`

**Exemplo:** Rank C (500% CULTIVO) + Streak 60% → multiplicador = 1 + 5,00 + 0,60 = **6,6×**. Tarefa de 15 ⚡ base = 99 ⚡.

| Rank | Bônus de CULTIVO | Multiplicador (sem streak) |
|---|---|---|
| Humano / F | +0% | 1,0× |
| E | +70% | 1,7× |
| D | +150% | 2,5× |
| C | +500% | 6,0× |
| B | +1.200% | 13,0× |
| A | +5.000% | 51,0× |
| S | +100.000% | 1.001× |
| MAX | +10.000% | 101× |

> **Nota:** O CULTIVO do MAX (101×) é menor que o S (1.001×) intencionalmente — o jogador MAX já não precisa do bônus para a progressão, que é infinita por definição.

---

## 6. ENERGIA por Nível de PODER

**Regra fixa:** todo nível de PODER custa **100 ENERGIA base** (antes do CULTIVO).

A dificuldade de progressão vem do **volume de PODER** dentro de cada rank, não do custo por nível. O CULTIVO massivo dos ranks altos é compensado pela quantidade absurda de PODER levels.

**Exemplo de progressão real:**
- Rank F (0% CULTIVO): tarefa D+ (15 ⚡ base) = 15 ⚡ → 0,15 PODER por tarefa
- Rank S (+100.000% CULTIVO): mesma tarefa = 15 × 1001 = 15.015 ⚡ → ~150 PODER por tarefa. Com 975.000 PODERs no rank S, seriam ~6.500 tarefas para percorrer o rank inteiro — ainda muito trabalho.

---

## 7. Sistema de Notificações

### Notificação de PODER (regular)

É a **mesma notificação que existe hoje** (quando o jogador sobe de nível), mas **exibida apenas a cada N níveis de PODER** conforme o rank. Ao invés de aparecer a cada nível, aparece no intervalo do rank atual.

O texto da notificação de PODER precisa ser atualizado para o novo formato: `"Seu PODER aumentou para X!"` em vez de `"Você subiu para o nível X!"`.

| Rank | Notificação a cada N PODER |
|---|---|
| F | 1 |
| E | 2 |
| D | 3 |
| C | 5 |
| B | 12 |
| A | 50 |
| S | 1.000 |
| MAX | 10.000 |

### Notificação de Rank (especial)

Quando o jogador **entra em um novo Rank principal** (ex: sai do F e entra no E, ou sai do D e entra no C), exibe uma **notificação especial** distinta, com visual mais elaborado.

> Sub-rank changes (ex: F- → F, ou D → D+) usam a notificação regular de PODER, não a especial.

---

## 8. Sistema de Dificuldades Reformulado (1 → 20)

A escolha é feita em **duas etapas**:

**Etapa 1:** Usuário escolhe a categoria (ex: "Fácil").
**Etapa 2:** Usuário afina a variação (ex: D-, D ou D+).

Categorias **F** e **MAX** selecionam direto (sem variação).

### Tabela Completa

| Nível interno | Sub-Rank | Categoria | ENERGIA base |
|---|---|---|---|
| 1 | F | Extremamente Fácil | 1 ⚡ |
| 2 | E- | Muito Fácil | 3 ⚡ |
| 3 | E | Muito Fácil | 5 ⚡ |
| 4 | E+ | Muito Fácil | 7 ⚡ |
| 5 | D- | Fácil | 10 ⚡ |
| 6 | D | Fácil | 12 ⚡ |
| 7 | D+ | Fácil | 15 ⚡ |
| 8 | C- | Médio | 18 ⚡ |
| 9 | C | Médio | 21 ⚡ |
| 10 | C+ | Médio | 24 ⚡ |
| 11 | B- | Difícil | 28 ⚡ |
| 12 | B | Difícil | 31 ⚡ |
| 13 | B+ | Difícil | 34 ⚡ |
| 14 | A- | Muito Difícil | 38 ⚡ |
| 15 | A | Muito Difícil | 42 ⚡ |
| 16 | A+ | Muito Difícil | 44 ⚡ |
| 17 | S- | Extremamente Difícil | 50 ⚡ |
| 18 | S | Extremamente Difícil | 60 ⚡ |
| 19 | S+ | Extremamente Difícil | 70 ⚡ |
| 20 | MAX | IMPOSSÍVEL | 100 ⚡ |

---

## 9. Barra de Progresso Dupla

O componente `XpBar` é expandido para **duas barras**:

### Barra Primária — Progresso de Sub-Rank
- Mostra quanto falta de ENERGIA para passar para o próximo sub-rank.
- **Texto exemplo:** `"Rank D- → D"` com porcentagem.

### Barra Secundária — Progresso até próxima Notificação de PODER
- Mostra quanto falta para a próxima notificação de PODER (próximo múltiplo de N do rank atual).
- **Texto exemplo:** `"Próximo PODER ⚡ em 47 ENERGIA"`

---

## 10. Emblemas por Rank — Especificação Visual

**38 emblemas distintos** implementados como um único componente SVG `RankEmblemSVG` parametrizado.

```jsx
<RankEmblemSVG
  rank="D"       // F, E, D, C, B, A, S, MAX, ou null (Humano)
  modifier="-"   // "---", "--", "-", "", "+", "++", "+++"
  size={32}
/>
```

### Paleta de Cores por Rank (final)

| Rank | Cor Principal | Cor Secundária | Sensação |
|---|---|---|---|
| Humano | `#888888` | `#555555` | Cinza neutro |
| F | `#a0a0a0` | `#6a6a6a` | Prata apagada — iniciante |
| E | `#5b9bd5` | `#2e6da4` | Azul — despertar |
| D | `#2ecc71` | `#1a7a44` | Verde — crescimento |
| C | `#cd7f32` | `#8b5e1e` | Bronze — competência |
| B | `#f0a500` | `#b07800` | Âmbar/ouro — determinação |
| A | `#e74c3c` | `#9b2335` | Vermelho — poder real |
| S | `#ff6b00` | `#cc4400` | Laranja fogo — lendário |
| MAX | gradiente cromático (arco-íris) | — | Além do comum |

### Lógica visual dos modificadores

- **`---` / `--` / `-`** → emblema mais simples, fundo menos saturado, bordas finas
- **base** → emblema completo, cor cheia
- **`+` / `++` / `+++`** → glow, brilho, detalhes extras (estrelas, raios, traços adicionais)

---

## 11. Posicionamento dos Emblemas na UI

Os emblemas substituem os textos de **Banda** (Despertar, Disciplina, etc.) que aparecem:
- Acima do título equipado no Dashboard
- À direita da borda + ícone de perfil

Os **títulos comprados na Loja** permanecem inalterados.

**Layout proposto no Dashboard:**
```
[RankEmblemSVG]   Nome do Jogador
                  "Título da loja equipado"
[bordas + foto]   ⚡ PODER: 73  (D-)
```

O número do PODER substitui o `levelInfo.level` exibido na bolinha da borda de perfil.

---

## 12. Sistemas Impactados

| Sistema / Arquivo | O que muda | Prioridade |
|---|---|---|
| `constantes.js` — `BANDS`, `XP_TABLE` | Substituição completa por `RANKS` e `ENERGIA_TABLE` | 🔴 Alta |
| `utilidades.js` — `getLevelInfo`, `getXp` | Reescrita: `getPoderInfo(totalEnergia)`, `getRankInfo(poder)`, `getEnergia(diff)` | 🔴 Alta |
| `componentes-base.jsx` | Criar `RankEmblemSVG`, reformular `XpBar` → barra dupla, SVG ⚡ | 🔴 Alta |
| `dashboard.jsx` — barra de XP, nível, banda | Usar novo `getPoderInfo`, exibir PODER + sub-rank + barra dupla | 🔴 Alta |
| `formularios.jsx` — slider dificuldade 1-10 | Substituir por seletor 2 etapas: categoria → variação (1-20) | 🔴 Alta |
| `atividades.jsx` — textos "+X XP", "Dificuldade X" | Renomear e adaptar para nova escala | 🟡 Média |
| `constantes.js` — `MISSION_POOL` | Atualizar textos que mencionam "XP" | 🟡 Média |
| `utilidades.js` — `ACHIEVEMENTS` | Atualizar limiares e textos de "XP/Nível" para "ENERGIA/PODER" | 🟡 Média |
| `constantes.js` — `CHEST_TYPES` (`unlockLv`) | Adaptar `unlockLv` para PODER equivalente | 🟡 Média |
| `armazenamento.js` — campos `totalXp`, `xpToday` | Renomear + executar migração na abertura do app | 🟡 Média |
| Todos os arquivos — textos da UI | Busca global: "XP" → "ENERGIA ⚡", "Nível" → "PODER", "+% XP" → "+% CULTIVO" | 🟢 Baixa |

> **Maestria** (Bronze → Mestre por atividade): **permanece sem alterações**.

---

## 13. Migração de Dados

### Dificuldades de atividades (1-10 → 1-20)

Mapear pelo valor de ENERGIA equivalente — encontrar a nova dificuldade que dá o mesmo valor de ENERGIA que o XP antigo:

| Dif. antiga | XP antigo | Nova dif. | ENERGIA nova | Equivalência |
|---|---|---|---|---|
| 1 | 3 | 2 (E-) | 3 ⚡ | ✓ Exato |
| 2 | 5 | 3 (E) | 5 ⚡ | ✓ Exato |
| 3 | 8 | 4 (E+) | 7 ⚡ | ~ Mais próximo |
| 4 | 12 | 6 (D) | 12 ⚡ | ✓ Exato |
| 5 | 18 | 8 (C-) | 18 ⚡ | ✓ Exato |
| 6 | 25 | 11 (B-) | 28 ⚡ | ~ Mais próximo |
| 7 | 35 | 13 (B+) | 34 ⚡ | ~ Mais próximo |
| 8 | 50 | 17 (S-) | 50 ⚡ | ✓ Exato |
| 9 | 70 | 19 (S+) | 70 ⚡ | ✓ Exato |
| 10 | 100 | 20 (MAX) | 100 ⚡ | ✓ Exato |

### ENERGIA acumulada (totalXp → totalEnergia)

O `totalXp` existente no perfil pode ser mantido como `totalEnergia` diretamente, já que os novos valores de ENERGIA por tarefa são na mesma ordem de grandeza (1-100). A diferença de escala é pequena e não causa distorção significativa na progressão.

Para `xpAccum` de projetos e rotinas: idem — manter valor como `energiaAccum`.

---

## 14. Plano de Implementação

**Fase 1 — Núcleo (dados e lógica)**
1. `constantes.js`: criar `ENERGIA_TABLE` (1-20), criar `RANKS` com sub-ranks, ranges e bônus de CULTIVO; remover `BANDS`, `XP_TABLE`
2. `utilidades.js`: reescrever `getLevelInfo` → `getPoderInfo(totalEnergia)` e criar `getRankInfo(poder)`, atualizar `getXp` → `getEnergia(diff)`
3. `armazenamento.js`: script de migração — renomear campos e remapear dificuldades

**Fase 2 — Componentes visuais**
4. `icones.jsx`: criar `RankEmblemSVG` (parametrizado por rank + modifier)
5. `icones.jsx`: criar/verificar SVG ⚡ de ENERGIA
6. `componentes-base.jsx`: reformular `XpBar` → `EnergiaBarDupla` (primária + secundária)

**Fase 3 — Interface**
7. `dashboard.jsx`: emblema, PODER, barras duplas, notificação especial de rank, textos
8. `formularios.jsx`: seletor de dificuldade em 2 etapas
9. `atividades.jsx`: textos e exibição adaptados

**Fase 4 — Ajustes finais**
10. `constantes.js` `MISSION_POOL` + `utilidades.js` `ACHIEVEMENTS`: atualizar textos e limiares
11. `CHEST_TYPES`: adaptar `unlockLv` para valores de PODER
12. Busca global de textos: "XP" → "ENERGIA ⚡", "Nível" → "PODER", "+% XP" → "+% CULTIVO"

---

*Documento finalizado em 28/03/2026 — Pronto para implementação.*

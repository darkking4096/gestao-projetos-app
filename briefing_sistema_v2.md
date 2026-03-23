# SISTEMA DE ATIVIDADES GAMIFICADO

### Briefing Técnico e Funcional — Versão 2.0 | Março 2026

---

## 1. Visão Geral do Sistema

O Sistema de Atividades Gamificado é uma aplicação mobile-first projetada para transformar a gestão de metas pessoais e profissionais em uma experiência envolvente e motivadora. O sistema utiliza mecânicas de jogos — XP, níveis, streaks, moedas, conquistas e loja de cosméticos — para incentivar consistência e progresso real.

A aplicação é construída em React (JSX) como um componente único e autossuficiente, com persistência local via storage assíncrono. Não requer backend — toda a lógica roda no dispositivo do usuário.

### 1.1 Proposta de Valor

- Transformar tarefas e rotinas em um sistema de progressão com recompensas tangíveis
- Oferecer visão hierárquica: Objetivos agrupam Projetos, Rotinas e Tarefas
- Manter o usuário engajado via streaks, missões diárias, baús e conquistas
- Permitir personalização visual completa (temas, ícones, títulos, bordas)

### 1.2 Público-Alvo

Pessoas que buscam organização pessoal/profissional e se motivam por sistemas de recompensa e progressão. Especialmente eficaz para profissionais autônomos, estudantes e empreendedores que gerenciam múltiplos projetos simultaneamente.

---

## 2. Arquitetura de Entidades

O sistema opera com 4 entidades principais organizadas em uma hierarquia flexível:

| Entidade | Função | Descrição |
|----------|--------|-----------|
| **Objetivo** | Visão estratégica | Agrupa atividades sob um propósito maior. Não gera XP próprio — espelha o XP das atividades vinculadas. |
| **Projeto** | Entregável com fases | Possui fases, tarefas, meta numérica opcional. Pode conter rotinas vinculadas às fases. |
| **Rotina** | Ação recorrente | Atividade executada com frequência definida. Acumula streak e maestria. |
| **Tarefa Avulsa** | Ação pontual | Item único com prazo opcional. Pode ser promovida a projeto. |

---

### 2.1 Objetivo

O Objetivo é a camada mais alta da hierarquia. Ele representa um **propósito de longo prazo** — como "Independência Financeira" ou "Saúde Completa". Não é uma atividade executável, mas sim uma lente que agrupa e visualiza o progresso de múltiplas atividades.

**Campos:**

- Nome (obrigatório)
- Propósito — "Por que isso importa para você?" (opcional, recomendado)
- Cor — identificação visual
- Status — Ativo, Concluído ou Arquivado

**Vínculos:**

Um Objetivo pode ser vinculado a qualquer combinação de Projetos, Rotinas, Tarefas e outros Objetivos. O vínculo entre Objetivos segue uma relação hierárquica (maior/menor) com detecção automática de ciclos para evitar vínculos circulares.

**XP Espelhado:**

O XP do Objetivo é **espelhado** — ele reflete a soma do XP de todas as atividades vinculadas, sem duplicar o XP global do usuário. Se uma rotina está vinculada a 3 objetivos, cada objetivo mostra o XP integral daquela rotina. O XP real do personagem é calculado independentemente.

**Deleção:**

Ao deletar um objetivo, o usuário escolhe entre duas opções:

- **Deletar apenas o objetivo** — remove o objetivo e desvincula as atividades (elas permanecem intactas)
- **Deletar tudo junto** — remove o objetivo e todas as atividades diretamente vinculadas a ele

---

### 2.2 Projeto

O Projeto é a entidade de execução mais robusta. Ele absorve o que antes era a entidade "Meta" — agora projetos podem ter meta numérica embutida opcionalmente.

**Campos:**

- Nome (obrigatório)
- Objetivo qualitativo — visão do resultado desejado
- Cor, Prioridade, Categoria, Prazo, Descrição, Notas
- Meta numérica (opcional): alvo, valor atual, unidade, histórico de atualizações
- Fases (opcionais) com tarefas e rotinas vinculadas
- Vínculo a Objetivos
- Status: Ativo, Pausado, Arquivado, Concluído

**Meta Numérica:**

Quando ativada, o projeto exibe duas barras de progresso: uma para percentual de tarefas concluídas e outra para o progresso da meta numérica. O botão "Atualizar valor" permite atualização rápida com nota opcional, tanto na lista quanto no detalhe. Valores que ultrapassam o alvo são exibidos como "120% — meta superada!" em verde.

**Fases:**

Fases são opcionais. Projetos simples podem ter tarefas soltas diretamente, sem estrutura de fases. Cada fase pode conter tarefas e rotinas (novas ou vinculadas de existentes). Fases são reordenáveis via botões ↑↓, possuem checkpoint numérico opcional (validação: não pode ser maior que o alvo do projeto), e são concluídas automaticamente quando 100% das tarefas estão feitas — mas podem ser reabertas a qualquer momento.

**Rotinas dentro de fases:**

Uma rotina pode ser vinculada a uma fase sem ser duplicada — ela aparece tanto na fase quanto na sub-aba Rotinas com indicação de origem. Quando a fase é concluída, a rotina permanece ativa automaticamente. O XP gerado pela rotina acumula no projeto pai. Se a rotina for deletada, a fase registra um log de remoção para manter o histórico.

**Conclusão do Projeto:**

A conclusão nunca é automática — sempre requer confirmação do usuário. **Condição para o aviso aparecer:** todas as tarefas concluídas E meta numérica atingida (se houver). A conclusão de projeto **não gera recompensa de XP/moedas** — o XP vem exclusivamente das tarefas e rotinas individuais.

---

### 2.3 Rotina

Rotinas são atividades recorrentes com frequência definida (Diário, Semanal, Mensal, Personalizado ou Livre). Cada execução gera XP e moedas baseados na dificuldade.

**Streak:**

O streak é **preservado** ao mudar a frequência — a mudança é um ajuste prospectivo, não invalida o histórico. Rotinas com frequência "Livre" não acumulam streak, não aparecem como "atrasadas" no Dashboard, e não são desativadas automaticamente por inatividade. Mostram apenas a contagem total de execuções.

**Desativação automática:**

Rotinas (exceto Livre) que não forem completadas por 5 dias consecutivos em que estavam devidas são automaticamente desativadas. Podem ser reativadas manualmente a qualquer momento.

---

### 2.4 Tarefa Avulsa

Tarefas são itens pontuais com prazo opcional. Funcionalidades especiais:

- **Auto-arquivamento:** tarefas com prazo vencido há 3+ dias são automaticamente movidas para a lixeira. Na lixeira, permanecem por 30 dias antes da remoção permanente.
- **Promoção a Projeto:** botão "Promover a projeto" cria um projeto com os mesmos dados (nome, descrição, notas, vínculos a objetivos) e abre o formulário de edição para adicionar fases e meta numérica. A tarefa original é arquivada.
- **Sugestão de Rotina:** após criar tarefas com nomes similares, o sistema sugere "Você já criou tarefas parecidas antes. Quer transformar isso em uma rotina?"
- **Badge de vencida:** tarefas com prazo expirado exibem indicador vermelho "Vencida há X dia(s)"

---

## 3. Sistema de Gamificação

### 3.1 XP e Níveis

XP é gerado **exclusivamente** por conclusão de tarefas e execução de rotinas. Nenhuma outra ação gera XP. O XP acumulado determina o nível do personagem, distribuído em 6 bandas de progressão:

| Banda | Níveis | XP por Nível | XP Total da Banda |
|-------|--------|-------------|-------------------|
| Despertar | 1–50 | 100 | 5.000 |
| Disciplina | 51–100 | 150 | 7.500 |
| Domínio | 101–200 | 200 | 20.000 |
| Maestria | 201–300 | 300 | 30.000 |
| Lenda | 301–400 | 400 | 40.000 |
| Imortal | 401–500 | 500 | 50.000 |

A tabela de XP por dificuldade (1-10): 0, 3, 5, 8, 12, 18, 25, 35, 50, 70, 100.

### 3.2 Streak Global

O streak mede dias consecutivos com atividade (ganho de XP). Fornece bônus multiplicador crescente que se aplica a todo XP e moedas ganhos:

| Dias | Bônus |
|------|-------|
| 3 | +10% |
| 7 | +25% |
| 14 | +40% |
| 30 | +60% |
| 60 | +80% |
| 90 | +100% |

Inatividade causa perda de até 5 dias de streak. O Escudo (consumível da loja) protege contra uma falha. O streak pode ser recuperado parcialmente com moedas: +10 dias (40 moedas), +30 dias (120 moedas), +60 dias (250 moedas).

### 3.3 Maestria por Atividade

Cada projeto e rotina acumula XP individual, desbloqueando tiers de maestria que concedem bônus de moedas:

| Tier | XP necessário | Bônus de moedas |
|------|--------------|----------------|
| Bronze | 50 | 10 |
| Prata | 200 | 25 |
| Ouro | 500 | 50 |
| Platina | 1.200 | 100 |
| Diamante | 2.500 | 200 |
| Mestre | 5.000 | 500 |

### 3.4 Missão do Dia

Uma missão aleatória é gerada diariamente (baseada na data). Exemplos: "Concluir 5 tarefas", "Ganhar 100+ XP hoje", "Concluir todas as rotinas do dia". Ao completar, o usuário resgata moedas como recompensa (15-30 moedas dependendo da dificuldade da missão).

### 3.5 Baús e Conquistas

**Baús** são desbloqueados por milestones e contêm moedas, escudos e boosts:

| Tipo | Moedas | Desbloqueio |
|------|--------|-------------|
| Comum | 60–120 | 3+ tarefas/dia (nível 25+) |
| Raro | 150–300 | 5+ tarefas/dia (nível 50+) |
| Épico | 350–600 | Streak 7+ (nível 100+) |
| Lendário | 800–1.500 | Streak 30+ (nível 200+) |

**Conquistas** são marcos permanentes (ex: 10 tarefas, streak 30 dias, nível 100, 5 projetos concluídos, maestria ouro) que concedem moedas ao serem resgatadas.

### 3.6 Loja

As moedas permitem comprar itens cosméticos que personalizam a experiência:

- **Títulos** — texto exibido no perfil (ex: "Prodígio", "Lenda Viva", "Dragão Ancestral")
- **Ícones** — avatar visual SVG do personagem (estrela, escudo, alvo, coroa, fogo, foguete, troféu, raio, caveira, diamante, infinito, dragão)
- **Temas** — esquema de cores completo da interface (13+ temas com raridade Comum a Lendário)
- **Bordas** — moldura decorativa ao redor do avatar
- **Consumíveis** — Escudo (protege streak), Boost (+25% moedas por 24h), Baús para compra

Itens cosméticos podem ser comprados e equipados. Temas e bordas possuem sistema de upgrade com níveis adicionais que alteram a intensidade visual.

---

## 4. Sistema de Vínculos

O sistema de vínculos conecta atividades a objetivos de forma bidirecional e automática. Quando uma atividade é vinculada a um objetivo, ambos os lados são atualizados simultaneamente.

### 4.1 Pontos de Entrada

1. Formulário de criação (Projeto, Rotina, Tarefa) — campo "Vincular a objetivo"
2. Formulário de edição — mesmo campo
3. Tela de detalhe de qualquer atividade — chips de objetivo com opção de adicionar
4. Tela de detalhe do Objetivo — botão "+ Vincular atividade"

### 4.2 Busca de Vínculo

A busca utiliza filtro em tempo real por nome e tipo (Projeto, Rotina, Tarefa, Objetivo). Cada item exibe nome e propósito como desambiguador. A busca de objetivos oferece rodapé com "+ Criar novo objetivo agora" para criação rápida sem sair do fluxo.

### 4.3 Regras de Integridade

- **Vínculo Objetivo→Objetivo:** pop-up de direção (maior/menor) com sync bidirecional automático
- **Detecção de ciclo:** se A→B existe, B→A é bloqueado com mensagem "Vínculo circular detectado"
- **Desvincular:** remove apenas o link, não deleta a atividade
- **Objetivo arquivado:** chips ficam cinza com texto "(arquivado)", atividade continua funcionando normalmente
- **Deleção de atividade:** limpa automaticamente os vínculos de todos os objetivos relacionados
- **Deleção de projeto:** limpa o phaseRef de rotinas que estavam vinculadas às fases
- **Deleção de rotina em fase:** registra log "rotineRemoved" na fase para preservar histórico

---

## 5. Navegação e Experiência

### 5.1 Estrutura de Telas

A navegação principal é feita por 5 abas fixas no rodapé:

| Aba | Conteúdo |
|-----|----------|
| **Dashboard** | Perfil, XP, streak, moedas, card de Objetivos (top 3), próxima ação sugerida, missão do dia, gráfico de XP com filtros temporais, visão geral de todas as atividades |
| **Atividades** | 4 sub-abas: Projetos, Rotinas, Tarefas, Objetivos. Cada uma com lista, criação, edição e detalhe |
| **Histórico** | Estatísticas gerais, streak com multiplicador, recuperação de streak, baús pendentes, gráfico semanal, conquistas resgatáveis |
| **Loja** | Títulos, ícones, temas, bordas, consumíveis, sistema de upgrade |
| **Config** | Profile card completo, backup/import JSON, presets de dificuldade por categoria, pesos da próxima ação, lixeira com restauração, reset total |

### 5.2 Navegação Inteligente

O sistema implementa um histórico de navegação em pilha. Quando o usuário navega entre telas de detalhe (ex: Objetivo → Projeto → Rotina), o botão voltar retorna ao ponto anterior correto, sem pular para a lista. A pilha é limpa ao acessar qualquer lista diretamente.

### 5.3 Dashboard — Card de Objetivos

O Dashboard exibe um card "Seus Objetivos" com os 3 objetivos ativos de maior XP espelhado. Cada objetivo é clicável individualmente e navega diretamente ao seu detalhe. O título do card leva à lista completa de objetivos. O card só aparece se houver pelo menos 1 objetivo ativo.

### 5.4 Próxima Ação

O sistema sugere a próxima ação mais relevante baseado em pesos configuráveis de prioridade, prazo e dificuldade. Tarefas de projetos, tarefas avulsas e rotinas do dia (exceto Livre) competem pela sugestão. O usuário pode pular para a próxima sugestão ou concluir diretamente do Dashboard.

### 5.5 Comportamentos Automáticos

- **Virada de dia:** reset de XP/moedas diários, check de streak, nova missão, desativação de rotinas com 5+ faltas consecutivas (exceto Livre), auto-arquivamento de tarefas vencidas há 3+ dias
- **Sugestão de rotina:** ao criar tarefas com nomes similares a tarefas já existentes
- **Auto-conclusão de fase:** quando 100% das tarefas da fase estão concluídas (reabrir é possível)
- **Limpeza da lixeira:** itens com 30+ dias são removidos permanentemente

---

## 6. Dados e Persistência

### 6.1 Armazenamento

Todos os dados são persistidos localmente no dispositivo via storage assíncrono. As chaves de armazenamento são:

| Chave | Conteúdo |
|-------|----------|
| `projects` | Array de projetos com fases, tarefas, meta numérica, vínculos, valueHistory |
| `routines` | Array de rotinas com completionLog, streak, bestStreak, phaseRef, linkedObjectives |
| `tasks` | Array de tarefas avulsas com vínculos a objetivos |
| `objectives` | Array de objetivos com linkedActivities e linkedObjectives |
| `trash` | Itens deletados aguardando 30 dias para remoção permanente |
| `profile` | XP total, moedas, streak, conquistas, itens comprados/equipados, dailyLog, missão, presets |

### 6.2 Backup e Restauração

O sistema oferece exportação e importação completa em formato JSON. O arquivo de backup inclui todas as 6 chaves de armazenamento com timestamp. A importação substitui todos os dados existentes. O reset total limpa todas as chaves e restaura o estado inicial com 100.000 moedas para testes.

---

## 7. Regras Fundamentais de XP

| Gera XP | NÃO gera XP |
|---------|-------------|
| Concluir tarefa (avulsa ou de projeto) | Concluir projeto |
| Executar rotina | Atingir meta numérica |
| | Concluir fase |
| | Criar/vincular objetivo |
| | Atingir checkpoint |

Esta regra evita inflação de XP e garante que o progresso reflita esforço real. O XP mostrado em Objetivos é espelhado — uma visualização do esforço acumulado, sem impacto no nível global do personagem.

---

## 8. Resumo Técnico

| Item | Detalhe |
|------|---------|
| Tecnologia | React (JSX) — componente único autossuficiente |
| Persistência | Storage local assíncrono (sem backend) |
| Linhas de código | ~3.400 linhas JSX |
| Componentes | 20 componentes funcionais principais |
| Temas visuais | Sistema de tons dinâmicos com 13+ temas |
| Ícones | SVG inline — sem dependência de bibliotecas externas |
| Layout | Mobile-first, max-width 430px, bottom tab navigation |
| Versão | v2.0 (fase 5, iteração 13) — Março 2026 |

---

*Documento gerado em Março de 2026. Sistema em desenvolvimento ativo.*

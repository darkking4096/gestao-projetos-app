import { useState, useMemo, useEffect, useRef } from "react";
import { C } from '../temas.js';
import { td, getMastery, getEnergia, getMoedas, getXp, fmtD, fmtFreq, getMasteryBonus, getMultiplier, isRoutineDueToday, calcObjectiveXp, rollMissionRank, migrateFreq } from '../utilidades.js';
import { MASTERY_LEVELS, PRI_ORDER, COLORS } from '../constantes.js';
import { ACHIEVEMENTS } from '../utilidades.js';
import { Btn, Card, Badge, PBar, EnergiaBarDupla, Chk, TopBar, FilterBtn, FilterModal, RankEmblemSVG } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG, BorderSVG, TitleBanner, MaestriaSVG, SHOP_BORDERS, SHOP_TITLES, getTitleTargetColor, getTitleBannerColor, getTitleStyle, getUpgradeCost, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS } from '../icones.jsx';
import { AtributosSection } from './atributos.jsx';

/* ═══ GROQ helper para geração de missão ═══ */
async function gerarMissaoGroq(apiKey, rankId, rankMain, context, textAnterior) {
  const { projetos, rotinas, tarefas, streak, rankAtual, poder, xpHoje } = context;

  /* ── Perfil de atividade (sem nomes reais) ── */
  const temProjetos = projetos.length > 0;
  const temRotinas  = rotinas.length > 0;
  const temTarefas  = tarefas.length > 0;

  /* Domínio preferencial baseado no perfil */
  const dominioHint = temProjetos && !temRotinas ? "planejamento e visao de longo prazo"
    : temRotinas && !temProjetos ? "habitos, saude e autoconsciencia"
    : temProjetos && temRotinas  ? "produtividade, sistemas e desenvolvimento pessoal"
    : "organizacao pessoal e autoconsciencia";

  /* Estado de streak */
  const streakCtx = streak === 0 ? "retomando o ritmo"
    : streak <= 2  ? "voltando ao ritmo"
    : streak <= 6  ? "mantendo o momento"
    : streak <= 29 ? "em crescimento continuo"
    : "em nivel de elite";

  /* Estado de energia hoje */
  const hojeCtx = xpHoje > 0 ? "ja agiu hoje — pode ir mais longe" : "ainda nao agiu hoje — momento de ativar";

  /* Complexidade por rank */
  const complexidade =
    rankMain === "F"   ? "SIMPLES: 1 atividade unica, 10 a 30 minutos, resultado imediato" :
    rankMain === "E"   ? "SIMPLES COM REFLEXAO: 1 atividade + etapa de registro ou reflexao, 30 min" :
    rankMain === "D"   ? "MODERADA: 2 etapas encadeadas, 30 a 60 minutos, entregavel concreto" :
    rankMain === "C"   ? "MODERADA-COMPLEXA: 2 a 3 etapas, 1 a 2 horas, requer planejamento leve" :
    rankMain === "B"   ? "COMPLEXA: 3 a 4 etapas encadeadas, 2 a 3 horas, entregavel claro e significativo" :
    rankMain === "A"   ? "ALTA COMPLEXIDADE: missao multi-etapa, impacto de medio prazo, 3 a 6 horas" :
    rankMain === "S"   ? "EPICA: cadeia de acoes onde A leva a B que leva a C — resultado transformador" :
    /* MAX */            "LENDARIA: missao de impacto de longo prazo, mudanca real e duravel de vida";

  /* Tamanho do contexto por rank */
  const tamanhoCtx =
    (rankMain === "F" || rankMain === "E") ? "2 frases, maximo 180 caracteres" :
    (rankMain === "D" || rankMain === "C") ? "3 frases, maximo 280 caracteres" :
    (rankMain === "B" || rankMain === "A") ? "4 frases encadeadas, maximo 360 caracteres" :
    /* S e MAX */                            "4 a 5 frases com logica de cadeia (A leva a B...), maximo 420 caracteres";

  const antiRepeat = textAnterior
    ? `\nNAO repita nem use variacao do titulo anterior: "${textAnterior}"\nEscolha um dominio DIFERENTE do anterior.\n`
    : "";

  const prompt = `Voce e o sistema de missoes de um app de produtividade gamificado RPG.

Sua tarefa: gerar uma MISSAO NOVA de rank ${rankId} para o usuario. Uma missao e uma atividade de vida real que o usuario provavelmente ainda nao pensou em fazer. Ela deve inspirar uma "faisca" — uma ideia nova que pode criar um novo projeto, habito ou perspectiva na vida dele.

PERFIL DO USUARIO:
- Rank: ${rankAtual} (${rankId}) | Poder: ${poder}
- Streak: ${streak} dias (${streakCtx})
- Hoje: ${hojeCtx}
- Perfil de atividades: ${dominioHint}
${antiRepeat}
COMPLEXIDADE DESTA MISSAO (rank ${rankId}):
${complexidade}

RETORNE SOMENTE JSON valido, sem markdown, sem explicacoes:
{"titulo":"...","contexto":"..."}

REGRAS PARA "titulo":
- Nome claro e concreto da atividade (NAO uma frase filosofica)
- Entre 25 e 60 caracteres
- Pode ser substantivo + complemento: "Analise de Gastos Pessoais", "Pratica de Jornalismo Reflexivo", "Revisao Semanal de Prioridades", "Sessao de Limpeza Mental"
- Nunca cite nomes de projetos ou tarefas do usuario
- Nunca comece com verbo no imperativo — use substantivos que nomeiam a atividade

REGRAS PARA "contexto":
- Deve conter: (1) POR QUE a missao importa, (2) O QUE exatamente fazer, (3) COMO abordar
- ${tamanhoCtx}
- Tom pratico e direto — instrucoes reais, nao apenas motivacao
- Instrucoes especificas o suficiente para o usuario saber exatamente o que fazer
- Genericas o suficiente para funcionar para qualquer pessoa (sem supor profissao ou contexto especifico)
- Sem emojis

DOMINIOS POSSIVEIS (escolha o mais relevante para o perfil, varie entre geracoes):
  financas pessoais | saude e bem-estar | aprendizado e leitura | criatividade e expressao |
  relacionamentos | organizacao pessoal | mindfulness e autoconhecimento |
  produtividade e sistemas | visao e projetos de vida

EXEMPLOS DE SAIDA CORRETA:
{"titulo":"Analise de Gastos Pessoais","contexto":"Revisar os gastos dos ultimos 3 meses te da uma visao real de onde seu dinheiro vai. Categorize em planilha simples, identifique pelo menos 1 area de desperdicio e defina um ajuste concreto para o proximo mes."}
{"titulo":"Pratica de Jornalismo Reflexivo","contexto":"Escrever sobre o proprio dia desenvolve autoconsciencia e ajuda a processar decisoes. Reserve 10 minutos, escreva sobre o que aconteceu hoje, o que aprendeu e como se sentiu. Sem julgamentos — so observacao."}
{"titulo":"Mapeamento de Relacionamentos-Chave","contexto":"Liste as 5 pessoas mais importantes na sua vida hoje. Para cada uma, escreva: qual e o estado atual da relacao e uma acao concreta que voce poderia fazer esta semana para fortalecer esse laco."}

EXEMPLOS DE SAIDA ERRADA (nunca faca assim):
{"titulo":"Domine a arte de transformar ideias em acoes","contexto":"A verdadeira forca reside na capacidade de iniciar e persistir."} — titulo filosofico, contexto vazio
{"titulo":"Finalize Implementar mudancas em Melhorar esse aplicativo","contexto":"..."} — cita nome real de projeto`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.95,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error("groq_error");
  const data = await response.json();
  const raw = (data.choices?.[0]?.message?.content || "").trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return { titulo: raw.slice(0, 60), contexto: "" }; }
  const titulo   = (parsed.titulo   || "").replace(/^["']|["']$/g, "").replace(/\.$/, "").slice(0, 70);
  const contexto = (parsed.contexto || "").replace(/^["']|["']$/g, "").slice(0, 430);
  return { titulo, contexto };
}

/* Fallback por rank quando nao ha chave Groq — titulo concreto + contexto pratico */
const FALLBACK_TEXTS = {
  F: [
    { titulo: "Pratica de Agradecimento Diario", contexto: "Escreva 3 coisas pelas quais voce e grato hoje — sem repetir do dia anterior. Leva menos de 5 minutos e treina o cerebro a enxergar o que ja funciona na sua vida." },
    { titulo: "Organizacao da Mesa de Trabalho", contexto: "Dedique 15 minutos para limpar e reorganizar o espaco onde voce trabalha. Um ambiente ordenado reduz o atrito mental e aumenta o foco imediatamente." },
  ],
  E: [
    { titulo: "Diario Reflexivo do Dia", contexto: "Reserve 10 minutos e escreva: o que aconteceu hoje, o que voce aprendeu e como se sentiu. Sem julgamentos — so observacao honesta. Desenvolvida por tempo, essa pratica transforma a autoconsciencia." },
    { titulo: "Revisao de Uma Meta Pessoal", contexto: "Escolha uma meta que voce definiu ha algum tempo. Avalie honestamente: ainda faz sentido? Qual foi o progresso real? Redefina o proximo passo concreto." },
  ],
  D: [
    { titulo: "Analise de Gastos Pessoais", contexto: "Abra seu extrato bancario dos ultimos 30 dias. Categorize os gastos em grupos (alimentacao, lazer, assinaturas, etc). Identifique pelo menos 1 area de desperdicio e defina um ajuste para o proximo mes." },
    { titulo: "Sessao de Leitura Focada", contexto: "Leia 20 paginas de um livro relevante para voce hoje — sem interrupcoes, sem celular. Ao final, escreva 3 linhas sobre o que mais chamou sua atencao. O registro consolida o aprendizado." },
  ],
  C: [
    { titulo: "Mapeamento de Relacionamentos-Chave", contexto: "Liste as 5 pessoas mais importantes na sua vida hoje. Para cada uma, escreva o estado atual do relacionamento e uma acao concreta que voce poderia fazer esta semana para fortalecer esse laco. Depois, escolha uma e faca." },
    { titulo: "Revisao Semanal de Prioridades", contexto: "Reserve 45 minutos para revisar tudo que esta em aberto: tarefas, projetos, compromissos. Reorganize por impacto real. Cancele ou delegue pelo menos 1 coisa. Defina as 3 prioridades mais importantes da proxima semana." },
  ],
  B: [
    { titulo: "Auditoria de Habitos e Rotinas", contexto: "Liste todos os habitos que voce pratica regularmente — bons e ruins. Para cada um, avalie: este habito me aproxima ou me afasta de quem quero ser? Escolha 1 habito negativo para eliminar e 1 positivo para fortalecer. Defina como voce vai monitorar os dois." },
    { titulo: "Construcao de Sistema de Rastreamento Pessoal", contexto: "Escolha 3 metricas importantes para voce (sono, exercicio, leitura, etc). Crie uma forma simples de registrar essas metricas diariamente — planilha, caderno ou app. Configure o sistema hoje e registre o dia de hoje como primeiro dado." },
  ],
  A: [
    { titulo: "Planejamento de Meta Transformadora de 90 Dias", contexto: "Defina UMA meta que, se alcancar em 90 dias, mudara algo importante na sua vida. Quebre em 3 fases mensais, cada uma com um entregavel claro. Liste os principais obstaculos previstos e como voce vai lidar com eles. Escreva tudo em um lugar que voce vai rever toda semana." },
    { titulo: "Criacao de Manifesto de Valores Pessoais", contexto: "Escreva seus 5 valores fundamentais — os principios que guiam suas decisoes mais importantes. Para cada valor, descreva como ele se manifesta (ou deveria se manifestar) na sua vida hoje. Identifique onde ha conflito entre seus valores declarados e suas acoes reais. Defina 1 mudanca concreta." },
  ],
  S: [
    { titulo: "Construcao de um Sistema de Vida Integrado", contexto: "Mapeie as 5 areas principais da sua vida (saude, financas, relacionamentos, trabalho, crescimento). Para cada area: qual e a situacao atual, qual e a situacao ideal em 1 ano e qual e a proxima acao concreta. Depois, defina uma revisao mensal recorrente para acompanhar cada area." },
    { titulo: "Sprint de Aprendizado Acelerado", contexto: "Escolha um tema que voce quer dominar. Estude por 3 horas focadas usando o metodo: 50 min de estudo, 10 min de pausa. Ao final, produza um output concreto — resumo escrito, mapa mental ou explicacao em voz alta. O output forca o processamento real do conhecimento." },
  ],
  MAX: [
    { titulo: "Manifesto Pessoal de Vida", contexto: "Escreva o documento mais importante sobre si mesmo: sua missao de vida em 1 frase, seus valores em 5 topicos, sua visao de onde quer estar em 10 anos e os principios que guiam suas decisoes. Revise o que ja escreveu antes, refine com honestidade brutal. Isso e o norte que vai guiar tudo." },
    { titulo: "Auditoria Completa de Produtividade e Foco", contexto: "Por uma semana, registre em que voce gasta cada hora do dia. Analise os dados: onde vai seu tempo vs onde deveria ir. Calcule sua taxa de 'trabalho profundo' real. Redesenhe sua rotina com blocos de foco protegidos. Implemente e revise apos 30 dias." },
  ],
};
function getFallbackText(rankMain) {
  const pool = FALLBACK_TEXTS[rankMain] || FALLBACK_TEXTS.F;
  return pool[Math.floor(Math.random() * pool.length)];
}

function DashboardTab({ profile, levelInfo, poderInfo, rankInfo, projects, routines, tasks, objectives, nav, completeTask, completeRoutine, earn, setDailyMission, claimMissionRpg, atributos, setAtributos, groqApiKey }) {
  const [dashSubTab, setDashSubTab] = useState("overview");
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({ key: null, mode: null });
  const [chartRange, setChartRange] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gerandoMissao, setGerandoMissao] = useState(false);
  const [showMissaoDetalhe, setShowMissaoDetalhe] = useState(false);
  const gerandoRef = useRef(false);

  /* ── Geração de missão ── */
  const buildContext = () => {
    const projAtivos = projects.filter(p => p.status === "Ativo");
    const rotAtivas  = routines.filter(r => r.status === "Ativa");
    const tarefasPend = tasks.filter(t => t.status === "Pendente");
    /* Tarefas dentro de fases de projetos */
    const tarefasProjeto = projAtivos.flatMap(p =>
      (p.phases || []).flatMap(ph =>
        (ph.tasks || []).filter(t => t.status !== "Concluída").map(t => ({
          nome: t.name, projeto: p.name, dificuldade: t.difficulty || 1,
        }))
      )
    );
    return {
      projetos: projAtivos.map(p => ({
        nome: p.name,
        tarefasPendentes: (p.phases || []).reduce((s, ph) => s + (ph.tasks || []).filter(t => t.status !== "Concluída").length, 0),
        progresso: p.progress || 0,
      })),
      rotinas: rotAtivas.map(r => ({
        nome: r.name,
        frequencia: r.freq || "Diario",
        streak: r.streak || 0,
      })),
      tarefas: tarefasPend.map(t => ({
        nome: t.name, dificuldade: t.difficulty || 1,
      })),
      tarefasProjeto,
      streak: profile.streak || 0,
      rankAtual: rankInfo?.label || "Humano",
      poder: _poderInfo?.poder || 0,
      xpHoje: profile.xpToday || 0,
    };
  };

  const gerarMissao = async (options = {}) => {
    const { variacao = false } = options;
    if (gerandoRef.current) return;
    gerandoRef.current = true;
    setGerandoMissao(true);
    try {
      const prev = profile.dailyMission;
      /* Variar: mantém rank e recompensas, só muda o texto */
      const rolled = variacao && prev && prev.rankMain
        ? { rankMain: prev.rankMain, rankId: prev.rankId, modifier: prev.modifier || "", color: prev.color, colorSecondary: prev.colorSecondary, energia: prev.energia, coins: prev.coins }
        : rollMissionRank(rankInfo);

      let resultado = { titulo: "", contexto: "" };
      const ctx = buildContext();
      if (groqApiKey) {
        try {
          resultado = await gerarMissaoGroq(groqApiKey, rolled.rankId, rolled.rankMain, ctx, variacao ? (prev?.text || "") : "");
        } catch (e) {
          resultado = getFallbackText(rolled.rankMain);
        }
      } else {
        resultado = getFallbackText(rolled.rankMain);
      }
      if (!resultado.titulo) resultado = getFallbackText(rolled.rankMain);

      const agora = Date.now();
      /* Variar preserva o timer original — só muda o texto e contexto */
      const novaMissao = {
        rankMain: rolled.rankMain,
        rankId: rolled.rankId,
        modifier: rolled.modifier || "",
        color: rolled.color,
        colorSecondary: rolled.colorSecondary,
        text: resultado.titulo,
        context: resultado.contexto,
        energia: rolled.energia,
        coins: rolled.coins,
        generatedAt: variacao && prev ? (prev.generatedAt || agora) : agora,
        expiresAt:   variacao && prev ? (prev.expiresAt   || agora + 6 * 60 * 60 * 1000) : agora + 6 * 60 * 60 * 1000,
        completed: false,
        claimedAt: null,
        variacaoCount: variacao ? ((prev?.variacaoCount || 0) + 1) : 0,
      };
      setDailyMission(novaMissao);
    } finally {
      gerandoRef.current = false;
      setGerandoMissao(false);
    }
  };

  /* Migra missão em formato antigo automaticamente (sem rankMain = legado) */
  useEffect(() => {
    const m = profile.dailyMission;
    const isOldFormat = m && !m.rankMain && !m.completed;
    /* Limpa missão legada para que o usuário gere uma nova manualmente */
    if (isOldFormat) {
      setDailyMission(null);
    }
  }, []);

  const allItems = useMemo(() => {
    const items = [
      ...projects.map(p => ({ ...p, _t: "project", _xp: p.xpAccum || 0, _mastery: getMastery(p.xpAccum || 0), _pct: p.progress || 0, _pri: p.priority, _diff: 0, _streak: 0, _deadline: p.deadline })),
      ...routines.map(r => ({ ...r, _t: "routine", _xp: r.xpAccum || 0, _mastery: getMastery(r.xpAccum || 0), _pct: 0, _pri: r.priority, _diff: r.difficulty || 0, _streak: r.streak || 0, _deadline: null })),
      ...tasks.map(t => ({ ...t, _t: "task", _xp: getEnergia(t.difficulty || 1), _mastery: null, _pct: t.status === "Concluída" ? 100 : 0, _pri: t.priority, _diff: t.difficulty || 0, _streak: 0, _deadline: t.deadline })),
    ];
    if (filter.key) {
      const { key, mode } = filter;
      if (key === "type") return items.filter(i => i._t === mode);
      const dir = mode === "asc" ? 1 : -1;
      const mastOrd = { Bronze: 1, Prata: 2, Ouro: 3, Platina: 4, Diamante: 5, Mestre: 6 };
      const sortFns = {
        xp: (a, b) => (a._xp - b._xp) * dir,
        streak: (a, b) => (a._streak - b._streak) * dir,
        mastery: (a, b) => ((mastOrd[a._mastery && a._mastery.name] || 0) - (mastOrd[b._mastery && b._mastery.name] || 0)) * dir,
        priority: (a, b) => ((PRI_ORDER[a._pri] || 4) - (PRI_ORDER[b._pri] || 4)) * dir,
        deadline: (a, b) => (a._deadline || "9999").localeCompare(b._deadline || "9999") * dir,
        difficulty: (a, b) => (a._diff - b._diff) * dir,
      };
      if (sortFns[key]) items.sort(sortFns[key]);
    }
    return items;
  }, [projects, routines, tasks, filter]);

  const dailyLog = profile.dailyLog || [];
  const todayEntry = { date: td(), xp: profile.xpToday || 0, coins: profile.coinsToday || 0 };
  // Retrocompatibilidade: usa poderInfo/rankInfo recebidos do App, ou calcula se não houver
  const _poderInfo = poderInfo || { poder: 0, totalEnergia: 0, energiaInPoder: 0, energiaForPoder: 100 };
  const _rankInfo  = rankInfo  || { label: "Humano", rankMain: null, color: C.gold, colorSecondary: C.gold };
  const allDays = [...dailyLog, todayEntry];
  const chartData = useMemo(() => {
    let from, to;
    const now = new Date();
    to = td();
    if (chartRange === "7d") { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "30d") { const d = new Date(now); d.setDate(d.getDate() - 29); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "90d") { const d = new Date(now); d.setDate(d.getDate() - 89); from = d.toISOString().split("T")[0]; }
    else if (chartRange === "custom" && customFrom && customTo) { from = customFrom; to = customTo; }
    else { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split("T")[0]; }
    const filtered = allDays.filter(d => d.date >= from && d.date <= to);
    if (filtered.length > 15) {
      const weeks = {};
      filtered.forEach(d => { const dt = new Date(d.date); const weekStart = new Date(dt); weekStart.setDate(dt.getDate() - dt.getDay()); const key = weekStart.toISOString().split("T")[0]; if (!weeks[key]) weeks[key] = { date: key, xp: 0, coins: 0, days: 0, label: "" }; weeks[key].xp += (d.xp || 0); weeks[key].coins += (d.coins || 0); weeks[key].days++; });
      const arr = Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date));
      arr.forEach(w => { w.label = fmtD(w.date).slice(0, 5); });
      return arr;
    }
    return filtered.map(d => ({ ...d, label: d.date ? d.date.slice(8, 10) + "/" + d.date.slice(5, 7) : "" }));
  }, [allDays, chartRange, customFrom, customTo]);

  const maxXp = Math.max(1, ...chartData.map(d => d.xp || 0));
  const totalXpRange = chartData.reduce((s, d) => s + (d.xp || 0), 0);
  const totalCoinsRange = chartData.reduce((s, d) => s + (d.coins || 0), 0);
  const totalActive = projects.filter(p => p.status === "Ativo").length + routines.filter(r => r.status === "Ativa").length + tasks.filter(t => t.status === "Pendente").length;

  const filterOpts = [
    { key: "type", label: "Tipo de atividade", values: ["project", "routine", "task"] },
    { key: "xp", label: "ENERGIA ⚡ ganho", modes: ["asc", "desc"] },
    { key: "streak", label: "Sequência", modes: ["asc", "desc"] },
    { key: "mastery", label: "Maestria", modes: ["asc", "desc"] },
    { key: "priority", label: "Prioridade", modes: ["asc", "desc"] },
    { key: "deadline", label: "Prazo", modes: ["asc", "desc"] },
    { key: "difficulty", label: "Dificuldade", modes: ["asc", "desc"] },
  ];

  // V2: Top 3 active objectives — memoized (calcObjectiveXp faz DFS recursivo)
  const activeObjectives = useMemo(() =>
    (objectives || []).filter(o => o.status === "Ativo").map(o => ({
      ...o,
      xpMirror: calcObjectiveXp(o.id, projects, routines, tasks, objectives || [])
    })).sort((a, b) => b.xpMirror - a.xpMirror).slice(0, 3),
    [objectives, projects, routines, tasks]
  );


  return (
    <div style={{ padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 1. Ícone + borda */}
          <div style={{ position: "relative" }}>
            <BorderSVG level={(profile.upgradeLevels || {})[profile.equippedBorder] || 0} color={C.gold} accentColor={(SHOP_BORDERS.find(b => b.id === profile.equippedBorder) || SHOP_BORDERS[0]).color} size={54}><IconSVG id={profile.equippedIcon || "i_estrela"} size={20} color={C.gold} /></BorderSVG>
          </div>
          {/* 2. Emblema de rank (sem modificador, sem label) */}
          <RankEmblemSVG rank={_rankInfo.rankMain} modifier="" size={24} color={_rankInfo.color} colorSecondary={_rankInfo.colorSecondary} />
          {/* 3. Título */}
          <TitleBanner level={(profile.upgradeLevels || {})[(profile.equippedTitle)] || 0} color={C.gold} accentColor={getTitleTargetColor((SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).price) || C.gold}><span style={{ fontSize: 11, fontStyle: "italic", fontWeight: 600, color: C.gold }}>{(SHOP_TITLES.find(t => t.id === profile.equippedTitle) || SHOP_TITLES[0]).name}</span></TitleBanner>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.card, borderRadius: 6, padding: "4px 10px" }}>
          <div style={{ width: 18, height: 18, background: C.gold, borderRadius: 9, fontSize: 11, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>$</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>{profile.coins}</span>
        </div>
      </div>
      {/* ENERGIA / PODER bars */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.tx3, marginBottom: 3 }}>
        <span>{(profile.xpToday || 0).toLocaleString()} ENERGIA hoje</span>
        <span style={{ color: _rankInfo.color || C.gold }}>+{Math.round((_rankInfo.cultivo || 0))}% CULTIVO</span>
      </div>
      <div style={{ marginBottom: 10 }}><EnergiaBarDupla poderInfo={_poderInfo} rankInfo={_rankInfo} /></div>

      {/* Sub-abas do Dashboard */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: C.card, borderRadius: 8, padding: 4 }}>
        {[
          ["overview", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, "Visão Geral"],
          ["progresso", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,3 20.5,8.5 20.5,15.5 12,21 3.5,15.5 3.5,8.5"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3.5" y1="8.5" x2="20.5" y2="15.5"/><line x1="3.5" y1="15.5" x2="20.5" y2="8.5"/></svg>, "Progresso"],
          ["questionarios", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, "Questionários"],
        ].map(([key, icon, label]) => {
          const active = dashSubTab === key;
          return (
            <div
              key={key}
              onClick={() => setDashSubTab(key)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "6px 4px", borderRadius: 6, cursor: "pointer",
                background: active ? C.bg : "transparent",
                color: active ? C.gold : C.tx4,
                border: active ? "0.5px solid " + C.goldBrd : "0.5px solid transparent",
                transition: "background .12s, color .12s, border-color .12s",
              }}
            >
              <span style={{ lineHeight: 1, opacity: active ? 1 : 0.6 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: 0.2 }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Conteúdo das sub-abas Progresso e Questionários */}
      {(dashSubTab === "progresso" || dashSubTab === "questionarios") && (
        <AtributosSection
          atributos={atributos || []}
          setAtributos={setAtributos}
          groqApiKey={groqApiKey}
          subTab={dashSubTab}
        />
      )}

      {dashSubTab !== "overview" && null}
      {dashSubTab === "overview" && <>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 12 }}>
        {[[totalActive, "Ativas", null], ["+" + (profile.xpToday || 0), "Energia hoje", null], ["+" + (profile.coinsToday || 0), "Moedas", null], [profile.streak, "Streak", getMultiplier(profile.streak) > 0 ? "+" + Math.round(getMultiplier(profile.streak)*100) + "%" : null]].map(([v, l, sub], i) => (
          <div key={i} style={{ background: C.card, borderRadius: 6, padding: "7px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: i === 3 ? C.orange : C.tx }}>{v}</div>
            <div style={{ fontSize: 11, color: C.tx3 }}>{l}</div>
            {sub && <div style={{ fontSize: 11, color: C.green, marginTop: 1 }}>{sub}</div>}
          </div>
        ))}
      </div>
      {/* Welcome card — só aparece quando o app está completamente vazio */}
      {projects.length === 0 && routines.length === 0 && tasks.length === 0 && (objectives || []).length === 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid " + C.goldBrd, boxShadow: "0 2px 12px " + C.gold + "18" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 6 }}>Bem-vindo ao Atividades!</div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.6, marginBottom: 12 }}>Este app gamifica seu progresso pessoal. Cada atividade que você cria e conclui gera ENERGIA ⚡ e moedas — desbloqueie conquistas e aumente seu PODER.</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.tx3, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 8 }}>Por onde começar:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {[
              ["1", "Crie um Objetivo", "Uma meta grande de longo prazo", "activities", "objectives"],
              ["2", "Adicione um Projeto ou Rotina", "Atividades que te levam ao objetivo", "activities", "projects"],
              ["3", "Complete e ganhe ENERGIA", "Cada conclusão te faz avançar", null, null],
            ].map(([num, title, desc, tab, sub]) => (
              <div key={num} onClick={tab ? () => nav(tab, sub, "list") : undefined} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: C.bg, borderRadius: 8, cursor: tab ? "pointer" : "default" }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: C.goldDim, border: "1px solid " + C.goldBrd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{num}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: tab ? C.gold : C.tx, marginBottom: 2 }}>{title}{tab && <span style={{ fontSize: 11, color: C.tx4, marginLeft: 4 }}>→</span>}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.tx4, textAlign: "center" }}>Use o ícone <span style={{ color: C.tx3 }}>?</span> em cada lista para saber mais sobre cada tipo de atividade.</div>
        </div>
      )}
      {/* Active effects */}
      {(profile.shieldActive || (profile.boostExpiry && profile.boostExpiry > Date.now())) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {profile.shieldActive && <div style={{ fontSize: 11, color: C.gold, background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 5, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_escudo" size={10} color={C.gold} />{" Escudo"}</div>}
          {profile.boostExpiry && profile.boostExpiry > Date.now() && <div style={{ fontSize: 11, color: C.gold, background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 5, padding: "3px 8px", display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_boost" size={10} color={C.gold} />{" +25%"}</div>}
        </div>
      )}
      {/* V2: Objectives card */}
      {activeObjectives.length > 0 && (
        <Card style={{ marginBottom: 10, borderLeft: "3px solid #534AB7" }}>
          <div onClick={() => nav("activities", "objectives", "list")} style={{ fontSize: 11, color: "#534AB7", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, cursor: "pointer", transition: "opacity .12s" }}>Seus Objetivos</div>
          {activeObjectives.map(o => {
            const actCount = (o.linkedActivities || []).length;
            const projCount = (o.linkedActivities || []).filter(l => l.type === "project").length;
            const routCount = (o.linkedActivities || []).filter(l => l.type === "routine").length;
            return (
              <div key={o.id} onClick={() => nav("activities", "objectives", "detail", o.id, "objective")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: o.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.tx, fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{projCount > 0 ? projCount + " projeto" + (projCount > 1 ? "s" : "") : ""}{projCount > 0 && routCount > 0 ? " · " : ""}{routCount > 0 ? routCount + " rotina" + (routCount > 1 ? "s" : "") : ""}{actCount === 0 ? "Sem vínculos" : ""}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{o.xpMirror.toLocaleString()} ⚡</div>
              </div>
            );
          })}
        </Card>
      )}
      {/* ═══ MISSAO RPG ═══ */}
      {(() => {
        const m = profile.dailyMission;
        const rankColor    = (m?.color)          || C.gold;
        const rankColorSec = (m?.colorSecondary) || C.gold;
        const agora = Date.now();
        const restante = m?.expiresAt ? Math.max(0, m.expiresAt - agora) : 0;
        const horas = Math.floor(restante / 3600000);
        const mins  = Math.floor((restante % 3600000) / 60000);
        const timerStr = restante > 0 ? (horas > 0 ? horas + "h " + mins + "m" : mins + "m") : "Expirando";
        const hasActivities = projects.some(p => p.status === "Ativo") || routines.some(r => r.status === "Ativa") || tasks.some(t => t.status === "Pendente");
        const mExpirada = m && !m.completed && m.expiresAt && agora > m.expiresAt;

        /* ── Sem atividades: não mostra missão ── */
        if (!hasActivities) return null;

        /* ── Sem chave API ── */
        if (!groqApiKey) {
          return (
            <div style={{ marginBottom: 12, borderRadius: 10, padding: "12px 14px", background: C.card, border: "1px solid " + C.brd }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: C.goldDim, border: "1px solid " + C.goldBrd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 3 }}>Missoes personalizadas com IA</div>
                  <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.5, marginBottom: 8 }}>Configure sua chave da API Groq em Configuracoes para receber missoes exclusivas geradas com base nas suas atividades. E gratuito.</div>
                  <div onClick={() => nav("config")} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.gold, cursor: "pointer", padding: "4px 10px", background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    Ir para Configuracoes
                  </div>
                </div>
              </div>
            </div>
          );
        }

        /* ── Gerando ── */
        if (gerandoMissao) {
          return (
            <div style={{ marginBottom: 12, borderRadius: 10, padding: "12px 14px", background: C.card, border: "1px solid " + C.brd, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span style={{ fontSize: 11, color: C.tx3 }}>Gerando missao...</span>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          );
        }

        /* ── Sem missão ativa / expirada / concluída: botão para gerar ── */
        if (!m || mExpirada || m.completed) {
          const labelBtn = m?.completed ? "Gerar nova missao" : mExpirada ? "Missao expirada — gerar nova" : "Gerar missao";
          return (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: C.card, border: "1px solid " + C.brd }}>
              <div style={{ height: 1.5, background: "linear-gradient(90deg," + C.gold + "55,transparent)" }} />
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.tx4, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>Missao RPG</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{m?.completed ? "Missao anterior concluida. Pronto para a proxima?" : "Nenhuma missao ativa no momento."}</div>
                </div>
                <div
                  onClick={() => gerarMissao()}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: C.goldDim, border: "1px solid " + C.goldBrd, cursor: "pointer", flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>{labelBtn}</span>
                </div>
              </div>
            </div>
          );
        }

        /* ── Card compacto (sempre visível no dashboard) ── */
        const cardCompacto = (
          <div
            onClick={() => setShowMissaoDetalhe(true)}
            style={{
              marginBottom: 12, borderRadius: 10, overflow: "hidden",
              background: C.card,
              border: "1px solid " + (m.completed ? C.brd : rankColor + "45"),
              boxShadow: m.completed ? "none" : "0 0 14px " + rankColor + "12",
              cursor: "pointer", transition: "box-shadow .15s",
            }}
          >
            {/* Barra superior cor do rank */}
            <div style={{ height: 2, background: m.completed ? C.brd : "linear-gradient(90deg," + rankColor + "cc,transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
              {/* Emblema + rank ID */}
              <div style={{ flexShrink: 0 }}>
                <RankEmblemSVG rank={m.rankMain} modifier={m.modifier} size={28} color={m.completed ? C.tx4 : rankColor} colorSecondary={m.completed ? C.tx4 : rankColorSec} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: m.completed ? C.tx4 : rankColor, letterSpacing: 0.3 }}>{m.rankId || m.rankMain || "?"}</span>
                  <span style={{ fontSize: 9, color: C.tx4, letterSpacing: 0.8, textTransform: "uppercase" }}>Missao</span>
                </div>
                <div style={{ fontSize: 12, color: m.completed ? C.tx3 : C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.text}</div>
              </div>
              {/* Estado direito */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                {m.completed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <>
                    <span style={{ fontSize: 9, color: C.tx4 }}>{timerStr}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={rankColor + "99"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </>
                )}
              </div>
            </div>
          </div>
        );

        /* ── Modal RPG de detalhe ── */
        /* ── Cantos ornamentais SVG ── */
        const CornerSVG = ({ flip }) => (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ position: "absolute", ...(flip === "tr" ? { top: 0, right: 0, transform: "scaleX(-1)" } : flip === "bl" ? { bottom: 0, left: 0, transform: "scaleY(-1)" } : flip === "br" ? { bottom: 0, right: 0, transform: "scale(-1,-1)" } : { top: 0, left: 0 }) }}>
            <path d="M1 10 L1 1 L10 1" stroke={rankColor + "55"} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );

        const modalDetalhe = showMissaoDetalhe && (
          <div
            onClick={() => setShowMissaoDetalhe(false)}
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 360,
                background: C.card,
                borderRadius: 14,
                border: "1px solid " + rankColor + "45",
                boxShadow: "0 0 0 1px " + rankColor + "15, 0 16px 60px rgba(0,0,0,0.6), 0 0 40px " + rankColor + "18",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Barra topo na cor do rank */}
              <div style={{ height: 3, background: "linear-gradient(90deg," + rankColor + "cc, " + rankColorSec + "55, " + rankColor + "cc)" }} />

              {/* Botão fechar */}
              <div onClick={() => setShowMissaoDetalhe(false)} style={{ position: "absolute", top: 10, right: 10, zIndex: 1, width: 26, height: 26, borderRadius: 13, background: C.bg + "cc", border: "1px solid " + C.brd, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>

              {/* Área central: emblema + rank */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "22px 20px 10px" }}>
                {/* Halo + emblema */}
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(" + rankColor + "25, transparent 70%)", border: "1.5px solid " + rankColor + "35", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px " + rankColor + "20" }}>
                    <RankEmblemSVG rank={m.rankMain} modifier={m.modifier} size={38} color={rankColor} colorSecondary={rankColorSec} />
                  </div>
                </div>
                {/* Rank ID em destaque */}
                <div style={{ fontSize: 22, fontWeight: 900, color: rankColor, letterSpacing: 2, lineHeight: 1, marginBottom: 4 }}>{m.rankId || m.rankMain || "?"}</div>
                <div style={{ fontSize: 9, color: C.tx4, letterSpacing: 2, textTransform: "uppercase" }}>Missao Ativa</div>
              </div>

              {/* Divisor com losango central */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 20px" }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent," + rankColor + "35)" }} />
                <div style={{ width: 5, height: 5, background: rankColor + "80", transform: "rotate(45deg)", flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg," + rankColor + "35,transparent)" }} />
              </div>

              {/* Conteúdo */}
              <div style={{ padding: "0 20px 20px", position: "relative" }}>
                {/* Cantos ornamentais no conteúdo */}
                <div style={{ position: "relative", border: "1px solid " + rankColor + "20", borderRadius: 8, padding: "14px 14px 10px", marginBottom: 14, background: rankColor + "06" }}>
                  <CornerSVG flip="tl" /><CornerSVG flip="tr" /><CornerSVG flip="bl" /><CornerSVG flip="br" />
                  <div style={{ fontSize: 9, color: rankColor, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Objetivo</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, lineHeight: 1.6 }}>{m.text}</div>
                  {m.context && (
                    <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.65, marginTop: 10, paddingTop: 10, borderTop: "1px solid " + rankColor + "20", fontStyle: "italic" }}>{m.context}</div>
                  )}
                </div>

                {/* Recompensas */}
                <div style={{ fontSize: 9, color: C.tx4, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Recompensas</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: rankColor + "10", border: "1px solid " + rankColor + "28", borderRadius: 8, padding: "9px 11px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={rankColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <div>
                      <div style={{ fontSize: 8, color: C.tx4, letterSpacing: 0.5 }}>ENERGIA</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: rankColor, lineHeight: 1.1 }}>+{m.energia || 0}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ width: 16, height: 16, background: C.gold, borderRadius: 8, fontSize: 10, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>$</div>
                    <div>
                      <div style={{ fontSize: 8, color: C.tx4, letterSpacing: 0.5 }}>MOEDAS</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, lineHeight: 1.1 }}>+{m.coins || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Timer + Variar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize: 11, color: C.tx4 }}>Renova em <span style={{ color: C.tx3, fontWeight: 600 }}>{timerStr}</span></span>
                  </div>
                  {!m.completed && (
                    <div onClick={() => { if (!gerandoMissao) gerarMissao({ variacao: true }); }} style={{ display: "flex", alignItems: "center", gap: 4, cursor: gerandoMissao ? "not-allowed" : "pointer", opacity: gerandoMissao ? 0.4 : 1 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.tx3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                      <span style={{ fontSize: 11, color: C.tx3 }}>Variar ideia</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {m.completed ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: C.bg, borderRadius: 10, border: "1px solid " + C.brd }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Missao Concluida</span>
                  </div>
                ) : (
                  <div
                    onClick={() => { claimMissionRpg(); setShowMissaoDetalhe(false); }}
                    style={{
                      width: "100%", padding: "11px 0", borderRadius: 10, textAlign: "center",
                      background: "linear-gradient(135deg," + rankColor + "cc, " + rankColorSec + "aa)",
                      border: "1px solid " + rankColor + "60",
                      boxShadow: "0 4px 20px " + rankColor + "25",
                      cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff",
                      letterSpacing: 0.5,
                    }}
                  >
                    Missao Concluida
                  </div>
                )}
              </div>
            </div>
          </div>
        );

        return <>{cardCompacto}{modalDetalhe}</>;
      })()}
      {/* Chart */}
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.tx2 }}>⚡ ENERGIA por dia</div>
          <div style={{ display: "flex", gap: 3 }}>
            {["7d", "30d", "90d"].map(r => (
              <div key={r} onClick={() => { setChartRange(r); setShowDatePicker(false); }} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", background: chartRange === r && !showDatePicker ? C.goldDim : C.bg, color: chartRange === r && !showDatePicker ? C.gold : C.tx4, border: "0.5px solid " + (chartRange === r && !showDatePicker ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>{r}</div>
            ))}
            <div onClick={() => setShowDatePicker(!showDatePicker)} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer", background: chartRange === "custom" ? C.goldDim : C.bg, color: chartRange === "custom" ? C.gold : C.tx4, border: "0.5px solid " + (chartRange === "custom" ? C.goldBrd : C.brd), transition: "background .12s, color .12s, border-color .12s" }}>Datas</div>
          </div>
        </div>
        {showDatePicker && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, padding: "4px 6px", background: C.bg, border: "1px solid " + C.brd, borderRadius: 4, color: C.tx, fontSize: 11 }} />
            <span style={{ fontSize: 11, color: C.tx3 }}>a</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, padding: "4px 6px", background: C.bg, border: "1px solid " + C.brd, borderRadius: 4, color: C.tx, fontSize: 11 }} />
            <Btn small primary onClick={() => { setChartRange("custom"); setShowDatePicker(false); }}>OK</Btn>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 11, color: C.tx3 }}>
          <span><span style={{ color: C.gold }}>+{totalXpRange}</span> ⚡</span>
          <span><span style={{ color: "#e0a030" }}>+{totalCoinsRange}</span> moedas</span>
          <span>{chartData.length} {chartData.length > 15 ? "semanas" : "dias"}</span>
        </div>
        {chartData.length > 0 ? (
          <svg viewBox={"0 0 " + Math.max(280, chartData.length * 30 + 40) + " 100"} style={{ width: "100%", height: 100 }}>
            {[0, 0.5, 1].map((r, i) => (<line key={i} x1="28" x2={Math.max(275, chartData.length * 30 + 35)} y1={12 + (1 - r) * 62} y2={12 + (1 - r) * 62} stroke={C.brd} strokeWidth="0.5" />))}
            {chartData.map((d, i) => {
              const barW = Math.min(22, Math.max(8, 240 / chartData.length - 2));
              const barH = maxXp > 0 ? Math.max(2, (d.xp || 0) / maxXp * 60) : 2;
              const spacing = Math.max(barW + 4, 260 / chartData.length);
              const x = 33 + i * spacing;
              const isToday = d.date === td();
              return (<g key={i}><rect x={x} y={74 - barH} width={barW} height={barH} rx="2" fill={isToday ? C.gold : C.gold + "80"} />{(d.xp || 0) > 0 && chartData.length <= 15 && (<text x={x + barW / 2} y={74 - barH - 3} textAnchor="middle" fontSize="6" fill={C.tx3}>+{d.xp}</text>)}<text x={x + barW / 2} y={88} textAnchor="middle" fontSize={chartData.length > 10 ? "5" : "6"} fill={isToday ? C.gold : C.tx4}>{d.label || ""}</text></g>);
            })}
            <text x="2" y="16" fontSize="6" fill={C.tx4}>{maxXp}</text>
            <text x="2" y="76" fontSize="6" fill={C.tx4}>0</text>
          </svg>
        ) : (<div style={{ textAlign: "center", padding: 20, fontSize: 11, color: C.tx4 }}>Sem dados neste intervalo</div>)}
      </Card>
      {/* Overview */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.tx }}>Visão geral</div>
        <FilterBtn onClick={() => setShowFilter(true)} active={!!filter.key} />
      </div>
      {allItems.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.tx3, fontSize: 11 }}>Nenhuma atividade ainda.</div>}
      {allItems.map(it => {
        const typeLabel = it._t === "project" ? "Projeto" : it._t === "routine" ? "Rotina" : "Tarefa";
        const typeColor = it._t === "project" ? C.gold : it._t === "routine" ? C.purple : C.orange;
        const subTab = it._t === "project" ? "projects" : it._t === "routine" ? "routines" : "tasks";
        return (
          <Card key={it.id + it._t} onClick={() => nav("activities", subTab, "detail", it.id, it._t)} style={{ borderLeft: "3px solid " + (it.color || C.gold), marginBottom: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.tx }}>{it.name}</span>
              <Badge color={typeColor}>{typeLabel}</Badge>
              {it._t === "project" && it.target !== undefined && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.tx3, flexWrap: "wrap" }}>
              <span style={{ color: C.gold }}>⚡ {it._xp}</span>
              {it._t === "project" && <span>{it._pct}%</span>}
              {it._t === "routine" && it._streak > 0 && <span style={{ color: C.orange }}>{it._streak}</span>}
              {it._mastery && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><MaestriaSVG tier={it._mastery.name} size={14} /><Badge color={it.color || C.gold}>{it._mastery.name}</Badge></span>}
              {it._pri && <span>{it._pri}</span>}
            </div>
          </Card>
        );
      })}
      {showFilter && <FilterModal options={filterOpts} active={filter} onApply={setFilter} onClose={() => setShowFilter(false)} />}
      </>}
    </div>
  );
}

/* ═══ ACTIVITIES TAB ═══ */


export default DashboardTab;

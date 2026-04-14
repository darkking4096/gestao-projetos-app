import { useState, useRef, useEffect, useMemo } from "react";
import { C } from '../temas.js';
import { uid, td, fmtFreq } from '../utilidades.js';

/* ══════════════════════════════════════════════════
   PROMPT DO SISTEMA
══════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `Você é o Assistente de Produtividade do app "Coofe" — um sistema gamificado de gestão pessoal.

SEU ÚNICO PROPÓSITO: Sugerir atividades NOVAS e personalizadas, identificando oportunidades que o usuário ainda não explorou.

REGRAS INVIOLÁVEIS:
1. Responda SEMPRE em português brasileiro
2. Sem emojis em nenhuma parte da resposta — nenhum, em lugar algum
3. NUNCA sugira atividades que já existem — verifique a lista completa de projetos, rotinas e tarefas no contexto e não as replique, mesmo que parcialmente
4. Tarefas listadas como "vinculadas a projetos" pertencem a projetos que já existem — NÃO recrie esses projetos
5. Suas sugestões devem ser ideias NOVAS: complementares, adjacentes, coerentes com o perfil do usuário, mas nunca repetições do que já existe
6. Formato OBRIGATÓRIO de sugestões: SEMPRE exatamente 2 projetos + 1 rotina + 1 tarefa (nessa ordem, 4 itens no total)
7. NÃO responda perguntas ou pedidos fora do escopo de sugestão de atividades
8. Se fora do escopo, responda no formato fora_escopo e redirecione
9. Nunca repita sugestões já recusadas nesta sessão
10. Calibre dificuldades: 1-2 trivial (2-5 min) | 3-4 fácil (15-30 min) | 5-7 moderado (30-90 min) | 8-10 desafiador (2-4h) | 11-14 difícil (dia) | 15-19 épico (semana) | 20 máximo

INSTRUÇÕES DE ANÁLISE DO CONTEXTO:
- Projetos existentes: deduza o perfil do usuário pelos temas, sugira projetos em áreas DIFERENTES ou ângulos ainda não cobertos
- Rotinas existentes: sugira rotinas que potencializem o que existe mas ainda não sejam feitas
- Áreas da vida sem cobertura (saúde, finanças, relações pessoais, hobby): priorize these gaps
- Progresso e streaks: calibre dificuldade pelo nível de disciplina demonstrado
- Tarefas avulsas pendentes: são ações já planejadas, não as repita

FORMATO OBRIGATÓRIO — retorne SOMENTE JSON puro, sem markdown, sem texto fora do JSON:

Para SUGESTOES (obrigatório: 2 projetos + 1 rotina + 1 tarefa, nessa ordem):
{"tipo":"sugestoes","mensagem":"Frase breve motivadora sem emojis","sugestoes":[{"tipo":"project","nome":"Nome do projeto","descricao":"O que e por que e relevante agora","dificuldade":8,"categoria":"Trabalho"},{"tipo":"project","nome":"Nome do segundo projeto","descricao":"O que e por que e relevante agora","dificuldade":7,"categoria":"Estudos"},{"tipo":"routine","nome":"Nome da rotina","descricao":"Habito e por que potencializa o que existe","dificuldade":3,"categoria":"Saude"},{"tipo":"task","nome":"Nome da tarefa","descricao":"Acao concreta e resultado esperado","dificuldade":5,"categoria":"Pessoal"}]}

Para QUESTIONARIO (usuario novo — uma pergunta por vez):
{"tipo":"questionario","mensagem":"Texto introdutorio ou transicao entre perguntas","pergunta":"Pergunta direta","opcoes":["Opcao A","Opcao B","Opcao C","Outra"]}

Para RESPOSTA FORA DO ESCOPO:
{"tipo":"fora_escopo","mensagem":"Mensagem de redirecionamento sem emojis"}

Tipos validos: "task" | "routine" | "project"
Categorias validas: "Saude" | "Trabalho" | "Estudos" | "Pessoal" | "Financas" | "Hobby" | "Social" | "Casa" | "Esportes" | "Outros"

QUESTIONARIO PARA USUARIOS SEM HISTORICO (5 perguntas, uma por vez):
P1: Qual area da sua vida voce mais quer desenvolver agora?
P2: Qual e o seu principal objetivo nos proximos 3 meses?
P3: Quantas horas por dia voce tem disponiveis para atividades pessoais?
P4: Voce prefere projetos estruturados, habitos diarios ou tarefas pontuais?
P5: O que costuma impedir voce de ser mais produtivo?
Apos 5 respostas: retorne EXATAMENTE 2 projetos + 1 rotina + 1 tarefa, altamente personalizados.`;

/* ══════════════════════════════════════════════════
   CHAMADA À API GROQ
══════════════════════════════════════════════════ */
async function callGroq(apiKey, messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.65,
      max_tokens: 2000
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}${errText ? " — " + errText.slice(0, 120) : ""}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseAIResponse(raw) {
  try {
    let cleaned = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
    return JSON.parse(cleaned);
  } catch {
    return { tipo: "erro", mensagem: raw };
  }
}

/* ══════════════════════════════════════════════════
   CONSTRUÇÃO DO CONTEXTO DO USUÁRIO
   Lista tudo que existe para a IA NÃO repetir
══════════════════════════════════════════════════ */
function buildUserContext(projects, routines, tasks, profile) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const dailyLog = profile.dailyLog || [];
  const recentLog = dailyLog.filter(d => d.date >= weekAgoStr);
  const weekXp = recentLog.reduce((s, d) => s + (d.xp || 0), 0);
  const activeDays = recentLog.filter(d => (d.xp || 0) > 0).length;

  const activeProjects = projects.filter(p => p.status === "Ativo");
  const activeRoutines = routines.filter(r => r.status === "Ativa");
  const pendingTasks = tasks.filter(t => t.status === "Pendente");
  const doneTasks = tasks.filter(t => t.status === "Concluída" && (t.completedAt || "") >= weekAgoStr);

  const routineCompletions = activeRoutines.flatMap(r =>
    (r.completionLog || []).filter(l => l.date >= weekAgoStr).map(() => r.name)
  );

  // Tarefas dentro das fases dos projetos (importante: mostrar que o projeto já existe)
  const projectTasks = activeProjects.flatMap(p =>
    (p.phases || []).flatMap(ph =>
      (ph.tasks || []).map(t => ({ name: t.name || t.title || "", projectName: p.name }))
    )
  );

  const lines = [
    "=== PERFIL DO USUARIO ===",
    `Energia acumulada: ${(profile.totalXp || 0).toLocaleString()} XP | Streak: ${profile.streak || 0} dias | Total de tarefas concluidas: ${profile.tasksCompleted || 0}`,
    `Semana atual: ${weekXp} XP | ${activeDays}/7 dias ativos | ${routineCompletions.length} conclusoes de rotinas | ${doneTasks.length} tarefas avulsas concluidas`,
    "",
    "=== PROJETOS JA EXISTENTES — NAO SUGIRA ESTES NEM SIMILARES ===",
    ...activeProjects.map(p =>
      `- "${p.name}" | ${p.progress || 0}% concluido${p.objective ? ` | objetivo: ${p.objective.slice(0, 80)}` : ""}`
    ),
    activeProjects.length === 0 ? "- Nenhum projeto ativo" : "",
    "",
    "=== ROTINAS JA EXISTENTES — NAO SUGIRA ESTAS NEM SIMILARES ===",
    ...activeRoutines.map(r => {
      const compThisWeek = routineCompletions.filter(n => n === r.name).length;
      return `- "${r.name}" | ${fmtFreq(r)} | streak ${r.streak || 0}d | concluiu ${compThisWeek}x esta semana`;
    }),
    activeRoutines.length === 0 ? "- Nenhuma rotina ativa" : "",
    "",
    "=== TAREFAS AVULSAS PENDENTES — NAO SUGIRA ESTAS ===",
    ...pendingTasks.slice(0, 12).map(t =>
      `- "${t.name}"${t.category ? ` [${t.category}]` : ""}${t.difficulty ? ` | dif ${t.difficulty}` : ""}`
    ),
    pendingTasks.length === 0 ? "- Nenhuma" : "",
    "",
    "=== TAREFAS VINCULADAS A PROJETOS (os projetos ja existem — nao recrie) ===",
    ...projectTasks.slice(0, 15).map(t => `- "${t.name}" (pertence ao projeto: "${t.projectName}")`),
    projectTasks.length === 0 ? "- Nenhuma" : "",
    "",
    "=== INSTRUCAO FINAL ===",
    "Sugira exatamente 2 projetos NOVOS, 1 rotina NOVA e 1 tarefa NOVA.",
    "As sugestoes devem ser ideias que este usuario ainda nao tem.",
    "Identifique gaps: areas da vida nao cobertas, proximos passos logicos, oportunidades adjacentes ao que ja existe.",
    "Baseie-se no perfil deducido pelos projetos existentes para garantir coerencia."
  ];

  return lines.filter(l => l !== "").join("\n");
}

/* ══════════════════════════════════════════════════
   CARD DE SUGESTÃO (convite aceitar/recusar)
══════════════════════════════════════════════════ */
function SuggestionCard({ suggestion, onAccept, onReject, accepted }) {
  const typeLabel = { task: "TAREFA", routine: "ROTINA", project: "PROJETO" }[suggestion.tipo] || "ATIVIDADE";
  const typeColor = { task: C.orange, routine: C.purple, project: C.gold }[suggestion.tipo] || C.gold;
  const [hA, setHA] = useState(false);
  const [hR, setHR] = useState(false);

  if (accepted) {
    return (
      <div style={{
        background: C.card, border: "1px solid " + C.green + "40", borderLeft: "3px solid " + C.green,
        borderRadius: 10, padding: "10px 12px", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 8, opacity: 0.6
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <div style={{ fontSize: 11, color: C.tx3 }}>
          <span style={{ color: C.green, fontWeight: 600 }}>{typeLabel}</span> "{suggestion.nome}" adicionado!
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.card, border: "1px solid " + typeColor + "35",
      borderLeft: "3px solid " + typeColor, borderRadius: 10,
      padding: "10px 12px", marginBottom: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 1, color: typeColor,
          textTransform: "uppercase", background: typeColor + "18",
          padding: "2px 7px", borderRadius: 4
        }}>{typeLabel}</span>
        <span style={{ fontSize: 9, color: C.tx4 }}>Dif. {suggestion.dificuldade}</span>
        {suggestion.categoria && <span style={{ fontSize: 9, color: C.tx4 }}>· {suggestion.categoria}</span>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 3 }}>{suggestion.nome}</div>
      <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.55, marginBottom: 9 }}>{suggestion.descricao}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onMouseEnter={() => setHA(true)} onMouseLeave={() => setHA(false)}
          onClick={onAccept}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: hA ? C.gold + "25" : C.goldDim, color: C.gold,
            border: "1px solid " + C.goldBrd, cursor: "pointer",
            transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Aceitar
        </button>
        <button
          onMouseEnter={() => setHR(true)} onMouseLeave={() => setHR(false)}
          onClick={onReject}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: hR ? "#ffffff08" : "transparent", color: C.tx4,
            border: "1px solid " + C.brd, cursor: "pointer",
            transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Recusar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — CHAT IA
══════════════════════════════════════════════════ */
export default function ChatIA({
  projects, routines, tasks, profile,
  groqApiKey, setTasks, setRoutines, setProjects,
  onClose, isDesktop
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [qaCount, setQaCount] = useState(0);
  const [qaAnswers, setQaAnswers] = useState([]);
  const [currentQa, setCurrentQa] = useState(null);
  const [rejectedNames, setRejectedNames] = useState(new Set());
  const [cardStates, setCardStates] = useState({});
  const messagesEndRef = useRef(null);
  const conversationRef = useRef([]);
  const currentQaRef = useRef(null);
  const qaCountRef = useRef(0);
  const qaAnswersRef = useRef([]);

  const hasHistory = useMemo(() => {
    return tasks.length > 0 || routines.length > 0 || projects.length > 0;
  }, [tasks, routines, projects]);

  useEffect(() => { currentQaRef.current = currentQa; }, [currentQa]);
  useEffect(() => { qaCountRef.current = qaCount; }, [qaCount]);
  useEffect(() => { qaAnswersRef.current = qaAnswers; }, [qaAnswers]);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages, loading]);

  const addMsg = (role, content, meta = null) => {
    const id = uid();
    setMessages(prev => [...prev, { id, role, content, meta, ts: Date.now() }]);
    return id;
  };

  const sendToGroq = async (userText, autoPrompt = null) => {
    setLoading(true);
    try {
      const history = conversationRef.current;
      const userContent = autoPrompt || userText;
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userContent }
      ];
      conversationRef.current = [...history, { role: "user", content: userContent }];

      const raw = await callGroq(groqApiKey, apiMessages);
      conversationRef.current = [...conversationRef.current, { role: "assistant", content: raw }];

      const parsed = parseAIResponse(raw);

      if (parsed.tipo === "sugestoes") {
        const valid = (parsed.sugestoes || []).filter(s => !rejectedNames.has(s.nome));
        const msgId = uid();
        const initialStates = {};
        valid.forEach(s => { initialStates[msgId + "_" + s.nome] = "pending"; });
        setCardStates(prev => ({ ...prev, ...initialStates }));
        addMsg("assistant", parsed.mensagem || "", { tipo: "sugestoes", sugestoes: valid, msgId });
      } else if (parsed.tipo === "questionario") {
        const qa = { pergunta: parsed.pergunta, opcoes: parsed.opcoes || [] };
        setCurrentQa(qa);
        addMsg("assistant", (parsed.mensagem ? parsed.mensagem + "\n\n" : "") + parsed.pergunta, { tipo: "questionario", opcoes: parsed.opcoes || [] });
      } else if (parsed.tipo === "fora_escopo") {
        addMsg("assistant", parsed.mensagem || "Este chat e focado em sugestao de atividades.");
      } else {
        addMsg("assistant", parsed.mensagem || raw);
      }
    } catch (e) {
      addMsg("assistant", "Erro ao conectar com a IA. Verifique sua chave Groq em Configuracoes. " + (e.message || ""));
    }
    setLoading(false);
  };

  const handleStart = async () => {
    setStarted(true);
    if (!groqApiKey) {
      addMsg("assistant", "Chave da API Groq nao configurada. Va em Perfil > Configuracoes e insira sua chave Groq gratuita para usar este assistente.");
      return;
    }
    if (hasHistory) {
      const ctx = buildUserContext(projects, routines, tasks, profile);
      const prompt = `Analise o contexto abaixo e sugira exatamente 2 projetos novos, 1 rotina nova e 1 tarefa nova. Foque em oportunidades que este usuario ainda nao explorou, coerentes com seu perfil.\n\n${ctx}`;
      addMsg("user", "Quero sugestoes baseadas no meu historico");
      await sendToGroq(null, prompt);
    } else {
      await sendToGroq(null, "O usuario e novo e nao tem nenhuma atividade ainda. Inicie o questionario com a pergunta 1.");
    }
  };

  const handleSend = async (textOverride = null) => {
    const text = textOverride ?? input.trim();
    if (!text || loading) return;
    if (!textOverride) setInput("");

    addMsg("user", text);

    const qa = currentQaRef.current;
    const count = qaCountRef.current + 1;
    const answers = [...qaAnswersRef.current, { pergunta: qa?.pergunta || "", resposta: text }];

    if (qa) {
      setCurrentQa(null);
      setQaCount(count);
      setQaAnswers(answers);

      if (count >= 5) {
        const ctx = answers.map((a, i) => `P${i + 1}: ${a.pergunta}\nR: ${a.resposta}`).join("\n\n");
        await sendToGroq(null, `${text}\n\n=== RESPOSTAS DO QUESTIONARIO ===\n${ctx}\n\nCom base em todas as respostas, sugira exatamente 2 projetos novos, 1 rotina nova e 1 tarefa nova, altamente personalizados.`);
      } else {
        await sendToGroq(text);
      }
    } else {
      await sendToGroq(text);
    }
  };

  const handleAccept = (key, suggestion) => {
    setCardStates(prev => ({ ...prev, [key]: "accepted" }));
    const newId = uid();
    const now = td();

    if (suggestion.tipo === "task") {
      setTasks(prev => [...prev, {
        id: newId, name: suggestion.nome,
        description: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        status: "Pendente", createdAt: now
      }]);
    } else if (suggestion.tipo === "routine") {
      setRoutines(prev => [...prev, {
        id: newId, name: suggestion.nome,
        description: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        freq: "Diária", days: [],
        createdAt: now, status: "Ativa",
        xpAccum: 0, streak: 0, bestStreak: 0,
        totalCompletions: 0, consecutiveFails: 0, completionLog: []
      }]);
    } else if (suggestion.tipo === "project") {
      setProjects(prev => [...prev, {
        id: newId, name: suggestion.nome,
        objective: suggestion.descricao || "",
        difficulty: suggestion.dificuldade || 5,
        category: suggestion.categoria || "",
        color: C.gold, phases: [],
        createdAt: now, status: "Ativo",
        xpAccum: 0, progress: 0
      }]);
    }
  };

  const handleReject = (key, suggestion) => {
    setCardStates(prev => ({ ...prev, [key]: "rejected" }));
    setRejectedNames(prev => new Set([...prev, suggestion.nome]));
  };

  /* Ícone SVG do assistente (estrela/sparkle) */
  const SparkleIcon = ({ size = 16, color = C.gold }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );

  const panelStyle = isDesktop ? {
    position: "fixed", right: 0, top: 0, bottom: 0,
    width: 420, zIndex: 300,
    background: C.bg, borderLeft: "0.5px solid " + C.brd,
    display: "flex", flexDirection: "column",
    boxShadow: "-6px 0 32px #00000050"
  } : {
    position: "fixed", inset: 0, zIndex: 500,
    background: C.bg, display: "flex", flexDirection: "column"
  };

  return (
    <>
      {isDesktop && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, zIndex: 299,
          background: "#00000045", backdropFilter: "blur(2px)"
        }} />
      )}
      <style>{`
        @keyframes iaTyping{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}}
        @keyframes iaSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ia-msg{animation:iaSlide .2s ease}
        .ia-opt-btn:hover{background:${C.card}!important}
        .ia-opt-btn:active{opacity:.75}
      `}</style>

      <div style={panelStyle}>
        {/* ── Header ── */}
        <div style={{
          padding: "13px 16px", flexShrink: 0,
          borderBottom: "0.5px solid " + C.brd,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 17, flexShrink: 0,
            background: C.goldDim, border: "1px solid " + C.goldBrd,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <SparkleIcon size={16} color={C.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.tx }}>Assistente IA</div>
            <div style={{ fontSize: 10, color: C.tx4 }}>Sugestoes personalizadas de atividades</div>
          </div>
          <span onClick={onClose} style={{ cursor: "pointer", padding: "4px", color: C.tx3, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </div>

        {/* ── Tela de boas-vindas ── */}
        {!started && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflowY: "auto" }}>
            <div style={{
              background: C.card, border: "1px solid " + C.brd,
              borderRadius: 12, padding: 16, marginBottom: 14
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 8 }}>O que este chat faz</div>
              <div style={{ fontSize: 11, color: C.tx3, lineHeight: 1.7, marginBottom: 4 }}>
                Analisa seu historico e sugere <strong style={{ color: C.tx2 }}>tarefas, rotinas e projetos</strong> personalizados para voce evoluir no que importa.
              </div>
              <div style={{ fontSize: 11, color: C.tx4, lineHeight: 1.6 }}>
                Cada sugestao aparece como um convite — voce escolhe aceitar ou recusar.
              </div>
            </div>

            {/* Tipos de sugestão — com SVG */}
            {[
              {
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
                label: "TAREFA", desc: "Acao pontual e imediata", color: C.orange
              },
              {
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
                label: "ROTINA", desc: "Habito recorrente que voce repete", color: C.purple
              },
              {
                svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
                label: "PROJETO", desc: "Meta maior com varias etapas", color: C.gold
              },
            ].map(({ svg, label, desc, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", background: C.card, borderRadius: 8,
                border: "0.5px solid " + C.brd, marginBottom: 6
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: color + "18", border: "0.5px solid " + color + "40",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color
                }}>
                  {svg}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.8 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.tx3 }}>{desc}</div>
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 8, padding: "8px 12px", background: C.card,
              border: "0.5px solid " + C.brd2, borderRadius: 8,
              fontSize: 10, color: C.tx4, lineHeight: 1.6
            }}>
              Este chat nao responde perguntas gerais — e focado exclusivamente em sugerir atividades novas para o seu crescimento.
            </div>

            <div style={{ flex: 1 }} />

            {!groqApiKey ? (
              <div style={{
                padding: "10px 14px", background: C.card,
                border: "1px solid " + C.orange + "50", borderRadius: 10,
                fontSize: 11, color: C.orange, lineHeight: 1.6, textAlign: "center"
              }}>
                Configure sua chave da API Groq em <strong>Perfil &gt; Configuracoes</strong> para usar este assistente.
              </div>
            ) : (
              <button
                onClick={handleStart}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: C.goldDim, color: C.gold,
                  border: "1px solid " + C.goldBrd,
                  transition: "filter .12s", letterSpacing: 0.3
                }}>
                {hasHistory ? "Analisar meu historico" : "Responder questionario"}
              </button>
            )}
          </div>
        )}

        {/* ── Área de mensagens ── */}
        {started && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
              {messages.map(msg => (
                <div key={msg.id} className="ia-msg">
                  {msg.role === "user" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 12px",
                        borderRadius: "12px 12px 3px 12px",
                        background: C.goldDim, border: "1px solid " + C.goldBrd,
                        fontSize: 11, color: C.tx, lineHeight: 1.55
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  )}

                  {msg.role === "assistant" && (
                    <div style={{ marginBottom: 10 }}>
                      {msg.content && (
                        <div style={{
                          display: "inline-block", maxWidth: "88%",
                          padding: "8px 12px", borderRadius: "12px 12px 12px 3px",
                          background: C.card, border: "0.5px solid " + C.brd,
                          fontSize: 11, color: C.tx2, lineHeight: 1.6,
                          marginBottom: msg.meta?.tipo === "sugestoes" ? 10 : (msg.meta?.tipo === "questionario" ? 8 : 0),
                          whiteSpace: "pre-wrap"
                        }}>
                          {msg.content}
                        </div>
                      )}

                      {/* Opções do questionário */}
                      {msg.meta?.tipo === "questionario" && msg.meta.opcoes?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          {msg.meta.opcoes.map((opt, i) => (
                            <button
                              key={i}
                              className="ia-opt-btn"
                              onClick={() => handleSend(opt)}
                              style={{
                                padding: "7px 12px", borderRadius: 7, fontSize: 11,
                                textAlign: "left", background: C.bg, color: C.tx3,
                                border: "0.5px solid " + C.brd, cursor: "pointer",
                                transition: "background .12s"
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Cards de sugestão */}
                      {msg.meta?.tipo === "sugestoes" && (msg.meta.sugestoes || []).map(s => {
                        const key = msg.meta.msgId + "_" + s.nome;
                        const state = cardStates[key];
                        if (state === "rejected") return null;
                        return (
                          <SuggestionCard
                            key={key}
                            suggestion={s}
                            accepted={state === "accepted"}
                            onAccept={() => handleAccept(key, s)}
                            onReject={() => handleReject(key, s)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: 5, padding: "6px 0", marginBottom: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: 4,
                      background: C.gold + "90",
                      animation: `iaTyping 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div style={{
              padding: "10px 12px", flexShrink: 0,
              borderTop: "0.5px solid " + C.brd,
              display: "flex", gap: 8, alignItems: "flex-end"
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={currentQa ? "Digite sua resposta ou escolha acima..." : "Peca mais sugestoes ou refine..."}
                rows={1}
                style={{
                  flex: 1, padding: "8px 10px",
                  background: C.card, border: "1px solid " + C.brd2,
                  borderRadius: 8, color: C.tx, fontSize: 11,
                  fontFamily: "inherit", outline: "none", resize: "none",
                  lineHeight: 1.5, maxHeight: 80, overflowY: "auto"
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: input.trim() && !loading ? C.goldDim : "transparent",
                  border: "1px solid " + (input.trim() && !loading ? C.goldBrd : C.brd),
                  color: input.trim() && !loading ? C.gold : C.tx4,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .12s, color .12s, border-color .12s"
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

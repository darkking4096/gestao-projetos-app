import { fmtFreq, isRoutineDueOn, td } from './utilidades.js';

const PLANNER_SYSTEM_PROMPT = `Voce e o interpretador de planejamento diario do app Coofe.

Seu trabalho e transformar o texto livre do usuario em acoes estruturadas para o app.

Regras:
- Responda somente JSON puro.
- Use portugues brasileiro.
- Nao use emoji.
- O texto do usuario e a fonte principal.
- Nao invente atividades fora do que foi dito.
- Pode sugerir rotina/projeto quando houver indicio claro no texto ou padrao no historico, mas marque como sugestao opcional.
- Se a atividade ja existe, retorne already_exists.
- Se o usuario mencionar data relativa, converta para data absoluta considerando a data atual e timezone informados.
- Se o usuario mencionar projeto existente, prefira create_project_task.
- Para create_project_task, preencha projectId e phaseId quando conseguir identificar no contexto.
- Para suggest_routine, use frequency quando conseguir inferir uma frequencia clara.
- Se houver ambiguidade, use confidence baixa e explique no reason.
- Nunca mande criar automaticamente. O app vai pedir aprovacao.

Acoes validas:
- create_task
- create_project_task
- create_routine
- create_project
- already_exists
- suggest_routine
- suggest_project

Retorne exatamente este formato:
{
  "tipo": "planejamento_diario",
  "resumo": "Resumo curto em portugues.",
  "acoes": [
    {
      "action": "create_task",
      "name": "Nome claro",
      "description": "Descricao curta",
      "targetDate": "YYYY-MM-DD",
      "targetTime": "HH:mm",
      "category": "Trabalho",
      "priority": "Media",
      "difficulty": 3,
      "projectId": "",
      "projectName": "",
      "phaseId": "",
      "phaseName": "",
      "frequency": "Livre",
      "frequencyDays": [],
      "existingId": "",
      "existingType": "",
      "confidence": "alta",
      "reason": "Motivo da classificacao.",
      "originText": "Trecho original"
    }
  ]
}`;

function stripCodeFences(raw) {
  return String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractJsonObject(raw) {
  const cleaned = stripCodeFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function addDays(dateStr, days) {
  const date = new Date((dateStr || td()) + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function compactText(value, max = 160) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  return text.length > max ? text.slice(0, max - 1) + "..." : text;
}

function normalizeStatus(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPendingStatus(value) {
  return normalizeStatus(value) === "pendente";
}

function isDoneStatus(value) {
  return normalizeStatus(value) === "concluida";
}

function isActiveProject(project) {
  return !project?.status || normalizeStatus(project.status) === "ativo";
}

function isActiveRoutine(routine) {
  return normalizeStatus(routine?.status || "Ativa") === "ativa";
}

function isActiveObjective(objective) {
  return normalizeStatus(objective?.status || "Ativo") === "ativo";
}

function sortByDateDesc(a, b) {
  return (b.date || "").localeCompare(a.date || "");
}

function buildRecentHistory({ tasks, projects, routines, profile, sinceDate, planDate }) {
  const events = [];

  (profile?.dailyLog || []).forEach(log => {
    if (!log?.date || log.date < sinceDate || log.date > planDate) return;
    events.push({
      date: log.date,
      type: "daily_log",
      name: "Resumo do dia",
      xp: log.xp || 0,
      coins: log.coins || 0,
    });
  });

  (tasks || []).forEach(task => {
    const taskCreatedDate = task.createdAt ? task.createdAt.slice(0, 10) : "";
    if (taskCreatedDate && taskCreatedDate >= sinceDate && taskCreatedDate <= planDate) {
      events.push({
        date: taskCreatedDate,
        type: "task_created",
        id: task.id || "",
        name: compactText(task.name),
        deadline: task.deadline || "",
        category: task.category || "",
      });
    }
    if (isDoneStatus(task.status) && task.completedAt && task.completedAt >= sinceDate && task.completedAt <= planDate) {
      events.push({
        date: task.completedAt.slice(0, 10),
        type: "task_completed",
        id: task.id || "",
        name: compactText(task.name),
        difficulty: task.difficulty || 1,
        category: task.category || "",
      });
    }
  });

  (projects || []).forEach(project => {
    (project.phases || []).forEach(phase => {
      (phase.tasks || []).forEach(task => {
        const taskCreatedDate = task.createdAt ? task.createdAt.slice(0, 10) : "";
        if (taskCreatedDate && taskCreatedDate >= sinceDate && taskCreatedDate <= planDate) {
          events.push({
            date: taskCreatedDate,
            type: "project_task_created",
            id: task.id || "",
            name: compactText(task.name),
            projectId: project.id || "",
            projectName: compactText(project.name, 80),
            phaseName: compactText(phase.name, 80),
            deadline: task.deadline || "",
          });
        }
        if (isDoneStatus(task.status) && task.completedAt && task.completedAt >= sinceDate && task.completedAt <= planDate) {
          events.push({
            date: task.completedAt.slice(0, 10),
            type: "project_task_completed",
            id: task.id || "",
            name: compactText(task.name),
            projectId: project.id || "",
            projectName: compactText(project.name, 80),
            phaseName: compactText(phase.name, 80),
            difficulty: task.difficulty || 1,
          });
        }
      });
    });
  });

  (routines || []).forEach(routine => {
    (routine.completionLog || []).forEach(log => {
      if (!log?.date || log.date < sinceDate || log.date > planDate) return;
      events.push({
        date: log.date,
        type: "routine_completed",
        id: routine.id || "",
        name: compactText(routine.name),
        xp: log.xp || 0,
        coins: log.coins || 0,
      });
    });
  });

  return events.sort(sortByDateDesc).slice(0, 30);
}

export function buildDailyPlannerContext({
  projects = [],
  routines = [],
  tasks = [],
  objectives = [],
  profile = {},
  currentPlan = {},
  planDate = td(),
} = {}) {
  const sinceDate = addDays(planDate, -6);
  const activeProjects = (projects || []).filter(isActiveProject);
  const activeRoutines = (routines || []).filter(isActiveRoutine);
  const activeObjectives = (objectives || []).filter(isActiveObjective);
  const pendingTasks = (tasks || []).filter(task => isPendingStatus(task.status || "Pendente"));

  const pendingProjectTasks = activeProjects.flatMap(project =>
    (project.phases || []).flatMap(phase =>
      (phase.tasks || [])
        .filter(task => isPendingStatus(task.status || "Pendente"))
        .map(task => ({
          id: task.id || "",
          name: compactText(task.name),
          projectId: project.id || "",
          projectName: compactText(project.name, 80),
          phaseId: phase.id || "",
          phaseName: compactText(phase.name, 80),
          deadline: task.deadline || "",
          time: task.deadlineTime || "",
          priority: task.priority || "",
          difficulty: task.difficulty || 1,
          category: task.category || project.category || "",
        }))
    )
  );

  const currentCards = currentPlan.actionCards || [];
  const cardDecision = status => currentCards
    .filter(card => normalizeStatus(card.status || "pending") === status)
    .map(card => ({
      id: card.id || "",
      action: card.action || "",
      name: compactText(card.name),
      targetDate: card.targetDate || "",
      targetTime: card.targetTime || "",
      existingId: card.existingId || "",
      existingType: card.existingType || "",
      createdRef: card.createdRef || null,
      reason: compactText(card.reason, 120),
    }));

  return {
    periodo: {
      dataAtual: planDate,
      inicioHistorico: sinceDate,
      dias: 7,
    },
    perfil: {
      energiaTotal: profile.totalXp || 0,
      streak: profile.streak || 0,
      tarefasConcluidas: profile.tasksCompleted || 0,
      projetosConcluidos: profile.projectsCompleted || 0,
    },
    projetosAtivos: activeProjects.slice(0, 20).map(project => ({
      id: project.id || "",
      name: compactText(project.name),
      objective: compactText(project.objective || project.description, 180),
      status: project.status || "Ativo",
      progress: project.progress || 0,
      category: project.category || "",
      priority: project.priority || "",
      deadline: project.deadline || "",
      phases: (project.phases || []).slice(0, 8).map(phase => ({
        id: phase.id || "",
        name: compactText(phase.name, 80),
        status: phase.status || "",
      })),
    })),
    tarefasProjetoPendentes: pendingProjectTasks.slice(0, 40),
    tarefasAvulsasPendentes: pendingTasks.slice(0, 30).map(task => ({
      id: task.id || "",
      name: compactText(task.name),
      description: compactText(task.description, 180),
      deadline: task.deadline || "",
      time: task.deadlineTime || "",
      priority: task.priority || "",
      difficulty: task.difficulty || 1,
      category: task.category || "",
      createdAt: task.createdAt || "",
    })),
    rotinasAtivas: activeRoutines.slice(0, 30).map(routine => {
      const completions7d = (routine.completionLog || []).filter(log =>
        log?.date && log.date >= sinceDate && log.date <= planDate
      );
      return {
        id: routine.id || "",
        name: compactText(routine.name),
        description: compactText(routine.description, 180),
        frequency: fmtFreq(routine),
        dueOnPlanDate: isRoutineDueOn(routine, planDate),
        notificationTime: routine.notificationTime || "",
        priority: routine.priority || "",
        difficulty: routine.difficulty || 1,
        category: routine.category || "",
        streak: routine.streak || 0,
        completionsLast7Days: completions7d.map(log => log.date),
      };
    }),
    objetivosAtivos: activeObjectives.slice(0, 20).map(objective => ({
      id: objective.id || "",
      name: compactText(objective.name),
      purpose: compactText(objective.purpose || objective.description, 180),
      linkedActivitiesCount: (objective.linkedActivities || []).length,
      linkedObjectivesCount: (objective.linkedObjectives || []).length,
    })),
    historicoUltimos7Dias: buildRecentHistory({ tasks, projects, routines, profile, sinceDate, planDate }),
    decisoesDoPlanoAtual: {
      pendentes: cardDecision("pending"),
      aceitas: cardDecision("accepted"),
      editadas: cardDecision("edited"),
      recusadas: cardDecision("rejected"),
      itensCriados: currentPlan.createdItemRefs || [],
    },
  };
}

function normalizeAction(action) {
  const validActions = new Set([
    "create_task",
    "create_project_task",
    "create_routine",
    "create_project",
    "already_exists",
    "suggest_routine",
    "suggest_project",
  ]);
  const validConfidence = new Set(["alta", "media", "baixa"]);
  const rawAction = normalizeText(action?.action);
  const rawConfidence = normalizeText(action?.confidence).toLowerCase();

  return {
    action: validActions.has(rawAction) ? rawAction : "create_task",
    name: normalizeText(action?.name),
    description: normalizeText(action?.description),
    targetDate: normalizeText(action?.targetDate),
    targetTime: normalizeText(action?.targetTime),
    category: normalizeText(action?.category) || "Outros",
    priority: normalizeText(action?.priority) || "Media",
    difficulty: Number.isFinite(Number(action?.difficulty)) ? Number(action.difficulty) : 3,
    projectId: normalizeText(action?.projectId),
    projectName: normalizeText(action?.projectName),
    phaseId: normalizeText(action?.phaseId),
    phaseName: normalizeText(action?.phaseName),
    frequency: normalizeText(action?.frequency),
    frequencyDays: Array.isArray(action?.frequencyDays) ? action.frequencyDays.map(normalizeText).filter(Boolean) : [],
    existingId: normalizeText(action?.existingId),
    existingType: normalizeText(action?.existingType),
    confidence: validConfidence.has(rawConfidence) ? rawConfidence : "media",
    reason: normalizeText(action?.reason),
    originText: normalizeText(action?.originText),
  };
}

export function parsePlannerResponse(raw) {
  try {
    const parsed = JSON.parse(extractJsonObject(raw));
    const acoes = Array.isArray(parsed?.acoes) ? parsed.acoes.map(normalizeAction) : [];
    return {
      ok: true,
      data: {
        tipo: parsed?.tipo === "planejamento_diario" ? "planejamento_diario" : "planejamento_diario",
        resumo: normalizeText(parsed?.resumo) || "Texto interpretado.",
        acoes,
      },
      raw,
      error: "",
    };
  } catch (e) {
    return {
      ok: false,
      data: null,
      raw,
      error: e?.message || "Resposta invalida.",
    };
  }
}

export function buildPlannerMessages({
  text,
  planDate,
  timezone,
  recentMessages = [],
  actionCards = [],
  projects = [],
  routines = [],
  tasks = [],
  objectives = [],
  profile = {},
  currentPlan = {},
}) {
  const compactHistory = recentMessages.slice(-8).map(m => ({
    role: m.role,
    content: String(m.content || "").slice(0, 1000),
    createdAt: m.createdAt || "",
  }));
  const appContext = buildDailyPlannerContext({
    projects,
    routines,
    tasks,
    objectives,
    profile,
    currentPlan: {
      ...currentPlan,
      actionCards: currentPlan.actionCards || actionCards,
    },
    planDate,
  });

  return [
    { role: "system", content: PLANNER_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        dataAtual: planDate,
        timezone,
        textoOriginal: text,
        historicoRecenteDoPlano: compactHistory,
        contextoDoApp: appContext,
      }),
    },
  ];
}

export async function requestDailyPlan(apiKey, context) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: buildPlannerMessages(context),
      temperature: 0.2,
      max_tokens: 2400,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}${errText ? " - " + errText.slice(0, 160) : ""}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parsePlannerResponse(raw);
}

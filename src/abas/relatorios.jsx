import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { C } from '../temas.js';
import { COLORS, FREQUENCIES } from '../constantes.js';
import { uid, td, fmtD } from '../utilidades.js';
import { Modal, Btn } from '../componentes-base.jsx';
import { requestDailyPlan } from '../planejamento-ia.js';

const pad2 = (value) => String(value).padStart(2, "0");
const PLANNER_DRAFTS_KEY = "coofe:dailyPlanDrafts";

function readPlannerDrafts() {
  try {
    return JSON.parse(window.localStorage.getItem(PLANNER_DRAFTS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getPlannerNow() {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return {
    date,
    time,
    dateTime: `${date}T${time}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
  };
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function avoidPastPlannerTime(action, planDate, plannerNow) {
  const targetDate = String(action.targetDate || planDate || "").slice(0, 10);
  const targetMinutes = timeToMinutes(action.targetTime);
  const currentMinutes = timeToMinutes(plannerNow.time);
  if (!targetDate || targetDate !== plannerNow.date || targetMinutes === null || currentMinutes === null || targetMinutes > currentMinutes) {
    return { ...action, targetDate: action.targetDate || targetDate };
  }

  const shiftedMinutes = targetMinutes + 12 * 60;
  if (shiftedMinutes > currentMinutes && shiftedMinutes < 24 * 60) {
    const shiftedTime = minutesToTime(shiftedMinutes);
    return {
      ...action,
      targetDate,
      targetTime: shiftedTime,
      reason: [action.reason, `Horario ajustado para ${shiftedTime} porque ${action.targetTime} ja passou hoje.`].filter(Boolean).join(" "),
    };
  }

  return {
    ...action,
    targetDate,
    targetTime: "",
    confidence: action.confidence === "alta" ? "media" : action.confidence,
    reason: [action.reason, `Horario removido porque ${action.targetTime} ja passou hoje.`].filter(Boolean).join(" "),
  };
}

/*
  RELATÓRIOS — Sistema de Notas
  ─────────────────────────────
  IMPORTANTE: renderSidebar() e renderEditor() são FUNÇÕES (não componentes).
  Isso evita que o React desmonte/remonte o <textarea> a cada tecla digitada,
  o que causava perda de foco.
*/

export default function ReportsTab({
  notes,
  folders,
  onUpdateNotes,
  onUpdateFolders,
  groqApiKey = "",
  projects = [],
  routines = [],
  tasks = [],
  objectives = [],
  profile = {},
  onCreateTask,
  onCreateProjectTask,
  onCreateRoutine,
  onCreateProject,
}) {
  /* ── Estado ── */
  const [selNoteId, setSelNoteId]         = useState(null);
  const [selFolderId, setSelFolderId]     = useState(null);
  const [mobileView, setMobileView]       = useState("sidebar");
  const [search, setSearch]               = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [renamingFolder, setRenamingFolder]   = useState(null); // { id, name }
  const [showMoveModal, setShowMoveModal]     = useState(null); // noteId
  const [confirmDelete, setConfirmDelete]     = useState(null); // { type, id, name }
  const [plannerDrafts, setPlannerDrafts]     = useState(readPlannerDrafts);
  const [plannerLoading, setPlannerLoading]   = useState(false);
  const [plannerError, setPlannerError]       = useState("");
  const [editingCardId, setEditingCardId]     = useState(null);
  const [editingCard, setEditingCard]         = useState(null);
  const [viewport, setViewport]               = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [reportListCollapsed, setReportListCollapsed] = useState(null);
  const [plannerChatOpen, setPlannerChatOpen] = useState(false);
  const [plannerMobileMode, setPlannerMobileMode] = useState("document"); // document | actions | chat

  /* ── Drag Desktop (mouse / HTML5) ── */
  const [deskDrag, setDeskDrag]   = useState(null);  // { id, type: "note"|"folder" }
  const [dragOverId, setDragOverId] = useState(null); // folderId | "root" | null

  /* ── Drag Mobile (touch) ── */
  const touchRef     = useRef(null); // { id, type, label, startX, startY, active }
  const acceptingCardsRef = useRef(new Set());
  const [dragPos, setDragPos] = useState(null); // { x, y }
  const sidebarRef   = useRef(null); // para registrar listener não-passivo

  const isDesktop = viewport.width >= 768 && viewport.height >= 560;
  const isCompactReports = viewport.width < 1020 || viewport.height < 650;
  const allNotes   = notes   || [];
  const allFolders = folders || [];
  const today = td();

  const selNote     = useMemo(() => allNotes.find(n => n.id === selNoteId) || null, [allNotes, selNoteId]);
  const todayPlan   = useMemo(() => allNotes.find(n => n.kind === "daily-plan" && n.planDate === today) || null, [allNotes, today]);
  const isDailyPlanSelected = selNote?.kind === "daily-plan";
  const isReportListCollapsed = isDesktop && (reportListCollapsed ?? (isDailyPlanSelected && isCompactReports));
  const plannerInput = selNoteId ? (plannerDrafts[selNoteId] || "") : "";
  const rootFolders = useMemo(() => allFolders.filter(f => !f.parentId),            [allFolders]);
  const looseNotes  = useMemo(() => allNotes.filter(n => !n.folderId),              [allNotes]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLANNER_DRAFTS_KEY, JSON.stringify(plannerDrafts));
    } catch {
      // Rascunho local e melhor esforco; persistencia principal continua em reportNotes.
    }
  }, [plannerDrafts]);

  useEffect(() => {
    const onInternalBack = (event) => {
      if (plannerChatOpen) {
        setPlannerChatOpen(false);
        setPlannerMobileMode("document");
        event.detail.handled = true;
        return;
      }
      if (isDesktop && isDailyPlanSelected && isCompactReports && !isReportListCollapsed) {
        setReportListCollapsed(true);
        event.detail.handled = true;
        return;
      }
      if (!isDesktop && mobileView === "editor") {
        setMobileView("sidebar");
        event.detail.handled = true;
      }
    };
    window.addEventListener("app:internalBack", onInternalBack);
    return () => window.removeEventListener("app:internalBack", onInternalBack);
  }, [plannerChatOpen, isDesktop, isDailyPlanSelected, isCompactReports, isReportListCollapsed, mobileView]);

  /* ══════════════════════════════════════════
     CRUD
  ══════════════════════════════════════════ */
  const createNote = useCallback((folderId = null) => {
    const note = { id: uid(), title: "", content: "", folderId: folderId || null, createdAt: td(), updatedAt: td() };
    onUpdateNotes(prev => [...(prev || []), note]);
    setSelNoteId(note.id);
    if (!isDesktop) setMobileView("editor");
  }, [onUpdateNotes, isDesktop]);

  const openTodayPlan = useCallback(() => {
    const existing = allNotes.find(n => n.kind === "daily-plan" && n.planDate === today);
    if (existing) {
      setSelNoteId(existing.id);
      if (!isDesktop) setMobileView("editor");
      setPlannerMobileMode("document");
      return;
    }

    const note = {
      id: uid(),
      title: `Plano do dia - ${fmtD(today)}`,
      content: "",
      folderId: null,
      kind: "daily-plan",
      planDate: today,
      messages: [],
      aiRuns: [],
      actionCards: [],
      createdItemRefs: [],
      createdAt: today,
      updatedAt: today,
    };
    onUpdateNotes(prev => {
      const list = prev || [];
      if (list.some(n => n.kind === "daily-plan" && n.planDate === today)) return list;
      return [...list, note];
    });
    setSelNoteId(note.id);
    if (!isDesktop) setMobileView("editor");
    setPlannerMobileMode("document");
  }, [allNotes, today, onUpdateNotes, isDesktop]);

  useEffect(() => {
    if (!selNoteId && todayPlan) setSelNoteId(todayPlan.id);
  }, [selNoteId, todayPlan]);

  const updateNoteField = useCallback((id, field, value) => {
    onUpdateNotes(prev => (prev || []).map(n =>
      n.id === id ? { ...n, [field]: value, updatedAt: td() } : n
    ));
  }, [onUpdateNotes]);

  const updateNoteById = useCallback((id, updater) => {
    onUpdateNotes(prev => (prev || []).map(n =>
      n.id === id ? { ...updater(n), updatedAt: td() } : n
    ));
  }, [onUpdateNotes]);

  const updatePlannerDraft = useCallback((noteId, value) => {
    if (!noteId) return;
    setPlannerDrafts(prev => ({ ...prev, [noteId]: value }));
  }, []);

  const clearPlannerDraft = useCallback((noteId) => {
    if (!noteId) return;
    setPlannerDrafts(prev => {
      if (!prev[noteId]) return prev;
      const next = { ...prev };
      delete next[noteId];
      return next;
    });
  }, []);

  const updateActionCard = useCallback((noteId, cardId, updater) => {
    updateNoteById(noteId, n => ({
      ...n,
      actionCards: (n.actionCards || []).map(card =>
        card.id === cardId ? { ...updater(card), updatedAt: new Date().toISOString() } : card
      ),
    }));
  }, [updateNoteById]);

  const setCardStatus = useCallback((noteId, cardId, status) => {
    updateActionCard(noteId, cardId, card => ({
      ...card,
      status,
      decidedAt: new Date().toISOString(),
    }));
  }, [updateActionCard]);

  const getCreatedRefId = useCallback((card, type) => {
    if (!card?.createdRef) return "";
    if (typeof card.createdRef === "string") return card.createdRef;
    if (type && card.createdRef.type && card.createdRef.type !== type) return "";
    return card.createdRef.id || "";
  }, []);

  const getCreatedRefTaskId = useCallback((card) => getCreatedRefId(card, "task"), [getCreatedRefId]);
  const getCreatedRefRoutineId = useCallback((card) => getCreatedRefId(card, "routine"), [getCreatedRefId]);
  const getCreatedRefProjectId = useCallback((card) => getCreatedRefId(card, "project"), [getCreatedRefId]);

  const findProjectForCard = useCallback((card) => {
    if (!card) return null;
    const byId = card.projectId ? (projects || []).find(project => project.id === card.projectId) : null;
    if (byId) return byId;
    const nameKey = String(card.projectName || "").trim().toLowerCase();
    if (!nameKey) return null;
    return (projects || []).find(project => String(project.name || "").trim().toLowerCase() === nameKey) || null;
  }, [projects]);

  const getDefaultPhaseId = useCallback((project, phaseId) => {
    const phases = project?.phases || [];
    if (!phases.length) return "";
    if (phaseId && phases.some(phase => phase.id === phaseId)) return phaseId;
    return (phases.find(phase => (phase.status || "Ativa") === "Ativa") || phases[0]).id || "";
  }, []);

  const cardToTask = useCallback((card, planDate) => {
    const deadline = normalizePlanDate(card.targetDate) || normalizePlanDate(planDate) || today;
    const hasDescription = !!String(card.description || "").trim();
    const hasCategory = !!String(card.category || "").trim();
    const hasPriority = !!String(card.priority || "").trim();
    return {
      name: String(card.name || "Tarefa sem nome").trim() || "Tarefa sem nome",
      description: String(card.description || "").trim(),
      difficulty: Number(card.difficulty) || 3,
      color: card.color || COLORS[3],
      priority: card.priority || "",
      category: card.category || "",
      deadline,
      deadlineTime: card.targetTime || "",
      notificationEnabled: false,
      notificationDate: "",
      notificationTime: "",
      notes: [],
      modulars: {
        description: hasDescription,
        category: hasCategory,
        priority: hasPriority,
        deadline: true,
        notes: false,
      },
      linkedObjectives: [],
      createdFromPlan: {
        planId: "",
        cardId: card.id,
        action: card.action || "create_task",
      },
    };
  }, [today]);

  const cardToProjectTask = useCallback((card, planDate) => {
    const task = cardToTask(card, planDate);
    return {
      ...task,
      color: task.color || findProjectForCard(card)?.color || COLORS[3],
      createdFromPlan: {
        ...task.createdFromPlan,
        action: card.action || "create_project_task",
      },
    };
  }, [cardToTask, findProjectForCard]);

  const cardToRoutine = useCallback((card) => {
    const hasDescription = !!String(card.description || "").trim();
    const hasCategory = !!String(card.category || "").trim();
    const hasPriority = !!String(card.priority || "").trim();
    const frequency = FREQUENCIES.includes(card.frequency) ? card.frequency : "Livre";
    const frequencyDays = Array.isArray(card.frequencyDays) ? card.frequencyDays : [];
    return {
      name: String(card.name || "Rotina sem nome").trim() || "Rotina sem nome",
      description: String(card.description || "").trim(),
      difficulty: Number(card.difficulty) || 3,
      color: card.color || COLORS[2],
      priority: card.priority || "",
      category: card.category || "",
      frequency,
      frequencyDays,
      notificationEnabled: !!card.targetTime,
      notificationTime: card.targetTime || "",
      notes: [],
      modulars: {
        description: hasDescription,
        category: hasCategory,
        priority: hasPriority,
        notes: false,
      },
      linkedObjectives: [],
      createdFromPlan: {
        planId: "",
        cardId: card.id,
        action: card.action || "suggest_routine",
      },
    };
  }, []);

  const cardToProject = useCallback((card, planDate) => {
    const deadline = normalizePlanDate(card.targetDate) || normalizePlanDate(planDate) || "";
    const hasDescription = !!String(card.description || "").trim();
    const hasCategory = !!String(card.category || "").trim();
    const hasPriority = !!String(card.priority || "").trim();
    return {
      name: String(card.name || "Projeto sem nome").trim() || "Projeto sem nome",
      objective: String(card.description || "").trim(),
      description: String(card.description || "").trim(),
      difficulty: Number(card.difficulty) || 3,
      color: card.color || COLORS[0],
      priority: card.priority || "",
      category: card.category || "",
      deadline,
      notes: [],
      phases: [],
      modulars: {
        description: hasDescription,
        category: hasCategory,
        priority: hasPriority,
        deadline: !!deadline,
        color: true,
        notes: false,
      },
      linkedObjectives: [],
      createdFromPlan: {
        planId: "",
        cardId: card.id,
        action: card.action || "suggest_project",
      },
    };
  }, []);

  const acceptActionCard = useCallback((note, card) => {
    if (!note || !card || (card.status || "pending") === "accepted" || (card.status || "pending") === "rejected") return;
    if (acceptingCardsRef.current.has(card.id)) return;

    const creatableActions = new Set(["create_task", "create_project_task", "create_routine", "suggest_routine", "create_project", "suggest_project"]);
    if (!creatableActions.has(card.action)) {
      setCardStatus(note.id, card.id, "accepted");
      return;
    }

    const refTypeByAction = {
      create_task: "task",
      create_project_task: "projectTask",
      create_routine: "routine",
      suggest_routine: "routine",
      create_project: "project",
      suggest_project: "project",
    };
    const existingTaskId = getCreatedRefId(card, refTypeByAction[card.action]);
    const existingTask = existingTaskId && card.action === "create_task"
      ? (tasks || []).find(t => t.id === existingTaskId)
      : null;
    const existingProjectTask = existingTaskId && card.action === "create_project_task"
      ? (projects || []).flatMap(project =>
          (project.phases || []).flatMap(phase =>
            (phase.tasks || []).map(task => ({ task, projectId: project.id, phaseId: phase.id }))
          )
        ).find(item => item.task.id === existingTaskId)
      : null;
    const existingRoutine = existingTaskId && (card.action === "create_routine" || card.action === "suggest_routine")
      ? (routines || []).find(r => r.id === existingTaskId)
      : null;
    const existingProject = existingTaskId && (card.action === "create_project" || card.action === "suggest_project")
      ? (projects || []).find(p => p.id === existingTaskId)
      : null;
    if (existingTask || existingProjectTask || existingRoutine || existingProject) {
      setCardStatus(note.id, card.id, "accepted");
      return;
    }

    if (card.action === "create_task" && !onCreateTask) {
      setPlannerError("Nao foi possivel criar a tarefa agora. Tente novamente depois.");
      return;
    }

    if (card.action === "create_project_task" && !onCreateProjectTask) {
      setPlannerError("Nao foi possivel criar a tarefa de projeto agora. Tente novamente depois.");
      return;
    }

    if ((card.action === "create_routine" || card.action === "suggest_routine") && !onCreateRoutine) {
      setPlannerError("Nao foi possivel criar a rotina agora. Tente novamente depois.");
      return;
    }

    if ((card.action === "create_project" || card.action === "suggest_project") && !onCreateProject) {
      setPlannerError("Nao foi possivel criar o projeto agora. Tente novamente depois.");
      return;
    }

    const project = card.action === "create_project_task" ? findProjectForCard(card) : null;
    if (card.action === "create_project_task" && !project) {
      setPlannerError("Escolha um projeto valido antes de aceitar a tarefa.");
      return;
    }

    acceptingCardsRef.current.add(card.id);
    const now = new Date().toISOString();
    try {
      let createdRef;
      if (card.action === "create_project_task") {
        const taskInput = cardToProjectTask(card, note.planDate);
        const created = onCreateProjectTask({
          projectId: project.id,
          phaseId: getDefaultPhaseId(project, card.phaseId),
          task: {
            ...taskInput,
            createdFromPlan: {
              ...taskInput.createdFromPlan,
              planId: note.id,
            },
          },
        });
        createdRef = {
          type: "projectTask",
          id: created.task.id,
          projectId: created.projectId,
          phaseId: created.phaseId,
          createdAt: now,
        };
      } else if (card.action === "create_routine" || card.action === "suggest_routine") {
        const routineInput = cardToRoutine(card);
        const created = onCreateRoutine({
          ...routineInput,
          createdFromPlan: {
            ...routineInput.createdFromPlan,
            planId: note.id,
          },
        });
        createdRef = { type: "routine", id: created.item.id, existing: !!created.existing, createdAt: now };
      } else if (card.action === "create_project" || card.action === "suggest_project") {
        const projectInput = cardToProject(card, note.planDate);
        const created = onCreateProject({
          ...projectInput,
          createdFromPlan: {
            ...projectInput.createdFromPlan,
            planId: note.id,
          },
        });
        createdRef = { type: "project", id: created.item.id, existing: !!created.existing, createdAt: now };
      } else {
        const taskInput = cardToTask(card, note.planDate);
        const createdTask = onCreateTask({
          ...taskInput,
          createdFromPlan: {
            ...taskInput.createdFromPlan,
            planId: note.id,
          },
        });
        createdRef = { type: "task", id: createdTask.id, createdAt: now };
      }

      updateNoteById(note.id, n => {
        const alreadyRegistered = (n.createdItemRefs || []).some(ref => ref && ref.type === createdRef.type && ref.id === createdRef.id);
        return {
          ...n,
          actionCards: (n.actionCards || []).map(item =>
            item.id === card.id
              ? { ...item, status: "accepted", decidedAt: now, createdRef, updatedAt: now }
              : item
          ),
          createdItemRefs: alreadyRegistered
            ? (n.createdItemRefs || [])
            : [...(n.createdItemRefs || []), { ...createdRef, cardId: card.id, action: card.action || "create_task" }],
        };
      });
    } catch (e) {
      acceptingCardsRef.current.delete(card.id);
      setPlannerError("Nao foi possivel criar este item agora. Tente novamente depois.");
    }
  }, [cardToProject, cardToProjectTask, cardToRoutine, cardToTask, findProjectForCard, getCreatedRefId, getDefaultPhaseId, onCreateProject, onCreateProjectTask, onCreateRoutine, onCreateTask, projects, routines, setCardStatus, tasks, updateNoteById]);

  const startEditCard = useCallback((card) => {
    setEditingCardId(card.id);
    setEditingCard({
      name: card.name || "",
      description: card.description || "",
      targetDate: card.targetDate || "",
      targetTime: card.targetTime || "",
      category: card.category || "",
      priority: card.priority || "",
      difficulty: card.difficulty || 3,
      projectId: card.projectId || "",
      projectName: card.projectName || "",
      phaseId: card.phaseId || "",
      phaseName: card.phaseName || "",
      frequency: card.frequency || "Livre",
      frequencyDays: Array.isArray(card.frequencyDays) ? card.frequencyDays : [],
      existingId: card.existingId || "",
      existingType: card.existingType || "",
      confidence: card.confidence || "media",
      reason: card.reason || "",
      originText: card.originText || "",
    });
  }, []);

  const saveEditCard = useCallback((noteId, cardId) => {
    if (!editingCard) return;
    updateActionCard(noteId, cardId, card => ({
      ...card,
      ...editingCard,
      difficulty: Number(editingCard.difficulty) || 3,
      status: (card.status || "pending") === "accepted" ? "accepted" : "edited",
      editedAt: new Date().toISOString(),
    }));
    setEditingCardId(null);
    setEditingCard(null);
  }, [editingCard, updateActionCard]);

  const cancelEditCard = useCallback(() => {
    setEditingCardId(null);
    setEditingCard(null);
  }, []);

  const handlePlannerText = useCallback(async (text) => {
    const clean = (text || "").trim();
    const plan = allNotes.find(n => n.id === selNoteId);
    if (!clean || !plan || plan.kind !== "daily-plan") return;

    if (!groqApiKey) {
      setPlannerError("Configure sua chave Groq em Perfil > Configuracoes para usar o planejamento com IA.");
      return;
    }

    const createdAt = new Date().toISOString();
    const plannerNow = getPlannerNow();
    const userMessage = { id: uid(), role: "user", content: clean, createdAt };
    const planSnapshot = {
      messages: [...(plan.messages || []), userMessage],
      actionCards: plan.actionCards || [],
    };

    clearPlannerDraft(plan.id);
    setPlannerError("");
    setPlannerLoading(true);
    updateNoteById(plan.id, n => ({ ...n, messages: [...(n.messages || []), userMessage] }));

    try {
      const parsed = await requestDailyPlan(groqApiKey, {
        text: clean,
        planDate: plan.planDate || today,
        timezone: plannerNow.timezone,
        currentLocalDate: plannerNow.date,
        currentLocalTime: plannerNow.time,
        currentLocalDateTime: plannerNow.dateTime,
        recentMessages: planSnapshot.messages,
        actionCards: planSnapshot.actionCards,
        currentPlan: plan,
        projects,
        routines,
        tasks,
        objectives,
        profile,
      });

      const assistantText = parsed.ok
        ? parsed.data.resumo
        : "Nao consegui interpretar a resposta da IA. O texto original foi salvo para revisao.";
      const assistantMessage = {
        id: uid(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        parsed: parsed.ok ? parsed.data : null,
        parseError: parsed.ok ? "" : parsed.error,
      };
      const aiRun = {
        id: uid(),
        createdAt: assistantMessage.createdAt,
        ok: parsed.ok,
        input: clean,
        raw: parsed.raw || "",
        parsed: parsed.ok ? parsed.data : null,
        error: parsed.ok ? "" : parsed.error,
      };
      const newCards = parsed.ok
        ? parsed.data.acoes.map(action => avoidPastPlannerTime(action, plan.planDate || today, plannerNow)).map(action => ({
            id: uid(),
            status: "pending",
            createdAt: assistantMessage.createdAt,
            ...action,
          }))
        : [];

      updateNoteById(plan.id, n => ({
        ...n,
        messages: [...(n.messages || []), assistantMessage],
        aiRuns: [...(n.aiRuns || []), aiRun],
        actionCards: [...(n.actionCards || []), ...newCards],
      }));
      if (!parsed.ok) setPlannerError("A IA respondeu em um formato invalido. A conversa foi salva e voce pode tentar de novo.");
    } catch (e) {
      const msg = "Erro ao conectar com a IA. Verifique sua chave Groq em Perfil > Configuracoes.";
      const assistantMessage = {
        id: uid(),
        role: "assistant",
        content: msg,
        createdAt: new Date().toISOString(),
        error: e?.message || "",
      };
      updateNoteById(plan.id, n => ({
        ...n,
        messages: [...(n.messages || []), assistantMessage],
        aiRuns: [...(n.aiRuns || []), {
          id: uid(),
          createdAt: assistantMessage.createdAt,
          ok: false,
          input: clean,
          raw: "",
          parsed: null,
          error: e?.message || msg,
        }],
      }));
      setPlannerError(`${msg}${e?.message ? " " + e.message : ""}`);
    } finally {
      setPlannerLoading(false);
    }
  }, [allNotes, selNoteId, groqApiKey, today, updateNoteById, clearPlannerDraft, projects, routines, tasks, objectives, profile]);

  const deleteNote = useCallback((id) => {
    onUpdateNotes(prev => (prev || []).filter(n => n.id !== id));
    if (selNoteId === id) { setSelNoteId(null); if (!isDesktop) setMobileView("sidebar"); }
    setConfirmDelete(null);
  }, [onUpdateNotes, selNoteId, isDesktop]);

  const moveNote = useCallback((noteId, targetFolderId) => {
    onUpdateNotes(prev => (prev || []).map(n =>
      n.id === noteId ? { ...n, folderId: targetFolderId || null, updatedAt: td() } : n
    ));
    setShowMoveModal(null);
  }, [onUpdateNotes]);

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const f = { id: uid(), name: newFolderName.trim(), parentId: null, createdAt: td() };
    onUpdateFolders(prev => [...(prev || []), f]);
    setShowNewFolder(false);
    setNewFolderName("");
  }, [newFolderName, onUpdateFolders]);

  const renameFolder = useCallback((id, name) => {
    if (!name.trim()) return;
    onUpdateFolders(prev => (prev || []).map(f => f.id === id ? { ...f, name: name.trim() } : f));
    setRenamingFolder(null);
  }, [onUpdateFolders]);

  const deleteFolder = useCallback((id) => {
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      allFolders.forEach(f => {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id); changed = true;
        }
      });
    }
    onUpdateFolders(prev => (prev || []).filter(f => !toDelete.has(f.id)));
    onUpdateNotes(prev => (prev || []).map(n => toDelete.has(n.folderId) ? { ...n, folderId: null } : n));
    if (toDelete.has(selFolderId)) setSelFolderId(null);
    setConfirmDelete(null);
  }, [allFolders, onUpdateFolders, onUpdateNotes, selFolderId]);

  // Move pasta — previne ciclos (drop em si mesmo ou em descendente)
  const moveFolder = useCallback((folderId, targetParentId) => {
    if (!folderId) return;
    if (targetParentId === folderId) return;
    const isDesc = (ancId, checkId) => {
      if (!checkId) return false;
      const f = allFolders.find(x => x.id === checkId);
      if (!f) return false;
      if (f.parentId === ancId) return true;
      return isDesc(ancId, f.parentId);
    };
    if (targetParentId && isDesc(folderId, targetParentId)) return;
    onUpdateFolders(prev => (prev || []).map(f =>
      f.id === folderId ? { ...f, parentId: targetParentId || null } : f
    ));
  }, [allFolders, onUpdateFolders]);

  const downloadNote = useCallback((note) => {
    const name = (note.title || "nota").replace(/[^a-zA-Z0-9\u00C0-\u024F _-]/g, "_") + ".md";
    const blob = new Blob([note.content || ""], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ══════════════════════════════════════════
     DRAG & DROP — Desktop (HTML5)
  ══════════════════════════════════════════ */
  const handleDrop = useCallback((targetRawId) => {
    const targetFolderId = targetRawId === "root" ? null : (targetRawId || null);
    if (!deskDrag) return;
    if (deskDrag.type === "note")   moveNote(deskDrag.id, targetFolderId);
    if (deskDrag.type === "folder") moveFolder(deskDrag.id, targetFolderId);
    setDeskDrag(null);
    setDragOverId(null);
  }, [deskDrag, moveNote, moveFolder]);

  /* ══════════════════════════════════════════
     DRAG & DROP — Mobile (touch)
     Listener registrado como não-passivo para
     poder chamar e.preventDefault() corretamente
  ══════════════════════════════════════════ */
  const handleTouchStart = useCallback((e, id, type, label) => {
    const t = e.touches[0];
    touchRef.current = { id, type, label, startX: t.clientX, startY: t.clientY, active: false };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchRef.current) return;
    const t = e.touches[0];

    if (touchRef.current.active) {
      // Drag já ativo — bloqueia scroll e atualiza posição
      e.preventDefault();
      setDragPos({ x: t.clientX, y: t.clientY });
      const el  = document.elementFromPoint(t.clientX, t.clientY);
      const fEl = el?.closest('[data-folder-id]');
      setDragOverId(fEl ? fEl.getAttribute('data-folder-id') : null);
      return;
    }

    const dx = Math.abs(t.clientX - touchRef.current.startX);
    const dy = Math.abs(t.clientY - touchRef.current.startY);

    // Se movimento claramente vertical → é scroll, cancela drag
    if (dy > 12 && dy > dx * 1.8) {
      touchRef.current = null;
      return;
    }
    // Threshold atingido → ativa drag
    if (dx > 16 || dy > 16) {
      touchRef.current.active = true;
      e.preventDefault();
      setDragPos({ x: t.clientX, y: t.clientY });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current?.active) {
      const { id, type } = touchRef.current;
      const target = dragOverId === "root" ? null : (dragOverId || null);
      if (type === "note")   moveNote(id, target);
      if (type === "folder") moveFolder(id, target === id ? null : target);
    }
    touchRef.current = null;
    setDragPos(null);
    setDragOverId(null);
  }, [dragOverId, moveNote, moveFolder]);

  // Registra touchmove/touchend como não-passivos na sidebar
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const opts = { passive: false };
    el.addEventListener('touchmove', handleTouchMove, opts);
    el.addEventListener('touchend',  handleTouchEnd,  opts);
    return () => {
      el.removeEventListener('touchmove', handleTouchMove, opts);
      el.removeEventListener('touchend',  handleTouchEnd,  opts);
    };
  }, [handleTouchMove, handleTouchEnd]);

  /* ══════════════════════════════════════════
     RENDER HELPERS (funções, não componentes!)
  ══════════════════════════════════════════ */

  // Botão ícone com área de toque confortável (≥ 36px)
  const iconBtn = (onClick, title, color, svg) => (
    <span
      key={title}
      onClick={onClick}
      title={title}
      style={{
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: color || C.tx3,
        minWidth: 36, minHeight: 36,
        borderRadius: 6,
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
    >
      {svg}
    </span>
  );

  const renderNoteRow = (note, depth) => {
    const isSel = selNoteId === note.id;
    const isDailyPlan = note.kind === "daily-plan";
    const isDraggingThis = (touchRef.current?.active && touchRef.current?.id === note.id)
                        || (deskDrag?.id === note.id);
    return (
      <div
        key={note.id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", note.id);
          // Adia para não bloquear a imagem de drag do browser
          setTimeout(() => setDeskDrag({ id: note.id, type: "note" }), 0);
        }}
        onDragEnd={() => { setDeskDrag(null); setDragOverId(null); }}
        onTouchStart={(e) => handleTouchStart(e, note.id, "note", note.title || "Sem título")}
        onClick={() => { setSelNoteId(note.id); if (!isDesktop) setMobileView("editor"); if (note.kind === "daily-plan") setPlannerMobileMode("document"); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: `${isDesktop ? 6 : 11}px 10px ${isDesktop ? 6 : 11}px ${10 + depth * 14 + 16}px`,
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          background: isSel ? C.gold + "12" : "transparent",
          color: isSel ? C.gold : C.tx3,
          borderLeft: "2px solid " + (isSel ? C.gold + "70" : "transparent"),
          opacity: isDraggingThis ? 0.3 : 1,
          fontSize: 12,
          transition: "background .1s, opacity .1s",
        }}
      >
        {isDailyPlan ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: "none" }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 15h4"/>
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: "none" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>
          {note.title || "Sem título"}
        </span>
        {isDailyPlan && (
          <span style={{ fontSize: 9, color: C.gold, border: "1px solid " + C.goldBrd, borderRadius: 4, padding: "1px 4px", pointerEvents: "none", flexShrink: 0 }}>
            plano
          </span>
        )}
      </div>
    );
  };

  const renderFolderRow = (folder, depth) => {
    const isOpen         = expandedFolders[folder.id] !== false;
    const isSel          = selFolderId === folder.id;
    const isDragOver     = dragOverId === folder.id;
    const isRenaming     = renamingFolder?.id === folder.id;
    const isDraggingThis = (touchRef.current?.active && touchRef.current?.id === folder.id)
                         || (deskDrag?.id === folder.id);
    const noteCount   = allNotes.filter(n => n.folderId === folder.id).length;
    const children    = allFolders.filter(f => f.parentId === folder.id);
    const folderNotes = allNotes.filter(n => n.folderId === folder.id);

    return (
      <div key={folder.id} style={{ opacity: isDraggingThis ? 0.3 : 1, transition: "opacity .1s" }}>
        <div
          data-folder-id={folder.id}
          draggable={!isRenaming}
          onDragStart={(e) => {
            if (isRenaming) { e.preventDefault(); return; }
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", folder.id);
            setTimeout(() => setDeskDrag({ id: folder.id, type: "folder" }), 0);
          }}
          onDragEnd={() => { setDeskDrag(null); setDragOverId(null); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(folder.id); }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragOverId(prev => prev === folder.id ? null : prev);
            }
          }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(folder.id); }}
          onTouchStart={(e) => handleTouchStart(e, folder.id, "folder", folder.name)}
          onClick={() => {
            setSelFolderId(isSel ? null : folder.id);
            setExpandedFolders(e => ({ ...e, [folder.id]: e[folder.id] === false ? true : !isOpen }));
          }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: `${isDesktop ? 8 : 11}px 8px ${isDesktop ? 8 : 11}px ${8 + depth * 14}px`,
            cursor: "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            background: isDragOver ? C.gold + "22" : isSel ? C.gold + "10" : "transparent",
            color: isSel ? C.gold : C.tx2,
            borderLeft: "2px solid " + (isDragOver ? C.gold : isSel ? C.gold : "transparent"),
            fontSize: 12,
            transition: "background .1s, border-color .1s",
          }}
        >
          {/* Seta expand/collapse */}
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            onClick={(e) => { e.stopPropagation(); setExpandedFolders(prev => ({ ...prev, [folder.id]: !isOpen })); }}
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s", flexShrink: 0, cursor: "pointer" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>

          {/* Ícone pasta */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: "none" }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>

          {/* Nome (ou input renomear) */}
          {isRenaming ? (
            <input
              autoFocus
              value={renamingFolder.name}
              onChange={(e) => setRenamingFolder({ ...renamingFolder, name: e.target.value })}
              onBlur={() => renameFolder(folder.id, renamingFolder.name || folder.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  renameFolder(folder.id, renamingFolder.name || folder.name);
                if (e.key === "Escape") setRenamingFolder(null);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 3, color: C.tx, fontSize: 11, padding: "2px 5px", outline: "none", minWidth: 0 }}
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setRenamingFolder({ id: folder.id, name: folder.name }); }}
              style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}
            >{folder.name}</span>
          )}

          {/* Contagem + botão excluir */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, marginLeft: 2 }}>
            {noteCount > 0 && <span style={{ fontSize: 10, color: C.tx4, pointerEvents: "none" }}>{noteCount}</span>}
            <span
              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "folder", id: folder.id, name: folder.name }); }}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx4, padding: "4px 2px" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </span>
          </div>
        </div>

        {isOpen && (
          <>
            {children.map(child => renderFolderRow(child, depth + 1))}
            {folderNotes.map(n => renderNoteRow(n, depth + 1))}
          </>
        )}
      </div>
    );
  };

  /* ── SIDEBAR (função, não componente) ── */
  const actionLabels = {
    create_task: "Tarefa avulsa",
    create_project_task: "Tarefa de projeto",
    create_routine: "Rotina",
    create_project: "Projeto",
    already_exists: "Ja existe",
    suggest_routine: "Sugestao de rotina",
    suggest_project: "Sugestao de projeto",
  };

  const statusLabels = {
    pending: "Pendente",
    edited: "Editado",
    accepted: "Aceito",
    rejected: "Recusado",
  };

  const statusColors = {
    pending: C.tx4,
    edited: C.blue,
    accepted: C.green,
    rejected: C.red,
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: C.bg,
    border: "1px solid " + C.brd2,
    borderRadius: 6,
    color: C.tx,
    fontSize: 11,
    padding: "7px 8px",
    outline: "none",
    fontFamily: "'Segoe UI', 'Helvetica Neue', system-ui, sans-serif",
  };

  const sectionTitleStyle = {
    fontSize: 10,
    color: C.tx4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: 600,
    margin: "10px 0 6px",
  };

  const normalizePlanDate = (value) => String(value || "").slice(0, 10);
  const isOptionalAction = (action) => action === "suggest_routine" || action === "suggest_project";
  const isFutureCard = (card, planDate) => {
    const targetDate = normalizePlanDate(card.targetDate);
    const baseDate = normalizePlanDate(planDate);
    return targetDate && baseDate && targetDate > baseDate;
  };

  const getCardDestination = (card) => {
    if (card.action === "create_project_task") return card.projectName || card.projectId || "Projeto a confirmar";
    if (card.action === "already_exists") return [card.existingType, card.existingId].filter(Boolean).join(" ") || "Item existente";
    if (card.action === "create_routine" || card.action === "suggest_routine") return "Rotinas";
    if (card.action === "create_project" || card.action === "suggest_project") return "Projetos";
    return card.category || "Tarefas avulsas";
  };

  const groupActionCards = (cards, planDate) => {
    const groups = {
      today: [],
      future: [],
      existing: [],
      optional: [],
    };
    (cards || []).forEach(card => {
      if (card.action === "already_exists") groups.existing.push(card);
      else if (isOptionalAction(card.action)) groups.optional.push(card);
      else if (isFutureCard(card, planDate)) groups.future.push(card);
      else groups.today.push(card);
    });
    return groups;
  };

  const renderPlannerField = (label, children) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: C.tx4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      {children}
    </label>
  );

  const CardMeta = ({ label, value, color }) => {
    if (!value) return null;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 22,
        padding: "3px 7px",
        borderRadius: 5,
        border: "1px solid " + (color || C.brd2),
        color: color || C.tx3,
        background: (color || C.brd2) + "12",
        fontSize: 10,
        lineHeight: 1.2,
      }}>
        {label ? label + ": " : ""}{value}
      </span>
    );
  };

  const renderActionCard = (note, card) => {
    const status = card.status || "pending";
    const isEditing = editingCardId === card.id && editingCard;
    const confidence = String(card.confidence || "media").toLowerCase();
    const confidenceColor = confidence === "alta" ? C.green : confidence === "baixa" ? C.orange : C.blue;
    const canDecide = status !== "accepted" && status !== "rejected";
    const selectedProject = isEditing
      ? ((projects || []).find(project => project.id === editingCard.projectId) || findProjectForCard(editingCard))
      : findProjectForCard(card);
    const projectPhases = selectedProject?.phases || [];
    const createdLabel = getCreatedRefId(card, "projectTask")
      ? "Tarefa de projeto"
      : getCreatedRefTaskId(card)
        ? "Tarefa"
        : getCreatedRefRoutineId(card)
          ? (card.createdRef?.existing ? "Rotina existente" : "Rotina")
          : getCreatedRefProjectId(card)
            ? (card.createdRef?.existing ? "Projeto existente" : "Projeto")
            : "";
    const isRoutineCard = card.action === "create_routine" || card.action === "suggest_routine";

    return (
      <div key={card.id} style={{ border: "1px solid " + C.brd2, borderLeft: "3px solid " + (statusColors[status] || C.gold), background: C.card, borderRadius: 8, padding: 10, boxShadow: "0 6px 18px #0002" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
              <CardMeta value={actionLabels[card.action] || card.action || "Acao"} color={C.gold} />
              <CardMeta value={statusLabels[status] || status} color={statusColors[status] || C.tx4} />
              {(confidence === "media" || confidence === "baixa") && <CardMeta label="Confianca" value={confidence} color={confidenceColor} />}
            </div>
            <div style={{ color: C.tx, fontSize: 12, fontWeight: 600, lineHeight: 1.35, overflowWrap: "anywhere" }}>
              {card.name || "Acao sem nome"}
            </div>
          </div>
          {!isEditing && canDecide && (
            <button onClick={() => startEditCard(card)} style={{ border: "1px solid " + C.brd2, background: C.bg, color: C.tx3, borderRadius: 6, padding: "5px 7px", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {renderPlannerField("Nome",
              <input value={editingCard.name} onChange={e => setEditingCard(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
            )}
            {renderPlannerField("Descricao",
              <textarea value={editingCard.description} onChange={e => setEditingCard(v => ({ ...v, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} />
            )}
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr", gap: 8 }}>
              {renderPlannerField("Data",
                <input type="date" value={editingCard.targetDate} onChange={e => setEditingCard(v => ({ ...v, targetDate: e.target.value }))} style={inputStyle} />
              )}
              {renderPlannerField("Horario",
                <input type="time" value={editingCard.targetTime} onChange={e => setEditingCard(v => ({ ...v, targetTime: e.target.value }))} style={inputStyle} />
              )}
              {renderPlannerField("Dificuldade",
                <input type="number" min="1" max="20" value={editingCard.difficulty} onChange={e => setEditingCard(v => ({ ...v, difficulty: e.target.value }))} style={inputStyle} />
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 8 }}>
              {renderPlannerField("Prioridade",
                <select value={editingCard.priority} onChange={e => setEditingCard(v => ({ ...v, priority: e.target.value }))} style={inputStyle}>
                  <option value="">Sem prioridade</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              )}
              {renderPlannerField("Categoria",
                <input value={editingCard.category} onChange={e => setEditingCard(v => ({ ...v, category: e.target.value }))} style={inputStyle} />
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 8 }}>
              {card.action === "create_project_task" ? renderPlannerField("Projeto",
                <select
                  value={selectedProject?.id || ""}
                  onChange={e => {
                    const project = (projects || []).find(item => item.id === e.target.value);
                    const phases = project?.phases || [];
                    const phase = phases.find(item => (item.status || "Ativa") === "Ativa") || phases[0] || null;
                    setEditingCard(v => ({
                      ...v,
                      projectId: project?.id || "",
                      projectName: project?.name || "",
                      phaseId: phase?.id || "",
                      phaseName: phase?.name || "",
                    }));
                  }}
                  style={inputStyle}
                >
                  <option value="">Escolha um projeto</option>
                  {(projects || []).filter(project => !project.status || project.status === "Ativo").map(project => (
                    <option key={project.id} value={project.id}>{project.name || "Projeto sem nome"}</option>
                  ))}
                </select>
              ) : renderPlannerField("Projeto",
                <input value={editingCard.projectName} onChange={e => setEditingCard(v => ({ ...v, projectName: e.target.value }))} style={inputStyle} />
              )}
              {renderPlannerField("Confianca",
                <select value={editingCard.confidence} onChange={e => setEditingCard(v => ({ ...v, confidence: e.target.value }))} style={inputStyle}>
                  <option value="alta">alta</option>
                  <option value="media">media</option>
                  <option value="baixa">baixa</option>
                </select>
              )}
            </div>
            {isRoutineCard && (
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 8 }}>
                {renderPlannerField("Frequencia",
                  <select value={editingCard.frequency || "Livre"} onChange={e => setEditingCard(v => ({ ...v, frequency: e.target.value }))} style={inputStyle}>
                    {FREQUENCIES.map(freq => <option key={freq} value={freq}>{freq}</option>)}
                  </select>
                )}
                {renderPlannerField("Acao",
                  <input value={editingCard.action || card.action || ""} disabled style={{ ...inputStyle, color: C.tx4 }} />
                )}
              </div>
            )}
            {card.action === "create_project_task" && (
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 8 }}>
                {renderPlannerField("Fase",
                  <select
                    value={getDefaultPhaseId(selectedProject, editingCard.phaseId)}
                    onChange={e => {
                      const phase = projectPhases.find(item => item.id === e.target.value);
                      setEditingCard(v => ({ ...v, phaseId: phase?.id || "", phaseName: phase?.name || "" }));
                    }}
                    disabled={!selectedProject || projectPhases.length === 0}
                    style={inputStyle}
                  >
                    {projectPhases.length === 0 ? (
                      <option value="">Fase Planejamento sera criada</option>
                    ) : projectPhases.map(phase => (
                      <option key={phase.id} value={phase.id}>{phase.name || "Fase sem nome"}</option>
                    ))}
                  </select>
                )}
                {renderPlannerField("Acao",
                  <input value={editingCard.action || ""} disabled style={{ ...inputStyle, color: C.tx4 }} />
                )}
              </div>
            )}
            {renderPlannerField("Motivo",
              <textarea value={editingCard.reason} onChange={e => setEditingCard(v => ({ ...v, reason: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} />
            )}
            {renderPlannerField("Trecho original",
              <textarea value={editingCard.originText} onChange={e => setEditingCard(v => ({ ...v, originText: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} />
            )}
            <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={cancelEditCard} style={{ border: "1px solid " + C.brd2, background: C.bg, color: C.tx3, borderRadius: 6, padding: "7px 10px", fontSize: 11, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => saveEditCard(note.id, card.id)} style={{ border: "1px solid " + C.goldBrd, background: C.gold + "18", color: C.gold, borderRadius: 6, padding: "7px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Salvar edicao
              </button>
            </div>
          </div>
        ) : (
          <>
            {card.description && (
              <div style={{ color: C.tx2, fontSize: 11, lineHeight: 1.45, marginBottom: 8, overflowWrap: "anywhere" }}>
                {card.description}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              <CardMeta label="Data" value={card.targetDate ? fmtD(card.targetDate) : "Sem data"} />
              <CardMeta label="Horario" value={card.targetTime} />
              <CardMeta label="Destino" value={getCardDestination(card)} />
              {card.action === "create_project_task" && <CardMeta label="Fase" value={(selectedProject?.phases || []).find(phase => phase.id === card.phaseId)?.name || card.phaseName || (selectedProject?.phases || []).find(phase => (phase.status || "Ativa") === "Ativa")?.name || ""} />}
              {isRoutineCard && <CardMeta label="Frequencia" value={card.frequency || "Livre"} />}
              <CardMeta label="Prioridade" value={card.priority} />
              <CardMeta label="Dif." value={card.difficulty} />
              <CardMeta label="Criado" value={createdLabel} color={C.green} />
              {confidence === "alta" && <CardMeta label="Confianca" value={confidence} color={confidenceColor} />}
            </div>
            {card.reason && (
              <div style={{ color: C.tx3, fontSize: 10, lineHeight: 1.45, marginBottom: 6, overflowWrap: "anywhere" }}>
                {card.reason}
              </div>
            )}
            {card.originText && (
              <div style={{ color: C.tx4, fontSize: 10, lineHeight: 1.45, borderLeft: "2px solid " + C.brd2, paddingLeft: 7, marginBottom: 8, overflowWrap: "anywhere" }}>
                "{card.originText}"
              </div>
            )}
            {canDecide && (
              <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => setCardStatus(note.id, card.id, "rejected")} style={{ border: "1px solid " + C.red + "55", background: C.red + "10", color: C.red, borderRadius: 6, padding: "7px 10px", fontSize: 11, cursor: "pointer" }}>
                  Recusar
                </button>
                <button onClick={() => acceptActionCard(note, card)} style={{ border: "1px solid " + C.green + "55", background: C.green + "12", color: C.green, borderRadius: 6, padding: "7px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  Aceitar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderActionCardSection = (title, cards, note) => {
    if (!cards.length) return null;
    return (
      <div>
        <div style={sectionTitleStyle}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cards.map(card => renderActionCard(note, card))}
        </div>
      </div>
    );
  };

  const renderActionCards = (note, options = {}) => {
    const actionCards = note.actionCards || [];
    if (!actionCards.length) return null;
    const groups = groupActionCards(actionCards, note.planDate || today);
    return (
      <div style={{ padding: options.paddedTop ? "12px 14px" : "0 14px 12px", flex: options.fill ? 1 : "0 0 auto", minHeight: 0, maxHeight: options.fill ? "none" : isDesktop ? 420 : 260, overflowY: "auto", overscrollBehavior: "contain" }}>
        {renderActionCardSection("Para hoje", groups.today, note)}
        {renderActionCardSection("Para o futuro", groups.future, note)}
        {renderActionCardSection("Ja existe", groups.existing, note)}
        {renderActionCardSection("Sugestoes opcionais", groups.optional, note)}
      </div>
    );
  };

  const renderSidebar = () => (
    <div
      ref={sidebarRef}
      style={{
        width: isDesktop ? 220 : "100%",
        flexShrink: 0, height: "100%",
        borderRight: isDesktop ? "0.5px solid " + C.brd : "none",
        display: "flex", flexDirection: "column",
        background: C.bg, overflow: "hidden",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ padding: "6px 8px 6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "0.5px solid " + C.brd }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.tx, letterSpacing: 0.3 }}>Relatórios</span>
        <div style={{ display: "flex", alignItems: "center" }}>
          {isDesktop && iconBtn(
            () => setReportListCollapsed(true), "Recolher lista",
            C.tx3,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          )}

          {iconBtn(
            () => setShowSearch(s => !s), "Buscar",
            showSearch ? C.gold : C.tx3,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}

          {iconBtn(
            () => setShowNewFolder(true), "Nova pasta", C.tx3,
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          )}

          {iconBtn(
            () => createNote(selFolderId), "Nova nota", C.tx3,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}

          {/* ⋮ menu */}
          <div style={{ position: "relative" }}>
            {iconBtn(
              () => setShowMenu(s => !s), "Mais opções", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>
              </svg>
            )}
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 140 }} />
                <div style={{ position: "absolute", top: 38, right: 0, background: C.card, border: "0.5px solid " + C.brd2, borderRadius: 8, padding: 4, minWidth: 148, boxShadow: "0 4px 16px #0008", zIndex: 150 }}>
                  <div
                    onClick={() => { createNote(null); setShowMenu(false); }}
                    style={{ padding: "9px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: C.tx2, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Nota rápida
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 10px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
        <button
          onClick={openTodayPlan}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            padding: "8px 10px", borderRadius: 6, border: "1px solid " + (todayPlan ? C.goldBrd : C.brd2),
            background: todayPlan ? C.gold + "10" : C.card, color: todayPlan ? C.gold : C.tx2,
            fontSize: 12, cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 15h4"/>
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Plano de hoje</span>
          </span>
          <span style={{ fontSize: 10, color: todayPlan ? C.gold : C.tx4, flexShrink: 0 }}>{fmtD(today)}</span>
        </button>
      </div>

      {/* Campo de busca */}
      {showSearch && (
        <div style={{ padding: "8px 10px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar em notas..."
            style={{ width: "100%", padding: "6px 10px", background: C.card, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 11, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Área scrollável: pastas + notas */}
      <div
        data-folder-id="root"
        onDragOver={(e) => { e.preventDefault(); if (dragOverId !== "root") setDragOverId("root"); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
        onDrop={(e) => { e.preventDefault(); handleDrop("root"); }}
        style={{
          flex: 1, overflowY: "auto", paddingBottom: 20,
          background: dragOverId === "root" ? C.gold + "06" : "transparent",
          transition: "background .1s",
        }}
      >
        {search.trim() ? (
          (() => {
            const q = search.toLowerCase();
            const res = allNotes.filter(n =>
              (n.title || "").toLowerCase().includes(q) ||
              (n.content || "").toLowerCase().includes(q)
            );
            return res.length > 0
              ? res.map(n => renderNoteRow(n, 0))
              : <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: C.tx4 }}>Nenhum resultado</div>;
          })()
        ) : (
          <>
            {rootFolders.map(f => renderFolderRow(f, 0))}
            {looseNotes.length > 0 && rootFolders.length > 0 && (
              <div style={{ fontSize: 10, color: C.tx4, padding: "8px 10px 2px", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Sem pasta
              </div>
            )}
            {looseNotes.map(n => renderNoteRow(n, 0))}
            {allNotes.length === 0 && allFolders.length === 0 && (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.tx4} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div style={{ fontSize: 12, color: C.tx3, marginBottom: 3 }}>Nenhuma nota ainda</div>
                <div style={{ fontSize: 11, color: C.tx4 }}>Use + para criar a primeira nota</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* ── EDITOR (função, não componente) ── */
  const renderReportListRail = () => (
    <div
      style={{
        width: 44,
        flexShrink: 0,
        height: "100%",
        borderRight: "0.5px solid " + C.brd,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        gap: 8,
      }}
    >
      <button
        onClick={() => setReportListCollapsed(false)}
        title="Abrir lista de relatorios"
        style={{
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "1px solid " + C.brd2,
          background: C.card,
          color: C.tx3,
          cursor: "pointer",
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      <button
        onClick={openTodayPlan}
        title="Plano de hoje"
        style={{
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "1px solid " + (todayPlan ? C.goldBrd : C.brd2),
          background: todayPlan ? C.gold + "10" : C.card,
          color: todayPlan ? C.gold : C.tx3,
          cursor: "pointer",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 15h4"/>
        </svg>
      </button>
    </div>
  );

  const renderPlannerChat = (note) => {
    const messages = note.messages || [];
    const actionCards = note.actionCards || [];
    const pendingCount = actionCards.filter(c => (c.status || "pending") === "pending").length;
    const draftOpenLabel = plannerInput.trim() ? "Continuar conversa" : "Abrir chat";
    const mobileFullChat = !isDesktop && plannerChatOpen;

    return (
      <div data-no-tab-swipe={plannerChatOpen ? "true" : undefined} style={{
        borderBottom: mobileFullChat ? "none" : "0.5px solid " + C.brd + "40",
        flex: mobileFullChat ? 1 : "0 0 auto",
        minHeight: mobileFullChat ? 0 : "auto",
        display: mobileFullChat ? "flex" : "block",
        flexDirection: mobileFullChat ? "column" : "initial",
        background: C.bg,
        overflow: mobileFullChat ? "hidden" : "visible",
      }}>
        <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.tx, fontWeight: 600 }}>Chat de planejamento</div>
            <div style={{ fontSize: 10, color: C.tx4, marginTop: 2 }}>
              {plannerChatOpen ? "Escreva o que pretende fazer. Nada sera criado sem aprovacao." : "Converse quando precisar ajustar o plano. O documento fica abaixo."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {actionCards.length > 0 && (
              <div style={{ fontSize: 10, color: C.gold, border: "1px solid " + C.goldBrd, borderRadius: 6, padding: "4px 7px", flexShrink: 0 }}>
                {pendingCount} pendentes
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPlannerChatOpen(open => {
                  const next = !open;
                  if (!isDesktop) setPlannerMobileMode(next ? "chat" : "document");
                  return next;
                });
              }}
              style={{
                minHeight: 34,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid " + (plannerChatOpen ? C.brd2 : C.goldBrd),
                background: plannerChatOpen ? C.card : C.gold + "14",
                color: plannerChatOpen ? C.tx3 : C.gold,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {plannerChatOpen ? "Fechar" : draftOpenLabel}
            </button>
          </div>
        </div>

        {!plannerChatOpen && plannerInput.trim() && (
          <div style={{ margin: "0 14px 8px", padding: "7px 9px", borderRadius: 8, border: "1px solid " + C.goldBrd, background: C.gold + "10", color: C.tx2, fontSize: 11, lineHeight: 1.4, overflowWrap: "anywhere" }}>
            Rascunho salvo: {plannerInput.trim().slice(0, 120)}{plannerInput.trim().length > 120 ? "..." : ""}
          </div>
        )}

        {plannerChatOpen && (
          <div style={{
            flex: mobileFullChat ? 1 : "0 0 auto",
            minHeight: 0,
            maxHeight: isDesktop ? "58vh" : mobileFullChat ? "none" : "calc(100dvh - 220px)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            display: "flex",
            flexDirection: "column",
          }}>
            {messages.length > 0 ? (
              <div style={{ padding: "0 14px 8px", display: "flex", flexDirection: "column", gap: 7, flex: mobileFullChat ? 1 : "0 0 auto" }}>
                {messages.map(msg => (
                  <div key={msg.id || msg.createdAt} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "82%",
                      padding: "7px 9px",
                      borderRadius: 8,
                      border: "1px solid " + (msg.role === "user" ? C.goldBrd : C.brd2),
                      background: msg.role === "user" ? C.gold + "10" : C.card,
                      color: C.tx2,
                      fontSize: 11,
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}>
                      <div style={{ color: msg.role === "user" ? C.gold : C.tx4, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                        {msg.role === "user" ? "Voce" : "IA"}
                      </div>
                      {msg.content}
                      {msg.parsed?.acoes?.length > 0 && (
                        <div style={{ marginTop: 5, color: C.tx4, fontSize: 10 }}>
                          {msg.parsed.acoes.length} acao{msg.parsed.acoes.length === 1 ? "" : "es"} interpretada{msg.parsed.acoes.length === 1 ? "" : "s"}.
                        </div>
                      )}
                      {msg.parseError && (
                        <div style={{ marginTop: 5, color: C.orange, fontSize: 10 }}>Resposta fora do formato esperado.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "0 14px 8px", color: C.tx4, fontSize: 11, lineHeight: 1.4 }}>
                Conte o que precisa organizar hoje. A IA devolve cards para voce aprovar.
              </div>
            )}

            {plannerError && (
              <div style={{ margin: "0 14px 8px", padding: "7px 9px", borderRadius: 6, border: "1px solid " + C.orange + "55", background: C.orange + "12", color: C.orange, fontSize: 11, lineHeight: 1.4 }}>
                {plannerError}
              </div>
            )}

            {!groqApiKey && (
              <div style={{ margin: "0 14px 8px", padding: "7px 9px", borderRadius: 6, border: "1px solid " + C.brd2, background: C.card, color: C.tx3, fontSize: 11, lineHeight: 1.4 }}>
                Configure sua chave da API Groq em Perfil &gt; Configuracoes para usar o planejador.
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePlannerText(plannerInput);
              }}
              style={{ padding: "0 14px calc(10px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: isDesktop ? "row" : "column", gap: 8, alignItems: isDesktop ? "flex-end" : "stretch", flexShrink: 0, background: C.bg }}
            >
              <textarea
                value={plannerInput}
                onChange={(e) => updatePlannerDraft(note.id, e.target.value)}
                disabled={plannerLoading}
                placeholder="Ex.: hoje preciso revisar o contrato as 14h e amanha ligar para o cliente"
                rows={plannerInput.trim() ? 3 : 2}
                style={{
                  flex: 1,
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: plannerInput.trim() ? 72 : 46,
                  maxHeight: 120,
                  resize: "vertical",
                  background: C.card,
                  border: "1px solid " + C.brd2,
                  borderRadius: 8,
                  color: C.tx,
                  fontSize: 12,
                  lineHeight: 1.45,
                  outline: "none",
                  padding: "8px 10px",
                  fontFamily: "'Segoe UI', 'Helvetica Neue', system-ui, sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={plannerLoading || !plannerInput.trim()}
                style={{
                  minHeight: 38,
                  padding: "0 12px",
                  width: isDesktop ? "auto" : "100%",
                  borderRadius: 8,
                  border: "1px solid " + C.goldBrd,
                  background: plannerLoading || !plannerInput.trim() ? C.card : C.gold + "18",
                  color: plannerLoading || !plannerInput.trim() ? C.tx4 : C.gold,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: plannerLoading || !plannerInput.trim() ? "default" : "pointer",
                  flexShrink: 0,
                }}
              >
                {plannerLoading ? "Enviando" : "Enviar"}
              </button>
            </form>
          </div>
        )}

        {isDesktop && renderActionCards(note)}
      </div>
    );
  };

  const renderPlannerMobileTabs = (note) => {
    if (isDesktop || note.kind !== "daily-plan") return null;
    const pendingCount = (note.actionCards || []).filter(c => (c.status || "pending") === "pending").length;
    const modes = [
      ["document", "Plano"],
      ["actions", pendingCount ? `Acoes ${pendingCount}` : "Acoes"],
      ["chat", plannerInput.trim() ? "Chat *" : "Chat"],
    ];
    return (
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: "0.5px solid " + C.brd + "40", flexShrink: 0, overflowX: "auto" }}>
        {modes.map(([mode, label]) => {
          const active = plannerMobileMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setPlannerMobileMode(mode);
                setPlannerChatOpen(mode === "chat");
              }}
              style={{
                flex: 1,
                minWidth: 86,
                minHeight: 34,
                borderRadius: 8,
                border: "1px solid " + (active ? C.goldBrd : C.brd2),
                background: active ? C.gold + "14" : C.card,
                color: active ? C.gold : C.tx3,
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderEditor = () => {
    if (!selNote) return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: C.tx4 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.tx4 + "70"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{ fontSize: 12 }}>Selecione ou crie uma nota</span>
        <Btn onClick={openTodayPlan} primary>Plano de hoje</Btn>
      </div>
    );

    const folder = selNote.folderId ? allFolders.find(f => f.id === selNote.folderId) : null;
    const isDailyPlan = selNote.kind === "daily-plan";

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Barra superior do editor */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderBottom: "0.5px solid " + C.brd, flexShrink: 0 }}>
          {!isDesktop && (
            <span onClick={() => setMobileView("sidebar")} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, minWidth: 36, minHeight: 36, justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </span>
          )}
          {isReportListCollapsed && (
            <span onClick={() => setReportListCollapsed(false)} title="Abrir lista de relatorios" style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, minWidth: 36, minHeight: 36, justifyContent: "center", color: C.tx3 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>
              </svg>
            </span>
          )}
          <input
            key={selNote.id + "_title"}
            defaultValue={selNote.title || ""}
            onBlur={(e) => updateNoteField(selNote.id, "title", e.target.value)}
            onChange={(e) => updateNoteField(selNote.id, "title", e.target.value)}
            placeholder="Título da nota"
            style={{ flex: 1, background: "transparent", border: "none", color: C.tx, fontSize: 14, fontWeight: 500, outline: "none", padding: 0, minWidth: 0 }}
          />
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {iconBtn(() => downloadNote(selNote), "Download .md", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {iconBtn(() => setShowMoveModal(selNote.id), "Mover para pasta", C.tx3,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            )}
            {iconBtn(() => setConfirmDelete({ type: "note", id: selNote.id, name: selNote.title || "Sem título" }), "Excluir", C.tx4,
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            )}
          </div>
        </div>

        {/* Breadcrumb da pasta */}
        {folder && (
          <div style={{ padding: "4px 14px", fontSize: 10, color: C.tx4, borderBottom: "0.5px solid " + C.brd + "40", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {folder.name}
          </div>
        )}

        {/* Textarea — defaultValue + onBlur para não perder foco */}
        {isDailyPlan && (
          <div style={{ padding: "8px 14px", borderBottom: "0.5px solid " + C.brd + "40", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: C.tx3, fontSize: 11 }}>
            <span style={{ color: C.gold, fontWeight: 600 }}>Plano diario</span>
            <span style={{ color: C.tx4 }}>{selNote.planDate ? fmtD(selNote.planDate) : ""}</span>
          </div>
        )}

        {isDailyPlan && renderPlannerMobileTabs(selNote)}

        {isDailyPlan && !isDesktop && plannerMobileMode === "chat" && renderPlannerChat(selNote)}

        {isDailyPlan && !isDesktop && plannerMobileMode === "actions" && (
          (selNote.actionCards || []).length > 0 ? renderActionCards(selNote, { fill: true, paddedTop: true }) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, color: C.tx4, fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>
              Nenhuma acao para aprovar agora.
            </div>
          )
        )}

        {isDailyPlan && (isDesktop || plannerMobileMode === "document") && renderPlannerChat(selNote)}

        {(!isDailyPlan || isDesktop || plannerMobileMode === "document") && (
          <textarea
            key={selNote.id + "_content"}
            defaultValue={selNote.content || ""}
            onBlur={(e) => updateNoteField(selNote.id, "content", e.target.value)}
            placeholder="Comece a escrever..."
            style={{
              flex: 1, padding: "14px 16px",
              background: "transparent", border: "none",
              color: C.tx, fontSize: 13,
              fontFamily: "'Segoe UI', 'Helvetica Neue', system-ui, sans-serif",
              lineHeight: 1.8, outline: "none", resize: "none", overflow: "auto",
            }}
          />
        )}

        {/* Rodapé */}
        {(!isDailyPlan || isDesktop || plannerMobileMode === "document") && (
          <div style={{ padding: "5px 14px", borderTop: "0.5px solid " + C.brd, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx4, flexShrink: 0 }}>
            <span>{(selNote.content || "").length} caracteres</span>
            <span>{selNote.updatedAt ? fmtD(selNote.updatedAt) : ""}</span>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════
     LAYOUT PRINCIPAL
  ══════════════════════════════════════════ */
  return (
    <div
      style={{
        height: isDesktop ? "100vh" : "calc(100vh - 56px)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isDesktop ? (
          <>{isReportListCollapsed ? renderReportListRail() : renderSidebar()}{renderEditor()}</>
        ) : (
          mobileView === "sidebar" ? renderSidebar() : renderEditor()
        )}
      </div>

      {/* Mini-carta flutuante durante drag touch */}
      {dragPos && touchRef.current?.active && (
        <div style={{
          position: "fixed",
          left: dragPos.x - 55, top: dragPos.y - 18,
          pointerEvents: "none", zIndex: 9999,
          background: C.card, border: "1px solid " + C.goldBrd,
          borderRadius: 6, padding: "5px 10px",
          fontSize: 11, color: C.gold,
          boxShadow: "0 4px 16px #0009",
          maxWidth: 130, opacity: 0.92,
          transform: "scale(0.82) rotate(-2deg)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {touchRef.current.label || "Item"}
        </div>
      )}

      {/* ─── Modais ─── */}

      {/* Nova pasta */}
      {showNewFolder && (
        <Modal>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 10 }}>Nova pasta</div>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
            placeholder="Nome da pasta"
            style={{ width: "100%", padding: "8px 10px", background: C.bg, border: "1px solid " + C.brd2, borderRadius: 6, color: C.tx, fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn primary onClick={createFolder} style={{ flex: 1 }}>Criar</Btn>
          </div>
        </Modal>
      )}

      {/* Mover nota */}
      {showMoveModal && (() => {
        const note = allNotes.find(n => n.id === showMoveModal);
        if (!note) return null;
        return (
          <Modal>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>Mover nota</div>
            <div style={{ fontSize: 11, color: C.tx3, marginBottom: 10 }}>{note.title || "Sem título"}</div>
            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
              <div
                onClick={() => moveNote(showMoveModal, null)}
                style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, marginBottom: 2, color: !note.folderId ? C.gold : C.tx2, background: !note.folderId ? C.gold + "10" : "transparent" }}
              >
                Sem pasta
              </div>
              {allFolders.map(f => (
                <div key={f.id}
                  onClick={() => moveNote(showMoveModal, f.id)}
                  style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, marginBottom: 2, display: "flex", alignItems: "center", gap: 6, color: note.folderId === f.id ? C.gold : C.tx2, background: note.folderId === f.id ? C.gold + "10" : "transparent" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  {f.name}
                </div>
              ))}
            </div>
            <Btn onClick={() => setShowMoveModal(null)} style={{ width: "100%" }}>Cancelar</Btn>
          </Modal>
        );
      })()}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <Modal>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 4 }}>
              Excluir {confirmDelete.type === "folder" ? "pasta" : "nota"}?
            </div>
            <div style={{ fontSize: 11, color: C.tx3 }}>{confirmDelete.name}</div>
            {confirmDelete.type === "folder" && (
              <div style={{ fontSize: 11, color: C.tx4, marginTop: 4 }}>As notas serão movidas para "Sem pasta".</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn danger onClick={() => confirmDelete.type === "folder" ? deleteFolder(confirmDelete.id) : deleteNote(confirmDelete.id)} style={{ flex: 1 }}>
              Excluir
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

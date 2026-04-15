import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { THEMES, setCurrentTheme, generateThemeTones, C } from './src/temas.js';
import { uid, td, getLevelInfo, getPoderInfo, getRankInfo, getMastery, getMasteryBonus, getEnergia, getMoedas, getXp, getCoins, migrateDifficulty, getMultiplier, openChest, rollMissionRank, calcObjectiveXp, ACHIEVEMENTS, checkProjectCompletion, removeObjectiveLinksFromActivities, similarName, migrateFreq, isRoutineDueOn } from './src/utilidades.js';
import { CATEGORIES, FREQUENCIES, WEEK_DAYS, UNITS, DEFAULT_PRESETS, DEFAULT_NOTIFICATION_SETTINGS, STREAK_RECOVER, CHEST_TYPES, COLORS } from './src/constantes.js';
import { S, Social } from './src/armazenamento.js';
import { SHOP_THEMES_LIST, getUpgradeCost, UPGRADE_LABELS } from './src/icones.jsx';
import { Btn, Modal, ConfirmModal } from './src/componentes-base.jsx';
import { ProjectForm, RoutineForm, TaskForm, ObjectiveForm } from './src/formularios.jsx';
import { buildNotificationPlan, clearScheduledNotifications, requestNotificationPermission, scheduleNotificationPlan } from './src/notificacoes.js';
const DashboardTab = lazy(() => import('./src/abas/dashboard.jsx'));
const ActivitiesTab = lazy(() => import('./src/abas/atividades.jsx'));
const ProjectDetail = lazy(() => import('./src/abas/detalhes.jsx').then(m => ({ default: m.ProjectDetail })));
const RoutineDetail = lazy(() => import('./src/abas/detalhes.jsx').then(m => ({ default: m.RoutineDetail })));
const TaskDetail = lazy(() => import('./src/abas/detalhes.jsx').then(m => ({ default: m.TaskDetail })));
const ObjectiveDetail = lazy(() => import('./src/abas/detalhes.jsx').then(m => ({ default: m.ObjectiveDetail })));
const HistoryTab = lazy(() => import('./src/abas/historico.jsx'));
const ShopTab = lazy(() => import('./src/abas/loja.jsx'));
const ConfigTab = lazy(() => import('./src/abas/configuracoes.jsx'));
const ReportsTab = lazy(() => import('./src/abas/relatorios.jsx'));

function TabFallback() {
  return (
    <div style={{ padding: 18, color: C.tx3, fontSize: 12 }}>
      Carregando...
    </div>
  );
}

// Definido fora do componente — SVGs usam stroke="currentColor" (sem deps de tema),
// então nunca precisam ser recriados. Antes eram um array literal recriado a cada render.
const NAV_TABS = [
  ["dashboard",   "Início",      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],
  ["activities",  "Atividades",  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>],
  ["reports",     "Relatórios",  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>],
  ["history",     "Histórico",   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>],
  ["shop",        "Loja",        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>],
  ["config",      "Perfil",      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>],
];

export default function App({ user, onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [subTab, setSubTab] = useState("today");
  const [view, setView] = useState("list");
  const [selId, setSelId] = useState(null);
  const [selType, setSelType] = useState(null);
  const [navHistory, setNavHistory] = useState([]);
  const [projects, setProjects] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [trash, setTrash] = useState([]);
  const [reportNotes, setReportNotes] = useState([]);
  const [reportFolders, setReportFolders] = useState([]);
  const [atributos, setAtributos] = useState([]);
  const [profile, setProfile] = useState({ totalXp: 0, coins: 0, streak: 0, bestStreak: 0, tasksCompleted: 0, xpToday: 0, coinsToday: 0, lastActiveDate: td(), dailyLog: [], difficultyPresets: DEFAULT_PRESETS, nextActionWeights: { priority: 3, deadline: 2, difficulty: 1 }, notificationSettings: DEFAULT_NOTIFICATION_SETTINGS, dailyMission: null, tasksToday: 0, projTasksToday: 0, hardTaskToday: false, maxTaskToday: false, goalUpdatedToday: false, totalCoinsEarned: 0, bestXpDay: 0, bestXpWeek: 0, maxTaskEver: false, projectsCompleted: 0, masteryGoldCount: 0, achievementsUnlocked: [], pendingChest: null, streakLostDays: 0, purchasedItems: ["t_iniciante", "i_estrela", "obsidiana", "b_simples"], equippedTitle: "t_iniciante", equippedIcon: "i_estrela", equippedTheme: "obsidiana", equippedBorder: "b_simples", upgradeLevels: {} });
  const [loaded, setLoaded] = useState(false);
  const [rewardPopup, setRewardPopup] = useState(null);
  const [levelUpNotif, setLevelUpNotif] = useState(null);
  const [completionConfirm, setCompletionConfirm] = useState(null);
  const [routineSuggestion, setRoutineSuggestion] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [achieveNotif, setAchieveNotif] = useState(null);
  const [lastUndo, setLastUndo] = useState(null);
  const shownAchieveIds = useRef(new Set());
  const syncProfileRef = useRef(null);
  // Ref sempre atualizado com o profile mais recente — usado por earn() fora do updater
  const profileRef = useRef(profile);
  // Ref para coordenadas do swipe — substitui window._swipeX/Y (namespace global poluído)
  // Ref para estado de navegação — permite nav() com dep [] sem stale closure
  const navStateRef = useRef({ view, tab, subTab, selId, selType });
  const navHistoryRef = useRef(navHistory);
  const swipeRef = useRef(null);
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [winH, setWinH] = useState(() => window.innerHeight);
  const [tabSwipeOffset, setTabSwipeOffset] = useState(0);
  const isDesktop = winW >= 768 && winH >= 560;
  const isNarrowMobile = !isDesktop && winW < 600;
  const SIDEBAR_W = 220;
  const popupLeft = isDesktop ? `calc(50% + ${SIDEBAR_W / 2}px)` : "50%";
  // Centro dos popups fixos: metade da area de conteudo (direita da sidebar em desktop)
  useEffect(() => {
    const handler = () => setStorageError(true);
    window.addEventListener("app:storageError", handler);
    return () => window.removeEventListener("app:storageError", handler);
  }, []);
  useEffect(() => {
    if (!storageError) return;
    const t = setTimeout(() => setStorageError(false), 3000);
    return () => clearTimeout(t);
  }, [storageError]);
  // Mantém refs sempre sincronizados com o estado atual
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { navStateRef.current = { view, tab, subTab, selId, selType }; }, [view, tab, subTab, selId, selType]);
  useEffect(() => { navHistoryRef.current = navHistory; }, [navHistory]);
  // Reward popup auto-dismiss — duration scales with reward value
  useEffect(() => {
    if (!rewardPopup) return;
    const val = (rewardPopup.xp || 0) + (rewardPopup.coins || 0);
    const dur = val === 0 ? 1800 : val < 30 ? 2200 : val < 100 ? 2600 : val < 300 ? 3000 : 3500;
    const t = setTimeout(() => { setRewardPopup(null); setLastUndo(null); }, dur);
    return () => clearTimeout(t);
  }, [rewardPopup]);
  // Level-up notification auto-dismiss
  useEffect(() => {
    if (!levelUpNotif) return;
    const t = setTimeout(() => setLevelUpNotif(null), 3800);
    return () => clearTimeout(t);
  }, [levelUpNotif]);
  useEffect(() => {
    const unlocked = profile.achievementsUnlocked || [];
    const claimable = ACHIEVEMENTS.find(a => !unlocked.includes(a.id) && !shownAchieveIds.current.has(a.id) && a.check(profile));
    if (claimable) { shownAchieveIds.current.add(claimable.id); setAchieveNotif(claimable); }
  }, [profile.tasksCompleted, profile.bestStreak, profile.totalXp, profile.projectsCompleted]);

  useEffect(() => {
    const resizeHandler = () => {
      setWinW(window.innerWidth);
      setWinH(window.innerHeight);
    };
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  // Sync public profile to Supabase user_profiles with 5s debounce
  useEffect(() => {
    if (!loaded || !profile.username) return;
    if (syncProfileRef.current) clearTimeout(syncProfileRef.current);
    syncProfileRef.current = setTimeout(() => {
      Social.syncProfile({
        username: profile.username,
        totalXp: profile.totalXp || 0,
        streak: profile.streak || 0,
        tasksCompleted: profile.tasksCompleted || 0,
        projectsCompleted: profile.projectsCompleted || 0,
        objectivesCount: objectives.filter(o => o.status === "Ativo").length,
        equippedIcon: profile.equippedIcon || 'i_estrela',
        equippedBorder: profile.equippedBorder || 'b_simples',
        equippedTitle: profile.equippedTitle || 't_iniciante',
        equippedTheme: profile.equippedTheme || 'obsidiana',
        upgradeLevels: profile.upgradeLevels || {},
      }).catch(e => console.log('profile sync err', e));
    }, 5000);
    return () => { if (syncProfileRef.current) clearTimeout(syncProfileRef.current); };
  }, [loaded, profile.username, profile.totalXp, profile.streak, profile.tasksCompleted, profile.projectsCompleted, profile.equippedIcon, profile.equippedBorder, profile.equippedTitle, profile.equippedTheme, objectives.length]);

  // Detecta volta do background (virada de dia sem fechar o app)
  useEffect(() => {
    if (!loaded) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && profile.lastActiveDate !== td()) {
        // Força re-trigger do useEffect de reset diário
        setLoaded(false);
        setTimeout(() => setLoaded(true), 50);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loaded, profile.lastActiveDate]);

  useEffect(() => {
    (async () => {
      try {
        // Carrega todas as chaves em paralelo — reduz tempo de carregamento em ~8x
        const data = await S.getAll(["projects","routines","tasks","objectives","trash","reportNotes","reportFolders","atributos","profile"]);
        if (data.projects)     setProjects(data.projects);
        if (data.routines)     setRoutines(data.routines);
        if (data.tasks)        setTasks(data.tasks);
        if (data.objectives)   setObjectives(data.objectives);
        if (data.trash)        setTrash(data.trash);
        if (data.reportNotes)  setReportNotes(data.reportNotes);
        if (data.reportFolders) setReportFolders(data.reportFolders);
        if (data.atributos)    setAtributos(data.atributos);
        if (data.profile) {
          const pr = data.profile;
          if (!pr.purchasedItems) { pr.purchasedItems = ["t_iniciante", "i_estrela", "obsidiana", "b_simples"]; pr.equippedTitle = "t_iniciante"; pr.equippedIcon = "i_estrela"; pr.equippedTheme = "obsidiana"; pr.equippedBorder = "b_simples"; pr.upgradeLevels = pr.upgradeLevels || {}; }
          setProfile({ ...pr, notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(pr.notificationSettings || {}) } });
          // Suprime notificações de conquistas que já eram válidas ao abrir o app
          // (só notifica conquistas desbloqueadas DURANTE a sessão atual)
          ACHIEVEMENTS.forEach(a => { if (a.check(pr)) shownAchieveIds.current.add(a.id); });
        }
      } catch (e) { console.log("storage load err", e); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) S.set("projects", projects); }, [projects, loaded]);
  useEffect(() => { if (loaded) S.set("routines", routines); }, [routines, loaded]);
  useEffect(() => { if (loaded) S.set("tasks", tasks); }, [tasks, loaded]);
  useEffect(() => { if (loaded) S.set("objectives", objectives); }, [objectives, loaded]);
  useEffect(() => { if (loaded) S.set("trash", trash); }, [trash, loaded]);
  useEffect(() => { if (loaded) S.set("profile", profile); }, [profile, loaded]);
  useEffect(() => { if (loaded) S.set("reportNotes", reportNotes); }, [reportNotes, loaded]);
  useEffect(() => { if (loaded) S.set("reportFolders", reportFolders); }, [reportFolders, loaded]);
  useEffect(() => { if (loaded) S.set("atributos", atributos); }, [atributos, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const d = td();
    if (profile.lastActiveDate !== d) {
      // Calcula o gap real de dias (quantos dias se passaram desde o último reset)
      const daysGap = Math.max(1, Math.round(
        (new Date(d + "T12:00:00") - new Date(profile.lastActiveDate + "T12:00:00")) / 86400000
      ));
      // Constrói o log diário preenchendo dias faltantes com XP=0 (gráficos ficam corretos)
      const logEntries = [...(profile.dailyLog || [])];
      logEntries.push({ date: profile.lastActiveDate, xp: profile.xpToday, coins: profile.coinsToday });
      for (let i = 1; i < daysGap; i++) {
        const gapDate = new Date(profile.lastActiveDate + "T12:00:00");
        gapDate.setDate(gapDate.getDate() + i);
        logEntries.push({ date: gapDate.toISOString().split("T")[0], xp: 0, coins: 0 });
      }
      const log = logEntries.slice(-90);
      const wasActive = (profile.xpToday || 0) > 0;
      let newStreak = profile.streak || 0;
      let streakLostDays = 0;
      let shieldUsed = false;
      if (wasActive) {
        // +1 pelo dia ativo; penaliza dias intermediários sem atividade
        newStreak += 1;
        const missedBetween = daysGap - 1;
        if (missedBetween > 0) {
          const penalty = Math.min(newStreak, missedBetween * 5);
          newStreak = Math.max(0, newStreak - penalty);
          streakLostDays = penalty;
        }
      } else if (profile.shieldActive) {
        // Escudo protege 1 dia; dias extras além de 1 são penalizados normalmente
        shieldUsed = true;
        if (daysGap > 1) {
          const extraMissed = daysGap - 1;
          const penalty = Math.min(newStreak, extraMissed * 5);
          newStreak = Math.max(0, newStreak - penalty);
          streakLostDays = penalty;
        }
      } else {
        // Aplica penalidade para cada dia de ausência (fix: antes só aplicava 1 vez)
        const penalty = Math.min(newStreak, daysGap * 5);
        newStreak = Math.max(0, newStreak - penalty);
        streakLostDays = penalty;
      }
      const newBest = Math.max(profile.bestStreak || 0, newStreak);
      const last7 = log.slice(-7);
      const weekXp = last7.reduce((s, d2) => s + (d2.xp || 0), 0) + (profile.xpToday || 0);
      // Auto-deactivate routines with 5+ consecutive fails (skip Libre)
      setRoutines(prev => prev.map(r => {
        if (r.status !== "Ativa") return r;
        if (migrateFreq(r).freq === "Livre") return r;
        let missedDueCount = 0;
        let lastDueDone = false;
        for (let i = 0; i < daysGap; i++) {
          const checkDate = new Date(profile.lastActiveDate + "T12:00:00");
          checkDate.setDate(checkDate.getDate() + i);
          const dateStr = checkDate.toISOString().split("T")[0];
          if (!isRoutineDueOn(r, dateStr)) continue;
          const doneOnDate = (r.completionLog || []).some(l => l.date === dateStr);
          if (i === 0 && doneOnDate) lastDueDone = true;
          if (!doneOnDate) missedDueCount += 1;
        }
        if (missedDueCount === 0) {
          return lastDueDone ? { ...r, consecutiveFails: 0 } : r;
        }
        const newFails = (lastDueDone ? 0 : (r.consecutiveFails || 0)) + missedDueCount;
        if (newFails >= 5) return { ...r, consecutiveFails: newFails, status: "Desativada" };
        return { ...r, consecutiveFails: newFails };
      }));
      // V2: Auto-archive tasks overdue by 3+ days
      // Usa updater funcional para garantir acesso ao estado atual de tasks (evita stale closure)
      setTasks(currentTasks => {
        const toArchive = currentTasks.filter(t => {
          if (t.status !== "Pendente" || !t.deadline) return false;
          const daysOverdue = Math.floor((new Date(d) - new Date(t.deadline)) / 86400000);
          return daysOverdue >= 3;
        });
        if (toArchive.length === 0) return currentTasks;
        const archiveIds = new Set(toArchive.map(t => t.id));
        // Efeitos secundários agendados fora do updater (mantém updater puro)
        setTimeout(() => {
          setTrash(tr => [...tr, ...toArchive.map(t => ({ ...t, status: "Arquivada", _type: "task", deletedAt: Date.now(), autoArchived: true }))]);
          setObjectives(prev => prev.map(o => ({
            ...o,
            linkedActivities: (o.linkedActivities || []).filter(l => !(l.type === "task" && archiveIds.has(l.id)))
          })));
        }, 0);
        return currentTasks.filter(t => !archiveIds.has(t.id));
      });
      // Chest check
      let chest = null;
      const lv = getPoderInfo(profile.totalXp || 0).poder;
      if (newStreak >= 30 && lv >= 200) chest = "legendary";
      else if (newStreak >= 7 && lv >= 100) chest = "epic";
      else if (wasActive && (profile.tasksToday || 0) >= 5 && lv >= 50) chest = "rare";
      else if ((profile.tasksToday || 0) >= 3 && lv >= 25) chest = "common";
      setProfile(p => ({ ...p, xpToday: 0, coinsToday: 0, lastActiveDate: d, dailyLog: log, tasksToday: 0, projTasksToday: 0, hardTaskToday: false, maxTaskToday: false, goalUpdatedToday: false, streak: newStreak, bestStreak: newBest, streakLostDays: streakLostDays, bestXpWeek: Math.max(p.bestXpWeek || 0, weekXp), pendingChest: chest || p.pendingChest, shieldActive: shieldUsed ? false : p.shieldActive, dailyMission: null }));
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const now = Date.now();
    const cleaned = trash.filter(t => now - t.deletedAt < 30 * 86400000);
    if (cleaned.length !== trash.length) setTrash(cleaned);
  }, [loaded]);

  const earn = useCallback((xp, coins, msg, onEarned) => {
    // Lê o perfil atual via ref (evita mutações dentro do updater — antipadrão React)
    const p = profileRef.current;

    // Multiplicadores: CULTIVO (rank) + Streak são aditivos
    const streakMult = getMultiplier(p.streak);
    const currentRank = getRankInfo(getPoderInfo(p.totalXp || 0).poder);
    const cultivoPct = (currentRank.cultivo || 0) / 100;
    const totalMult = streakMult + cultivoPct;

    let finalXp = xp + Math.round(xp * totalMult);
    let finalCoins = coins; // streak e cultivo só multiplicam ENERGIA, não moedas
    const boostActive = p.boostExpiry && p.boostExpiry > Date.now();
    if (boostActive) finalCoins += Math.round(finalCoins * 0.25);

    const suffixes = [];
    if (cultivoPct > 0) suffixes.push("+" + Math.round(cultivoPct * 100) + "% cultivo");
    if (streakMult > 0) suffixes.push("+" + Math.round(streakMult * 100) + "% streak");
    if (boostActive) suffixes.push("+25% boost");
    const popupMsg = suffixes.length > 0 ? msg + " (" + suffixes.join(", ") + ")" : msg;

    // Verifica progressão de PODER e rank
    const oldPoder = getPoderInfo(p.totalXp || 0).poder;
    const newPoder = getPoderInfo((p.totalXp || 0) + finalXp).poder;
    let notifData = null;
    if (newPoder > oldPoder) {
      const oldRankInfo = getRankInfo(oldPoder);
      const newRankInfo = getRankInfo(newPoder);
      if (oldRankInfo.rankMain !== newRankInfo.rankMain) {
        // Mudança de rank principal → notificação especial
        notifData = { type: "rank", poder: newPoder, label: newRankInfo.subRank, rankMain: newRankInfo.rankMain, color: newRankInfo.color };
        // Mensagem especial para primeiro rank (F-)
        if (newRankInfo.rankMain === "F" && oldRankInfo.rankMain === null) {
          notifData.welcomeMsg = "Parabéns, Você começou a Jogar o Jogo de VERDADE (o da Vida). Conclua mais tarefas para alcançar novos patamares.";
        }
      } else {
        // Verifica se atingiu milestone de notificação de PODER
        const interval = newRankInfo.notifInterval;
        if (Math.floor(oldPoder / interval) < Math.floor(newPoder / interval)) {
          notifData = { type: "poder", poder: newPoder, label: newRankInfo.subRank, color: newRankInfo.color };
        }
      }
    }

    // Updater puro: sem efeitos colaterais, sem mutação de variáveis externas
    setProfile(prev => ({
      ...prev,
      totalXp: prev.totalXp + finalXp,
      coins: prev.coins + finalCoins,
      xpToday: prev.xpToday + finalXp,
      coinsToday: prev.coinsToday + finalCoins,
      totalCoinsEarned: (prev.totalCoinsEarned || 0) + finalCoins,
      bestXpDay: Math.max(prev.bestXpDay || 0, prev.xpToday + finalXp),
    }));
    setTimeout(() => { setRewardPopup({ xp: finalXp, coins: finalCoins, msg: popupMsg }); if (onEarned) onEarned(finalXp, finalCoins); }, 10);
    setTimeout(() => { if (notifData) setLevelUpNotif(notifData); }, 600);
  }, []);

  const nav = useCallback((t, st, v, id, tp) => {
    // Lê estado atual via ref — dep [] evita recriar nav e re-renderizar todos os filhos
    const { view: curView, tab: curTab, subTab: curSubTab, selId: curSelId, selType: curSelType } = navStateRef.current;
    // Push to history when navigating FROM a detail view TO another detail view
    if (curView === "detail" && v === "detail") {
      setNavHistory(prev => [...prev, { tab: curTab, subTab: curSubTab, view: curView, selId: curSelId, selType: curSelType }]);
    }
    // Clear history when going to a list (fresh start)
    if (v === "list") {
      setNavHistory([]);
    }
    if (t) setTab(t);
    if (st) setSubTab(st);
    setView(v || "list");
    setSelId(id || null);
    setSelType(tp || null);
  }, []);

  const navBack = useCallback(() => {
    const historyStack = navHistoryRef.current;
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setNavHistory(h => h.slice(0, -1));
      setTab(prev.tab);
      setSubTab(prev.subTab);
      setView(prev.view);
      setSelId(prev.selId);
      setSelType(prev.selType);
      return true;
    }

    const current = navStateRef.current;
    if (current.view !== "list" || current.selId || current.selType) {
      // Fallback: go to the list of the current subTab
      setView("list");
      setSelId(null);
      setSelType(null);
      return true;
    }

    return false;
  }, []);

  const openNotificationTarget = useCallback((target) => {
    if (!target) return;
    if (target.type === "task" && target.id) {
      nav("activities", "tasks", "detail", target.id, "task");
      return;
    }
    if (target.type === "routine" && target.id) {
      nav("activities", "routines", "detail", target.id, "routine");
      return;
    }
    if (target.type === "projectTask" && target.projectId) {
      nav("activities", "projects", "detail", target.projectId, "project");
      return;
    }
    if (target.type === "dayClosing") {
      nav("activities", "tasks", "list");
    }
  }, [nav]);

  const isSwipeBlockedTarget = useCallback((target) => {
    return !!target?.closest?.("input, textarea, select, button, [contenteditable='true'], [data-no-tab-swipe='true']");
  }, []);

  const switchTabBySwipe = useCallback((direction) => {
    const currentIndex = NAV_TABS.findIndex(([key]) => key === navStateRef.current.tab);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= NAV_TABS.length) return;
    setTab(NAV_TABS[nextIndex][0]);
    setView("list");
    setSelId(null);
    setSelType(null);
    setNavHistory([]);
  }, []);

  const handleTabTouchStart = useCallback((event) => {
    if (isDesktop) return;
    if (isSwipeBlockedTarget(event.target)) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    if (touch.clientX < 24 || touch.clientX > winW - 24) return;
    swipeRef.current = { x: touch.clientX, y: touch.clientY, active: false, blocked: false };
  }, [isDesktop, isSwipeBlockedTarget, winW]);

  const handleTabTouchMove = useCallback((event) => {
    if (!swipeRef.current || isDesktop) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const dx = touch.clientX - swipeRef.current.x;
    const dy = touch.clientY - swipeRef.current.y;

    if (swipeRef.current.blocked) return;
    if (!swipeRef.current.active && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      swipeRef.current.blocked = true;
      setTabSwipeOffset(0);
      return;
    }
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      swipeRef.current.active = true;
      setTabSwipeOffset(Math.max(-120, Math.min(120, dx)));
    }
  }, [isDesktop]);

  const handleTabTouchEnd = useCallback(() => {
    if (!swipeRef.current) return;
    const offset = tabSwipeOffset;
    const shouldSwitch = swipeRef.current.active && Math.abs(offset) >= 82;
    swipeRef.current = null;
    setTabSwipeOffset(0);
    if (shouldSwitch) switchTabBySwipe(offset < 0 ? 1 : -1);
  }, [switchTabBySwipe, tabSwipeOffset]);

  // Botão voltar do sistema (Android/browser) — navega dentro do app
  // Colocado APÓS navBack ser declarado para evitar TDZ
  useEffect(() => {
    const navBackRef = { current: navBack };
    navBackRef.current = navBack;
    const onPop = (e) => {
      e.preventDefault();
      const internalBack = new CustomEvent("app:internalBack", { detail: { handled: false } });
      window.dispatchEvent(internalBack);
      if (internalBack.detail.handled) {
        history.pushState(null, "", window.location.href);
        return;
      }
      const handled = navBackRef.current();
      if (handled) history.pushState(null, "", window.location.href);
    };
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navBack]);

  useEffect(() => {
    if (!loaded) return;
    const enabled = !!profile.notificationSettings?.notificationsEnabled;
    if (!enabled) {
      clearScheduledNotifications();
      return;
    }
    requestNotificationPermission().then(permission => {
      if (permission !== "granted") {
        clearScheduledNotifications();
        return;
      }
      const plan = buildNotificationPlan({ profile: profileRef.current, tasks, projects, routines });
      scheduleNotificationPlan(plan, openNotificationTarget);
    });
  }, [loaded, profile.notificationSettings?.notificationsEnabled, openNotificationTarget]);

  useEffect(() => {
    if (!loaded) return;
    const plan = buildNotificationPlan({ profile, tasks, projects, routines });
    scheduleNotificationPlan(plan, openNotificationTarget);
    return () => clearScheduledNotifications();
  }, [loaded, profile.notificationSettings, tasks, projects, routines, openNotificationTarget]);

  // V2: Bidirectional sync — keeps objective.linkedActivities in sync with activity.linkedObjectives
  const syncObjLinks = useCallback((actId, actType, newLinkedObjs, oldLinkedObjs) => {
    const newIds = (newLinkedObjs || []).map(l => l.id);
    const oldIds = (oldLinkedObjs || []).map(l => l.id);
    const added = newIds.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !newIds.includes(id));
    if (added.length > 0 || removed.length > 0) {
      setObjectives(prev => prev.map(o => {
        let la = [...(o.linkedActivities || [])];
        if (added.includes(o.id) && !la.find(l => l.id === actId && l.type === actType)) {
          la = [...la, { id: actId, type: actType }];
        }
        if (removed.includes(o.id)) {
          la = la.filter(l => !(l.id === actId && l.type === actType));
        }
        return { ...o, linkedActivities: la };
      }));
    }
  }, []);

  // V2: Sync phaseRef on routines when project phases change
  const syncPhaseRefs = useCallback((projectId, phases) => {
    const linkedRoutineIds = new Set();
    (phases || []).forEach(ph => {
      (ph.linkedRoutines || []).forEach(lr => {
        linkedRoutineIds.add(lr.routineId);
        setRoutines(prev => prev.map(r => r.id === lr.routineId ? { ...r, phaseRef: { projectId, phaseId: ph.id } } : r));
      });
    });
    // Clean phaseRef for routines that were unlinked from this project
    setRoutines(prev => prev.map(r => {
      if (r.phaseRef && r.phaseRef.projectId === projectId && !linkedRoutineIds.has(r.id)) {
        return { ...r, phaseRef: null };
      }
      return r;
    }));
  }, []);

  const addProject = useCallback((p) => {
    const id = uid();
    const newP = { ...p, id, createdAt: td(), status: p.status || "Ativo", xpAccum: 0, progress: 0 };
    setProjects(pr => [...pr, newP]);
    syncObjLinks(id, "project", p.linkedObjectives, []);
    syncPhaseRefs(id, p.phases);
    nav("activities", "projects", "list");
  }, [syncObjLinks, syncPhaseRefs, nav]);

  const updProject = useCallback((p) => {
    // Lê linkedObjectives antigos dentro do updater — elimina dep em `projects`
    let oldLinkedObjs = [];
    setProjects(pr => {
      const old = pr.find(x => x.id === p.id);
      oldLinkedObjs = old ? (old.linkedObjectives || []) : [];
      return pr.map(x => x.id === p.id ? p : x);
    });
    syncObjLinks(p.id, "project", p.linkedObjectives, oldLinkedObjs);
    syncPhaseRefs(p.id, p.phases);
  }, [syncObjLinks, syncPhaseRefs]);

  const addRoutine = useCallback((r) => {
    const id = uid();
    const newR = { ...r, id, createdAt: td(), status: "Ativa", xpAccum: 0, streak: 0, bestStreak: 0, totalCompletions: 0, consecutiveFails: 0, completionLog: [] };
    setRoutines(pr => [...pr, newR]);
    syncObjLinks(id, "routine", r.linkedObjectives, []);
    nav("activities", "routines", "list");
  }, [syncObjLinks, nav]);

  const updRoutine = useCallback((r) => {
    let oldLinkedObjs = [];
    setRoutines(pr => {
      const old = pr.find(x => x.id === r.id);
      oldLinkedObjs = old ? (old.linkedObjectives || []) : [];
      return pr.map(x => x.id === r.id ? r : x);
    });
    syncObjLinks(r.id, "routine", r.linkedObjectives, oldLinkedObjs);
  }, [syncObjLinks]);

  const addTask = useCallback((t) => {
    const id = uid();
    const newTask = { ...t, id, createdAt: td(), status: "Pendente" };
    // Captura resultado do updater para disparar side effect fora (StrictMode-safe)
    let shouldSuggest = false;
    setTasks(pr => {
      const all = [...pr, newTask];
      const similar = all.filter(x => x.name && similarName(x.name, newTask.name) && x.id !== newTask.id);
      shouldSuggest = similar.length >= 2;
      return all;
    });
    if (shouldSuggest) {
      setTimeout(() => setRoutineSuggestion(newTask.name), 100);
      setTimeout(() => setRoutineSuggestion(null), 6000);
    }
    syncObjLinks(id, "task", t.linkedObjectives, []);
    nav("activities", "tasks", "list");
  }, [syncObjLinks, nav]);

  const createPlannedTask = useCallback((t) => {
    const id = uid();
    const newTask = { ...t, id, createdAt: td(), status: "Pendente" };
    setTasks(pr => [...pr, newTask]);
    syncObjLinks(id, "task", t.linkedObjectives, []);
    return newTask;
  }, [syncObjLinks]);

  const createPlannedRoutine = useCallback((r) => {
    const nameKey = String(r?.name || "").trim();
    const existing = (routines || []).find(item => item.name && similarName(item.name, nameKey));
    if (existing) return { item: existing, existing: true };

    const id = uid();
    const newRoutine = {
      ...r,
      id,
      createdAt: td(),
      status: "Ativa",
      xpAccum: 0,
      streak: 0,
      bestStreak: 0,
      totalCompletions: 0,
      consecutiveFails: 0,
      completionLog: [],
    };
    setRoutines(pr => [...pr, newRoutine]);
    syncObjLinks(id, "routine", r.linkedObjectives, []);
    return { item: newRoutine, existing: false };
  }, [routines, syncObjLinks]);

  const createPlannedProject = useCallback((p) => {
    const nameKey = String(p?.name || "").trim();
    const existing = (projects || []).find(item => item.name && similarName(item.name, nameKey));
    if (existing) return { item: existing, existing: true };

    const id = uid();
    const newProject = { ...p, id, createdAt: td(), status: p.status || "Ativo", xpAccum: 0, progress: 0 };
    setProjects(pr => [...pr, newProject]);
    syncObjLinks(id, "project", p.linkedObjectives, []);
    syncPhaseRefs(id, p.phases);
    return { item: newProject, existing: false };
  }, [projects, syncObjLinks, syncPhaseRefs]);

  const createPlannedProjectTask = useCallback(({ projectId, phaseId, task }) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error("Projeto nao encontrado.");

    const defaultPhase = { id: uid(), name: "Planejamento", order: 1, tasks: [], linkedRoutines: [], status: "Ativa" };
    const initialPhases = (project.phases || []).length ? (project.phases || []) : [defaultPhase];
    const initialTargetPhase = initialPhases.find(ph => ph.id === phaseId)
      || initialPhases.find(ph => (ph.status || "Ativa") === "Ativa")
      || initialPhases[0];
    const resolvedPhaseId = initialTargetPhase.id;
    const taskNameKey = String(task?.name || "").trim().toLowerCase();
    const taskDeadline = task?.deadline || "";
    const taskDeadlineTime = task?.deadlineTime || "";
    const existingInitialTask = initialPhases
      .flatMap(ph => (ph.tasks || []).map(item => ({ ...item, phaseId: ph.id })))
      .find(item => {
        const sameName = String(item.name || "").trim().toLowerCase() === taskNameKey;
        const sameDeadline = (item.deadline || "") === taskDeadline;
        const sameTime = (item.deadlineTime || "") === taskDeadlineTime;
        return sameName && sameDeadline && sameTime;
      });

    if (existingInitialTask) {
      return { task: existingInitialTask, projectId: project.id, phaseId: existingInitialTask.phaseId || resolvedPhaseId };
    }

    const id = uid();
    const newTask = { ...(task || {}), id, createdAt: td(), status: "Pendente" };

    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;

      let phases = (project.phases || []).length
        ? (project.phases || [])
        : [defaultPhase];
      const targetPhase = phases.find(ph => ph.id === resolvedPhaseId)
        || phases.find(ph => (ph.status || "Ativa") === "Ativa")
        || phases[0];

      const existingTask = phases
        .flatMap(ph => (ph.tasks || []).map(item => ({ ...item, phaseId: ph.id })))
        .find(item => {
          const sameName = String(item.name || "").trim().toLowerCase() === taskNameKey;
          const sameDeadline = (item.deadline || "") === taskDeadline;
          const sameTime = (item.deadlineTime || "") === taskDeadlineTime;
          return sameName && sameDeadline && sameTime;
        });

      if (existingTask) {
        return project;
      }

      phases = phases.map(phase => (
        phase.id === targetPhase.id
          ? { ...phase, tasks: [...(phase.tasks || []), newTask] }
          : phase
      ));
      const all = phases.flatMap(ph => ph.tasks || []);
      const done = all.filter(t => t.status === "Concluída").length;
      return { ...project, phases, progress: all.length ? Math.round(done / all.length * 100) : 0 };
    }));

    return { task: newTask, projectId: project.id, phaseId: resolvedPhaseId };
  }, [projects]);

  const updTask = useCallback((t) => {
    let oldLinkedObjs = [];
    setTasks(pr => {
      const old = pr.find(x => x.id === t.id);
      oldLinkedObjs = old ? (old.linkedObjectives || []) : [];
      return pr.map(x => x.id === t.id ? t : x);
    });
    syncObjLinks(t.id, "task", t.linkedObjectives, oldLinkedObjs);
  }, [syncObjLinks]);

  // V2: Objective CRUD
  const syncObjToObjLinks = useCallback((objId, newLinkedObjs, oldLinkedObjs) => {
    const newIds = (newLinkedObjs || []).map(l => l.id);
    const oldIds = (oldLinkedObjs || []).map(l => l.id);
    const reverseRel = (rel) => rel === "maior" ? "menor" : "maior";
    // Add reverse links for new connections
    (newLinkedObjs || []).forEach(l => {
      if (!oldIds.includes(l.id)) {
        setObjectives(prev => prev.map(o => {
          if (o.id !== l.id) return o;
          const existing = (o.linkedObjectives || []).find(x => x.id === objId);
          if (existing) return o;
          return { ...o, linkedObjectives: [...(o.linkedObjectives || []), { id: objId, relation: reverseRel(l.relation) }] };
        }));
      }
    });
    // Remove reverse links for removed connections
    oldIds.filter(id => !newIds.includes(id)).forEach(id => {
      setObjectives(prev => prev.map(o => {
        if (o.id !== id) return o;
        return { ...o, linkedObjectives: (o.linkedObjectives || []).filter(x => x.id !== objId) };
      }));
    });
  }, []);

  const addObjective = (obj) => {
    const id = uid();
    const newObj = { ...obj, id, createdAt: td(), status: "Ativo", xpMirror: 0, linkedActivities: obj.linkedActivities || [], linkedObjectives: obj.linkedObjectives || [] };
    setObjectives(prev => [...prev, newObj]);
    // Sync reverse links to other objectives
    setTimeout(() => syncObjToObjLinks(id, obj.linkedObjectives, []), 0);
    nav("activities", "objectives", "list");
  };
  const updObjective = (obj) => {
    const old = objectives.find(x => x.id === obj.id);
    setObjectives(prev => prev.map(x => x.id === obj.id ? obj : x));
    syncObjToObjLinks(obj.id, obj.linkedObjectives, old ? old.linkedObjectives : []);
  };
  const deleteObjective = (objId, deleteAll) => {
    const obj = objectives.find(o => o.id === objId);
    if (deleteAll) {
      if (obj) {
        // Coleta itens vinculados a partir do estado atual antes de remover
        // Passa pelo trash (recuperável) em vez de deleção permanente
        const now = Date.now();
        const toTrash = [];
        const projIds = new Set(), rotIds = new Set(), taskIds = new Set();
        (obj.linkedActivities || []).forEach(link => {
          if (link.type === "project") {
            const item = projects.find(x => x.id === link.id);
            if (item) { toTrash.push({ ...item, _type: "project", deletedAt: now }); projIds.add(link.id); }
          }
          if (link.type === "routine") {
            const item = routines.find(x => x.id === link.id);
            if (item) { toTrash.push({ ...item, _type: "routine", deletedAt: now }); rotIds.add(link.id); }
          }
          if (link.type === "task") {
            const item = tasks.find(x => x.id === link.id);
            if (item) { toTrash.push({ ...item, _type: "task", deletedAt: now }); taskIds.add(link.id); }
          }
        });
        if (projIds.size)  setProjects(prev => prev.filter(x => !projIds.has(x.id)));
        if (rotIds.size)   setRoutines(prev => prev.filter(x => !rotIds.has(x.id)));
        if (taskIds.size)  setTasks(prev => prev.filter(x => !taskIds.has(x.id)));
        if (toTrash.length) setTrash(prev => [...prev, ...toTrash]);
      }
    } else {
      removeObjectiveLinksFromActivities(objId, setProjects, setRoutines, setTasks);
    }
    setObjectives(prev => prev
      .filter(o => o.id !== objId)
      .map(o => ({
        ...o,
        linkedObjectives: (o.linkedObjectives || []).filter(link => link.id !== objId)
      }))
    );
    nav("activities", "objectives", "list");
  };

  const deleteItem = (item, type, permanent) => {
    const m = { project: setProjects, routine: setRoutines, task: setTasks };
    m[type](pr => pr.filter(x => x.id !== item.id));
    if (!permanent) setTrash(pr => [...pr, { ...item, _type: type, deletedAt: Date.now() }]);
    // V2: Clean up objective links when deleting activity
    setObjectives(prev => prev.map(o => ({
      ...o,
      linkedActivities: (o.linkedActivities || []).filter(l => !(l.id === item.id && l.type === type))
    })));
    // V2: Clean up phase routineRef when deleting routine + log removal
    if (type === "routine") {
      setProjects(prev => prev.map(p => ({
        ...p,
        phases: (p.phases || []).map(ph => {
          const hadRoutine = (ph.linkedRoutines || []).some(lr => lr.routineId === item.id);
          return {
            ...ph,
            linkedRoutines: (ph.linkedRoutines || []).filter(lr => lr.routineId !== item.id),
            logs: hadRoutine ? [...(ph.logs || []), { type: "routineRemoved", routineName: item.name, date: td() }] : (ph.logs || [])
          };
        })
      })));
    }
    // V2: Clean phaseRef from routines when deleting a project
    if (type === "project") {
      setRoutines(prev => prev.map(r => {
        if (r.phaseRef && r.phaseRef.projectId === item.id) return { ...r, phaseRef: null };
        return r;
      }));
    }
  };
  const restoreItem = (item) => {
    const m = { project: setProjects, routine: setRoutines, task: setTasks, objective: setObjectives };
    const { _type, deletedAt, autoArchived, ...clean } = item;
    if (m[_type]) m[_type](pr => pr.some(x => x.id === clean.id) ? pr : [...pr, clean]);

    if (_type === "project" || _type === "routine" || _type === "task") {
      const linkedObjectiveIds = new Set((clean.linkedObjectives || []).map(link => link.id));
      if (linkedObjectiveIds.size > 0) {
        setObjectives(prev => prev.map(o => {
          if (!linkedObjectiveIds.has(o.id)) return o;
          const alreadyLinked = (o.linkedActivities || []).some(link => link.id === clean.id && link.type === _type);
          if (alreadyLinked) return o;
          return { ...o, linkedActivities: [...(o.linkedActivities || []), { id: clean.id, type: _type }] };
        }));
      }
    }

    if (_type === "objective") {
      setObjectives(prev => prev.map(o => {
        const reverseLink = (clean.linkedObjectives || []).find(link => link.id === o.id);
        if (!reverseLink) return o;
        const alreadyLinked = (o.linkedObjectives || []).some(link => link.id === clean.id);
        if (alreadyLinked) return o;
        return {
          ...o,
          linkedObjectives: [
            ...(o.linkedObjectives || []),
            { id: clean.id, relation: reverseLink.relation === "maior" ? "menor" : "maior" }
          ]
        };
      }));
      const relinkObjectiveInActivities = (items) => items.map(activity => {
        const isLinked = (clean.linkedActivities || []).some(link => link.id === activity.id);
        if (!isLinked) return activity;
        const alreadyLinked = (activity.linkedObjectives || []).some(link => link.id === clean.id);
        if (alreadyLinked) return activity;
        return { ...activity, linkedObjectives: [...(activity.linkedObjectives || []), { id: clean.id }] };
      });
      setProjects(prev => relinkObjectiveInActivities(prev));
      setRoutines(prev => relinkObjectiveInActivities(prev));
      setTasks(prev => relinkObjectiveInActivities(prev));
    }

    if (_type === "routine" && clean.phaseRef?.projectId && clean.phaseRef?.phaseId) {
      setProjects(prev => prev.map(project => {
        if (project.id !== clean.phaseRef.projectId) return project;
        return {
          ...project,
          phases: (project.phases || []).map(phase => {
            if (phase.id !== clean.phaseRef.phaseId) return phase;
            const alreadyLinked = (phase.linkedRoutines || []).some(link => link.routineId === clean.id);
            if (alreadyLinked) return phase;
            return { ...phase, linkedRoutines: [...(phase.linkedRoutines || []), { routineId: clean.id }] };
          })
        };
      }));
    }

    if (_type === "project") {
      const routinePhaseRefs = (clean.phases || []).flatMap(phase =>
        (phase.linkedRoutines || []).map(link => ({ routineId: link.routineId, phaseId: phase.id }))
      );
      if (routinePhaseRefs.length > 0) {
        setRoutines(prev => prev.map(routine => {
          const match = routinePhaseRefs.find(link => link.routineId === routine.id);
          if (!match) return routine;
          return { ...routine, phaseRef: { projectId: clean.id, phaseId: match.phaseId } };
        }));
      }
    }

    setTrash(pr => pr.filter(x => !(x.id === item.id && x._type === item._type)));
  };

  // V2: Promote task to project
  const promoteTaskToProject = (task) => {
    const projId = uid();
    const newProj = {
      id: projId, createdAt: td(), status: "Ativo", xpAccum: 0, progress: 0,
      name: task.name, objective: task.description || "", notes: task.notes || [],
      color: task.color || COLORS[0], linkedObjectives: task.linkedObjectives || [],
      phases: [], modulars: { description: false, category: false, priority: true, deadline: false, color: true, notes: false },
    };
    // Archive the task
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setTrash(pr => [...pr, { ...task, _type: "task", deletedAt: Date.now(), promotedToProject: true }]);
    // Clean objective links from task, add to project
    setObjectives(prev => prev.map(o => ({
      ...o,
      linkedActivities: (o.linkedActivities || []).map(l => 
        l.id === task.id && l.type === "task" ? { id: projId, type: "project" } : l
      )
    })));
    // Add project and navigate to edit form
    setProjects(pr => [...pr, newProj]);
    syncObjLinks(projId, "project", task.linkedObjectives, []);
    nav("activities", "projects", "edit", projId, "project");
  };

  const completeTask = useCallback((taskId, parentType, parentId, phaseId) => {
    if (parentType === "project" && parentId) {
      // Objeto mutável captura valores do updater — seguro em StrictMode porque o
      // updater é determinístico: mesma entrada (prev) → mesmos valores no result.
      const result = { taskDiff: 1, taskName: "", didComplete: false, prevProject: null, oldXpAcc: 0, newXpAcc: 0, completionData: null };
      setProjects(prev => {
        const proj = prev.find(p => p.id === parentId);
        if (!proj) return prev;
        result.prevProject = JSON.parse(JSON.stringify(proj));
        let taskDiff = 1;
        const phases = (proj.phases || []).map(ph => {
          if (phaseId && ph.id !== phaseId) return ph;
          const updTasks = (ph.tasks || []).map(t => {
            if (t.id !== taskId || t.status === "Concluída") return t;
            taskDiff = t.difficulty || 1;
            result.taskDiff = taskDiff;
            result.taskName = t.name;
            result.didComplete = true;
            return { ...t, status: "Concluída", completedAt: td() };
          });
          // V2: Auto-complete phase when all tasks done
          const allPhaseDone = updTasks.length > 0 && updTasks.every(t => t.status === "Concluída");
          return { ...ph, tasks: updTasks, status: allPhaseDone ? "Concluída" : (ph.status || "Ativa") };
        });
        const all = phases.flatMap(ph => ph.tasks || []);
        const done = all.filter(t => t.status === "Concluída").length;
        const progress = all.length ? Math.round(done / all.length * 100) : 0;
        result.oldXpAcc = proj.xpAccum || 0;
        result.newXpAcc = result.oldXpAcc + getXp(taskDiff);
        const np = { ...proj, phases, progress, xpAccum: result.newXpAcc };
        if (checkProjectCompletion(np) && proj.status === "Ativo" && (proj.progress || 0) < 100) {
          result.completionData = { type: "project", id: proj.id, name: proj.name };
        }
        return prev.map(p => p.id === parentId ? np : p);
      });
      // Efeitos colaterais FORA do updater — executam uma vez, após o commit do React
      if (result.didComplete) {
        earn(getXp(result.taskDiff), getCoins(result.taskDiff), result.taskName, (xpAdded, coinsAdded) => {
          setLastUndo({ type: 'projectTask', id: taskId, parentId, xpAdded, coinsAdded, prevProject: result.prevProject });
        });
        setProfile(pr => ({ ...pr, tasksCompleted: (pr.tasksCompleted || 0) + 1, tasksToday: (pr.tasksToday || 0) + 1, projTasksToday: (pr.projTasksToday || 0) + 1, hardTaskToday: pr.hardTaskToday || result.taskDiff >= 11, maxTaskToday: pr.maxTaskToday || result.taskDiff >= 20, maxTaskEver: pr.maxTaskEver || result.taskDiff >= 20 }));
        const mBonus = getMasteryBonus(result.oldXpAcc, result.newXpAcc);
        if (mBonus > 0) {
          setTimeout(() => {
            setProfile(pr2 => ({ ...pr2, coins: pr2.coins + mBonus, totalCoinsEarned: (pr2.totalCoinsEarned || 0) + mBonus }));
            setRewardPopup({ xp: 0, coins: mBonus, msg: "Maestria! " + getMastery(result.newXpAcc).name });
          }, 800);
        }
        if (result.completionData) setTimeout(() => setCompletionConfirm(result.completionData), 500);
      }
    } else {
      const result = { taskDiff: 1, taskName: "", didComplete: false, prevTask: null };
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId || t.status === "Concluída") return t;
        result.prevTask = { ...t };
        result.taskDiff = t.difficulty || 1;
        result.taskName = t.name;
        result.didComplete = true;
        return { ...t, status: "Concluída", completedAt: td() };
      }));
      if (result.didComplete) {
        earn(getXp(result.taskDiff), getCoins(result.taskDiff), result.taskName, (xpAdded, coinsAdded) => {
          setLastUndo({ type: 'task', id: taskId, xpAdded, coinsAdded, prevItem: result.prevTask });
        });
        setProfile(pr => ({ ...pr, tasksCompleted: (pr.tasksCompleted || 0) + 1, tasksToday: (pr.tasksToday || 0) + 1, hardTaskToday: pr.hardTaskToday || result.taskDiff >= 11, maxTaskToday: pr.maxTaskToday || result.taskDiff >= 20, maxTaskEver: pr.maxTaskEver || result.taskDiff >= 20 }));
      }
    }
  }, [earn]);

  const completeRoutine = useCallback((rid) => {
    const result = { xp: 0, co: 0, isLibre: false, didComplete: false, prevRoutine: null, oldXpAcc: 0, newXpAcc: 0, phaseRef: null, routineName: "" };
    setRoutines(prev => prev.map(r => {
      if (r.id !== rid) return r;
      result.prevRoutine = { ...r };
      result.isLibre = migrateFreq(r).freq === "Livre";
      result.xp = getXp(r.difficulty || 1);
      result.co = getCoins(r.difficulty || 1);
      result.didComplete = true;
      result.oldXpAcc = r.xpAccum || 0;
      result.newXpAcc = result.oldXpAcc + result.xp;
      result.phaseRef = r.phaseRef;
      result.routineName = r.name;
      // V2: Rotina Livre não acumula streak
      const ns = result.isLibre ? 0 : r.streak + 1;
      return { ...r, streak: ns, bestStreak: result.isLibre ? r.bestStreak : Math.max(r.bestStreak, ns), totalCompletions: r.totalCompletions + 1, consecutiveFails: 0, xpAccum: result.newXpAcc, completionLog: [...(r.completionLog || []), { date: td(), xp: result.xp, coins: result.co }] };
    }));
    // Efeitos colaterais FORA do updater
    if (result.didComplete) {
      earn(result.xp, result.co, result.routineName, (xpAdded, coinsAdded) => {
        setLastUndo({ type: 'routine', id: rid, xpAdded, coinsAdded, prevItem: result.prevRoutine });
      });
      const mBonus = getMasteryBonus(result.oldXpAcc, result.newXpAcc);
      if (mBonus > 0) {
        setTimeout(() => {
          setProfile(p => ({ ...p, coins: p.coins + mBonus, totalCoinsEarned: (p.totalCoinsEarned || 0) + mBonus }));
          setRewardPopup({ xp: 0, coins: mBonus, msg: "Maestria! " + getMastery(result.newXpAcc).name });
        }, 800);
      }
      // V2: XP de rotina acumula no projeto pai se vinculada a uma fase
      if (result.phaseRef && result.phaseRef.projectId) {
        setProjects(prev => prev.map(p => {
          if (p.id !== result.phaseRef.projectId) return p;
          return { ...p, xpAccum: (p.xpAccum || 0) + result.xp };
        }));
      }
    }
  }, [earn]);

  const undoCompletion = useCallback(() => {
    if (!lastUndo) return;
    const { type, id, parentId, xpAdded, coinsAdded, prevItem, prevProject } = lastUndo;
    setProfile(p => ({
      ...p,
      totalXp: Math.max(0, p.totalXp - xpAdded),
      coins: Math.max(0, p.coins - coinsAdded),
      xpToday: Math.max(0, p.xpToday - xpAdded),
      coinsToday: Math.max(0, p.coinsToday - coinsAdded),
      totalCoinsEarned: Math.max(0, (p.totalCoinsEarned || 0) - coinsAdded),
      ...(type === 'task' || type === 'projectTask' ? { tasksCompleted: Math.max(0, (p.tasksCompleted || 0) - 1), tasksToday: Math.max(0, (p.tasksToday || 0) - 1) } : {}),
    }));
    if (type === 'task' && prevItem) setTasks(prev => prev.map(t => t.id === id ? prevItem : t));
    if (type === 'routine' && prevItem) setRoutines(prev => prev.map(r => r.id === id ? prevItem : r));
    if (type === 'projectTask' && prevProject) setProjects(prev => prev.map(p => p.id === parentId ? prevProject : p));
    setLastUndo(null);
    setRewardPopup(null);
  }, [lastUndo]);

  // V2: New acceptCompletion — no XP/coins reward
  const acceptCompletion = () => {
    if (!completionConfirm) return;
    if (completionConfirm.type === "project") {
      setProjects(pr => pr.map(p => p.id === completionConfirm.id ? { ...p, status: "Concluído" } : p));
      setProfile(p => ({ ...p, projectsCompleted: (p.projectsCompleted || 0) + 1 }));
    }
    setCompletionConfirm(null);
  };

  const upgradeItem = useCallback((itemId, level) => {
    const cost = getUpgradeCost(level);
    if (!cost) return;
    setProfile(p => {
      if (p.coins < cost) return p;
      if (!p.purchasedItems?.includes(itemId)) return p;
      const cur = (p.upgradeLevels || {})[itemId] || 0;
      if (cur !== level) return p;
      return { ...p, coins: p.coins - cost, upgradeLevels: { ...(p.upgradeLevels || {}), [itemId]: level + 1 } };
    });
    setRewardPopup({ xp: 0, coins: 0, msg: UPGRADE_LABELS[level + 1] || ("Nível " + (level + 1)) });
  }, []);

  const buyConsumable = useCallback((itemId, price) => {
    setProfile(p => {
      if (p.coins < price) return p;
      const np = { ...p, coins: p.coins - price };
      if (itemId === "c_escudo") { np.shieldActive = true; }
      else if (itemId === "c_boost") { np.boostExpiry = Date.now() + 24 * 60 * 60 * 1000; }
      else if (itemId === "c_bau_comum") {
        const coins = 15 + Math.floor(Math.random() * 36);
        const shield = Math.random() < 0.05;
        const boost = !shield && Math.random() < 0.08;
        const extra = boost ? Math.floor(coins * 0.5) : 0;
        const total = coins + extra;
        np.coins += total; np.totalCoinsEarned = (np.totalCoinsEarned || 0) + total;
        if (shield) np.shieldActive = true;
        const bonus = shield ? " + Escudo ativo" : boost ? " + Boost ativo" : "";
        setTimeout(() => { setRewardPopup({ xp: 0, coins: total, msg: "Baú Comum aberto!" + bonus }); }, 50);
      } else if (itemId === "c_bau_raro") {
        const coins = 50 + Math.floor(Math.random() * 91);
        const shield = Math.random() < 0.12;
        const boost = !shield && Math.random() < 0.15;
        const extra = boost ? Math.floor(coins * 0.5) : 0;
        const total = coins + extra;
        np.coins += total; np.totalCoinsEarned = (np.totalCoinsEarned || 0) + total;
        if (shield) np.shieldActive = true;
        const bonus = shield ? " + Escudo ativo" : boost ? " + Boost ativo" : "";
        setTimeout(() => { setRewardPopup({ xp: 0, coins: total, msg: "Baú Raro aberto!" + bonus }); }, 50);
      }
      return np;
    });
    if (itemId === "c_escudo") { setRewardPopup({ xp: 0, coins: 0, msg: "Escudo ativado!" }); }
    if (itemId === "c_boost") { setRewardPopup({ xp: 0, coins: 0, msg: "Boost +25% moedas por 24h!" }); }
  }, []);

  const buyItem = useCallback((itemId, price, type) => {
    setProfile(p => {
      if (p.coins < price) return p;
      if ((p.purchasedItems || []).includes(itemId)) return p;
      const np = { ...p, coins: p.coins - price, purchasedItems: [...(p.purchasedItems || []), itemId] };
      if (type === "titles") np.equippedTitle = itemId;
      if (type === "icons") np.equippedIcon = itemId;
      if (type === "themes") np.equippedTheme = itemId;
      if (type === "borders") np.equippedBorder = itemId;
      return np;
    });
  }, []);

  const equipItem = useCallback((itemId, type) => {
    setProfile(p => {
      if (type === "titles") return { ...p, equippedTitle: itemId };
      if (type === "icons") return { ...p, equippedIcon: itemId };
      if (type === "themes") return { ...p, equippedTheme: itemId };
      if (type === "borders") return { ...p, equippedBorder: itemId };
      return p;
    });
  }, []);

  const setDailyMission = useCallback((mission) => {
    setProfile(p => ({ ...p, dailyMission: mission }));
  }, []);

  const claimMissionRpg = useCallback(() => {
    const m = profile.dailyMission;
    if (!m || m.completed) return;
    const energia = m.energia || 0;
    const coins = m.coins || 0;
    if (energia > 0) {
      earn(energia, 0, "Missão " + (m.rankId || m.rankMain || "") + " concluída!");
    }
    if (coins > 0) {
      setProfile(p => ({ ...p, coins: p.coins + coins, coinsToday: (p.coinsToday || 0) + coins, totalCoinsEarned: (p.totalCoinsEarned || 0) + coins, dailyMission: { ...p.dailyMission, completed: true, claimedAt: td() } }));
    } else {
      setProfile(p => ({ ...p, dailyMission: { ...p.dailyMission, completed: true, claimedAt: td() } }));
    }
    setRewardPopup({ xp: energia, coins, msg: "Missao " + (m.rankId || m.rankMain || "") + " concluida!" });
  }, [profile.dailyMission, earn]);

  const recoverStreak = useCallback((opt) => {
    if (profile.coins < opt.cost) return;
    setProfile(p => {
      const entry = { date: td(), days: opt.days, cost: opt.cost };
      return { ...p, coins: p.coins - opt.cost, streak: p.streak + opt.days, bestStreak: Math.max(p.bestStreak, p.streak + opt.days), streakRecoveries: [...(p.streakRecoveries || []), entry] };
    });
    setRewardPopup({ xp: 0, coins: 0, msg: opt.days + " dias de streak restaurados" });
  }, [profile.coins]);

  const openChestAction = useCallback(() => {
    const type = profile.pendingChest;
    if (!type) return;
    const result = openChest(type);
    const ct = CHEST_TYPES.find(c => c.id === type);
    const bonusMsg = result.shield ? " + Escudo ativo" : result.boost ? " + Boost de moedas ativo" : "";
    const extraCoins = result.boost ? Math.floor(result.coins * 0.5) : 0;
    const totalCoins = result.coins + extraCoins;
    setProfile(p => ({ ...p, coins: p.coins + totalCoins, totalCoinsEarned: (p.totalCoinsEarned || 0) + totalCoins, pendingChest: null, shieldActive: result.shield ? true : p.shieldActive }));
    setRewardPopup({ xp: 0, coins: totalCoins, msg: "Baú " + (ct ? ct.name : "") + " aberto!" + bonusMsg });
  }, [profile.pendingChest]);

  const claimAchievement = useCallback((ach) => {
    setProfile(p => {
      if ((p.achievementsUnlocked || []).includes(ach.id)) return p;
      return { ...p, coins: p.coins + ach.coins, totalCoinsEarned: (p.totalCoinsEarned || 0) + ach.coins, achievementsUnlocked: [...(p.achievementsUnlocked || []), ach.id] };
    });
    setRewardPopup({ xp: 0, coins: ach.coins, msg: "Conquista: " + ach.text });
  }, []);

  const _themeKey = profile.equippedTheme;
  const _themeUpLv = (profile.upgradeLevels || {})[_themeKey] || 0;
  const _computedTheme = useMemo(() => {
    const base = THEMES[_themeKey] || THEMES.obsidiana;
    const info = SHOP_THEMES_LIST.find(t => t.id === _themeKey) || SHOP_THEMES_LIST[0];
    return { ...base, ...generateThemeTones(info.accent, info.rarity, _themeUpLv) };
  }, [_themeKey, _themeUpLv]);
  // useLayoutEffect: aplica o tema antes do paint — evita flash de cor errada
  // e remove o efeito colateral do corpo do render (violação das regras do React)
  useLayoutEffect(() => { setCurrentTheme(_computedTheme); }, [_computedTheme]);

  const levelInfo  = useMemo(() => getLevelInfo(profile.totalXp || 0), [profile.totalXp]);
  const poderInfo  = useMemo(() => getPoderInfo(profile.totalXp || 0), [profile.totalXp]);
  const rankInfo   = useMemo(() => getRankInfo(poderInfo.poder), [poderInfo.poder]);
  const sel = useMemo(() => {
    if (!selId) return null;
    if (selType === "project") return projects.find(x => x.id === selId) || null;
    if (selType === "routine") return routines.find(x => x.id === selId) || null;
    if (selType === "task") return tasks.find(x => x.id === selId) || null;
    if (selType === "objective") return objectives.find(x => x.id === selId) || null;
    return null;
  }, [selId, selType, projects, routines, tasks, objectives]);

  if (!loaded) return (
    <div style={{ background: C.bg, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <style>{`@keyframes dotPulse{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, letterSpacing: 2 }}>ATIVIDADES</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 4, background: C.gold, animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  // Centro dos popups fixos: metade da área de conteúdo (direita da sidebar em desktop)

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "'Segoe UI','Helvetica Neue',system-ui,sans-serif", color: C.tx, position: "relative", ...(isDesktop ? {} : { maxWidth: isNarrowMobile ? 430 : "none", margin: "0 auto", paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }) }}>
      <style>{`@keyframes popupSlideIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes bannerSlideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes errFadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}@keyframes tabFadeIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}.rl-item{transition:filter .12s,opacity .12s}.rl-item:hover{filter:brightness(1.1)}.rl-item:active{opacity:.7!important}`}</style>
      {/* Sidebar — desktop */}
      {isDesktop && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: SIDEBAR_W, background: C.bg, borderRight: "0.5px solid " + C.brd, zIndex: 100, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "0.5px solid " + C.brd }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>Coofe</div>
          </div>
          <div style={{ flex: 1, paddingTop: 8 }}>
            {NAV_TABS.map(([k, l, icon]) => (
              <div key={k} onClick={() => { setTab(k); setView("list"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: "pointer", color: tab === k ? C.gold : C.tx3, background: tab === k ? C.gold + "10" : "transparent", borderLeft: "2.5px solid " + (tab === k ? C.gold : "transparent"), fontSize: 13, fontWeight: tab === k ? 600 : 400, transition: "color .12s, background .12s, border-color .12s" }}>
                <span style={{ lineHeight: 1, opacity: tab === k ? 1 : 0.65 }}>{icon}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
          {onSignOut && (
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid " + C.brd }}>
              <div onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: C.tx3, fontSize: 13, padding: "8px 0" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Sair</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div
        onTouchStart={handleTabTouchStart}
        onTouchMove={handleTabTouchMove}
        onTouchEnd={handleTabTouchEnd}
        onTouchCancel={handleTabTouchEnd}
        style={{ minHeight: isDesktop ? "100vh" : "calc(100dvh - 56px)", overflow: "auto", marginLeft: isDesktop ? SIDEBAR_W : 0, background: C.bg, touchAction: isDesktop ? "auto" : "pan-y pinch-zoom", WebkitOverflowScrolling: "touch" }}
      >
        <Suspense fallback={<TabFallback />}>
        <div key={tab} style={isDesktop ? { ...(tab !== "reports" ? { maxWidth: 780, margin: "0 auto" } : {}), animation: "tabFadeIn 0.22s ease" } : { animation: "tabFadeIn 0.22s ease", transform: tabSwipeOffset ? `translateX(${Math.round(tabSwipeOffset * 0.28)}px)` : "none", transition: tabSwipeOffset ? "none" : "transform .14s ease" }}>
        {tab === "dashboard" && <DashboardTab profile={profile} levelInfo={levelInfo} poderInfo={poderInfo} rankInfo={rankInfo} projects={projects} routines={routines} tasks={tasks} objectives={objectives} nav={nav} completeTask={completeTask} completeRoutine={completeRoutine} earn={earn} setDailyMission={setDailyMission} claimMissionRpg={claimMissionRpg} atributos={atributos} setAtributos={setAtributos} groqApiKey={profile.groqApiKey || ""} />}
        {tab === "activities" && view === "list" && <ActivitiesTab subTab={subTab} setSubTab={setSubTab} projects={projects} routines={routines} tasks={tasks} objectives={objectives} nav={nav} completeTask={completeTask} completeRoutine={completeRoutine} updProject={updProject} setProfile={setProfile} setCompletionConfirm={setCompletionConfirm} addTask={addTask} addRoutine={addRoutine} addProject={addProject} setTasks={setTasks} setRoutines={setRoutines} setProjects={setProjects} groqApiKey={profile.groqApiKey || ""} profile={profile} isDesktop={isDesktop} />}
        {tab === "activities" && view === "detail" && sel && selType === "project" && <ProjectDetail item={sel} onUpdate={updProject} onDelete={(i, p) => { deleteItem(i, "project", p); nav("activities", "projects", "list"); }} onComplete={completeTask} nav={nav} navBack={navBack} objectives={objectives} routines={routines} setCompletionConfirm={setCompletionConfirm} onValueUpdate={() => setProfile(p => ({ ...p, goalUpdatedToday: true }))} />}
        {tab === "activities" && view === "detail" && sel && selType === "routine" && <RoutineDetail item={sel} onUpdate={updRoutine} onDelete={(i, p) => { deleteItem(i, "routine", p); nav("activities", "routines", "list"); }} onComplete={completeRoutine} nav={nav} navBack={navBack} objectives={objectives} projects={projects} />}
        {tab === "activities" && view === "detail" && sel && selType === "task" && <TaskDetail item={sel} onUpdate={updTask} onDelete={(i, p) => { deleteItem(i, "task", p); nav("activities", "tasks", "list"); }} onComplete={completeTask} nav={nav} navBack={navBack} objectives={objectives} onPromote={promoteTaskToProject} />}
        {tab === "activities" && view === "detail" && sel && selType === "objective" && <ObjectiveDetail item={sel} onUpdate={updObjective} onDelete={deleteObjective} objectives={objectives} projects={projects} routines={routines} tasks={tasks} nav={nav} navBack={navBack} onLinkActivity={(actId, actType, objId) => {
          const addLink = (prev) => prev.map(x => x.id === actId ? { ...x, linkedObjectives: [...(x.linkedObjectives || []), { id: objId, relation: "menor" }] } : x);
          if (actType === "project") setProjects(addLink);
          if (actType === "routine") setRoutines(addLink);
          if (actType === "task") setTasks(addLink);
        }} onUnlinkActivity={(actId, actType, objId) => {
          const rmLink = (prev) => prev.map(x => x.id === actId ? { ...x, linkedObjectives: (x.linkedObjectives || []).filter(l => l.id !== objId) } : x);
          if (actType === "project") setProjects(rmLink);
          if (actType === "routine") setRoutines(rmLink);
          if (actType === "task") setTasks(rmLink);
        }} />}
        {tab === "activities" && view === "create" && selType === "project" && <ProjectForm onSave={addProject} onCancel={() => nav("activities", "projects", "list")} objectives={objectives} routines={routines} />}
        {tab === "activities" && view === "create" && selType === "routine" && <RoutineForm presets={profile.difficultyPresets} onSave={addRoutine} onCancel={() => nav("activities", "routines", "list")} objectives={objectives} />}
        {tab === "activities" && view === "create" && selType === "task" && <TaskForm presets={profile.difficultyPresets} onSave={addTask} onCancel={() => nav("activities", "tasks", "list")} objectives={objectives} />}
        {tab === "activities" && view === "create" && selType === "objective" && <ObjectiveForm onSave={addObjective} onCancel={() => nav("activities", "objectives", "list")} objectives={objectives} />}
        {tab === "activities" && view === "edit" && sel && selType === "project" && <ProjectForm item={sel} onSave={(p) => { updProject(p); nav("activities", "projects", "detail", p.id, "project"); }} onCancel={() => nav("activities", "projects", "detail", sel.id, "project")} objectives={objectives} routines={routines} />}
        {tab === "activities" && view === "edit" && sel && selType === "routine" && <RoutineForm presets={profile.difficultyPresets} item={sel} onSave={(r) => { updRoutine(r); nav("activities", "routines", "detail", r.id, "routine"); }} onCancel={() => nav("activities", "routines", "detail", sel.id, "routine")} objectives={objectives} />}
        {tab === "activities" && view === "edit" && sel && selType === "task" && <TaskForm presets={profile.difficultyPresets} item={sel} onSave={(t) => { updTask(t); nav("activities", "tasks", "detail", t.id, "task"); }} onCancel={() => nav("activities", "tasks", "detail", sel.id, "task")} objectives={objectives} />}
        {tab === "activities" && view === "edit" && sel && selType === "objective" && <ObjectiveForm item={sel} onSave={(o) => { updObjective(o); nav("activities", "objectives", "detail", o.id, "objective"); }} onCancel={() => nav("activities", "objectives", "detail", sel.id, "objective")} objectives={objectives} />}
        {tab === "reports" && <ReportsTab notes={reportNotes} folders={reportFolders} onUpdateNotes={setReportNotes} onUpdateFolders={setReportFolders} groqApiKey={profile.groqApiKey || ""} projects={projects} routines={routines} tasks={tasks} objectives={objectives} profile={profile} onCreateTask={createPlannedTask} onCreateProjectTask={createPlannedProjectTask} onCreateRoutine={createPlannedRoutine} onCreateProject={createPlannedProject} />}
        {tab === "history" && <HistoryTab profile={profile} projects={projects} routines={routines} tasks={tasks} recoverStreak={recoverStreak} openChestAction={openChestAction} claimAchievement={claimAchievement} />}
        {tab === "shop" && <ShopTab profile={profile} buyItem={buyItem} equipItem={equipItem} buyConsumable={buyConsumable} upgradeItem={upgradeItem} setProfile={setProfile} />}
        {tab === "config" && <ConfigTab profile={profile} setProfile={setProfile} trash={trash} setTrash={setTrash} restoreItem={restoreItem} projects={projects} routines={routines} tasks={tasks} objectives={objectives} reportNotes={reportNotes} reportFolders={reportFolders} atributos={atributos} setProjects={setProjects} setRoutines={setRoutines} setTasks={setTasks} setObjectives={setObjectives} setReportNotes={setReportNotes} setReportFolders={setReportFolders} setAtributos={setAtributos} levelInfo={levelInfo} poderInfo={poderInfo} rankInfo={rankInfo} onSignOut={!isDesktop ? onSignOut : null} user={user} />}
        </div>
        </Suspense>
      </div>
      {/* Bottom tabs — mobile only */}
      {!isDesktop && <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: isNarrowMobile ? 430 : "none", display: "flex", background: C.bg, borderTop: "0.5px solid " + C.brd, zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV_TABS.map(([k, l, icon]) => (
          <div key={k} onClick={() => { setTab(k); setView("list"); }} style={{ flex: 1, minHeight: 56, padding: "8px 2px 6px", textAlign: "center", fontSize: 11, color: tab === k ? C.gold : C.tx3, borderTop: tab === k ? "2px solid " + C.gold : "2px solid transparent", cursor: "pointer", letterSpacing: 0.2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, transition: "color .12s, border-color .12s" }}>
            <span style={{ lineHeight: 1 }}>{icon}</span>
          </div>
        ))}
      </div>}
      {/* Storage error banner */}
      {storageError && <div style={{ position: "fixed", top: 0, left: isDesktop ? SIDEBAR_W : "50%", transform: isDesktop ? "none" : "translateX(-50%)", right: isDesktop ? 0 : "auto", width: isDesktop ? "auto" : "100%", maxWidth: isDesktop || !isNarrowMobile ? "none" : 430, background: C.red + "dd", zIndex: 400, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, backdropFilter: "blur(4px)", animation: "errFadeOut 3s ease forwards" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize: 11, color: "#fff" }}>Erro ao sincronizar com o servidor. Verifique sua conexão com a internet.</span>
        </div>
        <span onClick={() => setStorageError(false)} style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tx} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      </div>}
      {/* Reward popup */}
      {rewardPopup && (() => {
        const totalVal = (rewardPopup.xp || 0) + (rewardPopup.coins || 0);
        const big = totalVal >= 100;
        const huge = totalVal >= 300;
        const numSz = huge ? 20 : big ? 17 : 15;
        const iconSz = huge ? 18 : big ? 16 : 14;
        const glow = huge ? "0 0 28px " + C.gold + "44, 0 4px 24px #0009" : big ? "0 0 14px " + C.gold + "28, 0 4px 24px #0009" : "0 4px 24px #0009";
        const brd = big ? "1.5px solid " + C.gold + "80" : "1px solid " + C.goldBrd;
        return (
          <div style={{ position: "fixed", top: 60, left: popupLeft, transform: "translateX(-50%)", background: "linear-gradient(135deg," + C.card + "f0," + C.bg + "f0)", border: brd, borderRadius: 14, padding: big ? "16px 28px" : "14px 24px", zIndex: 300, textAlign: "center", boxShadow: glow, minWidth: 200, animation: "popupSlideIn 0.28s ease" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: rewardPopup.msg ? 6 : 0 }}>
              {rewardPopup.xp > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span style={{ fontSize: numSz, fontWeight: 700, color: C.gold }}>+{rewardPopup.xp}</span>
              </div>}
              {rewardPopup.coins > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span style={{ fontSize: numSz, fontWeight: 700, color: C.orange }}>+{rewardPopup.coins}</span>
              </div>}
            </div>
            {rewardPopup.msg && <div style={{ fontSize: 11, color: C.tx2, marginTop: 2 }}>{rewardPopup.msg}</div>}
            {lastUndo && <div style={{ marginTop: 8, textAlign: "center" }}>
              <span onClick={undoCompletion} style={{ fontSize: 11, color: C.tx3, cursor: "pointer", borderBottom: "1px dashed " + C.tx3, paddingBottom: 1, letterSpacing: 0.3 }}>Voltar</span>
            </div>}
          </div>
        );
      })()}
      {/* PODER / Rank notification */}
      {levelUpNotif && (() => {
        const isRankUp = levelUpNotif.type === "rank";
        const nc = levelUpNotif.color || C.gold;
        return (
          <div onClick={() => setLevelUpNotif(null)} style={{ position: "fixed", top: "50%", left: popupLeft, transform: "translate(-50%,-50%)", background: "linear-gradient(160deg," + C.bg + "fc," + C.card + "fc)", border: "1.5px solid " + nc + "66", borderRadius: 20, padding: isRankUp ? "32px 48px" : "24px 40px", zIndex: 350, textAlign: "center", boxShadow: "0 0 64px " + nc + "22, 0 8px 32px #000a", minWidth: 230, animation: "popupSlideIn 0.34s cubic-bezier(0.175,0.885,0.32,1.275)", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: nc + "18", border: "1.5px solid " + nc + "55", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isRankUp
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={nc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={nc} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                }
              </div>
            </div>
            {isRankUp ? (
              <>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: nc, fontWeight: 700, marginBottom: 6 }}>Novo Rank!</div>
                <div style={{ fontSize: 44, fontWeight: 900, color: nc, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>{levelUpNotif.rankMain}</div>
                <div style={{ fontSize: 14, color: C.tx, fontWeight: 600, marginBottom: levelUpNotif.welcomeMsg ? 10 : 0 }}>{levelUpNotif.label}</div>
                {levelUpNotif.welcomeMsg && <div style={{ fontSize: 11, color: C.tx2, maxWidth: 260, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>{levelUpNotif.welcomeMsg}</div>}
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: nc, fontWeight: 700, marginBottom: 6 }}>PODER aumentou</div>
                <div style={{ fontSize: 42, fontWeight: 800, color: C.tx, letterSpacing: -2, lineHeight: 1, marginBottom: 5 }}>{levelUpNotif.poder}</div>
                <div style={{ fontSize: 13, color: nc, fontWeight: 600, letterSpacing: 0.2 }}>{levelUpNotif.label}</div>
              </>
            )}
          </div>
        );
      })()}
      {/* V2: Completion confirmation — sem recompensa */}
      {completionConfirm && <Modal>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>Projeto concluído!</div>
          <div style={{ fontSize: 12, color: C.tx, margin: "6px 0" }}>{completionConfirm.name}</div>
          <div style={{ fontSize: 11, color: C.tx2 }}>Confirmar que este projeto foi realmente concluído?</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setCompletionConfirm(null)} style={{ flex: 1 }}>Não, manter aberto</Btn>
          <Btn primary onClick={acceptCompletion} style={{ flex: 1 }}>Sim, concluir!</Btn>
        </div>
      </Modal>}
      {/* V2: Routine suggestion banner */}
      {routineSuggestion && <div style={{ position: "fixed", top: 60, left: popupLeft, transform: "translateX(-50%)", background: C.card + "ee", border: "1px solid " + C.purple + "60", borderRadius: 10, padding: "10px 16px", zIndex: 300, textAlign: "center", maxWidth: 340, animation: "popupSlideIn 0.28s ease" }}>
        <div style={{ fontSize: 11, color: C.purple, fontWeight: 500, marginBottom: 4 }}>Transformar <span style={{ color: C.tx, fontStyle: "italic" }}>"{routineSuggestion}"</span> em rotina?</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <Btn small primary onClick={() => { nav("activities", "routines", "create", null, "routine"); setRoutineSuggestion(null); }}>Criar rotina</Btn>
          <Btn small onClick={() => setRoutineSuggestion(null)}>Ignorar</Btn>
        </div>
      </div>}
      {/* Achievement notification banner */}
      {achieveNotif && <div style={{ position: "fixed", bottom: isDesktop ? 16 : 68, left: popupLeft, transform: "translateX(-50%)", width: "92%", maxWidth: 400, background: "linear-gradient(135deg," + C.card + "," + C.bg + ")", border: "1px solid " + C.goldBrd, borderRadius: 12, padding: "12px 16px", zIndex: 310, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 20px #0008", animation: "bannerSlideUp 0.3s ease" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4"/></svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>Conquista desbloqueada!</div>
          <div style={{ fontSize: 11, color: C.tx2, marginTop: 2 }}>{achieveNotif.text} - <span style={{ color: C.gold }}>+{achieveNotif.coins} moedas</span></div>
        </div>
        <span onClick={() => setAchieveNotif(null)} style={{ cursor: "pointer", color: C.tx3, display: "flex", alignItems: "center", padding: "0 4px" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
      </div>}
      {/* Onboarding overlay — primeira abertura */}
      {loaded && !profile.onboardingDone && projects.length === 0 && routines.length === 0 && tasks.length === 0 && objectives.length === 0 && (
        <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", ...(isDesktop ? {} : { maxWidth: 430, width: "100%", left: "50%", transform: "translateX(-50%)" }) }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4"/></svg>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.tx, marginBottom: 10, textAlign: "center", letterSpacing: -0.3 }}>Bem-vindo ao Coofe</div>
          <div style={{ fontSize: 13, color: C.tx3, textAlign: "center", lineHeight: 1.7, marginBottom: 28, maxWidth: 300 }}>Transforme seus objetivos em ENERGIA. Cada conclusão aumenta seu PODER.</div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {[
              ["1", C.purple, "Crie um Objetivo", "Sua meta de longo prazo"],
              ["2", C.gold, "Adicione Projetos e Rotinas", "Atividades que te levam lá"],
              ["3", C.green, "Complete e aumente seu PODER", "ENERGIA, moedas e conquistas"],
            ].map(([n, col, title, sub]) => (
              <div key={n} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: C.card, borderRadius: 10, border: "1px solid " + C.brd }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: col + "22", border: "1.5px solid " + col + "66", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: col, flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, marginBottom: 1 }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.tx4 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <Btn primary onClick={() => { setProfile(p => ({ ...p, onboardingDone: true })); nav("activities", "objectives", "create", null, "objective"); }} style={{ width: "100%", padding: "13px 0", fontSize: 13 }}>Criar meu primeiro objetivo</Btn>
          <div onClick={() => setProfile(p => ({ ...p, onboardingDone: true }))} style={{ marginTop: 14, fontSize: 11, color: C.tx4, cursor: "pointer", textAlign: "center" }}>Pular por agora</div>
        </div>
      )}
    </div>
  );
}

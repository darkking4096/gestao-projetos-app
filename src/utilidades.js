import { ENERGIA_TABLE, COINS_TABLE, RANKS, MASTERY_LEVELS, STREAK_MULT, CHEST_TYPES, DIFF_MIGRATION_MAP, WEEK_DAYS, PRI_ORDER } from './constantes.js';

/* ── Recompensas de missão por rank principal ── */
export const MISSION_REWARDS = {
  F:   { energia: 8,    coins: 5    },
  E:   { energia: 20,   coins: 12   },
  D:   { energia: 45,   coins: 22   },
  C:   { energia: 90,   coins: 45   },
  B:   { energia: 180,  coins: 90   },
  A:   { energia: 400,  coins: 200  },
  S:   { energia: 1000, coins: 500  },
  MAX: { energia: 2500, coins: 1200 },
};

/* ── Tabela de pesos de raridade por rank do jogador (índices: F=0,E=1,D=2,C=3,B=4,A=5,S=6,MAX=7) ── */
const RARITY_TABLE = [
  //                F    E   D   C   B   A   S  MAX
  /* Humano/F- */ [55,  35,  8,  2,  0,  0,  0,  0],
  /* E        */ [15,  50, 25,  8,  2,  0,  0,  0],
  /* D        */ [ 5,  20, 45, 22,  7,  1,  0,  0],
  /* C        */ [ 2,   8, 20, 42, 22,  5,  1,  0],
  /* B        */ [ 1,   3, 10, 20, 42, 20,  4,  0],
  /* A        */ [ 0,   1,  3, 10, 22, 42, 20,  2],
  /* S        */ [ 0,   0,  1,  3, 10, 22, 55,  9],
  /* MAX      */ [ 0,   0,  0,  1,  5, 12, 30, 52],
];
const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S", "MAX"];

/* Sorteia o rank+sub-rank de uma missão baseado no rank atual do jogador */
export function rollMissionRank(rankInfo) {
  const playerRankMain = rankInfo?.rankMain || null;
  let playerIdx = playerRankMain ? RANK_ORDER.indexOf(playerRankMain) : 0;
  if (playerIdx < 0) playerIdx = 0;

  const weights = RARITY_TABLE[Math.min(playerIdx, RARITY_TABLE.length - 1)];
  const total = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  let missionRankIdx = 0;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { missionRankIdx = i; break; }
  }

  const rankDef = RANKS.find(r => r.id === RANK_ORDER[missionRankIdx]);
  if (!rankDef) return { rankMain: "F", rankId: "F", modifier: "", color: "#a0a0a0", colorSecondary: "#6a6a6a", ...MISSION_REWARDS.F };

  const subs = rankDef.subs || [{ id: rankDef.id, modifier: "" }];
  const sub = subs[Math.floor(Math.random() * subs.length)];
  const rewards = MISSION_REWARDS[rankDef.id] || MISSION_REWARDS.F;

  return {
    rankMain: rankDef.id,
    rankId: sub.id,
    modifier: sub.modifier || "",
    color: rankDef.color,
    colorSecondary: rankDef.colorSecondary,
    energia: rewards.energia,
    coins: rewards.coins,
  };
}

function getMultiplier(streak) {
  for (const s of STREAK_MULT) { if (streak >= s.days) return s.bonus; }
  return 0;
}

function openChest(type) {
  const ct = CHEST_TYPES.find(c => c.id === type);
  if (!ct) return { coins: 0, shield: false, boost: false };
  const coins = ct.min + Math.floor(Math.random() * (ct.max - ct.min + 1));
  const shield = Math.random() < (ct.shieldChance || 0);
  const boost = !shield && Math.random() < (ct.boostChance || 0);
  return { coins, shield, boost };
}

let _uidSeq = 0;
export const uid = () => Date.now().toString(36) + (++_uidSeq).toString(36).padStart(3, "0") + Math.random().toString(36).slice(2, 5);
export const td = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; };
export const fmtD = (d) => {
  if (!d) return "";
  const p = d.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function fmtFreq(r) {
  const m = migrateFreq(r);
  if (m.freq === "Semanal" && m.days.length > 0) return "Semanal (" + m.days[0] + ")";
  if (m.freq === "Personalizado" && m.days.length > 0) return m.days.join(", ");
  return m.freq;
}

export function migrateFreq(item) {
  if (!item) return { freq: "Diário", days: [] };
  const f = item.frequency || "Diário";
  const d = item.frequencyDays || [];
  const FREQUENCIES = ["Diário", "Semanal", "Mensal", "Livre", "Personalizado"];
  if (FREQUENCIES.includes(f)) return { freq: f, days: d };
  if (f === "Seg/Qua/Sex") return { freq: "Personalizado", days: ["Seg", "Qua", "Sex"] };
  if (f === "Ter/Qui/Sáb") return { freq: "Personalizado", days: ["Ter", "Qui", "Sáb"] };
  if (f === "Sábado") return { freq: "Semanal", days: ["Sáb"] };
  if (f === "Domingo") return { freq: "Semanal", days: ["Dom"] };
  return { freq: f, days: d };
}

export function isRoutineDueOn(routine, dateStr) {
  const m = migrateFreq(routine);
  if (m.freq === "Diário") return true;
  if (m.freq === "Livre") return true;
  if (m.freq === "Mensal") return true;
  if (m.freq === "Semanal" || m.freq === "Personalizado") {
    if (m.days.length === 0) return true;
    const dayIdx = new Date(dateStr + "T12:00:00").getDay();
    const dayMap = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };
    return m.days.includes(dayMap[dayIdx]);
  }
  return true;
}

export function isRoutineDueToday(routine) {
  return isRoutineDueOn(routine, td());
}

function agendaStatus(status) {
  return (status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isDoneStatus(status) {
  return agendaStatus(status) === "concluida";
}

function agendaDateValue(date) {
  return date || "9999-12-31";
}

function agendaTimeValue(time) {
  return time || "99:99";
}

function agendaTypeOrder(type) {
  return { task: 0, projectTask: 1, routine: 2 }[type] ?? 9;
}

function sortAgendaItems(a, b) {
  return agendaTimeValue(a.time).localeCompare(agendaTimeValue(b.time))
    || agendaDateValue(a.deadline).localeCompare(agendaDateValue(b.deadline))
    || ((PRI_ORDER[a.priority] ?? 4) - (PRI_ORDER[b.priority] ?? 4))
    || ((b.difficulty || 0) - (a.difficulty || 0))
    || (agendaTypeOrder(a.type) - agendaTypeOrder(b.type))
    || (a.name || "").localeCompare(b.name || "");
}

export function getTodayAgendaItems({ tasks = [], projects = [], routines = [], date = td() } = {}) {
  const pending = [];
  const completedToday = [];

  (tasks || []).forEach(task => {
    const isDone = isDoneStatus(task.status);
    if (isDone && task.completedAt === date) {
      completedToday.push({
        id: task.id,
        type: "task",
        name: task.name || "",
        deadline: task.deadline || "",
        time: task.deadlineTime || "",
        priority: task.priority || "",
        difficulty: task.difficulty || 1,
        category: task.category || "",
        completedAt: task.completedAt,
        source: task,
      });
      return;
    }
    if (isDone || !task.deadline || task.deadline > date) return;
    pending.push({
      id: task.id,
      type: "task",
      name: task.name || "",
      deadline: task.deadline,
      time: task.deadlineTime || "",
      priority: task.priority || "",
      difficulty: task.difficulty || 1,
      category: task.category || "",
      overdue: task.deadline < date,
      source: task,
    });
  });

  (projects || []).forEach(project => {
    if (project.status && project.status !== "Ativo") return;
    (project.phases || []).forEach(phase => {
      (phase.tasks || []).forEach(task => {
        const isDone = isDoneStatus(task.status);
        if (isDone && task.completedAt === date) {
          completedToday.push({
            id: task.id,
            type: "projectTask",
            name: task.name || "",
            deadline: task.deadline || "",
            time: task.deadlineTime || "",
            priority: task.priority || "",
            difficulty: task.difficulty || 1,
            category: task.category || project.category || "",
            projectId: project.id,
            projectName: project.name || "",
            phaseId: phase.id,
            phaseName: phase.name || "",
            completedAt: task.completedAt,
            source: task,
          });
          return;
        }
        if (isDone || !task.deadline || task.deadline > date) return;
        pending.push({
          id: task.id,
          type: "projectTask",
          name: task.name || "",
          deadline: task.deadline,
          time: task.deadlineTime || "",
          priority: task.priority || "",
          difficulty: task.difficulty || 1,
          category: task.category || project.category || "",
          projectId: project.id,
          projectName: project.name || "",
          phaseId: phase.id,
          phaseName: phase.name || "",
          overdue: task.deadline < date,
          source: task,
        });
      });
    });
  });

  (routines || []).forEach(routine => {
    if (routine.status !== "Ativa") return;
    const doneToday = (routine.completionLog || []).some(log => log.date === date);
    if (doneToday) {
      completedToday.push({
        id: routine.id,
        type: "routine",
        name: routine.name || "",
        time: routine.notificationTime || "",
        priority: routine.priority || "",
        difficulty: routine.difficulty || 1,
        category: routine.category || "",
        completedAt: date,
        source: routine,
      });
      return;
    }
    if (!isRoutineDueOn(routine, date)) return;
    pending.push({
      id: routine.id,
      type: "routine",
      name: routine.name || "",
      time: routine.notificationTime || "",
      priority: routine.priority || "",
      difficulty: routine.difficulty || 1,
      category: routine.category || "",
      source: routine,
    });
  });

  return {
    date,
    pending: pending.sort(sortAgendaItems),
    completedToday: completedToday.sort(sortAgendaItems),
  };
}

export function getRoutineNotificationDays(routine) {
  if (!routine?.notificationEnabled || !routine.notificationTime) return [];
  const m = migrateFreq(routine);
  if (m.freq === "Diário") return WEEK_DAYS;
  if (m.freq === "Semanal" || m.freq === "Personalizado") return m.days;
  if (m.freq === "Mensal") return ["Mensal"];
  return [];
}

export function fmtRoutineNotification(routine) {
  if (!routine?.notificationEnabled || !routine.notificationTime) return "";
  const m = migrateFreq(routine);
  const time = routine.notificationTime;
  if (m.freq === "Livre") return "Lembrete manual: " + time;
  const days = getRoutineNotificationDays(routine);
  if (m.freq === "Diário") return "Lembrete diário: " + time;
  if (m.freq === "Semanal" && days.length > 0) return "Lembrete " + days[0] + ": " + time;
  if (m.freq === "Personalizado" && days.length > 0) return "Lembrete " + days.join(", ") + ": " + time;
  if (m.freq === "Mensal") return "Lembrete mensal: " + time;
  return "Lembrete: " + time;
}

/* ═══ SISTEMA DE PODER / RANKS ═══ */

/**
 * Calcula o nível de PODER a partir da ENERGIA total acumulada.
 * 1 PODER = 100 ENERGIA. Retorna dados para as barras de progresso.
 */
export function getPoderInfo(totalEnergia) {
  const e = Math.max(0, totalEnergia || 0);
  const poder = Math.floor(e / 100);
  const energiaInPoder = e % 100;
  return { poder, totalEnergia: e, energiaInPoder, energiaForPoder: 100 };
}

/**
 * Retorna as informações completas do rank para um dado nível de PODER.
 * Inclui dados para as barras primária (sub-rank) e secundária (notificação).
 */
export function getRankInfo(poder) {
  const p = Math.max(0, poder || 0);

  // Estado Humano (antes do primeiro rank)
  if (p < 5) {
    return {
      rankMain: null, subRank: null, modifier: null,
      label: "Humano", cultivo: 0, notifInterval: 1,
      color: "#888888", colorSecondary: "#555555",
      // Barra primária: progresso até rank F- (PODER 5)
      subRankMinPoder: 0, subRankMaxPoder: 4,
      rankMinPoder: 0, rankMaxPoder: 4,
      nextSubRankId: "F-", nextSubRankMinPoder: 5,
      // Barra secundária: a cada 1 nível de poder
      lastNotifPoder: p, nextNotifPoder: p + 1,
    };
  }

  // Percorre os ranks para encontrar o atual
  for (let ri = 0; ri < RANKS.length; ri++) {
    const rank = RANKS[ri];
    if (p < rank.minPoder || p > rank.maxPoder) continue;

    for (let si = 0; si < rank.subs.length; si++) {
      const sub = rank.subs[si];
      if (p < sub.minPoder || p > sub.maxPoder) continue;

      // Sub-rank seguinte (pode ser do mesmo rank ou do próximo)
      let nextSub = rank.subs[si + 1] || (RANKS[ri + 1] ? RANKS[ri + 1].subs[0] : null);

      // Cálculo da barra secundária (notificação de PODER)
      const interval = rank.notifInterval;
      const lastNotifPoder = Math.floor(p / interval) * interval;
      const nextNotifPoder = lastNotifPoder + interval;

      return {
        rankMain: rank.id,
        subRank: sub.id,
        modifier: sub.modifier,
        label: sub.id,
        cultivo: rank.cultivo,
        notifInterval: interval,
        color: rank.color,
        colorSecondary: rank.colorSecondary,
        // Barra primária
        subRankMinPoder: sub.minPoder,
        subRankMaxPoder: sub.maxPoder,
        rankMinPoder: rank.minPoder,
        rankMaxPoder: rank.maxPoder,
        nextSubRankId: nextSub ? nextSub.id : null,
        nextSubRankMinPoder: nextSub ? nextSub.minPoder : null,
        // Barra secundária
        lastNotifPoder,
        nextNotifPoder,
      };
    }
  }

  // MAX (PODER >= 1.000.000)
  const interval = 10000;
  const lastNotifPoder = Math.floor(p / interval) * interval;
  return {
    rankMain: "MAX", subRank: "MAX", modifier: "", label: "MAX",
    cultivo: 10000, notifInterval: interval,
    color: "#c0c0c0", colorSecondary: "#888888",
    subRankMinPoder: 1000000, subRankMaxPoder: Infinity,
    rankMinPoder: 1000000, rankMaxPoder: Infinity,
    nextSubRankId: null, nextSubRankMinPoder: null,
    lastNotifPoder, nextNotifPoder: lastNotifPoder + interval,
  };
}

/**
 * Retrocompatibilidade: getLevelInfo retorna objeto no formato antigo + campos novos.
 * Permite que componentes não atualizados ainda funcionem.
 */
export function getLevelInfo(totalXp) {
  const pi = getPoderInfo(totalXp);
  const ri = getRankInfo(pi.poder);
  return {
    level: pi.poder,
    band: ri.label,
    xpInLevel: pi.energiaInPoder,
    xpForLevel: pi.energiaForPoder,
    totalXp,
    // Campos novos
    poder: pi.poder,
    rankInfo: ri,
  };
}

export function getMastery(xp) {
  let cur = null;
  for (const m of MASTERY_LEVELS) { if (xp >= m.xp) cur = m; }
  return cur;
}

export function getMasteryBonus(oldXp, newXp) {
  let bonus = 0;
  for (const m of MASTERY_LEVELS) {
    if (oldXp < m.xp && newXp >= m.xp) bonus += m.coins;
  }
  return bonus;
}

/** Retorna a ENERGIA base de uma dificuldade (1-20). */
export function getEnergia(d) { return ENERGIA_TABLE[clamp(d, 1, 20)] || 0; }

/** Retorna as moedas de uma dificuldade (1-20). */
export function getMoedas(d) { return COINS_TABLE[clamp(d, 1, 20)] || 0; }

/** Migra dificuldade antiga (1-10) para nova (1-20). */
export function migrateDifficulty(d) { return DIFF_MIGRATION_MAP[d] || d; }

/* Retrocompatibilidade */
export function getXp(d) { return getEnergia(d); }
export function getCoins(d) { return getMoedas(d); }

/**
 * Estima o rank de dificuldade com base em um valor total de ⚡ ENERGIA.
 * Usado tanto para projetos quanto para objetivos.
 *
 * Thresholds:
 *  < 10       → null (em desenvolvimento / pré-F)
 *  10–19      → F-
 *  20–29      → F
 *  30–39      → F+
 *  40–59      → E-
 *  60–79      → E
 *  80–99      → E+
 *  100–129    → D-
 *  130–159    → D
 *  160–189    → D+
 *  190–239    → C-
 *  240–279    → C
 *  280–319    → C+
 *  320–379    → B-
 *  380–439    → B
 *  440–499    → B+
 *  500–649    → A-
 *  650–799    → A
 *  800–999    → A+
 *  1000–2999  → S-
 *  3000–4999  → S
 *  5000–9999  → S+
 *  ≥ 10000    → MAX
 */
export function getEnergyRankEstimate(totalEnergia) {
  let rank, modifier;
  if      (totalEnergia < 10)    { rank = null;  modifier = ""; }
  else if (totalEnergia < 20)    { rank = "F";   modifier = "-"; }
  else if (totalEnergia < 30)    { rank = "F";   modifier = ""; }
  else if (totalEnergia < 40)    { rank = "F";   modifier = "+"; }
  else if (totalEnergia < 60)    { rank = "E";   modifier = "-"; }
  else if (totalEnergia < 80)    { rank = "E";   modifier = ""; }
  else if (totalEnergia < 100)   { rank = "E";   modifier = "+"; }
  else if (totalEnergia < 130)   { rank = "D";   modifier = "-"; }
  else if (totalEnergia < 160)   { rank = "D";   modifier = ""; }
  else if (totalEnergia < 190)   { rank = "D";   modifier = "+"; }
  else if (totalEnergia < 240)   { rank = "C";   modifier = "-"; }
  else if (totalEnergia < 280)   { rank = "C";   modifier = ""; }
  else if (totalEnergia < 320)   { rank = "C";   modifier = "+"; }
  else if (totalEnergia < 380)   { rank = "B";   modifier = "-"; }
  else if (totalEnergia < 440)   { rank = "B";   modifier = ""; }
  else if (totalEnergia < 500)   { rank = "B";   modifier = "+"; }
  else if (totalEnergia < 650)   { rank = "A";   modifier = "-"; }
  else if (totalEnergia < 800)   { rank = "A";   modifier = ""; }
  else if (totalEnergia < 1000)  { rank = "A";   modifier = "+"; }
  else if (totalEnergia < 3000)  { rank = "S";   modifier = "-"; }
  else if (totalEnergia < 5000)  { rank = "S";   modifier = ""; }
  else if (totalEnergia < 10000) { rank = "S";   modifier = "+"; }
  else                           { rank = "MAX"; modifier = ""; }

  const found = rank ? (RANKS.find(r => r.id === rank) || RANKS[0]) : null;
  const label = rank ? `${rank}${modifier}` : "—";
  return {
    rank,
    modifier,
    label,
    color: found ? found.color : "#555",
    colorSecondary: found ? found.colorSecondary : "#333",
    totalEnergia,
  };
}

/**
 * Estima o rank de dificuldade de um projeto com base na soma total de ENERGIA
 * de todas as suas tarefas.
 */
export function getProjectRankEstimate(project) {
  const allTasks = (project.phases || []).flatMap(ph => ph.tasks || []);
  const totalEnergia = allTasks.reduce((sum, t) => sum + (getEnergia(t.difficulty || 5)), 0);
  return getEnergyRankEstimate(totalEnergia);
}

/* ═══ V2: Objective utility functions ═══ */
export function calcObjectiveXp(objectiveId, projects, routines, tasks, objectives, _visited = new Set()) {
  // Proteção anti-ciclo: se já visitamos este nó na recursão atual, retorna 0
  if (_visited.has(objectiveId)) return 0;
  _visited.add(objectiveId);

  const obj = objectives.find(o => o.id === objectiveId);
  if (!obj) return 0;
  let total = 0;
  (obj.linkedActivities || []).forEach(link => {
    if (link.type === "project") {
      const p = projects.find(x => x.id === link.id);
      if (p) total += (p.xpAccum || 0);
    }
    if (link.type === "routine") {
      const r = routines.find(x => x.id === link.id);
      if (r) total += (r.xpAccum || 0);
    }
    if (link.type === "task") {
      const t = tasks.find(x => x.id === link.id);
      if (t && t.status === "Concluída") total += getXp(t.difficulty || 1);
    }
  });
  (obj.linkedObjectives || [])
    .filter(l => l.relation === "menor")
    .forEach(l => {
      total += calcObjectiveXp(l.id, projects, routines, tasks, objectives, _visited);
    });
  return total;
}

export function wouldCreateCycle(fromId, toId, objectives) {
  const visited = new Set();
  function dfs(id) {
    if (id === fromId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    const obj = objectives.find(o => o.id === id);
    if (!obj) return false;
    return (obj.linkedObjectives || [])
      .filter(l => l.relation === "menor")
      .some(l => dfs(l.id));
  }
  return dfs(toId);
}

export function checkProjectCompletion(project) {
  const allTasks = (project.phases || []).flatMap(ph => ph.tasks || []);
  const allDone = allTasks.length > 0 && allTasks.every(t => t.status === "Concluída");
  if (!allDone) return false;
  if (project.target !== undefined && project.currentValue !== undefined) {
    return parseFloat(project.currentValue) >= parseFloat(project.target);
  }
  return true;
}

export function removeObjectiveLinksFromActivities(objId, setProjects, setRoutines, setTasks) {
  const remLink = (arr) => arr.map(item => ({
    ...item,
    linkedObjectives: (item.linkedObjectives || []).filter(l => l.id !== objId)
  }));
  if (setProjects) setProjects(prev => remLink(prev));
  if (setRoutines) setRoutines(prev => remLink(prev));
  if (setTasks) setTasks(prev => remLink(prev));
}

export function similarName(a, b) {
  const na = (a || "").toLowerCase().trim();
  const nb = (b || "").toLowerCase().trim();
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

export { getMultiplier, openChest };

/* ═══ ACHIEVEMENTS (depende de getPoderInfo) ═══ */
export const ACHIEVEMENTS = [
  { id:"vol10",      cat:"Volume",       text:"10 tarefas",                   check:(p)=>p.tasksCompleted>=10,                                   coins:10  },
  { id:"vol50",      cat:"Volume",       text:"50 tarefas",                   check:(p)=>p.tasksCompleted>=50,                                   coins:25  },
  { id:"vol100",     cat:"Volume",       text:"100 tarefas",                  check:(p)=>p.tasksCompleted>=100,                                  coins:50  },
  { id:"vol500",     cat:"Volume",       text:"500 tarefas",                  check:(p)=>p.tasksCompleted>=500,                                  coins:100 },
  { id:"vol1000",    cat:"Volume",       text:"1000 tarefas",                 check:(p)=>p.tasksCompleted>=1000,                                 coins:200 },
  { id:"con7",       cat:"Consistência", text:"Streak 7 dias",                check:(p)=>p.bestStreak>=7,                                        coins:15  },
  { id:"con30",      cat:"Consistência", text:"Streak 30 dias",               check:(p)=>p.bestStreak>=30,                                       coins:50  },
  { id:"con90",      cat:"Consistência", text:"Streak 90 dias",               check:(p)=>p.bestStreak>=90,                                       coins:100 },
  { id:"con180",     cat:"Consistência", text:"Streak 180 dias",              check:(p)=>p.bestStreak>=180,                                      coins:200 },
  { id:"con365",     cat:"Consistência", text:"Streak 365 dias",              check:(p)=>p.bestStreak>=365,                                      coins:500 },
  { id:"int_dmax",   cat:"Intensidade",  text:"Tarefa IMPOSSÍVEL (MAX)",      check:(p)=>p.maxTaskEver,                                          coins:20  },
  { id:"int_200e",   cat:"Intensidade",  text:"200 ⚡ ENERGIA em 1 dia",      check:(p)=>(p.bestXpDay||0)>=200,                                  coins:30  },
  { id:"int_1000e",  cat:"Intensidade",  text:"1000 ⚡ ENERGIA na semana",    check:(p)=>(p.bestXpWeek||0)>=1000,                                coins:75  },
  { id:"lv10",       cat:"Marcos",       text:"PODER 10 (Rank F)",            check:(p)=>getPoderInfo(p.totalXp).poder>=10,                      coins:10  },
  { id:"lv25",       cat:"Marcos",       text:"PODER 25 (Rank E)",            check:(p)=>getPoderInfo(p.totalXp).poder>=25,                      coins:25  },
  { id:"lv50",       cat:"Marcos",       text:"PODER 50 (Rank D)",            check:(p)=>getPoderInfo(p.totalXp).poder>=50,                      coins:50  },
  { id:"lv100",      cat:"Marcos",       text:"PODER 100 (Rank C)",           check:(p)=>getPoderInfo(p.totalXp).poder>=100,                     coins:100 },
  { id:"lv300",      cat:"Marcos",       text:"PODER 300 (Rank B)",           check:(p)=>getPoderInfo(p.totalXp).poder>=300,                     coins:200 },
  { id:"lv1500",     cat:"Marcos",       text:"PODER 1.500 (Rank A)",         check:(p)=>getPoderInfo(p.totalXp).poder>=1500,                    coins:300 },
  { id:"lv25000",    cat:"Marcos",       text:"PODER 25.000 (Rank S)",        check:(p)=>getPoderInfo(p.totalXp).poder>=25000,                   coins:500 },
  { id:"coins1k",    cat:"Marcos",       text:"1.000 moedas ganhas",          check:(p)=>(p.totalCoinsEarned||0)>=1000,                          coins:30  },
  { id:"coins10k",   cat:"Marcos",       text:"10.000 moedas ganhas",         check:(p)=>(p.totalCoinsEarned||0)>=10000,                         coins:100 },
  { id:"proj5",      cat:"Volume",       text:"5 projetos concluídos",        check:(p)=>(p.projectsCompleted||0)>=5,                            coins:50  },
  { id:"mast_ouro",  cat:"Maestria",     text:"Maestria Ouro",                check:(p)=>(p.masteryGoldCount||0)>=1,                             coins:40  },
];

import { ENERGIA_TABLE, COINS_TABLE, RANKS, MASTERY_LEVELS, MISSION_POOL, STREAK_MULT, CHEST_TYPES, DIFF_MIGRATION_MAP } from './constantes.js';

function pickDailyMission(date, context) {
  const hash = date.split("-").join("").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  // Filter to missions that are achievable given current data
  let pool = MISSION_POOL;
  if (context) {
    const { hasRoutines, hasProjects, hasNumericProjects, hasTasks } = context;
    pool = MISSION_POOL.filter(m => {
      if ((m.id === "m3" || m.id === "m8") && !hasRoutines) return false;
      if ((m.id === "m6") && !hasNumericProjects) return false;
      if ((m.id === "m7") && !hasProjects) return false;
      if ((m.id === "m2" || m.id === "m9") && !hasTasks && !hasProjects) return false;
      return true;
    });
    if (pool.length === 0) pool = MISSION_POOL;
  }
  return pool[hash % pool.length];
}

function getMissionProgress(mission, profile, projects, routines, tasks) {
  const today = td();
  const tasksToday = (profile.tasksToday || 0);
  const dueRoutines = routines.filter(r => r.status === "Ativa" && isRoutineDueToday(r));
  const routinesToday = dueRoutines.filter(r => (r.completionLog || []).some(l => l.date === today)).length;
  const projTasksToday = (profile.projTasksToday || 0);
  return {
    tasksToday,
    hardTaskToday: !!(profile.hardTaskToday),
    routinesToday,
    xpToday: profile.xpToday || 0,
    coinsToday: profile.coinsToday || 0,
    goalUpdatedToday: !!(profile.goalUpdatedToday),
    projTasksToday,
    allRoutinesDone: dueRoutines.length > 0 && routinesToday >= dueRoutines.length,
    maxTaskToday: !!(profile.maxTaskToday),
  };
}

function scoreNextAction(item, weights) {
  const w = weights || { priority: 3, deadline: 2, difficulty: 1 };
  let score = 0;
  const priScores = { "Crítica": 4, "Alta": 3, "Média": 2, "Baixa": 1 };
  score += (priScores[item._pri] || 0) * w.priority;
  if (item._deadline) {
    const days = Math.max(0, (new Date(item._deadline) - new Date()) / 86400000);
    score += Math.max(0, 10 - days) * w.deadline;
  }
  score += (item._diff || 0) * w.difficulty * 0.3;
  return score;
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
 * Estima o rank de dificuldade de um projeto com base na soma total de ENERGIA
 * de todas as suas tarefas (pendentes ou não).
 * Retorna { rank, label, color, colorSecondary, totalEnergia }
 */
export function getProjectRankEstimate(project) {
  const allTasks = (project.phases || []).flatMap(ph => ph.tasks || []);
  const totalEnergia = allTasks.reduce((sum, t) => sum + (getEnergia(t.difficulty || 5)), 0);
  // Thresholds baseados nos ranges de PODER dos ranks
  let rankId;
  if      (totalEnergia < 30)    rankId = "F";
  else if (totalEnergia < 100)   rankId = "E";
  else if (totalEnergia < 300)   rankId = "D";
  else if (totalEnergia < 800)   rankId = "C";
  else if (totalEnergia < 2000)  rankId = "B";
  else if (totalEnergia < 5000)  rankId = "A";
  else if (totalEnergia < 20000) rankId = "S";
  else                           rankId = "MAX";
  const found = RANKS.find(r => r.id === rankId) || RANKS[0];
  return { rank: rankId, label: rankId, color: found.color, colorSecondary: found.colorSecondary, totalEnergia };
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

export { pickDailyMission, getMissionProgress, scoreNextAction, getMultiplier, openChest };

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

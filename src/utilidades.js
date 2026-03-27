import { XP_TABLE, COIN_TABLE, BANDS, MASTERY_LEVELS, MISSION_POOL, STREAK_MULT, CHEST_TYPES } from './constantes.js';

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

export function getLevelInfo(totalXp) {
  let xp = totalXp;
  let level = 0;
  for (const b of BANDS) {
    const count = b.max - b.min + 1;
    const bandXp = count * b.xpPer;
    if (xp >= bandXp) {
      xp -= bandXp;
      level = b.max;
    } else {
      level = b.min + Math.floor(xp / b.xpPer);
      return { level, band: b.name, xpInLevel: xp % b.xpPer, xpForLevel: b.xpPer, totalXp };
    }
  }
  return { level: 500, band: "Imortal", xpInLevel: 0, xpForLevel: 500, totalXp };
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

export function getXp(d) { return XP_TABLE[clamp(d, 1, 10)] || 0; }
export function getCoins(d) { return COIN_TABLE[clamp(d, 1, 10)] || 0; }

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

/* ═══ ACHIEVEMENTS (aqui pois depende de getLevelInfo) ═══ */
export const ACHIEVEMENTS = [
  { id:"vol10", cat:"Volume", text:"10 tarefas", check:(p)=>p.tasksCompleted>=10, coins:10 },
  { id:"vol50", cat:"Volume", text:"50 tarefas", check:(p)=>p.tasksCompleted>=50, coins:25 },
  { id:"vol100", cat:"Volume", text:"100 tarefas", check:(p)=>p.tasksCompleted>=100, coins:50 },
  { id:"vol500", cat:"Volume", text:"500 tarefas", check:(p)=>p.tasksCompleted>=500, coins:100 },
  { id:"vol1000", cat:"Volume", text:"1000 tarefas", check:(p)=>p.tasksCompleted>=1000, coins:200 },
  { id:"con7", cat:"Consistência", text:"Streak 7 dias", check:(p)=>p.bestStreak>=7, coins:15 },
  { id:"con30", cat:"Consistência", text:"Streak 30 dias", check:(p)=>p.bestStreak>=30, coins:50 },
  { id:"con90", cat:"Consistência", text:"Streak 90 dias", check:(p)=>p.bestStreak>=90, coins:100 },
  { id:"con180", cat:"Consistência", text:"Streak 180 dias", check:(p)=>p.bestStreak>=180, coins:200 },
  { id:"con365", cat:"Consistência", text:"Streak 365 dias", check:(p)=>p.bestStreak>=365, coins:500 },
  { id:"int_d10", cat:"Intensidade", text:"Tarefa dif. 10", check:(p)=>p.maxTaskEver, coins:20 },
  { id:"int_200xp", cat:"Intensidade", text:"200 XP em 1 dia", check:(p)=>p.bestXpDay>=200, coins:30 },
  { id:"int_1000xp", cat:"Intensidade", text:"1000 XP semana", check:(p)=>p.bestXpWeek>=1000, coins:75 },
  { id:"lv10", cat:"Marcos", text:"Nível 10", check:(p)=>getLevelInfo(p.totalXp).level>=10, coins:10 },
  { id:"lv25", cat:"Marcos", text:"Nível 25", check:(p)=>getLevelInfo(p.totalXp).level>=25, coins:25 },
  { id:"lv50", cat:"Marcos", text:"Nível 50", check:(p)=>getLevelInfo(p.totalXp).level>=50, coins:50 },
  { id:"lv100", cat:"Marcos", text:"Nível 100", check:(p)=>getLevelInfo(p.totalXp).level>=100, coins:100 },
  { id:"lv200", cat:"Marcos", text:"Nível 200", check:(p)=>getLevelInfo(p.totalXp).level>=200, coins:200 },
  { id:"lv300", cat:"Marcos", text:"Nível 300", check:(p)=>getLevelInfo(p.totalXp).level>=300, coins:300 },
  { id:"lv500", cat:"Marcos", text:"Nível 500", check:(p)=>getLevelInfo(p.totalXp).level>=500, coins:500 },
  { id:"coins1k", cat:"Marcos", text:"1.000 moedas ganhas", check:(p)=>(p.totalCoinsEarned||0)>=1000, coins:30 },
  { id:"coins10k", cat:"Marcos", text:"10.000 moedas ganhas", check:(p)=>(p.totalCoinsEarned||0)>=10000, coins:100 },
  { id:"proj5", cat:"Volume", text:"5 projetos concluídos", check:(p)=>(p.projectsCompleted||0)>=5, coins:50 },
  { id:"mast_ouro", cat:"Maestria", text:"Maestria Ouro", check:(p)=>(p.masteryGoldCount||0)>=1, coins:40 },
];

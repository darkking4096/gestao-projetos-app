/* ═══ CONSTANTS ═══ */
export const XP_TABLE = [0, 3, 5, 8, 12, 18, 25, 35, 50, 70, 100];
export const COIN_TABLE = [0, 1, 2, 3, 5, 8, 12, 18, 25, 35, 50];
export const BANDS = [
  { name: "Despertar", min: 1, max: 50, xpPer: 100 },
  { name: "Disciplina", min: 51, max: 100, xpPer: 150 },
  { name: "Domínio", min: 101, max: 200, xpPer: 200 },
  { name: "Maestria", min: 201, max: 300, xpPer: 300 },
  { name: "Lenda", min: 301, max: 400, xpPer: 400 },
  { name: "Imortal", min: 401, max: 500, xpPer: 500 },
];
export const MASTERY_LEVELS = [
  { name: "Bronze", xp: 50, coins: 10 },
  { name: "Prata", xp: 200, coins: 25 },
  { name: "Ouro", xp: 500, coins: 50 },
  { name: "Platina", xp: 1200, coins: 100 },
  { name: "Diamante", xp: 2500, coins: 200 },
  { name: "Mestre", xp: 5000, coins: 500 },
];
export const CATEGORIES = ["Trabalho", "Saúde", "Estudo", "Pessoal"];
export const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"];
export const PRI_ORDER = { "Crítica": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
export const COLORS = ["#d4af37", "#7b68ee", "#2ecc71", "#ff6b35", "#e74c3c", "#3498db", "#e91e63", "#9c27b0"];
export const FREQUENCIES = ["Diário", "Semanal", "Mensal", "Livre", "Personalizado"];
export const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const UNITS = ["R$", "kg", "lições", "horas", "unidades", "%", "custom"];

export const DEFAULT_PRESETS = { "Trabalho": 5, "Saúde": 6, "Estudo": 4, "Pessoal": 3 };

export const MISSION_POOL = [
  { id: "m1",  text: "Concluir 5 tarefas",             coins: 20, check: (p) => p.tasksToday >= 5,         pct: (p) => Math.min(100, Math.round(p.tasksToday / 5 * 100)) },
  { id: "m2",  text: "Concluir 1 tarefa dificuldade 7+", coins: 25, check: (p) => p.hardTaskToday,          pct: (p) => p.hardTaskToday ? 100 : 0 },
  { id: "m3",  text: "Concluir 3 rotinas",              coins: 20, check: (p) => p.routinesToday >= 3,      pct: (p) => Math.min(100, Math.round(p.routinesToday / 3 * 100)) },
  { id: "m4",  text: "Ganhar 50+ XP hoje",              coins: 15, check: (p) => p.xpToday >= 50,           pct: (p) => Math.min(100, Math.round(p.xpToday / 50 * 100)) },
  { id: "m5",  text: "Ganhar 100+ XP hoje",             coins: 30, check: (p) => p.xpToday >= 100,          pct: (p) => Math.min(100, Math.round(p.xpToday / 100 * 100)) },
  { id: "m6",  text: "Atualizar valor de um projeto",   coins: 15, check: (p) => p.goalUpdatedToday,        pct: (p) => p.goalUpdatedToday ? 100 : 0 },
  { id: "m7",  text: "Concluir 2 tarefas de projetos",  coins: 20, check: (p) => p.projTasksToday >= 2,     pct: (p) => Math.min(100, Math.round(p.projTasksToday / 2 * 100)) },
  { id: "m8",  text: "Concluir todas as rotinas do dia",coins: 25, check: (p) => p.allRoutinesDone,          pct: (p) => p.allRoutinesDone ? 100 : 0 },
  { id: "m9",  text: "Concluir 1 tarefa dificuldade 10",coins: 30, check: (p) => p.maxTaskToday,             pct: (p) => p.maxTaskToday ? 100 : 0 },
  { id: "m10", text: "Ganhar 20+ moedas hoje",          coins: 20, check: (p) => p.coinsToday >= 20,         pct: (p) => Math.min(100, Math.round(p.coinsToday / 20 * 100)) },
];

/* ═══ FASE 4: STREAKS, CHESTS, ACHIEVEMENTS ═══ */
export const STREAK_MULT = [
  { days: 90, bonus: 1.0 }, { days: 60, bonus: 0.8 }, { days: 30, bonus: 0.6 },
  { days: 14, bonus: 0.4 }, { days: 7, bonus: 0.25 }, { days: 3, bonus: 0.1 },
];
export const STREAK_RECOVER = [ { days: 10, cost: 40 }, { days: 30, cost: 120 }, { days: 60, cost: 250 } ];
export const CHEST_TYPES = [
  { id: "common",    name: "Comum",    min: 60,  max: 120,  unlockLv: 25,  trigger: "tasks3",  shieldChance: 0.04, boostChance: 0.06 },
  { id: "rare",      name: "Raro",     min: 150, max: 300,  unlockLv: 50,  trigger: "day100",  shieldChance: 0.12, boostChance: 0.15 },
  { id: "epic",      name: "Épico",    min: 350, max: 600,  unlockLv: 100, trigger: "streak7", shieldChance: 0.25, boostChance: 0.30 },
  { id: "legendary", name: "Lendário", min: 800, max: 1500, unlockLv: 200, trigger: "streak30",shieldChance: 0.50, boostChance: 0.60 },
];
// ACHIEVEMENTS foi movido para utilidades.js pois depende de getLevelInfo

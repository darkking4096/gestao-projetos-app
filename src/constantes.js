/* ═══ CONSTANTS ═══ */

/* ── Tabela de ENERGIA por dificuldade (índices 1-20) ── */
export const ENERGIA_TABLE = [0, 1, 3, 5, 7, 10, 12, 15, 18, 21, 24, 28, 31, 34, 38, 42, 44, 50, 60, 70, 100];

/* ── Tabela de MOEDAS por dificuldade (índices 1-20) ── */
export const COINS_TABLE = [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 14, 16, 17, 19, 21, 22, 25, 30, 35, 50];

/* ── Mapa de migração de dificuldade antiga (1-10) → nova (1-20) ── */
export const DIFF_MIGRATION_MAP = { 1:2, 2:3, 3:4, 4:6, 5:8, 6:11, 7:13, 8:17, 9:19, 10:20 };

/* ── Categorias de dificuldade para seletor em 2 etapas ── */
export const DIFF_CATEGORIES = [
  { id: "F",   label: "Extremamente Fácil", levels: [1],        subs: null,                    color: "#a0a0a0" },
  { id: "E",   label: "Muito Fácil",        levels: [2, 3, 4],  subs: ["E-", "E", "E+"],       color: "#5b9bd5" },
  { id: "D",   label: "Fácil",              levels: [5, 6, 7],  subs: ["D-", "D", "D+"],       color: "#2ecc71" },
  { id: "C",   label: "Médio",              levels: [8, 9, 10], subs: ["C-", "C", "C+"],       color: "#cd7f32" },
  { id: "B",   label: "Difícil",            levels: [11,12,13], subs: ["B-", "B", "B+"],       color: "#f0a500" },
  { id: "A",   label: "Muito Difícil",      levels: [14,15,16], subs: ["A-", "A", "A+"],       color: "#e74c3c" },
  { id: "S",   label: "Extrem. Difícil",    levels: [17,18,19], subs: ["S-", "S", "S+"],       color: "#ff6b00" },
  { id: "MAX", label: "IMPOSSÍVEL",         levels: [20],       subs: null,                    color: "#c0c0c0" },
];

/* ── Sistema de Ranks ── */
export const RANKS = [
  {
    id: "F", minPoder: 5, maxPoder: 14, cultivo: 0, notifInterval: 1,
    color: "#a0a0a0", colorSecondary: "#6a6a6a",
    subs: [
      { id: "F-", modifier: "-",  minPoder: 5,  maxPoder: 7  },
      { id: "F",  modifier: "",   minPoder: 8,  maxPoder: 10 },
      { id: "F+", modifier: "+",  minPoder: 11, maxPoder: 14 },
    ],
  },
  {
    id: "E", minPoder: 15, maxPoder: 49, cultivo: 70, notifInterval: 2,
    color: "#5b9bd5", colorSecondary: "#2e6da4",
    subs: [
      { id: "E-", modifier: "-",  minPoder: 15, maxPoder: 25 },
      { id: "E",  modifier: "",   minPoder: 26, maxPoder: 37 },
      { id: "E+", modifier: "+",  minPoder: 38, maxPoder: 49 },
    ],
  },
  {
    id: "D", minPoder: 50, maxPoder: 99, cultivo: 150, notifInterval: 3,
    color: "#2ecc71", colorSecondary: "#1a7a44",
    subs: [
      { id: "D--", modifier: "--", minPoder: 50, maxPoder: 59 },
      { id: "D-",  modifier: "-",  minPoder: 60, maxPoder: 69 },
      { id: "D",   modifier: "",   minPoder: 70, maxPoder: 79 },
      { id: "D+",  modifier: "+",  minPoder: 80, maxPoder: 89 },
      { id: "D++", modifier: "++", minPoder: 90, maxPoder: 99 },
    ],
  },
  {
    id: "C", minPoder: 100, maxPoder: 299, cultivo: 500, notifInterval: 5,
    color: "#cd7f32", colorSecondary: "#8b5e1e",
    subs: [
      { id: "C--", modifier: "--", minPoder: 100, maxPoder: 139 },
      { id: "C-",  modifier: "-",  minPoder: 140, maxPoder: 179 },
      { id: "C",   modifier: "",   minPoder: 180, maxPoder: 219 },
      { id: "C+",  modifier: "+",  minPoder: 220, maxPoder: 259 },
      { id: "C++", modifier: "++", minPoder: 260, maxPoder: 299 },
    ],
  },
  {
    id: "B", minPoder: 300, maxPoder: 1499, cultivo: 1200, notifInterval: 12,
    color: "#f0a500", colorSecondary: "#b07800",
    subs: [
      { id: "B---", modifier: "---", minPoder: 300,  maxPoder: 470  },
      { id: "B--",  modifier: "--",  minPoder: 471,  maxPoder: 641  },
      { id: "B-",   modifier: "-",   minPoder: 642,  maxPoder: 812  },
      { id: "B",    modifier: "",    minPoder: 813,  maxPoder: 983  },
      { id: "B+",   modifier: "+",   minPoder: 984,  maxPoder: 1155 },
      { id: "B++",  modifier: "++",  minPoder: 1156, maxPoder: 1327 },
      { id: "B+++", modifier: "+++", minPoder: 1328, maxPoder: 1499 },
    ],
  },
  {
    id: "A", minPoder: 1500, maxPoder: 24999, cultivo: 5000, notifInterval: 50,
    color: "#e74c3c", colorSecondary: "#9b2335",
    subs: [
      { id: "A---", modifier: "---", minPoder: 1500,  maxPoder: 4856  },
      { id: "A--",  modifier: "--",  minPoder: 4857,  maxPoder: 8213  },
      { id: "A-",   modifier: "-",   minPoder: 8214,  maxPoder: 11570 },
      { id: "A",    modifier: "",    minPoder: 11571, maxPoder: 14927 },
      { id: "A+",   modifier: "+",   minPoder: 14928, maxPoder: 18284 },
      { id: "A++",  modifier: "++",  minPoder: 18285, maxPoder: 21641 },
      { id: "A+++", modifier: "+++", minPoder: 21642, maxPoder: 24999 },
    ],
  },
  {
    id: "S", minPoder: 25000, maxPoder: 999999, cultivo: 100000, notifInterval: 1000,
    color: "#ff6b00", colorSecondary: "#cc4400",
    subs: [
      { id: "S---", modifier: "---", minPoder: 25000,  maxPoder: 164284  },
      { id: "S--",  modifier: "--",  minPoder: 164285, maxPoder: 303569  },
      { id: "S-",   modifier: "-",   minPoder: 303570, maxPoder: 442855  },
      { id: "S",    modifier: "",    minPoder: 442856, maxPoder: 582141  },
      { id: "S+",   modifier: "+",   minPoder: 582142, maxPoder: 721427  },
      { id: "S++",  modifier: "++",  minPoder: 721428, maxPoder: 860713  },
      { id: "S+++", modifier: "+++", minPoder: 860714, maxPoder: 999999  },
    ],
  },
  {
    id: "MAX", minPoder: 1000000, maxPoder: Infinity, cultivo: 10000, notifInterval: 10000,
    color: "#c0c0c0", colorSecondary: "#888888",
    subs: [
      { id: "MAX", modifier: "", minPoder: 1000000, maxPoder: Infinity },
    ],
  },
];

/* ── Maestria por atividade (mantida sem alterações) ── */
export const MASTERY_LEVELS = [
  { name: "Bronze",   xp: 50,   coins: 10  },
  { name: "Prata",    xp: 200,  coins: 25  },
  { name: "Ouro",     xp: 500,  coins: 50  },
  { name: "Platina",  xp: 1200, coins: 100 },
  { name: "Diamante", xp: 2500, coins: 200 },
  { name: "Mestre",   xp: 5000, coins: 500 },
];

export const CATEGORIES  = ["Trabalho", "Saúde", "Estudo", "Pessoal"];
export const PRIORITIES  = ["Crítica", "Alta", "Média", "Baixa"];
export const PRI_ORDER   = { "Crítica": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
export const COLORS      = ["#d4af37", "#7b68ee", "#2ecc71", "#ff6b35", "#e74c3c", "#3498db", "#e91e63", "#9c27b0"];
export const FREQUENCIES = ["Diário", "Semanal", "Mensal", "Livre", "Personalizado"];
export const WEEK_DAYS   = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const UNITS       = ["R$", "kg", "lições", "horas", "unidades", "%", "custom"];

// Valores padrão na escala 1-20: D-=5(Fácil), D=6, C-=8(Médio), E+=4(Muito Fácil)
export const DEFAULT_PRESETS = { "Trabalho": 8, "Saúde": 6, "Estudo": 8, "Pessoal": 5 };


/* ── Streaks ── */
export const STREAK_MULT = [
  { days: 90, bonus: 1.0 }, { days: 60, bonus: 0.8 }, { days: 30, bonus: 0.6 },
  { days: 14, bonus: 0.4 }, { days: 7, bonus: 0.25 }, { days: 3, bonus: 0.1 },
];
export const STREAK_RECOVER = [{ days: 10, cost: 40 }, { days: 30, cost: 120 }, { days: 60, cost: 250 }];

/* ── Baús (unlockLv agora em PODER) ── */
export const CHEST_TYPES = [
  { id: "common",    name: "Comum",    min: 60,  max: 120,  unlockLv: 25,  trigger: "tasks3",   shieldChance: 0.04, boostChance: 0.06 },
  { id: "rare",      name: "Raro",     min: 150, max: 300,  unlockLv: 50,  trigger: "day100",   shieldChance: 0.12, boostChance: 0.15 },
  { id: "epic",      name: "Épico",    min: 350, max: 600,  unlockLv: 100, trigger: "streak7",  shieldChance: 0.25, boostChance: 0.30 },
  { id: "legendary", name: "Lendário", min: 800, max: 1500, unlockLv: 200, trigger: "streak30", shieldChance: 0.50, boostChance: 0.60 },
];

/* ── Retrocompatibilidade: aliases dos nomes antigos ── */
export const XP_TABLE   = ENERGIA_TABLE;
export const COIN_TABLE = COINS_TABLE;
export const BANDS      = [];   // substituído por RANKS — mantido para não quebrar imports

import { clamp } from './utilidades.js';

/* ═══ THEME WITH RARITY TONES ═══ */
const _BASE = {
  bg: "#0e0e12", card: "#1a1a1f", card2: "#131316",
  tx: "#eee", tx2: "#b0b0b8", tx3: "#909098", tx4: "#7a7a84",
  brd: "#222", brd2: "#2a2a2e",
  green: "#2ecc71", orange: "#ff6b35", purple: "#7b68ee", red: "#e74c3c", blue: "#3498db",
};

export function hexToHSL(hex) {
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0, s = 0, l = (max+min)/2;
  if (d > 0) { s = l > 0.5 ? d/(2-max-min) : d/(max+min); h = max===r ? ((g-b)/d+(g<b?6:0))*60 : max===g ? ((b-r)/d+2)*60 : ((r-g)/d+4)*60; }
  return [Math.round(h), Math.round(s*100), Math.round(l*100)];
}

export function hslToHex(h,s,l) {
  s/=100; l/=100;
  const a=s*Math.min(l,1-l), f=n=>{const k=(n+h/30)%12; return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1)));};
  return "#"+[f(0),f(8),f(4)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export function generateThemeTones(accent, rarity, upgradeLevel) {
  const [h,s,l] = hexToHSL(accent);
  const intensity = Math.max(0.15, (upgradeLevel || 0) / 10);
  const gold = accent;
  const goldDim = accent + Math.round(24 * intensity).toString(16).padStart(2,"0");
  const goldBrd = accent + Math.round(64 * intensity).toString(16).padStart(2,"0");
  let gold2, gold3, gold4, goldShadow;
  if (rarity >= 2) gold2 = hslToHex(h, Math.min(100, s+5), clamp(l + Math.round(12*intensity), 0, 95));
  if (rarity >= 3) gold3 = hslToHex(h, Math.max(0, s-5), clamp(l - Math.round(14*intensity), 5, 90));
  if (rarity >= 4) {
    gold4 = hslToHex(h, Math.min(100, s+10), clamp(l + Math.round(20*intensity), 0, 95));
    goldShadow = accent + Math.round(40 * intensity).toString(16).padStart(2,"0");
  }
  return { gold, goldDim, goldBrd, gold2, gold3, gold4, goldShadow, rarity, intensity };
}

function _theme(id, accent, rarity) {
  const tones = generateThemeTones(accent, rarity, 0);
  return { ..._BASE, id, ...tones };
}

export const THEMES = {
  obsidiana:  _theme("obsidiana",  "#d4af37", 1),
  esmeralda:  _theme("esmeralda",  "#50c878", 1),
  safira:     _theme("safira",     "#5b9bd5", 1),
  prata:      _theme("prata",      "#a8b2c1", 1),
  rubi:       _theme("rubi",       "#e05565", 2),
  ametista:   _theme("ametista",   "#9b7ed8", 2),
  jade:       _theme("jade",       "#00bfa5", 2),
  cobre:      _theme("cobre",      "#cd8d5b", 3),
  sangue:     _theme("sangue",     "#b71c1c", 3),
  aurora:     _theme("aurora",     "#e040fb", 3),
  titânio:    _theme("titânio",    "#78909c", 4),
  sol:        _theme("sol",        "#fbc02d", 4),
};

/* ═══ LIVE BINDING FOR THEME ═══ */
export let C = THEMES.obsidiana;

export function setCurrentTheme(tema) {
  C = tema;
}

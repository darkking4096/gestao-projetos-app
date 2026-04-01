import { useState, useMemo } from "react";
import { C } from './temas.js';
import { clamp, fmtD } from './utilidades.js';
import { COLORS, DIFF_CATEGORIES, ENERGIA_TABLE } from './constantes.js';

function Btn({ children, primary, danger, small, onClick, style: s }) {
  const hasTones = primary && C.gold2;
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        minHeight: small ? 34 : 42,
        padding: small ? "7px 12px" : "11px 16px", borderRadius: 7,
        fontSize: small ? 11 : 12, fontWeight: 500, cursor: "pointer",
        border: "none",
        background: danger ? C.red + "15" : primary ? (hasTones ? "linear-gradient(135deg, " + C.goldDim + ", " + (C.gold2 || C.gold) + "18)" : C.goldDim) : C.card,
        color: danger ? C.red : primary ? C.gold : C.tx2,
        borderWidth: 1, borderStyle: "solid",
        borderColor: danger ? (hovered ? C.red : C.red + "30") : primary ? C.goldBrd : (hovered ? C.brd2 : C.brd),
        boxShadow: primary && C.goldShadow ? "0 2px 8px " + C.goldShadow : "none",
        transition: "opacity .12s, transform .1s, border-color .12s, filter .12s",
        opacity: pressed ? 0.7 : 1,
        transform: pressed ? "scale(0.97)" : "scale(1)",
        filter: hovered && !pressed ? "brightness(1.15)" : "none",
        ...s
      }}>{children}</button>
  );
}

function Card({ children, style: s, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={onClick ? () => setHovered(true) : undefined}
      onMouseLeave={onClick ? () => { setHovered(false); setPressed(false); } : undefined}
      onMouseDown={onClick ? () => setPressed(true) : undefined}
      onMouseUp={onClick ? () => setPressed(false) : undefined}
      onTouchStart={onClick ? () => setPressed(true) : undefined}
      onTouchEnd={onClick ? () => setPressed(false) : undefined}
      style={{
        background: C.card, borderRadius: 8, padding: 12, marginBottom: 6,
        ...s,
        cursor: onClick ? "pointer" : undefined,
        transition: onClick ? "opacity .12s, filter .12s" : undefined,
        opacity: pressed ? 0.75 : 1,
        filter: onClick && hovered && !pressed ? "brightness(1.12)" : "none",
      }}>{children}</div>
  );
}

function Badge({ children, color }) {
  return <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, background: color + "20", color }}>{children}</span>;
}

function SLabel({ children }) {
  return <div style={{ fontSize: 11, color: C.tx3, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 500, margin: "12px 0 6px" }}>{children}</div>;
}

function XpBar({ cur, max, color }) {
  const pct = max ? clamp(cur / max * 100, 0, 100) : 0;
  const c = color || C.gold;
  const grad = C.gold3 ? "linear-gradient(90deg," + (C.gold3 || c) + "," + c + "," + (C.gold2 || c) + ")" : "linear-gradient(90deg," + c + "80," + c + ")";
  return (
    <div style={{ height: 5, background: C.card, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 3, background: grad, width: pct + "%", transition: "width .3s" }} />
    </div>
  );
}

function PBar({ pct, color }) {
  return (
    <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 2, background: color || C.gold, width: clamp(pct, 0, 100) + "%", transition: "width .3s" }} />
    </div>
  );
}

function Chk({ done, onClick }) {
  const [hov, setHov] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hov || pressed;
  return (
    <div
      onClick={e => { e.stopPropagation(); if (onClick) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        width: 28, height: 28, borderRadius: 7,
        border: "1px solid transparent",
        background: active ? C.brd + "44" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        transition: "border-color .12s, background .12s",
        transform: pressed ? "scale(0.88)" : "scale(1)",
      }}>
      <div style={{
        width: 20, height: 20, borderRadius: 4,
        border: "1.5px solid " + (done ? C.green : active ? C.tx3 : C.brd2),
        background: done ? C.green : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color .12s, background .12s",
      }}>{done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : null}</div></div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 8px" }}>
      {onBack && <span onClick={onBack} style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", width: 36, height: 36, borderRadius: 18 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </span>}
      <span style={{ fontSize: 15, fontWeight: 500, color: C.tx, flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

function Modal({ children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 12, padding: 20, maxWidth: 380, width: "100%", maxHeight: "calc(100vh - 32px)", overflowY: "auto", border: "1px solid " + C.brd }}>{children}</div>
    </div>
  );
}

function ConfirmModal({ title, subtitle, actions }) {
  return (
    <Modal>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: subtitle ? 4 : 0 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: C.tx3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a, i) => (
          <Btn key={i} danger={a.danger} onClick={a.onClick} style={{ width: "100%", ...(a.mt ? { marginTop: 4 } : {}) }}>{a.label}</Btn>
        ))}
      </div>
    </Modal>
  );
}
function DeleteModal({ onTrash, onPerm, onCancel }) {
  return (
    <ConfirmModal
      title="Deletar atividade"
      subtitle="ENERGIA e moedas ganhos são mantidos."
      actions={[
        { label: "Mover pra lixeira (30 dias)", onClick: onTrash },
        { label: "Deletar definitivamente", danger: true, onClick: onPerm },
        { label: "Cancelar", onClick: onCancel, mt: true },
      ]}
    />
  );
}

/* ═══ FILTER MODAL ═══ */
function FilterModal({ options, active, onApply, onClose }) {
  const [sel, setSel] = useState(active || { key: null, mode: null });
  const pick = (key, mode) => {
    if (sel.key === key && sel.mode === mode) {
      setSel({ key: null, mode: null });
    } else {
      setSel({ key, mode });
    }
  };
  return (
    <Modal>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.tx, marginBottom: 12 }}>Filtrar e ordenar</div>
      {options.map(o => (
        <div key={o.key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.tx2, marginBottom: 4 }}>{o.label}</div>
          {o.modes ? (
            <div style={{ display: "flex", gap: 4 }}>
              {o.modes.map(m => {
                const isActive = sel.key === o.key && sel.mode === m;
                return (
                  <div key={m} onClick={() => pick(o.key, m)} style={{
                    minHeight: 36, padding: "7px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    background: isActive ? C.goldDim : C.bg,
                    color: isActive ? C.gold : C.tx3,
                    border: "0.5px solid " + (isActive ? C.goldBrd : C.brd),
                    transition: "background .12s, color .12s, border-color .12s"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{m === "asc" ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}</svg>
                    {m === "asc" ? "Crescente" : "Decrescente"}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(o.values || []).map(v => {
                const isActive = sel.key === o.key && sel.mode === v;
                return (
                  <div key={v} onClick={() => pick(o.key, v)} style={{
                    minHeight: 36, padding: "7px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                    background: isActive ? C.goldDim : C.bg,
                    color: isActive ? C.gold : C.tx3,
                    border: "0.5px solid " + (isActive ? C.goldBrd : C.brd),
                    transition: "background .12s, color .12s, border-color .12s"
                  }}>{v}</div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={() => { onApply({ key: null, mode: null }); onClose(); }} style={{ flex: 1 }}>Limpar</Btn>
        <Btn primary onClick={() => { onApply(sel); onClose(); }} style={{ flex: 1 }}>Aplicar</Btn>
      </div>
    </Modal>
  );
}

function FilterBtn({ onClick, active }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minHeight: 38, display: "flex", alignItems: "center", gap: 5, padding: "8px 12px",
        borderRadius: 6, cursor: "pointer", fontSize: 11,
        background: active ? C.goldDim : C.card,
        color: active ? C.gold : hov ? C.tx2 : C.tx3,
        border: "0.5px solid " + (active ? C.goldBrd : hov ? C.brd2 : C.brd),
        transition: "color .12s, border-color .12s"
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        Filtrar
      </div>
  );
}

function NotesLog({ notes, onAdd, onEdit, onRemove }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const entries = Array.isArray(notes) ? notes : (notes ? [{ id: "legacy", text: notes, date: "" }] : []);
  const save = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
    setAdding(false);
  };
  const saveEdit = (noteId) => {
    if (!editText.trim()) return;
    if (onEdit) onEdit(noteId, editText.trim());
    setEditingId(null);
    setEditText("");
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SLabel>Notas</SLabel>
        {!adding && <span onClick={() => setAdding(true)} style={{ fontSize: 11, color: C.gold, cursor: "pointer" }}>+ Adicionar nota</span>}
      </div>
      {adding && (
        <div style={{ marginBottom: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} autoFocus placeholder="Escreva uma nota..." rows={3} style={{ width: "100%", padding: "8px 10px", background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 6, color: C.tx, fontSize: 11, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <Btn small primary onClick={save}>Salvar nota</Btn>
            <Btn small onClick={() => { setAdding(false); setText(""); }}>Cancelar</Btn>
          </div>
        </div>
      )}
      {entries.length === 0 && !adding && <div style={{ fontSize: 11, color: C.tx4, padding: "4px 0" }}>Nenhuma nota ainda.</div>}
      {[...entries].reverse().map((n, i) => (
        <div key={n.id || i} style={{ background: C.card, borderRadius: 6, padding: "8px 10px", marginBottom: 4, borderLeft: "2px solid " + C.gold + "40" }}>
          {editingId === n.id ? (
            <div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus rows={2} style={{ width: "100%", padding: "6px 8px", background: C.bg, border: "1px solid " + C.goldBrd, borderRadius: 4, color: C.tx, fontSize: 11, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <Btn small primary onClick={() => saveEdit(n.id)}>Salvar</Btn>
                <Btn small onClick={() => { setEditingId(null); setEditText(""); }}>Cancelar</Btn>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {n.date ? <div style={{ fontSize: 11, color: C.tx4, marginBottom: 2 }}>{fmtD(n.date)}</div> : <div />}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span onClick={() => { setEditingId(n.id); setEditText(n.text); }} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.tx4 }} title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </span>
                  {onRemove && <span onClick={() => onRemove(n.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", color: C.red }} title="Excluir">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.text}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══ FORM PARTS ═══ */
function Field({ label, req, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: C.tx2, marginBottom: 4, display: "flex", gap: 4 }}>
        {label}
        {req && <span style={{ color: C.red, fontSize: 11 }}>obrigatório</span>}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, multiline, type, min, style: s }) {
  const [focused, setFocused] = useState(false);
  const st = {
    width: "100%", padding: "8px 10px", background: C.card,
    border: "1px solid " + (focused ? C.gold + "66" : C.brd2),
    borderRadius: 6, color: C.tx,
    fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical",
    transition: "border-color .15s",
    boxSizing: "border-box", ...s
  };
  const handlers = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
  if (multiline) {
    return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={st} {...handlers} />;
  }
  const ph = placeholder || (type === "date" ? "dd/mm/aaaa" : undefined);
  return <input type={type || "text"} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} min={min} style={st} {...handlers} />;
}

function SelBtns({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(o => {
        const active = value === o;
        return (
          <div key={o} onClick={() => onChange(active ? "" : o)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
            background: active ? C.goldDim : C.card,
            color: active ? C.gold : C.tx3,
            border: "0.5px solid " + (active ? C.goldBrd : C.brd),
            transition: "background .12s, color .12s, border-color .12s"
          }}>{o}</div>
        );
      })}
    </div>
  );
}

function ColorPick({ value, onChange }) {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {COLORS.map(c => (
        <div key={c} onClick={() => onChange(c)}
          onMouseEnter={() => setHov(c)} onMouseLeave={() => setHov(null)}
          style={{
            width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer",
            border: value === c ? "2px solid #eee" : "2px solid transparent",
            transform: hov === c ? "scale(1.18)" : "scale(1)",
            transition: "transform .12s, border-color .12s"
          }} />
      ))}
    </div>
  );
}

function getDiffColor(d) {
  if (d <= 3) return "#22c55e";
  if (d <= 6) return "#f59e0b";
  if (d <= 9) return "#f97316";
  return "#ef4444";
}
/* ═══ RANK EMBLEM SVG ═══ */
/**
 * Emblema do rank atual do jogador.
 * rank: "F","E","D","C","B","A","S","MAX" ou null (Humano)
 * modifier: "","−","−−","−−−","+","++","+++"
 * size: tamanho em px
 *
 * Usa os frames SVG reais (rank_X_frame.svg) tintados com a cor do rank.
 * ViewBox recortado em ~"100 70 312 330" para enquadrar o emblema.
 */
function _rankDeco(rank, c, cs) {
  const S = { stroke: "#15171B", strokeWidth: "4", strokeLinejoin: "round" };
  switch (rank) {
    case "F": return null;
    case "E": return <>
      <polygon points="256,86 269,96 256,106 243,96" fill={c} {...S}/>
      <polygon points="256,330 266,338 256,346 246,338" fill={c} {...S}/>
    </>;
    case "D": return <>
      <path d="M236,104 C240.8,84 263.1,82.4 271.6,81.7 C267.3,89.1 256.1,108.4 236,104 Z" fill={c} {...S}/>
      <path d="M276,104 C255.9,108.4 244.7,89.1 240.4,81.7 C248.9,82.4 271.2,84 276,104 Z" fill={c} {...S}/>
      <polygon points="256,81 269,92 256,103 243,92" fill={c} {...S}/>
      <polygon points="256,332 266,340 256,348 246,340" fill={c} {...S}/>
    </>;
    case "C": return <>
      <path d="M236,104 C240.8,84 263.1,82.4 271.6,81.7 C267.3,89.1 256.1,108.4 236,104 Z" fill={c} {...S}/>
      <path d="M276,104 C255.9,108.4 244.7,89.1 240.4,81.7 C248.9,82.4 271.2,84 276,104 Z" fill={c} {...S}/>
      <polygon points="256,81 269,92 256,103 243,92" fill={c} {...S}/>
      <polygon points="256,338.64 263.92,348 256,357.36 248.08,348" fill={c} {...S}/>
      <path d="M222,348 C208.3,372.3 177.1,369.7 165.2,368.7 C173.7,360.2 195.9,338.2 222,348 Z" fill={c} {...S}/>
      <path d="M290,348 C316.1,338.2 338.3,360.2 346.8,368.7 C334.9,369.7 303.7,372.3 290,348 Z" fill={c} {...S}/>
    </>;
    case "B": return <>
      <path d="M236,104 C240.8,84 263.1,82.4 271.6,81.7 C267.3,89.1 256.1,108.4 236,104 Z" fill={c} {...S}/>
      <path d="M276,104 C255.9,108.4 244.7,89.1 240.4,81.7 C248.9,82.4 271.2,84 276,104 Z" fill={c} {...S}/>
      <polygon points="256,81 269,92 256,103 243,92" fill={c} {...S}/>
      <polygon points="256,337.08 265.24,348 256,358.92 246.76,348" fill={c} {...S}/>
      <path d="M222,348 C206,376.3 169.6,373.3 155.7,372.1 C165.6,362.3 191.6,336.6 222,348 Z" fill={c} {...S}/>
      <path d="M290,348 C320.4,336.6 346.4,362.3 356.3,372.1 C342.4,373.3 306,376.3 290,348 Z" fill={c} {...S}/>
      <path d="M234,348 C226,371.8 198.1,374 187.4,374.9 C193.5,366 209.4,343 234,348 Z" fill={c} {...S}/>
      <path d="M278,348 C302.6,343 318.5,366 324.6,374.9 C313.9,374 286,371.8 278,348 Z" fill={c} {...S}/>
      <path d="M155.5,276 C151.8,290.6 135.7,290.9 129.6,291 C132.7,285.7 141,271.9 155.5,276 Z" fill={c} {...S}/>
      <path d="M356.5,276 C371,271.9 379.3,285.7 382.4,291 C376.3,290.9 360.2,290.6 356.5,276 Z" fill={c} {...S}/>
    </>;
    case "A": return <>
      <path d="M230,106 C239.1,82.8 267,81.2 277.7,80.6 C271.2,89.2 254.3,111.4 230,106 Z" fill={c} {...S}/>
      <path d="M282,106 C257.7,111.4 240.8,89.2 234.3,80.6 C245,81.2 272.9,82.8 282,106 Z" fill={c} {...S}/>
      <polygon points="256,77 271,90 256,103 241,90" fill={c} {...S}/>
      <polygon points="256,335.26 266.78,348 256,360.74 245.22,348" fill={c} {...S}/>
      <path d="M222,348 C203.4,381.1 160.9,377.5 144.6,376.2 C156.2,364.6 186.5,334.6 222,348 Z" fill={c} {...S}/>
      <path d="M290,348 C325.5,334.6 355.8,364.6 367.4,376.2 C351.1,377.5 308.6,381.1 290,348 Z" fill={c} {...S}/>
      <path d="M234,348 C224.7,375.8 192.2,378.4 179.7,379.4 C186.8,369 205.3,342.2 234,348 Z" fill={c} {...S}/>
      <path d="M278,348 C306.7,342.2 325.2,369 332.3,379.4 C319.8,378.4 287.3,375.8 278,348 Z" fill={c} {...S}/>
      <path d="M208,348 C179.6,382.9 129.5,372.7 110.2,368.8 C126.2,357.4 167.9,327.7 208,348 Z" fill={c} {...S}/>
      <path d="M304,348 C344.1,327.7 385.8,357.4 401.8,368.8 C382.5,372.7 332.4,382.9 304,348 Z" fill={c} {...S}/>
      <path d="M145.7,253.8 C138.3,269.5 120.2,265.8 113.3,264.4 C118.1,259.1 130.5,245.5 145.7,253.8 Z" fill={c} {...S}/>
      <path d="M169.8,295.6 C169.4,312.9 151.4,316.9 144.5,318.4 C146.7,311.7 152.5,294.2 169.8,295.6 Z" fill={c} {...S}/>
      <path d="M342.2,295.6 C359.5,294.2 365.3,311.7 367.5,318.4 C360.6,316.9 342.6,312.9 342.2,295.6 Z" fill={c} {...S}/>
      <path d="M366.3,253.8 C381.5,245.5 393.9,259.1 398.7,264.4 C391.8,265.8 373.7,269.5 366.3,253.8 Z" fill={c} {...S}/>
    </>;
    case "S": return <>
      <path d="M230,106 C239.1,82.8 267,81.2 277.7,80.6 C271.2,89.2 254.3,111.4 230,106 Z" fill={c} {...S}/>
      <path d="M282,106 C257.7,111.4 240.8,89.2 234.3,80.6 C245,81.2 272.9,82.8 282,106 Z" fill={c} {...S}/>
      <polygon points="256,77 271,90 256,103 241,90" fill={c} {...S}/>
      <polygon points="256,334.22 267.66,348 256,361.78 244.34,348" fill={c} {...S}/>
      <path d="M222,348 C201.9,383.8 155.9,379.9 138.3,378.5 C150.9,366 183.6,333.6 222,348 Z" fill={c} {...S}/>
      <path d="M290,348 C328.4,333.6 361.1,366 373.7,378.5 C356.1,379.9 310.1,383.8 290,348 Z" fill={c} {...S}/>
      <path d="M234,348 C223.9,378 188.7,380.9 175.2,381.9 C182.9,370.8 202.9,341.7 234,348 Z" fill={c} {...S}/>
      <path d="M278,348 C309.1,341.7 329.1,370.8 336.8,381.9 C323.3,380.9 288.1,378 278,348 Z" fill={c} {...S}/>
      <path d="M208,348 C177.3,385.7 123,374.7 102.2,370.5 C119.5,358.1 164.6,326 208,348 Z" fill={c} {...S}/>
      <path d="M304,348 C347.4,326 392.5,358.1 409.8,370.5 C389,374.7 334.7,385.7 304,348 Z" fill={c} {...S}/>
      <path d="M248,348 C245.2,373.7 217.6,381.8 207,384.9 C211.2,374.7 222.2,348.1 248,348 Z" fill={c} {...S}/>
      <path d="M264,348 C289.8,348.1 300.8,374.7 305,384.9 C294.4,381.8 266.8,373.7 264,348 Z" fill={c} {...S}/>
      <path d="M141.8,238.1 C132.2,252.6 114.9,246.4 108.3,244 C113.7,239.5 127.9,227.8 141.8,238.1 Z" fill={c} {...S}/>
      <path d="M161,284.5 C158.5,301.7 140.1,303.4 133.1,304 C136.1,297.7 144,281 161,284.5 Z" fill={c} {...S}/>
      <path d="M198,318.5 C203,335.1 187.1,344.4 181,347.9 C181,340.9 181.1,322.5 198,318.5 Z" fill={c} {...S}/>
      <path d="M314,318.5 C330.9,322.5 331,340.9 331,347.9 C324.9,344.4 309,335.1 314,318.5 Z" fill={c} {...S}/>
      <path d="M351,284.5 C368,281 375.9,297.7 378.9,304 C371.9,303.4 353.5,301.7 351,284.5 Z" fill={c} {...S}/>
      <path d="M370.2,238.1 C384.1,227.8 398.3,239.5 403.7,244 C397.1,246.4 379.8,252.6 370.2,238.1 Z" fill={c} {...S}/>
      <polygon points="256,360 265,370 256,380 247,370" fill={cs} stroke="#15171B" strokeWidth="4"/>
    </>;
    case "MAX": return <>
      <circle cx="256" cy="218" r="136" fill="none" stroke={cs} strokeWidth="6"/>
      <path d="M230,106 C239.1,82.8 267,81.2 277.7,80.6 C271.2,89.2 254.3,111.4 230,106 Z" fill={c} {...S}/>
      <path d="M282,106 C257.7,111.4 240.8,89.2 234.3,80.6 C245,81.2 272.9,82.8 282,106 Z" fill={c} {...S}/>
      <polygon points="256,77 271,90 256,103 241,90" fill={c} {...S}/>
      <polygon points="256,106 263,112 256,118 249,112" fill={cs} stroke="#15171B" strokeWidth="4"/>
      <polygon points="256,333.44 268.32,348 256,362.56 243.68,348" fill={c} {...S}/>
      <path d="M222,348 C200.7,385.8 152.2,381.8 133.6,380.2 C146.8,367 181.4,332.7 222,348 Z" fill={c} {...S}/>
      <path d="M290,348 C330.6,332.7 365.2,367 378.4,380.2 C359.8,381.8 311.3,385.8 290,348 Z" fill={c} {...S}/>
      <path d="M234,348 C223.4,379.7 186.2,382.7 171.9,383.8 C180,372.1 201.2,341.3 234,348 Z" fill={c} {...S}/>
      <path d="M278,348 C310.8,341.3 332,372.1 340.1,383.8 C325.8,382.7 288.6,379.7 278,348 Z" fill={c} {...S}/>
      <path d="M208,348 C175.6,387.9 118.2,376.2 96.3,371.8 C114.5,358.7 162.2,324.8 208,348 Z" fill={c} {...S}/>
      <path d="M304,348 C349.8,324.8 397.5,358.7 415.7,371.8 C393.8,376.2 336.4,387.9 304,348 Z" fill={c} {...S}/>
      <path d="M248,348 C245,375.1 215.9,383.7 204.7,387 C209.1,376.2 220.7,348.2 248,348 Z" fill={c} {...S}/>
      <path d="M264,348 C291.3,348.2 302.9,376.2 307.3,387 C296.1,383.7 267,375.1 264,348 Z" fill={c} {...S}/>
      <path d="M140.3,226.1 C129.3,239.5 112.7,231.5 106.4,228.5 C112.2,224.5 127.5,214.4 140.3,226.1 Z" fill={c} {...S}/>
      <path d="M153.6,272.5 C149,289.2 130.6,288.6 123.6,288.4 C127.3,282.5 137.2,266.9 153.6,272.5 Z" fill={c} {...S}/>
      <path d="M184.6,309.4 C187.2,326.5 170.2,333.5 163.7,336.2 C164.7,329.2 167.3,311 184.6,309.4 Z" fill={c} {...S}/>
      <path d="M227.9,330.6 C237.3,345.1 224.6,358.5 219.7,363.5 C217.8,356.8 212.8,339.1 227.9,330.6 Z" fill={c} {...S}/>
      <path d="M284.1,330.6 C299.2,339.1 294.2,356.8 292.3,363.5 C287.4,358.5 274.7,345.1 284.1,330.6 Z" fill={c} {...S}/>
      <path d="M327.4,309.4 C344.7,311 347.3,329.2 348.3,336.2 C341.8,333.5 324.8,326.5 327.4,309.4 Z" fill={c} {...S}/>
      <path d="M358.4,272.5 C374.8,266.9 384.7,282.5 388.4,288.4 C381.4,288.6 363,289.2 358.4,272.5 Z" fill={c} {...S}/>
      <path d="M371.7,226.1 C384.5,214.4 399.8,224.5 405.6,228.5 C399.3,231.5 382.7,239.5 371.7,226.1 Z" fill={c} {...S}/>
      <polygon points="102,200 76,228 76,244 102,272 112,236" fill={c} stroke="#15171B" strokeWidth="4"/>
      <polygon points="410,200 436,228 436,244 410,272 400,236" fill={c} stroke="#15171B" strokeWidth="4"/>
      <polygon points="256,361 266,372 256,383 246,372" fill={cs} stroke="#15171B" strokeWidth="4"/>
    </>;
    default: return null;
  }
}

/**
 * Emblema do rank atual do jogador.
 * rank: "F","E","D","C","B","A","S","MAX" ou null (Humano)
 * modifier: "","−","−−","−−−","+","++","+++"
 * size: tamanho em px
 */
function RankEmblemSVG({ rank, modifier, size = 32, color, colorSecondary }) {
  if (!rank) {
    // Humano — ícone neutro
    const c = color || "#888888";
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke={c} strokeWidth="1.5" fill={c + "18"} />
        <circle cx="16" cy="12" r="4" stroke={c} strokeWidth="1.5" fill={c + "30"} />
        <path d="M8 24c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  const c = color || "#a0a0a0";
  const cs = colorSecondary || c + "80";
  // viewBox crops to the emblem area (works for F through MAX)
  const vb = rank === "MAX" ? "65 65 382 345" : "110 68 292 332";

  return (
    <svg width={size} height={size} viewBox={vb}>
      {/* Base circles */}
      <circle cx="256" cy="218" r="118" fill="#1a1c20" stroke="#15171B" strokeWidth="6"/>
      <circle cx="256" cy="218" r="106" fill="none" stroke={c} strokeWidth="20"/>
      <circle cx="256" cy="218" r="94"  fill="none" stroke={cs + "99"} strokeWidth="10"/>
      <circle cx="256" cy="218" r="76"  fill="none" stroke="#15171B" strokeWidth="3"/>
      {/* Rank-specific frame decorations */}
      {_rankDeco(rank, c, cs)}
      {/* Rank letter */}
      <text x="256" y="218" textAnchor="middle" dominantBaseline="central"
        fontSize={rank === "MAX" ? "62" : "84"} fontWeight="900"
        fill={c} fontFamily="sans-serif" letterSpacing="-3"
        style={{ userSelect: "none" }}>
        {rank}
      </text>
      {/* Modifier */}
      {modifier && (
        <text x="256" y="292" textAnchor="middle"
          fontSize="38" fontWeight="700"
          fill={c + "cc"} fontFamily="sans-serif" letterSpacing="3"
          style={{ userSelect: "none" }}>
          {modifier.replace(/-/g, "−")}
        </text>
      )}
    </svg>
  );
}

/* ═══ ENERGIA BAR DUPLA ═══ */
/**
 * Barra dupla de progresso:
 * - Primária: progresso rumo ao próximo sub-rank (baseado em PODER)
 * - Secundária: progresso rumo à próxima notificação de PODER
 */
function EnergiaBarDupla({ poderInfo, rankInfo }) {
  if (!poderInfo || !rankInfo) return null;
  const { poder, totalEnergia, energiaInPoder } = poderInfo;
  const { subRankMinPoder, subRankMaxPoder, nextSubRankId, nextSubRankMinPoder, lastNotifPoder, nextNotifPoder, color, label } = rankInfo;

  // Barra primária: progresso dentro do sub-rank atual
  const subRankTotal = (subRankMaxPoder - subRankMinPoder + 1) * 100;
  const subRankProgress = (poder - subRankMinPoder) * 100 + energiaInPoder;
  const primaryPct = subRankTotal > 0 ? clamp(subRankProgress / subRankTotal * 100, 0, 100) : 100;
  const energiaToNextSub = nextSubRankMinPoder != null
    ? Math.max(0, nextSubRankMinPoder * 100 - totalEnergia)
    : 0;

  // Barra secundária: progresso para próxima notificação de PODER
  const notifRange = (nextNotifPoder - lastNotifPoder) * 100;
  const notifProgress = (poder - lastNotifPoder) * 100 + energiaInPoder;
  const secondaryPct = notifRange > 0 ? clamp(notifProgress / notifRange * 100, 0, 100) : 100;

  const c = color || C.gold;
  const grad = "linear-gradient(90deg," + c + "80," + c + ")";

  return (
    <div>
      {/* Barra primária (sub-rank) */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx3, marginBottom: 3 }}>
        <span>Rank <span style={{ color: c, fontWeight: 600 }}>{label}</span></span>
        <span style={{ color: C.tx4 }}>
          {nextSubRankId
            ? <>→ <span style={{ color: c }}>{nextSubRankId}</span> em {energiaToNextSub.toLocaleString()} ⚡</>
            : <span style={{ color: c }}>Sub-rank máximo</span>
          }
        </span>
      </div>
      <div style={{ height: 6, background: C.card, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", borderRadius: 3, background: grad, width: primaryPct + "%", transition: "width .4s" }} />
      </div>

      {/* Barra secundária (notificação de PODER) */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.tx4, marginBottom: 2 }}>
        <span>⚡ PODER <span style={{ color: c, fontWeight: 600 }}>{poder.toLocaleString()}</span></span>
        <span>próx. notif. PODER {nextNotifPoder.toLocaleString()}</span>
      </div>
      <div style={{ height: 3, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: c + "99", width: secondaryPct + "%", transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ═══ SELETOR DE DIFICULDADE EM 2 ETAPAS ═══ */
function DiffPick({ value, onChange }) {
  const [step, setStep] = useState("category"); // "category" | "sub"
  const [selectedCat, setSelectedCat] = useState(null);

  // Detecta categoria e variação do valor atual
  const currentCat = value ? DIFF_CATEGORIES.find(c => c.levels.includes(value)) : null;
  const catColor = currentCat ? currentCat.color : C.tx3;

  const handleCatSelect = (cat) => {
    if (!cat.subs) {
      // Categoria sem variação (F ou MAX) — seleciona direto
      onChange(cat.levels[0]);
      setStep("category");
      setSelectedCat(null);
    } else {
      setSelectedCat(cat);
      setStep("sub");
    }
  };

  const handleSubSelect = (level) => {
    onChange(level);
    setStep("category");
    setSelectedCat(null);
  };

  const handleBack = () => {
    setStep("category");
    setSelectedCat(null);
  };

  if (step === "sub" && selectedCat) {
    const cc = selectedCat.color;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span onClick={handleBack} style={{ cursor: "pointer", color: C.tx3, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </span>
          <span style={{ fontSize: 11, color: cc, fontWeight: 600 }}>{selectedCat.label}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {selectedCat.subs.map((sub, i) => {
            const lvl = selectedCat.levels[i];
            const energia = ENERGIA_TABLE[lvl] || 0;
            const sel = value === lvl;
            return (
              <div key={sub} onClick={() => handleSubSelect(lvl)} style={{
                flex: 1, minHeight: 48, padding: "10px 6px", borderRadius: 7, cursor: "pointer", textAlign: "center",
                background: sel ? cc + "25" : cc + "10",
                border: "1px solid " + (sel ? cc + "88" : cc + "30"),
                transition: "background .12s, border-color .12s",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: sel ? cc : cc + "aa" }}>{sub}</div>
                <div style={{ fontSize: 10, color: C.tx4, marginTop: 2 }}>{energia} ⚡</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: C.tx4, marginTop: 6, textAlign: "center" }}>
          Escolha a intensidade dentro de "{selectedCat.label}"
        </div>
      </div>
    );
  }

  // Step 1: categorias
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
        {DIFF_CATEGORIES.map(cat => {
          const isCurrent = currentCat && currentCat.id === cat.id;
          const cc = cat.color;
          return (
            <div key={cat.id} onClick={() => handleCatSelect(cat)} style={{
              minHeight: 48, padding: "9px 6px", borderRadius: 7, cursor: "pointer", textAlign: "center",
              background: isCurrent ? cc + "25" : cc + "10",
              border: "1px solid " + (isCurrent ? cc + "88" : cc + "28"),
              transition: "background .12s, border-color .12s",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? cc : cc + "99", lineHeight: 1 }}>{cat.id}</div>
              <div style={{ fontSize: 9, color: C.tx4, marginTop: 2, lineHeight: 1.2 }}>{ENERGIA_TABLE[cat.levels[0]]}–{ENERGIA_TABLE[cat.levels[cat.levels.length - 1]]} ⚡</div>
            </div>
          );
        })}
      </div>
      {currentCat && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, marginTop: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: catColor, flexShrink: 0 }} />
          <span style={{ color: catColor, fontWeight: 600 }}>{currentCat.label}</span>
          {currentCat.subs && <span style={{ color: C.tx4 }}>· {currentCat.subs[currentCat.levels.indexOf(value)]}</span>}
          <span style={{ color: C.tx4 }}>· {ENERGIA_TABLE[value]} ⚡</span>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onToggle, label }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={onToggle}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38, padding: "8px 0", cursor: "pointer", opacity: pressed ? 0.72 : 1, transition: "opacity .1s" }}>
      <span style={{ fontSize: 11, color: on ? C.tx : C.tx2, flex: 1 }}>{label}</span>
      <div style={{ width: 40, height: 24, borderRadius: 12, background: on ? C.gold + "80" : C.brd2, position: "relative", transition: "background .2s" }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: C.tx, position: "absolute", top: 3, left: on ? 19 : 3, transition: "left .2s" }} />
      </div>
    </div>
  );
}

export {
  Btn, Card, Badge, SLabel, XpBar, PBar, Chk,
  TopBar, Modal, ConfirmModal, DeleteModal,
  FilterModal, FilterBtn, NotesLog,
  Field, Input, SelBtns, ColorPick, getDiffColor, DiffPick, Toggle,
  RankEmblemSVG, EnergiaBarDupla,
};

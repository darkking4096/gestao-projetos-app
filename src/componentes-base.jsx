import { useState, useMemo } from "react";
import { C } from './temas.js';
import { clamp } from './utilidades.js';
import { COLORS } from './constantes.js';

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
        padding: small ? "6px 12px" : "10px 16px", borderRadius: 7,
        fontSize: small ? 10 : 11, fontWeight: 500, cursor: "pointer",
        border: "none",
        background: danger ? "#e74c3c15" : primary ? (hasTones ? "linear-gradient(135deg, " + C.goldDim + ", " + (C.gold2 || C.gold) + "18)" : C.goldDim) : C.card,
        color: danger ? C.red : primary ? C.gold : C.tx2,
        borderWidth: 1, borderStyle: "solid",
        borderColor: danger ? (hovered ? C.red : "#e74c3c30") : primary ? C.goldBrd : (hovered ? C.brd2 : C.brd),
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
  return <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 3, background: color + "20", color }}>{children}</span>;
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
        width: 20, height: 20, borderRadius: 4,
        border: "1.5px solid " + (done ? C.green : active ? C.tx3 : "#333"),
        background: done ? C.green : active ? "#33333388" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        transition: "border-color .12s, background .12s",
        transform: pressed ? "scale(0.88)" : "scale(1)",
      }}>{done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : null}</div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 8px" }}>
      {onBack && <span onClick={onBack} style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "4px 2px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.tx2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </span>}
      <span style={{ fontSize: 15, fontWeight: 500, color: C.tx, flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

function Modal({ children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 12, padding: 20, maxWidth: 340, width: "100%" }}>{children}</div>
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
      subtitle="XP e moedas ganhos são mantidos."
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
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
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
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
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
        display: "flex", alignItems: "center", gap: 5, padding: "7px 12px",
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
function DiffPick({ value, onChange }) {
  const diffLabel = !value ? null : value <= 3 ? "Fácil" : value <= 6 ? "Médio" : value <= 9 ? "Difícil" : "Extremo";
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => {
          const dc = getDiffColor(d);
          const sel = value === d;
          return (
            <div key={d} onClick={() => onChange(d)} style={{
              flex: 1, height: 30, borderRadius: 5, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer",
              background: sel ? dc + "2e" : dc + "12",
              color: sel ? dc : dc + "99",
              border: "1px solid " + (sel ? dc + "99" : dc + "38"),
              fontWeight: sel ? 700 : 500,
              transition: "background .12s, color .12s, border-color .12s",
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, paddingLeft: 1, paddingRight: 1 }}>
        {[["1–3", "Fácil", "#22c55e"], ["4–6", "Médio", "#f59e0b"], ["7–9", "Difícil", "#f97316"], ["10", "Extremo", "#ef4444"]].map(([range, lbl, clr]) => (
          <div key={range} style={{ fontSize: 10, color: clr + "88", lineHeight: 1.3, textAlign: "center", flex: range === "10" ? "0 0 auto" : 1 }}>
            <span style={{ fontWeight: 600 }}>{range}</span> <span>{lbl}</span>
          </div>
        ))}
      </div>
      <div style={{ minHeight: 16, marginTop: 3 }}>
        {diffLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: getDiffColor(value), flexShrink: 0 }} />
            <span style={{ color: getDiffColor(value), fontWeight: 500 }}>{diffLabel}</span>
            <span style={{ color: C.tx4 }}>· nível {value}</span>
          </div>
        )}
      </div>
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
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", opacity: pressed ? 0.72 : 1, transition: "opacity .1s" }}>
      <span style={{ fontSize: 11, color: on ? C.tx : C.tx2, flex: 1 }}>{label}</span>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? C.gold + "80" : "#333", position: "relative", transition: "background .2s" }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#eee", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left .2s" }} />
      </div>
    </div>
  );
}

export {
  Btn, Card, Badge, SLabel, XpBar, PBar, Chk,
  TopBar, Modal, ConfirmModal, DeleteModal,
  FilterModal, FilterBtn, NotesLog,
  Field, Input, SelBtns, ColorPick, getDiffColor, DiffPick, Toggle,
};

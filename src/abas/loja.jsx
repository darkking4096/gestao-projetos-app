import { useState } from "react";
import { C, hexToHSL, hslToHex } from '../temas.js';
import { getCoins, getMastery, clamp } from '../utilidades.js';
import { MASTERY_LEVELS, COLORS } from '../constantes.js';
import { Btn, Card, Badge, PBar, TopBar, Modal, ConfirmModal } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG, BorderSVG, TitleSVG, SHOP_THEMES_LIST, SHOP_TITLES, SHOP_ICONS, SHOP_BORDERS, SHOP_CONSUMABLES, getUpgradeCost, getTitleStyle, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS, MAX_UPGRADE } from '../icones.jsx';

function ShopTab({ profile, buyItem, equipItem, buyConsumable, upgradeItem, setProfile }) {
  const [cat, setCat] = useState("titles");
  const cats = [["titles", "Títulos"], ["icons", "Ícones"], ["themes", "Temas"], ["borders", "Bordas"], ["consumables", "Itens"]];
  const owned = profile.purchasedItems || [];
  const upLevels = profile.upgradeLevels || {};
  const upgradeable = ["titles", "borders", "themes"];

  // Tutorial de primeira visita
  const [tutStep, setTutStep] = useState(!profile.shopTutorialSeen ? 0 : -1);
  const tutSlides = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f0a500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      categoria: "Títulos",
      titulo: "🏷️ Títulos",
      descricao: "Títulos são tags decorativas exibidas no seu perfil. Cada um tem um estilo único e pode ser evoluído até 5 vezes para ganhar efeitos visuais especiais. Demonstre sua dedicação!",
      cor: "#f0a500",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="10" r="3"/>
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
        </svg>
      ),
      categoria: "Ícones",
      titulo: "🎭 Ícones",
      descricao: "Ícones personalizam o avatar exibido no seu perfil e no ranking social. Escolha um símbolo que represente sua identidade dentro do app!",
      cor: "#22c55e",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path d="M2 12h20"/>
        </svg>
      ),
      categoria: "Temas",
      titulo: "🎨 Temas",
      descricao: "Temas mudam completamente a paleta de cores do app. Cada tema tem raridade única — dos comuns aos lendários com efeitos especiais. Evolua um tema para intensificar suas cores!",
      cor: "#a78bfa",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <rect x="7" y="7" width="10" height="10" rx="2"/>
        </svg>
      ),
      categoria: "Bordas",
      titulo: "🖼️ Bordas",
      descricao: "Bordas decoram o quadro do seu avatar tornando-o único. Evoluindo uma borda até o nível máximo você desbloqueia animações e efeitos de brilho exclusivos!",
      cor: "#38bdf8",
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
      categoria: "Itens",
      titulo: "⚡ Itens Consumíveis",
      descricao: "Itens são consumíveis poderosos! O Escudo protege seu streak por um dia de ausência. O Boost multiplica suas moedas em +25% por 24h. Os Baús concedem moedas e surpresas aleatórias!",
      cor: "#f87171",
    },
  ];

  const handleTutNext = () => {
    if (tutStep < tutSlides.length - 1) {
      setTutStep(s => s + 1);
    } else {
      setTutStep(-1);
      if (setProfile) setProfile(p => ({ ...p, shopTutorialSeen: true }));
    }
  };

  const renderItem = (item, type) => {
    const isOwned = owned.includes(item.id);
    const isEquipped = (type === "titles" && profile.equippedTitle === item.id) ||
      (type === "icons" && profile.equippedIcon === item.id) ||
      (type === "themes" && profile.equippedTheme === item.id) ||
      (type === "borders" && profile.equippedBorder === item.id);
    const canBuy = !isOwned && profile.coins >= item.price;
    const upLv = upLevels[item.id] || 0;
    const canUpgrade = isOwned && upgradeable.includes(type) && upLv < MAX_UPGRADE;
    const nextCost = canUpgrade ? getUpgradeCost(upLv) : null;
    const canAffordUp = nextCost !== null && profile.coins >= nextCost;

    return (
      <div key={item.id} style={{ background: isEquipped ? C.goldDim : C.card, border: "1px solid " + (isEquipped ? C.goldBrd : C.brd), borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {type === "icons" && <IconSVG id={item.id} size={22} color={isEquipped ? C.gold : C.tx2} />}
          {type === "themes" && (() => { const [h,s,l] = hexToHSL(item.accent); const light = hslToHex(h, s, clamp(l+15,0,95)); return (<div style={{ position: "relative", width: 22, height: 22 }}><div style={{ width: 22, height: 22, borderRadius: 11, background: item.rarity >= 3 ? "linear-gradient(135deg, " + item.accent + ", " + light + ")" : item.accent, border: "2px solid " + (item.accent + "60"), boxShadow: item.rarity >= 4 ? "0 0 6px " + item.accent + "50" : "none" }} />{item.rarity > 1 && <div style={{ position: "absolute", bottom: -2, right: -2, fontSize: 6, fontWeight: 700, color: item.accent, background: C.bg, borderRadius: 3, padding: "0 2px", lineHeight: "10px" }}>{RARITY_LABELS[item.rarity]}</div>}</div>); })()}
          {type === "borders" && <BorderSVG level={upLv} color={C.gold} accentColor={item.color} size={40} />}
          {type === "titles" && <TitleSVG level={upLv} color={isOwned ? C.gold : C.tx3} size={28} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isEquipped ? C.gold : C.tx, ...(type === "titles" && isEquipped ? getTitleStyle(upLv) : {}) }}>{item.name}</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 1 }}>
              {item.desc && <span style={{ fontSize: 11, color: C.tx3 }}>{item.desc}</span>}
              {type === "themes" && item.rarity > 1 && <span style={{ fontSize: 11, color: RARITY_COLORS[item.rarity] || C.tx3, fontWeight: 700, padding: "1px 4px", background: (RARITY_COLORS[item.rarity] || C.tx3) + "15", borderRadius: 3 }}>{RARITY_LABELS[item.rarity]}</span>}
              {upLv > 0 && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{UPGRADE_LABELS[upLv]}</span>}
            </div>
          </div>
          {isEquipped && <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, padding: "2px 6px", background: C.goldDim, borderRadius: 4, border: "1px solid " + C.goldBrd }}>{"EQUIPADO"}</div>}
        </div>
        {/* Upgrade progress bar */}
        {isOwned && upgradeable.includes(type) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: C.brd, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: (upLv / MAX_UPGRADE * 100) + "%", height: "100%", background: C.gold, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, color: upLv >= MAX_UPGRADE ? C.gold : C.tx3, fontWeight: 600, minWidth: 30, textAlign: "right" }}>{upLv}/{MAX_UPGRADE}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {!isOwned && <div style={{ fontSize: 11, color: item.price === 0 ? C.green : C.tx2 }}>{item.price === 0 ? "Grátis" : item.price + " moedas"}</div>}
          {!isOwned && <Btn small primary={canBuy} onClick={() => canBuy && buyItem(item.id, item.price, type)} style={{ opacity: canBuy ? 1 : 0.4 }}>{canBuy ? "Comprar" : "Sem moedas"}</Btn>}
          {isOwned && !isEquipped && !canUpgrade && <div style={{ flex: 1 }} />}
          {isOwned && !isEquipped && <Btn small primary onClick={() => equipItem(item.id, type)}>{"Equipar"}</Btn>}
          {canUpgrade && nextCost !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.tx3 }}>{nextCost} moedas</span>
              <Btn small primary={canAffordUp} onClick={() => canAffordUp && upgradeItem(item.id, upLv)} style={{ opacity: canAffordUp ? 1 : 0.4 }}>{"Evoluir"}</Btn>
            </div>
          )}
          {isOwned && upLv >= MAX_UPGRADE && upgradeable.includes(type) && <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{"MAX"}</div>}
        </div>
      </div>
    );
  };

  const renderConsumable = (item) => {
    const canBuy = profile.coins >= item.price;
    const isShield = item.id === "c_escudo";
    const isBoost = item.id === "c_boost";
    const shieldActive = profile.shieldActive;
    const boostActive = profile.boostExpiry && profile.boostExpiry > Date.now();
    const isActive = (isShield && shieldActive) || (isBoost && boostActive);
    const boostRemain = boostActive ? Math.ceil((profile.boostExpiry - Date.now()) / 60000) : 0;

    return (
      <div key={item.id} style={{ background: isActive ? C.goldDim : C.card, border: "1px solid " + (isActive ? C.goldBrd : C.brd), borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ConsumableSVG id={item.id} size={22} color={isActive ? C.gold : C.tx2} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? C.gold : C.tx }}>{item.name}</div>
            <div style={{ fontSize: 11, color: C.tx3, marginTop: 1 }}>{item.desc}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: C.tx2 }}>{item.price + " moedas"}</div>
          {isActive && <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{isShield ? "Ativo" : boostRemain + "min restantes"}</div>}
          {!isActive && <Btn small primary={canBuy} onClick={() => canBuy && buyConsumable(item.id, item.price)} style={{ opacity: canBuy ? 1 : 0.4 }}>{canBuy ? "Comprar e usar" : "Sem moedas"}</Btn>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 14 }}>
      {/* Tutorial de primeira visita */}
      {tutStep >= 0 && tutStep < tutSlides.length && (() => {
        const slide = tutSlides[tutStep];
        const isLast = tutStep === tutSlides.length - 1;
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: "#000000cc",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24
          }}>
            <div style={{
              background: C.card, borderRadius: 18, padding: "28px 24px",
              maxWidth: 360, width: "100%",
              border: "1px solid " + slide.cor + "40",
              boxShadow: "0 8px 40px " + slide.cor + "25",
              animation: "tabFadeIn .22s ease"
            }}>
              {/* Header com indicadores */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
                {tutSlides.map((_, i) => (
                  <div key={i} style={{
                    height: 4, borderRadius: 2,
                    width: i === tutStep ? 24 : 8,
                    background: i === tutStep ? slide.cor : C.brd2,
                    transition: "width .25s, background .25s"
                  }} />
                ))}
              </div>

              {/* Ícone + Categoria */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 36,
                  background: slide.cor + "18",
                  border: "1.5px solid " + slide.cor + "40",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px"
                }}>
                  {slide.icon}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: slide.cor, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>
                  CATEGORIA {tutStep + 1} DE {tutSlides.length}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.tx, letterSpacing: -0.3 }}>{slide.titulo}</div>
              </div>

              {/* Descrição */}
              <div style={{
                fontSize: 12, color: C.tx3, lineHeight: 1.7,
                marginBottom: 22, textAlign: "center",
                background: slide.cor + "08", border: "0.5px solid " + slide.cor + "20",
                borderRadius: 10, padding: "10px 14px"
              }}>
                {slide.descricao}
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 8 }}>
                {tutStep > 0 && (
                  <button
                    onClick={() => setTutStep(s => s - 1)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 9,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "transparent", color: C.tx3,
                      border: "1px solid " + C.brd, transition: "filter .12s"
                    }}>
                    ← Anterior
                  </button>
                )}
                <button
                  onClick={handleTutNext}
                  style={{
                    flex: 2, padding: "11px 0", borderRadius: 9,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: "linear-gradient(135deg," + slide.cor + "30," + slide.cor + "18)",
                    color: slide.cor,
                    border: "1px solid " + slide.cor + "60",
                    transition: "filter .12s"
                  }}>
                  {isLast ? "✓ Entendi!" : "Próximo →"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, borderRadius: 8, padding: 10, marginBottom: 12, border: "1px solid " + C.brd }}>
        <div style={{ width: 34, height: 34, background: C.goldDim, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid " + C.goldBrd, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div><div style={{ fontSize: 22, fontWeight: 600, color: C.gold }}>{profile.coins}</div><div style={{ fontSize: 11, color: C.tx3 }}>{"Moedas disponíveis"}</div></div>
      </div>
      {/* Active effects banner */}
      {(profile.shieldActive || (profile.boostExpiry && profile.boostExpiry > Date.now())) && (
        <div style={{ background: C.goldDim, border: "1px solid " + C.goldBrd, borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {profile.shieldActive && <div style={{ fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_escudo" size={10} color={C.gold} />{" Escudo ativo"}</div>}
          {profile.boostExpiry && profile.boostExpiry > Date.now() && <div style={{ fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 3 }}><ConsumableSVG id="c_boost" size={10} color={C.gold} />{" Boost +25% ("}{Math.ceil((profile.boostExpiry - Date.now()) / 60000)}{"min)"}</div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto" }}>
        {cats.map(([k, l]) => (
          <div key={k} onClick={() => setCat(k)} style={{
            padding: "7px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            background: cat === k ? C.goldDim : C.card, color: cat === k ? C.gold : C.tx3,
            border: "1px solid " + (cat === k ? C.goldBrd : C.brd),
            transition: "background .12s, color .12s, border-color .12s"
          }}>{l}</div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cat === "titles" && SHOP_TITLES.map(it => renderItem(it, "titles"))}
        {cat === "icons" && SHOP_ICONS.map(it => renderItem(it, "icons"))}
        {cat === "themes" && SHOP_THEMES_LIST.map(it => renderItem(it, "themes"))}
        {cat === "borders" && SHOP_BORDERS.map(it => renderItem(it, "borders"))}
        {cat === "consumables" && SHOP_CONSUMABLES.map(it => renderConsumable(it))}
      </div>
    </div>
  );
}




export default ShopTab;

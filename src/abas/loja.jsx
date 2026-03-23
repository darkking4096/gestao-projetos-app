import { useState } from "react";
import { C, hexToHSL, hslToHex } from '../temas.js';
import { getCoins, getMastery, clamp } from '../utilidades.js';
import { MASTERY_LEVELS, COLORS } from '../constantes.js';
import { Btn, Card, Badge, PBar, TopBar, Modal, ConfirmModal } from '../componentes-base.jsx';
import { IconSVG, ConsumableSVG, BorderSVG, TitleSVG, SHOP_THEMES_LIST, SHOP_TITLES, SHOP_ICONS, SHOP_BORDERS, SHOP_CONSUMABLES, getUpgradeCost, getTitleStyle, getBorderStyle, UPGRADE_LABELS, RARITY_LABELS, RARITY_COLORS, MAX_UPGRADE } from '../icones.jsx';

function ShopTab({ profile, buyItem, equipItem, buyConsumable, upgradeItem }) {
  const [cat, setCat] = useState("titles");
  const cats = [["titles", "Títulos"], ["icons", "Ícones"], ["themes", "Temas"], ["borders", "Bordas"], ["consumables", "Itens"]];
  const owned = profile.purchasedItems || [];
  const upLevels = profile.upgradeLevels || {};
  const upgradeable = ["titles", "borders", "themes"];

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

"use strict";
// ===================== 百鬼夜行パック =====================
const W = 360, H = 640;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
let K = 1; // 描画倍率
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const sc = s >= 2 ? Math.floor(s * 2) / 2 : s;
  cv.style.width = W * sc + "px"; cv.style.height = H * sc + "px";
  K = Math.max(1, Math.round(sc * (window.devicePixelRatio || 1)));
  cv.width = W * K; cv.height = H * K;
}
addEventListener("resize", fit); fit();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = `"DotGothic16","Hiragino Sans","Noto Sans JP",sans-serif`;

// ---------- セーブ ----------
const SAVE_KEY = "hyakki-pack-v1";
let save = { coins: 0, best: 0, unlocked: { miko: 1, ronin: 1 }, seenItems: {}, seenRecipes: {}, startGold: 0 };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

// ---------- データ ----------
const GW = 7, GH = 5, CELL = 38, GX = 10, GY = 262;
const STARM = [0, 1, 1.7, 2.6];
const TIERCOL = ["", "#6e6a9c", "#4a7be8", "#e0a030"];
const ITEMS = {
  chouchin: { n:"提灯お化け",     w:1,h:1, tier:1, cost:3, aura:{tag:"weapon", atk:2} },
  zouri:    { n:"化け草履",       w:1,h:1, tier:1, cost:3, cd:2.5, atk:3,  tags:["weapon"] },
  geta:     { n:"一本足の下駄",   w:1,h:1, tier:1, cost:4, cd:3.5, atk:6,  tags:["weapon"] },
  katana:   { n:"化け刀",         w:1,h:2, tier:1, cost:5, cd:3,   atk:8,  tags:["weapon"] },
  kama:     { n:"ぶんぶく茶釜",   w:1,h:1, tier:1, cost:4, cd:4,   burn:3 },
  tsubo:    { n:"毒壺",           w:1,h:1, tier:1, cost:4, cd:4,   psn:2 },
  hyoutan:  { n:"ひょうたん小僧", w:1,h:1, tier:1, cost:4, cd:5,   heal:6 },
  kagami:   { n:"古鏡",           w:1,h:1, tier:1, cost:4, cd:5,   blk:8 },
  karakasa: { n:"唐傘小僧",       w:1,h:2, tier:1, cost:5, cd:4,   blk:8 },
  taiko:    { n:"雷太鼓",         w:1,h:1, tier:2, cost:6, aura:{cdMul:0.88} },
  biwa:     { n:"琵琶牧々",       w:1,h:2, tier:2, cost:6, cd:4,   atk:6, heal:3 },
  fude:     { n:"筆の付喪神",     w:1,h:2, tier:2, cost:6, cd:4,   atk:3, psn:2, tags:["weapon"] },
  koto:     { n:"琴古主",         w:2,h:1, tier:2, cost:8, cd:4,   heal:8, blk:4 },
  kozuchi:  { n:"打出の小槌",     w:2,h:1, tier:2, cost:8, cd:5,   atk:20, tags:["weapon"] },
  // 合体でしか作れない
  itaten:   { n:"韋駄天草履",     w:1,h:1, tier:3, cost:9, cd:1.6, atk:3.5, tags:["weapon"], fusion:true },
  yaminabe: { n:"闇鍋",           w:1,h:1, tier:3, cost:9, cd:3,   burn:4, psn:2, fusion:true },
  ungaikyo: { n:"雲外鏡",         w:1,h:1, tier:3, cost:10,cd:4,   blk:15, fusion:true },
  benzaiten:{ n:"弁財天の琵琶",   w:1,h:2, tier:3, cost:12,cd:4,   heal:14, fusion:true },
  sumi:     { n:"妖刀・墨染",     w:1,h:2, tier:3, cost:12,cd:3,   atk:15, psn:2, tags:["weapon"], fusion:true },
};
for (const [id, d] of Object.entries(ITEMS)) { d.id = id; d.tags = d.tags || []; }
const RECIPES = [
  { a:"zouri",    b:"geta",    r:"itaten" },
  { a:"kama",     b:"tsubo",   r:"yaminabe" },
  { a:"karakasa", b:"kagami",  r:"ungaikyo" },
  { a:"hyoutan",  b:"biwa",    r:"benzaiten" },
  { a:"katana",   b:"fude",    r:"sumi" },
];
const findRecipe = (x, y) => RECIPES.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x));

const HERO_DEFS = {
  miko:    { n:"巫女",     hp:70, desc:"守りが得意な巫女",   start:[["zouri",2,1],["karakasa",3,1]], cost:0 },
  onmyoji: { n:"陰陽師",   hp:60, desc:"状態異常の使い手",   start:[["kama",2,1],["tsubo",3,1]], cost:40 },
  ronin:   { n:"浪人",     hp:80, desc:"刀一本で生きる男",   start:[["katana",2,1],["hyoutan",3,1]], cost:0 },
};
const STAGES = [
  { n:"小鬼",       s:"e_oni",         hp:24,  it:[{atk:3,cd:3,ic:"zouri"}] },
  { n:"一つ目小僧", s:"e_karakasa",    hp:32,  it:[{atk:3,cd:2.8,ic:"zouri"},{blk:4,cd:5,ic:"karakasa"}] },
  { n:"河童",       s:"e_kappa",       hp:42,  it:[{atk:4,cd:3,ic:"geta"},{heal:3,cd:5,ic:"hyoutan"}] },
  { n:"赤鬼",       s:"e_oniBoss",     hp:80,  boss:1, it:[{atk:8,cd:3.5,ic:"kozuchi"},{blk:6,cd:6,ic:"kagami"}] },
  { n:"子狐",       s:"e_kitsune",     hp:70,  it:[{atk:4,cd:2.5,ic:"zouri"},{burn:2,cd:5,ic:"kama"}] },
  { n:"大入道",     s:"e_karakasaBig", hp:86,  it:[{atk:6,cd:3,ic:"katana"},{blk:8,cd:4,ic:"karakasa"}] },
  { n:"河童の親分", s:"e_kappaBoss",   hp:100, it:[{atk:7,cd:3,ic:"katana"},{heal:5,cd:4,ic:"hyoutan"},{psn:2,cd:6,ic:"tsubo"}] },
  { n:"妖狐",       s:"e_kitsuneBoss", hp:170, boss:1, it:[{atk:9,cd:3,ic:"geta"},{burn:3,cd:4,ic:"kama"},{blk:8,cd:6,ic:"kagami"}] },
  { n:"青鬼",       s:"e_oniBlue",     hp:140, it:[{atk:12,cd:3.5,ic:"kozuchi"},{atk:5,cd:2,ic:"zouri"}] },
  { n:"大入道",     s:"e_karakasaBig", hp:170, it:[{atk:9,cd:3,ic:"sumi"},{blk:12,cd:4,ic:"karakasa"},{heal:6,cd:5,ic:"hyoutan"}] },
  { n:"化け河童",   s:"e_kappaBoss",   hp:190, it:[{atk:10,cd:2.8,ic:"sumi"},{psn:3,cd:4,ic:"tsubo"},{heal:8,cd:5,ic:"hyoutan"}] },
  { n:"がしゃどくろ",s:"e_gasha",      hp:320, boss:1, it:[{atk:14,cd:3.2,ic:"kozuchi"},{atk:6,cd:1.8,ic:"zouri"},{burn:4,cd:5,ic:"kama"},{blk:10,cd:5,ic:"kagami"}] },
];
const TUNE = { hp: 2.2, dmg: 1.0 }; // 後半ほど強くなる係数
const scaleHp = st => 1 + (st - 1) / 11 * TUNE.hp;
const scaleDmg = st => 1 + (st - 1) / 11 * TUNE.dmg;
const R = n => Math.round(n * 10) / 10;
function itemDesc(def, star = 1) {
  const m = STARM[star], p = [];
  if (def.atk) p.push(`${R(def.atk * m)}ダメージ`);
  if (def.blk) p.push(`ブロック${R(def.blk * m)}`);
  if (def.heal) p.push(`${R(def.heal * m)}回復`);
  if (def.burn) p.push(`やけど${R(def.burn * m)}`);
  if (def.psn) p.push(`どく${R(def.psn * m)}`);
  let s = def.cd ? `${def.cd}秒ごと: ` + p.join("・") : "";
  if (def.aura) {
    if (def.aura.atk) s = `隣の武器の攻撃力 +${R(def.aura.atk * m)}`;
    if (def.aura.cdMul) s = `隣のアイテムが${Math.round((1 - def.aura.cdMul) * 100)}%早く動く`;
  }
  return s;
}

// ---------- ユーティリティ ----------
const ui = [];
let mouse = { x: -1, y: -1 };
function blit(s, x, y, o = {}) {
  const sc = o.scale || 1;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  const w = s.W * sc, h = s.H * sc;
  if (o.flip) { ctx.translate(Math.round(x + w), Math.round(y)); ctx.scale(-1, 1); x = 0; y = 0; }
  ctx.drawImage(o.white ? s.w : s.c, Math.round(x), Math.round(y), w, h);
  ctx.restore();
}
const iconFit = id => { const q = spr(id); return q.W <= 40 && q.H <= 40 ? 1 : 0.5; };
function blitC(key, cx, cy, o = {}) { const s = spr(key), sc = o.scale || 1; blit(s, cx - s.W * sc / 2, cy - s.H * sc / 2, o); }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function txt(s, x, y, o = {}) {
  ctx.font = `${o.size || 12}px ${FONT}`; ctx.textAlign = o.align || "left"; ctx.textBaseline = "middle";
  if (o.outline !== false && (o.outline || o.shadow)) {
    ctx.fillStyle = o.outline || "#0d0818";
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]]) ctx.fillText(s, x + dx, y + dy);
  }
  ctx.fillStyle = o.color || "#fff"; ctx.fillText(s, x, y);
}
function wrap(s, maxW, size = 12) {
  ctx.font = `${size}px ${FONT}`;
  const lines = []; let cur = "";
  for (const ch of s) { if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
  if (cur) lines.push(cur); return lines;
}
function panel(x, y, w, h, o = {}) {
  rect(x - 2, y - 2, w + 4, h + 4, "#0d0818");
  rect(x - 1, y - 1, w + 2, h + 2, o.edge || "#7a5bd6");
  rect(x, y, w, h, o.fill || "#2a1f4d");
  rect(x, y, w, 1, o.hi || "#4a3a85");
}
function button(x, y, w, h, label, fn, o = {}) {
  const hot = mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
  const dis = o.disabled;
  panel(x, y, w, h, { fill: dis ? "#2c2a3a" : hot ? (o.hot || "#8a5a1c") : (o.fill || "#6b4414"), edge: dis ? "#555" : (o.edge || "#e0a030"), hi: dis ? "#3a384a" : "#b8802a" });
  txt(label, x + w / 2, y + h / 2 + 1, { size: o.size || 14, align: "center", color: dis ? "#888" : "#fff", outline: "#0d0818" });
  if (!dis) ui.push({ x, y, w, h, fn });
}
function tap(x, y, w, h, fn) { ui.push({ x, y, w, h, fn }); }

// ---------- サウンド(簡易) ----------
let AC = null;
function sfx(type) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    const P = { hit:[180,60,.08,"square"], buy:[520,880,.1,"square"], place:[300,200,.05,"square"], heal:[500,900,.15,"triangle"],
      block:[260,330,.08,"square"], win:[440,880,.4,"square"], lose:[300,80,.5,"sawtooth"], err:[120,90,.1,"square"], fuse:[300,1200,.3,"square"], big:[120,40,.15,"sawtooth"] }[type];
    if (!P) return;
    o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + P[2] + 0.02);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + P[2] + 0.05);
  } catch (e) {}
}

// ---------- 背景 ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let BG = null;
function makeBG() {
  const c = document.createElement("canvas"); c.width = W; c.height = 250; const x = c.getContext("2d");
  const rnd = mulberry(7);
  const bands = ["#14102e", "#1a1540", "#211a52", "#2b2064", "#37287a", "#45308c"];
  const bh = 250 / bands.length;
  for (let y = 0; y < 250; y += 2) for (let xx = 0; xx < W; xx += 2) {
    const f = y / bh, i = Math.min(bands.length - 1, Math.floor(f)), fr = f - i;
    const dith = ((xx / 2 + y / 2) % 2 === 0) ? 0.25 : -0.25;
    const j = clamp(fr + dith > 0.75 ? i + 1 : i, 0, bands.length - 1);
    x.fillStyle = bands[j]; x.fillRect(xx, y, 2, 2);
  }
  // 月
  x.fillStyle = "#f3e9c4"; for (let dy = -22; dy <= 22; dy += 2) for (let dx = -22; dx <= 22; dx += 2) if (dx * dx + dy * dy <= 22 * 22) x.fillRect(280 + dx, 60 + dy, 2, 2);
  x.fillStyle = "#d6c99a"; for (const [dx, dy] of [[-8,-6],[6,4],[-2,10],[10,-10]]) x.fillRect(280 + dx, 60 + dy, 6, 6);
  x.fillStyle = "#ffffff"; for (let i = 0; i < 40; i++) x.fillRect(Math.floor(rnd() * W / 2) * 2, Math.floor(rnd() * 100 / 2) * 2, 2, 2);
  // 木のシルエット
  function trees(col, base, hmin, hmax, n) {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const tx = Math.floor(rnd() * W / 2) * 2, th = hmin + rnd() * (hmax - hmin);
      x.fillRect(tx, base - th, 6, th);
      for (let k = 0; k < 5; k++) { const bw = 10 + Math.floor(rnd() * 24), by = base - th + k * 14 + Math.floor(rnd() * 8); x.fillRect(tx - bw / 2 + 3, by, bw, 8); x.fillRect(tx - bw / 4 + 3, by - 6, bw / 2, 6); }
    }
  }
  trees("#1d1640", 215, 90, 150, 9);
  trees("#120c2a", 225, 60, 110, 7);
  // 地面と台座
  x.fillStyle = "#0e0922"; x.fillRect(0, 200, W, 50);
  x.fillStyle = "#2a1f4d"; x.fillRect(0, 205, W, 3);
  for (const cx of [90, 270]) {
    for (let dy = 0; dy < 20; dy += 2) { const hw = Math.round(Math.sqrt(1 - (dy / 20) ** 2) * 66); x.fillStyle = dy < 8 ? "#4b3a8c" : "#37296a"; x.fillRect(cx - hw, 196 + dy, hw * 2, 2); }
  }
  BG = c;
}

// ---------- 状態 ----------
let scene = "title";
let run = null, battle = null, codexSel = null, titleT = 0;
let FX = { parts: [], texts: [], projs: [], rings: [], slashes: [], shake: 0, leaves: [] };
for (let i = 0; i < 14; i++) FX.leaves.push({ x: rand(0, W), y: rand(0, 240), v: rand(8, 20), s: rand(0, 6) });

function setScene(s) { scene = s; }

// ---------- ラン ----------
function itemSize(it) { const d = ITEMS[it.id]; return it.rot ? [d.h, d.w] : [d.w, d.h]; }
function cellsFree(items, id, rot, x, y, ignore) {
  const d = ITEMS[id], w = rot ? d.h : d.w, h = rot ? d.w : d.h;
  if (x < 0 || y < 0 || x + w > GW || y + h > GH) return false;
  for (const o of items) {
    if (o === ignore) continue;
    const [ow, oh] = itemSize(o);
    if (x < o.x + ow && x + w > o.x && y < o.y + oh && y + h > o.y) return false;
  }
  return true;
}
function itemAt(gx, gy, items = run.items) { return items.find(o => { const [w, h] = itemSize(o); return gx >= o.x && gx < o.x + w && gy >= o.y && gy < o.y + h; }); }
function discover(id) { if (!save.seenItems[id]) { save.seenItems[id] = 1; persist(); } }

function startRun(heroId) {
  const hd = HERO_DEFS[heroId];
  run = { hero: heroId, stage: 1, lives: 3, gold: 10 + save.startGold, items: [], held: null, shop: [], sel: -1, rerolls: 0, phase: "shop", msg: "", msgT: 0, result: null };
  for (const [id, x, y] of hd.start) { run.items.push({ id, star: 1, x, y, rot: false }); discover(id); }
  rollShop(); setScene("run");
}
function rollShop() {
  const tier = run.stage >= 5 ? 2 : 1;
  const pool = Object.values(ITEMS).filter(d => !d.fusion && d.tier <= tier);
  const weighted = []; for (const d of pool) for (let i = 0; i < (d.tier === 1 ? 3 : 1); i++) weighted.push(d.id);
  run.shop = []; for (let i = 0; i < 4; i++) run.shop.push({ id: pick(weighted), star: 1 });
  run.sel = -1; run.rerolls = 0;
}
function say(m) { run.msg = m; run.msgT = 1.6; }

function tapShop(i) {
  const s = run.shop[i]; if (!s || run.phase !== "shop") return;
  if (run.held) return say("先に手のアイテムを置こう");
  if (run.sel !== i) { run.sel = i; return; }
  const d = ITEMS[s.id];
  if (run.gold < d.cost) { sfx("err"); return say("お金が足りない"); }
  run.gold -= d.cost; run.held = { id: s.id, star: 1, rot: false, from: "shop", cost: d.cost };
  run.shop[i] = null; run.sel = -1; discover(s.id); sfx("buy");
}
function tapGrid(gx, gy) {
  if (run.phase !== "shop") return;
  const h = run.held, at = itemAt(gx, gy);
  if (h) {
    if (at) {
      // 合体 / 強化
      let res = null;
      if (at.id === h.id && at.star === h.star && at.star < 3) res = { id: at.id, star: at.star + 1 };
      else { const rc = findRecipe(at.id, h.id); if (rc && at.star === 1 && h.star === 1) res = { id: rc.r, star: 1, recipe: rc }; }
      if (res) {
        const without = run.items.filter(o => o !== at);
        if (cellsFree(without, res.id, false, at.x, at.y)) {
          run.items = without; run.items.push({ id: res.id, star: res.star, x: at.x, y: at.y, rot: false });
          run.held = null; discover(res.id); sfx("fuse");
          const [cw, ch] = [ITEMS[res.id].w, ITEMS[res.id].h];
          burst(GX + (at.x + cw / 2) * CELL, GY + (at.y + ch / 2) * CELL, 18, ["#ffd84d", "#fff", "#ff93b8"], 90);
          if (res.recipe) { save.seenRecipes[res.recipe.r] = 1; persist(); say(`合体! ${ITEMS[res.id].n}`); } else say(`★${res.star} に強化!`);
          return;
        }
      }
      sfx("err"); return say("そこには置けない");
    }
    const [w, hh] = itemSize(h);
    const x = clamp(gx, 0, GW - w), y = clamp(gy, 0, GH - hh);
    if (cellsFree(run.items, h.id, h.rot, x, y)) { run.items.push({ id: h.id, star: h.star, x, y, rot: h.rot }); run.held = null; sfx("place"); }
    else { sfx("err"); say("そこには置けない"); }
  } else if (at) {
    run.items = run.items.filter(o => o !== at);
    run.held = { id: at.id, star: at.star, rot: at.rot, from: "grid", cost: ITEMS[at.id].cost };
    sfx("place");
  }
}
function heldSellValue() { const h = run.held; return h.from === "shop" ? h.cost : Math.max(1, Math.floor(ITEMS[h.id].cost * (h.star === 1 ? 1 : h.star === 2 ? 2.2 : 4) / 2)); }
function sellHeld() { if (!run.held) return; run.gold += heldSellValue(); run.held = null; sfx("buy"); }
function rotateHeld() {}
function reroll() {
  const c = 1 + run.rerolls;
  if (run.gold < c) { sfx("err"); return say("お金が足りない"); }
  run.gold -= c; const g = run.gold, r = run.rerolls + 1; rollShop(); run.rerolls = r; sfx("place");
}

// ---------- 戦闘 ----------
function cellCenter(it) { const [w, h] = itemSize(it); return [GX + (it.x + w / 2) * CELL, GY + (it.y + h / 2) * CELL]; }
function makeSide(kind) {
  return { kind, hp: 1, maxHp: 1, blk: 0, burn: 0, psn: 0, psnT: 0, items: [], x: kind === "hero" ? 90 : 270, y: 200, lunge: 0, hit: 0, dead: 0, tick: 0 };
}
function startBattle() {
  if (run.held) return say("先に手のアイテムを置こう");
  const hd = HERO_DEFS[run.hero], sd = STAGES[run.stage - 1];
  const hs = makeSide("hero"); hs.maxHp = hs.hp = hd.hp; hs.spr = run.hero; hs.name = hd.n;
  hs.items = run.items.map(it => {
    const d = ITEMS[it.id], m = STARM[it.star], [w, h] = itemSize(it), [cx, cy] = cellCenter(it);
    return { def: d, inst: it, star: it.star, x: it.x, y: it.y, w, h, cx, cy, cd: d.cd || 0, cdMul: 1, t: Math.random() * 0.4,
      atk: (d.atk || 0) * m, blk: (d.blk || 0) * m, heal: (d.heal || 0) * m, burn: (d.burn || 0) * m, psn: (d.psn || 0) * m, flash: 0 };
  });
  // 隣接効果
  for (const a of hs.items) {
    if (!a.def.aura) continue;
    const au = a.def.aura, m = STARM[a.star];
    for (const b of hs.items) {
      if (a === b) continue;
      let adj = false;
      for (let i = 0; i < a.w && !adj; i++) for (let j = 0; j < a.h && !adj; j++) for (let k = 0; k < b.w && !adj; k++) for (let l = 0; l < b.h && !adj; l++)
        if (Math.abs(a.x + i - b.x - k) + Math.abs(a.y + j - b.y - l) === 1) adj = true;
      if (!adj) continue;
      if (au.tag && !b.def.tags.includes(au.tag)) continue;
      if (au.atk && b.atk > 0) b.atk += au.atk * m;
      if (au.cdMul) b.cdMul *= au.cdMul;
      b.buffed = 1;
    }
  }
  const es = makeSide("enemy"); es.maxHp = es.hp = Math.round(sd.hp * scaleHp(run.stage)); es.spr = sd.s; es.name = sd.n; es.boss = sd.boss;
  es.items = sd.it.map(o => ({ def: { id: o.ic }, atk: (o.atk || 0) * scaleDmg(run.stage), blk: o.blk || 0, heal: o.heal || 0, burn: (o.burn || 0) * scaleDmg(run.stage), psn: (o.psn || 0) * scaleDmg(run.stage), cd: o.cd, cdMul: 1, t: Math.random() * 1.2, flash: 0, ic: o.ic }));
  battle = { hero: hs, enemy: es, time: 0, speed: 1, over: 0, win: false, fade: 0, sudden: 0 };
  FX.parts.length = FX.texts.length = FX.projs.length = FX.rings.length = FX.slashes.length = 0;
  run.phase = "battle"; sfx("big");
}
function ftext(x, y, s, col, size = 14) { FX.texts.push({ x, y, s: String(s), col, life: 0.9, size }); }
function burst(x, y, n, cols, sp = 70, g = 120) { for (let i = 0; i < n; i++) { const a = rand(0, 6.283), v = rand(sp * 0.3, sp); FX.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g, life: rand(0.25, 0.6), max: 0.6, col: pick(cols), s: pick([2, 2, 4]) }); } }
function ring(x, y, col) { FX.rings.push({ x, y, t: 0, col }); }

function dealDmg(src, dst, n, big) {
  n = Math.round(n * (1 + battle.sudden * 0.0));
  const absorbed = Math.min(dst.blk, n); dst.blk -= absorbed; const real = n - absorbed;
  dst.hp = Math.max(0, dst.hp - real); dst.hit = 0.14;
  const px = dst.x + (dst.kind === "hero" ? 0 : 0), py = dst.y - 60;
  if (absorbed) { ftext(px - 14, py + 6, absorbed, "#7fb7ff", 12); ring(px, py + 20, "#7fb7ff"); sfx("block"); }
  if (real) ftext(px + (absorbed ? 12 : 0), py, real, dst.kind === "hero" ? "#ff6b6b" : "#ffffff", real >= 10 ? 20 : 16);
  FX.slashes.push({ x: px, y: py + 10, t: 0, flip: dst.kind === "hero" });
  burst(px, py + 10, real >= 10 ? 14 : 8, ["#ffffff", "#ffd84d", dst.kind === "hero" ? "#ff6b6b" : "#ffb347"], real >= 10 ? 130 : 80);
  FX.shake = Math.max(FX.shake, real >= 10 ? 6 : 3); sfx(real >= 10 ? "big" : "hit");
}
function applyEffects(it, src, dst) {
  if (it.atk) dealDmg(src, dst, it.atk);
  if (it.burn) { dst.burn += it.burn; burst(dst.x, dst.y - 50, 8, ["#f29a2e", "#ffd84d", "#e0463f"], 50, -80); }
  if (it.psn) { dst.psn += it.psn; burst(dst.x, dst.y - 50, 8, ["#9a5bdc", "#52308f", "#d9a8ff"], 50, -60); }
}
function trigger(src, dst, it) {
  it.flash = 0.3;
  if (it.blk) { src.blk += it.blk; ring(src.x, src.y - 40, "#7fb7ff"); ftext(src.x, src.y - 90, "+" + Math.round(it.blk), "#7fb7ff", 14); sfx("block"); }
  if (it.heal) { src.hp = Math.min(src.maxHp, src.hp + it.heal); ftext(src.x + 16, src.y - 90, "+" + Math.round(it.heal), "#7ede5a", 14); sfx("heal");
    for (let i = 0; i < 6; i++) FX.parts.push({ x: src.x + rand(-24, 24), y: src.y - 20, vx: 0, vy: -rand(20, 50), g: 0, life: 0.7, max: 0.7, col: "#7ede5a", s: 4 }); }
  if (it.atk || it.burn || it.psn) {
    src.lunge = 0.22;
    const sx = src.kind === "hero" ? it.cx : src.x, sy = src.kind === "hero" ? it.cy : src.y - 50;
    const icon = it.def.id || it.ic;
    FX.projs.push({ x0: sx, y0: sy, x1: dst.x, y1: dst.y - 50, t: 0, dur: 0.28, icon, it, src, dst, trail: it.burn ? "#f29a2e" : it.psn ? "#9a5bdc" : "#ffffff" });
  }
}
function stepBattle(dt) {
  const b = battle; if (!b) return;
  if (b.over) { b.fade += dt; return; }
  b.time += dt;
  if (b.time > 30) { b.sudden += dt; const k = Math.floor(b.sudden); if (k > (b._sd || 0)) { b._sd = k; for (const s of [b.hero, b.enemy]) { s.hp = Math.max(0, s.hp - 2 * k); s.hit = 0.1; ftext(s.x, s.y - 80, 2 * k, "#c06bff", 14); } } }
  for (const [s, o] of [[b.hero, b.enemy], [b.enemy, b.hero]]) {
    for (const it of s.items) {
      it.flash = Math.max(0, it.flash - dt);
      if (!it.cd) continue;
      it.t += dt;
      const need = it.cd * it.cdMul;
      if (it.t >= need) { it.t -= need; trigger(s, o, it); }
    }
    s.tick += dt;
    if (s.tick >= 1) {
      s.tick -= 1;
      if (s.burn > 0) { s.hp = Math.max(0, s.hp - s.burn); ftext(s.x - 20, s.y - 80, Math.round(s.burn), "#ff9d3a", 12); s.hit = 0.08; s.burn = Math.max(0, s.burn - 1); }
      if (s.psn > 0) { s.hp = Math.max(0, s.hp - s.psn); ftext(s.x + 20, s.y - 80, Math.round(s.psn), "#c06bff", 12); s.hit = 0.08; s.psnT++; if (s.psnT % 4 === 0) s.psn = Math.max(0, s.psn - 1); }
    }
  }
  if (b.enemy.hp <= 0 || b.hero.hp <= 0) {
    b.over = 1; b.win = b.enemy.hp <= 0; b.dead = b.win ? b.enemy : b.hero; b.dead.dead = 0.001;
    burst(b.dead.x, b.dead.y - 50, 30, ["#ffffff", "#ffd84d", "#ff93b8"], 160); FX.shake = 8;
    sfx(b.win ? "win" : "lose");
    if (b.win) { b.income = 7 + Math.floor(run.stage / 2) + (STAGES[run.stage - 1].boss ? 4 : 0); }
  }
}
function stepFX(dt) {
  for (const p of FX.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
  FX.parts = FX.parts.filter(p => p.life > 0);
  for (const t of FX.texts) { t.y -= 26 * dt; t.life -= dt; }
  FX.texts = FX.texts.filter(t => t.life > 0);
  for (const r of FX.rings) r.t += dt; FX.rings = FX.rings.filter(r => r.t < 0.35);
  for (const s of FX.slashes) s.t += dt; FX.slashes = FX.slashes.filter(s => s.t < 0.2);
  FX.shake = Math.max(0, FX.shake - 30 * dt);
  for (const l of FX.leaves) { l.y += l.v * dt; l.x -= l.v * 0.8 * dt; l.s += dt * 2; if (l.y > 240 || l.x < -4) { l.y = -4; l.x = rand(0, W + 60); } }
}
function stepProj(dt) {
  const b = battle;
  for (const p of FX.projs) {
    p.t += dt;
    if (Math.random() < 0.8) FX.parts.push({ x: p.x0 + (p.x1 - p.x0) * (p.t / p.dur), y: p.y0 + (p.y1 - p.y0) * (p.t / p.dur) - Math.sin(Math.PI * p.t / p.dur) * 24, vx: 0, vy: 0, g: 0, life: 0.2, max: 0.2, col: p.trail, s: 2 });
    if (p.t >= p.dur) { p.done = 1; if (b && !b.over) applyEffects(p.it, p.src, p.dst); }
  }
  FX.projs = FX.projs.filter(p => !p.done);
}

// ---------- 戦闘後 ----------
function afterBattle() {
  const b = battle;
  if (b.win) {
    run.gold += b.income;
    if (run.stage >= STAGES.length) return endRun(true);
    run.phase = "result";
  } else {
    run.lives--; if (run.lives <= 0) return endRun(false);
    run.phase = "result";
  }
}
function nextStage() { if (run.stage < STAGES.length) run.stage++; battle = null; run.phase = "shop"; rollShop(); }
function endRun(victory) {
  const reached = run.stage - (victory ? 0 : 1);
  const coins = reached * 4 + (victory ? 40 : 0);
  save.coins += coins; save.best = Math.max(save.best, victory ? 12 : reached); persist();
  run.phase = "end"; run.victory = victory; run.coins = coins;
}

// ===================== 描画 =====================
function drawChar(s, t) {
  const bob = Math.round(Math.sin(t * 3 + (s.kind === "hero" ? 0 : 1.5)) * 1) * 2;
  const dir = s.kind === "hero" ? 1 : -1;
  const lunge = s.lunge > 0 ? Math.sin((s.lunge / 0.22) * Math.PI) * 18 * dir : 0;
  const sp = spr(s.spr), sc = 1;
  const w = sp.W * sc, h = sp.H * sc;
  let ox = lunge, oy = bob, alpha = 1;
  if (s.dead) { alpha = clamp(1 - s.dead / 0.8, 0, 1); oy += s.dead * 30; }
  const x = s.x - w / 2 + ox, y = s.y - h + 8 + oy;
  // 影
  ctx.globalAlpha = 0.35; rect(s.x - 36, s.y - 4, 72, 6, "#000"); ctx.globalAlpha = 1;
  blit(sp, x, y, { scale: sc, alpha });
  if (s.hit > 0 && !s.dead) blit(sp, x, y, { scale: sc, white: true, alpha: 0.85 });
}
function drawBars(s, y) {
  const w = 132, x = s.x - w / 2;
  rect(x - 2, y - 2, w + 4, 16, "#0d0818");
  rect(x, y, w, 12, "#3a1020");
  rect(x, y, Math.round(w * s.hp / s.maxHp), 12, "#e0463f");
  rect(x, y, Math.round(w * s.hp / s.maxHp), 3, "#ff8a7a");
  txt(`${Math.ceil(s.hp)}`, x + w / 2, y + 7, { size: 12, align: "center", outline: "#000" });
  let ix = x;
  if (s.blk > 0) { blit(spr("shield"), ix, y + 18); txt(String(Math.round(s.blk)), ix + 18, y + 25, { size: 12, color: "#9fcbff", outline: "#000" }); ix += 44; }
  if (s.burn > 0) { blit(spr("flame"), ix, y + 18); txt(String(Math.round(s.burn)), ix + 18, y + 25, { size: 12, color: "#ffb347", outline: "#000" }); ix += 44; }
  if (s.psn > 0) { blit(spr("drop"), ix, y + 18); txt(String(Math.round(s.psn)), ix + 18, y + 25, { size: 12, color: "#d9a8ff", outline: "#000" }); }
}
function drawArena(t) {
  if (!BG) makeBG();
  ctx.drawImage(BG, 0, 0);
  for (const l of FX.leaves) { rect(l.x, l.y, 4, 2, Math.floor(l.s) % 2 ? "#e0803a" : "#b8601d"); }
}
function drawFXLayer(t) {
  for (const r of FX.rings) { const rr = 10 + r.t / 0.35 * 34; ctx.globalAlpha = 1 - r.t / 0.35; for (let a = 0; a < 6.283; a += 0.22) rect(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, 4, 4, r.col); ctx.globalAlpha = 1; }
  for (const p of FX.projs) {
    const f = p.t / p.dur, x = p.x0 + (p.x1 - p.x0) * f, y = p.y0 + (p.y1 - p.y0) * f - Math.sin(Math.PI * f) * 24;
    blitC(p.icon, x, y, { scale: iconFit(p.icon) });
  }
  for (const s of FX.slashes) {
    const f = s.t / 0.2, n = Math.floor(f * 8) + 1;
    for (let i = 0; i < n; i++) { const d = i * 6 - 24; rect(s.x + (s.flip ? -d : d) - 2, s.y + d - 2, 6, 6, "#fff"); rect(s.x + (s.flip ? -d : d) - 8, s.y + d - 2, 4, 4, "#ffd84d"); }
  }
  for (const p of FX.parts) { ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); rect(p.x, p.y, p.s, p.s, p.col); } ctx.globalAlpha = 1;
  for (const t of FX.texts) txt(t.s, t.x, t.y, { size: t.size, align: "center", color: t.col, outline: "#000" });
}

function drawItemTile(id, star, x, y, w, h, o = {}) {
  const d = ITEMS[id], pw = w * CELL, ph = h * CELL;
  rect(x, y, pw, ph, "#0d0818");
  rect(x + 1, y + 1, pw - 2, ph - 2, TIERCOL[d.tier]);
  rect(x + 2, y + 2, pw - 4, ph - 4, o.bad ? "#5a2030" : o.good ? "#27503a" : "#2e2552");
  blitC(id, x + pw / 2, y + ph / 2, { alpha: o.alpha ?? 1 });
  if (star > 1) for (let i = 0; i < star - 1; i++) blit(spr("star"), x + pw - 16 - i * 12, y + ph - 16);
  if (o.buff) rect(x + 4, y + 4, 4, 4, "#7ede5a");
}
function drawGridBase() {
  panel(8, GY - 10, 344, GH * CELL + 20);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    rect(GX + i * CELL, GY + j * CELL, CELL, CELL, "#120b26");
    rect(GX + i * CELL + 1, GY + j * CELL + 1, CELL - 2, CELL - 2, (i + j) % 2 ? "#221945" : "#1d1540");
  }
}
function drawRunHeader() {
  rect(0, 0, W, 28, "#0d0818"); rect(0, 28, W, 2, "#4a3a85");
  const sd = STAGES[Math.min(run.stage, STAGES.length) - 1];
  txt(`百鬼の森  ${run.stage}/${STAGES.length}`, W / 2, 14, { size: 14, align: "center" });
  for (let i = 0; i < 3; i++) { const s = spr("heart"); blit(s, W - 56 + i * 16, 8, { alpha: i < run.lives ? 1 : 0.2 }); }
  blit(spr("coin"), 8, 7); txt(String(run.gold), 26, 15, { size: 14, color: "#ffd84d" });
  if (sd.boss) txt("BOSS", 60, 15, { size: 12, color: "#ff6b6b" });
}

function drawRun(dt) {
  const t = performance.now() / 1000;
  const sh = FX.shake > 0 ? [Math.round(rand(-1, 1) * FX.shake / 2) * 2, Math.round(rand(-1, 1) * FX.shake / 2) * 2] : [0, 0];
  ctx.save(); ctx.translate(sh[0], sh[1]);
  drawArena(t);
  const b = battle, sd = STAGES[run.stage - 1];
  const heroS = b ? b.hero : { kind: "hero", x: 90, y: 200, spr: run.hero, lunge: 0, hit: 0, hp: HERO_DEFS[run.hero].hp, maxHp: HERO_DEFS[run.hero].hp, blk: 0, burn: 0, psn: 0 };
  const enS = b ? b.enemy : { kind: "enemy", x: 270, y: 200, spr: sd.s, boss: sd.boss, lunge: 0, hit: 0, hp: sd.hp, maxHp: sd.hp, blk: 0, burn: 0, psn: 0, items: sd.it.map(o => ({ cd: o.cd, t: 0 })) };
  drawChar(heroS, t); drawChar(enS, t);
  drawFXLayer(t);
  ctx.restore();
  // 名前
  txt(HERO_DEFS[run.hero].n, 90, 207, { size: 12, align: "center", outline: "#000" });
  txt(sd.n, 270, 207, { size: 12, align: "center", outline: "#000", color: sd.boss ? "#ff9d9d" : "#fff" });
  drawBars(heroS, 217); drawBars(enS, 217);
  if (b) for (let i = 0; i < enS.items.length; i++) { const it = enS.items[i]; const f = clamp(it.t / (it.cd * it.cdMul), 0, 1); rect(270 - 66 + i * 34, 245, 30, 4, "#0d0818"); rect(270 - 66 + i * 34 + 1, 246, Math.round(28 * f), 2, it.atk ? "#ffd84d" : it.blk ? "#7fb7ff" : it.heal ? "#7ede5a" : "#c06bff"); }
  else for (let i = 0; i < sd.it.length; i++) { const o = sd.it[i]; blitC(o.ic, 270 - 40 + i * 30, 244, { scale: 0.5, alpha: 0.95 }); }
  drawRunHeader();

  // バックパック
  drawGridBase();
  const items = b ? b.hero.items : run.items;
  for (const it of items) {
    const def = b ? it.def : ITEMS[it.id], star = it.star, ix = b ? it.x : it.x, iy = b ? it.y : it.y;
    const [w, h] = b ? [it.w, it.h] : itemSize(it);
    const px = GX + ix * CELL, py = GY + iy * CELL;
    const id = def.id;
    drawItemTile(id, star, px, py, w, h, { buff: b && it.buffed });
    if (b && it.cd) { const f = clamp(it.t / (it.cd * it.cdMul), 0, 1); ctx.globalAlpha = 0.55; rect(px + 2, py + 2, w * CELL - 4, Math.round((h * CELL - 4) * (1 - f)), "#000"); ctx.globalAlpha = 1; }
    if (b && it.flash > 0) { ctx.globalAlpha = it.flash / 0.3 * 0.8; rect(px + 2, py + 2, w * CELL - 4, h * CELL - 4, "#fff"); ctx.globalAlpha = 1; }
    if (!b) tap(px, py, w * CELL, h * CELL, null); // 実際のタップはセル単位
  }
  if (!b) {
    // セルタップ + 手持ちゴースト
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) tap(GX + i * CELL, GY + j * CELL, CELL, CELL, () => tapGrid(i, j));
    if (run.held) {
      const h = run.held, [w, hh] = itemSize(h);
      const gx = Math.floor((mouse.x - GX) / CELL), gy = Math.floor((mouse.y - GY) / CELL);
      if (gx >= 0 && gy >= 0 && gx < GW && gy < GH) {
        const at = itemAt(gx, gy);
        const x = clamp(gx, 0, GW - w), y = clamp(gy, 0, GH - hh);
        const ok = at ? (at.id === h.id || findRecipe(at.id, h.id)) : cellsFree(run.items, h.id, h.rot, x, y);
        ctx.globalAlpha = 0.75; drawItemTile(h.id, h.star, GX + (at ? at.x : x) * CELL, GY + (at ? at.y : y) * CELL, at ? itemSize(at)[0] : w, at ? itemSize(at)[1] : hh, { good: ok, bad: !ok }); ctx.globalAlpha = 1;
      }
    }
  }
  // 右カラム
  const rx = GX + GW * CELL + 10;
  if (!b && run.phase === "shop") {
    txt("持ち物", rx + 33, GY + 6, { size: 12, align: "center", color: "#b9a8f0" });
    rect(rx, GY + 16, 66, 80, "#120b26");
    if (run.held) { blitC(run.held.id, rx + 33, GY + 56, { scale: 1 }); if (run.held.star > 1) txt("★" + run.held.star, rx + 33, GY + 88, { size: 10, align: "center", color: "#ffd84d" }); }
    else txt("空", rx + 33, GY + 56, { size: 12, align: "center", color: "#443a70" });
    button(rx, GY + 104, 62, 40, run.held ? (run.held.from === "shop" ? "戻す" : "売る") : "売る", sellHeld, { size: 14, disabled: !run.held, fill: "#5a2030", edge: "#e0463f", hot: "#8a3040" });
    if (run.held) txt("+" + heldSellValue() + " 小判", rx + 33, GY + 158, { size: 12, align: "center", color: "#ffd84d" });
  }

  // 情報パネル
  const infoY = GY + GH * CELL + 16;
  panel(8, infoY, 344, 46);
  if (b) {
    txt(`経過 ${Math.floor(b.time)}秒${b.time > 30 ? "  ⚠ 暴走中" : ""}`, 16, infoY + 14, { size: 12, color: "#b9a8f0" });
    txt(b.time > 30 ? "時間切れで双方がダメージを受ける!" : "30秒で決着しないと危険…", 16, infoY + 32, { size: 12, color: "#8c80b8" });
    const bx = 360 - 8 - 3 * 34;
    [["⏸", 0], ["▶", 1], ["▶▶", 2]].forEach(([l, v], i) => {
      const act = (v === 0 && b.speed === 0) || (v === 1 && b.speed === 1) || (v === 2 && b.speed === 2);
      button(bx + i * 34 - 4, infoY + 10, 30, 26, l, () => { b.speed = v; }, { size: 12, fill: act ? "#8a5a1c" : "#2a1f4d", edge: act ? "#ffd84d" : "#7a5bd6" });
    });
  } else {
    let id = null, star = 1, price = null;
    if (run.held) { id = run.held.id; star = run.held.star; }
    else if (run.sel >= 0 && run.shop[run.sel]) { id = run.shop[run.sel].id; price = ITEMS[id].cost; }
    if (run.msgT > 0) { txt(run.msg, 180, infoY + 23, { size: 14, align: "center", color: "#ffd84d" }); }
    else if (id) {
      const d = ITEMS[id];
      txt(d.n + (star > 1 ? ` ★${star}` : ""), 16, infoY + 12, { size: 14, color: ["", "#cfc9f5", "#8fb2ff", "#ffcf6a"][d.tier] });
      if (price === null) txt(`${d.w}x${d.h}`, 340, infoY + 12, { size: 12, align: "right", color: "#8c80b8" });
      const lines = wrap(itemDesc(d, star), 320); lines.slice(0, 2).forEach((l, i) => txt(l, 16, infoY + 28 + i * 14, { size: 12, color: "#ddd" }));
      if (price !== null) txt("もう一度タップで購入", 340, infoY + 12, { size: 12, align: "right", color: "#ffd84d" });
      const rcs = RECIPES.filter(r => r.a === id || r.b === id);
      if (rcs.length && !lines[1]) txt("合体: " + rcs.map(r => ITEMS[r.a === id ? r.b : r.a].n + "→" + ITEMS[r.r].n).join(" / "), 16, infoY + 42, { size: 10, color: "#ffb0d0" });
    } else txt("買ってバックパックに置こう。隣り合わせで効果アップ!", 180, infoY + 23, { size: 12, align: "center", color: "#8c80b8" });
  }

  // ショップ / ボタン
  if (!b && run.phase === "shop") {
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 86, y = infoY + 54, sl = run.shop[i];
      panel(x, y, 82, 84, { fill: run.sel === i ? "#3a2f6a" : "#241a46", edge: run.sel === i ? "#ffd84d" : "#5a4a9c" });
      if (sl) {
        const d = ITEMS[sl.id];
        blitC(sl.id, x + 41, y + 38, { scale: 1 });
        blit(spr("coin"), x + 26, y + 73); txt(String(d.cost), x + 44, y + 77, { size: 12, color: run.gold >= d.cost ? "#ffd84d" : "#ff6b6b" });
        tap(x, y, 82, 84, () => tapShop(i));
      } else txt("SOLD", x + 41, y + 42, { size: 12, align: "center", color: "#554" });
    }
    const by = infoY + 54 + 84 + 6;
    button(10, by, 100, 26, `リロール ${1 + run.rerolls}`, reroll, { size: 12, fill: "#2a4d7a", edge: "#4a7be8", hot: "#3a6aa8" });
    button(120, by, 230, 26, "戦闘開始!", startBattle, { size: 16 });
  }
  if (run.msgT > 0) run.msgT -= dt;

  // 結果オーバーレイ
  if (b && b.over && b.fade > 1.0) {
    ctx.globalAlpha = 0.7; rect(0, 30, W, 220, "#000"); ctx.globalAlpha = 1;
    txt(b.win ? "勝利!" : "敗北…", W / 2, 90, { size: 32, align: "center", color: b.win ? "#ffd84d" : "#ff6b6b" });
    if (b.win) { txt(`+${b.income} 小判`, W / 2, 135, { size: 16, align: "center", color: "#ffd84d" }); }
    else txt(`残機 ${run.lives - 1}`, W / 2, 135, { size: 16, align: "center", color: "#ff9d9d" });
    button(110, 170, 140, 36, "つぎへ", () => { afterBattle(); }, { size: 16 });
  }
  if (run.phase === "result") { nextStage(); }
  if (run.phase === "end") drawRunEnd();
}
function drawRunEnd() {
  ctx.globalAlpha = 0.85; rect(0, 0, W, H, "#000"); ctx.globalAlpha = 1;
  txt(run.victory ? "百鬼夜行を制した!" : "力尽きた…", W / 2, 140, { size: 26, align: "center", color: run.victory ? "#ffd84d" : "#ff6b6b" });
  blitC(run.hero, W / 2, 250, { scale: 1 });
  txt(`到達: ${Math.min(run.stage, 12)} / 12`, W / 2, 340, { size: 16, align: "center" });
  txt(`獲得コイン  +${run.coins}`, W / 2, 372, { size: 16, align: "center", color: "#ffd84d" });
  txt(`所持コイン ${save.coins}`, W / 2, 400, { size: 14, align: "center", color: "#b9a8f0" });
  button(100, 450, 160, 40, "タイトルへ", () => { run = null; battle = null; setScene("title"); }, { size: 16 });
}

// ---------- タイトル ----------
const UPG_COST = () => 20 + save.startGold * 20;
function drawTitle(dt) {
  titleT += dt; const t = titleT;
  drawArena(t);
  rect(0, 250, W, H - 250, "#120b26");
  for (let i = 0; i < 6; i++) rect(0, 250 + i * 2, W, 2, ["#2a1f4d", "#251b47", "#201740", "#1a1236", "#150e2e", "#120b26"][i]);
  const hs = ["miko", "onmyoji", "ronin"];
  hs.forEach((h, i) => { const s = spr(h); blit(s, 60 + i * 120 - s.W / 2, 214 - s.H + 8 + Math.round(Math.sin(t * 3 + i) * 1) * 2); });
  txt("百鬼夜行", W / 2, 44, { size: 40, align: "center", color: "#ffd84d", outline: "#52308f" });
  txt("パ ッ ク", W / 2, 84, { size: 26, align: "center", color: "#ff93b8", outline: "#52308f" });
  blit(spr("coin"), 12, 262); txt(String(save.coins), 30, 270, { size: 14, color: "#ffd84d" });
  txt(`最高到達 ${save.best}/12`, 348, 270, { size: 12, align: "right", color: "#b9a8f0" });
  button(70, 296, 220, 48, "ゲームスタート", () => { sfx("buy"); setScene("hero"); }, { size: 20 });
  button(70, 356, 220, 36, "妖怪図鑑", () => { setScene("codex"); codexSel = null; }, { size: 16, fill: "#2a4d7a", edge: "#4a7be8", hot: "#3a6aa8" });
  const c = UPG_COST();
  button(70, 404, 220, 36, `開始小判 +1  (${c}コイン)`, () => { if (save.coins >= c) { save.coins -= c; save.startGold++; persist(); sfx("buy"); } else sfx("err"); }, { size: 12, fill: "#2c4a2c", edge: "#7ede5a", hot: "#3c6a3c", disabled: save.coins < c });
  txt(`現在の開始小判: ${10 + save.startGold}`, W / 2, 452, { size: 12, align: "center", color: "#8c80b8" });
  txt("買う → 置く → 合体 → 戦闘。12連戦を生き延びろ!", W / 2, 520, { size: 12, align: "center", color: "#8c80b8" });
  txt("同じ物を重ねると★強化 / 組み合わせで合体", W / 2, 540, { size: 12, align: "center", color: "#8c80b8" });
}
function drawHeroSel() {
  drawArena(performance.now() / 1000);
  rect(0, 250, W, H - 250, "#120b26");
  txt("ヒーローを選ぼう", W / 2, 24, { size: 18, align: "center" });
  const hs = Object.keys(HERO_DEFS);
  hs.forEach((id, i) => {
    const hd = HERO_DEFS[id], x = 10 + i * 116, y = 262, open = save.unlocked[id];
    panel(x, y, 110, 290, { fill: open ? "#241a46" : "#1a1630" });
    blitC(id, x + 55, y + 74, { alpha: open ? 1 : 0.35 });
    txt(hd.n, x + 55, y + 156, { size: 16, align: "center" });
    txt(`HP ${hd.hp}`, x + 55, y + 176, { size: 12, align: "center", color: "#ff8a7a" });
    wrap(hd.desc, 96).forEach((l, k) => txt(l, x + 55, y + 196 + k * 14, { size: 12, align: "center", color: "#b9a8f0" }));
    hd.start.forEach(([iid], k) => blitC(iid, x + 33 + k * 44, y + 238, { scale: iconFit(iid) }));
    if (open) tap(x, y, 110, 290, () => startRun(id));
    else button(x + 10, y + 264, 90, 20, `${hd.cost}コイン`, () => { if (save.coins >= hd.cost) { save.coins -= hd.cost; save.unlocked[id] = 1; persist(); sfx("buy"); } else sfx("err"); }, { size: 12, disabled: save.coins < hd.cost });
  });
  button(130, 580, 100, 32, "戻る", () => setScene("title"), { size: 14, fill: "#2a1f4d", edge: "#7a5bd6" });
}
function drawCodex() {
  rect(0, 0, W, H, "#120b26");
  txt("妖怪図鑑", W / 2, 24, { size: 18, align: "center" });
  const all = Object.keys(ITEMS); const seen = all.filter(i => save.seenItems[i]).length;
  txt(`発見 ${seen}/${all.length}   合体 ${Object.keys(save.seenRecipes).length}/${RECIPES.length}`, W / 2, 48, { size: 12, align: "center", color: "#b9a8f0" });
  all.forEach((id, i) => {
    const x = 16 + (i % 8) * 42, y = 70 + Math.floor(i / 8) * 42, d = ITEMS[id], k = save.seenItems[id];
    rect(x, y, 38, 38, "#0d0818"); rect(x + 1, y + 1, 36, 36, k ? TIERCOL[d.tier] : "#333"); rect(x + 2, y + 2, 34, 34, "#2e2552");
    if (k) blitC(id, x + 19, y + 19, { scale: iconFit(id) }); else txt("?", x + 19, y + 20, { size: 16, align: "center", color: "#555" });
    tap(x, y, 38, 38, () => { codexSel = id; });
  });
  panel(10, 202, 340, 74);
  if (codexSel && save.seenItems[codexSel]) {
    const d = ITEMS[codexSel]; txt(d.n, 18, 218, { size: 14 }); txt(`${d.w}x${d.h}  ★${d.tier}`, 342, 218, { size: 12, align: "right", color: "#8c80b8" });
    wrap(itemDesc(d), 320).slice(0, 2).forEach((l, i) => txt(l, 18, 238 + i * 14, { size: 12, color: "#ddd" }));
    if (d.fusion) txt("合体専用アイテム", 18, 266, { size: 10, color: "#ffb0d0" });
  } else txt("アイテムを選ぶと詳細が見られる", 180, 239, { size: 12, align: "center", color: "#8c80b8" });
  txt("合体レシピ", 18, 296, { size: 14, color: "#ffb0d0" });
  RECIPES.forEach((r, i) => {
    const y = 312 + i * 48, k = save.seenRecipes[r.r];
    panel(10, y, 340, 42, { fill: "#1d1540" });
    blitC(r.a, 36, y + 21, { scale: iconFit(r.a) }); txt("+", 66, y + 22, { size: 16, align: "center" }); blitC(r.b, 96, y + 21, { scale: iconFit(r.b) }); txt("→", 130, y + 22, { size: 16, align: "center" });
    if (k) { blitC(r.r, 164, y + 21, { scale: iconFit(r.r) }); txt(ITEMS[r.r].n, 190, y + 22, { size: 14 }); } else txt("？？？", 164, y + 20, { size: 14, color: "#666" });
  });
  button(130, 596, 100, 32, "戻る", () => setScene("title"), { size: 14, fill: "#2a1f4d", edge: "#7a5bd6" });
}

// ---------- メインループ ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ui.length = 0;
  ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (scene === "run" && run) {
    if (battle) {
      const sp = battle.speed;
      if (sp > 0) { const n = sp; for (let i = 0; i < n; i++) { stepBattle(dt); stepProj(dt); } }
      for (const s of [battle.hero, battle.enemy]) { s.lunge = Math.max(0, s.lunge - dt); s.hit = Math.max(0, s.hit - dt); if (s.dead) s.dead += dt; }
    }
    stepFX(dt);
    drawRun(dt);
  } else {
    stepFX(dt);
    if (scene === "title") drawTitle(dt); else if (scene === "hero") drawHeroSel(); else if (scene === "codex") drawCodex();
  }
  requestAnimationFrame(frame);
}
function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
cv.addEventListener("pointermove", e => { mouse = toLogical(e); });
cv.addEventListener("pointerdown", e => {
  mouse = toLogical(e);
  for (let i = ui.length - 1; i >= 0; i--) { const u = ui[i]; if (u.fn && mouse.x >= u.x && mouse.x < u.x + u.w && mouse.y >= u.y && mouse.y < u.y + u.h) { u.fn(); break; } }
});
requestAnimationFrame(frame);

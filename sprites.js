"use strict";
// ===== ドット絵ジェネレータ =====
// 図形で描いてから、自動で陰影(左上=ハイライト/右下=影)と縁取りを付ける。
const PAL = {
  k:"#1a1428", w:"#f6f1e7", g:"#a3a8bd", G:"#5b6078",
  r:"#e0463f", R:"#8e2338", o:"#f29a2e", O:"#b8601d",
  y:"#ffd84d", Y:"#b88a22", b:"#4a7be8", B:"#233f94",
  c:"#86e0ee", C:"#3b9bb5", p:"#9a5bdc", P:"#52308f",
  n:"#946238", N:"#5d3a22", l:"#7ede5a", L:"#2f8a3c",
  s:"#f8d2ae", S:"#c98d6a", m:"#ff93b8", t:"#e9dfc3", T:"#b9ad8a",
  h:"#2c2b52", H:"#4a4880",
};
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbHex = a => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
// amt>0: 白へ, amt<0: 黒へ
function adj(hex, amt) { const c = hexRgb(hex); return rgbHex(c.map(v => amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))); }
const pc = k => PAL[k] || k;

class Grid {
  constructor(w, h, s = 1) {
    this.s = s; this.w = Math.round(w * s); this.h = Math.round(h * s);
    this.c = Array.from({ length: this.h }, () => Array(this.w).fill(null));
    this.p = Array.from({ length: this.h }, () => Array(this.w).fill(false));
  }
  _set(px, py, col, prot) { if (px >= 0 && py >= 0 && px < this.w && py < this.h) { this.c[py][px] = col; this.p[py][px] = !!prot; } }
  rect(x, y, w, h, k, prot) {
    const s = this.s, col = k && pc(k), x0 = Math.round(x * s), x1 = Math.max(x0 + 1, Math.round((x + w) * s)), y0 = Math.round(y * s), y1 = Math.max(y0 + 1, Math.round((y + h) * s));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this._set(i, j, col, prot);
  }
  put(x, y, k, prot) { this.rect(x, y, 1, 1, k, prot); }
  erase(x, y, w, h) { this.rect(x, y, w, h, null); }
  ell(cx, cy, rx, ry, k, prot) {
    const s = this.s, col = pc(k);
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const dx = ((i + 0.5) / s - cx) / rx, dy = ((j + 0.5) / s - cy) / ry;
      if (dx * dx + dy * dy <= 1) this._set(i, j, col, prot);
    }
  }
  lineT(x0, y0, x1, y1, t, k, prot, over) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
      if (over) { const px = Math.round(x * this.s), py = Math.round(y * this.s); if (this.c[py] && this.c[py][px]) this._set(px, py, pc(k), prot); }
      else this.rect(x - t / 2 + 0.5, y - t / 2 + 0.5, t, t, k, prot);
    }
  }
  // 先細りの角/耳/葉っぱ (y0 の幅 w0 から y1 の先端へ)
  horn(x0, y0, x1, y1, w0, k, prot) {
    const dir = y1 < y0 ? -1 : 1, n = Math.abs(y1 - y0);
    for (let i = 0; i <= n; i++) {
      const f = i / n, y = y0 + dir * i, xc = x0 + (x1 - x0) * f, w = Math.max(1, Math.round(w0 * (1 - f)));
      this.rect(Math.round(xc - w / 2), y, w, 1, k, prot);
    }
  }
  tint(x, y, w, h, amt) {
    const s = this.s;
    for (let j = Math.round(y * s); j < Math.round((y + h) * s); j++) for (let i = Math.round(x * s); i < Math.round((x + w) * s); i++)
      if (this.c[j] && this.c[j][i] && !this.p[j][i]) this.c[j][i] = adj(this.c[j][i], amt);
  }
  eyeD(x, y) { this.rect(x, y, 2, 2, "k", true); this.put(x, y, "w", true); }                 // 暗い目+ハイライト
  eyeW(x, y) { this.rect(x, y, 2, 2, "w", true); this.put(x + 1, y + 1, "k", true); }       // 白目+黒目
  eyeT(x, y, h = 4) { this.rect(x, y, 2, h, "k", true); this.put(x, y, "w", true); }
}

const OUTLINE_DARK = -0.72;
function renderGrid(g, opt = {}) {
  const PXs = opt.px || 2, fx = opt.fx !== false;
  const w = g.w, h = g.h, out = g.c.map(r => r.slice());
  if (fx) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = g.c[j][i]; if (!c || g.p[j][i]) continue;
    const e = (x, y) => !(g.c[y] && g.c[y][x]);
    const lo = e(i, j + 1) || e(i + 1, j), hi = e(i, j - 1) || e(i - 1, j);
    if (lo && !hi) out[j][i] = adj(c, -0.28); else if (hi && !lo) out[j][i] = adj(c, 0.22);
  }
  const mk = white => {
    const cv = document.createElement("canvas");
    cv.width = (w + 2) * PXs; cv.height = (h + 2) * PXs;
    const x = cv.getContext("2d");
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      const c = (out[j] && out[j][i]) || null;
      let col = null;
      if (c) col = white ? "#ffffff" : c;
      else if (opt.outline !== false) {
        const nb = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([a, b]) => out[j + b] && out[j + b][i + a]).find(Boolean);
        if (nb) col = adj(nb, OUTLINE_DARK);
      }
      if (col) { x.fillStyle = col; x.fillRect((i + 1) * PXs, (j + 1) * PXs, PXs, PXs); }
    }
    return cv;
  };
  return { c: mk(false), w: mk(true), W: (w + 2) * PXs, H: (h + 2) * PXs };
}

// ---- HUD用の小アイコン (7x7、文字列) ----
const MINI = {
  heart: [".rr.rr.","rrrrrrr","rwrrrrr",".rrrrr.","..rrr..","...r...","......."],
  coin:  [".yyyyy.","yyyYYyy","yyYyyYy","yyYyyYy","yyYYYyy",".yyyyy.","......."],
  shield:["bbbbbbb","bwbbbbb","bbbbbbb","bbbbbbb",".bbbbb.","..bbb..","...b..."],
  flame: ["...o...","..oo...","..ooo..",".ooyoo.",".oyyyo.",".ooyoo.","..ooo.."],
  drop:  ["...p...","...p...","..ppp..",".ppppp.",".ppwpp.",".ppppp.","..ppp.."],
  star:  ["...y...","...y...","yyyyyyy",".yyyyy.","..yyy..",".yy.yy.","y.....y"],
};
function miniGrid(rows) {
  const g = new Grid(rows[0].length, rows.length);
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") g.put(i, j, ch, true); }));
  return g;
}

// ===== アイテム(付喪神) 16x16 / 16x32 / 32x16 =====
const ITEM_SIZE = {};
const ITEM_ART = {
  // 提灯お化け
  chouchin: { w:1, h:1, P:{ body:"#e0463f", cap:"N" }, f(g, P) {
    g.ell(8, 8, 6.5, 5.7, P.body);
    g.tint(2, 5, 12, 1, -0.3); g.tint(2, 8, 12, 1, -0.3); g.tint(2, 11, 12, 1, -0.3);
    g.rect(4, 2, 8, 2, P.cap); g.rect(5, 13, 6, 2, P.cap); g.rect(7, 0, 2, 2, P.cap);
    g.ell(8, 7.5, 2.7, 2.6, "w", true); g.rect(7, 7, 2, 2, "k", true); g.put(7, 7, "w", true);
    g.rect(7, 10, 2, 3, "m", true); g.put(7, 12, "#ff6f9f", true);
    g.rect(1, 8, 2, 3, P.body); g.rect(13, 8, 2, 3, P.body);
    g.rect(7, 15, 2, 1, "y");
  }},
  // 化け草履
  zouri: { w:1, h:1, P:{ sole:"#d9a566", strap:"#e0463f", extra:false }, f(g, P) {
    g.ell(8, 8, 5.5, 7, P.sole);
    g.lineT(4, 8, 8, 12, 1, P.strap); g.lineT(12, 8, 8, 12, 1, P.strap); g.rect(7, 12, 2, 2, P.strap);
    g.eyeD(5, 3); g.eyeD(9, 3); g.rect(7, 6, 2, 1, "#8a3a3a", true);
    g.rect(4, 14, 3, 2, "N"); g.rect(9, 14, 3, 2, "N");
    if (P.extra) { for (const [x, y, k] of [[1, 4, "o"], [0, 7, "y"], [1, 10, "o"], [14, 4, "o"], [15, 7, "y"], [14, 10, "o"]]) g.rect(x, y, 1, 3, k, true); }
  }},
  // 下駄
  geta: { w:1, h:1, P:{ wood:"#a8723c" }, f(g, P) {
    g.rect(1, 5, 14, 5, P.wood); g.rect(3, 10, 3, 4, "N"); g.rect(10, 10, 3, 4, "N");
    g.lineT(4, 5, 8, 1, 1.4, "r"); g.lineT(12, 5, 8, 1, 1.4, "r");
    g.eyeD(4, 6); g.eyeD(10, 6); g.rect(7, 8, 2, 1, "#8a3a3a", true);
  }},
  // ぶんぶく茶釜
  kama: { w:1, h:1, P:{ body:"#5b6078", lid:"#a3a8bd", tail:"#946238", steam:"w" }, f(g, P) {
    g.ell(13.5, 11, 2.3, 3.4, P.tail); g.tint(12, 9, 4, 1, -0.3); g.tint(12, 12, 4, 1, -0.3);
    g.ell(8, 9.5, 6.5, 5.5, P.body);
    g.rect(0, 8, 3, 2, P.body); g.put(0, 7, P.body);
    g.ell(8, 5, 4.6, 1.8, P.lid); g.rect(7, 2, 2, 2, "n");
    g.ell(5, 3.5, 1.3, 1.3, "n"); g.ell(11, 3.5, 1.3, 1.3, "n");
    g.eyeW(5, 8); g.eyeW(9, 8); g.rect(7, 11, 2, 1, "w", true);
    for (const [x, y] of [[2, 6], [1, 4], [2, 2], [4, 0]]) g.put(x, y, P.steam, true);
  }},
  // 毒壺
  tsubo: { w:1, h:1, P:{ body:"#7a3fc0", poison:"#7ede5a" }, f(g, P) {
    g.ell(8, 9.5, 6.2, 5.6, P.body); g.rect(5, 3, 6, 3, P.body); g.rect(4, 2, 8, 2, adj(pc(P.body), 0.25));
    g.rect(5, 2, 6, 1, P.poison, true);
    g.rect(3, 4, 1, 4, P.poison, true); g.put(3, 8, P.poison, true); g.rect(12, 4, 1, 2, P.poison, true);
    g.eyeW(5, 8); g.eyeW(9, 8); g.rect(6, 11, 4, 1, "k", true); g.put(6, 12, "w", true); g.put(9, 12, "w", true);
  }},
  // ひょうたん小僧
  hyoutan: { w:1, h:1, P:{ body:"#e0a238" }, f(g, P) {
    g.ell(8, 11.3, 5.8, 4.6, P.body); g.ell(8, 5.8, 3.6, 3.4, P.body); g.rect(6, 8, 4, 2, P.body);
    g.rect(7, 0, 2, 2, "n"); g.ell(11, 1.5, 2, 1, "l");
    g.lineT(5, 8.5, 11, 8.5, 1, "r", true);
    g.eyeD(5, 11); g.eyeD(9, 11); g.rect(7, 14, 2, 1, "#8a3a3a", true);
    g.put(4, 13, "#f08a8a", true); g.put(11, 13, "#f08a8a", true);
  }},
  // 古鏡(雲外鏡)
  kagami: { w:1, h:1, P:{ frame:"#ffd84d", glass:"#86e0ee", cloud:false }, f(g, P) {
    g.ell(8, 7, 6.8, 6.8, P.frame); g.ell(8, 7, 5.3, 5.3, P.glass);
    g.lineT(4, 4, 6, 3, 1, "w", true); g.put(4, 5, "w", true);
    g.eyeD(5, 6); g.eyeD(9, 6); g.rect(7, 10, 2, 1, "#8a3a3a", true);
    g.rect(7, 13, 2, 3, "n");
    if (P.cloud) { g.ell(2, 13, 2.5, 1.5, "w"); g.ell(14, 13, 2.5, 1.5, "w"); }
  }},
  // 雷太鼓
  taiko: { w:1, h:1, P:{ ring:"#d94a3a", skin:"#f0e0c0" }, f(g, P) {
    g.lineT(1, 1, 5, 5, 1.6, "n"); g.lineT(15, 1, 11, 5, 1.6, "n");
    g.ell(8, 9, 6.8, 6.5, P.ring); g.ell(8, 9, 5.2, 5, P.skin);
    for (let a = 0; a < 6.283; a += 0.785) g.put(8 + Math.cos(a) * 6.1 - 0.5, 9 + Math.sin(a) * 5.8 - 0.5, "y", true);
    g.eyeD(5, 7); g.eyeD(9, 7); g.rect(6, 11, 4, 1, "#8a3a3a", true);
    g.put(4, 10, "#f08a8a", true); g.put(11, 10, "#f08a8a", true);
  }},
  // 唐傘小僧 (1x2)
  karakasa: { w:1, h:2, P:{ cloth:"#e0463f" }, f(g, P) {
    g.ell(8, 12, 7.6, 11, P.cloth); g.erase(0, 13, 16, 4);
    for (let x = 1; x < 15; x += 3) g.erase(x, 12, 1, 1);
    g.lineT(8, 1, 2, 12, 1, adj(pc(P.cloth), -0.3), false, true); g.lineT(8, 1, 14, 12, 1, adj(pc(P.cloth), -0.3), false, true); g.lineT(8, 1, 8, 12, 1, adj(pc(P.cloth), -0.3), false, true);
    g.ell(8, 7, 3, 3, "w", true); g.rect(7, 6, 2, 3, "k", true); g.put(7, 6, "w", true);
    g.rect(9, 12, 3, 5, "m", true); g.rect(10, 17, 2, 1, "#ff6f9f", true);
    g.rect(7, 13, 2, 11, "n");
    g.rect(7, 24, 2, 4, "#e8c8a0"); g.rect(4, 28, 8, 1, "N"); g.rect(5, 29, 2, 2, "N"); g.rect(9, 29, 2, 2, "N");
  }},
  // 化け刀 (1x2)
  katana: { w:1, h:2, P:{ blade:"#d8dfe8", spine:"#8e98ad", wrap:"#946238", glow:false }, f(g, P) {
    g.horn(8, 5, 8, 0, 4, P.blade); g.rect(5, 5, 6, 16, P.blade); g.rect(10, 5, 1, 16, P.spine); g.rect(7, 5, 1, 16, adj(pc(P.blade), -0.12), true);
    g.eyeW(5, 9); g.eyeW(9, 9); g.rect(7, 13, 2, 1, "k", true);
    g.ell(8, 22, 5.5, 1.6, "y"); g.rect(6, 23, 4, 6, P.wrap);
    for (let y = 23; y < 29; y += 2) g.rect(6, y, 4, 1, adj(pc(P.wrap), -0.35), true);
    g.rect(5, 29, 6, 2, "y");
    if (P.glow) for (const [x, y] of [[3, 6], [2, 12], [13, 8], [14, 14], [4, 18]]) g.put(x, y, "p", true);
  }},
  // 琵琶牧々 (1x2)
  biwa: { w:1, h:2, P:{ body:"#b8683a", plate:"#d89a5a", trim:"#ffd84d" }, f(g, P) {
    g.rect(6, 5, 4, 14, "N"); g.rect(5, 0, 6, 6, P.body);
    for (const y of [1, 3]) { g.put(4, y, P.trim, true); g.put(11, y, P.trim, true); }
    g.lineT(7, 5, 7, 26, 0.6, "w", true); g.lineT(8, 5, 8, 26, 0.6, "g", true);
    g.ell(8, 22, 7, 8.5, P.body); g.ell(8, 22, 5.3, 6.8, P.plate);
    g.rect(5, 26, 6, 1, P.trim, true);
    g.eyeD(5, 19); g.eyeD(9, 19); g.put(4, 22, "#f08a8a", true); g.put(11, 22, "#f08a8a", true);
  }},
  // 筆の付喪神 (1x2)
  fude: { w:1, h:2, P:{ handle:"#7ab04a", tip:"#2a2236" }, f(g, P) {
    g.rect(7, 1, 2, 16, P.handle); g.tint(7, 5, 2, 1, -0.3); g.tint(7, 10, 2, 1, -0.3);
    g.rect(6, 16, 4, 3, "y");
    g.ell(8, 23, 4.8, 6.5, P.tip); g.horn(8, 28, 8, 31, 3, P.tip);
    g.eyeW(5, 21); g.eyeW(9, 21); g.rect(7, 25, 2, 1, "#ff93b8", true);
    g.put(11, 29, "p", true); g.put(11, 30, "p", true);
  }},
  // 琴古主 (2x1)
  koto: { w:2, h:1, P:{ wood:"#9a5230", lacq:"#c6783f", face:"#f1d3b0" }, f(g, P) {
    g.rect(1, 3, 22, 11, P.wood); g.rect(1, 3, 22, 3, P.lacq); g.rect(1, 12, 22, 2, "N");
    for (const y of [6, 8, 10]) g.rect(2, y, 20, 1, "w", true);
    for (let i = 0; i < 5; i++) g.rect(5 + i * 4, 5 + (i % 2), 1, 6, "y", true);
    g.ell(26, 8, 5, 5.5, P.face); g.rect(21, 3, 11, 2, "g"); // 白髪
    g.eyeD(24, 6); g.eyeD(28, 6); g.rect(24, 11, 5, 1, "g", true);
  }},
  // 打出の小槌 (2x1)
  kozuchi: { w:2, h:1, P:{ head:"#f2b030", band:"#b88a22" }, f(g, P) {
    g.rect(21, 7, 11, 3, "n"); g.rect(29, 6, 3, 5, "N");
    g.rect(3, 3, 18, 10, P.head); g.ell(3, 8, 2.2, 5, adj(pc(P.head), -0.1)); g.ell(21, 8, 2, 5, adj(pc(P.head), 0.1));
    g.rect(8, 3, 1, 10, P.band, true); g.rect(15, 3, 1, 10, P.band, true);
    g.eyeD(5, 5); g.eyeD(12, 5); g.rect(5, 9, 10, 3, "#7a2a2a", true); g.put(6, 9, "w", true); g.put(13, 9, "w", true);
  }},
};
// 合体で作れる派生アイテム (元の絵を色替え/装飾)
const ITEM_VARIANT = {
  itaten:   { from:"zouri",   P:{ sole:"#6fd8ff", strap:"#f29a2e", extra:true } },
  yaminabe: { from:"kama",    P:{ body:"#52308f", lid:"#9a5bdc", tail:"#7a3fc0", steam:"l" } },
  ungaikyo: { from:"kagami",  P:{ frame:"#9a5bdc", glass:"#d8c8ff", cloud:true } },
  benzaiten:{ from:"biwa",    P:{ body:"#e8f0ff", plate:"#86e0ee", trim:"#ffd84d" } },
  sumi:     { from:"katana",  P:{ blade:"#4a3f6a", spine:"#2a2236", wrap:"#52308f", glow:true } },
};
function itemGrid(id) {
  const v = ITEM_VARIANT[id], base = ITEM_ART[v ? v.from : id];
  const g = new Grid(16 * base.w, 16 * base.h);
  base.f(g, Object.assign({}, base.P, v && v.P));
  return g;
}

// ===== キャラクター(32x44 を 3倍ピクセルで描画) =====
function headBase(g, o) {
  g.ell(16, 16, 13.5, 12.5, o.hair);
  g.ell(16, 21, 11.5, 9.5, o.skin);
  for (let x = 5; x <= 26; x++) { const d = 2 + (((x * 7) % 5) < 2 ? 2 : 0) + (Math.abs(x - 16) < 2 ? 1 : 0); g.rect(x, 11, 1, d, o.hair); }
  g.rect(3, 16, 2, 10, o.hair); g.rect(27, 16, 2, 10, o.hair);
  g.eyeT(10, 20); g.eyeT(20, 20);
  g.rect(7, 25, 3, 1, "#f08a8a", true); g.rect(22, 25, 3, 1, "#f08a8a", true);
  g.rect(15, 26, 2, 1, "#8a3a3a", true);
}
function bodyBase(g, o) {
  g.rect(11, 40, 4, 3, o.bottom); g.rect(17, 40, 4, 3, o.bottom);
  g.rect(10, 42, 5, 2, o.shoe); g.rect(17, 42, 5, 2, o.shoe);
  g.rect(9, 31, 14, 9, o.top);
  g.rect(5, 32, 4, 7, o.sleeve || o.top); g.rect(23, 32, 4, 7, o.sleeve || o.top);
  g.rect(5, 38, 4, 2, o.skin); g.rect(23, 38, 4, 2, o.skin);
  g.rect(9, 36, 14, 2, o.acc);
}
function hakama(g, col, y0 = 37) { for (let r = 0; r < 7; r++) { const x0 = 9 - Math.floor(r / 2), x1 = 22 + Math.floor(r / 2); g.rect(x0, y0 + r, x1 - x0 + 1, 1, col); } }
const HERO_ART = {
  miko(g) {
    const o = { skin:"#f8d2ae", hair:"#2c2b52", top:"#f6f1e7", sleeve:"#f6f1e7", acc:"#8e2338", bottom:"#e0463f", shoe:"#f6f1e7" };
    g.rect(4, 14, 24, 23, o.hair);
    bodyBase(g, o); hakama(g, "#e0463f");
    g.rect(4, 32, 5, 8, "#f6f1e7"); g.rect(23, 32, 5, 8, "#f6f1e7");
    g.rect(4, 38, 5, 1, "#e0463f"); g.rect(23, 38, 5, 1, "#e0463f");
    g.rect(5, 38, 4, 2, o.skin); g.rect(23, 38, 4, 2, o.skin);
    g.rect(13, 31, 6, 2, "#e0463f"); g.put(14, 33, "#e0463f"); g.put(17, 33, "#e0463f"); g.rect(15, 33, 2, 2, "#e0463f");
    headBase(g, o);
    g.ell(5, 14, 3.4, 3, "#e0463f"); g.ell(27, 14, 3.4, 3, "#e0463f"); g.rect(4, 14, 2, 8, "#e0463f"); g.rect(26, 14, 2, 8, "#e0463f");
    g.put(14, 7, "#ffd84d", true); g.put(17, 7, "#ffd84d", true);
    // 御幣
    g.rect(29, 24, 1, 16, "n"); g.rect(27, 20, 5, 3, "w"); g.rect(28, 23, 4, 2, "w"); g.rect(27, 25, 2, 1, "w");
    g.rect(27, 38, 4, 2, o.skin);
  },
  onmyoji(g) {
    const o = { skin:"#f8d2ae", hair:"#1f1d3a", top:"#4a7be8", sleeve:"#4a7be8", acc:"#ffd84d", bottom:"#233f94", shoe:"#2b2640" };
    bodyBase(g, o); hakama(g, "#233f94");
    g.rect(3, 32, 6, 8, "#4a7be8"); g.rect(23, 32, 6, 8, "#4a7be8"); g.rect(3, 39, 6, 1, "#f6f1e7"); g.rect(23, 39, 6, 1, "#f6f1e7");
    g.rect(5, 38, 4, 1, o.skin); g.rect(23, 38, 4, 1, o.skin);
    g.rect(13, 31, 6, 1, "#ffd84d"); g.rect(15, 32, 2, 4, "#ffd84d");
    headBase(g, o);
    for (let y = 0; y <= 9; y++) { const hw = Math.min(8, 3 + y); g.rect(16 - hw, y, hw * 2, 1, "#2b2640"); }
    g.rect(21, 5, 1, 12, "w", true); g.rect(20, 14, 3, 3, "w", true); g.put(21, 15, "r", true);
    // お札
    g.rect(27, 33, 5, 9, "w", true); g.rect(28, 34, 3, 1, "r", true); g.rect(29, 36, 1, 4, "r", true); g.rect(27, 38, 4, 2, o.skin);
  },
  ronin(g) {
    const o = { skin:"#f8d2ae", hair:"#1f1d3a", top:"#946238", sleeve:"#946238", acc:"#e0463f", bottom:"#5b6078", shoe:"#1a1428" };
    bodyBase(g, o); hakama(g, "#5b6078");
    g.rect(13, 31, 6, 2, "#e9dfc3"); g.put(14, 33, "#e9dfc3"); g.put(17, 33, "#e9dfc3");
    headBase(g, o);
    g.ell(16, 8, 15.5, 6.2, "#e8c860"); g.erase(0, 0, 32, 2);
    g.lineT(16, 2, 2, 11, 1, "#b8861f", false, true); g.lineT(16, 2, 30, 11, 1, "#b8861f", false, true); g.lineT(16, 2, 16, 13, 1, "#b8861f", false, true);
    g.rect(9, 14, 1, 14, "#6a3a1a"); g.rect(22, 14, 1, 14, "#6a3a1a");
    // 刀
    g.horn(29, 14, 29, 12, 2, "#d8dfe8"); g.rect(28, 14, 2, 22, "#d8dfe8"); g.rect(27, 36, 4, 1, "y"); g.rect(28, 37, 2, 4, "n"); g.rect(27, 38, 4, 2, o.skin);
  },
};
function oniBody(g, P) {
  g.ell(5, 26, 3.6, 6, P.body); g.ell(27, 26, 3.6, 6, P.body);
  g.rect(10, 34, 5, 5, P.body); g.rect(17, 34, 5, 5, P.body); g.rect(9, 38, 6, 2, adj(pc(P.body), -0.2)); g.rect(17, 38, 6, 2, adj(pc(P.body), -0.2));
  g.ell(16, 29, 9.5, 8.5, P.body); g.ell(16, 30, 6, 6, adj(pc(P.body), 0.2));
  g.rect(8, 31, 16, 5, P.cloth);
  for (const x of [10, 14, 18, 21]) g.rect(x, 32 + (x % 3 === 0 ? 1 : 0), 1, 2, "k", true);
  g.ell(16, 15, 12, 10.5, P.body);
  g.horn(10, 8, 7, 0, 4, P.horn); g.horn(22, 8, 25, 0, 4, P.horn);
  g.ell(16, 5.5, 6, 2.4, "#1a1428");
  g.rect(9, 13, 5, 4, "w", true); g.rect(18, 13, 5, 4, "w", true); g.rect(11, 14, 2, 3, "k", true); g.rect(19, 14, 2, 3, "k", true);
  g.lineT(8, 11, 14, 13.5, 1.6, "k", true); g.lineT(24, 11, 18, 13.5, 1.6, "k", true);
  g.rect(15, 16, 2, 2, adj(pc(P.body), -0.3), true);
  g.rect(10, 19, 12, 4, "#3a0a14", true); g.rect(11, 19, 2, 2, "w", true); g.rect(19, 19, 2, 2, "w", true); g.rect(14, 21, 4, 2, "m", true);
  // 金棒
  g.rect(3, 18, 3, 21, "n"); g.ell(4.5, 14, 3.8, 5.5, "#6a6f86");
  for (const [x, y] of [[0, 12], [0, 16], [8, 12], [8, 16], [3, 8], [5, 8]]) g.put(x, y, "g", true);
}
function hitotsume(g, P) {
  g.rect(10, 35, 5, 4, "#d8e6ff"); g.rect(17, 35, 5, 4, "#d8e6ff"); g.rect(9, 38, 6, 2, "N"); g.rect(17, 38, 6, 2, "N");
  g.ell(16, 30, 9, 8, P.cloth); g.rect(5, 26, 4, 8, P.cloth); g.rect(23, 26, 4, 8, P.cloth); g.rect(5, 33, 4, 2, "#d8e6ff"); g.rect(23, 33, 4, 2, "#d8e6ff");
  g.rect(9, 31, 14, 2, P.obi);
  g.ell(16, 16, 12.5, 11.5, "#d8e6ff");
  g.ell(16, 5.5, 2.4, 1.8, "#1a1428");
  g.ell(16, 15, 7, 6.2, "w", true); g.ell(16, 15.5, 3.5, 4, P.iris, true); g.rect(15, 14, 2, 3, "k", true); g.put(14, 13, "w", true);
  g.lineT(9, 12, 23, 12, 1.2, "k", true);
  g.rect(12, 24, 8, 3, "#3a0a14", true); g.rect(14, 25, 4, 8, "m", true); g.rect(15, 33, 2, 1, "#ff6f9f", true);
  g.put(8, 22, "#f08a8a", true); g.put(23, 22, "#f08a8a", true);
}
function kappa(g, P) {
  g.ell(6, 28, 3, 7.5, "n"); g.ell(26, 28, 3, 7.5, "n");
  g.rect(10, 34, 5, 4, P.body); g.rect(17, 34, 5, 4, P.body); g.ell(11, 38.8, 4.4, 1.5, P.body); g.ell(21, 38.8, 4.4, 1.5, P.body);
  g.ell(16, 29, 9, 8, P.body); g.ell(16, 30, 6, 6, adj(pc(P.body), 0.25));
  g.ell(16, 15, 12, 10, P.body);
  g.ell(16, 6.5, 7, 2.8, "#1a1428"); g.ell(16, 6.2, 5, 1.8, P.dish);
  g.rect(8, 8, 2, 5, "#1a1428"); g.rect(22, 8, 2, 5, "#1a1428");
  g.ell(10.5, 13, 3.4, 3.5, "w", true); g.ell(21.5, 13, 3.4, 3.5, "w", true); g.rect(11, 13, 2, 3, "k", true); g.rect(19, 13, 2, 3, "k", true);
  g.ell(16, 19.5, 6.5, 3.6, "y"); g.put(14, 18, "Y", true); g.put(17, 18, "Y", true); g.rect(11, 20, 10, 1, "Y", true);
  g.lineT(5, 24, 5, 38, 3, "l");
  g.put(4, 36, "L", true);
}
function kitsune(g, P) {
  for (let i = 0; i < P.tails; i++) { const a = -0.4 + (i - (P.tails - 1) / 2) * 0.6; g.ell(26 + Math.sin(a) * 4, 30 - Math.cos(a) * 4 - i % 2 * 2, 3.6, 8.5, P.fur); g.ell(26 + Math.sin(a) * 5.2, 23 - Math.cos(a) * 4 - i % 2 * 2, 2.4, 3, "w"); }
  g.rect(10, 35, 5, 4, P.fur); g.rect(17, 35, 5, 4, P.fur); g.rect(9, 38, 6, 2, "k"); g.rect(17, 38, 6, 2, "k");
  g.ell(16, 31, 8.5, 7.5, "w"); g.rect(5, 27, 4, 8, "w"); g.rect(23, 27, 4, 8, "w"); g.rect(5, 34, 4, 2, P.fur); g.rect(23, 34, 4, 2, P.fur);
  g.rect(9, 33, 14, 2, P.mark);
  g.horn(8.5, 9, 6, 0, 8, P.fur); g.horn(23.5, 9, 26, 0, 8, P.fur); g.horn(8.5, 8, 7, 3, 3, "m", true); g.horn(23.5, 8, 25, 3, 3, "m", true);
  g.rect(5, 0, 3, 2, "k"); g.rect(24, 0, 3, 2, "k");
  g.ell(16, 16, 12.5, 10, P.fur);
  g.ell(16, 21, 7, 5, "w");
  g.rect(15, 19, 2, 2, "k", true);
  g.lineT(8, 14, 13, 15.5, 1.6, "k", true); g.lineT(24, 14, 19, 15.5, 1.6, "k", true);
  g.rect(9, 15, 4, 2, "y", true); g.rect(19, 15, 4, 2, "y", true); g.put(11, 15, "k", true); g.put(20, 15, "k", true);
  g.lineT(9, 18, 7, 23, 1.4, P.mark, true); g.lineT(23, 18, 25, 23, 1.4, P.mark, true);
  g.rect(14, 23, 4, 1, "#8a3a3a", true);
}
function gasha(g) {
  g.ell(16, 36, 7, 7, "T"); for (let i = 0; i < 5; i++) g.rect(8, 31 + i * 2.2, 16, 1, "t"); g.rect(15, 28, 2, 12, "t");
  g.lineT(6, 30, 3, 41, 2.2, "t"); g.lineT(26, 30, 29, 41, 2.2, "t"); g.rect(1, 40, 4, 2, "t"); g.rect(27, 40, 4, 2, "t");
  g.ell(16, 12, 13.5, 11.5, "t");
  g.rect(8, 21, 16, 4, "t"); for (let x = 9; x < 24; x += 3) g.rect(x, 21, 1, 4, "G", true); g.rect(9, 25, 14, 2, "t");
  g.ell(10.5, 12, 3.8, 4.2, "k", true); g.ell(21.5, 12, 3.8, 4.2, "k", true); g.rect(10, 12, 2, 2, "r", true); g.rect(21, 12, 2, 2, "r", true);
  g.rect(15, 16, 2, 3, "k", true); g.put(14, 18, "k", true); g.put(17, 18, "k", true);
  g.lineT(6, 6, 9, 9, 1, "G", true); g.lineT(24, 5, 22, 8, 1, "G", true);
}
const CHAR_DEF = {
  miko:     { w:32, h:44, s:1,    f: HERO_ART.miko },
  onmyoji:  { w:32, h:44, s:1,    f: HERO_ART.onmyoji },
  ronin:    { w:32, h:44, s:1,    f: HERO_ART.ronin },
  e_oni:        { w:32, h:44, s:1,   f: g => oniBody(g, { body:"#e0463f", horn:"#ffe27a", cloth:"#ffd84d" }) },
  e_oniBlue:    { w:32, h:44, s:1.1, f: g => oniBody(g, { body:"#4a7be8", horn:"#f6f1e7", cloth:"#f6f1e7" }) },
  e_oniBoss:    { w:32, h:44, s:1.2, f: g => oniBody(g, { body:"#a8283a", horn:"#ffd84d", cloth:"#233f94" }) },
  e_karakasa:   { w:32, h:44, s:1,   f: g => hitotsume(g, { cloth:"#946238", obi:"#e0463f", iris:"#8a5a34" }) },
  e_karakasaBig:{ w:32, h:44, s:1.15,f: g => hitotsume(g, { cloth:"#4a4880", obi:"#ffd84d", iris:"#9a5bdc" }) },
  e_kappa:      { w:32, h:44, s:1,   f: g => kappa(g, { body:"#58c14a", dish:"#86e0ee" }) },
  e_kappaBoss:  { w:32, h:44, s:1.2, f: g => kappa(g, { body:"#e08a2e", dish:"#ffd84d" }) },
  e_kitsune:    { w:32, h:44, s:1,   f: g => kitsune(g, { fur:"#f0a030", mark:"#e0463f", tails:1 }) },
  e_kitsuneBoss:{ w:32, h:44, s:1.2, f: g => kitsune(g, { fur:"#fff0c0", mark:"#9a5bdc", tails:3 }) },
  e_gasha:      { w:32, h:44, s:1.2, f: gasha },
};
// 後方互換: 敵の絵は e_xxx キー、ヒーローはそのまま

const SPR_CACHE = {};
function spr(key) {
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  let s;
  if (MINI[key]) s = renderGrid(miniGrid(MINI[key]), { px: 2, outline: false, fx: false });
  else if (CHAR_DEF[key]) { const d = CHAR_DEF[key], g = new Grid(d.w, d.h, d.s); d.f(g); s = renderGrid(g, { px: 3 }); }
  else if (ITEM_ART[key] || ITEM_VARIANT[key]) s = renderGrid(itemGrid(key), { px: 2 });
  else throw new Error("no sprite " + key);
  return SPR_CACHE[key] = s;
}

"use strict";
// ===== ドット絵データ & レンダラ =====
// 1ドット = PX 論理ピクセル。文字はパレットのキー。'.' は透明。
const PX = 2;
const PAL = {
  k:"#1a1428", w:"#f6f1e7", g:"#a3a8bd", G:"#5b6078",
  r:"#e0463f", R:"#8e2338", o:"#f29a2e", O:"#b8601d",
  y:"#ffd84d", Y:"#b88a22", b:"#4a7be8", B:"#233f94",
  c:"#86e0ee", C:"#3b9bb5", p:"#9a5bdc", P:"#52308f",
  n:"#946238", N:"#5d3a22", l:"#7ede5a", L:"#2f8a3c",
  s:"#f5c9a2", S:"#c98d6a", m:"#ff93b8", t:"#e9dfc3", T:"#b9ad8a",
  h:"#2c2b52", H:"#4a4880",
};
const OUTLINE = "#0d0818";

// ---- 12x12 アイコン ----
const ICONS = {
  ofuda: [
    "............","...wwwwww...","...wwrrww...","...wrwwrw...","...wwrrww...","...wwrwww...",
    "...wrrrww...","...wwrwww...","...wwrrww...","...wwwwww...","....w..w....","............"],
  kodachi: [
    "..........ww",".........wwg","........wwg.",".......wwg..","......wwg...",".....wwg....",
    "....wwg.....","...YyY......","..nYy.......",".nn.Y.......","nn..........","............"],
  hamaya: [
    "..........ww",".........www","........wnw.",".......nn...","......nn....",".....nn.....",
    "....nn......","...nn.......","..rn........",".rr.........","rr..........","............"],
  kanabou: [
    "......g.g...",".....gGGGg..","....gGGGGGg.","....gGGGGGg.",".....gGGGg..","......nng.g.",
    ".....nn.....","....nn......","...nn.......","..nN........",".nN.........","nN.........."],
  karakasa: [
    "............","....rrrr....","..rrrrrrrr..",".rrrRwwRrrr.","rrrRrwkwRrrr","rRrrrwwrrrRr",
    ".....n......",".....n......",".....n......",".....n......","....nn......","............"],
  hyoutan: [
    ".....nn.....",".....yy.....","....yyyy....","....yyYy....",".....yy.....","....yyyy....",
    "...yyyyyY...","..yyywyyyY..","..yyyyyyyY..","..yyyyyyYY..","...YYYYYY...","............"],
  kagami: [
    "....yyyy....","..yyccccyy..",".yccwwccccy.",".ycwwcccccy.","yccwcccccccy","yccccccccCcy",
    "yccccccccCcy",".yccccccCCy.",".yyccccCCyy.","..yyyyyyyy..",".....nn.....","....nnnn...."],
  kitsunebi: [
    ".....o......",".....oo.....","....ooo.....","....ooyo....","...oooyyo...","...ooyyyo...",
    "..oooyyyoo..","..ooyywyyo..","..ooyywyyo..","..oooyyyoo..","...ooooooo..","....oooo...."],
  dokumanju: [
    "............","....pppp....","..pppppppp..",".pppppppppp.",".ppkpppkppp.",".pppppppppp.",
    ".ppppkkkppp.",".PPppppppPP.","..PPPPPPPP..","...l..l.....","....l..l....","............"],
  chouchin: [
    ".....nn.....","...yyyyyy...","..rrrrrrrr..",".rrrryyrrrr.",".rrryyyyrrr.",".rrrryyrrrr.",
    ".rrrrrrrrrr.","..rrrrrrrr..","...yyyyyy...",".....yy.....",".....yy.....","............"],
  juzu: [
    "....nnnn....","..ny....yn..",".nn......nn.",".n........n.",".y........y.",".nn......nn.",
    "..nn....nn..","....nyny....",".....rr.....",".....rr.....","....rrrr....","............"],
  bakeneko: [
    ".o........o.",".oo......oo.",".oooooooooo.","oooooooooooo","ooyykooyykoo","oooooommoooo",
    "oooooooooooo",".oooooooooo.","..oooooooo..","..oo....oo..","..oo....oo..","............"],
  kappa: [
    "....cccc....","...lccccl...","..llllllll..",".llwkllwkll.",".llllllllll.",".llyyyyyyll.",
    ".llyyYYyyll.","..llllllll..","...LLLLLL...","..LLLllLLL..","..LL....LL..","............"],
};
// 派生アイコン: 色替え
const ICON_ALIAS = {
  youtou:     ["kodachi", {w:"p", g:"P", y:"r", Y:"R"}],
  nekokasha:  ["bakeneko", {o:"p", y:"c", m:"r"}],
  onibi:      ["kitsunebi", {o:"b", y:"c"}],
  taimaya:    ["hamaya", {n:"y", w:"c", r:"o"}],
  reiyaku:    ["hyoutan", {y:"c", Y:"C", n:"L"}],
  yata:       ["kagami", {c:"w", C:"g", y:"r", Y:"R"}],
};

// ---- 小アイコン (HUD用 7x7) ----
const MINI = {
  heart: [".rr.rr.","rrrrrrr","rwrrrrr",".rrrrr.","..rrr..","...r...","......."],
  coin:  [".yyyyy.","yyyYYyy","yyYyyYy","yyYyyYy","yyYYYyy",".yyyyy.","......."],
  shield:["bbbbbbb","bwbbbbb","bbbbbbb","bbbbbbb",".bbbbb.","..bbb..","...b..."],
  sword: ["......w",".....ww","....ww.","w..ww..",".www...","..w....",".n.n..."],
  flame: ["...o...","..oo...","..ooo..",".ooyoo.",".oyyyo.",".ooyoo.","..ooo.."],
  drop:  ["...p...","...p...","..ppp..",".ppppp.",".ppwpp.",".ppppp.","..ppp.."],
  plus:  ["..lll..","..lll..","lllllll","lllllll","lllllll","..lll..","..lll.."],
  star:  ["...y...","...y...","yyyyyyy",".yyyyy.","..yyy..",".yy.yy.","y.....y"],
};

// ---- ヒーロー: 共通テンプレ(左半分10列) ----
const HERO_TPL = [
  "..........","......hhhh","....hhhhhh","...hhhhhhh","..hhhhhhhh","..hhhhhhhh",
  "..hhsssshh","..hsssssss","..hsskssss","..hsskssss","..hsssssss","...hssssSs",
  "....ssssss","....qqqqqq","...qqqqqqq","..qqqqqqqq","..sqqqqqaa","..sqqqqqaa",
  "..qqqqqqqq","...aaaaaaa","...uuuuuuu","...uuuuuuu","...uuuuuu.","...ffffff.","..........",
];
const HEROES = {
  miko: {
    map:{q:"w", a:"r", u:"r", f:"n"},
    hat:{3:"...hhrhhhh",4:"..hhrrhhhh"},
    prop:["..w.w...","...ww...","..w.w...","...n....","...n....","...n....","...n....","...n....","...n....","...n...."],
  },
  onmyoji: {
    map:{q:"b", a:"y", u:"B", f:"k"},
    hat:{0:"........kk",1:"......kkkk",2:"....kkkkkk",3:"....kkkkkk"},
    prop:["..wwww..","..wrrw..","..wrrw..","..wwww..","...n....","...n...."],
  },
  ronin: {
    map:{q:"n", a:"r", u:"G", f:"k"},
    hat:{0:"........yy",1:"......yyyy",2:"....yyyyyy",3:"..yyyyyyyY",4:"yyyyyyYYYY"},
    prop:["......w.",".....ww.","....ww..","...ww...","..ww....",".yYy....","nn......"],
  },
};
function buildHeroRows(h){
  const rows = HERO_TPL.map((r,i)=> (h.hat && h.hat[i]) ? h.hat[i] : r);
  return rows.map(r=>{
    const mapped = [...r].map(ch=> h.map[ch] || (ch==="Q"?"g":ch)).join("");
    return mapped + [...mapped].reverse().join("");
  });
}

// ---- 敵(左半分、正面シンメトリ) ----
const ENEMY_HALF = {
  oni: [
    "..y........","..yy.......","...yrrrrrrr","..rrrrrrrrr",".rrrrrrrrrr",".rrwwrrrrrr",
    ".rrwkrrrrrr",".rrrrrrrrrr",".rrrrrrwwww",".RrrrrRRRRR","..rrrrrrrrr","...rrrrrrrr",
    "..rrrrrrrrr",".rrrrrrrrrr",".rrrrrrrrrr",".rrrrrrrrrr",".rrrrrrrrrr","..yyyyyyyyy",
    "..yykyyykyy","..yyyyyyyyy","..rrrrrrrr.","..rrrrrrr..","..rrrrr..r.","..kkkkk...."],
  karakasa: [
    "..........p","......pppPP","....pppppPP","..ppppppPPP",".pppppPPPPP","pppppPPPPPP",
    "pPpppwwwwww","pPpppwwkkww","ppPpppwwkkw","..p..pwwwwp","..........p",".......mmmm",
    "........mmm",".........mm","..........n","..........n","..........n","..........n",
    ".........nn","........nnn","........nNN.","..........."],
  kappa: [
    "....cccccc.","...lcccccCl","..llllllllll",".llwwlllwwll".slice(0,11),".llwkllllllll".slice(0,11),".llllllllll.".slice(0,11),
    ".llllllyyyyy",".lllllyyYYYY",".llllllyyyyy","..lllllllll.".slice(0,11),"..LLLLLLLLLL".slice(0,11),".LLLLLLLLLLL".slice(0,11),
    ".LLllLLLLLLL".slice(0,11),".LLllLLLLLLL".slice(0,11),".LLLLLLLLLLL".slice(0,11),"..LLLLLLLLLL".slice(0,11),
    "..LLLLLLLLLL".slice(0,11),"...LLLLLLLLL".slice(0,11),"...LL......".slice(0,11),"..yyyy.....".slice(0,11),"..yyyy.....".slice(0,11),
    "...........","...........","..........."],
  kitsune: [
    "...w.......","..www......","..wwrw..www",".wwwwwwwwww","wwwwwwwwwww","wkwwwwwwwww",
    "wkkwwrwwwww","wwwwwwwwwww","wwwwwwwkkkk","wwrrwwwwwww",".wwwwwwwwww","..wwwwwwwww",
    "..wwwwwwwww",".wwrrwwwwww",".wwwwwwwwww",".wwwwwwwwww","..wwwwwwwww","..rrrrrrrrr",
    "..wwwwwwwww","..wwwwwwwww","..ww.wwwwww","..kk.kkkkkk","...........","..........."],
  gasha: [
    "...ttttttttt","..tttttttttt",".ttttttttttt",".tttttttttTT","ttttkkkttttt","tttkrrkttttt",
    "tttkrrkttttt","ttttkkkttttt","tttttttTTTTT","ttttttTkkkkk",".tTtTtTkTkTk",".ttttttttttt",
    "...TTTTTTTTT","..tttttttttt",".ttttTTTTTTT","..tttttttttt",".ttttTTTTTTT","..tttttttttt",
    ".ttttTTTTTTT","..tttttttttt","...tt.tttttt","..tt.....t..","..tt.......t","..tt........"],
};
const ENEMY_VARIANT = {
  oni:     {},
  oniBlue: {from:"oni", swap:{r:"b", R:"B", y:"c"}},
  oniBoss: {from:"oni", swap:{r:"R", R:"k", y:"o"}},
  karakasa:{}, karakasaBig:{from:"karakasa", swap:{p:"b", P:"B", m:"o"}},
  kappa:   {}, kappaBoss:{from:"kappa", swap:{l:"o", L:"O", c:"y"}},
  kitsune: {}, kitsuneBoss:{from:"kitsune", swap:{w:"o", r:"R"}},
  gasha:   {},
};

// ---- レンダラ ----
function makeSpriteFromRows(rows, opt = {}){
  const swap = opt.swap || {}, outline = opt.outline !== false;
  const w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  const grid = [];
  for (let y=-1; y<=h; y++){
    const row = [];
    for (let x=-1; x<=w; x++){
      const ch = (y>=0 && y<h && x>=0 && x<w) ? (rows[y][x] || ".") : ".";
      const key = swap[ch] || ch;
      row.push(key !== "." && PAL[key] ? PAL[key] : null);
    }
    grid.push(row);
  }
  const mk = white => {
    const c = document.createElement("canvas");
    c.width = (w+2)*PX; c.height = (h+2)*PX;
    const x = c.getContext("2d");
    for (let j=0;j<grid.length;j++) for (let i=0;i<grid[j].length;i++){
      let col = grid[j][i];
      if (col) { x.fillStyle = white ? "#ffffff" : col; }
      else if (outline && ((grid[j-1]&&grid[j-1][i]) || (grid[j+1]&&grid[j+1][i]) || grid[j][i-1] || grid[j][i+1])) x.fillStyle = OUTLINE;
      else continue;
      x.fillRect(i*PX, j*PX, PX, PX);
    }
    return c;
  };
  return { c: mk(false), w: mk(true), W: (w+2)*PX, H: (h+2)*PX };
}

const SPR_CACHE = {};
function spr(key){
  if (SPR_CACHE[key]) return SPR_CACHE[key];
  let s;
  if (key.startsWith("e_")) {
    const k = key.slice(2), v = ENEMY_VARIANT[k];
    const half = ENEMY_HALF[v && v.from ? v.from : k];
    s = makeSpriteFromRows(half.map(r=>r+[...r].reverse().join("")), {swap: v && v.swap});
  }
  else if (ICONS[key]) s = makeSpriteFromRows(ICONS[key]);
  else if (ICON_ALIAS[key]) s = makeSpriteFromRows(ICONS[ICON_ALIAS[key][0]], {swap: ICON_ALIAS[key][1]});
  else if (MINI[key]) s = makeSpriteFromRows(MINI[key], {outline:false});
  else if (HEROES[key]) s = makeSpriteFromRows(buildHeroRows(HEROES[key]));
  else if (key.startsWith("prop_")) s = makeSpriteFromRows(HEROES[key.slice(5)].prop);
  else if (ENEMY_HALF[key]) s = makeSpriteFromRows(ENEMY_HALF[key].map(r=>r+[...r].reverse().join("")));
  else if (ENEMY_VARIANT[key] && ENEMY_VARIANT[key].from) {
    const v = ENEMY_VARIANT[key];
    s = makeSpriteFromRows(ENEMY_HALF[v.from].map(r=>r+[...r].reverse().join("")), {swap: v.swap});
  } else throw new Error("no sprite " + key);
  return SPR_CACHE[key] = s;
}

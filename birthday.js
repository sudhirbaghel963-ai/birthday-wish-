/* ============================================================
   HAPPY BIRTHDAY — a birthday film in four acts
   Vanilla canvas 2D for the tree + GSAP for the orchestration.

   ACT 1  a real recurve bow with a Cupid's arrow nocked — you
          DRAW the string down and RELEASE to fire (pointer drag,
          or keyboard). A softly beating heart waits above as the
          target.
   ACT 2  the arrow flies up and strikes the heart; the heart
          jolts, falls, and bursts into a flood of rose that
          swallows the frame (no cross-fade).
   ACT 3  a kinetic wish hinges up out of that colour, glyph by
          glyph, under cinema bars and a slow camera push.
   ACT 4  a gold light blooms, and the tree grows into one heart
          of lit blossoms with the hand-lettered wish.

   A GSAP master timeline runs the shot + Acts 2–3; at its end it
   starts the canvas tree (Act 4), which owns its own rAF and
   plays once, then holds — living, never looping.
   ============================================================ */

import gsap from 'gsap';

/* the pen-stroke plugin: a `drawn` 0..1 property for the underline */
gsap.registerPlugin({
  name: 'drawn',
  init(target, value) {
    const len = target.getTotalLength();
    target.style.strokeDasharray = len;
    this.target = target; this.len = len; this.value = value;
  },
  render(ratio, data) {
    data.target.style.strokeDashoffset = data.len * (1 - data.value * ratio);
  },
});

const $ = (id) => document.getElementById(id);

const canvas = $('tree');
const ctx    = canvas.getContext('2d');
const wishEl = $('wish');

const hero       = $('hero');
const eyebrow    = $('eyebrow');
const hint       = $('hint');
const motes      = $('motes');
const target     = $('target');
const targetHeart= $('targetHeart');
const heartGlow  = target.querySelector('.heart__glow');
const aim        = $('aim');

const archery = $('archery');
const bow     = $('bow');
const arrow   = $('arrow');
const strL    = $('strL');
const strR    = $('strR');
const serving = $('serving');

const flood   = $('flood');
const field   = $('field');
const camera  = $('camera');
const fgrid   = $('fgrid');
const kEyebrow= $('kEyebrow');
const kSub    = $('kSub');
const barTop  = $('barTop');
const barBot  = $('barBot');
const uline   = $('uline').querySelector('.uline__path');
const bloom   = $('bloom');
const replay  = $('replay');
const nextScene1 = $('nextScene1');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isRecord     = new URLSearchParams(location.search).has('record');

/* --- cue log for the recorder: the page stays muted, but it timestamps every
   beat the film crosses, and the offline sound synth fires foley at those exact
   times so the audio can never drift from the picture. --- */
if (isRecord) window.bdayCues = [];
let recT0 = 0;
function cue(name){ if (isRecord && recT0) window.bdayCues.push({ cue: name, t: (performance.now() - recT0) / 1000 }); }

/* ============================================================
   MATH HELPERS
   ============================================================ */
const rand  = (a, b) => a + Math.random() * (b - a);
const pick  = (a)    => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack  = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/* ============================================================
   TREE ENGINE (Act 4) — canvas
   ============================================================ */
const BLOSSOM = [
  { c0: '#ffe1ec', c1: '#ff80aa' },
  { c0: '#ffd0e0', c1: '#f4577f' },
  { c0: '#ffc4d2', c1: '#e23b67' },
  { c0: '#ffd9c4', c1: '#ff8a5b' },
  { c0: '#ffeec2', c1: '#f6b13e' },
  { c0: '#ffd2e6', c1: '#e84d9a' },
];

/* timeline (seconds, relative to the tree's own start) — brisk */
const T = {
  trunkStart: 0.10,
  branchSpan: 1.80,
  bloomT0:    1.25,
  bloomSpan:  2.00,
  petalT0:    2.45,
  noteStart:  0.45,
  done:       4.60,
};

const SS = 168;

function heartShape(c, x, top, w, h){
  c.beginPath();
  c.moveTo(x, top + h * 0.28);
  c.bezierCurveTo(x, top, x - w * 0.5, top, x - w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x - w * 0.5, top + h * 0.60, x - w * 0.16, top + h * 0.80, x, top + h);
  c.bezierCurveTo(x + w * 0.16, top + h * 0.80, x + w * 0.5, top + h * 0.60, x + w * 0.5, top + h * 0.28);
  c.bezierCurveTo(x + w * 0.5, top, x, top, x, top + h * 0.28);
  c.closePath();
}

function makeBlossom({ c0, c1 }, soft){
  const cv = document.createElement('canvas'); cv.width = cv.height = SS;
  const c = cv.getContext('2d');
  const w = SS * 0.62, h = SS * 0.58, x = SS / 2, top = SS * 0.17;

  c.save();
  c.shadowColor = 'rgba(150,38,72,0.32)';
  c.shadowBlur = SS * 0.085; c.shadowOffsetY = SS * 0.05;
  c.fillStyle = c1; heartShape(c, x, top, w, h); c.fill();
  c.restore();

  const g = c.createRadialGradient(x - w * 0.20, top + h * 0.20, h * 0.04, x, top + h * 0.42, h * 0.92);
  g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, shade(c1, -26));
  heartShape(c, x, top, w, h); c.fillStyle = g; c.fill();

  c.save(); heartShape(c, x, top, w, h); c.clip();
  const g2 = c.createLinearGradient(0, top, 0, top + h);
  g2.addColorStop(0, 'rgba(255,255,255,0)');
  g2.addColorStop(0.65, 'rgba(110,16,46,0)');
  g2.addColorStop(1, 'rgba(110,16,46,0.26)');
  c.fillStyle = g2; c.fillRect(0, 0, SS, SS);
  c.globalAlpha = 0.55; c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(x - w * 0.15, top + h * 0.24, w * 0.17, h * 0.11, -0.5, 0, Math.PI * 2); c.fill();
  c.restore();

  if (!soft) return cv;

  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = SS;
  const c2 = cv2.getContext('2d');
  c2.filter = 'blur(2.6px)'; c2.drawImage(cv, 0, 0); c2.filter = 'none';
  c2.globalCompositeOperation = 'source-atop';
  c2.globalAlpha = 0.42; c2.fillStyle = '#fff3ea'; c2.fillRect(0, 0, SS, SS);
  return cv2;
}

function makeBokeh(rgb){
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgba(${rgb},0.9)`); g.addColorStop(0.45, `rgba(${rgb},0.22)`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  return cv;
}

function makeSparkle(){
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'); const m = S / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(255,236,200,0.5)'); g.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, m, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.translate(m, m);
  for (let k = 0; k < 2; k++){
    c.beginPath();
    c.moveTo(0, -m); c.quadraticCurveTo(0, 0, m, 0); c.quadraticCurveTo(0, 0, 0, m); c.quadraticCurveTo(0, 0, -m, 0); c.quadraticCurveTo(0, 0, 0, -m);
    c.fill(); c.rotate(Math.PI / 4); c.scale(0.5, 0.5);
  }
  return cv;
}

let SPR = { crisp: [], soft: [] }, BOKEH = [], SPARKLE = null;
function buildSprites(){
  SPR = { crisp: BLOSSOM.map((b) => makeBlossom(b, false)), soft: BLOSSOM.map((b) => makeBlossom(b, true)) };
  BOKEH = [makeBokeh('255,224,188'), makeBokeh('255,196,214'), makeBokeh('255,238,210')];
  SPARKLE = makeSparkle();
}

function drawSprite(sprite, x, y, size, rot, alpha){
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, -size * 0.5, -size * 0.47, size, size);
  ctx.restore();
}

let heartPoly = null;
function buildHeartPoly(){
  const raw = []; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i <= 160; i++){
    const t = (i / 160) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push([x, y]);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2, hw = (maxX - minX) / 2, hh = (maxY - minY) / 2;
  heartPoly = raw.map(([x, y]) => [(x - midX) / hw, (y - midY) / hh]);
}
function pointInPoly(x, y){
  let inside = false; const p = heartPoly;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++){
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

let W = 0, H = 0, dpr = 1;
let cx = 0, cy = 0, rx = 0, ry = 0, groundY = 0;
let branches = [], hearts = [], petals = [], rested = [], orbs = [], floaters = [], twinkles = [];
let bgGrad = null, glowGrad = null, groundGrad = null;

const quad = (b, t) => { const m = 1 - t, a = m * m, k = 2 * m * t, d = t * t; return { x: a * b.x1 + k * b.cx + d * b.x2, y: a * b.y1 + k * b.cy + d * b.y2 }; };

function barkGrad(x1, y1, x2, y2, depth){
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, `hsl(348 26% ${26 + depth * 3}%)`);
  g.addColorStop(1, `hsl(346 24% ${40 + depth * 5}%)`);
  return g;
}

function buildScene(){
  branches = []; hearts = []; petals = []; rested = []; twinkles = []; orbs = []; floaters = [];
  buildHeartPoly();

  const wide = W / H > 1.2;
  cx = W * (wide ? 0.57 : 0.5);
  cy = H * (wide ? 0.37 : 0.38);
  ry = Math.min(H * (wide ? 0.33 : 0.33), W * 0.34);
  rx = ry * 1.16;
  groundY = H * 0.93;

  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#fff3e9');
  bgGrad.addColorStop(0.46, '#ffe7d6');
  bgGrad.addColorStop(0.78, '#fcd9c4');
  bgGrad.addColorStop(1, '#f3c4b5');
  glowGrad = ctx.createRadialGradient(cx, cy, ry * 0.1, cx, cy, ry * 1.55);
  glowGrad.addColorStop(0, 'rgba(255,219,170,0.6)');
  glowGrad.addColorStop(0.5, 'rgba(255,170,150,0.2)');
  glowGrad.addColorStop(1, 'rgba(255,170,150,0)');
  groundGrad = ctx.createRadialGradient(cx, H * 1.02, ry * 0.2, cx, H * 1.02, ry * 1.6);
  groundGrad.addColorStop(0, 'rgba(255,205,165,0.5)');
  groundGrad.addColorStop(1, 'rgba(255,205,165,0)');

  for (let i = 0; i < 11; i++){
    orbs.push({ x: rand(0, W), y: rand(0, H), r: rand(W * 0.05, W * 0.17), vy: rand(-6, -16), drift: rand(-0.3, 0.3), phase: rand(0, 6.28), alpha: rand(0.05, 0.13), sprite: pick(BOKEH) });
  }

  const FN = wide ? 18 : 15;
  for (let i = 0; i < FN; i++){
    const depth = Math.random();
    floaters.push({
      x: rand(0, W), y: rand(-H * 0.1, H * 1.1), depth,
      idx: (Math.random() * BLOSSOM.length) | 0,
      box: lerp(Math.min(W, H) * 0.025, Math.min(W, H) * 0.075, depth),
      vy: lerp(7, 20, depth), sway: rand(8, 22), phase: rand(0, 6.28),
      rot: rand(-0.4, 0.4), vrot: rand(-0.5, 0.5),
      baseA: lerp(0.16, 0.5, depth), soft: depth < 0.45,
    });
  }

  const baseX = cx, baseY = H * 1.0;
  const trunkTopY = cy + ry * 0.62;
  const trunkW = Math.max(9, W * 0.024);
  const limbLen = ry * 0.6;
  const insidePx = (x, y, m = 0.9) => pointInPoly((x - cx) / (rx * m), (cy - y) / (ry * m));

  function addBranch(x, y, ang, len, w0, depth, t0){
    let ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, clipped = false;
    if (!insidePx(ex, ey)){
      let lo = 0, hi = 1;
      for (let k = 0; k < 12; k++){ const mid = (lo + hi) / 2; (insidePx(x + Math.cos(ang) * len * mid, y + Math.sin(ang) * len * mid) ? lo = mid : hi = mid); }
      ex = x + Math.cos(ang) * len * lo; ey = y + Math.sin(ang) * len * lo; clipped = true;
    }
    const mx = (x + ex) / 2, my = (y + ey) / 2, perp = ang + Math.PI / 2, bend = rand(-1, 1) * len * 0.12, w1 = w0 * 0.66;
    branches.push({ x1: x, y1: y, cx: mx + Math.cos(perp) * bend, cy: my + Math.sin(perp) * bend, x2: ex, y2: ey, w0, w1, t0, dur: Math.max(0.14, 0.32 - depth * 0.03), depth, grad: barkGrad(x, y, ex, ey, depth) });
    return { ex, ey, w1, clipped };
  }
  function grow(x, y, ang, len, w, depth, t0){
    const r = addBranch(x, y, ang, len, w, depth, t0);
    if (r.clipped || depth >= 6 || len < ry * 0.06) return;
    const childT0 = t0 + (0.32 - depth * 0.03) * 0.6;
    const n = Math.random() < 0.55 ? 2 : 3;
    for (let i = 0; i < n; i++){
      const spread = 0.6 * (i - (n - 1) / 2) + rand(-0.22, 0.22), lift = -0.06 + rand(-0.05, 0.05);
      grow(r.ex, r.ey, ang + spread + lift, len * rand(0.74, 0.84), r.w1, depth + 1, childT0 + i * 0.03);
    }
  }
  addBranch(baseX, baseY, -Math.PI / 2, baseY - trunkTopY, trunkW, 0, T.trunkStart);
  branches[0].dur = 0.55;
  const limbT0 = T.trunkStart + 0.36, L = 3;
  for (let i = 0; i < L; i++){
    const ang = -Math.PI / 2 + 0.62 * (i - (L - 1) / 2) + rand(-0.12, 0.12);
    grow(baseX, trunkTopY, ang, limbLen, trunkW * 0.7, 1, limbT0 + i * 0.05);
  }
  const maxT0 = branches.reduce((m, b) => Math.max(m, b.t0 + b.dur), 0);
  const sc = (T.branchSpan - T.trunkStart) / (maxT0 - T.trunkStart);
  for (const b of branches) b.t0 = T.trunkStart + (b.t0 - T.trunkStart) * sc;

  const COUNT = Math.round(clamp(rx * ry / 56, 250, 440));
  const baseBox = clamp(Math.min(W, H) * 0.115, 30, 74);
  let guard = 0;
  while (hearts.length < COUNT && guard < COUNT * 50){
    guard++;
    const u = rand(-1.06, 1.06), v = rand(-1.06, 1.06);
    if (!pointInPoly(u, v)) continue;
    const x = cx + u * rx, y = cy - v * ry;
    const d = clamp01(Math.hypot(u, v + 1) / 2.4);
    const t0 = T.bloomT0 + d * (T.bloomSpan * 0.82) + rand(0, T.bloomSpan * 0.18);
    const soft = Math.random() < 0.42;
    hearts.push({ x, y, idx: (Math.random() * BLOSSOM.length) | 0, soft, box: baseBox * (soft ? rand(0.6, 0.85) : rand(0.78, 1.12)), rot: rand(-0.55, 0.55), sway: rand(0, 6.28), t0 });
  }
  hearts.sort((a, b) => (a.soft === b.soft ? a.y - b.y : a.soft ? -1 : 1));
}

function drawBackground(){
  ctx.globalAlpha = 1;
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1; ctx.fillStyle = groundGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawGodRays(t, intensity){
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ox = cx, oy = cy - ry * 0.35, R = Math.hypot(W, H) * 1.1;
  const rays = 9, sweep = Math.sin(t * 0.07) * 0.18;
  for (let i = 0; i < rays; i++){
    const a = -Math.PI / 2 + sweep + (i - (rays - 1) / 2) * 0.2;
    const hw = 0.035 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
    const a1 = a - hw, a2 = a + hw;
    const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * R, oy + Math.sin(a) * R);
    g.addColorStop(0, `rgba(255,232,190,${0.10 * intensity})`);
    g.addColorStop(0.5, `rgba(255,214,170,${0.05 * intensity})`);
    g.addColorStop(1, 'rgba(255,214,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a1) * R, oy + Math.sin(a1) * R);
    ctx.lineTo(ox + Math.cos(a2) * R, oy + Math.sin(a2) * R);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawGlow(t){
  const gi = clamp01((t - T.bloomT0) / (T.bloomSpan * 0.9));
  if (gi <= 0) return;
  ctx.save(); ctx.globalAlpha = gi; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawBokeh(t, dt){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs){
    o.y += o.vy * dt; o.x += Math.sin(t * 0.3 + o.phase) * o.drift;
    if (o.y < -o.r){ o.y = H + o.r; o.x = rand(0, W); }
    ctx.globalAlpha = o.alpha;
    ctx.drawImage(o.sprite, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
  }
  ctx.restore();
}

function drawFloaters(t, dt, front){
  const appear = clamp01((t - 0.2) / 1.4);
  if (appear <= 0) return;
  for (const f of floaters){
    if ((f.depth >= 0.6) !== front) continue;
    f.y -= f.vy * dt;
    f.x += Math.sin(t * 0.5 + f.phase) * f.sway * dt;
    f.rot += f.vrot * dt;
    if (f.y < -f.box){ f.y = H + f.box; f.x = rand(0, W); }
    drawSprite((f.soft ? SPR.soft : SPR.crisp)[f.idx], f.x, f.y, f.box, f.rot, f.baseA * appear);
  }
}

function drawBranches(t){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of branches){
    const f = clamp01((t - b.t0) / b.dur);
    if (f <= 0) continue;
    const e = easeOutCubic(f);
    ctx.strokeStyle = b.grad;
    const steps = 12, last = Math.max(1, Math.ceil(steps * e));
    let prev = quad(b, 0);
    for (let i = 1; i <= last; i++){
      const tt = Math.min(e, i / steps), p = quad(b, tt);
      ctx.lineWidth = lerp(b.w0, b.w1, tt);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    }
  }
}

function drawHearts(t){
  const breathe = 1 + Math.sin(t * 0.8) * 0.012;
  for (const h of hearts){
    const p = clamp01((t - h.t0) / 0.6);
    if (p <= 0) continue;
    const scale = Math.max(0, easeOutBack(p));
    let alpha = clamp01(p * 1.7); if (h.soft) alpha *= 0.8;
    const settled = clamp01((t - h.t0 - 0.6) / 0.7);
    const sway = settled * Math.sin(t * 1.5 + h.sway) * (h.box * 0.05);
    const rise = (1 - easeOutCubic(p)) * h.box * 0.45;
    const hx = cx + (h.x - cx) * breathe + sway;
    const hy = cy + (h.y - cy) * breathe - rise;
    drawSprite((h.soft ? SPR.soft : SPR.crisp)[h.idx], hx, hy, h.box * scale, h.rot + sway * 0.012, alpha);
  }
}

function updateTwinkles(t, dt){
  const active = t > T.bloomT0 + T.bloomSpan * 0.45;
  if (active && twinkles.length < 9 && Math.random() < 0.5){
    const h = hearts[(Math.random() * hearts.length) | 0];
    if (h) twinkles.push({ x: h.x, y: h.y, size: rand(0.6, 1.3) * (Math.min(W, H) * 0.05), age: 0, life: rand(0.7, 1.2), rot: rand(0, 6.28) });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = twinkles.length - 1; i >= 0; i--){
    const s = twinkles[i]; s.age += dt;
    const k = s.age / s.life;
    if (k >= 1){ twinkles.splice(i, 1); continue; }
    const a = Math.sin(k * Math.PI);
    drawSprite(SPARKLE, s.x, s.y, s.size * (0.6 + 0.4 * a), s.rot + k * 1.2, a);
  }
  ctx.restore();
}

function spawnPetal(){
  const h = hearts[(Math.random() * hearts.length) | 0];
  if (!h) return;
  petals.push({ x: h.x + rand(-8, 8), y: h.y + rand(-8, 8), vy: rand(14, 30), vx: rand(-8, 8), sway: rand(0.6, 1.4), phase: rand(0, 6.28), box: h.box * rand(0.34, 0.6), idx: h.idx, rot: rand(0, 6.28), vrot: rand(-1.4, 1.4), age: 0, land: groundY + rand(-6, H * 0.05) });
}
function drawPetals(t, dt){
  for (let i = petals.length - 1; i >= 0; i--){
    const p = petals[i]; p.age += dt; p.vy += 8 * dt;
    p.x += (p.vx + Math.sin(t * p.sway + p.phase) * 16) * dt;
    p.y += p.vy * dt; p.rot += p.vrot * dt;
    if (p.y >= p.land){
      rested.push({ x: clamp(p.x, 6, W - 6), y: p.land, box: p.box, idx: p.idx, rot: p.rot, a: rand(0.7, 0.95) });
      if (rested.length > 90) rested.shift();
      petals.splice(i, 1); continue;
    }
    const a = p.age < 0.3 ? p.age / 0.3 : 1;
    drawSprite(SPR.crisp[p.idx], p.x, p.y, p.box, p.rot, a);
  }
}
function drawRested(){
  for (const r of rested) drawSprite(SPR.crisp[r.idx], r.x, r.y, r.box, r.rot, r.a);
}

function showWish(on){ wishEl.classList.toggle('is-in', on); }

/* the tree's own rAF: plays once from treeStart(), then holds, living */
let treeStartT = 0, treeLastT = 0, treeRAF = 0, lastPetal = 0, replayArmed = false;
window.bdayDone = false;

function treeFrame(now){
  if (!treeStartT){ treeStartT = now; treeLastT = now; }
  const t  = (now - treeStartT) / 1000;
  const dt = Math.min(0.05, (now - treeLastT) / 1000); treeLastT = now;

  const rays = clamp01((t - T.bloomT0) / T.bloomSpan);

  drawBackground();
  drawGodRays(t, rays);
  drawGlow(t);
  drawBokeh(t, dt);
  drawFloaters(t, dt, false);
  drawBranches(t);
  drawHearts(t);
  updateTwinkles(t, dt);
  if (t > T.petalT0 && now - lastPetal > 150){ spawnPetal(); spawnPetal(); lastPetal = now; }
  drawPetals(t, dt);
  drawRested();
  drawFloaters(t, dt, true);

  showWish(t >= T.noteStart);

  if (!window.bdayDone && t >= T.done) window.bdayDone = true;
  if (!replayArmed && t >= T.done + 1.0){ replayArmed = true; armReplay(); }

  treeRAF = requestAnimationFrame(treeFrame);
}

function treeStart(){
  treeStartT = 0; treeLastT = 0; lastPetal = 0; replayArmed = false; window.bdayDone = false;
  cue('grow');
  buildScene();
  if (!treeRAF) treeRAF = requestAnimationFrame(treeFrame);
}
function treeStop(){
  if (treeRAF){ cancelAnimationFrame(treeRAF); treeRAF = 0; }
  ctx.clearRect(0, 0, W, H);
}

function drawFinal(){
  buildScene();
  drawBackground(); drawGodRays(0, 1); drawGlow(T.done); drawBokeh(0, 0); drawFloaters(99, 0, false);
  drawBranches(99); drawHearts(99);
  for (let i = 0; i < 40; i++){ const h = hearts[(Math.random() * hearts.length) | 0]; if (h) rested.push({ x: clamp(h.x + rand(-W * 0.3, W * 0.3), 6, W - 6), y: groundY + rand(-6, H * 0.05), box: h.box * 0.5, idx: h.idx, rot: rand(0, 6.28), a: 0.85 }); }
  drawRested(); drawFloaters(99, 0, true);
  showWish(true);
  window.bdayDone = true;
}

/* ============================================================
   ACTS 1–3 (GSAP) — the bow, the shot, the wish
   ============================================================ */

/* the two headline words become per-glyph spans so each hinges up on its own */
function splitWord(el){
  const chars = [...el.textContent];
  el.textContent = '';
  return chars.map((c) => {
    const s = document.createElement('span');
    s.className = 'hl__ch';
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
    return s;
  });
}
const line1Chars = splitWord($('wLine1'));
const line2Chars = splitWord($('wLine2'));
const kChars = [...line1Chars, ...line2Chars];

/* drifting light motes behind the scene */
function buildMotes(){
  motes.innerHTML = '';
  for (let i = 0; i < 12; i++){
    const m = document.createElement('span');
    m.className = 'mote';
    const s = rand(4, 12);
    m.style.width = m.style.height = `${s}px`;
    m.style.left = `${rand(4, 96)}%`;
    m.style.top  = `${rand(10, 96)}%`;
    motes.appendChild(m);
    gsap.set(m, { opacity: rand(0.25, 0.7) });
    gsap.to(m, { y: -rand(40, 140), x: rand(-30, 30), duration: rand(7, 14), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -rand(0, 8) });
    gsap.to(m, { opacity: rand(0.1, 0.5), duration: rand(2.5, 5), repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
}

/* --- bow geometry (measured; re-measured on resize) -------------------------
   The rig lives lower-left and is rotated so its local "up" axis points at the
   heart; the shot therefore travels on a diagonal. The draw + arrow math all
   live in the rig's LOCAL space (offset geometry is transform-independent, so
   rotation never corrupts it); only the aim ANGLE and the flight DISTANCE come
   from screen measurements. */
const tip = $('tip');
let svgScale = 1, arrowBaseX = 0, arrowBaseY = 0, maxDraw = 120, curDraw = 0;
let pullUX = 0, pullUY = 1;                               // screen unit: string pull-back
const REST_NOCK = 96;                                    // string nock, in bow viewBox units
const nockProxy = { val: REST_NOCK };

function applyNock(){
  const y = nockProxy.val;
  strL.setAttribute('y2', y); strR.setAttribute('y2', y); serving.setAttribute('cy', y);
}

function refreshRig(){
  // the grip is anchored here, and the heart sits at its layout centre (33% down,
  // centred) — using the layout point, not a live rect, keeps the aim steady even
  // while the heart is scaling in.
  const gripX = W * 0.24, gripY = H * 0.76;
  const heartX = W * 0.5, heartY = H * 0.33;
  // rotation so local "up" (0,-1) maps to the grip→heart direction
  const aimRad = Math.atan2(heartX - gripX, gripY - heartY);
  pullUX = -Math.sin(aimRad); pullUY = Math.cos(aimRad);  // opposite of aim = pull-back

  // #bow / #arrow are SVG — no offset* — so measure rects in the rig's LOCAL
  // frame: neutralise the rig transform first (getBBox-style, sync, no paint).
  nockProxy.val = REST_NOCK; applyNock();
  gsap.set(archery, { rotation: 0, scale: 1, x: 0, y: 0 });
  archery.style.left = '0px'; archery.style.top = '0px';
  gsap.set(arrow, { x: 0, y: 0 });
  const aR = archery.getBoundingClientRect();
  const bR = bow.getBoundingClientRect();
  const sR = serving.getBoundingClientRect();
  const rR = arrow.getBoundingClientRect();
  svgScale = bR.width / 460;
  const gripLX = (bR.left - aR.left) + 0.5 * bR.width;
  const gripLY = (bR.top  - aR.top ) + (240 / 300) * bR.height;   // grip ~y240 in viewBox
  const nockLX = (sR.left - aR.left) + 0.5 * sR.width;
  const nockLY = (sR.top  - aR.top ) + 0.5 * sR.height;
  arrowBaseX = nockLX - ((rR.left - aR.left) + 0.5 * rR.width);
  arrowBaseY = nockLY - ((rR.top  - aR.top ) + (205 / 220) * rR.height);

  // anchor the grip at (gripX,gripY) and rotate the rig around it
  archery.style.left = (gripX - gripLX) + 'px';
  archery.style.top  = (gripY - gripLY) + 'px';
  gsap.set(archery, { transformOrigin: `${gripLX}px ${gripLY}px`, rotation: aimRad * 180 / Math.PI });
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY });
  maxDraw = Math.min(bR.height * 0.72, H * 0.16, 132);
  curDraw = 0;
}

function setDraw(d){
  curDraw = clamp(d, 0, maxDraw);
  gsap.set(arrow, { x: arrowBaseX, y: arrowBaseY + curDraw });   // local +Y = pull back
  nockProxy.val = REST_NOCK + curDraw / svgScale; applyNock();
  gsap.set(aim, { opacity: 0.55 * (curDraw / maxDraw) });
}

/* the target heart's beat — gentle, alive; killed the instant we fire */
let beatTL = null;
function startBeat(){
  gsap.set(targetHeart, { scale: 1 });
  gsap.set(heartGlow, { scale: 1, opacity: 0.7 });
  beatTL = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
  beatTL.to(targetHeart, { scale: 1.07, duration: 0.13, ease: 'power2.out' }, 0)
        .to(heartGlow,   { scale: 1.15, opacity: 0.9, duration: 0.13, ease: 'power2.out' }, 0)
        .to(targetHeart, { scale: 1.0, duration: 0.2, ease: 'power2.in' }, 0.13)
        .to(targetHeart, { scale: 1.05, duration: 0.12, ease: 'power2.out' }, 0.3)
        .to(targetHeart, { scale: 1.0, duration: 0.5, ease: 'power2.inOut' }, 0.42)
        .to(heartGlow,   { scale: 1.0, opacity: 0.7, duration: 0.7, ease: 'power2.inOut' }, 0.3);
}
function stopBeat(){ if (beatTL){ beatTL.kill(); beatTL = null; } gsap.set(targetHeart, { scale: 1 }); }

/* a little burst of hearts + sparks where the arrow strikes */
function miniHeartSVG(fill){
  return `<svg viewBox="0 0 24 22" width="100%" height="100%"><path d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z" fill="${fill}"/></svg>`;
}
function burstHearts(){
  const r = target.getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const ox = r.left - hr.left + r.width / 2;
  const oy = r.top - hr.top + r.height * 0.42;
  const cols = ['#ff6f97', '#ffb14e', '#ff8fae', '#ffd36a', '#e23b67'];
  const frag = document.createDocumentFragment();
  const nodes = [];
  for (let i = 0; i < 12; i++){
    const heart = i < 8;
    const el = document.createElement('span');
    el.className = 'burst';
    const s = heart ? rand(12, 22) : rand(4, 8);
    el.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;pointer-events:none;z-index:4;`;
    if (heart) el.innerHTML = miniHeartSVG(pick(cols));
    else { el.style.borderRadius = '50%'; el.style.background = 'radial-gradient(circle,#fff,rgba(255,210,150,0) 70%)'; }
    frag.appendChild(el); nodes.push({ el, heart });
  }
  hero.appendChild(frag);
  nodes.forEach(({ el, heart }) => {
    const ang = rand(-Math.PI, 0);                       // fan upward + out
    const dist = rand(heart ? 70 : 40, heart ? 190 : 120);
    gsap.to(el, {
      x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - rand(10, 50),
      rotation: rand(-120, 120), scale: heart ? rand(0.7, 1.2) : rand(0.4, 1),
      duration: rand(0.7, 1.15), ease: 'power2.out',
    });
    gsap.to(el, { opacity: 0, duration: 0.5, delay: rand(0.35, 0.6), ease: 'power1.in', onComplete: () => el.remove() });
  });
}

/* --- the shot + Acts 2–3 timeline ------------------------------------------ */
function shotGeom(){
  // flight distance = straight-line from the arrow tip to the heart (measured on
  // screen, rotation-aware). Moving the arrow that far along its local "up" axis
  // — which is aimed at the heart — lands the tip dead-centre on it.
  const tipR = tip.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const tipX = tipR.left + tipR.width / 2, tipY = tipR.top + tipR.height / 2;
  const tcx = tRect.left + tRect.width / 2, tcy = tRect.top + tRect.height / 2;
  const flightDist = Math.hypot(tcx - tipX, tcy - tipY);
  const fallPx = Math.min(H * 0.26, H - tcy - tRect.height * 0.4);
  const impactX = tcx, impactY = tcy + fallPx;
  const distC = Math.hypot(Math.max(impactX, W - impactX), Math.max(impactY, H - impactY));
  const reach = Math.hypot(W / 2, H / 2);
  return {
    arrowStartY: arrowBaseY + curDraw,
    arrowFlyY:   arrowBaseY + curDraw - flightDist,       // local -Y = toward the heart
    drawnNock:   REST_NOCK + curDraw / svgScale,
    fallPx, fx: impactX - W / 2, fy: impactY - H / 2,
    floodScale: (distC * 1.12) / 70, bloomScale: (reach * 1.2) / 30,
  };
}

let filmTL = null;
function buildFilm(m){
  const t = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(field, { autoAlpha: 0 });
      treeStart();
      // fade promptly so the growing tree is revealed with no white hold
      gsap.to(bloom, { autoAlpha: 0, duration: 1.15, ease: 'power2.out' });
    },
  });

  // reset (t=0)
  t.set(target, { y: 0, scaleX: 1, scaleY: 1, opacity: 1 })
   .set(arrow, { opacity: 1, x: arrowBaseX, y: m.arrowStartY, scaleY: 1 })
   .set([flood, bloom], { autoAlpha: 0, scale: 0.001, x: 0, y: 0 })
   .set(flood, { x: m.fx, y: m.fy })
   .set(field, { autoAlpha: 0 })
   .set('.blob', { opacity: 0 })
   .set(camera, { scale: 1, yPercent: 0 })
   .set(fgrid, { xPercent: 0, yPercent: 0 })
   .set(barTop, { yPercent: -100 })
   .set(barBot, { yPercent: 100 })
   .set(kEyebrow, { opacity: 0, y: 12 })
   .set(kSub, { opacity: 0, y: 12 })
   .set(kChars, { transformPerspective: 620, transformOrigin: '50% 100%', yPercent: 135, rotationX: -82 })
   .set(uline, { drawn: 0 });

  // --- the shot: string snaps (twang), arrow flies up into the heart --------
  t.fromTo(nockProxy, { val: m.drawnNock }, { val: REST_NOCK, duration: 0.5, ease: 'elastic.out(1,0.34)', onUpdate: applyNock }, 0)
   .to(arrow, { y: m.arrowFlyY, duration: 0.26, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.16, duration: 0.14, ease: 'power2.in' }, 0)
   .to(arrow, { scaleY: 1.0, duration: 0.1, ease: 'power1.out' }, 0.16)
   .to(aim, { opacity: 0, duration: 0.18 }, 0)
   .to([eyebrow, hint], { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0);

  // --- the strike: the arrow embeds, the heart recoils, then holds pierced --
  t.add(burstHearts, 0.26)
   // recoil along the arrow's line (up + right), springing back
   .to(target, { x: 7, y: -9, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { x: 0, y: 0, duration: 0.32, ease: 'power2.out' }, 0.32)
   .to(target, { scale: 1.14, duration: 0.06, ease: 'power2.out' }, 0.26)
   .to(target, { scale: 1.0, duration: 0.26, ease: 'power2.inOut' }, 0.32)
   // the arrow shudders in the wound, holds embedded so the hit reads, then sinks in
   .to(arrow, { rotation: '+=4', duration: 0.05, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 0.27)
   .set(arrow, { rotation: 0 }, 0.52)
   .to(arrow, { opacity: 0, duration: 0.16, ease: 'power1.out' }, 0.56);

  // --- the fall + the burst / flood -----------------------------------------
  t.to(target, { y: m.fallPx, scaleX: 0.84, scaleY: 1.3, duration: 0.34, ease: 'power1.in' }, 0.64)
   .to(target, { scaleX: 1.4, scaleY: 0.6, duration: 0.07, ease: 'power2.out' }, 0.98)
   .set(flood, { autoAlpha: 1 }, 1.00)
   .fromTo(flood, { scale: 0.02 }, { scale: m.floodScale, duration: 0.34, ease: 'power2.in' }, 1.00)
   .to(target, { opacity: 0, duration: 0.12, ease: 'power1.out' }, 1.06);

  // seam: the field is the same rose as the flood
  t.set(field, { autoAlpha: 1 }, 1.32)
   .set(hero, { autoAlpha: 0 }, 1.33)
   .to('.blob', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.34)
   .set(flood, { autoAlpha: 0 }, 1.36);

  // --- the camera push -------------------------------------------------------
  // duration matched to when the bloom covers (3.98) — a longer push used to
  // keep the timeline (and a white bloom) alive after the tree should already
  // be growing, which read as dead time before the tree appeared.
  t.fromTo(camera, { scale: 1.0, yPercent: 0 }, { scale: 1.07, yPercent: -1.3, duration: 2.6, ease: 'none' }, 1.38)
   .fromTo(fgrid, { xPercent: 0, yPercent: 0 }, { xPercent: -1.5, yPercent: -1.0, duration: 2.6, ease: 'none' }, 1.38);

  // beat markers for the recorder's soundtrack (no-ops off ?record)
  t.call(cue, ['hit'], 0.26)
   .call(cue, ['flood'], 1.00)
   .call(cue, ['wish'], 1.68)
   .call(cue, ['wish2'], 2.06)
   .call(cue, ['bloom'], 3.42);

  // cinema bars ease into a letterbox
  t.to(barTop, { yPercent: 0, duration: 0.6, ease: 'power2.out' }, 1.5)
   .to(barBot, { yPercent: 0, duration: 0.6, ease: 'power2.out' }, 1.5);

  // --- the kinetic wish ------------------------------------------------------
  t.to(kEyebrow, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 1.54)
   .to(line1Chars, { yPercent: 0, rotationX: 0, duration: 0.55, ease: 'power3.out', stagger: 0.033 }, 1.68)
   .to(line2Chars, { yPercent: 0, rotationX: 0, duration: 0.55, ease: 'power3.out', stagger: 0.033 }, 2.06)
   .to(uline, { drawn: 1, duration: 0.45, ease: 'power2.inOut' }, 2.54)
   .to(kSub, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 2.74);

  // --- the handoff bloom -----------------------------------------------------
  t.to(barTop, { yPercent: -100, duration: 0.5, ease: 'power2.in' }, 3.32)
   .to(barBot, { yPercent: 100, duration: 0.5, ease: 'power2.in' }, 3.32)
   .set(bloom, { autoAlpha: 1 }, 3.42)
   .fromTo(bloom, { scale: 0.02 }, { scale: m.bloomScale, duration: 0.58, ease: 'power2.in' }, 3.42);

  return t;
}

/* --- draw / release interaction -------------------------------------------- */
let played = false, drawing = false, startPX = 0, startPY = 0, startDraw = 0;

function fire(){
  if (played) return;
  played = true;
  drawing = false;
  stopBeat();
  cue('release'); cue('whoosh');
  filmTL = buildFilm(shotGeom());
  filmTL.play(0);
}

function springBack(){
  const from = curDraw;
  gsap.to({ d: from }, { d: 0, duration: 0.55, ease: 'elastic.out(1,0.4)', onUpdate() { setDraw(this.targets()[0].d); } });
}

function autoFire(){
  if (played) return;
  recT0 = performance.now(); cue('draw');       // t=0 of the soundtrack
  gsap.to({ d: curDraw }, {
    d: maxDraw * 0.94, duration: 0.62, ease: 'power2.inOut',
    onUpdate() { setDraw(this.targets()[0].d); },
    onComplete: () => gsap.delayedCall(0.16, fire),
  });
}

archery.addEventListener('pointerdown', (e) => {
  if (played) return;
  drawing = true;
  try { archery.setPointerCapture(e.pointerId); } catch (_) {}
  startPX = e.clientX; startPY = e.clientY; startDraw = curDraw;
  e.preventDefault();
});
archery.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  // project the drag onto the pull-back axis, so dragging back along the aim
  // (down + away from the heart) draws the string — on any shot angle.
  const proj = (e.clientX - startPX) * pullUX + (e.clientY - startPY) * pullUY;
  setDraw(startDraw + proj);
});
function endDraw(){
  if (!drawing) return;
  drawing = false;
  if (curDraw > maxDraw * 0.26) fire(); else springBack();
}
archery.addEventListener('pointerup', endDraw);
archery.addEventListener('pointercancel', endDraw);
archery.addEventListener('keydown', (e) => {
  if (played) return;
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); autoFire(); }
});

/* boot Act 1: reveal the target + bow + hint, then start the beat */
function enter(){
  gsap.set(hero, { autoAlpha: 1 });
  refreshRig();
  setDraw(0);
  gsap.set([eyebrow, hint], { opacity: 0, y: 14 });
  gsap.set(target, { opacity: 0, y: 10, scaleX: 0.9, scaleY: 0.9 });
  gsap.set(archery, { opacity: 0, scale: 0.85 });        // scale from the grip; keeps rotation
  gsap.set(heartGlow, { opacity: 0, scale: 1 });
  gsap.set(arrow, { opacity: 1 });

  const tl = gsap.timeline({ onComplete: startBeat });
  tl.to(target,   { opacity: 1, y: 0, scaleX: 1, scaleY: 1, duration: 0.8, ease: 'power3.out' }, 0.1)
    .to(heartGlow,{ opacity: 0.7, duration: 0.8, ease: 'power2.out' }, 0.2)
    .to(archery,  { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, 0.28)
    .to(eyebrow,  { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.4)
    .to(hint,     { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.7);
}

function armReplay(){
  replay.hidden = false;
  replay.classList.add('has-next');
  requestAnimationFrame(() => replay.classList.add('is-shown'));

  if (nextScene1){
    nextScene1.hidden = false;
    requestAnimationFrame(() => nextScene1.classList.add('is-shown'));
  }
}

/* back to Act 1, ready to be drawn again */
function resetAll(){
  treeStop();
  showWish(false);
  window.bdayDone = false; replayArmed = false;
  replay.classList.remove('is-shown', 'has-next'); replay.hidden = true;
  if (nextScene1){
    nextScene1.classList.remove('is-shown');
    nextScene1.hidden = true;
  }
  if (filmTL){ filmTL.pause(0); }
  gsap.set([flood, bloom], { autoAlpha: 0 });
  gsap.set(field, { autoAlpha: 0 });
  gsap.set(arrow, { opacity: 1, scaleY: 1 });
  played = false;
  enter();
}

/* ============================================================
   SIZING + BOOT
   ============================================================ */
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildSprites();
  buildScene();
  if (reduceMotion){ drawFinal(); return; }
  if (played && filmTL){
    const at = filmTL.time(); const active = filmTL.isActive();
    filmTL = buildFilm(shotGeom());
    filmTL.pause(at);
    if (active) filmTL.play(at);
  } else {
    refreshRig(); setDraw(0);
  }
}
let resizeRAF = 0;
window.addEventListener('resize', () => { if (resizeRAF) return; resizeRAF = requestAnimationFrame(() => { resizeRAF = 0; resize(); }); });

resize();

if (reduceMotion){
  drawFinal();
} else {
  buildMotes();
  document.fonts && document.fonts.ready.then(() => { refreshRig(); setDraw(0); });
  enter();
  replay.addEventListener('click', resetAll);
}

/* ============================================================
   RECORDING HOOK — the rig draws + fires after its pre-roll
   ============================================================ */
if (isRecord){
  window.bdayAPI = {
    start(){ autoFire(); },
    replay(){ resetAll(); },
  };
}

/* ============================================================
   SCENE 2 — SURPRISE GIFT BOX CONTROLLER
   ============================================================ */
const scene2        = $('scene2');
const giftBoxWrap   = $('giftBoxWrap');
const giftBurst     = $('giftBurst');
const nextScene2    = $('nextScene2');
let giftOpened      = false;

function triggerGiftConfetti(){
  if (!giftBurst) return;
  giftBurst.innerHTML = '';
  const colors = ['#ffd700', '#ff69b4', '#ff1493', '#ffa07a', '#ffffff', '#e83a72', '#ffcf6a'];
  const count = 36;
  for (let i = 0; i < count; i++){
    const p = document.createElement('span');
    p.className = 'gift-particle';
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 60 + Math.random() * 110;
    const size = 5 + Math.random() * 7;
    const color = colors[i % colors.length];
    const isHeart = i % 5 === 0;

    p.style.left = '50%';
    p.style.top = '48%';
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.position = 'absolute';
    p.style.pointerEvents = 'none';

    if (isHeart){
      p.textContent = '♥';
      p.style.color = '#ff3366';
      p.style.fontSize = '16px';
      p.style.lineHeight = '1';
    } else {
      p.style.background = color;
      p.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
    }

    giftBurst.appendChild(p);

    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 50;
    const rot = (Math.random() - 0.5) * 720;

    gsap.fromTo(p,
      { x: 0, y: 0, scale: 0.2, opacity: 1 },
      {
        x: tx,
        y: ty + 35,
        rotation: rot,
        scale: 1,
        opacity: 0,
        duration: 1.3 + Math.random() * 0.8,
        ease: 'power2.out',
        onComplete: () => p.remove()
      }
    );
  }
}

function openGiftBox(){
  if (giftOpened || !scene2) return;
  giftOpened = true;
  scene2.classList.add('gift-open');

  if (!reduceMotion){
    triggerGiftConfetti();
  }

  // Fade in Scene 2's Next button once the card animates up
  const delay = reduceMotion ? 100 : 1100;
  setTimeout(() => {
    if (nextScene2){
      nextScene2.hidden = false;
      requestAnimationFrame(() => nextScene2.classList.add('is-shown'));
    }
  }, delay);
}

if (giftBoxWrap){
  giftBoxWrap.addEventListener('click', openGiftBox);
  giftBoxWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      openGiftBox();
    }
  });
}
if (nextScene2){
  nextScene2.addEventListener('click', () => goToScene(3));
}

/* ============================================================
   SCENE 3 — SECRET PIN KEEPSAKE CARD CONTROLLER
   ============================================================ */
// Plain JS constant for the 4-digit PIN (can be hand-edited anytime)
const CORRECT_PIN = '1234';

const scene3            = $('scene3');
const pinCard           = $('pinCard');
const pinClock          = $('pinClock');
const pinDotsWrap       = $('pinDots');
const pinDots           = pinDotsWrap ? pinDotsWrap.querySelectorAll('.pin-dot') : [];
const pinStatusPill     = $('pinStatusPill');
const pinInstruction    = $('pinInstruction');
const pinInputArea      = $('pinInputArea');
const pinKeypad         = $('pinKeypad');
const pinSuccessContent = $('pinSuccessContent');
const nextScene3        = $('nextScene3');
const pinRelockBtn      = $('pinRelockBtn');

let enteredPin  = '';
let pinLocked   = true;
let isVerifying = false;
let clockTimer  = 0;

/* --- Web Audio Synthesizer (Fails silently if blocked) --- */
let audioCtx = null;
function getAudioCtx(){
  if (!audioCtx){
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    } catch(e){}
  }
  if (audioCtx && audioCtx.state === 'suspended'){
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, type, duration, gainLevel = 0.08){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e){}
}

function playKeyClickSound(){
  playTone(587.33, 'sine', 0.06, 0.07); // D5
}

function playDeleteSound(){
  playTone(440, 'sine', 0.05, 0.06); // A4
}

function playErrorBuzzSound(){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch(e){}
}

function playSuccessChime(){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.09, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch(e){}
      }, idx * 110);
    });
  } catch(e){}
}

/* --- Live Clock --- */
function updateClock(){
  if (!pinClock) return;
  const now = new Date();
  pinClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function startClock(){
  updateClock();
  if (!clockTimer){
    clockTimer = setInterval(updateClock, 1000);
  }
}

function stopClock(){
  if (clockTimer){
    clearInterval(clockTimer);
    clockTimer = 0;
  }
}

/* --- PIN UI Updating --- */
function updatePinDots(){
  pinDots.forEach((dot, idx) => {
    if (idx < enteredPin.length){
      dot.classList.add('is-filled');
    } else {
      dot.classList.remove('is-filled');
    }
  });
}

function handleDigitInput(digit){
  if (!pinLocked || isVerifying || enteredPin.length >= 4) return;
  playKeyClickSound();
  enteredPin += digit;
  updatePinDots();

  if (enteredPin.length === 4){
    verifyEnteredPin();
  }
}

function handleDeleteDigit(){
  if (!pinLocked || isVerifying || enteredPin.length === 0) return;
  playDeleteSound();
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
}

function verifyEnteredPin(){
  isVerifying = true;
  if (enteredPin === CORRECT_PIN){
    // Correct PIN!
    playSuccessChime();
    pinLocked = false;
    
    setTimeout(() => {
      if (pinCard) pinCard.classList.add('is-unlocked');
      if (pinInstruction) pinInstruction.textContent = 'unlocked with love ♥';
      if (pinSuccessContent) {
        pinSuccessContent.hidden = false;
        pinSuccessContent.setAttribute('aria-hidden', 'false');
      }
      if (nextScene3) {
        nextScene3.hidden = false;
        requestAnimationFrame(() => nextScene3.classList.add('is-shown'));
      }
      isVerifying = false;
    }, reduceMotion ? 50 : 650);

  } else {
    // Wrong PIN
    playErrorBuzzSound();
    if (pinDotsWrap) pinDotsWrap.classList.add('is-error');
    if (pinStatusPill) {
      pinStatusPill.className = 'pin-status-pill pin-error';
      pinStatusPill.textContent = 'Incorrect PIN. Try again.';
    }

    setTimeout(() => {
      enteredPin = '';
      updatePinDots();
      if (pinDotsWrap) pinDotsWrap.classList.remove('is-error');
      if (pinStatusPill) {
        pinStatusPill.className = 'pin-status-pill pin-hint';
        pinStatusPill.textContent = 'hint: our favourite number';
      }
      isVerifying = false;
    }, 600);
  }
}

function resetPinScene(){
  enteredPin = '';
  pinLocked = true;
  isVerifying = false;
  if (pinCard) pinCard.classList.remove('is-unlocked');
  if (pinInstruction) pinInstruction.textContent = 'enter the code to unlock it';
  if (pinStatusPill){
    pinStatusPill.className = 'pin-status-pill pin-hint';
    pinStatusPill.textContent = 'hint: our favourite number';
  }
  if (pinSuccessContent){
    pinSuccessContent.hidden = true;
    pinSuccessContent.setAttribute('aria-hidden', 'true');
  }
  if (nextScene3){
    nextScene3.classList.remove('is-shown');
    nextScene3.hidden = true;
  }
  updatePinDots();
}

function playScene3(){
  if (!scene3) return;
  resetPinScene();
  scene3.classList.add('is-active');
  scene3.setAttribute('aria-hidden', 'false');
  startClock();
}

/* Keypad Clicks */
if (pinKeypad){
  pinKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.keypad-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    if (key !== undefined){
      handleDigitInput(key);
    } else if (action === 'delete'){
      handleDeleteDigit();
    }
  });
}

/* Physical Keyboard */
window.addEventListener('keydown', (e) => {
  if (!scene3 || !scene3.classList.contains('is-active') || !pinLocked) return;
  if (e.key >= '0' && e.key <= '9'){
    handleDigitInput(e.key);
  } else if (e.key === 'Backspace' || e.key === 'Delete'){
    handleDeleteDigit();
  }
});

if (pinRelockBtn){
  pinRelockBtn.addEventListener('click', resetPinScene);
}
if (nextScene3){
  nextScene3.addEventListener('click', () => goToScene(4));
}

/* ============================================================
   SCENE 4 — THEATRICAL CURTAIN REVEAL CONTROLLER
   ============================================================ */
const scene4          = $('scene4');
const openCurtainsBtn = $('openCurtainsBtn');
const nextScene4      = $('nextScene4');

function openCurtains(){
  if (!scene4) return;
  scene4.classList.add('curtains-open');

  // Fade in Scene 4's Next button once reveal content finishes animating in (~1.6s)
  const delay = reduceMotion ? 100 : 1600;
  setTimeout(() => {
    if (nextScene4 && scene4.classList.contains('curtains-open')){
      nextScene4.hidden = false;
      requestAnimationFrame(() => nextScene4.classList.add('is-shown'));
    }
  }, delay);
}

function closeCurtains(){
  if (!scene4) return;
  scene4.classList.remove('curtains-open');
  if (nextScene4){
    nextScene4.classList.remove('is-shown');
    nextScene4.hidden = true;
  }
}

if (openCurtainsBtn){
  openCurtainsBtn.addEventListener('click', openCurtains);
}
if (nextScene4){
  nextScene4.addEventListener('click', () => goToScene(5));
}

/* ============================================================
   SCENE 5 — BIRTHDAY CAKE & LIFETIME COUNTDOWN CONTROLLER
   ============================================================ */
// Birthdate configuration (defaults to 20 years ago: 2006-01-01)
const BIRTHDATE_STR = '2006-01-01T00:00:00Z';

const scene5          = $('scene5');
const statYears       = $('statYears');
const statDays        = $('statDays');
const statHours       = $('statHours');
const statMinutes     = $('statMinutes');
const cakeWrap        = $('cakeWrap');
const candleDigit0    = $('candleDigit0');
const candleDigit1    = $('candleDigit1');
const cakePromptUI    = $('cakePromptUI');
const cakeSuccessUI   = $('cakeSuccessUI');
const cakeRelightBtn  = $('cakeRelightBtn');
const cakeMicBtn      = $('cakeMicBtn');
const cakeMicLabel    = $('cakeMicLabel');
const nextScene5      = $('nextScene5');
const cakeConfettiWrap= $('cakeConfettiWrap');

let cakeBlown = false;
let statsInterval = 0;
let micActive = false;
let micStream = null;
let micAudioCtx = null;
let micAnalyser = null;
let micAnimId = 0;

function calculateLifetimeStats(){
  const birthdate = new Date(BIRTHDATE_STR);
  const now = new Date();

  let years = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) {
    years--;
  }

  const elapsedMs = Math.max(0, now.getTime() - birthdate.getTime());
  const days    = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const hours   = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor(elapsedMs / (1000 * 60));

  const fmt = (n) => new Intl.NumberFormat().format(n);

  if (statYears)   statYears.textContent   = fmt(years);
  if (statDays)    statDays.textContent    = fmt(days);
  if (statHours)   statHours.textContent   = fmt(hours);
  if (statMinutes) statMinutes.textContent = fmt(minutes);

  // Set candle digits to age (e.g. 20 -> '2' and '0')
  const ageStr = Math.max(0, years).toString().padStart(2, '0');
  if (candleDigit0) candleDigit0.textContent = ageStr[ageStr.length - 2] || '2';
  if (candleDigit1) candleDigit1.textContent = ageStr[ageStr.length - 1] || '0';
}

function triggerCakeConfetti(){
  if (!cakeConfettiWrap) return;
  cakeConfettiWrap.innerHTML = '';

  const colors = ['#ffcf6a', '#e8a23d', '#d4235c', '#ff5f86', '#fff3ea', '#a80f43'];
  const shapes = ['circle', 'square', 'heart', 'star'];
  const count = reduceMotion ? 15 : 60;

  for (let i = 0; i < count; i++){
    const p = document.createElement('div');
    p.className = 'cake-confetti-p';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.floor(Math.random() * 8) + 8; // 8 - 15px

    if (shape === 'heart'){
      p.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    } else if (shape === 'star'){
      p.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    } else {
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = color;
      p.style.borderRadius = shape === 'circle' ? '50%' : '2px';
    }

    p.style.left = '50%';
    p.style.top = '50%';
    cakeConfettiWrap.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 220;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 40;
    const rot = (Math.random() - 0.5) * 720;
    const duration = 1.4 + Math.random() * 1.0;

    gsap.fromTo(p,
      { x: 0, y: 0, scale: 0.1, opacity: 1 },
      {
        x: tx,
        y: ty + 40,
        rotation: rot,
        scale: 1,
        opacity: 0,
        duration: duration,
        ease: 'power2.out',
        onComplete: () => p.remove()
      }
    );
  }
}

function stopMic(){
  if (micAnimId) {
    cancelAnimationFrame(micAnimId);
    micAnimId = 0;
  }
  if (micStream){
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micAudioCtx){
    try { micAudioCtx.close(); } catch(e) {}
    micAudioCtx = null;
  }
  micAnalyser = null;
  micActive = false;
  if (cakeMicBtn) cakeMicBtn.classList.remove('is-active');
  if (cakeMicLabel) cakeMicLabel.textContent = 'Blow with your breath';
}

async function startMic(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream = stream;
    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micAnalyser = micAudioCtx.createAnalyser();

    const source = micAudioCtx.createMediaStreamSource(stream);
    source.connect(micAnalyser);
    micAnalyser.fftSize = 256;

    const bufferLength = micAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    micActive = true;
    if (cakeMicBtn) cakeMicBtn.classList.add('is-active');
    if (cakeMicLabel) cakeMicLabel.textContent = 'Listening for breath...';

    function checkVolume(){
      if (!micAnalyser || cakeBlown) return;
      micAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < 20; i++){
        sum += dataArray[i];
      }
      const avg = sum / 20;

      if (avg > 115 && !cakeBlown){
        blowCandles();
      } else {
        micAnimId = requestAnimationFrame(checkVolume);
      }
    }

    checkVolume();
  } catch (err){
    console.warn('Microphone access not granted or supported. Tap to blow is active.', err);
    if (cakeMicLabel) cakeMicLabel.textContent = 'Tap cake to blow';
    setTimeout(() => {
      if (cakeMicLabel) cakeMicLabel.textContent = 'Blow with your breath';
    }, 2000);
    stopMic();
  }
}

function blowCandles(){
  if (cakeBlown) return;
  cakeBlown = true;
  stopMic();

  if (cakeWrap){
    cakeWrap.classList.add('is-blown');
  }

  // Trigger celebratory confetti burst
  triggerCakeConfetti();

  // Hide prompt UI, reveal wish success UI
  if (cakePromptUI){
    cakePromptUI.style.opacity = '0';
    cakePromptUI.style.pointerEvents = 'none';
  }

  const delay = reduceMotion ? 100 : 900;
  setTimeout(() => {
    if (cakePromptUI) cakePromptUI.hidden = true;
    if (cakeSuccessUI){
      cakeSuccessUI.hidden = false;
    }
    if (nextScene5){
      nextScene5.hidden = false;
      requestAnimationFrame(() => nextScene5.classList.add('is-shown'));
    }
  }, delay);
}

function relightCake(){
  cakeBlown = false;
  if (cakeWrap){
    cakeWrap.classList.remove('is-blown');
  }
  if (cakeSuccessUI){
    cakeSuccessUI.hidden = true;
  }
  if (cakePromptUI){
    cakePromptUI.hidden = false;
    cakePromptUI.style.opacity = '1';
    cakePromptUI.style.pointerEvents = 'auto';
  }
  if (nextScene5){
    nextScene5.classList.remove('is-shown');
  }
}

function playScene5(){
  calculateLifetimeStats();
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(calculateLifetimeStats, 60000);

  // Reset blown state for fresh viewing if needed
  relightCake();
}

// Event Listeners for Scene 5
if (cakeWrap){
  cakeWrap.addEventListener('click', () => {
    if (!cakeBlown) blowCandles();
  });
  cakeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (!cakeBlown) blowCandles();
    }
  });
}

if (cakeMicBtn){
  cakeMicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (micActive) {
      stopMic();
    } else {
      startMic();
    }
  });
}

if (cakeRelightBtn){
  cakeRelightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    relightCake();
  });
}

if (nextScene5){
  nextScene5.addEventListener('click', () => goToScene(6));
}

/* ============================================================
   SCENE 6 — THE MEMORY WALL CONTROLLER
   ============================================================ */
const scene6           = $('scene6');
const memoryWipe       = $('memoryWipe');
const memoryEyebrow    = $('memoryEyebrow');
const memoryBoardWrap  = $('memoryBoardWrap');
const memoryBoard      = $('memoryBoard');
const memoryTwineSvg   = $('memoryTwineSvg');
const memoryTwinePath  = $('memoryTwinePath');
const memoryClosing    = $('memoryClosing');
const nextScene6       = $('nextScene6');
const memoryFrames     = memoryBoard ? Array.from(memoryBoard.querySelectorAll('.memory-frame')) : [];

function updateTwinePath(){
  if (!memoryTwineSvg || !memoryTwinePath || !memoryBoardWrap) return 0;
  const svgRect = memoryTwineSvg.getBoundingClientRect();
  if (svgRect.width === 0 || svgRect.height === 0) return 0;

  // Connecting order through the 6 frames (snaking top-left -> top-right -> mid-right -> mid-left -> bottom-left -> bottom-right)
  const sequence = [0, 1, 3, 2, 4, 5];
  const points = [];

  sequence.forEach(idx => {
    const frame = memoryFrames[idx];
    if (!frame) return;
    const pin = frame.querySelector('.frame-pin');
    if (!pin) return;
    const pinRect = pin.getBoundingClientRect();
    const px = pinRect.left + pinRect.width / 2 - svgRect.left;
    const py = pinRect.top + pinRect.height / 2 - svgRect.top;
    points.push({ x: px, y: py });
  });

  if (points.length < 2) return 0;

  // Build catenary curve with natural gentle droop between pins
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++){
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const droop = Math.min(26, Math.max(10, dist * 0.08));
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2 + droop;
    d += ` Q ${cx.toFixed(1)},${cy.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  memoryTwinePath.setAttribute('d', d);
  try {
    return memoryTwinePath.getTotalLength();
  } catch (e) {
    return 0;
  }
}

function activateAmbientSway(){
  if (reduceMotion) return;
  memoryFrames.forEach(f => {
    const tilt = f.dataset.tilt || '0';
    f.style.setProperty('--base-tilt', `${tilt}deg`);
    f.classList.add('has-ambient');
  });
}

function revealClosingHeadline(){
  const inner = memoryClosing ? memoryClosing.querySelector('.memory-closing-inner') : null;
  if (!inner) return;

  if (reduceMotion){
    inner.style.opacity = '1';
    inner.style.transform = 'none';
    if (nextScene6){
      nextScene6.hidden = false;
      nextScene6.classList.add('is-shown');
    }
    return;
  }

  gsap.fromTo(inner,
    { opacity: 0, rotateX: -80, y: 20 },
    {
      opacity: 1,
      rotateX: 0,
      y: 0,
      duration: 0.9,
      ease: 'back.out(1.4)',
      onComplete: () => {
        if (nextScene6){
          nextScene6.hidden = false;
          requestAnimationFrame(() => nextScene6.classList.add('is-shown'));
        }
        activateAmbientSway();
      }
    }
  );
}

function playScene6(){
  if (!scene6) return;

  // Initialize frame base tilts and hide initial ambient motion
  memoryFrames.forEach(f => {
    const tilt = f.dataset.tilt || '0';
    f.style.setProperty('--base-tilt', `${tilt}deg`);
    f.classList.remove('has-ambient');
  });

  if (reduceMotion){
    if (memoryEyebrow) gsap.set(memoryEyebrow, { opacity: 1, y: 0 });
    memoryFrames.forEach(f => {
      const tilt = parseFloat(f.dataset.tilt || 0);
      gsap.set(f, { opacity: 1, x: 0, y: 0, rotation: tilt, scale: 1 });
    });
    updateTwinePath();
    if (memoryTwinePath) {
      memoryTwinePath.style.strokeDasharray = 'none';
      memoryTwinePath.style.strokeDashoffset = '0';
    }
    revealClosingHeadline();
    return;
  }

  // Master timeline for Scene 6
  const tl = gsap.timeline();

  // 1. Soft Light Wipe Transition entering Scene 6
  if (memoryWipe){
    tl.fromTo(memoryWipe,
      { opacity: 0, scale: 1.1 },
      { opacity: 0.92, scale: 1.0, duration: 0.45, ease: 'power2.in' }
    )
    .to(memoryWipe, {
      opacity: 0,
      scale: 0.96,
      duration: 0.65,
      ease: 'power2.out',
      delay: 0.05
    });
  }

  // 2. Eyebrow reveals softly
  if (memoryEyebrow){
    tl.fromTo(memoryEyebrow,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      '-=0.3'
    );
  }

  // 3. Off-screen flight coordinates for each frame
  const origins = [
    { x: -window.innerWidth * 0.7, y: -250, r: -35 },
    { x: window.innerWidth * 0.7, y: -200, r: 35 },
    { x: -window.innerWidth * 0.8, y: 80, r: -25 },
    { x: window.innerWidth * 0.8, y: 120, r: 35 },
    { x: -window.innerWidth * 0.6, y: 350, r: -20 },
    { x: window.innerWidth * 0.6, y: 400, r: 25 }
  ];

  // 4. Frames fly in one by one and settle with overshoot
  memoryFrames.forEach((frame, i) => {
    const origin = origins[i] || { x: 0, y: -300, r: 0 };
    const tilt = parseFloat(frame.dataset.tilt || 0);

    tl.fromTo(frame,
      {
        opacity: 0,
        x: origin.x,
        y: origin.y,
        rotation: origin.r,
        scale: 0.65
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotation: tilt,
        scale: 1,
        duration: 0.75,
        ease: 'back.out(1.5)'
      },
      `-=${i === 0 ? 0.2 : 0.45}`
    );
  });

  // 5. Draw connecting twine stroke-by-stroke across settled pins
  tl.call(() => {
    const length = updateTwinePath();
    if (length && length > 0){
      memoryTwinePath.style.strokeDasharray = length;
      memoryTwinePath.style.strokeDashoffset = length;
      gsap.to(memoryTwinePath, {
        strokeDashoffset: 0,
        duration: 1.8,
        ease: 'power2.inOut',
        onComplete: revealClosingHeadline
      });
    } else {
      revealClosingHeadline();
    }
  });
}

// Window resize listener to keep twine aligned if dimensions change
window.addEventListener('resize', () => {
  if (scene6 && scene6.classList.contains('is-active')){
    const len = updateTwinePath();
    if (len && memoryTwinePath){
      memoryTwinePath.style.strokeDasharray = 'none';
      memoryTwinePath.style.strokeDashoffset = '0';
    }
  }
});

if (nextScene6){
  nextScene6.addEventListener('click', () => goToScene(7));
}

/* ============================================================
   MASTER SCENE ORCHESTRATOR
   Chain: Act 1 -> Scene 2 (Gift Box) -> Scene 3 (PIN Lock) -> Scene 4 (Curtains) -> Scene 5 (Cake) -> Scene 6 (Memory Wall) -> Scene 7 (Confetti Cannon)
   ============================================================ */
function goToScene(sceneNum){
  if (sceneNum === 2){
    // Hide Scene 1 controls
    if (replay){
      replay.classList.remove('is-shown', 'has-next');
      replay.hidden = true;
    }
    if (nextScene1){
      nextScene1.classList.remove('is-shown');
      nextScene1.hidden = true;
    }
    showWish(false);

    // Stop tree frame loop to conserve resources
    if (treeRAF){
      cancelAnimationFrame(treeRAF);
      treeRAF = 0;
    }

    // Activate Scene 2 (Gift Box)
    if (scene2){
      scene2.classList.add('is-active');
      scene2.setAttribute('aria-hidden', 'false');

      if (reduceMotion){
        openGiftBox();
      }
    }
  } else if (sceneNum === 3){
    // Hide Scene 2 and hand off to Scene 3 (Secret PIN Lock)
    if (scene2){
      scene2.classList.remove('is-active');
      scene2.setAttribute('aria-hidden', 'true');
    }
    playScene3();
  } else if (sceneNum === 4){
    // Hide Scene 3 and activate Scene 4 (Curtain Reveal)
    if (scene3){
      scene3.classList.remove('is-active');
      scene3.setAttribute('aria-hidden', 'true');
      stopClock();
    }
    if (scene4){
      scene4.classList.add('is-active');
      scene4.setAttribute('aria-hidden', 'false');

      if (reduceMotion){
        openCurtains();
      }
    }
  } else if (sceneNum === 5){
    // Hide Scene 4 and activate Scene 5 (Cake & Countdown)
    if (scene4){
      scene4.classList.remove('is-active');
      scene4.setAttribute('aria-hidden', 'true');
    }
    if (scene5){
      scene5.classList.add('is-active');
      scene5.setAttribute('aria-hidden', 'false');
      playScene5();
    }
  } else if (sceneNum === 6){
    // Hide Scene 5 and activate Scene 6 (Memory Wall)
    if (scene5){
      scene5.classList.remove('is-active');
      scene5.setAttribute('aria-hidden', 'true');
      stopMic();
      if (statsInterval){
        clearInterval(statsInterval);
        statsInterval = 0;
      }
    }
    if (scene6){
      scene6.classList.add('is-active');
      scene6.setAttribute('aria-hidden', 'false');
      playScene6();
    }
  } else if (sceneNum === 7){
    // Hide Scene 6 and activate Scene 7 (Vintage Film-Strip)
    if (scene6){
      scene6.classList.remove('is-active');
      scene6.setAttribute('aria-hidden', 'true');
    }
    if (scene7){
      scene7.classList.add('is-active');
      scene7.setAttribute('aria-hidden', 'false');
      playScene7();
    }
  } else if (sceneNum === 8){
    // Hide Scene 7 and activate Scene 8 (Constellation of Us)
    if (scene7){
      scene7.classList.remove('is-active');
      scene7.setAttribute('aria-hidden', 'true');
      if (filmScrollTween) { filmScrollTween.kill(); filmScrollTween = null; }
      if (filmAmbientTween) { filmAmbientTween.kill(); filmAmbientTween = null; }
    }
    if (scene8){
      scene8.classList.add('is-active');
      scene8.setAttribute('aria-hidden', 'false');
      playScene8();
    }
  } else if (sceneNum === 9){
    // Hide Scene 8 and activate Scene 9 (The Handwritten Letter)
    if (scene8){
      scene8.classList.remove('is-active');
      scene8.setAttribute('aria-hidden', 'true');
      if (constellationTimeline) { constellationTimeline.kill(); constellationTimeline = null; }
    }
    if (scene9){
      scene9.classList.add('is-active');
      scene9.setAttribute('aria-hidden', 'false');
      playScene9();
    }
  } else if (sceneNum === 10){
    console.log('TODO: goToScene(10) — Scene 10 (Fireworks) coming soon!');
    if (scene9){
      scene9.classList.remove('is-active');
      scene9.setAttribute('aria-hidden', 'true');
      if (letterTimeline) { letterTimeline.kill(); letterTimeline = null; }
    }
  }
}

/* ============================================================
   SCENE 7 — VINTAGE FILM-STRIP CONTROLLER
   ============================================================ */
const scene7              = $('scene7');
const projectorFlash      = $('projectorFlash');
const filmViewport        = $('filmViewport');
const filmStrip           = $('filmStrip');
const filmFramesWrap      = $('filmFrames');
const filmFrames          = filmFramesWrap ? Array.from(filmFramesWrap.querySelectorAll('.film-frame')) : [];
const filmClimaxHeadline  = $('filmClimaxHeadline');
const nextScene7          = $('nextScene7');

let filmScrollTween = null;
let filmAmbientTween = null;

function triggerProjectorFlicker(onDone){
  if (!projectorFlash || reduceMotion){
    if (onDone) onDone();
    return;
  }
  // Authentic 24fps cinema projector shutter flicker
  const tl = gsap.timeline({ onComplete: onDone });
  tl.set(projectorFlash, { opacity: 0 })
    .to(projectorFlash, { opacity: 0.85, duration: 0.08, ease: 'power1.in' })
    .to(projectorFlash, { opacity: 0.12, duration: 0.06 })
    .to(projectorFlash, { opacity: 0.7, duration: 0.09 })
    .to(projectorFlash, { opacity: 0.05, duration: 0.07 })
    .to(projectorFlash, { opacity: 0.45, duration: 0.08 })
    .to(projectorFlash, { opacity: 0, duration: 0.22, ease: 'power2.out' });
}

function checkFrameFocus(){
  if (!filmViewport) return;
  const vpRect = filmViewport.getBoundingClientRect();
  const vpCenter = vpRect.top + vpRect.height / 2;
  const tolerance = vpRect.height * 0.24;

  filmFrames.forEach(f => {
    const fRect = f.getBoundingClientRect();
    const fCenter = fRect.top + fRect.height / 2;
    const dist = Math.abs(fCenter - vpCenter);
    if (dist < tolerance){
      f.classList.add('is-focused');
    } else {
      f.classList.remove('is-focused');
    }
  });
}

function revealClimaxHeadline(){
  if (!filmClimaxHeadline) return;

  if (reduceMotion){
    filmClimaxHeadline.classList.add('is-burned-in');
    if (nextScene7){
      nextScene7.hidden = false;
      nextScene7.classList.add('is-shown');
    }
    return;
  }

  filmClimaxHeadline.classList.add('is-burned-in');

  setTimeout(() => {
    if (nextScene7){
      nextScene7.hidden = false;
      requestAnimationFrame(() => nextScene7.classList.add('is-shown'));
    }
    startAmbientFilmDrift();
  }, 1000);
}

function startAmbientFilmDrift(){
  if (reduceMotion || !filmStrip) return;
  filmAmbientTween = gsap.to(filmStrip, {
    y: '+=14',
    duration: 3.4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
}

function playScene7(){
  if (!scene7) return;

  if (filmScrollTween) { filmScrollTween.kill(); filmScrollTween = null; }
  if (filmAmbientTween) { filmAmbientTween.kill(); filmAmbientTween = null; }

  if (filmClimaxHeadline){
    filmClimaxHeadline.classList.remove('is-burned-in');
  }
  if (nextScene7){
    nextScene7.classList.remove('is-shown');
    nextScene7.hidden = true;
  }

  filmFrames.forEach(f => f.classList.remove('is-focused'));

  if (reduceMotion){
    const f4 = $('fFrame4');
    if (f4 && filmViewport && filmStrip){
      const targetY = -(f4.offsetTop - (filmViewport.offsetHeight / 2 - f4.offsetHeight / 2));
      gsap.set(filmStrip, { y: targetY });
      f4.classList.add('is-focused');
    }
    revealClimaxHeadline();
    return;
  }

  gsap.set(filmStrip, { y: 60 });

  triggerProjectorFlicker(() => {
    const f4 = $('fFrame4');
    if (!f4 || !filmViewport || !filmStrip) {
      revealClimaxHeadline();
      return;
    }

    const targetY = -(f4.offsetTop - (filmViewport.offsetHeight / 2 - f4.offsetHeight / 2));

    filmScrollTween = gsap.to(filmStrip, {
      y: targetY,
      duration: 6.0,
      ease: 'power1.inOut',
      onUpdate: checkFrameFocus,
      onComplete: () => {
        f4.classList.add('is-focused');
        revealClimaxHeadline();
      }
    });
  });
}

if (nextScene7){
  nextScene7.addEventListener('click', () => goToScene(8));
}

/* ============================================================
   SCENE 8 — CONSTELLATION OF US CONTROLLER
   ============================================================ */
const scene8               = $('scene8');
const constellationVeil    = $('constellationVeil');
const constellationClosing = $('constellationClosing');
const nextScene8           = $('nextScene8');

const timelineItems = [
  $('timelineItem0'),
  $('timelineItem1'),
  $('timelineItem2'),
  $('timelineItem3'),
  $('timelineItem4'),
  $('timelineItem5')
];

let constellationTimeline = null;

function resetConstellationScene(){
  if (constellationTimeline){
    constellationTimeline.kill();
    constellationTimeline = null;
  }

  timelineItems.forEach(item => {
    if (item){
      item.classList.remove('is-revealed', 'is-highlighted', 'is-pulsing');
    }
  });

  if (constellationClosing){
    const inner = constellationClosing.querySelector('.constellation-closing-inner');
    if (inner){
      gsap.set(inner, { opacity: 0, rotateX: -80, y: 15 });
    }
  }

  if (nextScene8){
    nextScene8.classList.remove('is-shown');
    nextScene8.hidden = true;
  }
}

function playScene8(){
  if (!scene8) return;
  resetConstellationScene();

  const closingInner = constellationClosing ? constellationClosing.querySelector('.constellation-closing-inner') : null;

  if (reduceMotion){
    timelineItems.forEach(item => {
      if (item) item.classList.add('is-revealed');
    });
    if (constellationVeil){
      gsap.set(constellationVeil, { opacity: 0 });
    }
    if (closingInner){
      gsap.set(closingInner, { opacity: 1, rotateX: 0, y: 0 });
    }
    if (nextScene8){
      nextScene8.hidden = false;
      nextScene8.classList.add('is-shown');
    }
    return;
  }

  constellationTimeline = gsap.timeline();

  // 1. Fade veil out into deep nocturnal velvet sky
  if (constellationVeil){
    constellationTimeline.fromTo(constellationVeil,
      { opacity: 0.9, scale: 1 },
      { opacity: 0, scale: 1.05, duration: 0.9, ease: 'power2.out' }
    );
  }

  // 2. Progressive sequential reveal: 6 timeline items appear step-by-step down the central spine
  timelineItems.forEach((item, idx) => {
    const delay = idx === 0 ? '+=0.2' : '+=0.7';
    constellationTimeline.add(() => {
      if (item){
        item.classList.add('is-revealed');
      }
    }, delay);
  });

  // 3. Unison Constellation Pulse across all star dots
  constellationTimeline.add(() => {
    timelineItems.forEach(item => {
      if (item) item.classList.add('is-pulsing');
    });
    if (timelineItems[5]){
      timelineItems[5].classList.add('is-highlighted');
    }
  }, '+=0.5');

  constellationTimeline.add(() => {
    timelineItems.forEach(item => {
      if (item) item.classList.remove('is-pulsing');
    });
    if (timelineItems[5]){
      timelineItems[5].classList.remove('is-highlighted');
    }
  }, '+=0.8');

  // 4. 3D Hinge Reveal of Closing Headline
  if (closingInner){
    constellationTimeline.fromTo(closingInner,
      { opacity: 0, rotateX: -80, y: 20 },
      { opacity: 1, rotateX: 0, y: 0, duration: 1.0, ease: 'back.out(1.3)' },
      '+=0.2'
    );
  }

  // 5. Reveal Next Pill Button
  constellationTimeline.add(() => {
    if (nextScene8 && scene8 && scene8.classList.contains('is-active')){
      nextScene8.hidden = false;
      requestAnimationFrame(() => nextScene8.classList.add('is-shown'));
    }
  }, '+=0.35');
}

// Interactive Timeline Item Hover / Tap feedback
timelineItems.forEach(item => {
  if (!item) return;

  const triggerHighlight = () => {
    if (!item.classList.contains('is-revealed')) return;
    item.classList.add('is-highlighted');
  };

  const clearHighlight = () => {
    item.classList.remove('is-highlighted');
  };

  item.addEventListener('pointerenter', triggerHighlight);
  item.addEventListener('pointerleave', clearHighlight);
  item.addEventListener('click', () => {
    triggerHighlight();
    setTimeout(clearHighlight, 700);
  });
});

if (nextScene8){
  nextScene8.addEventListener('click', () => goToScene(9));
}

/* ============================================================
   SCENE 9 — ENVELOPE & TYPEWRITER LETTER CONTROLLER
   ============================================================ */
const scene9             = $('scene9');
const letterVeil         = $('letterVeil');
const envelopeWrapper    = $('envelopeWrapper');
const envelope           = $('envelope');
const envelopeFlap       = $('envelopeFlap');
const envelopeHeart      = $('envelopeHeart');
const envelopeHint       = $('envelopeHint');
const letterContainer    = $('letterContainer');
const letterCardScroll   = $('letterCardScroll');
const typewriterText     = $('typewriterText');
const nextScene9         = $('nextScene9');

const LETTER_TEXT =
  "Dear troublemaker,\n\nThank you for every ridiculous memory and the ones we haven't made yet.\n\nHappy Birthday. I mean it.";

let typeWriterStarted    = false;
let typeWriterTimeoutId  = null;

function resetScene9(){
  if (typeWriterTimeoutId){
    clearTimeout(typeWriterTimeoutId);
    typeWriterTimeoutId = null;
  }
  typeWriterStarted = false;

  // Reset envelope
  if (envelopeWrapper){
    envelopeWrapper.classList.remove('is-hidden');
    gsap.set(envelopeWrapper, { clearProps: 'all' });
  }
  if (envelopeFlap){
    gsap.set(envelopeFlap, { clearProps: 'all' });
  }
  if (envelopeHeart){
    gsap.set(envelopeHeart, { clearProps: 'all' });
  }

  // Reset letter card container & text
  if (letterContainer){
    letterContainer.classList.add('is-hidden');
    letterContainer.classList.remove('is-breathing');
    gsap.set(letterContainer, { clearProps: 'all' });
  }
  if (typewriterText){
    typewriterText.innerHTML = '';
  }
  if (letterCardScroll){
    letterCardScroll.scrollTop = 0;
  }

  // Reset cursor if exists
  const existingCursor = scene9 ? scene9.querySelector('.typewriter-cursor') : null;
  if (existingCursor){
    existingCursor.remove();
  }

  // Reset next button
  if (nextScene9){
    nextScene9.classList.remove('is-shown');
    nextScene9.hidden = true;
  }
}

function startTypewriter(){
  if (!typewriterText) return;
  typewriterText.innerHTML = '';
  const text = LETTER_TEXT;
  const speed = 36; // ms per character (readable 30-45ms)
  let i = 0;

  // Insert blinking cursor
  const existingCursor = scene9 ? scene9.querySelector('.typewriter-cursor') : null;
  if (existingCursor) existingCursor.remove();

  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  typewriterText.parentNode.appendChild(cursor);

  function type(){
    if (i < text.length){
      const char = text.charAt(i);
      if (char === '\n'){
        typewriterText.innerHTML += '<br>';
      } else {
        typewriterText.innerHTML += char;
      }
      i++;

      // Auto-scroll the letter container downward so growing text stays in view
      if (letterCardScroll){
        letterCardScroll.scrollTop = letterCardScroll.scrollHeight;
      }

      typeWriterTimeoutId = setTimeout(type, speed);
    } else {
      // Typing finished
      if (cursor && cursor.parentNode){
        cursor.remove();
      }
      typeWriterStarted = false; // unlock interaction

      // Start continuous ambient breathing shadow
      if (letterContainer){
        letterContainer.classList.add('is-breathing');
      }

      // Pop / fade in shared Next pill button
      if (nextScene9 && scene9 && scene9.classList.contains('is-active')){
        nextScene9.hidden = false;
        requestAnimationFrame(() => nextScene9.classList.add('is-shown'));
      }
    }
  }

  typeWriterTimeoutId = setTimeout(type, 200);
}

function openEnvelope(){
  // Guard: while typing or opening transition is in progress, ignore taps
  if (typeWriterStarted) return;
  typeWriterStarted = true;

  if (reduceMotion){
    if (envelopeWrapper){
      envelopeWrapper.classList.add('is-hidden');
    }
    if (letterContainer){
      letterContainer.classList.remove('is-hidden');
    }
    if (typewriterText){
      typewriterText.innerHTML = LETTER_TEXT.replace(/\n/g, '<br>');
    }
    if (nextScene9){
      nextScene9.hidden = false;
      nextScene9.classList.add('is-shown');
    }
    typeWriterStarted = false;
    return;
  }

  const tl = gsap.timeline();

  // 1. Flap opens slightly and heart flares
  if (envelopeFlap){
    tl.to(envelopeFlap, {
      rotateX: 140,
      duration: 0.35,
      ease: 'power2.inOut'
    }, 0);
  }
  if (envelopeHeart){
    tl.to(envelopeHeart, {
      scale: 1.35,
      opacity: 0.9,
      duration: 0.25,
      ease: 'power2.out'
    }, 0.05);
  }

  // 2. Envelope lifts and dissolves away
  if (envelopeWrapper){
    tl.to(envelopeWrapper, {
      opacity: 0,
      y: -24,
      scale: 0.92,
      duration: 0.45,
      ease: 'power2.inOut',
      onComplete: () => {
        envelopeWrapper.classList.add('is-hidden');
      }
    }, 0.2);
  }

  // 3. Letter card glides and fades into view
  if (letterContainer){
    tl.add(() => {
      letterContainer.classList.remove('is-hidden');
    }, 0.5);

    tl.fromTo(letterContainer,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out',
        onComplete: () => {
          startTypewriter();
        }
      },
      0.5
    );
  }
}

function playScene9(){
  if (!scene9) return;
  resetScene9();

  if (reduceMotion){
    if (letterVeil){
      gsap.set(letterVeil, { opacity: 0 });
    }
    return;
  }

  // Warm parchment dissolve transition from Scene 8
  if (letterVeil){
    gsap.fromTo(letterVeil,
      { opacity: 0.95, scale: 1 },
      { opacity: 0, scale: 1.05, duration: 0.95, ease: 'power2.out' }
    );
  }
}

// User tap-to-open interaction on envelope
if (envelope){
  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      openEnvelope();
    }
  });
}
if (envelopeHint){
  envelopeHint.addEventListener('click', openEnvelope);
}

// Wire Scene 9 Next button to Scene 10 placeholder
if (nextScene9){
  nextScene9.addEventListener('click', () => goToScene(10));
}

// Wire up Act 1 Next button to Scene 2
if (nextScene1){
  nextScene1.addEventListener('click', () => goToScene(2));
}

// Global exposure for testing or debugging
window.openGiftBox   = openGiftBox;
window.playScene3    = playScene3;
window.openCurtains  = openCurtains;
window.closeCurtains = closeCurtains;
window.playScene5    = playScene5;
window.blowCandles   = blowCandles;
window.relightCake   = relightCake;
window.playScene6    = playScene6;
window.playScene7    = playScene7;
window.playScene8    = playScene8;
window.playScene9    = playScene9;
window.openEnvelope  = openEnvelope;
window.goToScene     = goToScene;

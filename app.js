/* TextRender 3D — rendu de texte 3D cartoon (style "NEXTBOT CREATION") en Canvas 2D. */
'use strict';

// ---------- Préréglages de couleurs ----------
// faceTop / faceMid / faceBottom : dégradé de la face avant
// extNear / extFar : couleur du relief (près de la face → au fond)
// outline : contour sombre
const PRESETS = {
  glace:  { name: 'Glace',  faceTop: '#ffffff', faceMid: '#e9edfa', faceBottom: '#9ba7d8', extNear: '#7584bd', extFar: '#353f73', outline: '#1a1e42' },
  feu:    { name: 'Feu',    faceTop: '#ffe95c', faceMid: '#ffb524', faceBottom: '#ff7400', extNear: '#e35f0c', extFar: '#8a2a03', outline: '#451302' },
  rouge:  { name: 'Rouge',  faceTop: '#ffa08f', faceMid: '#ff3d3d', faceBottom: '#c4121f', extNear: '#a50f1b', extFar: '#55060f', outline: '#2b0307' },
  vert:   { name: 'Vert',   faceTop: '#eaff86', faceMid: '#7fe03a', faceBottom: '#2e9e1c', extNear: '#24811a', extFar: '#0f420c', outline: '#07240a' },
  bleu:   { name: 'Bleu',   faceTop: '#b5f3ff', faceMid: '#3cb8ff', faceBottom: '#1660d8', extNear: '#1450b0', extFar: '#0a2766', outline: '#061433' },
  rose:   { name: 'Rose',   faceTop: '#ffd9f4', faceMid: '#ff6ad5', faceBottom: '#c8209e', extNear: '#a51a86', extFar: '#520c44', outline: '#2c0624' },
  violet: { name: 'Violet', faceTop: '#ecd5ff', faceMid: '#a65bff', faceBottom: '#6219c8', extNear: '#5016a6', extFar: '#260a52', outline: '#14052c' },
  or:     { name: 'Or',     faceTop: '#fff6b8', faceMid: '#ffd23a', faceBottom: '#d8901a', extNear: '#b8710f', extFar: '#5e3506', outline: '#2d1903' },
  noir:   { name: 'Noir',   faceTop: '#9a9fb8', faceMid: '#454a60', faceBottom: '#16181f', extNear: '#2c2f3d', extFar: '#0b0c12', outline: '#000000' },
};
const COLOR_KEYS = [
  ['faceTop', 'Face haut'], ['faceMid', 'Face milieu'], ['faceBottom', 'Face bas'],
  ['extNear', 'Relief clair'], ['extFar', 'Relief sombre'], ['outline', 'Contour'],
];

const SLIDERS = {
  layoutSliders: [
    ['spacing',  'Espacement des lettres', -0.15, 0.15, 0.005],
    ['lineGap',  'Écart entre les lignes', -0.3, 0.5, 0.01],
    ['jitter',   'Lettres penchées (°)',   0, 15, 0.5],
    ['jitterY',  'Lettres décalées',       0, 0.1, 0.005],
    ['rotation', 'Rotation globale (°)',  -20, 20, 0.5],
  ],
  depthSliders: [
    ['depth',       'Profondeur',          0, 0.4, 0.005],
    ['angle',       'Direction du relief (°)', 0, 180, 1],
    ['perspective', 'Perspective',         0, 1.5, 0.05],
    ['outline',     'Épaisseur du contour', 0, 0.08, 0.002],
    ['bevel',       'Brillance / biseau',  0, 1, 0.05],
    ['shadow',      'Ombre portée',        0, 1, 0.05],
  ],
};

const DEFAULTS = {
  text1: 'NEXTBOT', text2: 'CREATION',
  font: 'Lilita One', upper: true, sameWidth: true,
  spacing: -0.035, lineGap: 0.0, jitter: 4, jitterY: 0.02, rotation: 0,
  depth: 0.14, angle: 78, perspective: 0.45, outline: 0.03, bevel: 0.75, shadow: 0.5,
  transparent: true, bgColor: '#1b1f3a', exportScale: 2, seed: 7,
  lines: [{ preset: 'glace', ...PRESETS.glace }, { preset: 'feu', ...PRESETS.feu }],
};

const BASE_SIZE = 220; // taille de police de référence (px) pour l'aperçu

let state = load();

// ---------- Utilitaires ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('textrender3d'));
    if (s && s.lines) return { ...structuredClone(DEFAULTS), ...s };
  } catch (e) { /* stockage indisponible */ }
  return structuredClone(DEFAULTS);
}
function save() {
  try { localStorage.setItem('textrender3d', JSON.stringify(state)); } catch (e) { /* ignore */ }
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
function fontSpec(font) {
  const [family, weight = '400'] = font.split(':');
  return { family, weight };
}

// ---------- Mise en page ----------
function layoutLines(scale) {
  const { family, weight } = fontSpec(state.font);
  const meas = makeCanvas(1, 1).getContext('2d');
  const texts = [state.text1, state.text2].map(t => (state.upper ? t.toUpperCase() : t));
  const rand = mulberry32(state.seed);

  const natural = texts.map(text => {
    const size = BASE_SIZE * scale;
    meas.font = `${weight} ${size}px "${family}"`;
    const chars = [...text];
    const widths = chars.map(ch => meas.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * state.spacing * size;
    return { text, size, total };
  });

  // Les deux lignes ont la même largeur (comme sur le modèle) : on ajuste la taille de police.
  const nonEmpty = natural.filter(n => n.total > 0);
  const target = nonEmpty.length ? nonEmpty.reduce((a, n) => a + n.total, 0) / nonEmpty.length : 0;

  let y = 0;
  return natural.map((n, li) => {
    const size = state.sameWidth && n.total > 0 ? n.size * (target / n.total) : n.size;
    meas.font = `${weight} ${size}px "${family}"`;
    const chars = [...n.text];
    const widths = chars.map(ch => meas.measureText(ch).width);
    const cap = meas.measureText('H').actualBoundingBoxAscent || size * 0.7;
    const spacing = state.spacing * size;
    const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * spacing;

    if (li > 0) y += cap + state.lineGap * size + size * 0.06;
    const baseline = y;

    let x = -total / 2;
    const letters = chars.map((ch, i) => {
      const w = widths[i];
      const L = {
        ch, w,
        x: x + w / 2,
        y: baseline - cap / 2 + (rand() - 0.5) * 2 * state.jitterY * size, // centre vertical de la lettre
        rot: ((rand() - 0.5) * 2 * state.jitter * Math.PI) / 180,
      };
      x += w + spacing;
      return L;
    });
    return { li, letters, size, cap, total, font: `${weight} ${size}px "${family}"`, colors: state.lines[li] };
  });
}

// Exécute fn dans le repère local de la lettre (origine = centre, texte centré sur la ligne de base).
function inLetter(ctx, line, L, ox, oy, fn) {
  ctx.save();
  ctx.translate(L.x + ox, L.y + oy);
  ctx.rotate(L.rot);
  fn(ctx, line.cap / 2);
  ctx.restore();
}

function extrusionVector(line, L, halfWidth) {
  const a = (state.angle * Math.PI) / 180;
  const d = state.depth * line.size;
  let vx = Math.cos(a) * d;
  const vy = Math.sin(a) * d;
  // Perspective : les lettres fuient vers un point situé sous le centre du texte.
  vx += (-L.x / Math.max(1, halfWidth)) * state.perspective * d * 0.6;
  return [vx, vy];
}

// ---------- Rendu d'une ligne ----------
function renderLine(line, bounds) {
  const { size, colors } = line;
  const W = bounds.w, H = bounds.h, OX = bounds.ox, OY = bounds.oy;
  const halfWidth = bounds.halfWidth;
  const outlineW = state.outline * size;

  const art = makeCanvas(W, H);
  const ctx = art.getContext('2d');
  ctx.translate(OX, OY);
  ctx.font = line.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const vecs = line.letters.map(L => extrusionVector(line, L, halfWidth));

  // 1) Contour épais autour de la silhouette complète (face + relief)
  if (outlineW > 0) {
    ctx.strokeStyle = colors.outline;
    ctx.fillStyle = colors.outline;
    ctx.lineWidth = outlineW * 2;
    line.letters.forEach((L, i) => {
      const [vx, vy] = vecs[i];
      const len = Math.hypot(vx, vy);
      const steps = Math.max(1, Math.ceil(len / Math.max(1, outlineW * 0.7)));
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        inLetter(ctx, line, L, vx * t, vy * t, (c, by) => { c.strokeText(L.ch, 0, by); c.fillText(L.ch, 0, by); });
      }
    });
  }

  // 2) Relief (extrusion) : on empile la lettre du fond vers l'avant
  line.letters.forEach((L, i) => {
    const [vx, vy] = vecs[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(vx, vy)));
    for (let s = steps; s >= 1; s--) {
      const t = s / steps;
      ctx.fillStyle = mix(colors.extNear, colors.extFar, Math.pow(t, 0.8));
      inLetter(ctx, line, L, vx * t, vy * t, (c, by) => c.fillText(L.ch, 0, by));
    }
  });

  // 3) Faces avant avec dégradé + biseau lumineux
  const face = makeCanvas(W, H);
  const f = face.getContext('2d');
  f.translate(OX, OY);
  f.font = line.font; f.textAlign = 'center'; f.textBaseline = 'alphabetic';
  f.lineJoin = 'round';
  line.letters.forEach(L => {
    inLetter(f, line, L, 0, 0, (c, by) => {
      const g = c.createLinearGradient(0, -line.cap / 2, 0, line.cap / 2);
      g.addColorStop(0, colors.faceTop);
      g.addColorStop(0.42, colors.faceMid);
      g.addColorStop(1, colors.faceBottom);
      c.fillStyle = g;
      c.fillText(L.ch, 0, by);
    });
  });

  if (state.bevel > 0) {
    const b = size * 0.035;
    // bord supérieur clair
    applyRim(f, line, W, H, OX, OY, 0, b, '#ffffff', 0.85 * state.bevel, b * 0.6);
    // reflet gauche léger
    applyRim(f, line, W, H, OX, OY, b * 0.7, 0, '#ffffff', 0.35 * state.bevel, b * 0.6);
    // bord inférieur sombre
    applyRim(f, line, W, H, OX, OY, -b * 0.3, -b * 1.1, colors.faceBottom === '#ffffff' ? '#000000' : colors.extFar, 0.55 * state.bevel, b * 0.8);
    // brillance spéculaire : petite bande blanche nette juste sous le haut des lettres
    applyRim(f, line, W, H, OX, OY, 0, b * 0.35, '#ffffff', 0.9 * state.bevel, 0);
  }

  ctx.drawImage(face, -OX, -OY);
  // Liseré sombre autour de chaque face (sépare les lettres qui se chevauchent)
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = Math.max(1, size * 0.014);
  ctx.globalAlpha = 0.85;
  line.letters.forEach(L => inLetter(ctx, line, L, 0, 0, (c, by) => c.strokeText(L.ch, 0, by)));
  ctx.globalAlpha = 1;

  return art;
}

// Dessine un liseré (zone de la lettre moins la lettre décalée) en mode source-atop sur la face.
function applyRim(f, line, W, H, OX, OY, dx, dy, color, alpha, blur) {
  const rim = makeCanvas(W, H);
  const r = rim.getContext('2d');
  r.translate(OX, OY);
  r.font = line.font; r.textAlign = 'center'; r.textBaseline = 'alphabetic';
  r.fillStyle = color;
  line.letters.forEach(L => inLetter(r, line, L, 0, 0, (c, by) => c.fillText(L.ch, 0, by)));
  r.globalCompositeOperation = 'destination-out';
  line.letters.forEach(L => inLetter(r, line, L, dx, dy, (c, by) => c.fillText(L.ch, 0, by)));

  f.save();
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalCompositeOperation = 'source-atop';
  f.globalAlpha = alpha;
  if (blur > 0) f.filter = `blur(${blur}px)`;
  f.drawImage(rim, 0, 0);
  f.restore();
}

// ---------- Rendu complet ----------
function render(scale) {
  const lines = layoutLines(scale).filter(l => l.letters.length);
  if (!lines.length) return makeCanvas(10, 10);

  // Boîte englobante approximative avec marge pour relief, contour, ombre et rotation
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  lines.forEach(l => l.letters.forEach(L => {
    const m = l.size * (state.depth * 1.8 + state.outline * 2 + 0.35);
    minX = Math.min(minX, L.x - L.w / 2 - m); maxX = Math.max(maxX, L.x + L.w / 2 + m);
    minY = Math.min(minY, L.y - l.size * 0.7 - m); maxY = Math.max(maxY, L.y + l.size * 0.7 + m);
  }));
  const halfWidth = Math.max(...lines.map(l => l.total / 2));
  const bounds = { w: maxX - minX, h: maxY - minY, ox: -minX, oy: -minY, halfWidth };

  const comp = makeCanvas(bounds.w, bounds.h);
  const c = comp.getContext('2d');
  lines.forEach(line => {
    const art = renderLine(line, bounds);
    if (state.shadow > 0) {
      c.save();
      c.shadowColor = `rgba(0,0,0,${0.55 * state.shadow})`;
      c.shadowBlur = line.size * 0.08 * state.shadow;
      c.shadowOffsetY = line.size * 0.05 * state.shadow;
      c.drawImage(art, 0, 0);
      c.restore();
    } else {
      c.drawImage(art, 0, 0);
    }
  });

  // Rotation globale
  let out = comp;
  if (state.rotation) {
    const a = (state.rotation * Math.PI) / 180;
    const w = Math.abs(comp.width * Math.cos(a)) + Math.abs(comp.height * Math.sin(a));
    const h = Math.abs(comp.width * Math.sin(a)) + Math.abs(comp.height * Math.cos(a));
    out = makeCanvas(w, h);
    const o = out.getContext('2d');
    o.translate(w / 2, h / 2); o.rotate(a);
    o.drawImage(comp, -comp.width / 2, -comp.height / 2);
  }
  return trim(out, Math.round(16 * scale));
}

// Recadre sur les pixels non transparents
function trim(canvas, pad) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 4) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return makeCanvas(10, 10);
  const out = makeCanvas(x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2);
  out.getContext('2d').drawImage(canvas, x0 - pad, y0 - pad, x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2, 0, 0, out.width, out.height);
  return out;
}

function withBackground(src) {
  if (state.transparent) return src;
  const out = makeCanvas(src.width, src.height);
  const o = out.getContext('2d');
  o.fillStyle = state.bgColor; o.fillRect(0, 0, out.width, out.height);
  o.drawImage(src, 0, 0);
  return out;
}

// ---------- Interface ----------
const view = document.getElementById('view');
const stage = document.getElementById('stage');
let pending = false;

async function ensureFont() {
  const { family, weight } = fontSpec(state.font);
  try { await document.fonts.load(`${weight} 100px "${family}"`, state.text1 + state.text2 + 'H'); } catch (e) { /* ignore */ }
}

function schedule() {
  save();
  if (pending) return;
  pending = true;
  requestAnimationFrame(async () => {
    await ensureFont();
    pending = false;
    const img = withBackground(render(1));
    view.width = img.width; view.height = img.height;
    view.getContext('2d').drawImage(img, 0, 0);
    stage.classList.toggle('checker', state.transparent);
    stage.style.backgroundColor = state.transparent ? '' : state.bgColor;
  });
}

function buildColorUI() {
  document.querySelectorAll('.presets').forEach(box => {
    const li = +box.dataset.line;
    box.innerHTML = '';
    Object.entries(PRESETS).forEach(([key, p]) => {
      const b = document.createElement('button');
      b.title = p.name;
      b.style.background = `linear-gradient(${p.faceTop}, ${p.faceMid} 45%, ${p.faceBottom} 70%, ${p.extFar})`;
      b.classList.toggle('active', state.lines[li].preset === key);
      b.onclick = () => { state.lines[li] = { preset: key, ...p }; delete state.lines[li].name; buildColorUI(); schedule(); };
      box.appendChild(b);
    });
  });
  document.querySelectorAll('.colors').forEach(box => {
    const li = +box.dataset.line;
    box.innerHTML = '';
    COLOR_KEYS.forEach(([k, label]) => {
      const l = document.createElement('label');
      l.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'color'; inp.value = state.lines[li][k];
      inp.oninput = () => {
        state.lines[li][k] = inp.value; state.lines[li].preset = null;
        box.parentElement.querySelectorAll('.presets button').forEach(b => b.classList.remove('active'));
        schedule();
      };
      l.appendChild(inp);
      box.appendChild(l);
    });
  });
}

function buildSliders() {
  Object.entries(SLIDERS).forEach(([id, defs]) => {
    const box = document.getElementById(id);
    box.innerHTML = '';
    defs.forEach(([key, label, min, max, step]) => {
      const wrap = document.createElement('label');
      wrap.className = 'slider';
      const name = document.createElement('span'); name.textContent = label;
      const out = document.createElement('output');
      const inp = document.createElement('input');
      Object.assign(inp, { type: 'range', min, max, step, value: state[key] });
      const fmt = () => { out.textContent = (+inp.value).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0); };
      fmt();
      inp.oninput = () => { state[key] = +inp.value; fmt(); schedule(); };
      wrap.append(name, out, inp);
      box.appendChild(wrap);
    });
  });
}

let bound = false;
function bindInputs() {
  const bind = (id, key, prop = 'value', cast = v => v) => {
    const el = document.getElementById(id);
    el[prop] = state[key];
    if (bound) return;
    el.addEventListener('input', () => { state[key] = cast(el[prop]); schedule(); });
  };
  bind('text1', 'text1');
  bind('text2', 'text2');
  bind('font', 'font');
  bind('upper', 'upper', 'checked');
  bind('sameWidth', 'sameWidth', 'checked');
  bind('transparent', 'transparent', 'checked');
  bind('bgColor', 'bgColor');
  bind('exportScale', 'exportScale', 'value', Number);
  bound = true;
}

function fileName() {
  const base = `${state.text1} ${state.text2}`.trim().replace(/[^\w-]+/g, '_') || 'texte';
  return `${base}.png`;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

document.getElementById('btnDownload').onclick = async () => {
  await ensureFont();
  const img = withBackground(render(state.exportScale));
  img.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
};

document.getElementById('btnCopy').onclick = async () => {
  await ensureFont();
  const img = withBackground(render(state.exportScale));
  img.toBlob(async blob => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Image copiée !');
    } catch (e) { toast('Copie impossible dans ce navigateur'); }
  }, 'image/png');
};

document.getElementById('btnRandom').onclick = () => { state.seed = (Math.random() * 1e9) | 0; schedule(); };

document.getElementById('btnReset').onclick = () => {
  const { text1, text2 } = state;
  state = { ...structuredClone(DEFAULTS), text1, text2 };
  init();
};

function init() {
  buildColorUI();
  buildSliders();
  bindInputs();
  schedule();
}
document.fonts.ready.then(schedule);
init();

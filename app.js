/* TextRender 3D — rendu de texte 3D cartoon (style "NEXTBOT CREATION") en Canvas 2D. */
'use strict';

// ---------- Préréglages de couleurs ----------
// faceTop / faceMid / faceBottom : dégradé de la face avant
// extNear / extFar : couleur du relief (près de la face → au fond)
// outline : contour sombre
const PRESETS = {
  glace:  { name: 'Glace',  faceTop: '#ffffff', faceMid: '#e6ecfb', faceBottom: '#b7c4e6', extNear: '#4a6290', extFar: '#1f2b47', outline: '#111827' },
  feu:    { name: 'Feu',    faceTop: '#ffd400', faceMid: '#ffb300', faceBottom: '#ff7406', extNear: '#c8360a', extFar: '#560e02', outline: '#2c0a04' },
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
    ['stretch',  'Hauteur des lettres',    0.7, 1.8, 0.01],
    ['bold',     'Graisse (épaississement)', 0, 0.08, 0.002],
    ['rotation', 'Rotation globale (°)',  -20, 20, 0.5],
  ],
  depthSliders: [
    ['depth',       'Profondeur',          0, 0.4, 0.005],
    ['angle',       'Direction du relief (°)', 0, 180, 1],
    ['perspective', 'Perspective',         0, 4, 0.05],
    ['outline',     'Épaisseur du contour', 0, 0.08, 0.002],
    ['bevelSize',   'Largeur du biseau',   0, 0.1, 0.002],
    ['bevel',       'Intensité du biseau', 0, 1.5, 0.05],
    ['shadow',      'Ombre portée',        0, 1, 0.05],
  ],
};

const DEFAULTS = {
  text1: 'NEXTBOT', text2: 'CREATION',
  font: 'Montserrat:900', upper: true, sameWidth: false,
  spacing: 0.01, lineGap: 0.0, jitter: 0.5, jitterY: 0.008, stretch: 1.25, bold: 0.015, rotation: 0,
  depth: 0.13, angle: 90, perspective: 1.7, outline: 0.016, bevelSize: 0.05, bevel: 0.45, shadow: 0,
  transparent: true, bgColor: '#1b1f3a', exportScale: 2, seed: 7,
  lines: [{ preset: 'glace', ...PRESETS.glace }, { preset: 'feu', ...PRESETS.feu }],
};

const BASE_SIZE = 220; // taille de police de référence (px) pour l'aperçu

let state = load();

// ---------- Utilitaires ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('textrender3d_v6'));
    if (s && s.lines) return { ...structuredClone(DEFAULTS), ...s };
  } catch (e) { /* stockage indisponible */ }
  return structuredClone(DEFAULTS);
}
function save() {
  try { localStorage.setItem('textrender3d_v6', JSON.stringify(state)); } catch (e) { /* ignore */ }
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

  let y = 0, prevH = 0;
  return natural.map((n, li) => {
    const size = state.sameWidth && n.total > 0 ? n.size * (target / n.total) : n.size;
    meas.font = `${weight} ${size}px "${family}"`;
    const chars = [...n.text];
    const widths = chars.map(ch => meas.measureText(ch).width);
    const cap = meas.measureText('H').actualBoundingBoxAscent || size * 0.7;
    const h = cap * state.stretch; // hauteur visible des lettres
    const spacing = state.spacing * size;
    const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * spacing;

    if (li > 0 && n.total > 0) y += prevH / 2 + h / 2 + state.lineGap * size;
    if (n.total > 0) prevH = h;
    const cy = y;

    let x = -total / 2;
    const letters = chars.map((ch, i) => {
      const w = widths[i];
      const L = {
        ch, w,
        x: x + w / 2,
        y: cy + (rand() - 0.5) * 2 * state.jitterY * size, // centre de la lettre
        rot: ((rand() - 0.5) * 2 * state.jitter * Math.PI) / 180,
      };
      x += w + spacing;
      return L;
    });
    return { li, letters, size, cap, h, total, cy, font: `${weight} ${size}px "${family}"`, colors: state.lines[li] };
  });
}

// Dessine la silhouette de la lettre L (centrée sur L.x, L.y), épaissie de "grow" px de chaque côté
// en plus de la graisse globale (state.bold) — le trait arrondi adoucit aussi les coins.
function glyph(ctx, line, L, grow = 0) {
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.rotate(L.rot);
  ctx.scale(1, state.stretch);
  ctx.fillText(L.ch, 0, line.cap / 2);
  const w = 2 * (state.bold * line.size + grow);
  if (w > 0) {
    ctx.lineWidth = w;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.strokeText(L.ch, 0, line.cap / 2);
  }
  ctx.restore();
}

function setupText(ctx, line) {
  ctx.font = line.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

// Perspective à un point de fuite : la face arrière est une homothétie de la face avant
// de centre V (point de fuite) et de rapport (1 - k·t).
function withDepth(ctx, P, t, fn) {
  const s = 1 - P.k * t;
  ctx.save();
  ctx.translate(P.vx, P.vy);
  ctx.scale(s, s);
  ctx.translate(-P.vx, -P.vy);
  fn();
  ctx.restore();
}

// ---------- Biseau éclairé (transformée de distance) ----------
const INF = 1e20;
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
// Distance euclidienne de chaque pixel intérieur au bord (Felzenszwalb & Huttenlocher).
function distanceField(alpha, w, h) {
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = alpha[i] > 127 ? INF : 0;
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
  return grid;
}

function gradientLUT(c) {
  const g = makeCanvas(1, 256).getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, 256);
  lg.addColorStop(0, c.faceTop);
  lg.addColorStop(0.45, c.faceMid);
  lg.addColorStop(1, c.faceBottom);
  g.fillStyle = lg; g.fillRect(0, 0, 1, 256);
  return g.getImageData(0, 0, 1, 256).data;
}

// Flou "boîte" séparable (2 passes) pour lisser la carte de hauteur du biseau.
function blurField(a, w, h, r) {
  const tmp = new Float32Array(a.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0; const row = y * w;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
}

// Masque + carte de distance d'une lettre, dans un petit canvas centré sur la lettre.
function letterMaps(line, L) {
  const outlineW = state.outline * line.size;
  const side = Math.ceil(Math.max(L.w, line.h) * 1.5 + 8 + 4 * state.bold * line.size + 2 * outlineW);
  const cv = makeCanvas(side, side);
  const c = cv.getContext('2d');
  setupText(c, line);
  c.fillStyle = '#fff';
  c.translate(side / 2 - L.x, side / 2 - L.y);
  glyph(c, line, L);
  const img = c.getImageData(0, 0, side, side);
  const alpha = new Uint8Array(side * side);
  let x0 = side, y0 = side, x1 = 0, y1 = 0;
  for (let i = 0; i < alpha.length; i++) {
    const a = (alpha[i] = img.data[i * 4 + 3]);
    if (a) {
      const x = i % side, y = (i - x) / side;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  // boîte englobante (avec marge pour le contour) : on ne manipule que ces pixels-là
  const pad = Math.ceil(outlineW) + 3;
  const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad);
  const bw = Math.max(1, Math.min(side, x1 + pad + 1) - bx), bh = Math.max(1, Math.min(side, y1 + pad + 1) - by);

  // silhouette épaissie du contour, prête à être tamponnée à chaque tranche
  const outline = makeCanvas(bw, bh);
  const oc = outline.getContext('2d');
  setupText(oc, line);
  oc.fillStyle = line.colors.outline;
  oc.translate(side / 2 - L.x - bx, side / 2 - L.y - by);
  glyph(oc, line, L, outlineW);

  return { side, alpha, dist: distanceField(alpha, side, side), x: L.x - side / 2, y: L.y - side / 2, bx, by, bw, bh, outline };
}

function imageFrom(M, colorAt) {
  const { side, alpha, bx, by, bw, bh } = M;
  const cv = makeCanvas(bw, bh);
  const c = cv.getContext('2d');
  const img = c.createImageData(bw, bh);
  const px = img.data;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = (y + by) * side + x + bx;
      if (!alpha[i]) continue;
      const o = (y * bw + x) * 4;
      colorAt(i, px, o);
      px[o + 3] = alpha[i];
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

// Face avant : dégradé vertical + léger modelé doux sur les bords (lumière en haut à gauche).
function letterFace(line, L, M, lut) {
  const { size, colors } = line;
  const { side, alpha, dist } = M;
  const b = Math.max(1.5, state.bevelSize * size);
  const H = new Float32Array(side * side);
  for (let i = 0; i < H.length; i++) {
    const t = Math.min(1, dist[i] / b);
    H[i] = b * Math.sin(t * Math.PI / 2); // profil bombé, sans arête
  }
  blurField(H, side, side, Math.max(2, Math.round(b * 0.3)));

  const strength = state.bevel;
  let lx = -0.45, ly = -0.8, lz = 0.55;
  const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln;
  const dark = hexToRgb(colors.extNear);
  const top = L.y - line.h / 2, hh = line.h;

  const canvas = imageFrom(M, (i, px, o) => {
    const x = i % side, y = (i - x) / side;
    const gy = Math.min(255, Math.max(0, Math.round(((M.y + y - top) / hh) * 255))) * 4;
    let r = lut[gy], g = lut[gy + 1], bl = lut[gy + 2];
    const hx = (H[i + (x < side - 1 ? 1 : 0)] - H[i - (x > 0 ? 1 : 0)]) / 2;
    const hy = (H[i + (y < side - 1 ? side : 0)] - H[i - (y > 0 ? side : 0)]) / 2;
    const nx = -hx * strength, ny = -hy * strength;
    const shade = (nx * lx + ny * ly + lz) / Math.hypot(nx, ny, 1) / lz; // 1 = surface plane
    if (shade >= 1) {
      const k = Math.min(0.6, (shade - 1) * 0.6);
      r += (255 - r) * k; g += (255 - g) * k; bl += (255 - bl) * k;
    } else {
      const k = 1 - Math.min(0.5, (1 - shade) * 0.6);
      r = dark[0] + (r - dark[0]) * k; g = dark[1] + (g - dark[1]) * k; bl = dark[2] + (bl - dark[2]) * k;
    }
    px[o] = r; px[o + 1] = g; px[o + 2] = bl;
  });
  return { canvas, x: M.x + M.bx, y: M.y + M.by };
}

// Parois du relief : chaque tranche n'est visible que sur son bord, on colore donc chaque pixel
// selon l'orientation du bord le plus proche (normale = gradient de la distance).
// Parois tournées vers la gauche/le haut = éclairées, vers la droite/le bas = dans l'ombre.
// La profondeur assombrit ensuite les parois de façon continue (calque sombre en transparence).
function letterWalls(line, M) {
  const { colors } = line;
  const { side, alpha } = M;
  const D = Float32Array.from(M.dist);
  blurField(D, side, side, 1);
  const near = hexToRgb(colors.extNear), far = hexToRgb(colors.extFar);
  const lit = hexToRgb(colors.faceBottom);
  let lx = -0.9, ly = -0.45;
  const ln = Math.hypot(lx, ly); lx /= ln; ly /= ln;

  const base = new Float32Array(side * side * 3);
  for (let i = 0; i < alpha.length; i++) {
    if (!alpha[i]) continue;
    const x = i % side, y = (i - x) / side;
    const gx = (D[i + (x < side - 1 ? 1 : 0)] - D[i - (x > 0 ? 1 : 0)]) / 2;
    const gy = (D[i + (y < side - 1 ? side : 0)] - D[i - (y > 0 ? side : 0)]) / 2;
    const gn = Math.hypot(gx, gy);
    // normale sortante = -gradient (la distance croît vers l'intérieur)
    const nx = gn > 1e-3 ? -gx / gn : 0, ny = gn > 1e-3 ? -gy / gn : 1;
    const d = nx * lx + ny * ly; // -1 (ombre) … 1 (lumière)
    for (let k = 0; k < 3; k++) {
      const v = d >= 0 ? near[k] + (lit[k] - near[k]) * 0.35 * d : near[k] + (far[k] - near[k]) * 0.55 * -d;
      base[i * 3 + k] = v;
    }
  }
  const lit_ = imageFrom(M, (i, px, o) => {
    px[o] = base[i * 3]; px[o + 1] = base[i * 3 + 1]; px[o + 2] = base[i * 3 + 2];
  });
  const dark_ = imageFrom(M, (i, px, o) => { px[o] = far[0]; px[o + 1] = far[1]; px[o + 2] = far[2]; });
  return { lit: lit_, dark: dark_ };
}

// ---------- Rendu d'une ligne ----------
function renderLine(line, bounds, P) {
  const { size, colors } = line;
  const outlineW = state.outline * size;

  const art = makeCanvas(bounds.w, bounds.h);
  const ctx = art.getContext('2d');
  ctx.translate(bounds.ox, bounds.oy);
  setupText(ctx, line);

  // déplacement maximal d'un point de la ligne vers le point de fuite (en px)
  const shifts = line.letters.map(L => {
    let m = 1;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const px = L.x + sx * L.w / 2, py = L.y + sy * line.h / 2;
      m = Math.max(m, P.k * Math.hypot(P.vx - px, P.vy - py));
    }
    return m;
  });
  const maxShift = Math.max(...shifts);

  const maps = line.letters.map(L => letterMaps(line, L));

  // 1) Contour sombre autour de toute la silhouette (face + relief)
  if (outlineW > 0) {
    const steps = Math.max(1, Math.ceil(maxShift / Math.max(1, outlineW * 0.7)));
    for (let s = steps; s >= 0; s--) {
      withDepth(ctx, P, s / steps, () => maps.forEach(M => ctx.drawImage(M.outline, M.x + M.bx, M.y + M.by)));
    }
  }

  // 2) Relief : on empile les tranches (parois éclairées) du fond vers l'avant
  const walls = maps.map(M => letterWalls(line, M));
  // Ordre global du fond vers l'avant, mais chaque lettre n'a besoin que d'environ 1 tranche par pixel
  // de son propre déplacement (les lettres proches du point de fuite bougent moins).
  const steps = Math.max(1, Math.ceil(maxShift));
  const n = shifts.map(v => Math.max(1, Math.ceil(v)));
  const last = n.map(() => -1);
  for (let s = steps; s >= 1; s--) {
    maps.forEach((M, i) => {
      const idx = Math.ceil((s / steps) * n[i]);
      if (idx === last[i]) return;
      last[i] = idx;
      const t = idx / n[i];
      withDepth(ctx, P, t, () => {
        ctx.drawImage(walls[i].lit, M.x + M.bx, M.y + M.by);
        ctx.globalAlpha = 0.7 * Math.pow(t, 0.85);
        ctx.drawImage(walls[i].dark, M.x + M.bx, M.y + M.by);
        ctx.globalAlpha = 1;
      });
    });
  }

  // 3) Faces avant, lettre par lettre
  const lut = gradientLUT(colors);
  line.letters.forEach((L, i) => {
    const f = letterFace(line, L, maps[i], lut);
    ctx.drawImage(f.canvas, f.x, f.y);
  });

  return art;
}

// ---------- Rendu complet ----------
function render(scale) {
  const lines = layoutLines(scale).filter(l => l.letters.length);
  if (!lines.length) return makeCanvas(10, 10);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  lines.forEach(l => l.letters.forEach(L => {
    const m = l.size * (state.depth * 2 + state.outline * 2 + 0.3);
    const r = Math.max(L.w, l.h) * 0.75;
    minX = Math.min(minX, L.x - r - m); maxX = Math.max(maxX, L.x + r + m);
    minY = Math.min(minY, L.y - r - m); maxY = Math.max(maxY, L.y + r + m);
  }));
  const bounds = { w: maxX - minX, h: maxY - minY, ox: -minX, oy: -minY };

  // Point de fuite commun : dans la direction du relief, à une distance qui dépend de la perspective
  const ref = BASE_SIZE * scale; // même caméra quel que soit le texte
  const midY = (Math.min(...lines.map(l => l.cy - l.h / 2)) + Math.max(...lines.map(l => l.cy + l.h / 2))) / 2;
  const a = (state.angle * Math.PI) / 180;
  const dist = ref * 4 / Math.max(0.01, state.perspective);
  const P = { vx: Math.cos(a) * dist, vy: midY + Math.sin(a) * dist, k: (state.depth * ref) / dist };

  const comp = makeCanvas(bounds.w, bounds.h);
  const c = comp.getContext('2d');
  lines.forEach(line => {
    const art = renderLine(line, bounds, P);
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
    const r = (state.rotation * Math.PI) / 180;
    const w = Math.abs(comp.width * Math.cos(r)) + Math.abs(comp.height * Math.sin(r));
    const h = Math.abs(comp.width * Math.sin(r)) + Math.abs(comp.height * Math.cos(r));
    out = makeCanvas(w, h);
    const o = out.getContext('2d');
    o.translate(w / 2, h / 2); o.rotate(r);
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

// Aperçu en deux temps : un rendu rapide en basse résolution pendant qu'on tape / glisse un curseur,
// puis le rendu net dès que ça se calme.
const PREVIEW_FAST = 0.45, PREVIEW_FULL = 0.85;
let fineTimer = 0;
function paint(scale) {
  const img = withBackground(render(scale));
  view.width = img.width; view.height = img.height;
  view.getContext('2d').drawImage(img, 0, 0);
  stage.classList.toggle('checker', state.transparent);
  stage.style.backgroundColor = state.transparent ? '' : state.bgColor;
}
function schedule() {
  save();
  clearTimeout(fineTimer);
  fineTimer = setTimeout(async () => { await ensureFont(); paint(PREVIEW_FULL); }, 180);
  if (pending) return;
  pending = true;
  requestAnimationFrame(async () => {
    await ensureFont();
    pending = false;
    paint(PREVIEW_FAST);
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
  toast('Rendu HD en cours…');
  await new Promise(r => setTimeout(r, 30));
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
  toast('Rendu HD en cours…');
  await new Promise(r => setTimeout(r, 30));
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
  toast('Réglages par défaut rétablis');
};

function init() {
  buildColorUI();
  buildSliders();
  bindInputs();
  schedule();
}
document.fonts.ready.then(schedule);
init();

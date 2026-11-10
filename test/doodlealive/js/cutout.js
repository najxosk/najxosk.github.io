/* DoodleAlive — in-browser cutout. Exposes window.Cutout {prepare, run, autoSens, sensToT}. */
(function () {
'use strict';
const WORK = 960;

function label(mask, w, h) { // 8-connected components
  const N = w * h, lab = new Int32Array(N), areas = [0], stack = new Int32Array(N);
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (!mask[i] || lab[i]) continue;
    n++; let sp = 0, a = 0; stack[sp++] = i; lab[i] = n;
    while (sp) {
      const p = stack[--sp]; a++;
      const x = p % w, y = (p / w) | 0;
      const y0 = y > 0 ? -1 : 0, y1 = y < h - 1 ? 1 : 0, x0 = x > 0 ? -1 : 0, x1 = x < w - 1 ? 1 : 0;
      for (let dy = y0; dy <= y1; dy++) for (let dx = x0; dx <= x1; dx++) {
        const q = p + dy * w + dx;
        if (mask[q] && !lab[q]) { lab[q] = n; stack[sp++] = q; }
      }
    }
    areas.push(a);
  }
  return { lab, areas, n };
}

function dist(seed, w, h) { // chamfer distance to nearest seed pixel
  const N = w * h, d = new Float32Array(N), D = 1.4142;
  for (let i = 0; i < N; i++) d[i] = seed[i] ? 0 : 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i]; if (v === 0) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) {
      v = Math.min(v, d[i - w] + 1);
      if (x > 0) v = Math.min(v, d[i - w - 1] + D);
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + D);
    }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i]; if (v === 0) continue;
    if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + 1);
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + D);
      if (x > 0) v = Math.min(v, d[i + w - 1] + D);
    }
    d[i] = v;
  }
  return d;
}
function dilate(m, r, w, h) { const d = dist(m, w, h), o = new Uint8Array(w * h); for (let i = 0; i < o.length; i++) o[i] = d[i] <= r ? 1 : 0; return o; }
function erode(m, r, w, h) {
  const inv = new Uint8Array(w * h); for (let i = 0; i < inv.length; i++) inv[i] = m[i] ? 0 : 1;
  const d = dist(inv, w, h), o = new Uint8Array(w * h); for (let i = 0; i < o.length; i++) o[i] = d[i] > r ? 1 : 0; return o;
}
function fillHoles(m, w, h) {
  const N = w * h, bg = new Uint8Array(N), st = new Int32Array(N); let sp = 0;
  const push = i => { if (!m[i] && !bg[i]) { bg[i] = 1; st[sp++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const p = st[--sp], x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w);
  }
  const o = new Uint8Array(N); for (let i = 0; i < N; i++) o[i] = bg[i] ? 0 : 1; return o;
}

function solve(A, b, n) { // gaussian elimination, A n×n flat
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r * n + i]) > Math.abs(A[p * n + i])) p = r;
    if (Math.abs(A[p * n + i]) < 1e-12) return null;
    if (p !== i) { for (let c = 0; c < n; c++) { const t = A[i * n + c]; A[i * n + c] = A[p * n + c]; A[p * n + c] = t; } const t = b[i]; b[i] = b[p]; b[p] = t; }
    for (let r = i + 1; r < n; r++) {
      const f = A[r * n + i] / A[i * n + i];
      for (let c = i; c < n; c++) A[r * n + c] -= f * A[i * n + c];
      b[r] -= f * b[i];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i * n + c] * x[c]; x[i] = s / A[i * n + i]; }
  return x;
}
function basis(x, y, w, h) { const u = x / w * 2 - 1, v = y / h * 2 - 1; return [1, u, v, u * u, u * v, v * v]; }
function fitPoly(pts, vals, w, h) { // pts: [x,y]*, vals Float32 per pt; returns coeffs or null
  const A = new Float64Array(36), b = new Float64Array(6);
  for (let k = 0; k < vals.length; k++) {
    const f = basis(pts[2 * k], pts[2 * k + 1], w, h);
    for (let i = 0; i < 6; i++) { b[i] += f[i] * vals[k]; for (let j = 0; j < 6; j++) A[i * 6 + j] += f[i] * f[j]; }
  }
  return solve(A, b, 6);
}

function boxBlur3(data, w, h) { // 3x3 blur of RGBA (alpha ignored) -> Float32 RGB
  const N = w * h, tmp = new Float32Array(N * 3), out = new Float32Array(N * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = x > 0 ? i - 1 : i, c = x < w - 1 ? i + 1 : i;
    for (let k = 0; k < 3; k++) tmp[i * 3 + k] = (data[a * 4 + k] + data[i * 4 + k] + data[c * 4 + k]) / 3;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = y > 0 ? i - w : i, c = y < h - 1 ? i + w : i;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = (tmp[a * 3 + k] + tmp[i * 3 + k] + tmp[c * 3 + k]) / 3;
  }
  return out;
}

function convexHull(pts) { // pts [[x,y]...]
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}

function prepare(src) { // src: canvas or image
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const sc = Math.min(1, WORK / Math.max(sw, sh));
  const w = Math.max(8, Math.round(sw * sc)), h = Math.max(8, Math.round(sh * sc)), N = w * h, S = Math.max(w, h);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingQuality = 'high'; cx.drawImage(src, 0, 0, w, h);
  const rgba = cx.getImageData(0, 0, w, h).data;
  const blur = boxBlur3(rgba, w, h);

  // --- reference paper colour: median colour of brightest, least saturated 30% pixels
  const hist = new Int32Array(256), score = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = blur[i * 3], g = blur[i * 3 + 1], b = blur[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (r + g + b) / 3;
    const s = Math.max(0, Math.min(255, l - 0.8 * (mx - mn))); score[i] = s; hist[s | 0]++;
  }
  let acc = 0, thr = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= N * 0.3) { thr = v; break; } }
  const hr = new Int32Array(256), hg = new Int32Array(256), hb = new Int32Array(256); let cnt = 0;
  for (let i = 0; i < N; i += 2) if (score[i] >= thr) { hr[blur[i * 3] | 0]++; hg[blur[i * 3 + 1] | 0]++; hb[blur[i * 3 + 2] | 0]++; cnt++; }
  const med = hh => { let a = 0; for (let v = 0; v < 256; v++) { a += hh[v]; if (a >= cnt / 2) return Math.max(v, 30); } return 200; };
  const ref = [med(hr), med(hg), med(hb)];

  // --- illumination model: quadratic per channel, robust iterative
  const STEP = 3, pts = [], pr = [], pg = [], pb = [];
  for (let y = 0; y < h; y += STEP) for (let x = 0; x < w; x += STEP) { pts.push(x, y); const i = y * w + x; pr.push(blur[i * 3]); pg.push(blur[i * 3 + 1]); pb.push(blur[i * 3 + 2]); }
  const P = pts.length / 2;
  let coef = null; // [3][6]
  const evalAt = (c, x, y) => { const f = basis(x, y, w, h); let s = 0; for (let k = 0; k < 6; k++) s += c[k] * f[k]; return Math.max(20, s); };
  const chans = [pr, pg, pb];
  let sel = new Uint8Array(P);
  for (let k = 0; k < P; k++) {
    let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(chans[c][k] / ref[c] - 1)); sel[k] = m < 0.2 ? 1 : 0;
  }
  for (let it = 0; it < 5; it++) {
    const idx = []; for (let k = 0; k < P; k++) if (sel[k]) idx.push(k);
    if (idx.length < 200) break;
    const sp = new Float32Array(idx.length * 2), nc = [];
    idx.forEach((k, j) => { sp[2 * j] = pts[2 * k]; sp[2 * j + 1] = pts[2 * k + 1]; });
    let ok = true;
    for (let c = 0; c < 3; c++) { const vv = new Float32Array(idx.length); idx.forEach((k, j) => vv[j] = chans[c][k]); const co = fitPoly(sp, vv, w, h); if (!co) { ok = false; break; } nc.push(co); }
    if (!ok) break; coef = nc;
    for (let k = 0; k < P; k++) {
      let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(chans[c][k] / evalAt(coef[c], pts[2 * k], pts[2 * k + 1]) - 1)); sel[k] = m < 0.11 ? 1 : 0;
    }
  }
  if (!coef) coef = ref.map(v => [v, 0, 0, 0, 0, 0]);

  // --- per-pixel fit, deviation, flattened colours
  const dev = new Float32Array(N), devB = new Float32Array(N), flat = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < h; y++) {
    const v = y / h * 2 - 1;
    for (let x = 0; x < w; x++) {
      const u = x / w * 2 - 1, f1 = u, f2 = v, f3 = u * u, f4 = u * v, f5 = v * v, i = y * w + x;
      let m = 0, mb = 0;
      for (let c = 0; c < 3; c++) {
        const co = coef[c], fit = Math.max(20, co[0] + co[1] * f1 + co[2] * f2 + co[3] * f3 + co[4] * f4 + co[5] * f5);
        const p = rgba[i * 4 + c];
        const dd = Math.abs(p / fit - 1); if (dd > m) m = dd;
        const db = Math.abs(blur[i * 3 + c] / fit - 1); if (db > mb) mb = db;
        const o = p / fit * 250; flat[i * 4 + c] = o > 255 ? 255 : o;
      }
      flat[i * 4 + 3] = 255; dev[i] = m; devB[i] = mb;
    }
  }

  // --- paper component + convex hull (separates paper from table)
  const pm = new Uint8Array(N); for (let i = 0; i < N; i++) pm[i] = devB[i] < 0.12 ? 1 : 0;
  const pe = erode(pm, Math.max(2, 0.004 * S), w, h);
  const L = label(pe, w, h); let bi = 0, ba = 0; for (let k = 1; k <= L.n; k++) if (L.areas[k] > ba) { ba = L.areas[k]; bi = k; }
  let hull = new Uint8Array(N).fill(1), paperFound = false;
  if (ba > N * 0.03) {
    const rowMin = new Int32Array(h).fill(1e9), rowMax = new Int32Array(h).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (L.lab[y * w + x] === bi) { if (x < rowMin[y]) rowMin[y] = x; if (x > rowMax[y]) rowMax[y] = x; }
    const hp = []; for (let y = 0; y < h; y++) if (rowMax[y] >= 0) { hp.push([rowMin[y], y], [rowMax[y], y]); }
    const poly = convexHull(hp);
    const hc = document.createElement('canvas'); hc.width = w; hc.height = h; const hx = hc.getContext('2d', { willReadFrequently: true });
    hx.fillStyle = '#fff'; hx.beginPath(); poly.forEach((p, k) => k ? hx.lineTo(p[0] + 0.5, p[1] + 0.5) : hx.moveTo(p[0] + 0.5, p[1] + 0.5)); hx.closePath(); hx.fill();
    const hd = hx.getImageData(0, 0, w, h).data; const raw = new Uint8Array(N); for (let i = 0; i < N; i++) raw[i] = hd[i * 4 + 3] > 127 ? 1 : 0;
    hull = erode(raw, Math.max(3, 0.012 * S), w, h); paperFound = true;
  }
  // --- Otsu on dev within hull
  const dh = new Float64Array(128); let tot = 0;
  for (let i = 0; i < N; i++) if (hull[i]) { dh[Math.min(127, (dev[i] * 200) | 0)]++; tot++; }
  let sumAll = 0; for (let k = 0; k < 128; k++) sumAll += k * dh[k];
  let wB = 0, sB = 0, best = -1, bt = 40;
  for (let k = 0; k < 128; k++) { wB += dh[k]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += k * dh[k]; const mB = sB / wB, mF = (sumAll - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; bt = k; } }
  const otsu = (bt + 1) / 200;
  return { w, h, S, flat, dev, hull, paperFound, otsu, ref, coef };
}

function sensToT(s) { return 0.04 + 0.45 * Math.pow(1 - s / 100, 1.4); }
function tToSens(t) { return Math.round(100 * (1 - Math.pow(Math.max(0, Math.min(1, (t - 0.04) / 0.45)), 1 / 1.4))); }
function autoSens(ctx) { const t = Math.max(0.1, Math.min(0.28, ctx.otsu * 0.8)); return tToSens(t); }

/* run: opts {sens: 0..100, crop: {x0,y0,x1,y1} normalised or null} -> {canvas,w,h} | null */
function run(ctx, opts) {
  const { w, h, S, dev, hull, flat } = ctx, N = w * h;
  const t = sensToT(opts.sens), c = opts.crop;
  const cx0 = c ? Math.floor(c.x0 * w) : 0, cx1 = c ? Math.ceil(c.x1 * w) : w, cy0 = c ? Math.floor(c.y0 * h) : 0, cy1 = c ? Math.ceil(c.y1 * h) : h;
  let ink = new Uint8Array(N);
  for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) { const i = y * w + x; if (hull[i] && dev[i] > t) ink[i] = 1; }
  // speck removal
  const L = label(ink, w, h), minA = Math.max(8, 0.00006 * N);
  for (let i = 0; i < N; i++) if (ink[i] && L.areas[L.lab[i]] < minA) ink[i] = 0;
  // group nearby strokes, keep big groups
  const Rg = 0.03 * S, g = dilate(ink, Rg, w, h), G = label(g, w, h), sums = new Float64Array(G.n + 1);
  for (let i = 0; i < N; i++) if (ink[i]) sums[G.lab[i]]++;
  let mx = 0; for (let k = 1; k <= G.n; k++) if (sums[k] > mx) mx = sums[k];
  if (mx < minA) return null;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (ink[i] && sums[G.lab[i]] >= mx * 0.2) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } else ink[i] = 0;
  }
  const Cs = Math.max(maxX - minX, maxY - minY, 20);
  const Rc = Math.max(3, 0.02 * Cs);
  const closed = erode(dilate(ink, Rc, w, h), Rc, w, h);
  const filled = fillHoles(closed, w, h);
  const ow = Math.max(5, 0.028 * Cs), ring = Math.max(1.6, 0.007 * Cs);
  const d = dist(filled, w, h);
  const out = new Uint8ClampedArray(N * 4);
  let x0 = w, x1 = 0, y0 = h, y1 = 0, area = 0;
  const maxR = ow + ring + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, dd = d[i]; if (dd > maxR) continue;
    const rc = Math.max(0, Math.min(1, ow + ring + 0.5 - dd)), cov = Math.max(0, Math.min(1, ow + 0.5 - dd));
    if (rc <= 0) continue;
    let r, gg, b;
    if (filled[i]) { r = flat[i * 4]; gg = flat[i * 4 + 1]; b = flat[i * 4 + 2]; } else { r = gg = b = 255; }
    r = cov * r + (1 - cov) * 70; gg = cov * gg + (1 - cov) * 60; b = cov * b + (1 - cov) * 110;
    const a = rc * (cov + (1 - cov) * 0.55);
    out[i * 4] = r; out[i * 4 + 1] = gg; out[i * 4 + 2] = b; out[i * 4 + 3] = a * 255;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; area++;
  }
  if (x1 <= x0 || y1 <= y0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const full = document.createElement('canvas'); full.width = w; full.height = h; full.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
  const MAXT = 768, sc = Math.min(1, MAXT / Math.max(bw, bh));
  const cv = document.createElement('canvas'); cv.width = Math.max(4, Math.round(bw * sc)); cv.height = Math.max(4, Math.round(bh * sc));
  const cc = cv.getContext('2d'); cc.imageSmoothingQuality = 'high'; cc.drawImage(full, x0, y0, bw, bh, 0, 0, cv.width, cv.height);
  return { canvas: cv, w: cv.width, h: cv.height, fillFrac: area / (bw * bh) };
}

window.Cutout = { prepare, run, autoSens, sensToT };
})();

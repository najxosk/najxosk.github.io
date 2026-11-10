/* DoodleAlive — procedural sample doodles drawn on "paper" with canvas 2D (no images, no AI). */
(function () {
'use strict';
function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

function paper(w, h, R) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fdfbf4'); g.addColorStop(1, '#f1ede0');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(120,110,90,${R() * 0.05})`; x.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
  return { c, x };
}
// wobbly polyline between points (kid hand)
function wobble(R, pts, amp, step) {
  const out = []; const ph = R() * 6;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(len / (step || 18)));
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let k = 0; k < n; k++) { const t = k / n, o = Math.sin(t * 5 + ph + i) * amp + (R() - .5) * amp * .6; out.push([a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function stroke(x, pts, color, wd) {
  x.strokeStyle = color; x.lineWidth = wd; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  x.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); x.stroke();
}
function circlePts(R, cx, cy, rx, ry, over, jit) {
  const pts = [], n = 36, a0 = R() * 6, ph = R() * 6;
  for (let i = 0; i <= n + (over || 0); i++) { const a = a0 + i / n * Math.PI * 2, r = 1 + Math.sin(a * 3 + ph) * (jit || 0.04) + (R() - .5) * 0.02; pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  return pts;
}
function blobPath(x, pts) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); }
function crayon(x, R, pts, color, wd, bbox) { // scribble fill clipped to shape
  x.save(); blobPath(x, pts); x.clip();
  x.strokeStyle = color; x.lineCap = 'round'; x.lineWidth = wd; x.globalAlpha = 0.8;
  const [x0, y0, x1, y1] = bbox; let dir = 1;
  for (let y = y0 - 40; y < y1 + 40; y += wd * 0.55) {
    x.beginPath(); x.moveTo(dir > 0 ? x0 - 30 : x1 + 30, y + (R() - .5) * 6);
    x.lineTo(dir > 0 ? x1 + 30 : x0 - 30, y + 40 + (R() - .5) * 10); x.stroke(); dir = -dir;
  }
  x.restore(); x.globalAlpha = 1;
}
function dot(x, cx, cy, r, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }

const W = 720, H = 900;
const makers = {
  panacik() {
    const R = rng(11), { c, x } = paper(W, H, R), ink = '#1f4fb8', wd = 9;
    stroke(x, wobble(R, circlePts(R, 360, 250, 78, 82, 3, 0.05), 0, 10), ink, wd);
    dot(x, 335, 235, 7, ink); dot(x, 388, 235, 7, ink);
    stroke(x, wobble(R, [[322, 282], [345, 300], [378, 298], [400, 276]], 2, 14), ink, 7);
    for (const a of [-0.5, 0, 0.5]) stroke(x, wobble(R, [[360 + a * 60, 172], [360 + a * 110, 125 + Math.abs(a) * 30]], 2, 12), ink, 7);
    stroke(x, wobble(R, [[360, 332], [364, 470], [358, 580]], 4, 20), ink, wd);            // body
    stroke(x, wobble(R, [[360, 395], [270, 440], [215, 500]], 4, 20), ink, wd);             // arm L
    stroke(x, wobble(R, [[362, 395], [440, 340], [490, 285]], 4, 20), ink, wd);             // arm R up
    stroke(x, wobble(R, [[358, 580], [310, 670], [262, 735]], 4, 20), ink, wd);             // leg L
    stroke(x, wobble(R, [[358, 580], [415, 670], [470, 730]], 4, 20), ink, wd);             // leg R
    stroke(x, wobble(R, [[262, 735], [225, 740]], 2, 12), ink, wd); stroke(x, wobble(R, [[470, 730], [508, 738]], 2, 12), ink, wd);
    return c;
  },
  machula() {
    const R = rng(23), { c, x } = paper(W, H, R);
    const body = circlePts(R, 360, 470, 235, 215, 0, 0.09);
    crayon(x, R, body, '#ff8a2a', 34, [120, 250, 600, 700]);
    // darker edge scribble
    stroke(x, body, '#e0561a', 10);
    // cheeks
    crayon(x, R, circlePts(R, 215, 540, 40, 30, 0, 0.1), '#ff5f8a', 14, [170, 500, 260, 580]);
    crayon(x, R, circlePts(R, 505, 540, 40, 30, 0, 0.1), '#ff5f8a', 14, [460, 500, 550, 580]);
    // eyes
    for (const [ex, ey, er, pr] of [[280, 420, 58, 24], [450, 410, 44, 18]]) { x.fillStyle = '#fff'; blobPath(x, circlePts(R, ex, ey, er, er, 0, 0.05)); x.fill(); stroke(x, circlePts(R, ex, ey, er, er, 2, 0.05), '#222', 8); dot(x, ex + 8, ey + 6, pr, '#222'); }
    stroke(x, wobble(R, [[260, 560], [320, 610], [390, 625], [455, 590], [490, 540]], 3, 22), '#7a1a2a', 14);
    // stubby feet
    crayon(x, R, circlePts(R, 270, 705, 55, 30, 0, 0.1), '#7b3fb8', 16, [210, 675, 330, 735]);
    crayon(x, R, circlePts(R, 460, 700, 55, 30, 0, 0.1), '#7b3fb8', 16, [400, 670, 520, 730]);
    return c;
  },
  priserka() {
    const R = rng(37), { c, x } = paper(W, H, R), dk = '#14532d';
    const body = wobble(R, [[200, 330], [520, 320], [560, 640], [470, 700], [250, 705], [160, 620], [200, 330]], 4, 24);
    crayon(x, R, body, '#35c25a', 30, [150, 300, 570, 710]); stroke(x, body, dk, 10);
    for (const hx of [250, 470]) { const horn = [[hx - 30, 330], [hx, 235], [hx + 32, 325]]; x.fillStyle = '#f5c518'; blobPath(x, horn); x.fill(); stroke(x, horn.concat([horn[0]]), '#8a6d00', 8); }
    x.fillStyle = '#fff'; blobPath(x, circlePts(R, 360, 440, 90, 82, 0, 0.04)); x.fill(); stroke(x, circlePts(R, 360, 440, 90, 82, 2, 0.04), '#111', 9); dot(x, 372, 448, 36, '#c01010'); dot(x, 380, 438, 12, '#fff');
    x.fillStyle = '#fff'; const m = [[250, 570], [280, 625], [315, 575], [350, 630], [390, 575], [425, 628], [460, 572], [480, 575], [470, 600], [250, 600]];
    blobPath(x, m); x.fill(); stroke(x, m.concat([m[0]]), '#111', 7);
    stroke(x, wobble(R, [[165, 520], [95, 560], [60, 610]], 3, 16), dk, 12); stroke(x, wobble(R, [[555, 500], [630, 440], [665, 385]], 3, 16), dk, 12);
    for (const [px, py] of [[60, 610], [665, 385]]) for (const a of [-0.6, 0, 0.6]) stroke(x, [[px, py], [px + Math.sin(a) * 35 - 8, py + Math.cos(a) * 30]], dk, 7);
    stroke(x, wobble(R, [[300, 705], [295, 790], [250, 810]], 3, 16), dk, 14); stroke(x, wobble(R, [[430, 705], [440, 790], [488, 808]], 3, 16), dk, 14);
    return c;
  }
};
window.Samples = {
  list: [{ id: 'panacik', name: 'Panáčik' }, { id: 'machula', name: 'Machuľa' }, { id: 'priserka', name: 'Príšerka' }],
  make(id) { return makers[id](); }
};
})();

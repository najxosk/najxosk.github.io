/* DoodleAlive — app glue: screens, input, editor, stage loop. */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const KEY = 'doodlealive.v1', MUTE_KEY = 'doodlealive.muted';
const screens = ['home', 'edit', 'stage'];
const S = { ctx: null, src: null, sens: 50, crop: null, res: null, char: null, pitch: 1, from: 'home' };
function show(n) { screens.forEach(s => $(s).classList.toggle('hidden', s !== n)); if (n === 'stage') { resizeArena(); } stageActive = n === 'stage'; if (!stageActive) { Sfx.music(false); rig.setDance(false); setActive('dance', false); } }
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hidden'), 2200); }

/* ---------- home ---------- */
const sampleCache = {};
function buildSamples() {
  Samples.list.forEach(s => {
    const b = document.createElement('button'); b.setAttribute('aria-label', 'Ukážka ' + s.name);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const full = Samples.make(s.id); sampleCache[s.id] = full; const x = c.getContext('2d'); x.fillStyle = '#faf7ee'; x.fillRect(0, 0, 128, 128);
    const sc = Math.min(128 / full.width, 128 / full.height); x.drawImage(full, (128 - full.width * sc) / 2, (128 - full.height * sc) / 2, full.width * sc, full.height * sc);
    b.appendChild(c); const sp = document.createElement('span'); sp.textContent = s.name; b.appendChild(sp);
    b.onclick = () => { Sfx.unlock(); startEditor(sampleCache[s.id], 'home'); };
    $('samples').appendChild(b);
  });
}
function onFile(e) {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; Sfx.unlock();
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => { startEditor(img, 'home'); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  img.onerror = () => toastHome('Tento súbor sa nepodarilo otvoriť 😕');
  img.src = url;
}
function toastHome(t) { alert(t); }
$('fileCam').addEventListener('change', onFile); $('fileGal').addEventListener('change', onFile);

/* ---------- editor ---------- */
const photoCv = $('photoCv'), prevCv = $('prevCv');
let rafPending = false, dragStart = null, photoSrc = null;
function startEditor(src, from) {
  S.src = src; S.from = from; show('edit');
  setTimeout(() => {
    S.ctx = Cutout.prepare(src); S.crop = null; S.sens = Cutout.autoSens(S.ctx); $('sens').value = S.sens;
    photoCv.width = S.ctx.w; photoCv.height = S.ctx.h; photoSrc = src; drawPhoto(); recompute();
  }, 30);
}
function drawPhoto() {
  const x = photoCv.getContext('2d'); x.drawImage(photoSrc, 0, 0, photoCv.width, photoCv.height);
  if (S.crop) {
    const w = photoCv.width, h = photoCv.height, c = S.crop; x.save(); x.fillStyle = 'rgba(0,20,60,.5)';
    x.beginPath(); x.rect(0, 0, w, h); x.rect(c.x0 * w, c.y0 * h, (c.x1 - c.x0) * w, (c.y1 - c.y0) * h); x.fill('evenodd');
    x.lineWidth = Math.max(3, w / 160); x.strokeStyle = '#fff'; x.setLineDash([w / 40, w / 60]); x.strokeRect(c.x0 * w, c.y0 * h, (c.x1 - c.x0) * w, (c.y1 - c.y0) * h); x.restore();
  }
}
function recompute() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; doRun(); }); }
function doRun() {
  if (!S.ctx) return;
  S.res = Cutout.run(S.ctx, { sens: S.sens, crop: S.crop });
  const msg = $('prevMsg'), g = $('btnGo'), x = prevCv.getContext('2d');
  if (!S.res) { prevCv.width = 4; prevCv.height = 4; x.clearRect(0, 0, 4, 4); msg.classList.remove('hidden'); g.disabled = true; g.style.opacity = .5; return; }
  msg.classList.add('hidden'); g.disabled = false; g.style.opacity = 1;
  const r = S.res; prevCv.width = r.w; prevCv.height = r.h; x.clearRect(0, 0, r.w, r.h); x.drawImage(r.canvas, 0, 0);
}
$('sens').addEventListener('input', e => { S.sens = +e.target.value; recompute(); });
function ptr(e) { const r = photoCv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; }
photoCv.addEventListener('pointerdown', e => { photoCv.setPointerCapture(e.pointerId); dragStart = ptr(e); });
photoCv.addEventListener('pointermove', e => {
  if (!dragStart) return; const p = ptr(e);
  S.crop = { x0: Math.min(dragStart[0], p[0]), y0: Math.min(dragStart[1], p[1]), x1: Math.max(dragStart[0], p[0]), y1: Math.max(dragStart[1], p[1]) }; drawPhoto();
});
photoCv.addEventListener('pointerup', e => {
  if (!dragStart) return; dragStart = null;
  if (S.crop && (S.crop.x1 - S.crop.x0 < 0.06 || S.crop.y1 - S.crop.y0 < 0.06)) S.crop = null;
  drawPhoto(); recompute();
});
$('btnFull').onclick = () => { S.crop = null; drawPhoto(); recompute(); };
$('btnEditBack').onclick = () => { if (S.char && S.from === 'stage') show('stage'); else show('home'); };
$('btnGo').onclick = () => { if (!S.res) return; Sfx.unlock(); useCharacter(S.res.canvas, true); show('stage'); Sfx.play('yay'); confetti(arenaW / 2, arenaH * 0.5, 60); };

/* ---------- character / storage ---------- */
function pitchFor(cv) { const a = cv.width * cv.height / (600 * 600); return Math.max(0.8, Math.min(1.35, 1.35 - 0.55 * Math.min(1, a))); }
function useCharacter(cv, save) {
  S.char = cv; S.pitch = pitchFor(cv); Sfx.setPitch(S.pitch); rig.setCharacter(cv); rig.reset(); setActive('dance', false);
  if (save) { try { const u = cv.toDataURL('image/webp', 0.92); localStorage.setItem(KEY, JSON.stringify({ img: u.startsWith('data:image/webp') ? u : cv.toDataURL('image/png') })); } catch (e) { } }
  drawResumeThumb();
}
function drawResumeThumb() { if (!S.char) return; const c = $('resumeThumb'), x = c.getContext('2d'); x.clearRect(0, 0, 64, 64); const sc = Math.min(60 / S.char.width, 60 / S.char.height); x.drawImage(S.char, (64 - S.char.width * sc) / 2, (64 - S.char.height * sc) / 2, S.char.width * sc, S.char.height * sc); $('btnResume').classList.remove('hidden'); }
function loadSaved(cb) {
  let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  if (!d || !d.img) return cb(false);
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); useCharacter(c, false); cb(true); };
  im.onerror = () => cb(false); im.src = d.img;
}
$('btnResume').onclick = () => { Sfx.unlock(); show('stage'); };

/* ---------- stage ---------- */
const bgCv = $('bgCv'), glCv = $('glCv'), fxCv = $('fxCv'), arena = $('arena');
const bgx = bgCv.getContext('2d'), fxx = fxCv.getContext('2d');
const rig = Rig.create(glCv);
let arenaW = 360, arenaH = 500, dpr = 1, stageActive = false, last = 0, parts = [], danceTimer = null;
function resizeArena() {
  const r = arena.getBoundingClientRect(); if (r.width < 10) return;
  arenaW = r.width; arenaH = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  for (const c of [bgCv, fxCv]) { c.width = Math.round(arenaW * dpr); c.height = Math.round(arenaH * dpr); c.style.width = arenaW + 'px'; c.style.height = arenaH + 'px'; }
  rig.resize(arenaW, arenaH, dpr);
}
new ResizeObserver(resizeArena).observe(arena); window.addEventListener('resize', resizeArena);
const COLORS = ['#ff4f8f', '#ffd23f', '#2ec4b6', '#4361ee', '#9b5de5', '#ff8a00', '#fff'];
function confetti(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 380; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 250, r: Math.random() * 6, vr: (Math.random() - .5) * 14, w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, c: COLORS[(Math.random() * COLORS.length) | 0], life: 1.6 + Math.random() }); } }
rig.events.land = w => { confetti(w.x, w.feetY, 26); Sfx.land(); };
rig.events.spin = w => confetti(w.x, w.y, 18);

const clouds = [{ x: .15, y: .12, s: 1, v: 6 }, { x: .6, y: .2, s: .75, v: 4 }, { x: .9, y: .08, s: .9, v: 8 }];
function drawBg(t) {
  const W = arenaW, H = arenaH, gy = H * 0.8, x = bgx; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = x.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#6ccfff'); sky.addColorStop(1, '#d6f4ff'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
  // sun with rays
  const sx = W * 0.8, sy = H * 0.22, sr = Math.min(W, H) * 0.075; x.save(); x.translate(sx, sy); x.rotate(t * 0.3); x.fillStyle = '#ffe680';
  for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.beginPath(); x.moveTo(sr * 1.25, -sr * 0.16); x.lineTo(sr * 1.9, 0); x.lineTo(sr * 1.25, sr * 0.16); x.fill(); } x.restore();
  x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.fill(); x.fillStyle = '#7a4a00'; x.beginPath(); x.arc(sx - sr * .3, sy - sr * .1, sr * .1, 0, 7); x.arc(sx + sr * .3, sy - sr * .1, sr * .1, 0, 7); x.fill(); x.strokeStyle = '#7a4a00'; x.lineWidth = 2.5; x.beginPath(); x.arc(sx, sy + sr * .1, sr * .45, 0.2, Math.PI - 0.2); x.stroke();
  // clouds
  x.fillStyle = '#fff'; for (const c of clouds) { const cx = ((c.x + (t * c.v) / W / 6) % 1.3) * W - 0.15 * W, cy = c.y * H, s = c.s * Math.min(W, H) * 0.09; x.beginPath(); x.arc(cx, cy, s, 0, 7); x.arc(cx + s * 1.1, cy + s * .15, s * .8, 0, 7); x.arc(cx - s * 1.1, cy + s * .2, s * .7, 0, 7); x.arc(cx + s * .2, cy + s * .3, s * 1.1, 0, 7); x.fill(); }
  // hills
  x.fillStyle = '#8ee07a'; x.beginPath(); x.moveTo(0, gy); x.quadraticCurveTo(W * .2, gy - H * .16, W * .5, gy - H * .04); x.quadraticCurveTo(W * .8, gy - H * .14, W, gy - H * .02); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  x.fillStyle = '#6ccf5a'; x.beginPath(); x.moveTo(0, gy - H * .02); x.quadraticCurveTo(W * .3, gy - H * .08, W * .6, gy - H * .01); x.quadraticCurveTo(W * .85, gy + H * .02, W, gy - H * .03); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  const gr = x.createLinearGradient(0, gy - H * .03, 0, H); gr.addColorStop(0, '#5fc050'); gr.addColorStop(1, '#3fa43b'); x.fillStyle = gr; x.fillRect(0, gy - H * .015, W, H);
  // flowers
  for (let i = 0; i < 9; i++) { const fx = (i * 0.137 + 0.05) % 1 * W, fy = gy + H * (0.03 + ((i * 7) % 5) * 0.035), r = 5 + (i % 3) * 1.5; x.fillStyle = COLORS[i % 5]; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(fx + Math.cos(k * 1.256) * r, fy + Math.sin(k * 1.256) * r, r * .7, 0, 7); x.fill(); } x.fillStyle = '#ffe14d'; x.beginPath(); x.arc(fx, fy, r * .6, 0, 7); x.fill(); }
  // shadow
  if (S.char) { const g = rig.groundInfo(); x.fillStyle = `rgba(20,60,20,${g.alpha})`; x.beginPath(); x.ellipse(g.x, g.y + 4, g.rx, g.rx * 0.2, 0, 0, 7); x.fill(); }
}
function drawFx(dt) {
  const x = fxx; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, arenaW, arenaH); if (!parts.length) return;
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0 || p.y > arenaH + 20) { parts.splice(i, 1); continue; } p.vy += 700 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.min(1, p.life * 2); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }
}
function frame(ts) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
  if (!stageActive || !S.char) return;
  rig.update(dt); drawBg(ts / 1000); rig.draw(); drawFx(dt);
}
requestAnimationFrame(frame);

function setActive(a, on) { const b = document.querySelector(`.act[data-act="${a}"]`); if (b) b.classList.toggle('on', on); }
function act(a) {
  Sfx.unlock(); if (!S.char) return;
  if (a === 'dance') { const on = rig.trigger('dance'); clearTimeout(danceTimer); setActive('dance', on); if (on) { Sfx.playFor('dance'); Sfx.music(true); confetti(arenaW / 2, arenaH * 0.45, 30); } else Sfx.music(false); return; }
  if (a === 'sound') { Sfx.random(); rig.trigger('wobble'); return; }
  rig.trigger(a); Sfx.playFor(a);
}
document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
arena.addEventListener('pointerdown', e => {
  Sfx.unlock(); if (!S.char) return; const r = arena.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (rig.hit(x, y)) {
    const opts = ['jump', 'spin', 'wobble', 'wobble', 'dance4']; const o = opts[(Math.random() * opts.length) | 0];
    if (o === 'dance4') { if (!rig.isDancing()) { act('dance'); danceTimer = setTimeout(() => { if (rig.isDancing()) act('dance'); }, 5000); } else Sfx.playFor('tap'), rig.trigger('wobble'); }
    else if (o === 'wobble') { rig.trigger('wobble'); Sfx.playFor('wobble'); } else act(o);
  } else { Sfx.play('pop'); confetti(x, y, 14); }
});
$('btnNew').onclick = () => show('home');
$('btnEdit').onclick = () => { if (S.src) startEditor(S.src, 'stage'); else show('home'); };
$('btnSave').onclick = () => { if (!S.char) return; S.char.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'doodlealive.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Obrázok uložený 💾'); }, 'image/png'); };
function updMute() { $('btnMute').textContent = Sfx.isMuted() ? '🔇' : '🔊'; }
$('btnMute').onclick = () => { Sfx.setMuted(!Sfx.isMuted()); try { localStorage.setItem(MUTE_KEY, Sfx.isMuted() ? '1' : '0'); } catch (e) { } updMute(); if (!Sfx.isMuted()) { Sfx.unlock(); Sfx.play('pop'); if (rig.isDancing()) Sfx.music(true); } };

/* ---------- boot ---------- */
try { if (localStorage.getItem(MUTE_KEY) === '1') Sfx.setMuted(true); } catch (e) { } updMute();
buildSamples();
loadSaved(ok => { if (ok) { show('stage'); } else show('home'); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
window.DA = { S, rig, show, startEditor, act, confetti, Sfx };
})();

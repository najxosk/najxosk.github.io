(() => {
'use strict';
const W = CONFIG.world.w, H = CONFIG.world.h;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const other = s => s === 'player' ? 'ai' : 'player';
const baseY = s => s === 'player' ? H - 26 : 26;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

let S = null, opts = { lanes: 1, diff: 0.85 }, autoplay = /auto=1/.test(location.search);
let tab = 'send', scale = 1, offX = 0, offY = 0, dpr = 1;

function makeHero(side) {
  const d = HEROES[SIDES[side].hero];
  const h = { side, def: d, isHero: true, level: 1, xp: 0, bonus: { dmg: 0, hp: 0, armor: 0, as: 0, speed: 0, regen: 0 },
    x: W / 2, y: side === 'player' ? H - 90 : 90, cd: 0, abCd: {}, dead: false, respawn: 0, target: null, flash: 0, up: { sila: 0, zdravie: 0, rychlost: 0 }, items: {} };
  d.abilities.forEach(a => h.abCd[a] = 0);
  h.hp = maxHp(h);
  return h;
}
const maxHp = h => h.def.hp + h.def.perLevel.hp * (h.level - 1) + h.bonus.hp;
const hDmg = h => h.def.dmg + h.def.perLevel.dmg * (h.level - 1) + h.bonus.dmg;
const hArmor = h => h.def.armor + h.def.perLevel.armor * (h.level - 1) + h.bonus.armor;
const hSpeed = h => h.def.speed + h.bonus.speed;
const xpNeed = h => 50 + h.level * 45;

function newGame() {
  S = { time: 0, wave: 0, waveT: CONFIG.firstWave, running: true, over: false, units: [], fx: [], texts: [],
    lanes: CONFIG.lanes[opts.lanes], spawnQ: [], aiT: 0, stats: { kills: 0, sent: 0 },
    side: {} };
  for (const s of ['player', 'ai']) S.side[s] = { lives: CONFIG.baseLives, gold: CONFIG.startGold, income: CONFIG.baseIncome, hero: makeHero(s), laneIdx: 0, flash: 0 };
  $('startScreen').classList.add('hidden'); $('endScreen').classList.add('hidden');
  buildAbilities(); renderTab();
}

// ---------- jednotky ----------
function spawnUnit(side, def, scaleF, laneX) {
  const dir = side === 'player' ? -1 : 1;
  S.units.push({ side, def, x: laneX + rnd(-8, 8), laneX, y: baseY(side) + dir * 14 + rnd(-4, 4), dir,
    hp: def.hp * scaleF, maxHp: def.hp * scaleF, dmg: def.dmg * (0.6 + 0.4 * scaleF), cd: rnd(0, 0.5), stun: 0, flash: 0, dead: false });
}
function nextLane(side) { const sd = S.side[side]; const x = S.lanes[sd.laneIdx % S.lanes.length]; sd.laneIdx++; return x; }
function waveScale(w) { return 1 + 0.14 * (w - 1) + (w > 20 ? 0.3 * Math.pow(w - 20, 1.4) : 0); }

function sendUnit(side, key) {
  const u = UNITS[key], sd = S.side[side];
  if (!S.running || sd.gold < u.cost) return false;
  sd.gold -= u.cost; sd.income += u.income;
  spawnUnit(side, u, 1 + 0.05 * S.wave, nextLane(side));
  if (side === 'player') { S.stats.sent++; floatText(W / 2, H - 50, '+' + u.income + ' príjem', '#ffd34d'); }
  return true;
}

function startWave() {
  S.wave++; S.waveT = CONFIG.waveTime;
  const n = 2 + Math.floor(S.wave / 2);
  for (const s of ['player', 'ai']) {
    const sd = S.side[s];
    const inc = Math.round(sd.income * (s === 'ai' ? opts.diff : 1));
    sd.gold += inc;
    if (s === 'player') floatText(W / 2, H - 70, '+' + inc + ' 💰', '#ffd34d');
    const per = S.lanes.length > 1 ? Math.ceil(n * 0.6) : n;
    for (let i = 0; i < per; i++) for (const lx of S.lanes) S.spawnQ.push({ t: i * 0.7, side: s, lx });
  }
  floatText(W / 2, H / 2, 'Vlna ' + S.wave, '#f0c35a', 26);
}

function damage(t, amt, src) {
  const armor = t.isHero ? hArmor(t) : t.def.armor;
  const red = armor > 0 ? 1 - (armor * 0.06) / (1 + armor * 0.06) : 1;
  const d = Math.max(1, amt * red);
  t.hp -= d; t.flash = 0.12;
  floatText(t.x + rnd(-5, 5), t.y - 12, Math.round(d), t.isHero ? '#ff6060' : '#ffffff', t.isHero ? 13 : 11);
  if (t.hp <= 0) {
    if (t.isHero) { t.dead = true; t.hp = 0; t.respawn = 5 + t.level * 1.2; S.fx.push({ type: 'ring', x: t.x, y: t.y, r: 30, t: 0.6, c: '#ff3030' }); }
    else if (!t.dead) {
      t.dead = true;
      const killer = S.side[other(t.side)];
      killer.gold += t.def.bounty;
      if (src && src.isHero) gainXp(src, t.def.xp);
      if (t.side === 'ai') { S.stats.kills++; floatText(t.x, t.y - 22, '+' + t.def.bounty, '#ffd34d', 11); }
      for (let i = 0; i < 6; i++) S.fx.push({ type: 'p', x: t.x, y: t.y, vx: rnd(-60, 60), vy: rnd(-60, 60), t: 0.5, c: SIDES[t.side].color });
    }
  }
}
function gainXp(h, xp) {
  h.xp += xp;
  while (h.xp >= xpNeed(h)) {
    h.xp -= xpNeed(h); h.level++; h.hp += h.def.perLevel.hp;
    floatText(h.x, h.y - 26, 'Úroveň ' + h.level + '!', '#c89bff', 15);
    S.fx.push({ type: 'ring', x: h.x, y: h.y, r: 40, t: 0.7, c: '#c89bff' });
  }
}
function floatText(x, y, s, c, size = 12) { S.texts.push({ x, y, s: String(s), c, size, t: 1 }); }

function useAbility(side, key) {
  const h = S.side[side].hero, a = ABILITIES[key];
  if (!S.running || h.dead || h.abCd[key] > 0) return false;
  h.abCd[key] = a.cd;
  if (a.type === 'nova') {
    const dmg = a.dmg + a.dmgPerLevel * h.level + hDmg(h) * 0.5;
    for (const u of S.units) if (!u.dead && u.side !== side && dist(u, h) <= a.radius) { damage(u, dmg, h); u.stun = a.stun; }
    S.fx.push({ type: 'nova', x: h.x, y: h.y, r: a.radius, t: 0.45, c: '#9fd8ff' });
  } else if (a.type === 'heal') {
    const amt = maxHp(h) * a.pct; h.hp = Math.min(maxHp(h), h.hp + amt);
    floatText(h.x, h.y - 24, '+' + Math.round(amt), '#6dff8a', 15);
    S.fx.push({ type: 'ring', x: h.x, y: h.y, r: 26, t: 0.6, c: '#6dff8a' });
  }
  return true;
}
function buyUpgrade(side, key) {
  const h = S.side[side].hero, u = UPGRADES[key], cost = u.baseCost + u.step * h.up[key], sd = S.side[side];
  if (!S.running || sd.gold < cost) return false;
  sd.gold -= cost; h.up[key]++; u.apply(h); return true;
}
function buyItem(side, key) {
  const h = S.side[side].hero, it = ITEMS[key], sd = S.side[side];
  if (!S.running || sd.gold < it.cost || (h.items[key] || 0) >= it.max) return false;
  sd.gold -= it.cost; h.items[key] = (h.items[key] || 0) + 1; it.apply(h); return true;
}

// ---------- AI (aj autoplay hráča) ----------
function aiThink(side) {
  const sd = S.side[side], h = sd.hero, mine = side === 'player' ? (y => y > H / 2) : (y => y < H / 2);
  const foes = S.units.filter(u => !u.dead && u.side !== side);
  if (!h.dead) {
    const near = foes.filter(u => dist(u, h) < ABILITIES.hrom.radius).length;
    if (near >= 3 || (near >= 1 && h.hp < maxHp(h) * 0.5)) useAbility(side, 'hrom');
    if (h.hp < maxHp(h) * 0.45) useAbility(side, 'liecenie');
    const threats = foes.filter(u => mine(u.y)).sort((a, b) => Math.abs(a.y - baseY(side)) - Math.abs(b.y - baseY(side)));
    if (!foes.some(u => dist(u, h) < h.def.acquire)) {
      if (threats.length) h.target = { x: threats[0].x, y: threats[0].y };
      else h.target = { x: W / 2, y: side === 'player' ? H * 0.68 : H * 0.32 };
    }
  }
  // nákupy
  const totalUp = h.up.sila + h.up.zdravie + h.up.rychlost;
  const order = ['sila', 'zdravie', 'sila', 'rychlost'];
  const upKey = order[totalUp % order.length];
  const upCost = UPGRADES[upKey].baseCost + UPGRADES[upKey].step * h.up[upKey];
  if (totalUp < S.wave * 0.7 && sd.gold >= upCost) { buyUpgrade(side, upKey); return; }
  if (S.wave >= 6 && Math.random() < 0.3) for (const k of ['mec', 'stit', 'amulet']) if (sd.gold > ITEMS[k].cost + 40 && buyItem(side, k)) return;
  const pool = S.wave < 4 ? ['pesiak'] : S.wave < 8 ? ['pesiak', 'lukostrelec'] : ['lukostrelec', 'tank', 'mag', 'pesiak'];
  const k = pool[Math.floor(Math.random() * pool.length)];
  if (sd.gold >= UNITS[k].cost + 10) sendUnit(side, k);
}

// ---------- update ----------
function step(dt) {
  if (!S || !S.running) return;
  S.time += dt; S.waveT -= dt;
  if (S.waveT <= 0) startWave();
  for (let i = S.spawnQ.length - 1; i >= 0; i--) { const q = S.spawnQ[i]; q.t -= dt; if (q.t <= 0) { spawnUnit(q.side, WAVE_CREEP, waveScale(S.wave), q.lx); S.spawnQ.splice(i, 1); } }
  S.aiT -= dt;
  if (S.aiT <= 0) { S.aiT = 0.5; aiThink('ai'); if (autoplay) aiThink('player'); }
  for (const s of ['player', 'ai']) updateHero(S.side[s].hero, dt);
  for (const u of S.units) updateUnit(u, dt);
  S.units = S.units.filter(u => !u.dead);
  for (const f of S.fx) { f.t -= dt; if (f.type === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; } }
  S.fx = S.fx.filter(f => f.t > 0);
  for (const t of S.texts) { t.t -= dt; t.y -= 22 * dt; }
  S.texts = S.texts.filter(t => t.t > 0);
  for (const s of ['player', 'ai']) S.side[s].flash = Math.max(0, S.side[s].flash - dt);
  if (S.side.player.lives <= 0 || S.side.ai.lives <= 0) endGame(S.side.ai.lives <= 0);
}

function updateHero(h, dt) {
  h.flash = Math.max(0, h.flash - dt);
  for (const k in h.abCd) h.abCd[k] = Math.max(0, h.abCd[k] - dt);
  if (h.dead) {
    h.respawn -= dt;
    if (h.respawn <= 0) { h.dead = false; h.hp = maxHp(h); h.x = W / 2; h.y = h.side === 'player' ? H - 60 : 60; h.target = null; }
    return;
  }
  h.hp = Math.min(maxHp(h), h.hp + (h.def.regen + h.bonus.regen + h.level * 0.2) * dt);
  h.cd -= dt;
  const minY = h.side === 'player' ? H / 2 + 10 : 15, maxY = h.side === 'player' ? H - 15 : H / 2 - 10;
  const spd = hSpeed(h);
  const moveTo = (tx, ty) => { const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy); if (d > 1) { const m = Math.min(d, spd * dt); h.x += dx / d * m; h.y += dy / d * m; } return d; };
  if (h.target) {
    if (moveTo(h.target.x, h.target.y) < 3) h.target = null;
  } else {
    let best = null, bd = 1e9;
    for (const u of S.units) if (!u.dead && u.side !== h.side) { const d = dist(u, h); if (d < bd && d < h.def.acquire) { bd = d; best = u; } }
    if (best) {
      if (bd > h.def.range + best.def.size) moveTo(best.x, best.y);
      else if (h.cd <= 0) {
        h.cd = h.def.atkCd / (1 + h.bonus.as);
        damage(best, hDmg(h), h);
        S.fx.push({ type: 'slash', x: best.x, y: best.y, t: 0.15, c: '#fff6c0' });
      }
    }
  }
  h.x = Math.max(10, Math.min(W - 10, h.x)); h.y = Math.max(minY, Math.min(maxY, h.y));
}

function updateUnit(u, dt) {
  if (u.dead) return;
  u.flash = Math.max(0, u.flash - dt);
  if (u.stun > 0) { u.stun -= dt; return; }
  u.cd -= dt;
  const eh = S.side[other(u.side)].hero;
  const d = eh.dead ? 1e9 : dist(u, eh);
  if (d < CONFIG.heroAggro + u.def.range) {
    if (d > u.def.range + eh.def.size) {
      u.x += (eh.x - u.x) / d * u.def.speed * dt; u.y += (eh.y - u.y) / d * u.def.speed * dt;
    } else if (u.cd <= 0) {
      u.cd = u.def.atkCd; damage(eh, u.dmg, u);
      if (u.def.range > 30) S.fx.push({ type: 'bolt', x: u.x, y: u.y, x2: eh.x, y2: eh.y, t: 0.12, c: u.def.shape === 'star' ? '#d07bff' : '#ffe08a' });
    }
  } else {
    u.y += u.dir * u.def.speed * dt;
    u.x += (u.laneX - u.x) * Math.min(1, dt * 1.5);
  }
  const ey = baseY(other(u.side));
  if ((u.dir < 0 && u.y <= ey + 8) || (u.dir > 0 && u.y >= ey - 8)) {
    u.dead = true;
    const os = S.side[other(u.side)];
    os.lives = Math.max(0, os.lives - u.def.lives); os.flash = 0.4;
    floatText(u.x, ey + (u.dir < 0 ? 20 : -20), '-' + u.def.lives + ' 🛡', '#ff5050', 14);
  }
}

function endGame(win) {
  S.running = false; S.over = true;
  $('endTitle').textContent = win ? 'Víťazstvo!' : 'Porážka';
  $('endTitle').style.color = win ? '#f0c35a' : '#ff6a5a';
  $('endInfo').innerHTML = `Čas: ${fmt(S.time)} · Vlna: ${S.wave}<br>Úroveň hrdinu: ${S.side.player.hero.level} · Zabitých: ${S.stats.kills} · Poslaných: ${S.stats.sent}`;
  $('endScreen').classList.remove('hidden');
}

// ---------- kreslenie ----------
function resize() {
  const st = $('stage'), r = st.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  scale = Math.min(r.width / W, r.height / H);
  cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
}
function shape(kind, x, y, s) {
  ctx.beginPath();
  if (kind === 'square') ctx.rect(x - s, y - s, s * 2, s * 2);
  else if (kind === 'triangle') { ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y + s); ctx.closePath(); }
  else if (kind === 'hex') for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s, y + Math.sin(a) * s); }
  else if (kind === 'star') for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * 0.5 : s * 1.2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
  else ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.closePath();
}
function bar(x, y, w, p, c) { ctx.fillStyle = '#000a'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); ctx.fillStyle = p > 0.5 ? c : p > 0.25 ? '#e0b030' : '#e04030'; ctx.fillRect(x - w / 2, y, w * Math.max(0, p), 3); }
function drawBase(side) {
  const y = baseY(side), sd = S.side[side], c = SIDES[side];
  ctx.fillStyle = sd.flash > 0 ? '#fff' : c.dark;
  ctx.fillRect(W / 2 - 70, y - 14, 140, 28);
  ctx.fillStyle = c.color;
  for (let i = 0; i < 7; i++) ctx.fillRect(W / 2 - 70 + i * 21, side === 'player' ? y - 20 : y + 14, 12, 6);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((side === 'player' ? 'Tvoja pevnosť ' : 'Nepriateľ ') + sd.lives, W / 2, y);
}
function draw() {
  if (!S) return;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1218'); g.addColorStop(0.5, '#16131c'); g.addColorStop(1, '#101a2a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const lx of S.lanes) { ctx.fillStyle = '#3a2f2244'; ctx.fillRect(lx - 22, 0, 44, H); ctx.strokeStyle = '#5a4a3244'; ctx.strokeRect(lx - 22, 0, 44, H); }
  ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff22'; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
  drawBase('player'); drawBase('ai');
  for (const u of S.units) {
    ctx.fillStyle = u.flash > 0 ? '#ffffff' : SIDES[u.side].color;
    shape(u.def.shape, u.x, u.y, u.def.size); ctx.fill();
    ctx.strokeStyle = '#000a'; ctx.lineWidth = 1.5; ctx.stroke();
    if (u.stun > 0) { ctx.fillStyle = '#9fd8ff'; ctx.font = '10px system-ui'; ctx.fillText('★', u.x, u.y - u.def.size - 9); }
    bar(u.x, u.y - u.def.size - 6, Math.max(14, u.def.size * 2.4), u.hp / u.maxHp, '#50d060');
  }
  for (const s of ['player', 'ai']) {
    const h = S.side[s].hero; if (h.dead) continue;
    if (s === 'player' && h.target) { ctx.strokeStyle = '#7cc0ff88'; ctx.beginPath(); ctx.arc(h.target.x, h.target.y, 6, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 10, 12, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = h.flash > 0 ? '#fff' : SIDES[s].color; shape('circle', h.x, h.y, h.def.size); ctx.fill();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 10px system-ui'; ctx.fillText(h.level, h.x, h.y + 1);
    bar(h.x, h.y - 20, 34, h.hp / maxHp(h), '#50e060');
  }
  for (const f of S.fx) {
    ctx.globalAlpha = Math.min(1, f.t * 3);
    if (f.type === 'p') { ctx.fillStyle = f.c; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); }
    else if (f.type === 'ring' || f.type === 'nova') { ctx.strokeStyle = f.c; ctx.lineWidth = f.type === 'nova' ? 5 : 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (f.type === 'nova' ? 1 - f.t : 1.2 - f.t), 0, 7); ctx.stroke(); ctx.lineWidth = 1; }
    else if (f.type === 'slash') { ctx.strokeStyle = f.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x - 7, f.y - 7); ctx.lineTo(f.x + 7, f.y + 7); ctx.stroke(); ctx.lineWidth = 1; }
    else if (f.type === 'bolt') { ctx.strokeStyle = f.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.lineWidth = 1; }
  }
  ctx.globalAlpha = 1;
  for (const t of S.texts) { ctx.globalAlpha = Math.min(1, t.t * 2); ctx.font = `bold ${t.size}px system-ui`; ctx.fillStyle = '#000'; ctx.fillText(t.s, t.x + 1, t.y + 1); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
}

// ---------- UI ----------
function buildAbilities() {
  const box = $('abil'); box.innerHTML = '';
  for (const k of S.side.player.hero.def.abilities) {
    const a = ABILITIES[k], b = document.createElement('button');
    b.className = 'ab'; b.dataset.ab = k; b.title = a.name;
    b.innerHTML = `<span class="key">${a.key}</span>${a.icon}<div class="cdv"></div><div class="cdt"></div>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); useAbility('player', k); });
    box.appendChild(b);
  }
}
function renderTab() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('tabBody'); body.innerHTML = '';
  const add = (id, html, fn) => { const b = document.createElement('button'); b.className = 'it'; b.dataset.id = id; b.innerHTML = html; b.addEventListener('click', () => { fn(); updateUI(true); }); body.appendChild(b); };
  if (tab === 'send') for (const k in UNITS) { const u = UNITS[k]; add(k, `<b>${u.name}</b><small>❤${u.hp} ⚔${u.dmg} · +${u.income} príjem</small><span class="c">${u.cost} 💰</span>`, () => sendUnit('player', k)); }
  if (tab === 'hero') for (const k in UPGRADES) { const u = UPGRADES[k]; add(k, `<b>${u.name} <span class="lv"></span></b><small>${u.desc}</small><span class="c"></span>`, () => buyUpgrade('player', k)); }
  if (tab === 'shop') for (const k in ITEMS) { const it = ITEMS[k]; add(k, `<b>${it.name} <span class="lv"></span></b><small>${it.desc}</small><span class="c">${it.cost} 💰</span>`, () => buyItem('player', k)); }
  updateUI(true);
}
let uiT = 0;
function updateUI(force) {
  if (!S) return;
  const sd = S.side.player, h = sd.hero;
  $('hpYou').textContent = sd.lives; $('hpFoe').textContent = S.side.ai.lives;
  $('goldTxt').textContent = Math.floor(sd.gold); $('incTxt').textContent = sd.income;
  $('waveTxt').textContent = S.wave ? 'Vlna ' + S.wave : 'Príprava'; $('timerTxt').textContent = fmt(S.waveT);
  $('lvlTxt').textContent = h.level; $('xpBar').firstElementChild.style.width = (h.xp / xpNeed(h) * 100) + '%';
  document.querySelectorAll('.ab').forEach(b => { const k = b.dataset.ab, c = h.abCd[k], a = ABILITIES[k];
    b.querySelector('.cdv').style.height = (c / a.cd * 100) + '%'; b.querySelector('.cdt').textContent = c > 0 ? Math.ceil(c) : ''; b.disabled = h.dead; });
  const rs = $('respawn'); rs.classList.toggle('hidden', !h.dead); if (h.dead) rs.textContent = 'Hrdina padol – oživenie o ' + Math.ceil(h.respawn) + ' s';
  document.querySelectorAll('#tabBody .it').forEach(b => {
    const k = b.dataset.id;
    if (tab === 'send') b.disabled = sd.gold < UNITS[k].cost;
    if (tab === 'hero') { const u = UPGRADES[k], c = u.baseCost + u.step * h.up[k]; b.querySelector('.c').textContent = c + ' 💰'; b.querySelector('.lv').textContent = '(' + h.up[k] + ')'; b.disabled = sd.gold < c; }
    if (tab === 'shop') { const it = ITEMS[k], n = h.items[k] || 0; b.querySelector('.lv').textContent = n + '/' + it.max; b.disabled = sd.gold < it.cost || n >= it.max; }
  });
}

cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!S || !S.running) return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
  const h = S.side.player.hero; if (h.dead) return;
  h.target = { x: Math.max(10, Math.min(W - 10, x)), y: Math.max(H / 2 + 10, Math.min(H - 15, y)) };
  S.fx.push({ type: 'ring', x: h.target.x, y: h.target.y, r: 10, t: 0.4, c: '#7cc0ff' });
});
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderTab(); }));
document.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
  const grp = b.dataset.lanes ? 'lanes' : 'diff';
  document.querySelectorAll(`.opt[data-${grp}]`).forEach(o => o.classList.toggle('on', o === b));
  opts[grp] = +b.dataset[grp];
}));
$('btnStart').addEventListener('click', () => { newGame(); resize(); });
$('btnRestart').addEventListener('click', () => { $('endScreen').classList.add('hidden'); $('startScreen').classList.remove('hidden'); });
window.addEventListener('keydown', e => {
  if (!S || !S.running) return;
  const k = e.key.toUpperCase();
  for (const a in ABILITIES) if (ABILITIES[a].key === k) useAbility('player', a);
  for (const u in UNITS) if (UNITS[u].key === k) sendUnit('player', u);
  updateUI(true);
});
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('resize', resize);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  step(dt); draw();
  uiT -= dt; if (uiT <= 0) { uiT = 0.15; updateUI(); }
  requestAnimationFrame(loop);
}
resize(); requestAnimationFrame(loop);

// Testovací hák: HL.fastForward(sekundy), HL.setAuto(true)
window.HL = {
  get S() { return S; }, opts,
  start(o) { Object.assign(opts, o || {}); newGame(); resize(); },
  setAuto(v) { autoplay = !!v; },
  fastForward(sec, dt = 1 / 30) { for (let t = 0; t < sec && S && S.running; t += dt) step(dt); updateUI(true); return { time: S.time, wave: S.wave, lives: [S.side.player.lives, S.side.ai.lives], over: S.over, units: S.units.length }; },
};
})();

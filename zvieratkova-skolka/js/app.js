(function () {
  'use strict';
  const { GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG } = window.ZS_GAMES;
  const $ = s => document.querySelector(s);
  const KEY = 'zvieratkovaSkolka.v1';

  // ---------- state & storage ----------
  let save = { lang: 'sk', muted: false, games: {} };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } };
  const gs = id => (save.games[id] = save.games[id] || { done: [], next: 0 });
  const starsOf = id => gs(id).done.length;

  const UI = {
    sk: {
      welcome: 'Ahoj! Ja som pani učiteľka Medvedica z lesnej školy. Dnes sa budeme spolu hrať a učiť. Ťukni na zelené tlačidlo!',
      menu: 'Vyber si hru! Ťukni na obrázok.',
      praise: ['Výborne!', 'Super!', 'Šikovné!', 'Bravo!', 'Paráda!', 'To je ono!'],
      retry: 'Skús to ešte raz.', done: 'Hurá! Všetkých 50 úloh je hotových! Si úžasný kamarát. Môžeš hrať znova alebo si vybrať inú hru.',
      home: 'Domov', speak: 'Zopakuj', music: 'Hudba', lang: 'Jazyk'
    },
    en: {
      welcome: 'Hello! I am Mrs. Bear, the teacher of the forest school. Today we will play and learn together. Tap the green button!',
      menu: 'Choose a game! Tap a picture.',
      praise: ['Well done!', 'Great!', 'Clever!', 'Bravo!', 'Super!', 'That is it!'],
      retry: 'Try again.', done: 'Hooray! All 50 tasks are done! You are amazing. You can play again or choose another game.',
      home: 'Home', speak: 'Repeat', music: 'Music', lang: 'Language'
    }
  };
  const ui = () => UI[save.lang];

  // ---------- speech ----------
  let voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  let lastSpoken = '';
  function say(text, opt) {
    lastSpoken = (opt && opt.keep) ? lastSpoken : text;
    if (!('speechSynthesis' in window) || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const code = save.lang === 'sk' ? 'sk' : 'en';
      u.lang = code === 'sk' ? 'sk-SK' : 'en-GB';
      const v = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(code + '-')) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(code));
      if (v) u.voice = v;
      u.rate = (opt && opt.rate) || 0.88; u.pitch = 1.1;
      u.onstart = () => duck(true); u.onend = u.onerror = () => duck(false);
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  // ---------- music & sfx ----------
  const music = $('#music');
  music.volume = 0.3;
  let audioUnlocked = false, actx = null;
  function duck(on) { music.volume = on ? 0.1 : 0.3; }
  function startMusic() { if (!save.muted && audioUnlocked) { const p = music.play(); if (p && p.catch) p.catch(() => {}); } }
  function unlock() {
    if (audioUnlocked) return; audioUnlocked = true;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    startMusic();
  }
  function tone(freqs, dur, type, vol) {
    if (!actx || save.muted) return;
    const t0 = actx.currentTime;
    freqs.forEach((f, k) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      const s = t0 + k * 0.09;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol || 0.12, s + 0.02); g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + dur + 0.05);
    });
  }
  const sfxGood = () => tone([784, 988, 1175, 1568], 0.5, 'sine', 0.1);
  const sfxSoft = () => tone([392, 330], 0.35, 'triangle', 0.08);
  document.addEventListener('pointerdown', unlock, { capture: true });

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.body.className = 's-' + id.replace('scr', '').toLowerCase();
  }
  function setTopbar(title) {
    $('#tbTitle').textContent = title || 'Zvieratková škôlka';
    $('#btnLang').textContent = save.lang.toUpperCase();
    $('#btnMusic').classList.toggle('off', save.muted);
    $('#btnHome').setAttribute('aria-label', ui().home); $('#btnSpeak').setAttribute('aria-label', ui().speak);
    document.documentElement.lang = save.lang;
  }
  function totalStars() { return GAMES.reduce((a, g) => a + starsOf(g.id), 0); }
  function updStars(n) { $('#tbStars span').textContent = n; }

  function openWelcome() { show('scrWelcome'); setTopbar(); $('#welcomeText').textContent = ui().welcome; say(ui().welcome); }
  function openMenu() {
    cur = null; show('scrMenu'); setTopbar(); updStars(totalStars());
    $('#menuText').textContent = ui().menu;
    const c = $('#cards'); c.innerHTML = '';
    GAMES.forEach(g => {
      const b = document.createElement('button');
      b.className = 'card'; b.style.background = g.color; b.dataset.game = g.id;
      b.setAttribute('aria-label', g.title[save.lang]);
      b.innerHTML = `<img src="assets/animals/${g.img}.webp" alt=""><span class="ct">${g.title[save.lang]}</span><span class="cs">⭐ ${starsOf(g.id)} / ${TASKS_PER_GAME}</span>`;
      b.onclick = () => openGame(g.id);
      c.appendChild(b);
    });
    say(ui().menu);
  }

  // ---------- game ----------
  let cur = null; // {game, index, task, wrong, locked}
  function openGame(id, from) {
    const g = GAMES.find(x => x.id === id);
    const st = gs(id);
    let idx = from != null ? from : st.next;
    if (idx >= TASKS_PER_GAME) idx = firstUnsolved(id);
    cur = { game: g, index: idx, intro: true };
    show('scrGame'); setTopbar(g.title[save.lang]);
    $('#helperImg').src = `assets/animals/${g.img}.webp`;
    loadTask();
  }
  function firstUnsolved(id) { const d = new Set(gs(id).done); for (let k = 0; k < TASKS_PER_GAME; k++) if (!d.has(k)) return k; return 0; }

  function bubble(text, hint, extra) {
    const b = $('#bubble'); b.textContent = text; b.classList.toggle('hint', !!hint);
    if (extra) b.insertAdjacentHTML('beforeend', ' ' + extra);
    const h = $('#helperImg'); h.classList.remove('talk'); void h.offsetWidth; h.classList.add('talk');
  }

  function loadTask() {
    const g = cur.game;
    const t = getTask(g.id, cur.index, save.lang);
    cur.task = t; cur.wrong = 0; cur.locked = false;
    gs(g.id).next = cur.index; persist();
    updStars(starsOf(g.id));
    $('#progFill').style.width = (100 * starsOf(g.id) / TASKS_PER_GAME) + '%';
    $('#progTxt').textContent = `${cur.index + 1} / ${TASKS_PER_GAME}`;
    const stage = $('#stage'), opts = $('#options');
    stage.innerHTML = ''; opts.innerHTML = '';
    if (t.kind === 'choose') renderChoose(t, stage, opts);
    else if (t.kind === 'give') renderGive(t, stage, opts);
    else renderDress(t, stage, opts);
    stage.querySelectorAll('[data-say]').forEach(el => el.onclick = () => say(el.dataset.say, { rate: 0.7, keep: true }));
    bubble(t.prompt);
    const speech = t.say || t.prompt;
    if (cur.intro) { cur.intro = false; say(g.intro[save.lang] + ' ' + speech); lastSpoken = speech; }
    else say(speech);
  }

  function renderChoose(t, stage, opts) {
    stage.innerHTML = t.display;
    const n = t.options.length;
    const portrait = innerHeight > innerWidth;
    let cols = t.wide ? (n <= 2 ? 2 : (portrait ? 1 : 2)) : n <= 3 ? n : n === 4 ? (portrait ? 2 : 2) : 3;
    if (t.houses) cols = n;
    if (t.wide && n > 2) cols = portrait ? 2 : 2;
    opts.style.setProperty('--cols', cols);
    t.options.forEach((o, k) => {
      const b = document.createElement('button');
      b.className = 'opt' + (t.houses ? ' housebtn' : ''); b.innerHTML = o.html; b.dataset.ok = o.ok ? '1' : '0'; b.dataset.k = k;
      b.onclick = () => choose(b, o.ok);
      opts.appendChild(b);
    });
  }
  function choose(btn, ok) {
    if (cur.locked) return;
    if (ok) { btn.classList.add('good'); success(btn); }
    else { btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong'); wrongAnswer(); }
  }
  function wrongAnswer(customHint) {
    cur.wrong++; sfxSoft();
    const t = cur.task;
    const hint = customHint || t.hint || ui().retry;
    bubble(hint, true, t.hintShow);
    say(hint);
    if (cur.wrong >= 2 && t.kind === 'choose') { const g = $('#options .opt[data-ok="1"]'); if (g) g.classList.add('glow'); }
  }
  function success(fromEl) {
    cur.locked = true; sfxGood();
    const g = cur.game, st = gs(g.id);
    if (!st.done.includes(cur.index)) st.done.push(cur.index);
    persist();
    const p = ui().praise[Math.floor(Math.random() * ui().praise.length)];
    bubble(p + ' ⭐'); say(p);
    flyStar(fromEl);
    updStars(starsOf(g.id));
    $('#progFill').style.width = (100 * starsOf(g.id) / TASKS_PER_GAME) + '%';
    setTimeout(() => {
      if (!cur || cur.game !== g) return;
      if (cur.index >= TASKS_PER_GAME - 1) return finish();
      cur.index++; loadTask();
    }, 1500);
  }
  function finish() {
    const g = cur.game; gs(g.id).next = 0; persist();
    show('scrDone'); setTopbar(g.title[save.lang]);
    $('#doneImg').src = `assets/animals/${g.img}.webp`;
    $('#doneText').textContent = ui().done; say(ui().done);
  }
  function flyStar(el) {
    const s = document.createElement('div'); s.className = 'flystar'; s.textContent = '⭐';
    const r = (el || $('#stage')).getBoundingClientRect(), tr = $('#tbStars').getBoundingClientRect();
    s.style.left = (r.left + r.width / 2 - 28) + 'px'; s.style.top = (r.top + r.height / 2 - 28) + 'px';
    document.body.appendChild(s);
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.left = (tr.left) + 'px'; s.style.top = (tr.top - 10) + 'px'; s.style.transform = 'scale(.5) rotate(360deg)'; s.style.opacity = '.4'; }));
    setTimeout(() => s.remove(), 1000);
  }

  function renderGive(t, stage, opts) {
    stage.innerHTML = t.display + '<span class="emo">🐿️</span>';
    opts.style.setProperty('--cols', 1);
    const wrap = document.createElement('div'); wrap.className = 'give';
    const pile = document.createElement('div'); pile.className = 'pile';
    const basket = document.createElement('div'); basket.className = 'basket'; basket.innerHTML = '<div class="lbl">🧺</div>';
    let inBasket = 0;
    for (let k = 0; k < 10; k++) {
      const n = document.createElement('button'); n.className = 'nutbtn'; n.textContent = '🌰'; n.setAttribute('aria-label', 'nut');
      n.onclick = () => { if (cur.locked) return; if (n.parentNode === pile) { basket.appendChild(n); inBasket++; } else { pile.appendChild(n); inBasket--; } tone([523 + inBasket * 40], 0.15, 'sine', 0.07); };
      pile.appendChild(n);
    }
    wrap.append(pile, basket); opts.appendChild(wrap);
    const done = document.createElement('button'); done.className = 'donebtn'; done.textContent = '✔'; done.setAttribute('aria-label', 'OK');
    done.onclick = () => {
      if (cur.locked) return;
      if (inBasket === t.n) success(basket);
      else {
        basket.classList.remove('wrong'); void basket.offsetWidth; basket.classList.add('wrong');
        const more = inBasket < t.n;
        const h = save.lang === 'sk' ? `V košíku je ${inBasket}. Potrebujeme ${t.n}. ${more ? 'Pridaj ešte.' : 'Niektoré vráť späť.'}`
          : `There are ${inBasket} in the basket. We need ${t.n}. ${more ? 'Add some more.' : 'Take some back.'}`;
        wrongAnswer(h);
      }
    };
    opts.appendChild(done);
  }

  function renderDress(t, stage, opts) {
    const mine = {};
    stage.innerHTML = `<div class="dresswrap"><div class="order">📋${bunnySVG(t.target, 'bunny')}</div><div class="mybunny"></div></div>`;
    const myb = stage.querySelector('.mybunny');
    const redraw = () => { myb.innerHTML = bunnySVG(mine, 'bunny'); };
    redraw();
    opts.style.setProperty('--cols', 1);
    const wr = document.createElement('div'); wr.className = 'wardrobe';
    t.slots.forEach(slot => {
      const row = document.createElement('div'); row.className = 'wrow'; row.dataset.slot = slot;
      t.choices[slot].forEach(val => {
        const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = itemSVG(slot, val);
        b.dataset.val = val; b.dataset.ok = val === t.target[slot] ? '1' : '0';
        b.onclick = () => {
          if (cur.locked) return;
          mine[slot] = mine[slot] === val ? undefined : val;
          row.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x.dataset.val === mine[slot]));
          redraw(); tone([660], 0.12, 'sine', 0.06);
        };
        row.appendChild(b);
      });
      wr.appendChild(row);
    });
    opts.appendChild(wr);
    const done = document.createElement('button'); done.className = 'donebtn'; done.textContent = '✔'; done.setAttribute('aria-label', 'OK');
    done.onclick = () => {
      if (cur.locked) return;
      const bad = t.slots.find(s => mine[s] !== t.target[s]);
      if (!bad) return success(myb);
      myb.classList.remove('wrong'); void myb.offsetWidth; myb.classList.add('wrong');
      wrongAnswer(t.slotHints[bad]);
      if (cur.wrong >= 2) { const g = wr.querySelector(`.wrow[data-slot="${bad}"] .opt[data-ok="1"]`); if (g) g.classList.add('glow'); }
    };
    opts.appendChild(done);
  }

  // ---------- buttons ----------
  $('#btnStart').onclick = () => { unlock(); openMenu(); };
  $('#btnHome').onclick = () => openMenu();
  $('#btnMenu2').onclick = () => openMenu();
  $('#btnAgain').onclick = () => { const id = cur.game.id; openGame(id, 0); };
  $('#btnSpeak').onclick = () => say(lastSpoken || ui().menu);
  $('#btnMusic').onclick = () => { save.muted = !save.muted; persist(); setTopbar($('#tbTitle').textContent); if (save.muted) music.pause(); else startMusic(); };
  $('#btnLang').onclick = () => {
    save.lang = save.lang === 'sk' ? 'en' : 'sk'; persist();
    const active = document.querySelector('.screen.active').id;
    if (active === 'scrGame' && cur) { setTopbar(cur.game.title[save.lang]); loadTask(); }
    else if (active === 'scrMenu') openMenu();
    else if (active === 'scrDone' && cur) { setTopbar(cur.game.title[save.lang]); $('#doneText').textContent = ui().done; say(ui().done); }
    else openWelcome();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); try { speechSynthesis.cancel(); } catch (e) {} } else startMusic(); });
  window.addEventListener('resize', () => { if (cur && cur.task && cur.task.kind === 'choose' && document.querySelector('#scrGame.active')) { const n = cur.task.options.length; if (!cur.task.houses && n === 4) $('#options').style.setProperty('--cols', 2); } });

  window.ZS = { GAMES, TASKS_PER_GAME, getTask, get state() { return { save, cur }; } };
  openWelcome();
})();

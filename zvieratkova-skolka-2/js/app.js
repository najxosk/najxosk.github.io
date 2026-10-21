(function () {
  'use strict';
  const { GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG, num } = window.ZS_GAMES;
  const VERSION = 'g2v3';
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const $ = s => document.querySelector(s);
  const KEY = 'zvieratkovaSkolka2.v1'; // separate progress & name from game 1

  // ---------- state & storage ----------
  let save = { lang: 'sk', music: true, voice: true, name: null, diplomas: {}, games: {} };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  if (save.muted === true) { save.music = false; save.voice = false; } // migrate v1 setting
  delete save.muted;
  save.diplomas = save.diplomas || {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } };
  const gs = id => (save.games[id] = save.games[id] || { done: [], next: 0 });
  const starsOf = id => gs(id).done.length;

  const UI = {
    sk: {
      welcome: 'Ahoj! Vitaj v Zvieratkovej škôlke 2. Ja som pani učiteľka Medvedica. Mám pre teba úplne nové úlohy. Ťukni na zelené tlačidlo!',
      menu: 'Vyber si hru! Ťukni na obrázok.',
      thisIs: 'To je', defName: 'Šikovný žiak', askName: 'Ako sa voláš? Napíš svoje meno a ťukni na OK.', hello: n => `Ahoj, ${n}! Vyber si hru! Ťukni na obrázok.`,
      again: 'Hrať znova', resetAll: 'Vynulovať všetko', yes: 'Áno', no: 'Nie', alsoName: 'Zmeniť aj meno',
      confirmGame: t => `Naozaj chceš hru ${t} hrať odznova? Hviezdičky z tejto hry zmiznú.`, confirmAll: 'Naozaj chceš vynulovať všetko? Zmiznú všetky hviezdičky, diplomy aj meno.',
      dipTitle: 'DIPLOM', dipSub: 'šikovný žiak', dipSave: 'Uložiť diplom', dipFor: 'za hru',
      dipSay: (n, t, d, k) => `Diplom! ${n}, šikovný žiak, za hru ${t}. ${d}. Máš ${k} hviezdičiek.`,
      dipVoice: (t, k) => [`Šikovný žiak, za hru ${t}.`, `Máš ${k} hviezdičiek.`], dipHead: 'Diplom!', hiPlain: 'Ahoj!', soundOn: 'Zvuk je zapnutý.',
      retry: 'Skús to ešte raz.', done: 'Hurá! Všetkých 50 úloh je hotových! Si úžasný kamarát. Môžeš hrať znova alebo si vybrať inú hru.',
      home: 'Domov', speak: 'Zopakuj', music: 'Hudba', voice: 'Hlas', sound: 'Zvuk zapnúť / vypnúť', scPrint: 'Tlačené', scCursive: 'Písané', lang: 'Jazyk'
    },
    en: {
      welcome: 'Hello! Welcome to Zvieratková škôlka 2. I am Mrs. Bear, the teacher. I have brand new tasks for you. Tap the green button!',
      menu: 'Choose a game! Tap a picture.',
      thisIs: 'That is', defName: 'Smart student', askName: 'What is your name? Type your name and tap OK.', hello: n => `Hello, ${n}! Choose a game! Tap a picture.`,
      again: 'Play again', resetAll: 'Reset everything', yes: 'Yes', no: 'No', alsoName: 'Change my name too',
      confirmGame: t => `Do you really want to play ${t} from the start? The stars from this game will disappear.`, confirmAll: 'Do you really want to reset everything? All stars, diplomas and the name will disappear.',
      dipTitle: 'Diploma', dipSub: 'smart student', dipSave: 'Save diploma', dipFor: 'for the game',
      dipSay: (n, t, d, k) => `Diploma! ${n}, smart student, for the game ${t}. ${d}. You earned ${k} stars.`,
      dipVoice: (t, k) => [`Smart student, for the game ${t}.`, `You earned ${k} stars.`], dipHead: 'Diploma!', hiPlain: 'Hello!', soundOn: 'Sound is on.',
      retry: 'Try again.', done: 'Hooray! All 50 tasks are done! You are amazing. You can play again or choose another game.',
      home: 'Home', speak: 'Repeat', music: 'Music', voice: 'Voice', sound: 'Sound on / off', scPrint: 'Print', scCursive: 'Cursive', lang: 'Language'
    },
    es: {
      welcome: '¡Hola! Bienvenido a Zvieratková škôlka 2. Soy la maestra Osa. Tengo tareas totalmente nuevas para ti. ¡Toca el botón verde!',
      menu: '¡Elige un juego! Toca un dibujo.',
      thisIs: 'Es', defName: 'Estudiante estrella', askName: '¿Cómo te llamas? Escribe tu nombre y toca OK.', hello: n => `¡Hola, ${n}! ¡Elige un juego! Toca un dibujo.`,
      again: 'Jugar otra vez', resetAll: 'Borrar todo', yes: 'Sí', no: 'No', alsoName: 'Cambiar también el nombre',
      confirmGame: t => `¿De verdad quieres jugar a ${t} desde el principio? Las estrellas de este juego desaparecerán.`, confirmAll: '¿De verdad quieres borrar todo? Desaparecerán todas las estrellas, los diplomas y el nombre.',
      dipTitle: 'Diploma', dipSub: 'estudiante estrella', dipSave: 'Guardar diploma', dipFor: 'por el juego',
      dipSay: (n, t, d, k) => `¡Diploma! ${n}, estudiante estrella, por el juego ${t}. ${d}. Ganaste ${k} estrellas.`,
      dipVoice: (t, k) => [`Estudiante estrella, por el juego ${t}.`, `Ganaste ${k} estrellas.`], dipHead: '¡Diploma!', hiPlain: '¡Hola!', soundOn: 'El sonido está encendido.',
      retry: 'Inténtalo otra vez.', done: '¡Listo! Las 50 tareas están hechas. Puedes jugar otra vez o elegir otro juego.',
      home: 'Inicio', speak: 'Repetir', music: 'Música', voice: 'Voz', sound: 'Sonido sí / no', scPrint: 'Imprenta', scCursive: 'Cursiva', lang: 'Idioma'
    }
  };
  const LANGS = ['sk', 'en', 'es'], FLAG = { sk: '🇸🇰', en: '🇬🇧', es: '🇪🇸' };
  if (!LANGS.includes(save.lang)) save.lang = 'sk';
  const ui = () => UI[save.lang];

  // ---------- speech ----------
  let voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  let lastSpoken = '';
  const sayLog = []; // texts actually spoken via Web Speech fallback (for tests)
  const clipLog = []; // clip urls played (for tests)
  let speechSeq = 0;
  // ---- pre-generated neural voice clips (Lili SK / Ana EN), loaded lazily per language ----
  const VOICE_BASE = 'assets/voice/';
  const voiceMaps = {}; // lang -> {text: relative file} | null while loading
  const mapReady = {}; // lang -> promise resolved when the manifest is in
  const voiceEl = new Audio(); voiceEl.preload = 'auto';
  const normT = t => String(t).trim().replace(/\s+/g, ' ');
  const nameKey = n => normT(n).toLowerCase();
  const stripD = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function loadVoiceMap(lang) {
    if (lang in voiceMaps || location.protocol === 'file:' || window.__ASSETS) { if (!(lang in voiceMaps)) voiceMaps[lang] = {}; return; }
    voiceMaps[lang] = null;
    mapReady[lang] = fetch(VOICE_BASE + lang + '/manifest.json?' + VERSION).then(r => r.ok ? r.json() : {}).then(j => { voiceMaps[lang] = j || {}; }).catch(() => { voiceMaps[lang] = {}; });
  }
  function clipFor(t) {
    const m = voiceMaps[save.lang]; if (!m) return null;
    let f = m[normT(t)];
    if (!f && t[0] === '@') f = m[stripD(normT(t))]; // names typed without diacritics
    return f ? VOICE_BASE + save.lang + '/' + f + '?' + VERSION : null; // version query: re-recorded clips are never served from an old cache
  }
  const nameClipKey = (kind, n) => '@' + kind + ':' + nameKey(n);
  function stopSpeech() {
    speechSeq++;
    try { voiceEl.onended = voiceEl.onerror = null; voiceEl.pause(); } catch (e) { /* ignore */ }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    duck(false);
  }
  // text: string or array of parts; a part may be {key, alt} = optional clip (e.g. a name), never spoken by the device voice
  function say(text, opt) {
    const done = opt && opt.done;
    const parts = (Array.isArray(text) ? text : [text]).filter(Boolean);
    if (!(opt && opt.keep)) lastSpoken = parts;
    if (!save.voice || !parts.length) { if (done) done(); return; }
    stopSpeech();
    const my = speechSeq;
    // clip list still loading (first page load): wait for it (not for the device voice list), then play the recorded clip
    if (voiceMaps[save.lang] === null && mapReady[save.lang] && !(opt && opt.noWait)) {
      const go = () => { if (my === speechSeq) say(text, Object.assign({}, opt, { noWait: true, keep: true })); };
      Promise.race([mapReady[save.lang], new Promise(r => setTimeout(r, 3000))]).then(go); return;
    }
    const urls = []; let missing = false; const plain = [];
    for (const p of parts) {
      if (typeof p === 'object') { const u = clipFor(p.key); if (u) urls.push(u); else if (p.alt) { const a = clipFor(p.alt); if (a) urls.push(a); else missing = true; plain.push(p.alt); } continue; }
      plain.push(p); const u = clipFor(p); if (u) urls.push(u); else missing = true;
    }
    if (!missing && urls.length) return playChain(urls, my, done);
    webSpeak(plain.join(' '), opt, my, done);
  }
  function playChain(urls, my, done) {
    let k = 0;
    const next = () => {
      if (my !== speechSeq) return;
      if (k >= urls.length) { duck(false); if (done) done(); return; }
      const u = urls[k++]; clipLog.push(u);
      voiceEl.onended = next; voiceEl.onerror = next;
      voiceEl.src = u; duck(true);
      const pr = voiceEl.play(); if (pr && pr.catch) pr.catch(() => { if (my === speechSeq) next(); });
    };
    next();
  }
  function webSpeak(text, opt, my, done) {
    if (!('speechSynthesis' in window) || !text) { if (done) done(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      const code = save.lang;
      u.lang = { sk: 'sk-SK', en: 'en-GB', es: 'es-ES' }[code];
      const v = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(code + '-')) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(code));
      if (v) u.voice = v;
      u.rate = (opt && opt.rate) || 0.88; u.pitch = 1.1;
      u.onstart = () => { if (!save.voice || my !== speechSeq) { try { speechSynthesis.cancel(); } catch (e) {} return; } duck(true); };
      u.onend = u.onerror = () => { duck(false); if (done && my === speechSeq) done(); };
      sayLog.push(text);
      speechSynthesis.speak(u);
    } catch (e) { if (done) done(); }
  }

  // ---------- music & sfx ----------
  const music = $('#music');
  music.volume = 0.3;
  let audioUnlocked = false, actx = null;
  function duck(on) { music.volume = on ? 0.1 : 0.3; }
  function startMusic() { if (save.music && audioUnlocked) { const p = music.play(); if (p && p.catch) p.catch(() => {}); } }
  function unlock(ev) {
    if (audioUnlocked) return;
    if (ev && ev.target && ev.target.closest && ev.target.closest('.snd')) return; // tapping a sound button must never start music
    audioUnlocked = true;
    try { voiceEl.src = VOICE_BASE + 'silence.mp3'; const q = voiceEl.play(); if (q && q.catch) q.catch(() => {}); } catch (e) { /* unlock audio element on iOS */ }
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    startMusic();
  }
  function tone(freqs, dur, type, vol) {
    if (!actx || !(save.music || save.voice)) return;
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

  // ---------- sound controls (persisted) ----------
  function applySound() {
    if (!save.music) { try { music.pause(); } catch (e) {} } else startMusic();
    if (!save.voice) stopSpeech();
    const on = save.music || save.voice;
    const bs = $('#btnSound');
    bs.textContent = on ? '🔊' : '🔇'; bs.classList.toggle('off', !on); bs.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#btnMusic').classList.toggle('off', !save.music); $('#btnMusic').setAttribute('aria-pressed', save.music ? 'true' : 'false');
    $('#btnVoice').classList.toggle('off', !save.voice); $('#btnVoice').setAttribute('aria-pressed', save.voice ? 'true' : 'false');
  }
  function setSound(m, v) { save.music = m; save.voice = v; persist(); applySound(); }
  function soundBtn(sel, fn) {
    const b = $(sel);
    // act on pointerdown for an instant response on touch (works even mid-speech); ignore the follow-up click
    let viaPointer = false;
    b.addEventListener('pointerdown', e => { e.preventDefault(); viaPointer = true; fn(); });
    b.addEventListener('click', e => { if (viaPointer) { viaPointer = false; return; } fn(); });
  }

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.body.className = 's-' + id.replace('scr', '').toLowerCase();
  }
  function setTopbar(title) {
    $('#tbTitle').textContent = title || 'Zvieratková škôlka 2';
    $('#btnLang').innerHTML = `<span class="fl">${FLAG[save.lang]}</span><b>${save.lang.toUpperCase()}</b>`; $('#btnLang').setAttribute('aria-label', ui().lang + ': ' + save.lang.toUpperCase());
    $('#btnHome').setAttribute('aria-label', ui().home);
    $('#btnSound').setAttribute('aria-label', ui().sound); $('#btnMusic').setAttribute('aria-label', ui().music); $('#btnVoice').setAttribute('aria-label', ui().voice);
    applySound();
    document.documentElement.lang = save.lang;
  }
  function totalStars() { return GAMES.reduce((a, g) => a + starsOf(g.id), 0); }
  function updStars(n) { $('#tbStars span').textContent = n; }

  function openWelcome() { show('scrWelcome'); setTopbar(); $('#welcomeText').textContent = ui().welcome; say(ui().welcome); }
  const childName = () => (save.name && save.name.trim()) || ui().defName;
  function openName(prefill) {
    show('scrName'); setTopbar();
    $('#nameText').textContent = ui().askName;
    const inp = $('#nameInput'); inp.value = prefill != null ? prefill : (save.name || ''); inp.placeholder = ui().defName;
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
    say(ui().askName);
  }
  function saveName() {
    save.name = $('#nameInput').value.trim().slice(0, 24); persist();
    try { $('#nameInput').blur(); } catch (e) {}
    openMenu();
  }
  function openMenu() {
    cur = null; show('scrMenu'); setTopbar(); updStars(totalStars());
    $('#menuText').textContent = ui().hello(childName());
    $('#menuName').textContent = childName();
    $('#btnResetAll').textContent = '🧹 ' + ui().resetAll;
    const c = $('#cards'); c.innerHTML = '';
    GAMES.forEach(g => {
      const w = document.createElement('div'); w.className = 'cardwrap';
      const b = document.createElement('button');
      b.className = 'card'; b.style.background = g.color; b.dataset.game = g.id;
      b.setAttribute('aria-label', g.title[save.lang]);
      b.innerHTML = `<img src="assets/animals/${g.img}.webp" alt=""><span class="ct">${g.title[save.lang]}</span><span class="cs">⭐ ${starsOf(g.id)} / ${TASKS_PER_GAME}</span>`;
      b.onclick = () => openGame(g.id);
      w.appendChild(b);
      if (starsOf(g.id) > 0 || save.diplomas[g.id]) {
        const rb = document.createElement('button'); rb.className = 'cardreset'; rb.dataset.game = g.id;
        rb.textContent = '🔄'; rb.setAttribute('aria-label', ui().again); rb.title = ui().again;
        rb.onclick = () => confirmResetGame(g); w.appendChild(rb);
      }
      if (save.diplomas[g.id]) {
        const db = document.createElement('button'); db.className = 'cardgrad'; db.dataset.game = g.id;
        db.textContent = '🎓'; db.setAttribute('aria-label', ui().dipTitle);
        db.onclick = () => openDiploma(g.id); w.appendChild(db);
      }
      c.appendChild(w);
    });
    say([save.name ? { key: nameClipKey('hi', save.name), alt: ui().hiPlain } : ui().hiPlain, ui().menu]);
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
    applyScript();
    loadTask();
  }
  // printed vs cursive (Slovak school handwriting) letters in the letters & words games
  function applyScript() {
    const on = cur && (cur.game.id === 'letters' || cur.game.id === 'words');
    const bar = $('#scriptBar'); bar.hidden = !on;
    const curv = on && save.script === 'cursive';
    $('#scrGame').classList.toggle('cursive', curv);
    $('#btnPrint').classList.toggle('sel', !curv); $('#btnCursive').classList.toggle('sel', curv);
    $('#btnPrint').setAttribute('aria-pressed', String(!curv)); $('#btnCursive').setAttribute('aria-pressed', String(curv));
    $('#btnPrint b').textContent = ui().scPrint; $('#btnCursive b').textContent = ui().scCursive;
  }
  ['#btnPrint', '#btnCursive'].forEach(sel => { $(sel).onclick = e => { save.script = e.currentTarget.dataset.s; persist(); applyScript(); tone([660], 0.12, 'sine', 0.06); }; });
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
    stage.innerHTML = ''; opts.innerHTML = ''; opts.className = ''; opts.dataset.kind = t.kind;
    if (t.kind === 'choose') renderChoose(t, stage, opts);
    else if (t.kind === 'give') renderGive(t, stage, opts);
    else if (R2[t.kind]) R2[t.kind](t, stage, opts);
    else renderDress(t, stage, opts);
    stage.querySelectorAll('[data-say]').forEach(el => el.onclick = () => say(el.dataset.say, { rate: 0.7, keep: true }));
    bubble(t.prompt);
    const speech = t.say || t.prompt;
    // the instruction is spoken automatically only the first time a task type appears; listen-only tasks always speak
    save.heard = save.heard || {};
    const auto = t.listenOnly || !save.heard[t.type];
    if (!t.listenOnly) { save.heard[t.type] = 1; persist(); }
    if (cur.intro) { cur.intro = false; say(auto ? [g.intro[save.lang], speech] : [g.intro[save.lang]]); }
    else if (auto) say(speech); else stopSpeech();
    lastSpoken = [speech];
  }

  function sayOpt(o, prefix) { say(cap((prefix ? prefix + ' ' : '') + o.say) + '.', { rate: 0.85, keep: true }); }
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
      b.onclick = () => choose(b, o);
      if (o.say) b.setAttribute('aria-label', o.say); b.dataset.say = o.say || '';
      opts.appendChild(b);
    });
  }
  function choose(btn, o) {
    if (cur.locked) return;
    if (o.ok) { btn.classList.add('good'); success(btn); }
    else { btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong'); wrongAnswer(null, o.say ? thisIsText(save.lang, o.say) : ''); }
  }
  const EN_NUMS = new Set(window.ZS_GAMES ? Array.from({ length: 21 }, (_, n) => num('en', n)) : []);
  function thisIsText(lang, x) {
    if (lang === 'sk') return /^(dva|dve|tri|štyri) /.test(x) ? `To sú ${x}.` : `To je ${x}.`;
    if (lang === 'es') return /^(los|las|unos|unas) |bellotas$|^uvas$|^(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|diecinueve|veinte) \S+s$/.test(x) ? `Son ${x}.` : `Es ${x}.`;
    if (/^(the |small )/.test(x) || EN_NUMS.has(x)) return `That is ${x}.`;
    const first = x.split(' ')[0];
    if (/s$/.test(x) && !/(bus|dress|cactus)$/.test(x)) return EN_NUMS.has(first) ? `Those are ${x}.` : `Those are the ${x}.`;
    return `That is the ${x}.`;
  }
  function wrongAnswer(customHint, prefix) {
    cur.wrong++; sfxSoft();
    const t = cur.task;
    const hint = customHint || t.hint || ui().retry, hs = customHint || t.hintParts || hint;
    say([prefix, ...(Array.isArray(hs) ? hs : [hs])], { keep: true });
    bubble(Array.isArray(hint) ? hint.join(' ') : hint, true, t.hintShow);
    if (cur.wrong >= 2 && t.kind === 'choose') { const g = $('#options .opt[data-ok="1"]'); if (g) g.classList.add('glow'); }
  }
  function success(fromEl) {
    cur.locked = true; sfxGood();
    const g = cur.game, st = gs(g.id);
    if (!st.done.includes(cur.index)) st.done.push(cur.index);
    persist();
    const ans = cur.task.answer ? cap(cur.task.answer) : '';
    bubble(ans + ' ⭐'); // no praise words: just the content, so the child learns
    flyStar(fromEl); burst(fromEl);
    updStars(starsOf(g.id));
    $('#progFill').style.width = (100 * starsOf(g.id) / TASKS_PER_GAME) + '%';
    // advance after the praise has been spoken (min 1.4 s, max 6 s), so the child hears the content
    const idx0 = cur.index, t0 = Date.now(); let went = false;
    const go = () => {
      if (went) return; went = true;
      if (!cur || cur.game !== g || cur.index !== idx0) return;
      if (starsOf(g.id) >= TASKS_PER_GAME) return finish();
      if (cur.index >= TASKS_PER_GAME - 1) { cur.index = firstUnsolved(g.id); return loadTask(); }
      cur.index++; loadTask();
    };
    say(cur.task.answerParts || ans, { done: () => setTimeout(go, Math.max(250, 1400 - (Date.now() - t0))) });
    setTimeout(go, save.voice ? 6000 : 1400);
  }
  function finish() {
    const g = cur.game; gs(g.id).next = 0;
    if (!save.diplomas[g.id]) save.diplomas[g.id] = { date: new Date().toISOString().slice(0, 10), stars: starsOf(g.id) };
    persist();
    openDiploma(g.id);
  }
  // ---------- diploma ----------
  let dipGame = null;
  const fmtDate = iso => { const [y, m, d] = iso.split('-').map(Number); return save.lang === 'sk' ? `${d}. ${m}. ${y}` : save.lang === 'es' ? new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
  function dipData(id) {
    const g = GAMES.find(x => x.id === id), d = save.diplomas[id];
    return { g, name: childName(), title: g.title[save.lang], date: fmtDate(d.date), stars: d.stars };
  }
  function openDiploma(id) {
    dipGame = id; const D = dipData(id);
    show('scrDiploma'); setTopbar(D.title);
    $('#dipImg').src = `assets/diplomy/${D.g.img}.webp`;
    $('#dipTitle').textContent = ui().dipTitle; $('#dipName').textContent = D.name; $('#dipSub').textContent = ui().dipSub;
    $('#dipGame').textContent = `${ui().dipFor}: ${D.title}`; $('#dipDate').textContent = D.date; $('#dipStars').textContent = `⭐ ${D.stars} / ${TASKS_PER_GAME}`;
    $('#btnSaveDip').textContent = '💾 ' + ui().dipSave;
    burst($('#dipCard'));
    say([ui().dipHead, save.name ? { key: nameClipKey('n', save.name) } : null, ...ui().dipVoice(D.title, D.stars)]);
  }
  function roundRect(x, c, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
  async function renderDiplomaPNG(id) {
    const D = dipData(id);
    try { await document.fonts.load('900 40px ZSRound'); } catch (e) {}
    const img = new Image(); img.src = $('#dipImg').src;
    await (img.decode ? img.decode().catch(() => {}) : new Promise(r => { img.onload = img.onerror = r; }));
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1500; const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 1080, 1500); gr.addColorStop(0, '#ffe3f1'); gr.addColorStop(.5, '#fff4dc'); gr.addColorStop(1, '#e3e6ff');
    x.fillStyle = gr; x.fillRect(0, 0, 1080, 1500);
    x.fillStyle = '#fff'; roundRect(x, 0, 50, 50, 980, 1400, 60); x.fill();
    x.lineWidth = 10; x.strokeStyle = '#ffb3d1'; x.setLineDash([26, 18]); roundRect(x, 0, 80, 80, 920, 1340, 46); x.stroke(); x.setLineDash([]);
    x.save(); x.beginPath(); x.arc(540, 450, 300, 0, Math.PI * 2); x.clip(); try { x.drawImage(img, 240, 150, 600, 600); } catch (e) {} x.restore();
    x.lineWidth = 14; x.strokeStyle = '#ffd6e8'; x.beginPath(); x.arc(540, 450, 304, 0, Math.PI * 2); x.stroke();
    const F = (w, s) => `${w} ${s}px ZSRound, Nunito, "Arial Rounded MT Bold", sans-serif`;
    x.textAlign = 'center'; x.fillStyle = '#d1618f'; x.font = F(900, 110); x.fillText(ui().dipTitle, 540, 885);
    x.fillStyle = '#6b4a5e'; let fs = 92; x.font = F(900, fs); while (x.measureText(D.name).width > 860 && fs > 40) { fs -= 4; x.font = F(900, fs); } x.fillText(D.name, 540, 1010);
    x.fillStyle = '#9a6fd6'; x.font = F(800, 58); x.fillText(ui().dipSub, 540, 1090);
    x.fillStyle = '#6b4a5e'; x.font = F(800, 52); x.fillText(`${ui().dipFor}: ${D.title}`, 540, 1185);
    x.font = F(800, 46); x.fillText(D.date, 540, 1265);
    x.font = F(900, 60); x.fillText(`⭐ ${D.stars} / ${TASKS_PER_GAME}`, 540, 1360);
    ['💖', '✨', '🌸', '✨'].forEach((e, k) => { x.font = '60px sans-serif'; x.fillText(e, [150, 930, 150, 930][k], [170, 170, 1370, 1370][k]); });
    return cv;
  }
  async function saveDiploma() {
    const id = dipGame; if (!id) return;
    const cv = await renderDiplomaPNG(id);
    const fname = `diplom-${childName().replace(/[^\p{L}\p{N}]+/gu, '-')}-${id}.png`;
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const a = document.createElement('a'); a.download = fname; a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // ---------- confirm dialog & resets ----------
  function confirmDlg(text, opts, onYes) {
    const d = $('#dlg'); $('#dlgText').textContent = text;
    $('#dlgYes').textContent = '✔ ' + ui().yes; $('#dlgNo').textContent = '✖ ' + ui().no;
    const t = $('#dlgName'); t.hidden = !opts.nameToggle; t.classList.remove('on'); t.textContent = '✏️ ' + ui().alsoName;
    t.onclick = () => t.classList.toggle('on');
    d.hidden = false; say(text, { keep: true });
    $('#dlgNo').onclick = () => { d.hidden = true; stopSpeech(); };
    $('#dlgYes').onclick = () => { d.hidden = true; stopSpeech(); onYes(t.classList.contains('on')); };
  }
  function confirmResetGame(g) {
    confirmDlg(ui().confirmGame(g.title[save.lang]), { nameToggle: true }, alsoName => {
      delete save.games[g.id]; delete save.diplomas[g.id]; if (save.heard) Object.keys(save.heard).forEach(k => { if (k.startsWith(g.id + ':')) delete save.heard[k]; }); persist();
      if (alsoName) openName(); else openMenu();
    });
  }
  function confirmResetAll() {
    confirmDlg(ui().confirmAll, {}, () => {
      const old = save.name; save.games = {}; save.diplomas = {}; save.heard = {}; save.name = null; persist();
      openName(old || '');
    });
  }
  function flyStar(el) {
    const s = document.createElement('div'); s.className = 'flystar'; s.textContent = '⭐';
    const r = (el || $('#stage')).getBoundingClientRect(), tr = $('#tbStars').getBoundingClientRect();
    s.style.left = (r.left + r.width / 2 - 28) + 'px'; s.style.top = (r.top + r.height / 2 - 28) + 'px';
    document.body.appendChild(s);
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.left = (tr.left) + 'px'; s.style.top = (tr.top - 10) + 'px'; s.style.transform = 'scale(.5) rotate(360deg)'; s.style.opacity = '.4'; }));
    setTimeout(() => s.remove(), 1000);
  }
  function burst(el) {
    const r = (el || $('#stage')).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const bits = ['💖', '✨', '🌸', '💛', '✨', '💜', '⭐', '🩷'];
    for (let k = 0; k < 10; k++) {
      const d = document.createElement('div'); d.className = 'burst'; d.textContent = bits[k % bits.length];
      const a = (k / 10) * Math.PI * 2, dist = 70 + Math.random() * 60;
      d.style.left = cx + 'px'; d.style.top = cy + 'px';
      d.style.setProperty('--dx', Math.cos(a) * dist + 'px'); d.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
    }
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
      n.onclick = () => { if (cur.locked) return; if (n.parentNode === pile) { basket.appendChild(n); inBasket++; } else { pile.appendChild(n); inBasket--; } tone([523 + inBasket * 40], 0.15, 'sine', 0.07); say(cap(num(save.lang, inBasket)), { rate: 1, keep: true }); };
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
        const W = window.ZS_GAMES.nutsW;
        const inB = save.lang === 'sk' ? (inBasket >= 2 && inBasket <= 4 ? `V košíku sú ${W('sk', inBasket)}` : `V košíku je ${W('sk', inBasket)}`) : `There ${inBasket === 1 ? 'is' : 'are'} ${W('en', inBasket)} in the basket`;
        const h = giveHint(save.lang, inBasket, t.n);
        wrongAnswer(h);
      }
    };
    opts.appendChild(done);
  }

  function giveHint(lang, inBasket, n) {
    const W = window.ZS_GAMES.nutsW, more = inBasket < n;
    const inB = lang === 'sk' ? (inBasket >= 2 && inBasket <= 4 ? `V košíku sú ${W('sk', inBasket)}.` : `V košíku je ${W('sk', inBasket)}.`) : `There ${inBasket === 1 ? 'is' : 'are'} ${W('en', inBasket)} in the basket.`;
    if (lang === 'es') return [inBasket === 1 ? 'En la canasta hay una bellota.' : `En la canasta hay ${W('es', inBasket)}.`, `Necesitamos ${W('es', n)}.`, more ? 'Pon algunas más.' : 'Quita algunas.'];
    return lang === 'sk' ? [inB, `Potrebujeme ${W('sk', n)}.`, more ? 'Pridaj ešte.' : 'Niektoré vráť späť.'] : [inB, `We need ${W('en', n)}.`, more ? 'Add some more.' : 'Take some back.'];
  }
  function renderDress(t, stage, opts) {
    const mine = {};
    stage.innerHTML = `<div class="dresswrap"><div class="order${t.byEar ? ' byear' : ''}" data-say="${t.byEar ? t.prompt : ''}">${t.byEar ? '<div class="listen">👂</div>' : '📋' + bunnySVG(t.target, 'bunny')}</div><div class="mybunny"></div></div>`;
    const myb = stage.querySelector('.mybunny');
    const redraw = () => { myb.innerHTML = bunnySVG(mine, 'bunny'); };
    redraw();
    opts.style.setProperty('--cols', 1);
    const wr = document.createElement('div'); wr.className = 'wardrobe';
    t.slots.forEach(slot => {
      const row = document.createElement('div'); row.className = 'wrow'; row.dataset.slot = slot;
      t.choices[slot].forEach(val => {
        const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = itemSVG(slot, val);
        b.dataset.val = val; b.dataset.ok = val === t.target[slot] ? '1' : '0'; b.dataset.say = t.itemSay[slot][val]; b.setAttribute('aria-label', t.itemSay[slot][val]);
        b.onclick = () => {
          if (cur.locked) return;
          mine[slot] = mine[slot] === val ? undefined : val;
          row.querySelectorAll('.opt').forEach(x => x.classList.toggle('sel', x.dataset.val === mine[slot]));
          redraw(); tone([660], 0.12, 'sine', 0.06);
          say(cap(t.itemSay[slot][val]) + '.', { rate: 0.85, keep: true });
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
      wrongAnswer(cur.wrong >= 1 || t.byEar ? t.slotNames[bad] : t.slotHints[bad]);
      if (cur.wrong >= 2) { const g = wr.querySelector(`.wrow[data-slot="${bad}"] .opt[data-ok="1"]`); if (g) g.classList.add('glow'); }
    };
    opts.appendChild(done);
  }

  // ---------- game 2 mechanics: tiles in order, sorting, pairs, hunting, painting, cooking ----------
  const sayKeep = x => say(Array.isArray(x) ? x : [x], { rate: 0.9, keep: true });
  const shake = el => { if (!el) return; el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); };
  const glowNext = el => { if (cur.wrong >= 2 && el) el.classList.add('glow'); };
  const mk = (cls, html) => { const b = document.createElement('button'); b.className = cls; b.innerHTML = html; return b; };
  function doneBtn(fn) { const d = mk('donebtn', '✔'); d.setAttribute('aria-label', 'OK'); d.onclick = () => { if (!cur.locked) fn(); }; return d; }
  function renderSeq(t, stage, opts) {
    stage.innerHTML = (t.display || '') + `<div class="slots${t.tilesOnly ? ' picslots' : ''}">${'<span class="slot"></span>'.repeat(t.slots)}</div>`;
    const slots = stage.querySelectorAll('.slot'); let pos = 0;
    const want = () => t.tiles.find(x => x.ord === pos);
    const fits = (tl) => t.byValue ? tl.v === want().v : tl.ord === pos;
    opts.style.setProperty('--cols', t.tilesOnly ? Math.min(t.tiles.length, innerHeight > innerWidth ? 2 : 4) : Math.min(t.tiles.length, innerHeight > innerWidth ? 4 : 7));
    const btns = [];
    t.tiles.forEach(tl => {
      const b = mk('opt tile' + (t.tilesOnly ? ' pictile' : ''), tl.html); b.dataset.ord = tl.ord; b.dataset.v = tl.v || ''; btns.push(b);
      b.onclick = () => {
        if (cur.locked || b.classList.contains('used')) return;
        if (fits(tl)) {
          b.classList.add('used'); b.classList.remove('glow'); slots[pos].innerHTML = tl.html; slots[pos].classList.add('filled'); pos++; tone([523 + pos * 60], 0.12, 'sine', 0.07);
          if (pos >= t.slots) success(stage.querySelector('.slots')); else sayKeep(tl.say);
        } else { shake(b); wrongAnswer(); glowNext(btns.find((x, k) => !x.classList.contains('used') && fits(t.tiles[k]))); }
      };
      opts.appendChild(b);
    });
  }
  function renderSort(t, stage, opts) {
    let k = 0;
    const show = () => { stage.innerHTML = `<div class="sortitem">${t.items[k].html}</div><div class="sortleft">${'•'.repeat(t.items.length - k)}</div>`;
      opts.querySelectorAll('.bin').forEach(b => { b.dataset.ok = b.dataset.id === t.items[k].bin ? '1' : '0'; b.classList.remove('glow'); }); };
    opts.style.setProperty('--cols', t.bins.length);
    t.bins.forEach(bn => {
      const b = mk('opt bin', bn.html + '<div class="binin"></div>'); b.dataset.id = bn.id; b.setAttribute('aria-label', bn.say);
      b.onclick = () => {
        if (cur.locked) return; const it = t.items[k];
        if (bn.id === it.bin) {
          b.querySelector('.binin').insertAdjacentHTML('beforeend', it.html.replace('huge', 'mini')); tone([660], 0.12, 'sine', 0.07); k++;
          if (k >= t.items.length) { stage.innerHTML = '<div class="sortitem"><span class="emo huge">🧺</span></div>'; success(b); } else { sayKeep(it.say); show(); }
        } else { shake(b); wrongAnswer(it.hint); glowNext(opts.querySelector(`.bin[data-id="${it.bin}"]`)); }
      };
      opts.appendChild(b);
    });
    show();
  }
  const PAIRC = ['#ffd1e4', '#cfe8ff', '#d7f5d0', '#fff0b3', '#e6d9ff'];
  function renderPair(t, stage, opts) {
    stage.innerHTML = '<span class="emo">🔤</span>';
    opts.style.setProperty('--cols', 1);
    const wrap = document.createElement('div'); wrap.className = 'pairs';
    const top = document.createElement('div'), bot = document.createElement('div'); top.className = 'prow'; bot.className = 'prow';
    let sel = null, done = 0;
    t.left.forEach(x => {
      const b = mk('opt ptile', x.html); b.dataset.id = x.id; b.dataset.side = 'L';
      b.onclick = () => { if (cur.locked || b.classList.contains('used')) return; top.querySelectorAll('.ptile').forEach(y => y.classList.remove('sel')); sel = { x, b }; b.classList.add('sel'); tone([600], 0.1, 'sine', 0.06); };
      top.appendChild(b);
    });
    t.right.forEach(x => {
      const b = mk('opt ptile', x.html); b.dataset.id = x.id; b.dataset.side = 'R';
      b.onclick = () => {
        if (cur.locked || b.classList.contains('used')) return;
        if (!sel) { shake(top); wrongAnswer(); return; }
        if (sel.x.id === x.id) {
          const c = PAIRC[done % PAIRC.length];[sel.b, b].forEach(e => { e.classList.add('used'); e.classList.remove('sel', 'glow'); e.style.background = c; });
          done++; const said = sel.x.say; sel = null; tone([660, 880], 0.15, 'sine', 0.07);
          if (done >= t.left.length) success(b); else sayKeep(said);
        } else { shake(b); wrongAnswer(); glowNext(bot.querySelector(`.ptile[data-id="${sel.x.id}"]`)); }
      };
      bot.appendChild(b);
    });
    wrap.append(top, bot); opts.appendChild(wrap);
  }
  function renderHunt(t, stage, opts) {
    stage.innerHTML = t.display;
    const n = t.cells.length; opts.style.setProperty('--cols', t.pics ? (n <= 6 ? 3 : 4) : (n <= 9 ? 3 : n <= 12 ? 4 : 5));
    let left = t.cells.filter(c => c.ok).length;
    t.cells.forEach(c => {
      const b = mk('opt hcell' + (t.pics ? '' : ' small'), c.html); b.dataset.ok = c.ok ? '1' : '0'; if (c.say) b.setAttribute('aria-label', c.say);
      b.onclick = () => {
        if (cur.locked || b.classList.contains('found')) return;
        if (c.ok) { b.classList.add('found'); b.classList.remove('glow'); left--; tone([700 + left * 40], 0.12, 'sine', 0.07); if (!left) success(b); else if (c.say) sayKeep(cap(c.say) + '.'); }
        else { shake(b); wrongAnswer(null, c.say ? thisIsText(save.lang, c.say) : ''); glowNext(opts.querySelector('.hcell[data-ok="1"]:not(.found)')); }
      };
      opts.appendChild(b);
    });
  }
  function renderPaint(t, stage, opts) {
    let col = null; const mine = {}; const SV = window.ZS_GAMES.shapeSVG, hex = id => (t.palette.find(p => p.id === id) || {}).hex;
    stage.innerHTML = `<div class="paintrow"></div>`; const row = stage.firstChild; const sb = {};
    t.shapes.forEach(s => {
      const b = mk('pshape', ''); b.dataset.id = s.id; sb[s.id] = b;
      const draw = () => { b.innerHTML = SV(s.id, mine[s.id] ? hex(mine[s.id]) : '#ffffff', 'shape big', true); };
      draw();
      b.onclick = () => { if (cur.locked) return; if (!col) { shake(opts.querySelector('.palette')); wrongAnswer(); return; } mine[s.id] = col; draw(); tone([700], 0.1, 'sine', 0.06); };
      row.appendChild(b);
    });
    opts.style.setProperty('--cols', 1);
    const pal = document.createElement('div'); pal.className = 'palette';
    t.palette.forEach(p => {
      const b = mk('opt swatch', ''); b.style.setProperty('--sw', p.hex); b.dataset.c = p.id; b.setAttribute('aria-label', p.say);
      b.onclick = () => { if (cur.locked) return; col = p.id; pal.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === b)); sayKeep(p.say); };
      pal.appendChild(b);
    });
    opts.appendChild(pal);
    opts.appendChild(doneBtn(() => {
      const bad = t.shapes.find(s => mine[s.id] !== t.target[s.id]);
      if (!bad) return success(row);
      shake(sb[bad.id]); wrongAnswer(bad.rule); glowNext(pal.querySelector(`.swatch[data-c="${t.target[bad.id]}"]`));
    }));
  }
  function renderCollect(t, stage, opts) {
    const have = {};
    stage.innerHTML = `<div class="cookwrap">${t.recipeHtml}<div class="bowl"><span class="bowlic">${t.container}</span><div class="bowlin"></div></div></div>`;
    const bin = stage.querySelector('.bowlin'), bowl = stage.querySelector('.bowl');
    const redraw = () => { bin.innerHTML = ''; t.pantry.forEach(p => { for (let k = 0; k < (have[p.id] || 0); k++) { const s = mk('inb', p.e); s.onclick = () => { if (cur.locked) return; have[p.id]--; redraw(); tone([400], 0.1, 'sine', 0.05); }; bin.appendChild(s); } }); };
    opts.style.setProperty('--cols', 1);
    const pan = document.createElement('div'); pan.className = 'pantry'; pan.style.setProperty('--pc', Math.min(t.pantry.length, innerHeight > innerWidth ? 3 : 6));
    t.pantry.forEach(p => {
      const b = mk('opt pant', `<span class="emo">${p.e}</span>`); b.dataset.id = p.id; b.dataset.ok = t.need[p.id] ? '1' : '0'; b.setAttribute('aria-label', p.say);
      b.onclick = () => { if (cur.locked) return; const n = have[p.id] || 0; if (n >= 6) return; have[p.id] = n + 1; redraw(); tone([523 + n * 50], 0.12, 'sine', 0.07); sayKeep(t.countSay[p.id][n]); };
      pan.appendChild(b);
    });
    opts.appendChild(pan);
    opts.appendChild(doneBtn(() => {
      const ids = [...Object.keys(t.need), ...t.pantry.map(p => p.id).filter(id => !t.need[id])];
      const bad = ids.find(id => (have[id] || 0) !== (t.need[id] || 0));
      if (!bad) return success(bowl);
      shake(bowl); wrongAnswer(t.need[bad] ? t.needHint[bad] : t.extraHint[bad]); glowNext(pan.querySelector(`.pant[data-id="${bad}"]`));
    }));
  }
  const R2 = { seq: renderSeq, sort: renderSort, pair: renderPair, hunt: renderHunt, paint: renderPaint, collect: renderCollect };

  // ---------- buttons ----------
  $('#btnStart').onclick = () => { unlock(); if (save.name == null) openName(); else openMenu(); };
  $('#btnNameOk').onclick = saveName;
  $('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
  $('#btnEditName').onclick = () => openName();
  $('#btnResetAll').onclick = confirmResetAll;
  $('#btnSaveDip').onclick = saveDiploma;
  $('#btnDipMenu').onclick = () => openMenu();
  $('#btnHome').onclick = () => openMenu();
  $('#btnMenu2').onclick = () => openMenu();
  $('#btnAgain').onclick = () => { const id = cur.game.id; openGame(id, 0); };
  document.querySelectorAll('.bubble').forEach(b => b.addEventListener('click', () => say(lastSpoken || ui().menu, { keep: true })));
  soundBtn('#btnSound', () => { const on = save.music || save.voice; setSound(!on, !on); if (!on) { audioUnlocked = true; say(ui().soundOn, { keep: true }); } });
  soundBtn('#btnMusic', () => { audioUnlocked = true; setSound(!save.music, save.voice); });
  soundBtn('#btnVoice', () => setSound(save.music, !save.voice));
  $('#btnLang').onclick = () => {
    save.lang = LANGS[(LANGS.indexOf(save.lang) + 1) % LANGS.length]; persist(); loadVoiceMap(save.lang);
    const active = document.querySelector('.screen.active').id;
    if (active === 'scrGame' && cur) { setTopbar(cur.game.title[save.lang]); applyScript(); loadTask(); }
    else if (active === 'scrMenu') openMenu();
    else if (active === 'scrDone' && cur) { setTopbar(cur.game.title[save.lang]); $('#doneText').textContent = ui().done; say(ui().done); }
    else if (active === 'scrDiploma' && dipGame) openDiploma(dipGame);
    else if (active === 'scrName') openName($('#nameInput').value);
    else openWelcome();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { music.pause(); stopSpeech(); } else startMusic(); });
  window.addEventListener('resize', () => { if (cur && cur.task && cur.task.kind === 'choose' && document.querySelector('#scrGame.active')) { const n = cur.task.options.length; if (!cur.task.houses && n === 4) $('#options').style.setProperty('--cols', 2); } });

  LANGS.forEach(loadVoiceMap);
  // every phrase the game can speak (used to pre-generate clips and to test coverage)
  function allPhrases(lang) {
    const U = UI[lang], G = {}; const add = (g, t) => { if (t) (G[g] = G[g] || new Set()).add(normT(t)); };
    [U.welcome, U.askName, U.menu, U.hiPlain, U.retry, U.done, U.confirmAll, U.soundOn, U.dipHead].forEach(t => add('ui', t));
    GAMES.forEach(g => { add('ui', U.confirmGame(g.title[lang])); U.dipVoice(g.title[lang], TASKS_PER_GAME).forEach(t => add('ui', t)); });
    GAMES.forEach(g => {
      add(g.id, g.intro[lang]);
      for (let i = 0; i < TASKS_PER_GAME; i++) {
        const t = getTask(g.id, i, lang);
        add(g.id, t.say || t.prompt);
        const addP = (parts, txt) => { if (parts) parts.forEach(x => add(g.id, typeof x === 'object' ? x.key : x)); else add(g.id, txt); };
        addP(t.hintParts, t.hint); addP(t.answerParts, t.answer && cap(t.answer));
        (t.display || '').replace(/data-say="([^"]+)"/g, (m, x) => add(g.id, x));
        (t.options || []).forEach(o => { add(g.id, thisIsText(lang, o.say)); });
        if (t.kind === 'dress') { t.slots.forEach(sl => { add(g.id, t.slotHints[sl]); add(g.id, t.slotNames[sl]); Object.values(t.itemSay[sl]).forEach(x => add(g.id, cap(x) + '.')); }); if (t.byEar) add(g.id, t.prompt); }
        (t.phrases || []).forEach(x => add(g.id, typeof x === 'object' ? x.key : x));
        (t.cells || []).forEach(c => { if (c.say) add(g.id, thisIsText(lang, c.say)); });
        if (t.kind === 'give') for (let b = 0; b <= 10; b++) { add(g.id, cap(num(lang, b))); if (b !== t.n) giveHint(lang, b, t.n).forEach(x => add(g.id, x)); }
      }
    });
    const out = {}; for (const k in G) out[k] = [...G[k]]; return out;
  }
  window.ZS = { version: VERSION, loadTask: () => loadTask(), allPhrases, clipLog, voiceEl, clipFor: t => clipFor(t), voiceReady: l => !!voiceMaps[l], renderDiplomaPNG, openDiploma, GAMES, TASKS_PER_GAME, getTask, sayLog, get state() { return { save, cur }; } };
  openWelcome();
})();

/* Zvieratková škôlka – task generators. Every game has exactly 50 tasks, easy -> hard.
   Each task is generated deterministically from (gameId, index), strings in the chosen language. */
(function () {
  'use strict';
  const TASKS_PER_GAME = 50;

  // ---------- tiny seeded RNG helpers ----------
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sample = (r, arr, n) => shuffle(r, arr).slice(0, n);
  const T = (lang, sk, en) => (lang === 'sk' ? sk : en);

  // ---------- shared visual vocab ----------
  const COLORS = [
    { id: 'red', hex: '#ef7470', sk: 'červen', en: 'red' },
    { id: 'blue', hex: '#5d9ee0', sk: 'modr', en: 'blue' },
    { id: 'yellow', hex: '#f7d354', sk: 'žlt', en: 'yellow' },
    { id: 'green', hex: '#6cc276', sk: 'zelen', en: 'green' },
    { id: 'purple', hex: '#ad8ae0', sk: 'fialov', en: 'purple' },
    { id: 'orange', hex: '#f6a457', sk: 'oranžov', en: 'orange' },
    { id: 'pink', hex: '#f39cc3', sk: 'ružov', en: 'pink' }
  ];
  // Slovak adjective forms from stem
  const adj = (c, form) => c.sk + ({ m: 'ý', f: 'á', n: 'é', accF: 'ú', loc: 'om', ins: 'ým' })[form];
  const SHAPES = [
    { id: 'circle', sk: 'kruh', skAcc: 'kruh', g: 'm', en: 'circle' },
    { id: 'square', sk: 'štvorec', skAcc: 'štvorec', g: 'm', en: 'square' },
    { id: 'triangle', sk: 'trojuholník', skAcc: 'trojuholník', g: 'm', en: 'triangle' },
    { id: 'star', sk: 'hviezda', skAcc: 'hviezdu', g: 'f', en: 'star' },
    { id: 'heart', sk: 'srdce', skAcc: 'srdce', g: 'n', en: 'heart' }
  ];
  const adjAcc = (c, s) => adj(c, s.g === 'm' ? 'm' : s.g === 'f' ? 'accF' : 'n');

  function shapeSVG(kind, fill, cls) {
    const st = `fill="${fill}" stroke="rgba(0,0,0,.18)" stroke-width="3" stroke-linejoin="round"`;
    let body = '';
    switch (kind) {
      case 'circle': body = `<circle cx="50" cy="50" r="40" ${st}/>`; break;
      case 'square': body = `<rect x="12" y="12" width="76" height="76" rx="8" ${st}/>`; break;
      case 'triangle': body = `<path d="M50 9 L92 88 L8 88 Z" ${st}/>`; break;
      case 'star': body = `<path d="M50 6 L62 37 L95 38 L69 58 L79 91 L50 72 L21 91 L31 58 L5 38 L38 37 Z" ${st}/>`; break;
      case 'heart': body = `<path d="M50 88 C10 60 4 34 22 20 C36 10 48 18 50 30 C52 18 64 10 78 20 C96 34 90 60 50 88 Z" ${st}/>`; break;
    }
    return `<svg class="${cls || 'shape'}" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
  }
  const emo = (e, cls) => `<span class="emo ${cls || ''}">${e}</span>`;
  const big = (txt, cls) => `<span class="bigtxt ${cls || ''}">${txt}</span>`;
  const listen = () => `<div class="listen">👂</div>`;

  // ---------- GAME 1: colors & shapes ----------
  function genColors(i, lang, r) {
    if (i < 12) {
      const n = i < 6 ? 3 : 4;
      const cols = sample(r, COLORS, n); const target = cols[0];
      const shp = i < 6 ? 'circle' : pick(r, SHAPES).id;
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi rovnakú farbu.', 'Find the same color.'),
        hint: T(lang, `Hľadáme ${adj(target, 'accF')} farbu.`, `Look for the ${target.en} color.`),
        display: `<div class="blob" style="background:${target.hex}"></div>`,
        options: shuffle(r, cols.map((c, k) => ({ html: shapeSVG(shp, c.hex), ok: k === 0 })))
      };
    }
    if (i < 25) {
      const n = i < 18 ? 3 : 4;
      const shs = sample(r, SHAPES, n); const target = shs[0];
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi rovnaký tvar.', 'Find the same shape.'),
        hint: T(lang, `Hľadáme ${target.skAcc}.`, `Look for the ${target.en}.`),
        display: shapeSVG(target.id, '#cfc6bd', 'shape big'),
        options: shuffle(r, shs.map((s, k) => ({ html: shapeSVG(s.id, pick(r, COLORS).hex), ok: k === 0 })))
      };
    }
    // both color and shape
    const n = i < 33 ? 4 : 6;
    const tc = pick(r, COLORS), ts = pick(r, SHAPES);
    const opts = [{ c: tc, s: ts }];
    const used = new Set([tc.id + ts.id]);
    const add = (c, s) => { if (!used.has(c.id + s.id)) { used.add(c.id + s.id); opts.push({ c, s }); } };
    add(pick(r, COLORS.filter(c => c !== tc)), ts);
    add(tc, pick(r, SHAPES.filter(s => s !== ts)));
    while (opts.length < n) add(pick(r, COLORS), pick(r, SHAPES));
    const byVoice = i >= 40;
    return {
      kind: 'choose',
      prompt: byVoice ? T(lang, `Ťukni na ${adjAcc(tc, ts)} ${ts.skAcc}.`, `Tap the ${tc.en} ${ts.en}.`)
        : T(lang, 'Nájdi rovnakú farbu aj tvar.', 'Find the same color and the same shape.'),
      hint: T(lang, `Hľadáme ${adjAcc(tc, ts)} ${ts.skAcc}.`, `Look for the ${tc.en} ${ts.en}.`),
      display: byVoice ? listen() : shapeSVG(ts.id, tc.hex, 'shape big'),
      options: shuffle(r, opts.map((o, k) => ({ html: shapeSVG(o.s.id, o.c.hex), ok: k === 0 })))
    };
  }

  // ---------- GAME 2: counting ----------
  const NUT = '🌰';
  function nuts(n, crossed) {
    let h = '<div class="nuts">';
    for (let k = 0; k < n; k++) h += `<span class="nut${crossed && k >= n - crossed ? ' gone' : ''}">${NUT}</span>` + ((k + 1) % 5 === 0 && k + 1 < n ? '<i class="br5"></i>' : '');
    return h + '</div>';
  }
  function numOpts(r, ans, n, max) {
    const s = new Set([ans]);
    let guard = 0;
    while (s.size < n && guard++ < 200) { const v = ans + ri(r, -3, 3); if (v >= 0 && v <= max) s.add(v); }
    for (let v = 0; s.size < n; v++) s.add(v);
    return shuffle(r, [...s]).map(v => ({ html: big(v, 'num'), ok: v === ans }));
  }
  function genCount(i, lang, r) {
    if (i < 18) {
      const n = i < 10 ? ri(r, 1, Math.min(5, 2 + Math.floor(i / 2))) : ri(r, 6, 10);
      return {
        kind: 'choose', prompt: T(lang, 'Koľko je tu orieškov?', 'How many nuts are there?'),
        hint: T(lang, 'Spočítaj oriešky prstom: jeden, dva, tri…', 'Count the nuts with your finger: one, two, three…'),
        display: nuts(n), options: numOpts(r, n, i < 10 ? 3 : 4, 10)
      };
    }
    if (i < 26) {
      const n = [2, 3, 4, 5, 6, 7, 8, 9][i - 18];
      return {
        kind: 'give', n, prompt: T(lang, `Daj veveričke presne ${n} orieškov do košíka. Potom ťukni na fajku.`, `Put exactly ${n} nuts in the basket. Then tap the check mark.`),
        hint: T(lang, `Spočítaj oriešky v košíku. Potrebujeme ${n}.`, `Count the nuts in the basket. We need ${n}.`),
        display: big(n, 'num huge')
      };
    }
    if (i < 32) {
      let a = ri(r, 2, 9), b = ri(r, 1, 9); if (a === b) b = a > 5 ? a - ri(r, 1, 3) : a + ri(r, 1, 3);
      if (i >= 29) b = a + (a < 9 && r() < 0.5 ? 1 : -1); // closer = harder
      return {
        kind: 'choose', prompt: T(lang, 'Kde je viac orieškov?', 'Where are more nuts?'),
        hint: T(lang, 'Spočítaj obe kôpky. Ktorá má viac?', 'Count both piles. Which one has more?'),
        display: emo('🐿️'), options: shuffle(r, [{ html: nuts(a), ok: a > b }, { html: nuts(b), ok: b > a }]), wide: true
      };
    }
    let a, b, plus, max = i < 42 ? 10 : 20;
    plus = i < 42 ? i < 37 : r() < 0.5;
    if (plus) { a = ri(r, 1, max - 2); b = ri(r, 1, Math.min(max - a, i < 42 ? 4 : 9)); }
    else { a = ri(r, 3, max); b = ri(r, 1, Math.min(a - 1, i < 42 ? 4 : 9)); }
    const ans = plus ? a + b : a - b;
    const op = plus ? '+' : '−';
    const disp = plus
      ? `<div class="sum">${nuts(a)}<span class="op">+</span>${nuts(b)}</div>`
      : `<div class="sum">${nuts(a, b)}</div>`;
    return {
      kind: 'choose',
      prompt: T(lang, `Koľko je ${a} ${plus ? 'plus' : 'mínus'} ${b}?`, `What is ${a} ${plus ? 'plus' : 'minus'} ${b}?`),
      hint: plus ? T(lang, `Spočítaj všetky oriešky spolu.`, `Count all the nuts together.`)
        : T(lang, `Veverička ${b} oriešky zjedla. Spočítaj tie, čo zostali.`, `The squirrel ate ${b}. Count the nuts that are left.`),
      display: disp + `<div class="eq">${a} ${op} ${b} = ?</div>`,
      options: numOpts(r, ans, 4, max)
    };
  }

  // ---------- GAME 3: letters ----------
  const LET = {
    sk: { easy: 'A E I O U M L S P T K V D R N B J Z H C'.split(' '), hard: 'Č Š Ž Á É Í Ó Ú Ď Ť Ň Ľ Ä Ô Y Ý F G'.split(' ') },
    en: { easy: 'A E I O U M L S P T K V D R N B J Z H C'.split(' '), hard: 'F G Q W X Y'.split(' ') }
  };
  const FIRST = {
    sk: [['🐟', 'RYBA'], ['🍎', 'JABLKO'], ['🐱', 'MAČKA'], ['🏠', 'DOM'], ['🐶', 'PES'], ['☀️', 'SLNKO'], ['🦉', 'SOVA'], ['🚗', 'AUTO'], ['🍌', 'BANÁN'], ['🦊', 'LÍŠKA'],
      ['🐝', 'VČELA'], ['⭐', 'HVIEZDA'], ['🍋', 'CITRÓN'], ['🐢', 'KORYTNAČKA'], ['🎈', 'BALÓN'], ['🌷', 'TULIPÁN'], ['🐸', 'ŽABA'], ['🐑', 'OVCA'], ['🦁', 'LEV'], ['🚂', 'VLAK'],
      ['🐘', 'SLON'], ['🌙', 'MESIAC'], ['🐍', 'HAD'], ['🌹', 'RUŽA'], ['🍉', 'MELÓN'], ['🐐', 'KOZA'], ['🧀', 'SYR'], ['👑', 'KORUNA'], ['🐭', 'MYŠ'], ['🌳', 'STROM']],
    en: [['🐟', 'FISH'], ['🍎', 'APPLE'], ['🐱', 'CAT'], ['🏠', 'HOUSE'], ['🐶', 'DOG'], ['☀️', 'SUN'], ['🦉', 'OWL'], ['🚗', 'CAR'], ['🍌', 'BANANA'], ['🦊', 'FOX'],
      ['🐝', 'BEE'], ['⭐', 'STAR'], ['🍋', 'LEMON'], ['🐢', 'TURTLE'], ['🎈', 'BALLOON'], ['🌷', 'TULIP'], ['🐸', 'FROG'], ['🐑', 'SHEEP'], ['🦁', 'LION'], ['🚂', 'TRAIN'],
      ['🐘', 'ELEPHANT'], ['🌙', 'MOON'], ['🐍', 'SNAKE'], ['🌹', 'ROSE'], ['🍉', 'MELON'], ['🐐', 'GOAT'], ['🧀', 'CHEESE'], ['👑', 'CROWN'], ['🐭', 'MOUSE'], ['🌳', 'TREE']]
  };
  function letterOpts(r, target, pool, n, lower) {
    const others = sample(r, pool.filter(l => l !== target), n - 1);
    return shuffle(r, [target, ...others]).map(l => ({ html: big(lower ? l.toLowerCase() : l, 'let'), ok: l === target }));
  }
  function genLetters(i, lang, r) {
    const L = LET[lang]; const all = L.easy.concat(L.hard);
    if (i < 16) {
      const voice = i >= 10; const pool = L.easy;
      const t = pick(r, pool);
      return {
        kind: 'choose',
        prompt: voice ? T(lang, `Ťukni na písmeno ${t}.`, `Tap the letter ${t}.`) : T(lang, 'Nájdi rovnaké písmeno.', 'Find the same letter.'),
        say: voice ? null : T(lang, `Nájdi rovnaké písmeno. Písmeno ${t}.`, `Find the same letter. The letter ${t}.`),
        hint: T(lang, `Pozri sa pozorne. Hľadáme písmeno ${t}.`, `Look carefully. We are looking for the letter ${t}.`),
        hintShow: big(t, 'let'),
        display: voice ? listen() : big(t, 'let huge'),
        options: letterOpts(r, t, pool, voice ? 4 : 3, false)
      };
    }
    if (i < 32) {
      const pool = i < 24 ? L.easy : all; const t = i < 24 ? pick(r, L.easy) : pick(r, i % 2 ? L.hard : L.easy);
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi malé písmeno k veľkému.', 'Find the small letter for the big one.'),
        say: T(lang, `Nájdi malé písmeno ${t}.`, `Find the small letter ${t}.`),
        hint: T(lang, `Veľké ${t} a malé ${t.toLowerCase()} sú to isté písmeno.`, `Big ${t} and small ${t.toLowerCase()} are the same letter.`),
        hintShow: big(t + ' ' + t.toLowerCase(), 'let'),
        display: big(t, 'let huge'), options: letterOpts(r, t, pool, i < 24 ? 3 : 4, true)
      };
    }
    const list = FIRST[lang]; const [e, w] = list[(i - 32 + Math.floor(r() * 3) * 6) % list.length];
    const t = w[0];
    const pool = all.filter(l => l !== t);
    return {
      kind: 'choose', prompt: T(lang, 'Akým písmenom sa začína toto slovo?', 'Which letter does this word start with?'),
      say: T(lang, `Akým písmenom sa začína slovo ${w.toLowerCase()}?`, `Which letter does the word ${w.toLowerCase()} start with?`),
      hint: T(lang, `Počúvaj: ${t}… ${w.toLowerCase()}.`, `Listen: ${t}… ${w.toLowerCase()}.`),
      hintShow: big(t, 'let'), sayWordOnTap: w.toLowerCase(),
      display: emo(e, 'huge'), options: letterOpts(r, t, [t, ...pool], i < 40 ? 3 : 4, false)
    };
  }

  // ---------- GAME 4: first words ----------
  const WORDS = {
    sk: [['🏠', 'DOM'], ['🐶', 'PES'], ['🦁', 'LEV'], ['👁️', 'OKO'], ['👃', 'NOS'], ['🧀', 'SYR'], ['🐍', 'HAD'], ['🐴', 'KÔŇ'], ['🌲', 'LES'], ['🐭', 'MYŠ'], ['🦷', 'ZUB'], ['⛵', 'LOĎ'],
      ['👩', 'MAMA'], ['👨', 'TATO'], ['🚗', 'AUTO'], ['🐟', 'RYBA'], ['🦉', 'SOVA'], ['🐐', 'KOZA'], ['🚂', 'VLAK'], ['🐘', 'SLON'], ['✋', 'RUKA'], ['🦶', 'NOHA'], ['👂', 'UCHO'], ['🌸', 'KVET'], ['🌈', 'DÚHA'], ['🐑', 'OVCA'], ['🐸', 'ŽABA'],
      ['⚽', 'LOPTA'], ['🐱', 'MAČKA'], ['☀️', 'SLNKO'], ['🦆', 'KAČKA'], ['🌳', 'STROM'], ['📖', 'KNIHA'], ['🎂', 'TORTA'], ['👵', 'BABKA'], ['🍌', 'BANÁN'], ['☁️', 'OBLAK'], ['🦋', 'MOTÝĽ'], ['🐓', 'KOHÚT'],
      ['🍐', 'HRUŠKA'], ['🐻', 'MEDVEĎ'], ['🍎', 'JABLKO'], ['🌙', 'MESIAC'], ['🍋', 'CITRÓN'], ['👑', 'KORUNA'], ['⭐', 'HVIEZDA'], ['🚲', 'BICYKEL'], ['☂️', 'DÁŽDNIK'], ['🍦', 'ZMRZLINA'], ['✈️', 'LIETADLO'], ['🐿️', 'VEVERIČKA'], ['🍫', 'ČOKOLÁDA'], ['🐢', 'KORYTNAČKA']],
    en: [['🐂', 'OX'], ['🐱', 'CAT'], ['🐶', 'DOG'], ['☀️', 'SUN'], ['🐷', 'PIG'], ['🐝', 'BEE'], ['🥚', 'EGG'], ['🚌', 'BUS'], ['🚗', 'CAR'], ['🎩', 'HAT'], ['🦊', 'FOX'], ['🦉', 'OWL'], ['🐮', 'COW'], ['🛏️', 'BED'], ['🔑', 'KEY'], ['👩', 'MOM'], ['👨', 'DAD'],
      ['🐟', 'FISH'], ['🐻', 'BEAR'], ['🐸', 'FROG'], ['🦆', 'DUCK'], ['🌳', 'TREE'], ['⭐', 'STAR'], ['🌙', 'MOON'], ['📖', 'BOOK'], ['🎂', 'CAKE'], ['⚽', 'BALL'], ['🦁', 'LION'], ['✋', 'HAND'], ['⛵', 'BOAT'], ['🍐', 'PEAR'],
      ['🍎', 'APPLE'], ['🏠', 'HOUSE'], ['🐴', 'HORSE'], ['🐑', 'SHEEP'], ['🐍', 'SNAKE'], ['🚂', 'TRAIN'], ['🐭', 'MOUSE'], ['🍋', 'LEMON'], ['☁️', 'CLOUD'], ['👑', 'CROWN'],
      ['🍌', 'BANANA'], ['🐰', 'RABBIT'], ['🐢', 'TURTLE'], ['🌸', 'FLOWER'], ['🌈', 'RAINBOW'], ['🚲', 'BICYCLE'], ['🐘', 'ELEPHANT'], ['☂️', 'UMBRELLA'], ['✈️', 'AIRPLANE'], ['🐿️', 'SQUIRREL'], ['🦋', 'BUTTERFLY'], ['🍫', 'CHOCOLATE']]
  };
  function genWords(i, lang, r) {
    const W = WORDS[lang];
    const idx = Math.min(W.length - 1, Math.floor(i * W.length / TASKS_PER_GAME));
    const [e, w] = W[idx];
    const n = i < 14 ? 3 : 4;
    if (i < 30) {
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      return {
        kind: 'choose', prompt: T(lang, 'Prečítaj slovo a nájdi obrázok.', 'Read the word and find the picture.'),
        say: T(lang, 'Prečítaj slovo a nájdi obrázok. Ťukni na slovo a vypočuješ si ho.', 'Read the word and find the picture. Tap the word to hear it.'),
        hint: T(lang, `Ťukni na slovo. Počúvaj: ${w.split('').join(', ')}… ${w.toLowerCase()}.`, `Tap the word. Listen: ${w.split('').join(', ')}… ${w.toLowerCase()}.`),
        display: `<button class="word" data-say="${w.toLowerCase()}">${w}</button>`,
        options: shuffle(r, [[e, w], ...others].map(([ee]) => ({ html: emo(ee), ok: ee === e })))
      };
    }
    // picture -> word; distractors are similar length / same first letter when possible
    const near = W.filter(x => x[1] !== w).sort((a, b) => {
      const sa = Math.abs(a[1].length - w.length) - (a[1][0] === w[0] ? 2 : 0), sb = Math.abs(b[1].length - w.length) - (b[1][0] === w[0] ? 2 : 0);
      return sa - sb || (r() - 0.5);
    });
    const others = sample(r, near.slice(0, 7), n - 1);
    return {
      kind: 'choose', prompt: T(lang, 'Ktoré slovo patrí k obrázku?', 'Which word goes with the picture?'),
      hint: T(lang, `Hľadáme slovo ${w.toLowerCase()}. Začína sa na ${w[0]}.`, `We need the word ${w.toLowerCase()}. It starts with ${w[0]}.`),
      display: emo(e, 'huge'),
      options: shuffle(r, [[e, w], ...others].map(([, ww]) => ({ html: big(ww, 'wordopt'), ok: ww === w }))), wide: true
    };
  }

  // ---------- GAME 5: riddles ----------
  const CATS = [
    { sk: 'ovocie', en: 'fruit', items: ['🍎', '🍐', '🍌', '🍇', '🍓', '🍒', '🍋', '🍉'] },
    { sk: 'zvieratká', en: 'animals', items: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐷', '🐮'] },
    { sk: 'vozidlá', en: 'vehicles', items: ['🚗', '🚌', '🚂', '✈️', '🚲', '⛵', '🚜', '🚒'] },
    { sk: 'oblečenie', en: 'clothes', items: ['👕', '👖', '👗', '🧢', '🧦', '🧤', '👟', '🧣'] },
    { sk: 'kvety a stromy', en: 'plants', items: ['🌸', '🌻', '🌷', '🌹', '🌳', '🌵', '🌲', '🌼'] }
  ];
  const HOUSE_ANIMALS = [{ e: '🐰', sk: 'Zajačik', en: 'The bunny' }, { e: '🦔', sk: 'Ježko', en: 'The hedgehog' }, { e: '🐭', sk: 'Myška', en: 'The mouse' }, { e: '🐱', sk: 'Mačička', en: 'The kitty' }];
  function houseSVG(hex, deco) {
    return `<div class="house">${deco === 'tree' ? '<span class="deco">🌳</span>' : deco === 'flower' ? '<span class="deco">🌻</span>' : ''}<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M8 46 L50 10 L92 46 Z" fill="#c98f6b" stroke="rgba(0,0,0,.2)" stroke-width="3" stroke-linejoin="round"/>
      <rect x="18" y="44" width="64" height="48" rx="4" fill="${hex}" stroke="rgba(0,0,0,.2)" stroke-width="3"/>
      <rect x="42" y="62" width="17" height="30" rx="7" fill="#8a6247"/><rect x="24" y="54" width="13" height="13" rx="2" fill="#fff8e6"/><rect x="64" y="54" width="13" height="13" rx="2" fill="#fff8e6"/></svg></div>`;
  }
  function genRiddles(i, lang, r) {
    if (i < 12) {
      const [c1, c2] = sample(r, CATS, 2);
      const n = i < 6 ? 4 : 5;
      const same = sample(r, c1.items, n - 1), odd = pick(r, c2.items);
      return {
        kind: 'choose', prompt: T(lang, 'Čo sem nepatrí?', 'Which one does not belong?'),
        hint: T(lang, `Tu sú ${c1.sk}. Jedna vec nie je ${c1.sk}.`, `These are ${c1.en}. One thing is not ${c1.en}.`),
        display: emo('🔍'),
        options: shuffle(r, [...same.map(e => ({ html: emo(e), ok: false })), { html: emo(odd), ok: true }])
      };
    }
    if (i < 28) {
      let unit, items;
      const useShapes = i >= 24;
      const pool = useShapes ? sample(r, COLORS, 3).map((c, k) => shapeSVG(['circle', 'square', 'triangle', 'star', 'heart'][(k + i) % 5], c.hex))
        : sample(r, pick(r, CATS).items, 3).map(e => emo(e));
      if (i < 17) unit = [0, 1]; else if (i < 21) unit = r() < 0.5 ? [0, 0, 1] : [0, 1, 1]; else unit = [0, 1, 2];
      const shown = 6; items = [];
      for (let k = 0; k <= shown; k++) items.push(unit[k % unit.length]);
      const next = items.pop();
      const used = [...new Set(unit)];
      const opts = used.length < 3 ? [...used, 2] : used;
      return {
        kind: 'choose', prompt: T(lang, 'Čo príde ďalej?', 'What comes next?'),
        hint: T(lang, 'Pozri sa, ako sa obrázky opakujú. Povedz si ich nahlas.', 'Look how the pictures repeat. Say them out loud.'),
        display: `<div class="seq">${items.map(k => `<span class="cell">${pool[k]}</span>`).join('')}<span class="cell q">?</span></div>`,
        options: shuffle(r, opts.map(k => ({ html: pool[k], ok: k === next })))
      };
    }
    const who = pick(r, HOUSE_ANIMALS);
    if (i < 36) {
      const cols = sample(r, COLORS, 3); const t = 0;
      return {
        kind: 'choose', houses: true,
        prompt: T(lang, `${who.sk} býva v ${adj(cols[t], 'loc')} domčeku.`, `${who.en} lives in the ${cols[t].en} house.`),
        hint: T(lang, `Hľadáme ${adj(cols[t], 'm')} domček.`, `Look for the ${cols[t].en} house.`),
        display: emo(who.e) + listen(),
        options: shuffle(r, cols.map((c, k) => ({ html: houseSVG(c.hex), ok: k === t })))
      };
    }
    if (i < 44) {
      const [a, b] = sample(r, COLORS, 2);
      const withTree = r() < 0.5; // target has tree or flower
      const tDeco = withTree ? 'tree' : 'flower', oDeco = withTree ? (r() < 0.5 ? 'flower' : null) : 'tree';
      const opts = [{ c: a, d: tDeco, ok: true }, { c: a, d: oDeco, ok: false }, { c: b, d: tDeco, ok: false }];
      const nearW = withTree ? T(lang, 'vedľa stromu', 'next to the tree') : T(lang, 'vedľa slnečnice', 'next to the sunflower');
      return {
        kind: 'choose', houses: true,
        prompt: T(lang, `${who.sk} býva v ${adj(a, 'loc')} domčeku ${nearW}.`, `${who.en} lives in the ${a.en} house ${nearW}.`),
        hint: T(lang, `Sú tu dva ${adj(a, 'm').replace(/ý$/, 'é')} domčeky. Ktorý je ${nearW}?`, `There are two ${a.en} houses. Which one is ${nearW}?`),
        display: emo(who.e) + listen(),
        options: shuffle(r, opts.map(o => ({ html: houseSVG(o.c.hex, o.d), ok: o.ok })))
      };
    }
    // between: 4 houses in fixed order (options shown in this order, not shuffled)
    const cols = sample(r, COLORS, 4); const t = ri(r, 1, 2);
    const L = cols[t - 1], R = cols[t + 1];
    return {
      kind: 'choose', houses: true, keepOrder: true,
      prompt: T(lang, `${who.sk} býva v domčeku medzi ${adj(L, 'ins')} a ${adj(R, 'ins')} domčekom.`, `${who.en} lives in the house between the ${L.en} house and the ${R.en} house.`),
      hint: T(lang, `Nájdi ${adj(L, 'm')} a ${adj(R, 'm')} domček. ${who.sk} býva v strede medzi nimi.`, `Find the ${L.en} and the ${R.en} house. ${who.en} lives in the middle.`),
      display: emo(who.e) + listen(),
      options: cols.map((c, k) => ({ html: houseSVG(c.hex), ok: k === t }))
    };
  }

  // ---------- GAME 6: dressing up ----------
  const SLOT_NAMES = {
    hat: { sk: 'Pozri sa, čo má zajačik na hlave.', en: 'Look at what the bunny wears on its head.' },
    scarf: { sk: 'Pozri sa na šál.', en: 'Look at the scarf.' },
    shirt: { sk: 'Pozri sa na šaty.', en: 'Look at the dress.' },
    shoes: { sk: 'Pozri sa na topánky.', en: 'Look at the shoes.' }
  };
  function genDress(i, lang, r) {
    const slots = i < 10 ? ['hat'] : i < 20 ? ['hat', 'scarf'] : i < 40 ? ['hat', 'scarf', 'shirt'] : ['hat', 'scarf', 'shirt', 'shoes'];
    const nCh = i < 30 ? 3 : 4;
    const hatTypes = i < 30 ? ['beanie'] : ['beanie', 'tophat'];
    const target = {}; const choices = {};
    for (const s of slots) {
      if (s === 'hat') {
        const tc = pick(r, COLORS).id, tt = pick(r, hatTypes);
        const set = new Set([tt + '|' + tc]);
        if (hatTypes.length > 1) set.add((tt === 'beanie' ? 'tophat' : 'beanie') + '|' + tc);
        while (set.size < nCh) set.add(pick(r, hatTypes) + '|' + pick(r, COLORS).id);
        target.hat = tt + '|' + tc; choices.hat = shuffle(r, [...set]);
      } else {
        const cs = sample(r, COLORS, nCh).map(c => c.id);
        target[s] = cs[0]; choices[s] = shuffle(r, cs);
      }
    }
    return {
      kind: 'dress', slots, target, choices,
      prompt: T(lang, 'Obleč zajačika presne ako na obrázku. Potom ťukni na fajku.', 'Dress the bunny just like in the picture. Then tap the check mark.'),
      hint: T(lang, 'Porovnaj zajačika s obrázkom.', 'Compare the bunny with the picture.'),
      slotHints: Object.fromEntries(Object.entries(SLOT_NAMES).map(([k, v]) => [k, v[lang]]))
    };
  }

  const colorHex = id => (COLORS.find(c => c.id === id) || {}).hex;
  function hatSVGPart(val) {
    const [type, cid] = val.split('|'); const c = colorHex(cid);
    if (type === 'tophat') return `<ellipse cx="100" cy="72" rx="58" ry="11" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="66" y="22" width="68" height="50" rx="6" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="66" y="56" width="68" height="9" fill="rgba(255,255,255,.55)"/>`;
    return `<path d="M50 82 C50 30 150 30 150 82 Z" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="46" y="74" width="108" height="14" rx="7" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><circle cx="100" cy="30" r="11" fill="#fff" stroke="rgba(0,0,0,.2)" stroke-width="3"/>`;
  }
  function bunnySVG(o, cls) {
    const fur = '#fffdf9', line = 'rgba(120,90,70,.45)';
    let s = `<svg class="${cls || 'bunny'}" viewBox="0 0 200 290" aria-hidden="true">`;
    s += `<ellipse cx="74" cy="52" rx="15" ry="46" fill="${fur}" stroke="${line}" stroke-width="3"/><ellipse cx="74" cy="56" rx="7" ry="34" fill="#f8c9d4"/>`;
    s += `<ellipse cx="126" cy="52" rx="15" ry="46" fill="${fur}" stroke="${line}" stroke-width="3"/><ellipse cx="126" cy="56" rx="7" ry="34" fill="#f8c9d4"/>`;
    s += `<ellipse cx="100" cy="212" rx="50" ry="56" fill="${fur}" stroke="${line}" stroke-width="3"/>`;
    if (o.shirt) s += `<path d="M62 168 Q100 152 138 168 L156 262 Q100 280 44 262 Z" fill="${colorHex(o.shirt)}" stroke="rgba(0,0,0,.2)" stroke-width="3"/><circle cx="100" cy="196" r="4" fill="#fff"/><circle cx="100" cy="216" r="4" fill="#fff"/>`;
    s += `<ellipse cx="78" cy="272" rx="23" ry="12" fill="${o.shoes ? colorHex(o.shoes) : fur}" stroke="${line}" stroke-width="3"/><ellipse cx="122" cy="272" rx="23" ry="12" fill="${o.shoes ? colorHex(o.shoes) : fur}" stroke="${line}" stroke-width="3"/>`;
    s += `<circle cx="100" cy="112" r="50" fill="${fur}" stroke="${line}" stroke-width="3"/>`;
    s += `<circle cx="82" cy="108" r="6" fill="#3b2e2a"/><circle cx="118" cy="108" r="6" fill="#3b2e2a"/><circle cx="84" cy="106" r="2" fill="#fff"/><circle cx="120" cy="106" r="2" fill="#fff"/>`;
    s += `<ellipse cx="100" cy="124" rx="6" ry="4.5" fill="#f19bb0"/><path d="M92 132 Q100 140 108 132" fill="none" stroke="#3b2e2a" stroke-width="2.5" stroke-linecap="round"/>`;
    s += `<circle cx="70" cy="128" r="8" fill="#fbd3db" opacity=".8"/><circle cx="130" cy="128" r="8" fill="#fbd3db" opacity=".8"/>`;
    if (o.scarf) { const c = colorHex(o.scarf); s += `<rect x="58" y="152" width="84" height="20" rx="10" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/><rect x="112" y="160" width="18" height="44" rx="7" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/>`; }
    if (o.hat) s += hatSVGPart(o.hat);
    return s + '</svg>';
  }
  function itemSVG(slot, val) {
    if (slot === 'hat') return `<svg viewBox="40 14 120 82" class="item">${hatSVGPart(val)}</svg>`;
    const c = colorHex(val);
    if (slot === 'scarf') return `<svg viewBox="0 0 100 100" class="item"><rect x="8" y="26" width="84" height="22" rx="11" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/><rect x="58" y="34" width="20" height="54" rx="8" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/></svg>`;
    if (slot === 'shirt') return `<svg viewBox="0 0 100 100" class="item"><path d="M30 12 L42 18 Q50 24 58 18 L70 12 L90 30 L78 42 L74 38 L84 92 L16 92 L26 38 L22 42 L10 30 Z" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3" stroke-linejoin="round"/></svg>`;
    return `<svg viewBox="0 0 100 100" class="item"><path d="M8 62 Q8 44 26 44 L34 44 Q38 60 50 62 L54 62 Q60 62 60 72 L60 78 L8 78 Z" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/><path d="M44 62 Q44 44 62 44 L70 44 Q74 60 86 62 L90 62 Q96 62 96 72 L96 78 L44 78 Z" fill="${c}" stroke="rgba(0,0,0,.2)" stroke-width="3"/></svg>`;
  }

  const GAMES = [
    { id: 'colors', img: 'chameleon', color: '#f7d6e6', gen: genColors,
      title: { sk: 'Farby a tvary', en: 'Colors & Shapes' }, helper: { sk: 'Chameleón Kamil', en: 'Kamil the Chameleon' },
      intro: { sk: 'Ahoj, ja som chameleón Kamil. Ja viem meniť farby! Poď hľadať farby a tvary.', en: 'Hi, I am Kamil the Chameleon. I can change colors! Let us find colors and shapes.' } },
    { id: 'count', img: 'veverica', color: '#fbe0c8', gen: genCount,
      title: { sk: 'Počítanie', en: 'Counting' }, helper: { sk: 'Veverička Vierka', en: 'Vera the Squirrel' },
      intro: { sk: 'Ahoj, ja som veverička Vierka. Mám plno orieškov. Poď ich so mnou počítať!', en: 'Hi, I am Vera the Squirrel. I have lots of nuts. Let us count them together!' } },
    { id: 'letters', img: 'sovicka', color: '#e6dcf5', gen: genLetters,
      title: { sk: 'Písmenká', en: 'Letters' }, helper: { sk: 'Sovička Soňa', en: 'Sonia the Owl' },
      intro: { sk: 'Ahoj, ja som sovička Soňa. Rada čítam knižky. Poď spoznávať písmenká!', en: 'Hi, I am Sonia the Owl. I love books. Let us learn the letters!' } },
    { id: 'words', img: 'papagaj', color: '#d6f0d9', gen: genWords,
      title: { sk: 'Prvé slová', en: 'First Words' }, helper: { sk: 'Papagáj Pepo', en: 'Pepo the Parrot' },
      intro: { sk: 'Ahoj, ja som papagáj Pepo. Rád hovorím slová. Poď čítať prvé slová!', en: 'Hi, I am Pepo the Parrot. I love saying words. Let us read our first words!' } },
    { id: 'riddles', img: 'liska', color: '#fde6c6', gen: genRiddles,
      title: { sk: 'Hádanky', en: 'Riddles' }, helper: { sk: 'Líška Lili', en: 'Lili the Fox' },
      intro: { sk: 'Ahoj, ja som líška Lili. Mám rada hádanky. Poď ich so mnou riešiť!', en: 'Hi, I am Lili the Fox. I love riddles. Let us solve them together!' } },
    { id: 'dress', img: 'zajacik', color: '#d8e9f7', gen: genDress,
      title: { sk: 'Obliekanie', en: 'Dressing Up' }, helper: { sk: 'Zajačik Zajko', en: 'Zack the Bunny' },
      intro: { sk: 'Ahoj, ja som zajačik Zajko. Pomôžeš mi obliecť sa podľa obrázka?', en: 'Hi, I am Zack the Bunny. Will you help me get dressed like in the picture?' } }
  ];

  function getTask(gameId, index, lang) {
    const g = GAMES.find(x => x.id === gameId);
    const r = rng(hash(gameId) + index * 7919);
    const t = g.gen(index, lang, r); t.index = index; return t;
  }

  window.ZS_GAMES = { GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG };
})();

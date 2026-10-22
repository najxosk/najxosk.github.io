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
  const T = (lang, sk, en, es, cs) => (lang === 'sk' ? sk : lang === 'cs' ? (cs !== undefined ? cs : cz(sk)) : lang === 'es' && es !== undefined ? es : en);
  const esC = (m, f, mp, fp) => ({ m, f, mp, fp });

  // ---------- shared visual vocab ----------
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const COLORS = [
    { id: 'red', hex: '#ff8a8a', sk: 'červen', en: 'red', es: esC('rojo', 'roja', 'rojos', 'rojas') },
    { id: 'blue', hex: '#7ab6f5', sk: 'modr', en: 'blue', es: esC('azul', 'azul', 'azules', 'azules') },
    { id: 'yellow', hex: '#ffe066', sk: 'žlt', en: 'yellow', es: esC('amarillo', 'amarilla', 'amarillos', 'amarillas') },
    { id: 'green', hex: '#7fd88f', sk: 'zelen', en: 'green', es: esC('verde', 'verde', 'verdes', 'verdes') },
    { id: 'purple', hex: '#bf9bf2', sk: 'fialov', en: 'purple', es: esC('morado', 'morada', 'morados', 'moradas') },
    { id: 'orange', hex: '#ffae63', sk: 'oranžov', en: 'orange', es: esC('naranja', 'naranja', 'naranja', 'naranja') },
    { id: 'pink', hex: '#ffa6cf', sk: 'ružov', en: 'pink', es: esC('rosa', 'rosa', 'rosa', 'rosa') },
    { id: 'brown', hex: '#c4926c', sk: 'hned', en: 'brown', es: esC('marrón', 'marrón', 'marrones', 'marrones') }
  ];
  // Slovak adjective forms from stem: m/f/n nominative, accF accusative fem, loc, ins, pl nominative (inanimate)
  const adj = (c, form) => c.sk + ({ m: 'ý', f: 'á', n: 'é', pl: 'é', accF: 'ú', loc: 'om', ins: 'ým' })[form];

  // ===================== Czech (cs) =====================
  const CZ = window.ZS_CZ || {};
  const czMiss = new Set();
  const cz = s => { if (s == null || s === '') return s; if (Object.prototype.hasOwnProperty.call(CZ, s)) return CZ[s]; czMiss.add(s); return s; };
  const czA = s => cz('acc:' + s);
  const CS_STEM = { red: 'červen', blue: 'modr', yellow: 'žlut', green: 'zelen', purple: 'fialov', orange: 'oranžov', pink: 'růžov', brown: 'hněd' };
  COLORS.forEach(c => { c.cs = CS_STEM[c.id]; });
  const adjC = (c, form) => c.cs + ({ m: 'ý', f: 'á', n: 'é', pl: 'é', accF: 'ou', loc: 'ém', ins: 'ým' })[form];
  const adjAccC = (c, s) => adjC(c, s.g === 'm' ? 'm' : s.g === 'f' ? 'accF' : 'n');
  const CS_SHAPE = { circle: ['kruh', 'kruh'], square: ['čtverec', 'čtverec'], triangle: ['trojúhelník', 'trojúhelník'], star: ['hvězda', 'hvězdu'], heart: ['srdce', 'srdce'], diamond: ['kosočtverec', 'kosočtverec'], oval: ['ovál', 'ovál'] };
  const vInC = w => (/^[fv]/i.test(w) ? 've ' : 'v ') + w;
  const csNum = (n, g) => n === 1 ? ({ f: 'jedna', n: 'jedno', m: 'jeden', pl: 'jedny' })[g] : n === 2 ? (g === 'm' ? 'dva' : 'dvě') : num('cs', n);
  const csAccF = n => n === 1 ? 'jednu' : n === 2 ? 'dvě' : num('cs', n);
  const csBe = n => (n >= 2 && n <= 4 ? 'jsou' : 'je');
  const PLUR_CS = /^(třešně|hrozny|kalhoty|šaty|ponožky|rukavice|tenisky|boty)$/;
  const SHAPES = [
    { id: 'circle', sk: 'kruh', skAcc: 'kruh', g: 'm', en: 'circle', es: 'círculo', eg: 'm' },
    { id: 'square', sk: 'štvorec', skAcc: 'štvorec', g: 'm', en: 'square', es: 'cuadrado', eg: 'm' },
    { id: 'triangle', sk: 'trojuholník', skAcc: 'trojuholník', g: 'm', en: 'triangle', es: 'triángulo', eg: 'm' },
    { id: 'star', sk: 'hviezda', skAcc: 'hviezdu', g: 'f', en: 'star', es: 'estrella', eg: 'f' },
    { id: 'heart', sk: 'srdce', skAcc: 'srdce', g: 'n', en: 'heart', es: 'corazón', eg: 'm' },
    { id: 'diamond', sk: 'kosoštvorec', skAcc: 'kosoštvorec', g: 'm', en: 'diamond', es: 'rombo', eg: 'm' },
    { id: 'oval', sk: 'ovál', skAcc: 'ovál', g: 'm', en: 'oval', es: 'óvalo', eg: 'm' }
  ];
  const shapeById = id => SHAPES.find(s => s.id === id);
  SHAPES.forEach(s => { [s.cs, s.csAcc] = CS_SHAPE[s.id]; });
  const adjAcc = (c, s) => adj(c, s.g === 'm' ? 'm' : s.g === 'f' ? 'accF' : 'n');
  // "modrá hviezda" / "blue star" (nominative)
  const ART = { m: 'el', f: 'la', mp: 'los', fp: 'las' }, UN = { m: 'un', f: 'una', mp: 'unos', fp: 'unas' };
  const esNoun = (c, noun, g, art) => `${(art || ART)[g]} ${noun} ${c.es[g]}`; // "la estrella azul"
  const colShape = (lang, c, s) => T(lang, `${adj(c, s.g)} ${s.sk}`, `${c.en} ${s.en}`, esNoun(c, s.es, s.eg), `${adjC(c, s.g)} ${s.cs}`);
  const colShapeAcc = (lang, c, s) => T(lang, `${adjAcc(c, s)} ${s.skAcc}`, `the ${c.en} ${s.en}`, esNoun(c, s.es, s.eg), `${adjAccC(c, s)} ${s.csAcc}`);

  const FACE_Y = { circle: 52, square: 52, triangle: 64, star: 52, heart: 44, diamond: 52, oval: 52 };
  function face(cy, scale) {
    const k = scale || 1, y = cy;
    return `<g class="face"><circle cx="${50 - 11 * k}" cy="${y}" r="${4.2 * k}" fill="#4a3a3a"/><circle cx="${50 + 11 * k}" cy="${y}" r="${4.2 * k}" fill="#4a3a3a"/>
      <circle cx="${49 - 11 * k}" cy="${y - 1.6 * k}" r="${1.5 * k}" fill="#fff"/><circle cx="${49 + 11 * k}" cy="${y - 1.6 * k}" r="${1.5 * k}" fill="#fff"/>
      <ellipse cx="${50 - 19 * k}" cy="${y + 6 * k}" rx="${4.5 * k}" ry="${2.8 * k}" fill="#ff7fa8" opacity=".55"/><ellipse cx="${50 + 19 * k}" cy="${y + 6 * k}" rx="${4.5 * k}" ry="${2.8 * k}" fill="#ff7fa8" opacity=".55"/>
      <path d="M${50 - 4 * k} ${y + 5 * k} Q50 ${y + 10 * k} ${50 + 4 * k} ${y + 5 * k}" fill="none" stroke="#4a3a3a" stroke-width="${2.2 * k}" stroke-linecap="round"/></g>`;
  }
  function shapeSVG(kind, fill, cls, noFace) {
    const st = `fill="${fill}" stroke="rgba(90,60,80,.22)" stroke-width="3.5" stroke-linejoin="round"`;
    let body = '';
    switch (kind) {
      case 'circle': body = `<circle cx="50" cy="50" r="40" ${st}/>`; break;
      case 'square': body = `<rect x="12" y="12" width="76" height="76" rx="14" ${st}/>`; break;
      case 'triangle': body = `<path d="M50 9 L92 88 L8 88 Z" ${st}/>`; break;
      case 'star': body = `<path d="M50 6 L62 37 L95 38 L69 58 L79 91 L50 72 L21 91 L31 58 L5 38 L38 37 Z" ${st}/>`; break;
      case 'heart': body = `<path d="M50 88 C10 60 4 34 22 20 C36 10 48 18 50 30 C52 18 64 10 78 20 C96 34 90 60 50 88 Z" ${st}/>`; break;
      case 'diamond': body = `<path d="M50 6 L90 50 L50 94 L10 50 Z" ${st}/>`; break;
      case 'oval': body = `<ellipse cx="50" cy="50" rx="45" ry="30" ${st}/>`; break;
    }
    const shine = `<ellipse cx="34" cy="30" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 34 30)"/>`;
    return `<svg class="${cls || 'shape'}" viewBox="0 0 100 100" aria-hidden="true">${body}${kind === 'triangle' || kind === 'star' || kind === 'diamond' ? '' : shine}${noFace ? '' : face(FACE_Y[kind], kind === 'star' || kind === 'diamond' ? .8 : 1)}</svg>`;
  }
  const emo = (e, cls) => `<span class="emo ${cls || ''}">${e}</span>`;
  const big = (txt, cls) => `<span class="bigtxt ${cls || ''}">${txt}</span>`;
  const listen = () => `<div class="listen">👂</div>`;

  // ---------- numbers ----------
  const NUM = {
    sk: ['nula', 'jeden', 'dva', 'tri', 'štyri', 'päť', 'šesť', 'sedem', 'osem', 'deväť', 'desať', 'jedenásť', 'dvanásť', 'trinásť', 'štrnásť', 'pätnásť', 'šestnásť', 'sedemnásť', 'osemnásť', 'devätnásť', 'dvadsať'],
    cs: ['nula', 'jedna', 'dva', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět', 'deset', 'jedenáct', 'dvanáct', 'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct', 'dvacet'],
    en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
    es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']
  };
  const num = (lang, n) => NUM[lang][n] != null ? NUM[lang][n] : String(n);
  // correct Slovak plural: 1 oriešok, 2–4 oriešky, 0/5+ orieškov
  const nutsW = (lang, n) => lang === 'cs' ? `${n === 1 ? 'jeden' : num('cs', n)} ${n === 1 ? 'oříšek' : n >= 2 && n <= 4 ? 'oříšky' : 'oříšků'}` : lang === 'sk'
    ? `${num('sk', n)} ${n === 1 ? 'oriešok' : n >= 2 && n <= 4 ? 'oriešky' : 'orieškov'}`
    : lang === 'es' ? (n === 1 ? 'una bellota' : `${num('es', n)} bellotas`)
    : `${num('en', n)} ${n === 1 ? 'nut' : 'nuts'}`;
  const numF = (lang, n) => lang === 'es' && n === 1 ? 'una' : num(lang, n);

  // ---------- picture names (for narration) ----------
  const CATS = [
    { sk: 'ovocie', es: 'las frutas', esAll: 'Casi todo aquí es fruta.', en: 'fruit', skAll: 'Skoro všetko tu je ovocie.', enAll: 'Almost everything here is fruit.',
      items: [['🍎', 'jablko', 'apple', 'la manzana'], ['🍐', 'hruška', 'pear', 'la pera'], ['🍌', 'banán', 'banana', 'el plátano'], ['🍇', 'hrozno', 'grapes', 'las uvas'], ['🍓', 'jahoda', 'strawberry', 'la fresa'], ['🍒', 'čerešne', 'cherries', 'las cerezas'], ['🍋', 'citrón', 'lemon', 'el limón'], ['🍉', 'melón', 'watermelon', 'la sandía']] },
    { sk: 'zvieratká', es: 'los animales', esAll: 'Casi todo aquí son animales.', en: 'animals', skAll: 'Skoro všetko tu sú zvieratká.', enAll: 'Almost everything here is an animal.',
      items: [['🐶', 'psík', 'dog', 'el perro'], ['🐱', 'mačka', 'cat', 'el gato'], ['🐭', 'myška', 'mouse', 'el ratón'], ['🐰', 'zajačik', 'bunny', 'el conejo'], ['🦊', 'líška', 'fox', 'el zorro'], ['🐻', 'medveď', 'bear', 'el oso'], ['🐷', 'prasiatko', 'pig', 'el cerdito'], ['🐮', 'kravička', 'cow', 'la vaca']] },
    { sk: 'vozidlá', es: 'los vehículos', esAll: 'Casi todo aquí son vehículos.', en: 'vehicles', skAll: 'Skoro všetko tu sú vozidlá.', enAll: 'Almost everything here is a vehicle.',
      items: [['🚗', 'auto', 'car', 'el auto'], ['🚌', 'autobus', 'bus', 'el autobús'], ['🚂', 'vlak', 'train', 'el tren'], ['✈️', 'lietadlo', 'airplane', 'el avión'], ['🚲', 'bicykel', 'bicycle', 'la bicicleta'], ['⛵', 'loďka', 'boat', 'el barco'], ['🚜', 'traktor', 'tractor', 'el tractor'], ['🚒', 'hasičské auto', 'fire engine', 'el camión de bomberos']] },
    { sk: 'oblečenie', es: 'la ropa', esAll: 'Casi todo aquí es ropa.', en: 'clothes', skAll: 'Skoro všetko tu je oblečenie.', enAll: 'Almost everything here is clothing.',
      items: [['👕', 'tričko', 'T-shirt', 'la camiseta'], ['👖', 'nohavice', 'trousers', 'el pantalón'], ['👗', 'šaty', 'dress', 'el vestido'], ['🧢', 'šiltovka', 'cap', 'la gorra'], ['🧦', 'ponožky', 'socks', 'los calcetines'], ['🧤', 'rukavice', 'gloves', 'los guantes'], ['👟', 'tenisky', 'sneakers', 'los tenis'], ['🧣', 'šál', 'scarf', 'la bufanda']] },
    { sk: 'kvety a stromy', es: 'las plantas', esAll: 'Casi todo aquí son plantas.', en: 'plants', skAll: 'Skoro všetko tu sú kvety a stromy.', enAll: 'Almost everything here is a plant.',
      items: [['🌸', 'kvietok', 'blossom', 'la flor'], ['🌻', 'slnečnica', 'sunflower', 'el girasol'], ['🌷', 'tulipán', 'tulip', 'el tulipán'], ['🌹', 'ruža', 'rose', 'la rosa'], ['🌳', 'strom', 'tree', 'el árbol'], ['🌵', 'kaktus', 'cactus', 'el cactus'], ['🌲', 'jedlička', 'fir tree', 'el pino'], ['🌼', 'margaréta', 'daisy', 'la margarita']] }
  ];

  // ---------- GAME 1: colors & shapes ----------
  function genColors(i, lang, r) {
    if (i < 8) { // same colour, 3 then 4 options, shapes vary from i>=4
      const n = i < 2 ? 3 : 4;
      const cols = sample(r, COLORS, n); const target = cols[0];
      const shp = shapeById(i < 4 ? 'circle' : pick(r, SHAPES).id);
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi rovnakú farbu.', 'Find the same color.', 'Busca el mismo color.', 'Najdi stejnou barvu.'),
        say: T(lang, `Nájdi rovnakú farbu. Hľadáme ${adj(target, 'accF')} farbu.`, `Find the same color. We are looking for ${target.en}.`, `Busca el mismo color. Buscamos el color ${target.es.m}.`, `Najdi stejnou barvu. Hledáme ${adjC(target, 'accF')} barvu.`),
        hint: T(lang, `Hľadáme ${adj(target, 'accF')} farbu.`, `Look for the color ${target.en}.`, `Buscamos el color ${target.es.m}.`, `Hledáme ${adjC(target, 'accF')} barvu.`),
        answer: T(lang, `${adj(target, 'f')} farba. ${cap(colShape(lang, target, shp))}.`, `${target.en}. The ${colShape(lang, target, shp)}.`, `El color ${target.es.m}. ${cap(colShape(lang, target, shp))}.`, `${adjC(target, 'f')} barva. ${cap(colShape(lang, target, shp))}.`),
        display: `<div class="blob" style="background:${target.hex}"></div>`,
        options: shuffle(r, cols.map((c, k) => ({ html: shapeSVG(shp.id, c.hex), ok: k === 0, say: colShape(lang, c, shp) })))
      };
    }
    if (i < 18) { // same shape, 4 then 5 options, incl. diamond & oval
      const n = i < 13 ? 4 : 5;
      const shs = sample(r, SHAPES, n); const target = shs[0];
      const cs = shs.map(() => pick(r, COLORS));
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi rovnaký tvar.', 'Find the same shape.', 'Busca la misma forma.', 'Najdi stejný tvar.'),
        say: T(lang, `Nájdi rovnaký tvar. Hľadáme ${target.skAcc}.`, `Find the same shape. We are looking for a ${target.en}.`, `Busca la misma forma. Buscamos ${ART[target.eg]} ${target.es}.`, `Najdi stejný tvar. Hledáme ${target.csAcc}.`),
        hint: T(lang, `Hľadáme ${target.skAcc}.`, `Look for the ${target.en}.`, `Buscamos ${ART[target.eg]} ${target.es}.`, `Hledáme ${target.csAcc}.`),
        answer: T(lang, `${cap(colShape(lang, cs[0], target))}. To je ${target.sk}.`, `The ${colShape(lang, cs[0], target)}. That is a ${target.en}.`, `${cap(colShape(lang, cs[0], target))}. Es ${UN[target.eg]} ${target.es}.`, `${cap(colShape(lang, cs[0], target))}. To je ${target.cs}.`),
        display: shapeSVG(target.id, '#e6dbe8', 'shape big'),
        options: shuffle(r, shs.map((s, k) => ({ html: shapeSVG(s.id, cs[k].hex), ok: k === 0, say: colShape(lang, cs[k], s) })))
      };
    }
    // both color and shape (look, then by ear only)
    const n = i < 26 ? 4 : i < 38 ? 5 : 6;
    const tc = pick(r, COLORS), ts = pick(r, SHAPES);
    const opts = [{ c: tc, s: ts }];
    const used = new Set([tc.id + ts.id]);
    const add = (c, s) => { if (!used.has(c.id + s.id)) { used.add(c.id + s.id); opts.push({ c, s }); } };
    add(pick(r, COLORS.filter(c => c !== tc)), ts);
    add(tc, pick(r, SHAPES.filter(s => s !== ts)));
    if (i >= 38) add(pick(r, COLORS.filter(c => c !== tc)), ts);
    while (opts.length < n) add(pick(r, COLORS), pick(r, SHAPES));
    const byVoice = i >= 30;
    return {
      kind: 'choose',
      prompt: byVoice ? T(lang, `Ťukni na ${colShapeAcc(lang, tc, ts)}.`, `Tap ${colShapeAcc(lang, tc, ts)}.`, `Toca ${colShapeAcc(lang, tc, ts)}.`, `Ťukni na ${colShapeAcc(lang, tc, ts)}.`)
        : T(lang, 'Nájdi rovnakú farbu aj tvar.', 'Find the same color and the same shape.', 'Busca el mismo color y la misma forma.', 'Najdi stejnou barvu i tvar.'),
      say: byVoice ? null : T(lang, `Nájdi rovnakú farbu aj tvar. Hľadáme ${colShapeAcc(lang, tc, ts)}.`, `Find the same color and shape. We are looking for ${colShapeAcc(lang, tc, ts)}.`, `Busca el mismo color y la misma forma. Buscamos ${colShapeAcc(lang, tc, ts)}.`, `Najdi stejnou barvu i tvar. Hledáme ${colShapeAcc(lang, tc, ts)}.`),
      hint: T(lang, `Hľadáme ${colShapeAcc(lang, tc, ts)}. Farba aj tvar musia sedieť.`, `Look for ${colShapeAcc(lang, tc, ts)}. Both the color and the shape must match.`, `Buscamos ${colShapeAcc(lang, tc, ts)}. El color y la forma tienen que coincidir.`, `Hledáme ${colShapeAcc(lang, tc, ts)}. Barva i tvar musí sedět.`),
      answer: T(lang, `${cap(colShape(lang, tc, ts))}.`, `The ${colShape(lang, tc, ts)}.`, `${cap(colShape(lang, tc, ts))}.`, `${cap(colShape(lang, tc, ts))}.`),
      display: byVoice ? listen() : shapeSVG(ts.id, tc.hex, 'shape big'),
      options: shuffle(r, opts.map((o, k) => ({ html: shapeSVG(o.s.id, o.c.hex), ok: k === 0, say: colShape(lang, o.c, o.s) })))
    };
  }

  // ---------- GAME 2: counting ----------
  const NUT = '🌰';
  function nuts(n, crossed) {
    let h = '<div class="nuts">';
    for (let k = 0; k < n; k++) h += `<span class="nut${crossed && k >= n - crossed ? ' gone' : ''}">${NUT}</span>` + ((k + 1) % 5 === 0 && k + 1 < n ? '<i class="br5"></i>' : '');
    return h + '</div>';
  }
  function numOpts(r, lang, ans, n, max) {
    const s = new Set([ans]);
    let guard = 0;
    while (s.size < n && guard++ < 200) { const v = ans + ri(r, -3, 3); if (v >= 0 && v <= max) s.add(v); }
    for (let v = 0; s.size < n; v++) s.add(v);
    return shuffle(r, [...s]).map(v => ({ html: big(v, 'num'), ok: v === ans, say: num(lang, v) }));
  }
  function genCount(i, lang, r) {
    if (i < 14 || (i >= 42 && i < 46)) {
      const n = i < 6 ? ri(r, 2, 6) : i < 14 ? ri(r, 5, 10) : ri(r, 11, 20);
      return {
        kind: 'choose', prompt: T(lang, 'Koľko je tu orieškov?', 'How many nuts are there?', '¿Cuántas bellotas hay?', 'Kolik je tu oříšků?'),
        hint: n > 10 ? T(lang, 'Najprv spočítaj jeden riadok: päť. Potom pokračuj: šesť, sedem…', 'Count one row first: five. Then go on: six, seven…', 'Primero cuenta una fila: cinco. Luego sigue: seis, siete…', 'Nejdřív spočítej jednu řadu: pět. Pak pokračuj: šest, sedm…')
          : T(lang, 'Spočítaj oriešky prstom: jeden, dva, tri…', 'Count the nuts with your finger: one, two, three…', 'Cuenta las bellotas con el dedo: uno, dos, tres…', 'Spočítej oříšky prstem: jeden, dva, tři…'),
        answer: T(lang, `${nutsW(lang, n)}.`, `${nutsW(lang, n)}.`, `${cap(nutsW(lang, n))}.`, `${nutsW(lang, n)}.`),
        display: nuts(n), options: numOpts(r, lang, n, 4, n > 10 ? 20 : 10)
      };
    }
    if (i < 20) {
      const n = [3, 5, 6, 7, 8, 10][i - 14];
      return {
        kind: 'give', n, prompt: T(lang, `Daj veveričke presne ${n} do košíka. Potom ťukni na fajku.`, `Put exactly ${n} nuts in the basket. Then tap the check mark.`, `Pon exactamente ${n} ${n === 1 ? 'bellota' : 'bellotas'} en la canasta. Luego toca la palomita.`, `Dej veverce přesně ${n} do košíku. Pak ťukni na fajfku.`),
        say: T(lang, `Daj veveričke presne ${nutsW(lang, n)} do košíka. Potom ťukni na fajku.`, `Put exactly ${nutsW(lang, n)} in the basket. Then tap the check mark.`, `Pon exactamente ${nutsW(lang, n)} en la canasta. Luego toca la palomita.`, `Dej veverce přesně ${nutsW(lang, n)} do košíku. Pak ťukni na fajfku.`),
        hint: T(lang, `Spočítaj oriešky v košíku. Potrebujeme ${nutsW(lang, n)}.`, `Count the nuts in the basket. We need ${nutsW(lang, n)}.`, `Cuenta las bellotas de la canasta. Necesitamos ${nutsW(lang, n)}.`, `Spočítej oříšky v košíku. Potřebujeme ${nutsW(lang, n)}.`),
        answer: T(lang, `${nutsW(lang, n)}.`, `${nutsW(lang, n)}.`, `${cap(nutsW(lang, n))}.`, `${nutsW(lang, n)}.`),
        display: big(n, 'num huge')
      };
    }
    if (i < 26) {
      let a = ri(r, 3, 10), b;
      b = i >= 23 ? a + (a < 10 && r() < 0.5 ? 1 : -1) : (a > 6 ? a - ri(r, 2, 3) : a + ri(r, 2, 3));
      const mx = Math.max(a, b), mn = Math.min(a, b);
      return {
        kind: 'choose', prompt: T(lang, 'Kde je viac orieškov?', 'Where are more nuts?', '¿Dónde hay más bellotas?', 'Kde je víc oříšků?'),
        hint: T(lang, 'Spočítaj obe kôpky. Ktorá má viac?', 'Count both piles. Which one has more?', 'Cuenta los dos montones. ¿Cuál tiene más?', 'Spočítej obě hromádky. Která má víc?'),
        answer: T(lang, `${cap(num(lang, mx))} je viac ako ${num(lang, mn)}.`, `${cap(num(lang, mx))} is more than ${num(lang, mn)}.`, `${cap(num(lang, mx))} es más que ${num(lang, mn)}.`, `${cap(num(lang, mx))} je víc než ${num(lang, mn)}.`),
        display: emo('🐿️'), options: shuffle(r, [{ html: nuts(a), ok: a > b, say: nutsW(lang, a) }, { html: nuts(b), ok: b > a, say: nutsW(lang, b) }]), wide: true
      };
    }
    const opWord = (plus) => plus ? T(lang, 'plus', 'plus', 'más', 'plus') : T(lang, 'mínus', 'minus', 'menos', 'mínus');
    if (i < 42) {
      let a, b, plus, max = i < 34 ? 10 : 20;
      plus = i < 34 ? i < 30 : r() < 0.5;
      if (plus) { a = ri(r, i < 34 ? 2 : 5, max - 2); b = ri(r, 1, Math.min(max - a, i < 34 ? 5 : 9)); }
      else { a = ri(r, i < 34 ? 4 : 10, max); b = ri(r, 1, Math.min(a - 1, i < 34 ? 5 : 9)); }
      const ans = plus ? a + b : a - b;
      const disp = plus ? `<div class="sum">${nuts(a)}<span class="op">+</span>${nuts(b)}</div>` : `<div class="sum">${nuts(a, b)}</div>`;
      return {
        kind: 'choose',
        prompt: T(lang, `Koľko je ${a} ${opWord(plus)} ${b}?`, `What is ${a} ${opWord(plus)} ${b}?`, `¿Cuánto es ${a} ${opWord(plus)} ${b}?`, `Kolik je ${a} ${opWord(plus)} ${b}?`),
        hint: plus ? T(lang, `Spočítaj všetky oriešky spolu.`, `Count all the nuts together.`, `Cuenta todas las bellotas juntas.`, `Spočítej všechny oříšky dohromady.`)
          : T(lang, `Veverička zjedla ${nutsW(lang, b)}. Spočítaj tie, čo zostali.`, `The squirrel ate ${nutsW(lang, b)}. Count the nuts that are left.`, `La ardilla se comió ${nutsW(lang, b)}. Cuenta las que quedan.`, `Veverka snědla ${nutsW(lang, b)}. Spočítej ty, které zbyly.`),
        answer: T(lang, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} je ${num(lang, ans)}.`, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} is ${num(lang, ans)}.`, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} es ${num(lang, ans)}.`, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} je ${num(lang, ans)}.`),
        display: disp + `<div class="eq">${a} ${plus ? '+' : '−'} ${b} = ?</div>`,
        options: numOpts(r, lang, ans, 4, max)
      };
    }
    // two-step story: a, found b, ate c
    const a = ri(r, 3, 8), b = ri(r, 2, 6), c = ri(r, 1, Math.min(5, a + b - 1)), ans = a + b - c;
    return {
      kind: 'choose',
      prompt: T(lang, `Veverička mala ${a}. Našla ešte ${b}. Potom ${c} zjedla. Koľko jej zostalo?`, `The squirrel had ${a} nuts. She found ${b} more. Then she ate ${c}. How many are left?`, `La ardilla tenía ${a} bellotas. Encontró ${b} más. Luego se comió ${c}. ¿Cuántas le quedan?`, `Veverka měla ${a}. Našla ještě ${b}. Pak ${c} snědla. Kolik jí zbylo?`),
      say: T(lang, `Veverička mala ${nutsW(lang, a)}. Našla ešte ${num(lang, b)}. Potom ${num(lang, c)} zjedla. Koľko orieškov jej zostalo?`, `The squirrel had ${nutsW(lang, a)}. She found ${num(lang, b)} more. Then she ate ${num(lang, c)}. How many nuts are left?`, `La ardilla tenía ${nutsW(lang, a)}. Encontró ${numF(lang, b)} más. Luego se comió ${numF(lang, c)}. ¿Cuántas bellotas le quedan?`, `Veverka měla ${nutsW(lang, a)}. Našla ještě ${csNum(b, 'm')}. Pak ${csNum(c, 'm')} snědla. Kolik oříšků jí zbylo?`),
      hint: T(lang, `Najprv ${a} plus ${b}. Potom odober ${c}.`, `First ${a} plus ${b}. Then take away ${c}.`, `Primero ${a} más ${b}. Luego quita ${c}.`, `Nejdřív ${a} plus ${b}. Pak uber ${c}.`),
      answer: T(lang, `${cap(num(lang, a))} plus ${num(lang, b)} je ${num(lang, a + b)}, mínus ${num(lang, c)} je ${num(lang, ans)}.`, `${cap(num(lang, a))} plus ${num(lang, b)} is ${num(lang, a + b)}, minus ${num(lang, c)} is ${num(lang, ans)}.`, `${cap(num(lang, a))} más ${num(lang, b)} es ${num(lang, a + b)}, menos ${num(lang, c)} es ${num(lang, ans)}.`, `${cap(num(lang, a))} plus ${num(lang, b)} je ${num(lang, a + b)}, mínus ${num(lang, c)} je ${num(lang, ans)}.`),
      display: `<div class="sum">${nuts(a)}<span class="op">+</span>${nuts(b)}</div><div class="eq">${a} + ${b} − ${c} = ?</div>`,
      options: numOpts(r, lang, ans, 4, 20)
    };
  }

  // ---------- GAME 3: letters ----------
  const LET = {
    sk: { easy: 'A E I O U M L S P T K V D R N B J Z H C'.split(' '), hard: 'Č Š Ž Á É Í Ó Ú Ď Ť Ň Ľ Ä Ô Y Ý F G'.split(' ') },
    en: { easy: 'A E I O U M L S P T K V D R N B J Z H C'.split(' '), hard: 'F G Q W X Y'.split(' ') },
    es: { easy: 'A E I O U M L S P T N D R B C F'.split(' '), hard: 'Ñ G J V Z Q K H Y X W'.split(' ') }
  };
  // Spanish letters that sound alike at the start of a word must never compete with each other
  const SAME_ES = [['C', 'K', 'Q', 'S', 'Z', 'X'], ['B', 'V'], ['G', 'J'], ['I', 'Y', 'H', 'A', 'E', 'O', 'U']];
  const SAME_CS = [['I', 'Y'], ['Í', 'Ý'], ['Ú', 'Ů'], ['Ě', 'E']];
  const conf = (lang, a, b) => a === b || (lang === 'es' && SAME_ES.some(g => g.includes(a) && g.includes(b))) || (lang === 'cs' && SAME_CS.some(g => g.includes(a) && g.includes(b)));
  const FIRST = {
    sk: [['🐟', 'RYBA'], ['🍎', 'JABLKO'], ['🐱', 'MAČKA'], ['🏠', 'DOM'], ['🐶', 'PES'], ['☀️', 'SLNKO'], ['🦉', 'SOVA'], ['🚗', 'AUTO'], ['🍌', 'BANÁN'], ['🦊', 'LÍŠKA'],
      ['🐝', 'VČELA'], ['⭐', 'HVIEZDA'], ['🍋', 'CITRÓN'], ['🐢', 'KORYTNAČKA'], ['🎈', 'BALÓN'], ['🌷', 'TULIPÁN'], ['🐸', 'ŽABA'], ['🐑', 'OVCA'], ['🦁', 'LEV'], ['🚂', 'VLAK'],
      ['🐘', 'SLON'], ['🌙', 'MESIAC'], ['🐍', 'HAD'], ['🌹', 'RUŽA'], ['🍉', 'MELÓN'], ['🐐', 'KOZA'], ['🧀', 'SYR'], ['👑', 'KORUNA'], ['🐭', 'MYŠ'], ['🌳', 'STROM'],
      ['🍇', 'HROZNO'], ['🦆', 'KAČKA'], ['🐞', 'LIENKA'], ['🍓', 'JAHODA'], ['🎁', 'DARČEK'], ['🦒', 'ŽIRAFA'], ['🐔', 'SLIEPKA'], ['🧁', 'MUFFIN'], ['🚀', 'RAKETA'], ['🍕', 'PIZZA']],
    en: [['🐟', 'FISH'], ['🍎', 'APPLE'], ['🐱', 'CAT'], ['🏠', 'HOUSE'], ['🐶', 'DOG'], ['☀️', 'SUN'], ['🦉', 'OWL'], ['🚗', 'CAR'], ['🍌', 'BANANA'], ['🦊', 'FOX'],
      ['🐝', 'BEE'], ['⭐', 'STAR'], ['🍋', 'LEMON'], ['🐢', 'TURTLE'], ['🎈', 'BALLOON'], ['🌷', 'TULIP'], ['🐸', 'FROG'], ['🐑', 'SHEEP'], ['🦁', 'LION'], ['🚂', 'TRAIN'],
      ['🐘', 'ELEPHANT'], ['🌙', 'MOON'], ['🐍', 'SNAKE'], ['🌹', 'ROSE'], ['🍉', 'MELON'], ['🐐', 'GOAT'], ['🧀', 'CHEESE'], ['👑', 'CROWN'], ['🐭', 'MOUSE'], ['🌳', 'TREE'],
      ['🍇', 'GRAPES'], ['🦆', 'DUCK'], ['🐞', 'LADYBUG'], ['🍓', 'STRAWBERRY'], ['🎁', 'GIFT'], ['🦒', 'GIRAFFE'], ['🐔', 'HEN'], ['🧁', 'MUFFIN'], ['🚀', 'ROCKET'], ['🍕', 'PIZZA']],
    es: [['🐟', 'PEZ'], ['🍎', 'MANZANA'], ['🐱', 'GATO'], ['🏠', 'CASA'], ['🐶', 'PERRO'], ['☀️', 'SOL'], ['🦉', 'BÚHO'], ['🚗', 'AUTO'], ['🍌', 'PLÁTANO'], ['🦊', 'ZORRO'],
      ['🐝', 'ABEJA'], ['⭐', 'ESTRELLA'], ['🍋', 'LIMÓN'], ['🐢', 'TORTUGA'], ['🎈', 'GLOBO'], ['🌷', 'TULIPÁN'], ['🐸', 'RANA'], ['🐑', 'OVEJA'], ['🦁', 'LEÓN'], ['🚂', 'TREN'],
      ['🐘', 'ELEFANTE'], ['🌙', 'LUNA'], ['🐍', 'SERPIENTE'], ['🌹', 'ROSA'], ['🍉', 'SANDÍA'], ['🐐', 'CABRA'], ['🧀', 'QUESO'], ['👑', 'CORONA'], ['🐭', 'RATÓN'], ['☁️', 'NUBE'],
      ['🍇', 'UVAS'], ['🦆', 'PATO'], ['🐞', 'MARIQUITA'], ['🍓', 'FRESA'], ['🎁', 'REGALO'], ['🦒', 'JIRAFA'], ['🐔', 'GALLINA'], ['🐮', 'VACA'], ['🚀', 'COHETE'], ['🦷', 'DIENTE']]
  };
  const EX_ES = { A: 'abeja', B: 'ballena', C: 'casa', D: 'dedo', E: 'estrella', F: 'foca', G: 'gato', H: 'helado', I: 'iglú', J: 'jirafa', K: 'kiwi', L: 'luna', M: 'mamá', N: 'nube',
    Ñ: 'ñu', O: 'oso', P: 'pato', Q: 'queso', R: 'ratón', S: 'sol', T: 'tortuga', U: 'uvas', V: 'vaca', W: 'wafle', X: 'xilófono', Y: 'yoyó', Z: 'zapato' };
  // example word for each letter ("písmeno M, ako mačka")
  function exampleFor(lang, L) {
    if (lang === 'es') return EX_ES[L] || null;
    const f = FIRST[lang].find(x => x[1][0] === L) || WORDS[lang].find(x => x[1][0] === L);
    return f ? f[1].toLowerCase() : null;
  }
  const letterName = (lang, L, lower) => T(lang, `${lower ? 'malé' : 'písmeno'} ${lower ? L.toLowerCase() : L}`, `${lower ? 'small' : 'the letter'} ${lower ? L.toLowerCase() : L}`, lower ? `la ${L.toLowerCase()} minúscula` : `la letra ${L}`, `${lower ? 'malé' : 'písmeno'} ${lower ? L.toLowerCase() : L}`);
  const letterTeach = (lang, L) => { const w = exampleFor(lang, L); return T(lang, `Písmeno ${L}${w ? ', ako ' + w : ''}.`, `The letter ${L}${w ? ', as in ' + w : ''}.`, `La letra ${L}${w ? ', de ' + w : ''}.`, `Písmeno ${L}${w ? ', jako ' + w : ''}.`); };
  function letterOpts(r, lang, target, pool, n, lower) {
    const others = sample(r, pool.filter(l => l !== target), n - 1);
    return shuffle(r, [target, ...others]).map(l => ({ html: big(lower ? l.toLowerCase() : l, 'let'), ok: l === target, say: letterName(lang, l, lower) }));
  }
  function genLetters(i, lang, r) {
    const L = LET[lang]; const all = L.easy.concat(L.hard);
    if (i < 18) {
      const voice = i >= 8; const pool = i < 13 ? L.easy : all;
      const t = i >= 13 && r() < 0.4 ? pick(r, L.hard) : pick(r, L.easy);
      return {
        kind: 'choose',
        prompt: voice ? T(lang, `Ťukni na písmeno ${t}.`, `Tap the letter ${t}.`, `Toca la letra ${t}.`, `Ťukni na písmeno ${t}.`) : T(lang, 'Nájdi rovnaké písmeno.', 'Find the same letter.', 'Busca la misma letra.', 'Najdi stejné písmeno.'),
        say: voice ? letterTeach(lang, t).replace(/^/, T(lang, 'Ťukni na písmeno ' + t + '. ', 'Tap the letter ' + t + '. ', 'Toca la letra ' + t + '. ', 'Ťukni na písmeno ' + t + '. ')) : T(lang, `Nájdi rovnaké písmeno. ${letterTeach(lang, t)}`, `Find the same letter. ${letterTeach(lang, t)}`, `Busca la misma letra. ${letterTeach(lang, t)}`, `Najdi stejné písmeno. ${letterTeach(lang, t)}`),
        hint: T(lang, `Pozri sa pozorne. Hľadáme písmeno ${t}.`, `Look carefully. We are looking for the letter ${t}.`, `Mira bien. Buscamos la letra ${t}.`, `Podívej se pozorně. Hledáme písmeno ${t}.`),
        answer: letterTeach(lang, t),
        hintShow: big(t, 'let'),
        display: voice ? listen() : big(t, 'let huge'),
        options: letterOpts(r, lang, t, pool, i < 2 ? 3 : i < 13 ? 4 : 5, false)
      };
    }
    if (i < 30) {
      const hardMix = i >= 22; const pool = hardMix ? all : L.easy;
      const t = hardMix ? pick(r, i % 2 ? L.hard : L.easy) : pick(r, L.easy);
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi malé písmeno k veľkému.', 'Find the small letter for the big one.', 'Busca la minúscula de esta mayúscula.', 'Najdi malé písmeno k velkému.'),
        say: T(lang, `Nájdi malé písmeno ${t}.`, `Find the small letter ${t}.`, `Busca la ${t.toLowerCase()} minúscula.`, `Najdi malé písmeno ${t}.`),
        hint: T(lang, `Veľké ${t} a malé ${t.toLowerCase()} sú to isté písmeno.`, `Big ${t} and small ${t.toLowerCase()} are the same letter.`, `La ${t} mayúscula y la ${t.toLowerCase()} minúscula son la misma letra.`, `Velké ${t} a malé ${t.toLowerCase()} jsou stejné písmeno.`),
        answer: T(lang, `Veľké ${t} a malé ${t.toLowerCase()}.`, `Big ${t} and small ${t.toLowerCase()}.`, `La ${t} mayúscula y la ${t.toLowerCase()} minúscula.`, `Velké ${t} a malé ${t.toLowerCase()}.`),
        hintShow: big(t + ' ' + t.toLowerCase(), 'let'),
        display: big(t, 'let huge'), options: letterOpts(r, lang, t, pool, i < 26 ? 4 : 5, true)
      };
    }
    const list = FIRST[lang];
    if (i < 42) {
      const [e, w] = list[(i - 30 + Math.floor(r() * 3) * 12) % list.length];
      const t = w[0];
      const pool = all.filter(l => !conf(lang, l, t));
      const wl = w.toLowerCase();
      return {
        kind: 'choose', prompt: T(lang, 'Akým písmenom sa začína toto slovo?', 'Which letter does this word start with?', '¿Con qué letra empieza esta palabra?', 'Jakým písmenem začíná toto slovo?'),
        say: T(lang, `Akým písmenom sa začína slovo ${wl}?`, `Which letter does the word ${wl} start with?`, `¿Con qué letra empieza la palabra ${wl}?`, `Jakým písmenem začíná slovo ${wl}?`),
        hint: T(lang, `Počúvaj: ${t}… ${wl}.`, `Listen: ${t}… ${wl}.`, `Escucha: ${t}… ${wl}.`, `Poslouchej: ${t}… ${wl}.`),
        answer: T(lang, `${cap(wl)} sa začína na ${t}.`, `${cap(wl)} starts with ${t}.`, `${cap(wl)} empieza con ${t}.`, `${cap(wl)} začíná na ${t}.`),
        hintShow: big(t, 'let'),
        display: `<button class="word picword" data-say="${wl}">${e}</button>`, options: letterOpts(r, lang, t, [t, ...pool], 4, false)
      };
    }
    // reverse, harder: which picture starts with letter X? (4 pictures, distinct first letters)
    const base = list[(i * 7 + Math.floor(r() * list.length)) % list.length];
    const t = base[1][0];
    const others = sample(r, list.filter(x => !conf(lang, x[1][0], t)), 12);
    const picks = [base]; const seen = new Set([t]);
    for (const o of others) { if (picks.length >= 4) break; if (![...seen].some(l => conf(lang, l, o[1][0]))) { seen.add(o[1][0]); picks.push(o); } }
    return {
      kind: 'choose', prompt: T(lang, `Ktorý obrázok sa začína na písmeno ${t}?`, `Which picture starts with the letter ${t}?`, `¿Qué dibujo empieza con la letra ${t}?`, `Který obrázek začíná na písmeno ${t}?`),
      hint: T(lang, `Povedz si každý obrázok nahlas. Ktorý znie na začiatku ${t}?`, `Say each picture out loud. Which one starts with the sound ${t}?`, `Di cada dibujo en voz alta. ¿Cuál empieza con ${t}?`, `Řekni každý obrázek nahlas. Který zní na začátku ${t}?`),
      answer: T(lang, `${cap(base[1].toLowerCase())} sa začína na ${t}.`, `${cap(base[1].toLowerCase())} starts with ${t}.`, `${cap(base[1].toLowerCase())} empieza con ${t}.`, `${cap(base[1].toLowerCase())} začíná na ${t}.`),
      hintShow: big(t, 'let'), display: big(t, 'let huge'),
      options: shuffle(r, picks.map(p => ({ html: emo(p[0]), ok: p === base, say: p[1].toLowerCase() })))
    };
  }

  // ---------- GAME 4: first words ----------
  const WORDS = {
    sk: [['🏠', 'DOM'], ['🐶', 'PES'], ['🦁', 'LEV'], ['👁️', 'OKO'], ['👃', 'NOS'], ['🧀', 'SYR'], ['🐍', 'HAD'], ['🐴', 'KÔŇ'], ['🌲', 'LES'], ['🐭', 'MYŠ'], ['🦷', 'ZUB'], ['⛵', 'LOĎ'],
      ['👩', 'MAMA'], ['👨', 'TATO'], ['🚗', 'AUTO'], ['🐟', 'RYBA'], ['🦉', 'SOVA'], ['🐐', 'KOZA'], ['🚂', 'VLAK'], ['🐘', 'SLON'], ['✋', 'RUKA'], ['🦶', 'NOHA'], ['👂', 'UCHO'], ['🌸', 'KVET'], ['🌈', 'DÚHA'], ['🐑', 'OVCA'], ['🐸', 'ŽABA'],
      ['⚽', 'LOPTA'], ['🐱', 'MAČKA'], ['☀️', 'SLNKO'], ['🦆', 'KAČKA'], ['🌳', 'STROM'], ['📖', 'KNIHA'], ['🎂', 'TORTA'], ['👵', 'BABKA'], ['🍌', 'BANÁN'], ['☁️', 'OBLAK'], ['🦋', 'MOTÝĽ'], ['🐓', 'KOHÚT'],
      ['🍐', 'HRUŠKA'], ['🐻', 'MEDVEĎ'], ['🍎', 'JABLKO'], ['🌙', 'MESIAC'], ['🍋', 'CITRÓN'], ['👑', 'KORUNA'], ['⭐', 'HVIEZDA'], ['🚲', 'BICYKEL'], ['☂️', 'DÁŽDNIK'], ['🦜', 'PAPAGÁJ'], ['🍦', 'ZMRZLINA'], ['✈️', 'LIETADLO'],
      ['🌻', 'SLNEČNICA'], ['🐿️', 'VEVERIČKA'], ['🍫', 'ČOKOLÁDA'], ['🦎', 'JAŠTERICA'], ['🐢', 'KORYTNAČKA']],
    en: [['🐂', 'OX'], ['🐱', 'CAT'], ['🐶', 'DOG'], ['☀️', 'SUN'], ['🐷', 'PIG'], ['🐝', 'BEE'], ['🥚', 'EGG'], ['🚌', 'BUS'], ['🚗', 'CAR'], ['🎩', 'HAT'], ['🦊', 'FOX'], ['🦉', 'OWL'], ['🐮', 'COW'], ['🛏️', 'BED'], ['🔑', 'KEY'], ['👩', 'MOM'], ['👨', 'DAD'],
      ['🐟', 'FISH'], ['🐻', 'BEAR'], ['🐸', 'FROG'], ['🦆', 'DUCK'], ['🌳', 'TREE'], ['⭐', 'STAR'], ['🌙', 'MOON'], ['📖', 'BOOK'], ['🎂', 'CAKE'], ['⚽', 'BALL'], ['🦁', 'LION'], ['✋', 'HAND'], ['⛵', 'BOAT'], ['🍐', 'PEAR'],
      ['🍎', 'APPLE'], ['🏠', 'HOUSE'], ['🐴', 'HORSE'], ['🐑', 'SHEEP'], ['🐍', 'SNAKE'], ['🚂', 'TRAIN'], ['🐭', 'MOUSE'], ['🍋', 'LEMON'], ['☁️', 'CLOUD'], ['👑', 'CROWN'],
      ['🍌', 'BANANA'], ['🐰', 'RABBIT'], ['🐢', 'TURTLE'], ['🌸', 'FLOWER'], ['🦜', 'PARROT'], ['🌈', 'RAINBOW'], ['🚲', 'BICYCLE'], ['🐘', 'ELEPHANT'], ['☂️', 'UMBRELLA'], ['✈️', 'AIRPLANE'],
      ['🐿️', 'SQUIRREL'], ['🌻', 'SUNFLOWER'], ['🦋', 'BUTTERFLY'], ['🍫', 'CHOCOLATE'], ['🍓', 'STRAWBERRY']],
    es: [['☀️', 'SOL'], ['🍞', 'PAN'], ['🐻', 'OSO'], ['🐟', 'PEZ'], ['👁️', 'OJO'], ['🌊', 'MAR'], ['💡', 'LUZ'], ['🦶', 'PIE'], ['🤴', 'REY'],
      ['🌙', 'LUNA'], ['👩', 'MAMÁ'], ['👨', 'PAPÁ'], ['🏠', 'CASA'], ['🐱', 'GATO'], ['🦆', 'PATO'], ['🐮', 'VACA'], ['✋', 'MANO'], ['☁️', 'NUBE'], ['🌹', 'ROSA'], ['🐸', 'RANA'], ['🚂', 'TREN'], ['🦁', 'LEÓN'], ['🍐', 'PERA'], ['🦜', 'LORO'], ['🍇', 'UVAS'],
      ['🐶', 'PERRO'], ['📖', 'LIBRO'], ['🍓', 'FRESA'], ['🦊', 'ZORRO'], ['🐝', 'ABEJA'], ['🐑', 'OVEJA'], ['🍋', 'LIMÓN'], ['🎈', 'GLOBO'], ['🧀', 'QUESO'], ['⛵', 'BARCO'], ['✈️', 'AVIÓN'], ['🐭', 'RATÓN'],
      ['⚽', 'PELOTA'], ['🐰', 'CONEJO'], ['👑', 'CORONA'], ['🎂', 'PASTEL'], ['🚀', 'COHETE'], ['🦒', 'JIRAFA'], ['🍦', 'HELADO'], ['🐴', 'CABALLO'], ['🐢', 'TORTUGA'], ['🌻', 'GIRASOL'],
      ['⭐', 'ESTRELLA'], ['🍎', 'MANZANA'], ['🍌', 'PLÁTANO'], ['🐿️', 'ARDILLA'], ['☂️', 'PARAGUAS'], ['🦋', 'MARIPOSA'], ['🐘', 'ELEFANTE'], ['🚲', 'BICICLETA'], ['🍫', 'CHOCOLATE']]
  };
  // ---------- syllables (checked by hand; first-grade style) ----------
  const SYL = {
    sk: { OKO: 'o-ko', MAMA: 'ma-ma', TATO: 'ta-to', AUTO: 'au-to', RYBA: 'ry-ba', SOVA: 'so-va', KOZA: 'ko-za', RUKA: 'ru-ka', NOHA: 'no-ha', UCHO: 'u-cho', DÚHA: 'dú-ha', OVCA: 'ov-ca', ŽABA: 'ža-ba',
      LOPTA: 'lop-ta', MAČKA: 'mač-ka', SLNKO: 'sln-ko', KAČKA: 'kač-ka', KNIHA: 'kni-ha', TORTA: 'tor-ta', BABKA: 'bab-ka', BANÁN: 'ba-nán', OBLAK: 'ob-lak', MOTÝĽ: 'mo-týľ', KOHÚT: 'ko-hút',
      HRUŠKA: 'hruš-ka', MEDVEĎ: 'med-veď', JABLKO: 'jab-lko', MESIAC: 'me-siac', CITRÓN: 'cit-rón', KORUNA: 'ko-ru-na', HVIEZDA: 'hviez-da', BICYKEL: 'bi-cy-kel', DÁŽDNIK: 'dážd-nik', PAPAGÁJ: 'pa-pa-gáj',
      ZMRZLINA: 'zmrz-li-na', LIETADLO: 'lie-tad-lo', SLNEČNICA: 'sl-neč-ni-ca', VEVERIČKA: 've-ve-rič-ka', ČOKOLÁDA: 'čo-ko-lá-da', JAŠTERICA: 'jaš-te-ri-ca', KORYTNAČKA: 'ko-ryt-nač-ka' },
    en: { LION: 'li-on', APPLE: 'ap-ple', LEMON: 'lem-on', BANANA: 'ba-na-na', RABBIT: 'rab-bit', TURTLE: 'tur-tle', FLOWER: 'flow-er', PARROT: 'par-rot', RAINBOW: 'rain-bow', BICYCLE: 'bi-cy-cle',
      ELEPHANT: 'el-e-phant', UMBRELLA: 'um-brel-la', AIRPLANE: 'air-plane', SQUIRREL: 'squir-rel', SUNFLOWER: 'sun-flow-er', BUTTERFLY: 'but-ter-fly', CHOCOLATE: 'choc-o-late', STRAWBERRY: 'straw-ber-ry' },
    es: { OSO: 'o-so', OJO: 'o-jo', LUNA: 'lu-na', MAMÁ: 'ma-má', PAPÁ: 'pa-pá', CASA: 'ca-sa', GATO: 'ga-to', PATO: 'pa-to', VACA: 'va-ca', MANO: 'ma-no', NUBE: 'nu-be', ROSA: 'ro-sa', RANA: 'ra-na',
      LEÓN: 'le-ón', PERA: 'pe-ra', LORO: 'lo-ro', UVAS: 'u-vas', PERRO: 'pe-rro', LIBRO: 'li-bro', FRESA: 'fre-sa', ZORRO: 'zo-rro', ABEJA: 'a-be-ja', OVEJA: 'o-ve-ja', LIMÓN: 'li-món', GLOBO: 'glo-bo',
      QUESO: 'que-so', BARCO: 'bar-co', AVIÓN: 'a-vión', RATÓN: 'ra-tón', PELOTA: 'pe-lo-ta', CONEJO: 'co-ne-jo', CORONA: 'co-ro-na', PASTEL: 'pas-tel', COHETE: 'co-he-te', JIRAFA: 'ji-ra-fa', HELADO: 'he-la-do',
      CABALLO: 'ca-ba-llo', TORTUGA: 'tor-tu-ga', GIRASOL: 'gi-ra-sol', ESTRELLA: 'es-tre-lla', MANZANA: 'man-za-na', PLÁTANO: 'plá-ta-no', ARDILLA: 'ar-di-lla', PARAGUAS: 'pa-ra-guas', MARIPOSA: 'ma-ri-po-sa',
      ELEFANTE: 'e-le-fan-te', BICICLETA: 'bi-ci-cle-ta', CHOCOLATE: 'cho-co-la-te' }
  };
  const sylOf = (lang, w) => (SYL[lang][w] || w.toLowerCase()).split('-');
  const sylClip = x => ({ key: '@syl:' + x, alt: x });
  // "Mama. Ma – ma. Mama." (text) + speech parts with one clip per syllable
  function sylSay(lang, w, head) {
    const wl = cap(w.toLowerCase()), sy = sylOf(lang, w);
    if (sy.length < 2) return { text: (head ? head + ' ' : '') + wl + '.', parts: [head, wl + '.'].filter(Boolean) };
    return { text: `${head ? head + ' ' : wl + '. '}${cap(sy.join(' – '))}. ${wl}.`, parts: [head || wl + '.', ...sy.map(sylClip), wl + '.'] };
  }
  function genWords(i, lang, r) {
    const W = WORDS[lang];
    // start a bit further into the list (skip the most trivial words), end with the longest ones
    const idx = Math.min(W.length - 1, Math.floor((i + 6) * W.length / (TASKS_PER_GAME + 6)));
    const [e, w] = W[idx];
    const wl = w.toLowerCase();
    const n = i < 3 ? 3 : i < 40 ? 4 : 5;
    if (i < 28) {
      const multi = sylOf(lang, w).length > 1;
      const hs = sylSay(lang, w, multi ? T(lang, 'Ťukni na slovo. Počúvaj po slabikách:', 'Tap the word. Listen to the syllables:', 'Toca la palabra. Escucha las sílabas:', 'Ťukni na slovo. Poslouchej po slabikách:')
        : T(lang, 'Ťukni na slovo a počúvaj:', 'Tap the word and listen:', 'Toca la palabra y escucha:', 'Ťukni na slovo a poslouchej:'));
      const as = sylSay(lang, w);
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      return {
        kind: 'choose', prompt: T(lang, 'Prečítaj slovo a nájdi obrázok.', 'Read the word and find the picture.', 'Lee la palabra y busca el dibujo.', 'Přečti slovo a najdi obrázek.'),
        say: T(lang, 'Prečítaj slovo a nájdi obrázok. Ťukni na slovo a vypočuješ si ho.', 'Read the word and find the picture. Tap the word to hear it.', 'Lee la palabra y busca el dibujo. Toca la palabra para escucharla.', 'Přečti slovo a najdi obrázek. Ťukni na slovo a uslyšíš ho.'),
        hint: hs.text, hintParts: hs.parts, answer: as.text, answerParts: as.parts,
        display: `<button class="word" data-say="${wl}">${w}</button>`,
        options: shuffle(r, [[e, w], ...others].map(([ee, ww]) => ({ html: emo(ee), ok: ee === e, say: ww.toLowerCase() })))
      };
    }
    // picture -> word; distractors are similar length / same first letter when possible
    const near = W.filter(x => x[1] !== w).sort((a, b) => {
      const sa = Math.abs(a[1].length - w.length) - (a[1][0] === w[0] ? 2 : 0), sb = Math.abs(b[1].length - w.length) - (b[1][0] === w[0] ? 2 : 0);
      return sa - sb || (r() - 0.5);
    });
    const others = sample(r, near.slice(0, 8), n - 1);
    return {
      kind: 'choose', prompt: T(lang, 'Ktoré slovo patrí k obrázku?', 'Which word goes with the picture?', '¿Qué palabra va con el dibujo?', 'Které slovo patří k obrázku?'),
      hint: T(lang, `Hľadáme slovo ${wl}. Začína sa na ${w[0]}.`, `We need the word ${wl}. It starts with ${w[0]}.`, `Buscamos la palabra ${wl}. Empieza con ${w[0]}.`, `Hledáme slovo ${wl}. Začíná na ${w[0]}.`),
      answer: T(lang, `${cap(wl)}.`, `${cap(wl)}.`, undefined, `${cap(wl)}.`),
      display: emo(e, 'huge'),
      options: shuffle(r, [[e, w], ...others].map(([, ww]) => ({ html: big(ww, 'wordopt'), ok: ww === w, say: ww.toLowerCase() }))), wide: true
    };
  }

  // ---------- GAME 5: riddles ----------
  const HOUSE_ANIMALS = [{ e: '🐰', sk: 'Zajačik', poss: 'jeho', en: 'The bunny', es: 'El conejito' }, { e: '🦔', sk: 'Ježko', poss: 'jeho', en: 'The hedgehog', es: 'El erizo' }, { e: '🐭', sk: 'Myška', poss: 'jej', en: 'The mouse', es: 'La ratoncita' }, { e: '🐱', sk: 'Mačička', poss: 'jej', en: 'The kitty', es: 'La gatita' }];
  const vIn = w => (/^[fv]/i.test(w) ? 'vo ' : 'v ') + w; // Slovak: vo fialovom, v modrom
  function houseSVG(hex, deco) {
    return `<div class="house">${deco === 'tree' ? '<span class="deco">🌳</span>' : deco === 'flower' ? '<span class="deco">🌻</span>' : ''}<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M8 46 Q50 4 92 46 Z" fill="#e8a7a0" stroke="rgba(90,60,80,.2)" stroke-width="3" stroke-linejoin="round"/>
      <rect x="18" y="44" width="64" height="48" rx="10" fill="${hex}" stroke="rgba(90,60,80,.2)" stroke-width="3"/>
      <rect x="42" y="64" width="17" height="28" rx="8" fill="#a77e68"/><circle cx="30" cy="60" r="7" fill="#fffaf0"/><circle cx="70" cy="60" r="7" fill="#fffaf0"/>
      <ellipse cx="27" cy="74" rx="4" ry="2.5" fill="#ff7fa8" opacity=".5"/><ellipse cx="73" cy="74" rx="4" ry="2.5" fill="#ff7fa8" opacity=".5"/></svg></div>`;
  }
  const houseName = (lang, c, deco) => T(lang, `${adj(c, 'm')} domček${deco === 'tree' ? ' so stromom' : deco === 'flower' ? ' so slnečnicou' : ''}`,
    `the ${c.en} house${deco === 'tree' ? ' with a tree' : deco === 'flower' ? ' with a sunflower' : ''}`,
    `la casita ${c.es.f}${deco === 'tree' ? ' con árbol' : deco === 'flower' ? ' con girasol' : ''}`, `${adjC(c, 'm')} domeček${deco === 'tree' ? ' se stromem' : deco === 'flower' ? ' se slunečnicí' : ''}`);
  const livesIn = (lang, who, c) => T(lang, `${who.sk} býva ${vIn(adj(c, 'loc'))} domčeku.`, `${who.en} lives in the ${c.en} house.`, `${who.es} vive en la casita ${c.es.f}.`, `${who.cs} bydlí ${vInC(adjC(c, 'loc'))} domečku.`);
  function genRiddles(i, lang, r) {
    if (i < 10) {
      const [c1, c2] = sample(r, CATS, 2);
      const n = i < 5 ? 5 : 6;
      const same = sample(r, c1.items, n - 1), odd = pick(r, c2.items);
      const nm = it => lang === 'sk' ? it[1] : lang === 'cs' ? cz(it[1]) : lang === 'es' ? it[3] : it[2];
      return {
        kind: 'choose', prompt: T(lang, 'Čo sem nepatrí?', 'Which one does not belong?', '¿Cuál no va aquí?', 'Co sem nepatří?'),
        say: T(lang, `Čo sem nepatrí? ${c1.skAll}`, `Which one does not belong? ${c1.enAll}`, `¿Cuál no va aquí? ${c1.esAll}`, `Co sem nepatří? ${c1.csAll}`),
        hint: T(lang, `${c1.skAll} Čo medzi ne nepatrí?`, `${c1.enAll} Which one is different?`, `${c1.esAll} ¿Cuál es diferente?`, `${c1.csAll} Co mezi ně nepatří?`),
        answer: T(lang, `${cap(nm(odd))} nepatrí medzi ${c1.sk}.`, `The ${nm(odd)} does not belong with the ${c1.en}.`, `${cap(nm(odd))} no va con ${c1.es}.`, `${cap(nm(odd))} nepatří mezi ${c1.cs}.`),
        display: emo('🔍'),
        options: shuffle(r, [...same.map(e => ({ html: emo(e[0]), ok: false, say: nm(e) })), { html: emo(odd[0]), ok: true, say: nm(odd) }])
      };
    }
    if (i < 24) {
      const useShapes = i >= 19;
      const n4 = i >= 21; // ABCD pattern with 4 symbols
      let pool, names;
      if (useShapes) {
        const cs = sample(r, COLORS, 4), ss = sample(r, SHAPES, 4);
        pool = cs.map((c, k) => shapeSVG(ss[k].id, c.hex)); names = cs.map((c, k) => colShape(lang, c, ss[k]));
      } else {
        const its = sample(r, pick(r, CATS).items, 4);
        pool = its.map(e => emo(e[0])); names = its.map(e => lang === 'sk' ? e[1] : lang === 'cs' ? cz(e[1]) : lang === 'es' ? e[3] : e[2]);
      }
      let unit;
      if (i < 12) unit = [0, 1]; else if (i < 16) unit = r() < 0.5 ? [0, 0, 1] : [0, 1, 1]; else if (i < 21) unit = r() < 0.5 ? [0, 1, 2] : [0, 1, 1, 2]; else unit = [0, 1, 2, 3];
      const shown = n4 ? 7 : 6 + (i % 2); const items = [];
      for (let k = 0; k <= shown; k++) items.push(unit[k % unit.length]);
      const next = items.pop();
      return {
        kind: 'choose', prompt: T(lang, 'Čo príde ďalej?', 'What comes next?', '¿Qué sigue?', 'Co přijde dál?'),
        say: T(lang, `Čo príde ďalej? ${items.map(k => names[k]).join(', ')}, a potom?`, `What comes next? ${items.map(k => names[k]).join(', ')}, and then?`, `¿Qué sigue? ${items.map(k => names[k]).join(', ')}, ¿y después?`, `Co přijde dál? ${items.map(k => names[k]).join(', ')}, a potom?`),
        hint: T(lang, `Povedz si to nahlas: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`, `Say it out loud: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`, `Dilo en voz alta: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`, `Řekni to nahlas: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`),
        answer: T(lang, `Potom príde ${names[next]}.`, `Next comes the ${names[next]}.`, `Después viene ${names[next]}.`, `Potom ${PLUR_CS.test(names[next]) ? 'přijdou' : 'přijde'} ${names[next]}.`),
        display: `<div class="seq">${items.map(k => `<span class="cell">${pool[k]}</span>`).join('')}<span class="cell q">?</span></div>`,
        options: shuffle(r, [0, 1, 2, 3].map(k => ({ html: pool[k], ok: k === next, say: names[k] })))
      };
    }
    const who = pick(r, HOUSE_ANIMALS);
    if (i < 30) {
      const cols = sample(r, COLORS, i < 26 ? 3 : 4);
      return {
        kind: 'choose', houses: true,
        prompt: livesIn(lang, who, cols[0]),
        hint: T(lang, `Hľadáme ${adj(cols[0], 'm')} domček.`, `Look for the ${cols[0].en} house.`, `Buscamos la casita ${cols[0].es.f}.`, `Hledáme ${adjC(cols[0], 'm')} domeček.`),
        answer: livesIn(lang, who, cols[0]),
        display: emo(who.e) + listen(),
        options: shuffle(r, cols.map((c, k) => ({ html: houseSVG(c.hex), ok: k === 0, say: houseName(lang, c) })))
      };
    }
    if (i < 38) {
      const [a, b] = sample(r, COLORS, 2);
      const withTree = r() < 0.5;
      const tDeco = withTree ? 'tree' : 'flower', oDeco = withTree ? 'flower' : 'tree';
      const opts = [{ c: a, d: tDeco, ok: true }, { c: a, d: oDeco, ok: false }, { c: b, d: tDeco, ok: false }];
      if (i >= 34) opts.push({ c: b, d: oDeco, ok: false });
      const nearW = withTree ? T(lang, 'so stromom', 'with the tree', 'con el árbol', 'se stromem') : T(lang, 'so slnečnicou', 'with the sunflower', 'con el girasol', 'se slunečnicí');
      return {
        kind: 'choose', houses: true,
        prompt: T(lang, `${who.sk} býva ${vIn(adj(a, 'loc'))} domčeku ${nearW}.`, `${who.en} lives in the ${a.en} house ${nearW}.`, `${who.es} vive en la casita ${a.es.f} ${nearW}.`, `${who.cs} bydlí ${vInC(adjC(a, 'loc'))} domečku ${nearW}.`),
        hint: T(lang, `Sú tu dva ${adj(a, 'pl')} domčeky. Ktorý je ${nearW}?`, `There are two ${a.en} houses. Which one is ${nearW}?`, `Hay dos casitas ${a.es.fp}. ¿Cuál es la casita ${nearW}?`, `Jsou tu dva ${adjC(a, 'pl')} domečky. Který je ${nearW}?`),
        answer: T(lang, `${who.sk} býva ${vIn(adj(a, 'loc'))} domčeku ${nearW}.`, `${who.en} lives in the ${a.en} house ${nearW}.`, `${who.es} vive en la casita ${a.es.f} ${nearW}.`, `${who.cs} bydlí ${vInC(adjC(a, 'loc'))} domečku ${nearW}.`),
        display: emo(who.e) + listen(),
        options: shuffle(r, opts.map(o => ({ html: houseSVG(o.c.hex, o.d), ok: o.ok, say: houseName(lang, o.c, o.d) })))
      };
    }
    if (i < 44) {
      const cols = sample(r, COLORS, 4); const t = ri(r, 1, 2);
      const L = cols[t - 1], R = cols[t + 1];
      return {
        kind: 'choose', houses: true, keepOrder: true,
        prompt: T(lang, `${who.sk} býva v domčeku medzi ${adj(L, 'ins')} a ${adj(R, 'ins')} domčekom.`, `${who.en} lives in the house between the ${L.en} house and the ${R.en} house.`, `${who.es} vive en la casita que está entre la casita ${L.es.f} y la casita ${R.es.f}.`, `${who.cs} bydlí v domečku mezi ${adjC(L, 'ins')} a ${adjC(R, 'ins')} domečkem.`),
        hint: T(lang, `Nájdi ${adj(L, 'm')} a ${adj(R, 'm')} domček. ${who.sk} býva v strede medzi nimi.`, `Find the ${L.en} and the ${R.en} house. ${who.en} lives in the middle.`, `Busca la casita ${L.es.f} y la casita ${R.es.f}. ${who.es} vive en medio de las dos.`, `Najdi ${adjC(L, 'm')} a ${adjC(R, 'm')} domeček. ${who.cs} bydlí uprostřed mezi nimi.`),
        answer: livesIn(lang, who, cols[t]),
        display: emo(who.e) + listen(),
        options: cols.map((c, k) => ({ html: houseSVG(c.hex), ok: k === t, say: houseName(lang, c) }))
      };
    }
    // two-step: "not in the X house, and the house has a tree/sunflower"
    const [x, y, z, w] = sample(r, COLORS, 4);
    const withTree = r() < 0.5; const d = withTree ? 'tree' : 'flower', od = withTree ? 'flower' : 'tree';
    const opts = [{ c: y, d, ok: true }, { c: x, d, ok: false }, { c: z, d: od, ok: false }, { c: w, d: null, ok: false }];
    const hasW = withTree ? T(lang, `Pri ${who.poss} domčeku rastie strom.`, 'There is a tree by its house.', 'Junto a su casita hay un árbol.', `U ${who.csPoss} domečku roste strom.`) : T(lang, `Pri ${who.poss} domčeku rastie slnečnica.`, 'There is a sunflower by its house.', 'Junto a su casita hay un girasol.', `U ${who.csPoss} domečku roste slunečnice.`);
    return {
      kind: 'choose', houses: true,
      prompt: T(lang, `${who.sk} nebýva ${vIn(adj(x, 'loc'))} domčeku. ${hasW}`, `${who.en} does not live in the ${x.en} house. ${hasW}`, `${who.es} no vive en la casita ${x.es.f}. ${hasW}`, `${who.cs} nebydlí ${vInC(adjC(x, 'loc'))} domečku. ${hasW}`),
      hint: T(lang, `Najprv nájdi domčeky ${withTree ? 'so stromom' : 'so slnečnicou'}. Potom vynechaj ${adj(x, 'm')}.`, `First find the houses ${withTree ? 'with a tree' : 'with a sunflower'}. Then skip the ${x.en} one.`, `Primero busca las casitas ${withTree ? 'con árbol' : 'con girasol'}. Luego descarta la casita ${x.es.f}.`, `Nejdřív najdi domečky ${withTree ? 'se stromem' : 'se slunečnicí'}. Pak vynech ${adjC(x, 'm')}.`),
      answer: livesIn(lang, who, y),
      display: emo(who.e) + listen(),
      options: shuffle(r, opts.map(o => ({ html: houseSVG(o.c.hex, o.d), ok: o.ok, say: houseName(lang, o.c, o.d) })))
    };
  }

  // ---------- GAME 6: dressing up ----------
  // Slovak: čiapka (f), klobúk (m), šál (m), tričko (n), topánky (pl)
  const ITEM = {
    beanie: { sk: 'čiapka', g: 'f', en: 'beanie', es: 'gorro', eg: 'm' }, tophat: { sk: 'klobúk', g: 'm', en: 'top hat', es: 'sombrero de copa', eg: 'm' },
    scarf: { sk: 'šál', g: 'm', en: 'scarf', es: 'bufanda', eg: 'f' }, shirt: { sk: 'tričko', g: 'n', en: 'shirt', es: 'camiseta', eg: 'f' }, shoes: { sk: 'topánky', g: 'pl', en: 'shoes', es: 'zapatos', eg: 'mp' }
  };
  const colorOf = id => COLORS.find(c => c.id === id);
  function itemName(lang, slot, val, acc) {
    let key = slot, cid = val;
    if (slot === 'hat') { [key, cid] = val.split('|'); }
    const it = ITEM[key], c = colorOf(cid);
    if (lang === 'es') return esNoun(c, it.es, it.eg, acc ? UN : ART); // acc = 'un gorro rojo', else 'el gorro rojo'
    if (acc && it.g === 'f') return T(lang, `${adj(c, 'accF')} ${it.sk.replace(/a$/, 'u')}`, `${c.en} ${it.en}`, undefined, `${adjC(c, 'accF')} ${it.csAcc}`); // červenú čiapku
    return T(lang, `${adj(c, it.g)} ${it.sk}`, `${c.en} ${it.en}`, undefined, `${acc && it.cg === 'f' ? adjC(c, 'accF') + ' ' + it.csAcc : adjC(c, it.cg) + ' ' + it.cs}`);
  }
  const SLOT_Q = {
    hat: { sk: 'Pozri sa, čo má zajačik na hlave.', en: 'Look at what the bunny wears on its head.', es: 'Mira lo que lleva el conejito en la cabeza.' },
    scarf: { sk: 'Pozri sa na šál.', en: 'Look at the scarf.', es: 'Mira la bufanda.' },
    shirt: { sk: 'Pozri sa na tričko.', en: 'Look at the shirt.', es: 'Mira la camiseta.' },
    shoes: { sk: 'Pozri sa na topánky.', en: 'Look at the shoes.', es: 'Mira los zapatos.' }
  };
  const joinAnd = (lang, arr) => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + T(lang, ' a ', ' and ', ' y ', ' a ') + arr[arr.length - 1];
  function genDress(i, lang, r) {
    const slots = i < 6 ? ['hat'] : i < 16 ? ['hat', 'scarf'] : i < 30 ? ['hat', 'scarf', 'shirt'] : ['hat', 'scarf', 'shirt', 'shoes'];
    const nCh = i < 8 ? 3 : 4;
    const hatTypes = i < 16 ? ['beanie'] : ['beanie', 'tophat'];
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
    const names = slots.map(s => itemName(lang, s, target[s]));
    const namesAcc = slots.map(s => itemName(lang, s, target[s], true));
    const byEar = i >= 44; // last tasks: no picture, only listen
    return {
      kind: 'dress', slots, target, choices, byEar,
      prompt: byEar ? T(lang, `Obleč zajačika: ${joinAnd(lang, names)}.`, `Dress the bunny: ${joinAnd(lang, names)}.`, `Viste al conejito: ${joinAnd(lang, namesAcc)}.`, `Obleč zajíčka: ${joinAnd(lang, names)}.`)
        : T(lang, 'Obleč zajačika presne ako na obrázku. Potom ťukni na fajku.', 'Dress the bunny just like in the picture. Then tap the check mark.', 'Viste al conejito igual que en el dibujo. Luego toca la palomita.', 'Obleč zajíčka přesně jako na obrázku. Pak ťukni na fajfku.'),
      say: byEar ? T(lang, `Počúvaj. Obleč zajačika: ${joinAnd(lang, names)}. Potom ťukni na fajku.`, `Listen. Dress the bunny: ${joinAnd(lang, names)}. Then tap the check mark.`, `Escucha. Viste al conejito: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`, `Poslouchej. Obleč zajíčka: ${joinAnd(lang, names)}. Pak ťukni na fajfku.`)
        : T(lang, `Obleč zajačika ako na obrázku: ${joinAnd(lang, names)}. Potom ťukni na fajku.`, `Dress the bunny like in the picture: ${joinAnd(lang, names)}. Then tap the check mark.`, `Viste al conejito como en el dibujo: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`, `Obleč zajíčka jako na obrázku: ${joinAnd(lang, names)}. Pak ťukni na fajfku.`),
      hint: T(lang, 'Porovnaj zajačika s obrázkom.', 'Compare the bunny with the picture.', 'Compara al conejito con el dibujo.', 'Porovnej zajíčka s obrázkem.'),
      answer: T(lang, `Zajačik má ${joinAnd(lang, namesAcc)}.`, `The bunny has a ${joinAnd(lang, names)}.`.replace('a shoes', 'shoes'), `El conejito tiene ${joinAnd(lang, namesAcc)}.`, `Zajíček má ${joinAnd(lang, namesAcc)}.`),
      slotHints: Object.fromEntries(slots.map(s => [s, SLOT_Q[s][lang]])),
      slotNames: Object.fromEntries(slots.map(s => [s, T(lang, `Zajačik má mať ${itemName(lang, s, target[s], true)}.`, `The bunny needs the ${itemName(lang, s, target[s])}.`, `El conejito necesita ${itemName(lang, s, target[s], true)}.`, `Zajíček má mít ${itemName(lang, s, target[s], true)}.`)])),
      itemSay: Object.fromEntries(slots.map(s => [s, Object.fromEntries(choices[s].map(v => [v, itemName(lang, s, v)]))]))
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

  // =====================================================================
  // ZVIERATKOVÁ ŠKÔLKA 2 – completely new tasks (50 per game)
  // =====================================================================
  const pl3 = (it, n) => n === 1 ? it.sk[0] : n >= 2 && n <= 4 ? it.sk[1] : it.sk[2];
  const skNum = (n, g) => n === 1 ? ({ f: 'jedna', n: 'jedno', m: 'jeden' })[g] : n === 2 ? (g === 'm' ? 'dva' : 'dve') : num('sk', n);
  const skAccF = n => n === 1 ? 'jednu' : n === 2 ? 'dve' : num('sk', n);
  const esNum = (n, g) => n === 1 ? (g === 'f' ? 'una' : 'un') : num('es', n);
  function cnt(lang, it, n) {
    return T(lang, `${skNum(n, it.g)} ${pl3(it, n)}`, `${num('en', n)} ${n === 1 ? it.en[0] : it.en[1]}`, `${esNum(n, it.eg)} ${n === 1 ? it.es[0] : it.es[1]}`, `${csNum(n, it.cg)} ${pl3cs(it, n)}`);
  }
  const cntD = (lang, it, n) => T(lang, `${n} ${pl3(it, n)}`, `${n} ${n === 1 ? it.en[0] : it.en[1]}`, `${n} ${n === 1 ? it.es[0] : it.es[1]}`, `${n} ${pl3cs(it, n)}`);
  function grid(e, n, crossed) {
    let h = '<div class="nuts">';
    for (let k = 0; k < n; k++) h += `<span class="nut${crossed && k >= n - crossed ? ' gone' : ''}">${e}</span>` + ((k + 1) % 5 === 0 && k + 1 < n ? '<i class="br5"></i>' : '');
    return h + '</div>';
  }
  const colorName = (lang, c) => T(lang, `${adj(c, 'f')} farba`, `the color ${c.en}`, `el color ${c.es.m}`, `${adjC(c, 'f')} barva`);
  const byId = id => COLORS.find(c => c.id === id);

  // ---------- GAME 1 (2): colors & shapes ----------
  const OBJ = [['🍌', 'banán', 'banana', 'el plátano', 'yellow'], ['🍓', 'jahoda', 'strawberry', 'la fresa', 'red'], ['🥒', 'uhorka', 'cucumber', 'el pepino', 'green'],
    ['🍊', 'pomaranč', 'orange', 'la naranja', 'orange'], ['🍆', 'baklažán', 'eggplant', 'la berenjena', 'purple'], ['🐷', 'prasiatko', 'piglet', 'el cerdito', 'pink'],
    ['🐻', 'medveď', 'bear', 'el oso', 'brown'], ['🐸', 'žaba', 'frog', 'la rana', 'green'], ['🍋', 'citrón', 'lemon', 'el limón', 'yellow'], ['🐳', 'veľryba', 'whale', 'la ballena', 'blue'],
    ['🥕', 'mrkva', 'carrot', 'la zanahoria', 'orange'], ['🌹', 'ruža', 'rose', 'la rosa', 'red'], ['🦩', 'plameniak', 'flamingo', 'el flamenco', 'pink'], ['🍇', 'hrozno', 'grapes', 'las uvas', 'purple', 1],
    ['🍫', 'čokoláda', 'chocolate', 'el chocolate', 'brown'], ['🍅', 'paradajka', 'tomato', 'el tomate', 'red'], ['🐥', 'kuriatko', 'chick', 'el pollito', 'yellow'], ['🥦', 'brokolica', 'broccoli', 'el brócoli', 'green']];
  const MIX = [['yellow', 'blue', 'green'], ['red', 'yellow', 'orange'], ['red', 'blue', 'purple']];
  const CORN = { triangle: 3, square: 4, diamond: 4, star: 5, circle: 0, oval: 0 };
  const cornW = (lang, k) => T(lang, { 3: 'tri rohy', 4: 'štyri rohy', 0: 'žiadny roh', 5: 'päť cípov' }[k], { 3: 'three corners', 4: 'four corners', 0: 'no corners', 5: 'five points' }[k], { 3: 'tres esquinas', 4: 'cuatro esquinas', 0: 'ninguna esquina', 5: 'cinco puntas' }[k]);
  const SIZES = { sk: [['veľký', 'veľká', 'veľké'], ['stredný', 'stredná', 'stredné'], ['malý', 'malá', 'malé'], ['malinký', 'malinká', 'malinké']], en: ['big', 'medium', 'small', 'tiny'],
    es: [['grande', 'grande'], ['mediano', 'mediana'], ['pequeño', 'pequeña'], ['chiquito', 'chiquita']] };
  const gi = g => g === 'm' ? 0 : g === 'f' ? 1 : 2;
  function genColors2(i, lang, r) {
    if (i < 10) {
      const o = pick(r, OBJ), c = byId(o[4]); const n = i < 4 ? 3 : 4;
      const cols = [c, ...sample(r, COLORS.filter(x => x !== c), n - 1)];
      const plEn = !!o[5], esPl = /^(los|las) /.test(o[3]);
      return {
        kind: 'choose', prompt: T(lang, `Akú farbu má ${o[1]}?`, `What color ${plEn ? 'are' : 'is'} the ${o[2]}?`, `¿De qué color ${esPl ? 'son' : 'es'} ${o[3]}?`, `Jakou barvu ${o[5] ? 'mají' : 'má'} ${cz(o[1])}?`),
        hint: T(lang, 'Pozri sa na obrázok. Akú farbu vidíš?', 'Look at the picture. Which color do you see?', 'Mira el dibujo. ¿Qué color ves?', 'Podívej se na obrázek. Jakou barvu vidíš?'),
        answer: T(lang, `${cap(o[1])} má ${adj(c, 'accF')} farbu.`, `The ${o[2]} ${plEn ? 'are' : 'is'} ${c.en}.`, `${cap(o[3])} ${esPl ? 'son' : 'es'} de color ${c.es.m}.`, `${cap(cz(o[1]))} ${o[5] ? 'mají' : 'má'} ${adjC(c, 'accF')} barvu.`),
        display: emo(o[0], 'huge'),
        options: shuffle(r, cols.map((x, k) => ({ html: shapeSVG('circle', x.hex, null, true), ok: k === 0, say: colorName(lang, x) })))
      };
    }
    if (i < 16) {
      const m = MIX[(i - 10) % 3], sw = i >= 13; const a = byId(sw ? m[1] : m[0]), b = byId(sw ? m[0] : m[1]), c = byId(m[2]);
      const cols = [c, a, b, ...sample(r, COLORS.filter(x => ![a, b, c].includes(x)), 1)];
      return {
        kind: 'choose', prompt: T(lang, `Čo vznikne, keď zmiešame ${adj(a, 'accF')} a ${adj(b, 'accF')} farbu?`, `What do we get when we mix ${a.en} and ${b.en}?`, `¿Qué sale si mezclamos el ${a.es.m} y el ${b.es.m}?`, `Co vznikne, když smícháme ${adjC(a, 'accF')} a ${adjC(b, 'accF')} barvu?`),
        hint: T(lang, `Predstav si, že zmiešaš ${adj(a, 'accF')} a ${adj(b, 'accF')} farbu.`, `Imagine mixing ${a.en} and ${b.en} paint.`, `Imagina que mezclas pintura ${a.es.f} y ${b.es.f}.`, `Představ si, že smícháš ${adjC(a, 'accF')} a ${adjC(b, 'accF')} barvu.`),
        answer: T(lang, `${cap(adj(a, 'f'))} a ${adj(b, 'f')} dajú ${adj(c, 'accF')} farbu.`, `${cap(a.en)} and ${b.en} make ${c.en}.`, `El ${a.es.m} y el ${b.es.m} dan el ${c.es.m}.`, `${cap(adjC(a, 'f'))} a ${adjC(b, 'f')} dají ${adjC(c, 'accF')} barvu.`),
        display: `<div class="sum"><div class="blob" style="background:${a.hex}"></div><span class="op">+</span><div class="blob" style="background:${b.hex}"></div></div>`,
        options: shuffle(r, cols.map((x, k) => ({ html: shapeSVG('circle', x.hex, null, true), ok: k === 0, say: colorName(lang, x) })))
      };
    }
    if (i < 28 || i >= 40) {
      const byEar = i >= 40;
      const k = pick(r, [3, 4, 0, 5]);
      const ids = Object.keys(CORN);
      const ts = shapeById(pick(r, ids.filter(s => CORN[s] === k))), tc = pick(r, COLORS);
      const others = shuffle(r, [3, 4, 0, 5].filter(x => x !== k)).map(x => shapeById(pick(r, ids.filter(s => CORN[s] === x))));
      let opts;
      if (!byEar) opts = [{ c: tc, s: ts }, ...others.slice(0, i < 20 ? 2 : 3).map(s => ({ c: pick(r, COLORS), s }))];
      else {
        const oc = pick(r, COLORS.filter(x => x !== tc));
        opts = [{ c: tc, s: ts }, { c: oc, s: ts }, { c: tc, s: others[0] }, { c: pick(r, COLORS.filter(x => x !== tc)), s: others[1] }];
        if (i >= 45) opts.push({ c: pick(r, COLORS.filter(x => x !== tc)), s: others[2] });
      }
      const kw = cornW(lang, k);
      const prompt = byEar
        ? T(lang, `Ťukni na ${adj(tc, 'm')} tvar, ktorý ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `Tap the ${tc.en} shape with ${kw}.`, `Toca la forma ${tc.es.f} que ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`, `Ťukni na ${adjC(tc, 'm')} tvar, který ${k === 0 ? 'nemá žádný roh' : 'má ' + kw}.`)
        : T(lang, `Nájdi tvar, ktorý ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `Find the shape with ${kw}.`, `Busca la forma que ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`, `Najdi tvar, který ${k === 0 ? 'nemá žádný roh' : 'má ' + kw}.`);
      return {
        kind: 'choose', prompt,
        hint: byEar ? T(lang, `Najprv nájdi ${adj(tc, 'accF')} farbu, potom spočítaj rohy.`, `First find ${tc.en}, then count the corners.`, `Primero busca el color ${tc.es.m} y luego cuenta las esquinas.`, `Nejdřív najdi ${adjC(tc, 'accF')} barvu, pak spočítej rohy.`)
          : T(lang, 'Spočítaj rohy na každom tvare.', 'Count the corners of each shape.', 'Cuenta las esquinas de cada forma.', 'Spočítej rohy na každém tvaru.'),
        answer: T(lang, `${cap(colShape(lang, tc, ts))} ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `The ${colShape(lang, tc, ts)} has ${kw}.`, `${cap(colShape(lang, tc, ts))} ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`, `${cap(colShape(lang, tc, ts))} ${k === 0 ? 'nemá žádný roh' : 'má ' + kw}.`),
        display: byEar ? listen() : emo('📐'),
        options: shuffle(r, opts.map((o, j) => ({ html: shapeSVG(o.s.id, o.c.hex), ok: j === 0, say: colShape(lang, o.c, o.s) })))
      };
    }
    // sizes (28..39): biggest / smallest
    const s = pick(r, SHAPES), c = pick(r, COLORS), n = i < 32 ? 3 : 4, big1 = i % 2 === 0;
    const sizeIdx = n === 3 ? [0, 1, 2] : [0, 1, 2, 3], scale = [1, .78, .58, .4];
    const sz = (lang2, k) => T(lang2, `${SIZES.sk[k][gi(s.g)]} ${s.sk}`, `the ${SIZES.en[k]} ${s.en}`, `${ART[s.eg]} ${s.es} ${SIZES.es[k][s.eg === 'f' ? 1 : 0]}`, `${SIZES.cs[k][gi(s.g)]} ${s.cs}`);
    const target = big1 ? 0 : sizeIdx[sizeIdx.length - 1];
    const supAcc = big1 ? ['najväčší', 'najväčšiu', 'najväčšie'] : ['najmenší', 'najmenšiu', 'najmenšie'];
    const supNom = big1 ? ['najväčší', 'najväčšia', 'najväčšie'] : ['najmenší', 'najmenšia', 'najmenšie'];
    const esSup = big1 ? 'más grande' : (s.eg === 'f' ? 'más pequeña' : 'más pequeño');
    return {
      kind: 'choose',
      prompt: T(lang, `Ťukni na ${supAcc[gi(s.g)]} ${s.skAcc}.`, `Tap the ${big1 ? 'biggest' : 'smallest'} ${s.en}.`, `Toca ${ART[s.eg]} ${s.es} ${esSup}.`, `Ťukni na ${big1 ? 'největší' : 'nejmenší'} ${s.csAcc}.`),
      hint: T(lang, 'Porovnaj veľkosť všetkých tvarov.', 'Compare the size of all the shapes.', 'Compara el tamaño de todas las formas.', 'Porovnej velikost všech tvarů.'),
      answer: T(lang, `${cap(supNom[gi(s.g)])} ${adj(c, s.g)} ${s.sk}.`, `The ${big1 ? 'biggest' : 'smallest'} ${c.en} ${s.en}.`, `${cap(ART[s.eg])} ${s.es} ${c.es[s.eg]} ${esSup}.`, `${big1 ? 'Největší' : 'Nejmenší'} ${adjC(c, s.g)} ${s.cs}.`),
      display: listen(),
      options: shuffle(r, sizeIdx.map(k => ({ html: `<span class="sz" style="display:inline-block;transform:scale(${scale[k]})">${shapeSVG(s.id, c.hex)}</span>`, ok: k === target, say: sz(lang, k) })))
    };
  }

  // ---------- GAME 2 (2): counting ----------
  const CI = [
    { e: '🐞', sk: ['lienka', 'lienky', 'lienok'], g: 'f', en: ['ladybug', 'ladybugs'], es: ['mariquita', 'mariquitas'], eg: 'f' },
    { e: '🍎', sk: ['jablko', 'jablká', 'jabĺk'], g: 'n', en: ['apple', 'apples'], es: ['manzana', 'manzanas'], eg: 'f' },
    { e: '🐸', sk: ['žabka', 'žabky', 'žabiek'], g: 'f', en: ['frog', 'frogs'], es: ['rana', 'ranas'], eg: 'f' },
    { e: '⭐', sk: ['hviezdička', 'hviezdičky', 'hviezdičiek'], g: 'f', en: ['star', 'stars'], es: ['estrella', 'estrellas'], eg: 'f' },
    { e: '🐤', sk: ['kuriatko', 'kuriatka', 'kuriatok'], g: 'n', en: ['chick', 'chicks'], es: ['pollito', 'pollitos'], eg: 'm' },
    { e: '🍄', sk: ['hríbik', 'hríbiky', 'hríbikov'], g: 'm', en: ['mushroom', 'mushrooms'], es: ['hongo', 'hongos'], eg: 'm' }];
  const DUCK = { e: '🐥', sk: ['kačiatko', 'kačiatka', 'kačiatok'], g: 'n', en: ['duckling', 'ducklings'], es: ['patito', 'patitos'], eg: 'm' };
  const CARROT = { e: '🥕', sk: ['mrkva', 'mrkvy', 'mrkiev'], g: 'f', en: ['carrot', 'carrots'], es: ['zanahoria', 'zanahorias'], eg: 'f' };
  const APPLE = CI[1];
  function genCount2(i, lang, r) {
    if (i < 12) {
      const it = pick(r, CI), n = i < 4 ? ri(r, 3, 6) : i < 8 ? ri(r, 6, 10) : ri(r, 11, 16);
      return {
        kind: 'choose', prompt: T(lang, `Koľko je tu ${it.sk[2]}?`, `How many ${it.en[1]} are there?`, `¿${it.eg === 'f' ? 'Cuántas' : 'Cuántos'} ${it.es[1]} hay?`, `Kolik je tu ${it.cs[2]}?`),
        hint: n > 10 ? T(lang, 'Najprv spočítaj prvý riadok. Potom pokračuj ďalej.', 'Count the first row, then keep going.', 'Cuenta la primera fila y luego sigue.', 'Nejdřív spočítej první řadu. Pak pokračuj dál.')
          : T(lang, 'Dotkni sa každého obrázka a počítaj nahlas.', 'Touch each picture and count out loud.', 'Toca cada dibujo y cuenta en voz alta.', 'Dotkni se každého obrázku a počítej nahlas.'),
        answer: `${cap(cnt(lang, it, n))}.`, display: grid(it.e, n), options: numOpts(r, lang, n, 4, n > 10 ? 20 : 10)
      };
    }
    if (i < 22) {
      const after = i % 2 === 0, n = i < 17 ? ri(r, 2, 9) : ri(r, 10, 19), ans = after ? n + 1 : n - 1;
      return {
        kind: 'choose',
        prompt: after ? T(lang, `Ktoré číslo príde po čísle ${n}?`, `Which number comes after ${n}?`, `¿Qué número va después del ${n}?`, `Které číslo přijde po čísle ${n}?`)
          : T(lang, `Ktoré číslo je pred číslom ${n}?`, `Which number comes before ${n}?`, `¿Qué número va antes del ${n}?`, `Které číslo je před číslem ${n}?`),
        hint: after ? T(lang, `Počítaj ďalej od čísla ${num(lang, n)}.`, `Count on from ${num(lang, n)}.`, `Cuenta hacia adelante desde el ${num(lang, n)}.`, `Počítej dál od čísla ${num(lang, n)}.`)
          : T(lang, `Počítaj späť od čísla ${num(lang, n)}.`, `Count back from ${num(lang, n)}.`, `Cuenta hacia atrás desde el ${num(lang, n)}.`, `Počítej zpátky od čísla ${num(lang, n)}.`),
        answer: after ? T(lang, `Po čísle ${num(lang, n)} príde ${num(lang, ans)}.`, `After ${num(lang, n)} comes ${num(lang, ans)}.`, `Después del ${num(lang, n)} va el ${num(lang, ans)}.`, `Po čísle ${num(lang, n)} přijde ${num(lang, ans)}.`)
          : T(lang, `Pred číslom ${num(lang, n)} je ${num(lang, ans)}.`, `Before ${num(lang, n)} comes ${num(lang, ans)}.`, `Antes del ${num(lang, n)} va el ${num(lang, ans)}.`, `Před číslem ${num(lang, n)} je ${num(lang, ans)}.`),
        display: big(after ? `${n} → ?` : `? → ${n}`, 'num huge'), options: numOpts(r, lang, ans, 4, 20)
      };
    }
    if (i < 32) {
      const step = i < 27 ? 1 : 2, len = i < 25 ? 4 : 5, start = ri(r, step === 1 ? 1 : 0, 20 - step * (len - 1));
      const seq = Array.from({ length: len }, (_, k) => start + k * step), mi = ri(r, 1, len - 2), m = seq[mi];
      return {
        kind: 'choose', prompt: T(lang, 'Ktoré číslo chýba?', 'Which number is missing?', '¿Qué número falta?', 'Které číslo chybí?'),
        hint: step === 1 ? T(lang, 'Povedz čísla nahlas po poradí.', 'Say the numbers in order out loud.', 'Di los números en orden en voz alta.', 'Řekni čísla nahlas po pořadě.')
          : T(lang, 'Čísla rastú vždy o dva.', 'The numbers go up by two each time.', 'Los números suben de dos en dos.', 'Čísla rostou vždy o dvě.'),
        answer: T(lang, `${cap(seq.map(v => num(lang, v)).join(', '))}. Chýba číslo ${num(lang, m)}.`, `${cap(seq.map(v => num(lang, v)).join(', '))}. The missing number is ${num(lang, m)}.`, `${cap(seq.map(v => num(lang, v)).join(', '))}. Falta el ${num(lang, m)}.`, `${cap(seq.map(v => num(lang, v)).join(', '))}. Chybí číslo ${num(lang, m)}.`),
        display: big(seq.map((v, k) => k === mi ? '?' : v).join(' , '), 'num'), options: numOpts(r, lang, m, 4, 20)
      };
    }
    if (i < 40) {
      const it = pick(r, CI); const a = ri(r, 3, 10); let b = i < 36 ? (a > 5 ? a - ri(r, 2, 3) : a + ri(r, 2, 3)) : a + (a < 10 && r() < 0.5 ? 1 : -1);
      const mn = Math.min(a, b), mx = Math.max(a, b);
      return {
        kind: 'choose', prompt: T(lang, `Kde je menej ${it.sk[2]}?`, `Where are fewer ${it.en[1]}?`, `¿Dónde hay menos ${it.es[1]}?`, `Kde je méně ${it.cs[2]}?`),
        hint: T(lang, 'Spočítaj obe skupinky. Ktorá má menej?', 'Count both groups. Which one has fewer?', 'Cuenta los dos grupos. ¿Cuál tiene menos?', 'Spočítej obě skupinky. Která má méně?'),
        answer: T(lang, `${cap(num(lang, mn))} je menej ako ${num(lang, mx)}.`, `${cap(num(lang, mn))} is less than ${num(lang, mx)}.`, `${cap(num(lang, mn))} es menos que ${num(lang, mx)}.`, `${cap(num(lang, mn))} je méně než ${num(lang, mx)}.`),
        display: emo(it.e), wide: true,
        options: shuffle(r, [{ html: grid(it.e, a), ok: a < b, say: cnt(lang, it, a) }, { html: grid(it.e, b), ok: b < a, say: cnt(lang, it, b) }])
      };
    }
    // stories 40..49
    const kind = i % 3;
    if (kind === 1) { // bunny eats carrots (minus)
      const a = ri(r, 5, 10), b = ri(r, 1, 4), ans = a - b, it = CARROT;
      return {
        kind: 'choose',
        prompt: T(lang, `Zajko má ${cntD(lang, it, a)}. Zjedol ${b}. Koľko mrkiev mu zostalo?`, `The bunny has ${a} carrots. He eats ${b}. How many carrots are left?`, `El conejito tiene ${a} zanahorias. Se come ${b}. ¿Cuántas zanahorias le quedan?`, `Zajda má ${cntD(lang, it, a)}. Snědl ${b}. Kolik mrkví mu zbylo?`),
        say: T(lang, `Zajko má ${cnt(lang, it, a)}. Zjedol ${skAccF(b)}. Koľko mrkiev mu zostalo?`, `The bunny has ${cnt(lang, it, a)}. He eats ${num(lang, b)}. How many carrots are left?`, `El conejito tiene ${cnt(lang, it, a)}. Se come ${esNum(b, 'f')}. ¿Cuántas zanahorias le quedan?`, `Zajda má ${cnt(lang, it, a)}. Snědl ${csAccF(b)}. Kolik mrkví mu zbylo?`),
        hint: T(lang, 'Spočítaj, koľko mrkiev zostalo.', 'Count the carrots that are left.', 'Cuenta las zanahorias que quedan.', 'Spočítej, kolik mrkví zbylo.'),
        answer: T(lang, `${ans === 1 ? 'Zostala' : ans <= 4 ? 'Zostali' : 'Zostalo'} mu ${cnt(lang, it, ans)}.`, ans === 1 ? 'One carrot is left.' : `${cap(cnt(lang, it, ans))} are left.`, ans === 1 ? 'Le queda una zanahoria.' : `Le quedan ${cnt(lang, it, ans)}.`, `${ans === 1 ? 'Zbyla' : ans <= 4 ? 'Zbyly' : 'Zbylo'} mu ${cnt(lang, it, ans)}.`),
        display: grid(it.e, a, b) + `<div class="eq">${a} − ${b} = ?</div>`, options: numOpts(r, lang, ans, 4, 12)
      };
    }
    const duck = kind === 0, it = duck ? DUCK : APPLE, a = ri(r, 3, 9), b = ri(r, 2, 4), ans = a + b;
    const pr = duck
      ? [`Mama kačica má ${cntD('sk', it, a)}. Priplávali ešte ${b}. Koľko kačiatok má teraz?`, `Mother Duck has ${a} ducklings. ${b} more swim over. How many ducklings does she have now?`, `Mamá pata tiene ${a} patitos. Llegan nadando ${b} más. ¿Cuántos patitos tiene ahora?`, `Máma kachna má ${cntD('cs', it, a)}. Připlavala ještě ${b}. Kolik kachňátek má teď?`]
      : [`Vierka má ${cntD('sk', it, a)}. Dostala ešte ${b}. Koľko jabĺk má teraz?`, `Vera has ${a} apples. She gets ${b} more. How many apples does she have now?`, `Vera tiene ${a} manzanas. Le dan ${b} más. ¿Cuántas manzanas tiene ahora?`, `Věrka má ${cntD('cs', it, a)}. Dostala ještě ${b}. Kolik jablek má teď?`];
    const sy = duck
      ? [`Mama kačica má ${cnt('sk', it, a)}. Priplávali ešte ${skNum(b, 'n')}. Koľko kačiatok má teraz?`, `Mother Duck has ${cnt('en', it, a)}. ${cap(num('en', b))} more swim over. How many ducklings does she have now?`, `Mamá pata tiene ${cnt('es', it, a)}. Llegan nadando ${num('es', b)} más. ¿Cuántos patitos tiene ahora?`, `Máma kachna má ${cnt('cs', it, a)}. Připlavala ještě ${csNum(b, 'n')}. Kolik kachňátek má teď?`]
      : [`Vierka má ${cnt('sk', it, a)}. Dostala ešte ${skNum(b, 'n')}. Koľko jabĺk má teraz?`, `Vera has ${cnt('en', it, a)}. She gets ${num('en', b)} more. How many apples does she have now?`, `Vera tiene ${cnt('es', it, a)}. Le dan ${num('es', b)} más. ¿Cuántas manzanas tiene ahora?`, `Věrka má ${cnt('cs', it, a)}. Dostala ještě ${csNum(b, 'n')}. Kolik jablek má teď?`];
    return {
      kind: 'choose', prompt: T(lang, ...pr), say: T(lang, ...sy),
      hint: T(lang, 'Spočítaj všetko spolu.', 'Count them all together.', 'Cuéntalos todos juntos.', 'Spočítej všechno dohromady.'),
      answer: T(lang, `Teraz má ${cnt('sk', it, ans)}.`, `Now she has ${cnt('en', it, ans)}.`, `Ahora tiene ${cnt('es', it, ans)}.`, `Teď má ${cnt('cs', it, ans)}.`),
      display: `<div class="sum">${grid(it.e, a)}<span class="op">+</span>${grid(it.e, b)}</div><div class="eq">${a} + ${b} = ?</div>`, options: numOpts(r, lang, ans, 4, 15)
    };
  }

  // ---------- GAME 3 (2): letters ----------
  const LAST = {
    sk: [['🏠', 'DOM'], ['🧀', 'SYR'], ['🐘', 'SLON'], ['🐭', 'MYŠ'], ['🌸', 'KVET'], ['🍌', 'BANÁN'], ['🐓', 'KOHÚT'], ['🌈', 'DÚHA'], ['👂', 'UCHO'], ['🚗', 'AUTO'], ['✋', 'RUKA'], ['🦋', 'MOTÝĽ'], ['🐴', 'KÔŇ'], ['🌳', 'STROM']],
    en: [['🐱', 'CAT'], ['☀️', 'SUN'], ['🚌', 'BUS'], ['🦉', 'OWL'], ['🦊', 'FOX'], ['🎩', 'HAT'], ['🐷', 'PIG'], ['🛏️', 'BED'], ['🐶', 'DOG'], ['🥁', 'DRUM'], ['🌙', 'MOON'], ['📖', 'BOOK'], ['⭐', 'STAR'], ['🦁', 'LION']],
    es: [['☀️', 'SOL'], ['🍞', 'PAN'], ['🐟', 'PEZ'], ['🌊', 'MAR'], ['🚂', 'TREN'], ['🌸', 'FLOR'], ['🌳', 'ÁRBOL'], ['🐱', 'GATO'], ['🏠', 'CASA'], ['🌙', 'LUNA'], ['🦆', 'PATO'], ['✋', 'MANO'], ['🐮', 'VACA'], ['🦜', 'LORO']]
  };
  const FIRST2 = {
    sk: [['🐻', 'MEDVEĎ'], ['🦔', 'JEŽKO'], ['🐌', 'SLIMÁK'], ['🍐', 'HRUŠKA'], ['🐧', 'TUČNIAK'], ['🦀', 'RAK'], ['🎸', 'GITARA'], ['🐺', 'VLK'], ['🦌', 'JELEŇ'], ['🌵', 'KAKTUS'], ['🚜', 'TRAKTOR'], ['🍒', 'ČEREŠNE'], ['🦓', 'ZEBRA'], ['🦢', 'LABUŤ'], ['🦅', 'OROL'], ['🧦', 'PONOŽKY']],
    en: [['🐻', 'BEAR'], ['🦔', 'HEDGEHOG'], ['🐌', 'SNAIL'], ['🍐', 'PEAR'], ['🐧', 'PENGUIN'], ['🦀', 'CRAB'], ['🍄', 'MUSHROOM'], ['🎸', 'GUITAR'], ['🐺', 'WOLF'], ['🦌', 'DEER'], ['🍯', 'HONEY'], ['🥛', 'MILK'], ['🚜', 'TRACTOR'], ['🦓', 'ZEBRA'], ['🦅', 'EAGLE'], ['🧦', 'SOCKS']],
    es: [['🦔', 'ERIZO'], ['🐌', 'CARACOL'], ['🍐', 'PERA'], ['🥕', 'ZANAHORIA'], ['🐧', 'PINGÜINO'], ['🦀', 'CANGREJO'], ['🌽', 'MAÍZ'], ['🎸', 'GUITARRA'], ['🐺', 'LOBO'], ['🦌', 'VENADO'], ['🍯', 'MIEL'], ['🥛', 'LECHE'], ['🚜', 'TRACTOR'], ['🐬', 'DELFÍN'], ['🍊', 'NARANJA'], ['👢', 'BOTA']]
  };
  const VOW = { sk: 'A E I O U'.split(' '), en: 'A E I O U'.split(' '), es: 'A E I O U'.split(' ') };
  const CONS = { sk: 'M L S P T K V D R N B J Z H C F G'.split(' '), en: 'M L S P T K V D R N B J Z H C F G W'.split(' '), es: 'M L S P T N D R B C F G J V Z'.split(' ') };
  function genLetters2(i, lang, r) {
    const L = LET[lang]; const all = L.easy.concat(L.hard);
    if (i < 10) {
      const t = pick(r, i < 5 ? L.easy : all), tl = t.toLowerCase();
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi veľké písmeno k malému.', 'Find the big letter for the small one.', 'Busca la mayúscula de esta minúscula.', 'Najdi velké písmeno k malému.'),
        say: T(lang, `Nájdi veľké písmeno ${t}.`, `Find the big letter ${t}.`, `Busca la ${t} mayúscula.`, `Najdi velké písmeno ${t}.`),
        hint: T(lang, `Malé ${tl} a veľké ${t} sú to isté písmeno.`, `Small ${tl} and big ${t} are the same letter.`, `La ${tl} minúscula y la ${t} mayúscula son la misma letra.`, `Malé ${tl} a velké ${t} jsou stejné písmeno.`),
        answer: T(lang, `Malé ${tl} a veľké ${t}.`, `Small ${tl} and big ${t}.`, `La ${tl} minúscula y la ${t} mayúscula.`, `Malé ${tl} a velké ${t}.`),
        hintShow: big(tl + ' ' + t, 'let'), display: big(tl, 'let huge'),
        options: letterOpts(r, lang, t, i < 5 ? L.easy : all, i < 3 ? 3 : 4, false)
      };
    }
    if (i < 34) {
      const lastMode = i < 22;
      const [e, w] = pick(r, lastMode ? LAST[lang] : FIRST2[lang]); const wl = w.toLowerCase(), t = lastMode ? w[w.length - 1] : w[0];
      const pool = all.filter(l => !conf(lang, l, t));
      const o = lastMode
        ? { prompt: T(lang, 'Na aké písmeno sa končí toto slovo?', 'Which letter does this word end with?', '¿Con qué letra termina esta palabra?', 'Na jaké písmeno končí toto slovo?'),
          say: T(lang, `Na aké písmeno sa končí slovo ${wl}?`, `Which letter does the word ${wl} end with?`, `¿Con qué letra termina la palabra ${wl}?`, `Na jaké písmeno končí slovo ${wl}?`),
          hint: T(lang, `Povedz slovo pomaly: ${wl}. Počúvaj posledný zvuk.`, `Say it slowly: ${wl}. Listen to the last sound.`, `Dilo despacio: ${wl}. Escucha el último sonido.`, `Řekni slovo pomalu: ${wl}. Poslouchej poslední hlásku.`),
          answer: T(lang, `Slovo ${wl} sa končí na ${t}.`, `The word ${wl} ends with ${t}.`, `La palabra ${wl} termina con ${t}.`, `Slovo ${wl} končí na ${t}.`) }
        : { prompt: T(lang, 'Na aké písmeno sa začína toto slovo?', 'Which letter does this word begin with?', '¿Por qué letra empieza esta palabra?', 'Na jaké písmeno začíná toto slovo?'),
          say: T(lang, `Počúvaj: ${wl}. Na aké písmeno sa začína?`, `Listen: ${wl}. Which letter does it begin with?`, `Escucha: ${wl}. ¿Por qué letra empieza?`, `Poslouchej: ${wl}. Na jaké písmeno začíná?`),
          hint: T(lang, `Povedz slovo pomaly: ${wl}. Počúvaj prvý zvuk.`, `Say it slowly: ${wl}. Listen to the first sound.`, `Dilo despacio: ${wl}. Escucha el primer sonido.`, `Řekni slovo pomalu: ${wl}. Poslouchej první hlásku.`),
          answer: T(lang, `Slovo ${wl} sa začína na ${t}.`, `The word ${wl} begins with ${t}.`, `La palabra ${wl} empieza por ${t}.`, `Slovo ${wl} začíná na ${t}.`) };
      return Object.assign({ kind: 'choose', hintShow: big(t, 'let'), display: `<button class="word picword" data-say="${wl}">${e}</button>`,
        options: letterOpts(r, lang, t, [t, ...pool], i < 16 || (i >= 22 && i < 28) ? 3 : 4, false) }, o);
    }
    if (i < 42) {
      const v = pick(r, VOW[lang]), cs = sample(r, CONS[lang], i < 38 ? 2 : 3), list = shuffle(r, [v, ...cs]);
      const others = list.filter(x => x !== v);
      return {
        kind: 'choose', prompt: T(lang, 'Ktoré písmeno je samohláska?', 'Which letter is a vowel?', '¿Qué letra es una vocal?', 'Které písmeno je samohláska?'),
        hint: T(lang, 'Samohlásky sú A, E, I, O, U.', 'The vowels are A, E, I, O, U.', 'Las vocales son A, E, I, O, U.', 'Samohlásky jsou A, E, I, O, U.'),
        answer: T(lang, `${v} je samohláska. ${joinAnd('sk', others)} sú spoluhlásky.`, `${v} is a vowel. ${joinAnd('en', others)} are consonants.`, `La ${v} es una vocal. ${cap(joinAnd('es', others.map(x => 'la ' + x)))} son consonantes.`, `${v} je samohláska. ${joinAnd('cs', others)} jsou souhlásky.`),
        display: emo('🔤'),
        options: list.map(l => ({ html: big(l, 'let'), ok: l === v, say: letterName(lang, l, false) }))
      };
    }
    const words = FIRST2[lang].concat(LAST[lang]);
    const base = pick(r, words), t = base[1][0];
    const has = w => [...w].some(ch => conf(lang, ch, t) || ch === t);
    const others = sample(r, words.filter(x => x !== base && !has(x[1])), i < 46 ? 2 : 3);
    return {
      kind: 'choose', prompt: T(lang, `V ktorom slove počuješ písmeno ${t}?`, `In which word do you hear the letter ${t}?`, `¿En qué palabra oyes la letra ${t}?`, `Ve kterém slově slyšíš písmeno ${t}?`),
      hint: T(lang, 'Povedz každý obrázok nahlas a počúvaj.', 'Say each picture out loud and listen.', 'Di cada dibujo en voz alta y escucha.', 'Řekni každý obrázek nahlas a poslouchej.'),
      answer: T(lang, `Slovo ${base[1].toLowerCase()} má písmeno ${t}.`, `The word ${base[1].toLowerCase()} has the letter ${t}.`, `La palabra ${base[1].toLowerCase()} tiene la letra ${t}.`, `Slovo ${base[1].toLowerCase()} má písmeno ${t}.`),
      hintShow: big(t, 'let'), display: big(t, 'let huge'),
      options: shuffle(r, [base, ...others].map(p => ({ html: emo(p[0]), ok: p === base, say: p[1].toLowerCase() })))
    };
  }

  // ---------- GAME 4 (2): words ----------
  const WORDS2 = {
    sk: [['🦀', 'RAK'], ['🐺', 'VLK'], ['🍯', 'MED'], ['🍵', 'ČAJ'], ['🏰', 'HRAD'], ['🍄', 'HRIB'], ['🧣', 'ŠÁL'], ['🍞', 'CHLIEB'], ['🔑', 'KĽÚČ'],
      ['🦙', 'LAMA'], ['🗺️', 'MAPA'], ['🖊️', 'PERO'], ['🎿', 'LYŽE'], ['🦅', 'OROL'], ['🦓', 'ZEBRA'], ['🐯', 'TIGER'], ['🐄', 'KRAVA'], ['🥕', 'MRKVA'], ['👜', 'TAŠKA'], ['🥚', 'VAJCE'], ['🦔', 'JEŽKO'],
      ['🕷️', 'PAVÚK'], ['🦢', 'LABUŤ'], ['🥧', 'KOLÁČ'], ['🚩', 'VLAJKA'], ['🧢', 'ČIAPKA'], ['🐬', 'DELFÍN'], ['🐌', 'SLIMÁK'], ['🥛', 'MLIEKO'], ['🥁', 'BUBON'], ['🌵', 'KAKTUS'], ['🦒', 'ŽIRAFA'], ['🎸', 'GITARA'],
      ['⏰', 'HODINY'], ['🚜', 'TRAKTOR'], ['🐧', 'TUČNIAK'], ['🧦', 'PONOŽKY'], ['📱', 'TELEFÓN'], ['👓', 'OKULIARE'], ['🐊', 'KROKODÍL'], ['🌽', 'KUKURICA'], ['🍅', 'PARADAJKA'], ['🐙', 'CHOBOTNICA'], ['🦕', 'DINOSAURUS']],
    en: [['🐜', 'ANT'], ['🦇', 'BAT'], ['📦', 'BOX'], ['☕', 'CUP'], ['🥜', 'NUT'], ['🖊️', 'PEN'], ['🕸️', 'WEB'], ['🗺️', 'MAP'], ['🦀', 'CRAB'], ['🥛', 'MILK'], ['🧦', 'SOCK'], ['🥁', 'DRUM'], ['🚢', 'SHIP'], ['🌽', 'CORN'], ['🐺', 'WOLF'], ['🦌', 'DEER'], ['🐌', 'SNAIL'],
      ['🦓', 'ZEBRA'], ['🐯', 'TIGER'], ['🐼', 'PANDA'], ['🤖', 'ROBOT'], ['🍕', 'PIZZA'], ['🕷️', 'SPIDER'], ['🥕', 'CARROT'], ['🎸', 'GUITAR'], ['🌵', 'CACTUS'], ['🧺', 'BASKET'], ['🎃', 'PUMPKIN'], ['🧁', 'CUPCAKE'],
      ['🐧', 'PENGUIN'], ['🐬', 'DOLPHIN'], ['🚜', 'TRACTOR'], ['🐙', 'OCTOPUS'], ['👓', 'GLASSES'], ['🍿', 'POPCORN'], ['🥪', 'SANDWICH'], ['🦕', 'DINOSAUR'], ['🦔', 'HEDGEHOG'], ['📞', 'TELEPHONE'], ['🐊', 'CROCODILE'], ['🍔', 'HAMBURGER'], ['🍉', 'WATERMELON']],
    es: [['🍵', 'TÉ'], ['🍯', 'MIEL'], ['🌸', 'FLOR'], ['🧂', 'SAL'],
      ['🐺', 'LOBO'], ['🍲', 'SOPA'], ['☕', 'TAZA'], ['🥝', 'KIWI'], ['🍍', 'PIÑA'], ['🧒', 'NIÑO'], ['🎲', 'DADO'], ['👢', 'BOTA'], ['🔑', 'LLAVE'], ['🛏️', 'CAMA'], ['🐯', 'TIGRE'], ['🦓', 'CEBRA'], ['🐼', 'PANDA'],
      ['🥚', 'HUEVO'], ['🍕', 'PIZZA'], ['🐵', 'MONO'], ['🐙', 'PULPO'], ['👓', 'LENTES'], ['🥁', 'TAMBOR'], ['🤖', 'ROBOT'], ['🌵', 'CACTUS'], ['🌽', 'MAÍZ'], ['✏️', 'LÁPIZ'], ['🐬', 'DELFÍN'], ['🚜', 'TRACTOR'],
      ['🕷️', 'ARAÑA'], ['🦔', 'ERIZO'], ['👞', 'ZAPATO'], ['🍅', 'TOMATE'], ['🍪', 'GALLETA'], ['🐫', 'CAMELLO'], ['🐌', 'CARACOL'], ['🍊', 'NARANJA'], ['🐧', 'PINGÜINO'], ['🎸', 'GUITARRA'], ['🦀', 'CANGREJO'],
      ['🍿', 'PALOMITAS'], ['📞', 'TELÉFONO'], ['🎃', 'CALABAZA'], ['🐊', 'COCODRILO'], ['🧁', 'MAGDALENA'], ['🥕', 'ZANAHORIA'], ['🦕', 'DINOSAURIO'], ['🍔', 'HAMBURGUESA']]
  };
  Object.assign(SYL.sk, { LAMA: 'la-ma', MAPA: 'ma-pa', PERO: 'pe-ro', LYŽE: 'ly-že', OROL: 'o-rol', ZEBRA: 'zeb-ra', TIGER: 'ti-ger', KRAVA: 'kra-va', MRKVA: 'mrk-va', TAŠKA: 'taš-ka', VAJCE: 'vaj-ce',
    JEŽKO: 'jež-ko', PAVÚK: 'pa-vúk', LABUŤ: 'la-buť', KOLÁČ: 'ko-láč', VLAJKA: 'vlaj-ka', ČIAPKA: 'čiap-ka', DELFÍN: 'del-fín', SLIMÁK: 'sli-mák', MLIEKO: 'mlie-ko', BUBON: 'bu-bon', KAKTUS: 'kak-tus',
    ŽIRAFA: 'ži-ra-fa', GITARA: 'gi-ta-ra', HODINY: 'ho-di-ny', TRAKTOR: 'trak-tor', TUČNIAK: 'tuč-niak', PONOŽKY: 'po-nož-ky', TELEFÓN: 'te-le-fón', OKULIARE: 'o-ku-lia-re', KROKODÍL: 'kro-ko-díl',
    KUKURICA: 'ku-ku-ri-ca', PARADAJKA: 'pa-ra-daj-ka', CHOBOTNICA: 'cho-bot-ni-ca', DINOSAURUS: 'di-no-sau-rus' });
  Object.assign(SYL.en, { ZEBRA: 'ze-bra', TIGER: 'ti-ger', PANDA: 'pan-da', ROBOT: 'ro-bot', PIZZA: 'piz-za', SPIDER: 'spi-der', CARROT: 'car-rot', GUITAR: 'gui-tar', CACTUS: 'cac-tus', BASKET: 'bas-ket',
    PUMPKIN: 'pump-kin', CUPCAKE: 'cup-cake', PENGUIN: 'pen-guin', DOLPHIN: 'dol-phin', TRACTOR: 'trac-tor', OCTOPUS: 'oc-to-pus', GLASSES: 'glass-es', POPCORN: 'pop-corn', SANDWICH: 'sand-wich',
    DINOSAUR: 'di-no-saur', HEDGEHOG: 'hedge-hog', TELEPHONE: 'tel-e-phone', CROCODILE: 'croc-o-dile', HAMBURGER: 'ham-bur-ger', WATERMELON: 'wa-ter-mel-on' });
  Object.assign(SYL.es, { LOBO: 'lo-bo', SOPA: 'so-pa', TAZA: 'ta-za', KIWI: 'ki-wi', PIÑA: 'pi-ña', NIÑO: 'ni-ño', DADO: 'da-do', BOTA: 'bo-ta', LLAVE: 'lla-ve', CAMA: 'ca-ma', TIGRE: 'ti-gre', CEBRA: 'ce-bra',
    PANDA: 'pan-da', HUEVO: 'hue-vo', PIZZA: 'piz-za', MONO: 'mo-no', PULPO: 'pul-po', LENTES: 'len-tes', TAMBOR: 'tam-bor', ROBOT: 'ro-bot', CACTUS: 'cac-tus', MAÍZ: 'ma-íz', LÁPIZ: 'lá-piz', DELFÍN: 'del-fín',
    TRACTOR: 'trac-tor', ARAÑA: 'a-ra-ña', ERIZO: 'e-ri-zo', ZAPATO: 'za-pa-to', TOMATE: 'to-ma-te', GALLETA: 'ga-lle-ta', CAMELLO: 'ca-me-llo', CARACOL: 'ca-ra-col', NARANJA: 'na-ran-ja', PINGÜINO: 'pin-güi-no',
    GUITARRA: 'gui-ta-rra', CANGREJO: 'can-gre-jo', PALOMITAS: 'pa-lo-mi-tas', TELÉFONO: 'te-lé-fo-no', CALABAZA: 'ca-la-ba-za', COCODRILO: 'co-co-dri-lo', MAGDALENA: 'mag-da-le-na', ZANAHORIA: 'za-na-ho-ria',
    DINOSAURIO: 'di-no-sau-rio', HAMBURGUESA: 'ham-bur-gue-sa' });
  const SYLN = { sk: ['', 'slabiku', 'slabiky', 'slabiky', 'slabiky', 'slabík'], en: ['', 'syllable', 'syllables', 'syllables', 'syllables', 'syllables'], es: ['', 'sílaba', 'sílabas', 'sílabas', 'sílabas', 'sílabas'] };
  const VOWELS_ANY = /[AEIOUYÁÉÍÓÚÝÄÔĚŮ]/;
  function genWords2(i, lang, r) {
    const W = WORDS2[lang];
    const band = (lo, hi) => W.slice(Math.floor(lo * W.length), Math.max(Math.floor(lo * W.length) + 3, Math.floor(hi * W.length)));
    if (i < 20) {
      const [e, w] = pick(r, band(i / 25, (i + 6) / 25)); const n = i < 3 ? 3 : 4;
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      const multi = sylOf(lang, w).length > 1;
      const hs = sylSay(lang, w, multi ? T(lang, 'Čítaj po slabikách:', 'Read it in syllables:', 'Lee por sílabas:', 'Čti po slabikách:') : T(lang, 'Ťukni na slovo a počúvaj:', 'Tap the word and listen:', 'Toca la palabra y escucha:', 'Ťukni na slovo a poslouchej:'));
      const as = sylSay(lang, w);
      return {
        kind: 'choose', prompt: T(lang, 'Čo je tu napísané? Ťukni na obrázok.', 'What does it say? Tap the picture.', '¿Qué dice aquí? Toca el dibujo.', 'Co je tu napsáno? Ťukni na obrázek.'),
        hint: hs.text, hintParts: hs.parts, answer: as.text, answerParts: as.parts,
        display: `<button class="word" data-say="${w.toLowerCase()}">${w}</button>`,
        options: shuffle(r, [[e, w], ...others].map(([ee, ww]) => ({ html: emo(ee), ok: ee === e, say: ww.toLowerCase() })))
      };
    }
    if (i < 30) {
      const pool = W.filter(x => sylOf(lang, x[1]).length >= (i < 24 ? 1 : 2));
      const [e, w] = pick(r, pool); const sy = sylOf(lang, w), k = sy.length;
      const cntTxt = T(lang, `${k === 1 ? 'Jednu' : cap(skNum(k, 'f'))} ${SYLN.sk[Math.min(k, 5)]}.`, `${cap(num('en', k))} ${SYLN.en[Math.min(k, 5)]}.`, `${k === 1 ? 'Una' : cap(num('es', k))} ${SYLN.es[Math.min(k, 5)]}.`, `${k === 1 ? 'Jednu' : cap(csNum(k, 'f'))} ${SYLN.cs[Math.min(k, 5)]}.`);
      const wl = cap(w.toLowerCase());
      return {
        kind: 'choose', prompt: T(lang, 'Koľko slabík má toto slovo? Tlieskaj pri každej slabike.', 'How many syllables does this word have? Clap for each one.', '¿Cuántas sílabas tiene esta palabra? Da una palmada por cada una.', 'Kolik slabik má toto slovo? Tleskni u každé slabiky.'),
        hint: T(lang, `Povedz slovo pomaly a tlieskaj: ${w.toLowerCase()}.`, `Say the word slowly and clap: ${w.toLowerCase()}.`, `Di la palabra despacio y da palmadas: ${w.toLowerCase()}.`, `Řekni slovo pomalu a tleskej: ${w.toLowerCase()}.`),
        answer: `${k > 1 ? cap(sy.join(' – ')) + '. ' : wl + '. '}${T(lang, 'Má', 'It has', 'Tiene', 'Má')} ${cntTxt.charAt(0).toLowerCase() + cntTxt.slice(1)}`,
        answerParts: [...(k > 1 ? sy.map(sylClip) : [wl + '.']), `${T(lang, 'Má', 'It has', 'Tiene', 'Má')} ${cntTxt.charAt(0).toLowerCase() + cntTxt.slice(1)}`],
        display: `${emo(e)}<button class="word" data-say="${w.toLowerCase()}">${w}</button>`,
        options: [1, 2, 3, 4].map(v => ({ html: big(v, 'num'), ok: v === k, say: num(lang, v) }))
      };
    }
    if (i < 40) {
      const [e, w] = pick(r, band((i - 30) / 12, (i - 27) / 12));
      const near = W.filter(x => x[1] !== w).sort((a, b) => (Math.abs(a[1].length - w.length) - (a[1][0] === w[0] ? 2 : 0)) - (Math.abs(b[1].length - w.length) - (b[1][0] === w[0] ? 2 : 0)) || (r() - 0.5));
      const others = sample(r, near.slice(0, 7), i < 35 ? 2 : 3); const as = sylSay(lang, w);
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi slovo, ktoré patrí k obrázku.', 'Find the word for this picture.', 'Busca la palabra de este dibujo.', 'Najdi slovo, které patří k obrázku.'),
        hint: T(lang, 'Čítaj každé slovo po slabikách.', 'Read each word in syllables.', 'Lee cada palabra por sílabas.', 'Čti každé slovo po slabikách.'),
        answer: as.text, answerParts: as.parts, display: emo(e, 'huge'), wide: true,
        options: shuffle(r, [[e, w], ...others].map(([, ww]) => ({ html: big(ww, 'wordopt'), ok: ww === w, say: ww.toLowerCase() })))
      };
    }
    const pool = W.filter(x => x[1].length >= 4 && !/CH/.test(x[1]));
    const [e, w] = pick(r, pool);
    const pos = [...w].map((ch, k) => k).filter(k => k > 0 && VOWELS_ANY.test(w[k]) && !(w[k] === 'I' && /[EAU]/.test(w[k + 1] || '')) && !(w[k - 1] === 'I' && /[EAU]/.test(w[k])) && !/[AEIOU]/.test(w[k - 1] + '') );
    const k = pos.length ? pick(r, pos) : 1; const Lm = w[k];
    const cons = sample(r, CONS[lang].filter(c => !w.includes(c)), i < 45 ? 2 : 3);
    const shown = w.slice(0, k) + '_' + w.slice(k + 1); const wl = w.toLowerCase();
    return {
      kind: 'choose', prompt: T(lang, 'Ktoré písmeno chýba v slove?', 'Which letter is missing?', '¿Qué letra falta?', 'Které písmeno ve slově chybí?'),
      hint: T(lang, `Počúvaj: ${wl}.`, `Listen: ${wl}.`, `Escucha: ${wl}.`, `Poslouchej: ${wl}.`),
      answer: T(lang, `${cap(wl)}. Chýba písmeno ${Lm}.`, `${cap(wl)}. The missing letter is ${Lm}.`, `${cap(wl)}. Falta la letra ${Lm}.`, `${cap(wl)}. Chybí písmeno ${Lm}.`),
      hintShow: big(Lm, 'let'),
      display: `${emo(e)}<span class="bigtxt wordopt">${shown}</span>`,
      options: shuffle(r, [Lm, ...cons]).map(l => ({ html: big(l, 'let'), ok: l === Lm, say: letterName(lang, l, false) }))
    };
  }

  // ---------- GAME 5 (2): riddles ----------
  const CATS2 = [
    { sk: 'morské zvieratá', en: 'sea animals', es: 'animales del mar', skAll: 'Skoro všetko tu žije v mori.', enAll: 'Almost all of these live in the sea.', esAll: 'Casi todos viven en el mar.',
      items: [['🐙', 'chobotnica', 'octopus', 'el pulpo'], ['🦀', 'krab', 'crab', 'el cangrejo'], ['🐳', 'veľryba', 'whale', 'la ballena'], ['🐬', 'delfín', 'dolphin', 'el delfín'], ['🦈', 'žralok', 'shark', 'el tiburón'], ['🐠', 'rybka', 'fish', 'el pez'], ['🦑', 'kalmár', 'squid', 'el calamar']] },
    { sk: 'školské veci', en: 'school things', es: 'cosas de la escuela', skAll: 'Skoro všetko tu patrí do školy.', enAll: 'Almost all of these belong at school.', esAll: 'Casi todo es de la escuela.',
      items: [['✏️', 'ceruzka', 'pencil', 'el lápiz'], ['📏', 'pravítko', 'ruler', 'la regla'], ['📚', 'knihy', 'books', 'los libros', 1], ['🎒', 'aktovka', 'school bag', 'la mochila'], ['🖍️', 'pastelka', 'crayon', 'el crayón'], ['✂️', 'nožnice', 'scissors', 'las tijeras', 1], ['🖊️', 'pero', 'pen', 'la pluma']] },
    { sk: 'obrázky počasia', en: 'weather pictures', es: 'cosas del tiempo', skAll: 'Skoro všetko tu je počasie.', enAll: 'Almost all of these are weather.', esAll: 'Casi todo aquí tiene que ver con el tiempo.',
      items: [['☀️', 'slnko', 'sun', 'el sol'], ['🌧️', 'dážď', 'rain', 'la lluvia'], ['❄️', 'sneh', 'snow', 'la nieve'], ['☁️', 'mrak', 'cloud', 'la nube'], ['🌈', 'dúha', 'rainbow', 'el arcoíris'], ['⚡', 'blesk', 'lightning', 'el rayo']] },
    { sk: 'sladkosti', en: 'sweets', es: 'dulces', skAll: 'Skoro všetko tu sú sladkosti.', enAll: 'Almost all of these are sweets.', esAll: 'Casi todo aquí son dulces.',
      items: [['🍰', 'torta', 'cake', 'el pastel'], ['🍩', 'šiška', 'doughnut', 'la dona'], ['🍪', 'keksík', 'cookie', 'la galleta'], ['🍫', 'čokoláda', 'chocolate', 'el chocolate'], ['🍬', 'cukrík', 'candy', 'el caramelo'], ['🍭', 'lízanka', 'lollipop', 'la paleta'], ['🧁', 'muffin', 'cupcake', 'el panquecito']] },
    { sk: 'hudobné nástroje', en: 'musical instruments', es: 'instrumentos musicales', skAll: 'Skoro všetko tu sú hudobné nástroje.', enAll: 'Almost all of these are musical instruments.', esAll: 'Casi todo aquí son instrumentos musicales.',
      items: [['🎸', 'gitara', 'guitar', 'la guitarra'], ['🥁', 'bubon', 'drum', 'el tambor'], ['🎹', 'klavír', 'piano', 'el piano'], ['🎺', 'trúbka', 'trumpet', 'la trompeta'], ['🎻', 'husle', 'violin', 'el violín', 1], ['🎷', 'saxofón', 'saxophone', 'el saxofón']] }
  ];
  const WHO = [
    ['🦒', 'Mám veľmi dlhý krk a jem listy zo stromov. Kto som?', 'I have a very long neck and I eat leaves from trees. Who am I?', 'Tengo el cuello muy largo y como hojas de los árboles. ¿Quién soy?', 'žirafa', 'a giraffe', 'la jirafa'],
    ['🐘', 'Mám veľké uši a dlhý chobot. Kto som?', 'I have big ears and a long trunk. Who am I?', 'Tengo orejas grandes y una trompa larga. ¿Quién soy?', 'slon', 'an elephant', 'el elefante'],
    ['🐢', 'Nosím svoj domček na chrbte a chodím pomaly. Kto som?', 'I carry my house on my back and I walk slowly. Who am I?', 'Llevo mi casa en la espalda y camino despacio. ¿Quién soy?', 'korytnačka', 'a turtle', 'la tortuga'],
    ['🐄', 'Hovorím bú a dávam mlieko. Kto som?', 'I say moo and I give milk. Who am I?', 'Digo mu y doy leche. ¿Quién soy?', 'krava', 'a cow', 'la vaca'],
    ['🦉', 'Cez deň spím, v noci lietam a volám hú, hú. Kto som?', 'I sleep in the day, I fly at night and I call hoo, hoo. Who am I?', 'Duermo de día, vuelo de noche y digo uu, uu. ¿Quién soy?', 'sova', 'an owl', 'el búho'],
    ['🐝', 'Lietam z kvetu na kvet a robím med. Kto som?', 'I fly from flower to flower and I make honey. Who am I?', 'Vuelo de flor en flor y hago miel. ¿Quién soy?', 'včela', 'a bee', 'la abeja'],
    ['🐸', 'Skáčem pri vode a hovorím kva, kva. Kto som?', 'I jump by the water and I say ribbit. Who am I?', 'Salto junto al agua y digo croac. ¿Quién soy?', 'žaba', 'a frog', 'la rana'],
    ['🦔', 'Mám na chrbte pichliače. Kto som?', 'I have spikes on my back. Who am I?', 'Tengo púas en la espalda. ¿Quién soy?', 'ježko', 'a hedgehog', 'el erizo'],
    ['☂️', 'Keď prší, otvoríš ma nad hlavou. Čo som?', 'When it rains, you open me over your head. What am I?', 'Cuando llueve, me abres sobre tu cabeza. ¿Qué soy?', 'dáždnik', 'an umbrella', 'el paraguas'],
    ['☀️', 'Svietim na oblohe cez deň a hrejem. Čo som?', 'I shine in the sky in the day and I keep you warm. What am I?', 'Brillo en el cielo de día y doy calor. ¿Qué soy?', 'slnko', 'the sun', 'el sol'],
    ['🐟', 'Žijem vo vode a mám plutvy. Kto som?', 'I live in the water and I have fins. Who am I?', 'Vivo en el agua y tengo aletas. ¿Quién soy?', 'ryba', 'a fish', 'el pez'],
    ['🦊', 'Mám huňatý chvost a som veľmi prefíkaná. Kto som?', 'I have a bushy tail and I am very sly. Who am I?', 'Tengo una cola peluda y soy muy astuta. ¿Quién soy?', 'líška', 'a fox', 'la zorra']];
  const ROW = [['🐶', 'psík', 'psíkom', 'dog', 'el perro'], ['🐱', 'mačka', 'mačkou', 'cat', 'el gato'], ['🐭', 'myška', 'myškou', 'mouse', 'el ratón'], ['🐰', 'zajačik', 'zajačikom', 'bunny', 'el conejo'],
    ['🦊', 'líška', 'líškou', 'fox', 'el zorro'], ['🐻', 'medveď', 'medveďom', 'bear', 'el oso'], ['🐷', 'prasiatko', 'prasiatkom', 'pig', 'el cerdito'], ['🐮', 'kravička', 'kravičkou', 'cow', 'la vaca'],
    ['🐸', 'žabka', 'žabkou', 'frog', 'la rana'], ['🐔', 'sliepka', 'sliepkou', 'hen', 'la gallina']];
  const ORD = { sk: ['prvé', 'druhé', 'tretie', 'štvrté', 'piate'], en: ['first', 'second', 'third', 'fourth', 'fifth'], es: ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'] };
  const SIT = [
    ['🌧️', 'Vonku prší. Čo si vezmeš so sebou?', 'It is raining outside. What do you take with you?', 'Afuera está lloviendo. ¿Qué te llevas?', '☂️', 'dáždnik', 'the umbrella', 'el paraguas'],
    ['🌞', 'Vonku silno svieti slnko. Čo si nasadíš na oči?', 'The sun is very bright. What do you put on your eyes?', 'El sol brilla mucho. ¿Qué te pones en los ojos?', '🕶️', 'slnečné okuliare', 'the sunglasses', 'las gafas de sol'],
    ['❄️', 'Vonku sneží a mrzne. Čo si dáš na ruky?', 'It is snowing and freezing. What do you put on your hands?', 'Está nevando y hace mucho frío. ¿Qué te pones en las manos?', '🧤', 'rukavice', 'the gloves', 'los guantes'],
    ['🌙', 'Je tma a ideš von. Čo ti pomôže vidieť?', 'It is dark and you go outside. What helps you see?', 'Está oscuro y sales afuera. ¿Qué te ayuda a ver?', '🔦', 'baterka', 'the flashlight', 'la linterna'],
    ['🐰', 'Zajko je hladný. Čo mu dáš?', 'The bunny is hungry. What do you give him?', 'El conejito tiene hambre. ¿Qué le das?', '🥕', 'mrkva', 'the carrot', 'la zanahoria'],
    ['🥵', 'Je ti horúco a máš smäd. Čo si dáš?', 'You are hot and thirsty. What do you have?', 'Tienes calor y sed. ¿Qué tomas?', '🥛', 'mlieko', 'the milk', 'la leche'],
    ['🏫', 'Ideš do školy. Čo si dáš na chrbát?', 'You are going to school. What do you put on your back?', 'Vas a la escuela. ¿Qué te pones en la espalda?', '🎒', 'aktovka', 'the school bag', 'la mochila'],
    ['🖐️', 'Máš špinavé ruky. Čím si ich umyješ?', 'Your hands are dirty. What do you wash them with?', 'Tienes las manos sucias. ¿Con qué te las lavas?', '🧼', 'mydlo', 'the soap', 'el jabón'],
    ['😴', 'Je večer a ideš spať. Kde budeš spať?', 'It is evening and time to sleep. Where do you sleep?', 'Es de noche y vas a dormir. ¿Dónde duermes?', '🛏️', 'posteľ', 'the bed', 'la cama'],
    ['🎂', 'Kamarát má narodeniny. Čo mu prinesieš?', 'Your friend has a birthday. What do you bring?', 'Tu amigo cumple años. ¿Qué le llevas?', '🎁', 'darček', 'the present', 'el regalo']];
  const L3 = (lang, a, b, c) => lang === 'sk' ? a : lang === 'cs' ? cz(a) : lang === 'es' ? c : b;
  function genRiddles2(i, lang, r) {
    const nm = it => L3(lang, it[1], it[2], it[3]);
    if (i < 10) {
      const [c1, c2] = sample(r, CATS2, 2); const n = i < 5 ? 4 : 5;
      const same = sample(r, c1.items, n - 1), odd = pick(r, c2.items), pl = !!odd[4];
      return {
        kind: 'choose', prompt: T(lang, 'Čo je tu iné ako ostatné?', 'Which one is different from the others?', '¿Cuál es distinto a los demás?', 'Co je tu jiné než ostatní?'),
        say: T(lang, `Čo je tu iné ako ostatné? ${c1.skAll}`, `Which one is different from the others? ${c1.enAll}`, `¿Cuál es distinto a los demás? ${c1.esAll}`, `Co je tu jiné než ostatní? ${c1.csAll}`),
        hint: T(lang, `${c1.skAll} Ktorý obrázok sem nepatrí?`, `${c1.enAll} Which picture does not fit?`, `${c1.esAll} ¿Qué dibujo no va aquí?`, `${c1.csAll} Který obrázek sem nepatří?`),
        answer: T(lang, `${cap(odd[1])} sem ${pl ? 'nepatria' : 'nepatrí'}. Ostatné sú ${c1.sk}.`, `The odd one out: the ${odd[2]}. The others are ${c1.en}.`, `${cap(odd[3])} no ${pl ? 'van' : 'va'} con los demás. Los demás son ${c1.es}.`, `${cap(cz(odd[1]))} sem nepatří. Ostatní jsou ${c1.cs}.`),
        display: emo('🧐'),
        options: shuffle(r, [...same.map(e => ({ html: emo(e[0]), ok: false, say: L3(lang, e[1], 'the ' + e[2], e[3]) })), { html: emo(odd[0]), ok: true, say: L3(lang, odd[1], 'the ' + odd[2], odd[3]) }])
      };
    }
    if (i < 20) {
      const w = pick(r, WHO), others = sample(r, WHO.filter(x => x !== w && !(['🐢', '🦔'].includes(x[0]) && ['🐢', '🦔'].includes(w[0]))), i < 15 ? 2 : 3);
      return {
        kind: 'choose', prompt: L3(lang, w[1], w[2], w[3]),
        hint: T(lang, 'Počúvaj ešte raz a pozri sa na všetky obrázky.', 'Listen again and look at all the pictures.', 'Escucha otra vez y mira todos los dibujos.', 'Poslouchej ještě jednou a podívej se na všechny obrázky.'),
        answer: T(lang, `Som ${w[4]}.`, `I am ${w[5]}.`, `Soy ${w[6]}.`, `Jsem ${cz(w[4])}.`),
        display: listen(),
        options: shuffle(r, [w, ...others].map(x => ({ html: emo(x[0]), ok: x === w, say: L3(lang, x[4], x[5].replace(/^(a|an) /, 'the '), x[6]) })))
      };
    }
    if (i < 32) {
      const between = i >= 26, len = between ? 5 : (i < 23 ? 4 : 5);
      const row = sample(r, ROW, len);
      const rowHtml = `<div class="seq">${row.map(x => `<span class="cell">${emo(x[0])}</span>`).join('')}</div>`;
      if (!between) {
        const p = ri(r, 0, len - 1), a = row[p];
        return {
          kind: 'choose',
          prompt: T(lang, `Ktoré zvieratko je v rade ${ORD.sk[p]}? Počítaj zľava.`, `Which animal is ${ORD.en[p]} in the row? Count from the left.`, `¿Qué animal está en el ${ORD.es[p]} lugar? Cuenta desde la izquierda.`, `Které zvířátko je v řadě ${ORD.cs[p]}? Počítej zleva.`),
          hint: T(lang, 'Ukáž prstom na prvé zvieratko vľavo a počítaj.', 'Point at the first animal on the left and count.', 'Señala el primer animal de la izquierda y cuenta.', 'Ukaž prstem na první zvířátko vlevo a počítej.'),
          answer: T(lang, `${cap(ORD.sk[p])} zvieratko je ${a[1]}.`, `The ${ORD.en[p]} animal is the ${a[3]}.`, `En el ${ORD.es[p]} lugar está ${a[4]}.`, `${cap(ORD.cs[p])} zvířátko je ${cz(a[1])}.`),
          display: rowHtml + listen(),
          options: shuffle(r, row.slice(0, Math.min(len, 4)).concat(p >= 4 ? [] : []).filter((x, k, arr) => arr.indexOf(x) === k).concat(p >= 4 ? [a] : []).slice(-4).map(x => ({ html: emo(x[0]), ok: x === a, say: L3(lang, x[1], 'the ' + x[3], x[4]) })))
        };
      }
      const p = ri(r, 1, len - 2), Lx = row[p - 1], M = row[p], Rx = row[p + 1];
      const opts = [M, Lx, Rx, ...row.filter(x => ![M, Lx, Rx].includes(x)).slice(0, 1)];
      return {
        kind: 'choose',
        prompt: T(lang, `Kto stojí medzi ${Lx[2]} a ${Rx[2]}?`, `Who is standing between the ${Lx[3]} and the ${Rx[3]}?`, `¿Quién está entre ${Lx[4]} y ${Rx[4]}?`, `Kdo stojí mezi ${cz(Lx[2])} a ${cz(Rx[2])}?`),
        hint: T(lang, `Nájdi ${Lx[1]} a ${Rx[1]}. Kto je v strede?`.replace(/^Nájdi (\S+)a /, 'Nájdi $1a '), `Find the ${Lx[3]} and the ${Rx[3]}. Who is in the middle?`, `Busca ${Lx[4]} y ${Rx[4]}. ¿Quién está en medio?`, `Najdi ${czA(Lx[1])} a ${czA(Rx[1])}. Kdo je uprostřed?`),
        answer: T(lang, `Medzi ${Lx[2]} a ${Rx[2]} stojí ${M[1]}.`, `The ${M[3]} is between the ${Lx[3]} and the ${Rx[3]}.`, `${cap(M[4])} está entre ${Lx[4]} y ${Rx[4]}.`, `Mezi ${cz(Lx[2])} a ${cz(Rx[2])} stojí ${cz(M[1])}.`),
        display: rowHtml + listen(),
        options: shuffle(r, opts.map(x => ({ html: emo(x[0]), ok: x === M, say: L3(lang, x[1], 'the ' + x[3], x[4]) })))
      };
    }
    if (i < 42) {
      const cat = pick(r, CATS2), its = sample(r, cat.items.filter(x => !x[4]), 4);
      const unit = i < 35 ? [0, 1] : i < 38 ? (r() < 0.5 ? [0, 0, 1] : [0, 1, 1]) : [0, 1, 2];
      const len = 6 + (i % 2), seq = Array.from({ length: len }, (_, k) => unit[k % unit.length]), mi = ri(r, 1, len - 2), miss = seq[mi];
      const used = [...new Set(unit)], optIdx = shuffle(r, [...new Set([...used, ...[0, 1, 2, 3]])].slice(0, 4));
      return {
        kind: 'choose', prompt: T(lang, 'Čo chýba v rade?', 'What is missing in the row?', '¿Qué falta en la fila?', 'Co chybí v řadě?'),
        hint: T(lang, 'Povedz si rad nahlas a nájdi, čo sa opakuje.', 'Say the row out loud and find what repeats.', 'Di la fila en voz alta y busca lo que se repite.', 'Řekni řadu nahlas a najdi, co se opakuje.'),
        answer: T(lang, `Chýba ${its[miss][1]}. ${cap(seq.map(k => its[k][1]).join(', '))}.`, `The ${its[miss][2]} is missing. ${cap(seq.map(k => its[k][2]).join(', '))}.`, `Falta ${its[miss][3]}. ${cap(seq.map(k => its[k][3]).join(', '))}.`, `Chybí ${cz(its[miss][1])}. ${cap(seq.map(k => cz(its[k][1])).join(', '))}.`),
        display: `<div class="seq">${seq.map((k, j) => j === mi ? '<span class="cell q">?</span>' : `<span class="cell">${emo(its[k][0])}</span>`).join('')}</div>`,
        options: optIdx.map(k => ({ html: emo(its[k][0]), ok: k === miss, say: L3(lang, its[k][1], 'the ' + its[k][2], its[k][3]) }))
      };
    }
    const s = pick(r, SIT), others = sample(r, SIT.filter(x => x !== s), i < 46 ? 2 : 3);
    return {
      kind: 'choose', prompt: L3(lang, s[1], s[2], s[3]),
      hint: T(lang, 'Čo by si naozaj potreboval? Pozri sa na všetky obrázky.', 'What would you really need? Look at all the pictures.', '¿Qué necesitarías de verdad? Mira todos los dibujos.', 'Co bys opravdu potřeboval? Podívej se na všechny obrázky.'),
      answer: cap(L3(lang, s[5], s[6], s[7])) + '.',
      display: emo(s[0], 'huge') + listen(),
      options: shuffle(r, [s, ...others].map(x => ({ html: emo(x[4]), ok: x === s, say: L3(lang, x[5], x[6], x[7]) })))
    };
  }

  // ---------- GAME 6 (2): dressing up ----------
  const SLOT_IT = (slot, val) => slot === 'hat' ? ITEM[val.split('|')[0]] : ITEM[slot];
  const SLOT_C = (slot, val) => byId(slot === 'hat' ? val.split('|')[1] : val);
  function ruleColor(lang, slot, val) {
    const it = SLOT_IT(slot, val), c = SLOT_C(slot, val), pl = it.g === 'pl';
    return T(lang, `${cap(it.sk)} ${pl ? 'sú' : 'je'} ${adj(c, it.g)}.`, `The ${it.en} ${pl ? 'are' : 'is'} ${c.en}.`, `${cap(ART[it.eg])} ${it.es} ${pl ? 'son' : 'es'} ${c.es[it.eg]}.`, `${cap(it.cs)} ${it.cg === 'pl' ? 'jsou' : 'je'} ${adjC(c, it.cg)}.`);
  }
  function ruleSame(lang, slot, val, refSlot, refVal) {
    const it = SLOT_IT(slot, val), rf = SLOT_IT(refSlot, refVal), pl = it.g === 'pl';
    return T(lang, `${cap(it.sk)} ${pl ? 'majú' : 'má'} rovnakú farbu ako ${rf.sk}.`, `The ${it.en} ${pl ? 'are' : 'is'} the same color as the ${rf.en}.`, `${cap(ART[it.eg])} ${it.es} ${pl ? 'son' : 'es'} del mismo color que ${ART[rf.eg]} ${rf.es}.`, `${cap(it.cs)} ${it.cg === 'pl' ? 'mají' : 'má'} stejnou barvu jako ${rf.cs}.`);
  }
  function genDress2(i, lang, r) {
    const rules = i >= 16;
    const slots = i < 4 ? ['hat'] : i < 8 ? ['hat', 'scarf'] : i < 12 ? ['hat', 'scarf', 'shirt'] : i < 16 ? ['hat', 'scarf', 'shirt', 'shoes']
      : i < 24 ? ['hat', 'scarf'] : i < 32 ? ['hat', 'scarf', 'shirt'] : ['hat', 'scarf', 'shirt', 'shoes'];
    const nCh = i < 6 ? 3 : 4, hatTypes = (i >= 10 && i < 16) || i >= 24 ? ['beanie', 'tophat'] : ['beanie'];
    const target = {}, choices = {}, text = [];
    let sameUsed = false;
    slots.forEach((s, k) => {
      const prev = slots[k - 1];
      let cid, same = false;
      if (rules && k > 0 && (r() < 0.55 || (k === slots.length - 1 && !sameUsed))) { same = true; sameUsed = true; cid = SLOT_C(prev, target[prev]).id; }
      else cid = pick(r, COLORS).id;
      if (s === 'hat') {
        const tt = pick(r, hatTypes); const set = new Set([tt + '|' + cid]);
        if (hatTypes.length > 1) set.add((tt === 'beanie' ? 'tophat' : 'beanie') + '|' + cid);
        while (set.size < nCh) set.add(pick(r, hatTypes) + '|' + pick(r, COLORS).id);
        target.hat = tt + '|' + cid; choices.hat = shuffle(r, [...set]);
      } else {
        const cs = [cid, ...sample(r, COLORS.filter(c => c.id !== cid), nCh - 1).map(c => c.id)];
        target[s] = cid; choices[s] = shuffle(r, cs);
      }
      if (rules) text.push(same ? ruleSame(lang, s, target[s], prev, target[prev]) : ruleColor(lang, s, target[s]));
    });
    const names = slots.map(s => itemName(lang, s, target[s]));
    const namesAcc = slots.map(s => itemName(lang, s, target[s], true));
    const enA = slots.map(s => (SLOT_IT(s, target[s]).g === 'pl' ? '' : 'a ') + itemName('en', s, target[s]));
    const prompt = rules ? T(lang, `Počúvaj. ${text.join(' ')} Potom ťukni na fajku.`, `Listen. ${text.join(' ')} Then tap the check mark.`, `Escucha. ${text.join(' ')} Luego toca la palomita.`, `Poslouchej. ${text.join(' ')} Pak ťukni na fajfku.`)
      : T(lang, 'Zajko ide na výlet. Obleč ho rovnako ako na obrázku a ťukni na fajku.', 'Zack is going on a trip. Dress him just like the picture, then tap the check mark.', 'Coco se va de excursión. Vístelo igual que en el dibujo y toca la palomita.', 'Zajda jde na výlet. Obleč ho stejně jako na obrázku a ťukni na fajfku.');
    return {
      kind: 'dress', slots, target, choices, byEar: rules, prompt,
      say: rules ? prompt : T(lang, `Zajko ide na výlet. Obleč ho rovnako ako na obrázku: ${joinAnd(lang, namesAcc)}. Potom ťukni na fajku.`, `Zack is going on a trip. Dress him just like the picture: ${joinAnd(lang, enA)}. Then tap the check mark.`, `Coco se va de excursión. Vístelo igual que en el dibujo: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`, `Zajda jde na výlet. Obleč ho stejně jako na obrázku: ${joinAnd(lang, namesAcc)}. Pak ťukni na fajfku.`),
      hint: rules ? T(lang, 'Počúvaj pozorne, akú farbu má mať každá vec.', 'Listen carefully to which color each thing should be.', 'Escucha bien de qué color tiene que ser cada cosa.', 'Poslouchej pozorně, jakou barvu má mít každá věc.') : T(lang, 'Porovnaj Zajka s obrázkom.', 'Compare Zack with the picture.', 'Compara a Coco con el dibujo.', 'Porovnej Zajdu s obrázkem.'),
      answer: T(lang, `Zajko má ${joinAnd(lang, namesAcc)}.`, `Zack has ${joinAnd('en', enA)}.`, `Coco tiene ${joinAnd(lang, namesAcc)}.`, `Zajda má ${joinAnd(lang, namesAcc)}.`),
      slotHints: Object.fromEntries(slots.map(s => [s, SLOT_Q[s][lang]])),
      slotNames: Object.fromEntries(slots.map(s => [s, T(lang, `Zajko má mať ${itemName(lang, s, target[s], true)}.`, `Zack needs the ${itemName(lang, s, target[s])}.`, `Coco necesita ${itemName(lang, s, target[s], true)}.`, `Zajda má mít ${itemName(lang, s, target[s], true)}.`)])),
      itemSay: Object.fromEntries(slots.map(s => [s, Object.fromEntries(choices[s].map(v => [v, itemName(lang, s, v)]))]))
    };
  }

  // =================== Zvieratková škôlka 2 — NEW MECHANICS ===================
  // deterministic "k-th distinct item" picker: a different item each task of a stage
  const nth = (key, list, k) => shuffle(rng(hash(key)), list)[k % list.length];
  const skBe = n => (n >= 2 && n <= 4 ? 'sú' : 'je');
  const letterSay = (lang, L) => cap(letterName(lang, L)) + '.';
  const tile = (html, say, ord, extra) => Object.assign({ html, say, ord }, extra || {});

  // ---------------- 1) COLORS: sort into baskets / paint by spoken rules / shadow match ----------------
  const SORTABLE = OBJ.filter(o => !o[5]);
  const oName = (lang, o) => T(lang, o[1], 'the ' + o[2], o[3]);
  const oBare = (lang, o) => T(lang, o[1], o[2], o[3]);
  // colour sorting: mostly animals (+ a few fruits), each colour pool rotates so pictures don't keep coming back
  const SORT2 = [...SORTABLE.filter(o => !['🐷', '🐻', '🐸', '🐥', '🦩'].includes(o[0])),
    ['🐥', 'kuriatko', 'chick', 'el pollito', 'yellow'], ['🐝', 'včielka', 'bee', 'la abeja', 'yellow'], ['🦒', 'žirafa', 'giraffe', 'la jirafa', 'yellow'],
    ['🐞', 'lienka', 'ladybug', 'la mariquita', 'red'], ['🦀', 'krab', 'crab', 'el cangrejo', 'red'], ['🦞', 'homár', 'lobster', 'la langosta', 'red'],
    ['🐸', 'žaba', 'frog', 'la rana', 'green'], ['🐊', 'krokodíl', 'crocodile', 'el cocodrilo', 'green'], ['🐢', 'korytnačka', 'turtle', 'la tortuga', 'green'], ['🦎', 'jašterica', 'lizard', 'la lagartija', 'green'], ['🐍', 'had', 'snake', 'la serpiente', 'green'],
    ['🦊', 'líška', 'fox', 'el zorro', 'orange'], ['🐯', 'tiger', 'tiger', 'el tigre', 'orange'],
    ['🐷', 'prasiatko', 'piglet', 'el cerdito', 'pink'], ['🦩', 'plameniak', 'flamingo', 'el flamenco', 'pink'],
    ['🐻', 'medveď', 'bear', 'el oso', 'brown'], ['🐴', 'koník', 'horse', 'el caballo', 'brown'], ['🐒', 'opica', 'monkey', 'el mono', 'brown'], ['🦔', 'ježko', 'hedgehog', 'el erizo', 'brown'], ['🐿️', 'veverička', 'squirrel', 'la ardilla', 'brown'],
    ['🐳', 'veľryba', 'whale', 'la ballena', 'blue'], ['🐦', 'vtáčik', 'bird', 'el pájaro', 'blue'], ['🦋', 'motýľ', 'butterfly', 'la mariposa', 'blue']]
    .filter((o, k, A) => A.findIndex(x => x[0] === o[0]) === k);
  const SORT_COLS = ['yellow', 'red', 'green', 'orange', 'pink', 'brown', 'blue'];
  const sortPool = id => shuffle(rng(hash('sortpool' + id)), SORT2.filter(o => o[4] === id));
  function genSort(i, lang, r) {
    const nc = i < 8 ? 2 : 3;
    const cols = sample(r, SORT_COLS, nc).map(byId);
    const per = i < 10 ? 2 : 3; let items = [];
    cols.forEach((c, ci) => { const pool = sortPool(c.id), m = Math.min(per, pool.length); for (let j = 0; j < m; j++) items.push({ o: pool[(i * 2 + ci + j) % pool.length], c }); });
    items = shuffle(r, items.filter((x, k, A) => A.findIndex(y => y.o === x.o) === k));
    const its = items.map(({ o, c }) => ({ html: emo(o[0], 'huge'), bin: c.id, say: cap(oBare(lang, o)) + '.',
      hint: T(lang, 'Akú farbu to má? Daj to do košíka s rovnakou farbou.', 'What color is it? Put it in the basket with the same color.', '¿De qué color es? Ponlo en la canasta del mismo color.', 'Jakou barvu to má? Dej to do košíku se stejnou barvou.') }));
    const bins = cols.map(c => ({ id: c.id, html: `<span class="basket2" style="--bc:${c.hex}">🧺</span>`, say: T(lang, `${c.sk}ý košík`, `the ${c.en} basket`, `la canasta ${c.es.f}`, `${c.cs}ý košík`) }));
    // short spoken answer: just the colours (no list of every animal)
    const ans = T(lang, `Roztriedené: ${joinAnd(lang, cols.map(c => c.sk + 'é'))}.`, `Sorted: ${joinAnd(lang, cols.map(c => c.en))}.`, `Ordenado: ${joinAnd(lang, cols.map(c => c.es.m))}.`, `Roztříděno: ${joinAnd(lang, cols.map(c => c.cs + 'é'))}.`);
    return { kind: 'sort', prompt: T(lang, 'Roztrieď veci do košíkov podľa farby.', 'Sort the things into the baskets by color.', 'Ordena las cosas en las canastas por color.', 'Roztřiď věci do košíků podle barvy.'),
      hint: its[0].hint, items: its, bins, answer: ans, phrases: [its[0].hint] };
  }
  const PAINT_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval'];
  const PAINT_COLS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink', 'brown'];
  const paintRule = (lang, s, c) => T(lang, `Vyfarbi ${s.skAcc} na ${c.sk}o.`, `Color the ${s.en} ${c.en}.`, `Pinta ${ART[s.eg]} ${s.es} de ${c.es.m}.`, `Vybarvi ${s.csAcc} na${c.cs}o.`);
  function genPaint(i, lang, r) {
    const ns = i < 27 ? 2 : 3; // max 3 shapes: everything fits on a small phone screen
    const shapes = sample(r, PAINT_SHAPES, ns).map(shapeById), cols = sample(r, PAINT_COLS, Math.min(8, ns + (i < 25 ? 1 : 2))).map(byId);
    const tgt = shapes.map((s, k) => ({ s, c: cols[k] }));
    const rules = tgt.map(x => paintRule(lang, x.s, x.c));
    return { kind: 'paint', prompt: rules.join(' '), hint: T(lang, 'Najprv ťukni na farbu, potom na tvar.', 'First tap a color, then tap a shape.', 'Primero toca un color y luego una forma.', 'Nejdřív ťukni na barvu, pak na tvar.'),
      shapes: tgt.map(x => ({ id: x.s.id, rule: paintRule(lang, x.s, x.c) })), target: Object.fromEntries(tgt.map(x => [x.s.id, x.c.id])),
      palette: shuffle(r, cols).map(c => ({ id: c.id, hex: c.hex, say: cap(colorName(lang, c)) + '.' })),
      answer: cap(joinAnd(lang, tgt.map(x => colShape(lang, x.c, x.s)))) + '.', phrases: [...rules, ...cols.map(c => cap(colorName(lang, c)) + '.')] };
  }
  const SIL = [...ROW.map(x => [x[0], x[1], x[3], x[4]]), ...[['🐘', 'slon', 'elephant', 'el elefante'], ['🦒', 'žirafa', 'giraffe', 'la jirafa'], ['🐢', 'korytnačka', 'turtle', 'la tortuga'],
    ['🦋', 'motýľ', 'butterfly', 'la mariposa'], ['🐌', 'slimák', 'snail', 'el caracol'], ['🐧', 'tučniak', 'penguin', 'el pingüino'], ['🦀', 'krab', 'crab', 'el cangrejo'], ['🐙', 'chobotnica', 'octopus', 'el pulpo'],
    ['🦉', 'sova', 'owl', 'el búho'], ['🐴', 'koník', 'horse', 'el caballo'], ['🦆', 'kačka', 'duck', 'el pato'], ['🐿️', 'veverička', 'squirrel', 'la ardilla'],
    ['🦓', 'zebra', 'zebra', 'la cebra'], ['🦘', 'klokan', 'kangaroo', 'el canguro'], ['🐪', 'ťava', 'camel', 'el camello'], ['🦏', 'nosorožec', 'rhino', 'el rinoceronte'], ['🦛', 'hroch', 'hippo', 'el hipopótamo'],
    ['🐊', 'krokodíl', 'crocodile', 'el cocodrilo'], ['🦩', 'plameniak', 'flamingo', 'el flamenco'], ['🦚', 'páv', 'peacock', 'el pavo real'], ['🦜', 'papagáj', 'parrot', 'el loro'], ['🦢', 'labuť', 'swan', 'el cisne'],
    ['🦅', 'orol', 'eagle', 'el águila'], ['🐒', 'opica', 'monkey', 'el mono'], ['🦍', 'gorila', 'gorilla', 'el gorila'], ['🦥', 'leňochod', 'sloth', 'el perezoso'], ['🦦', 'vydra', 'otter', 'la nutria'],
    ['🦔', 'ježko', 'hedgehog', 'el erizo'], ['🦇', 'netopier', 'bat', 'el murciélago'], ['🐝', 'včela', 'bee', 'la abeja'], ['🐞', 'lienka', 'ladybug', 'la mariquita'], ['🐜', 'mravec', 'ant', 'la hormiga'],
    ['🕷️', 'pavúk', 'spider', 'la araña'], ['🐍', 'had', 'snake', 'la serpiente'], ['🦎', 'jašterica', 'lizard', 'la lagartija'], ['🐬', 'delfín', 'dolphin', 'el delfín'], ['🐳', 'veľryba', 'whale', 'la ballena'],
    ['🦈', 'žralok', 'shark', 'el tiburón'], ['🐠', 'rybka', 'fish', 'el pez'], ['🦞', 'homár', 'lobster', 'la langosta'], ['🦭', 'tuleň', 'seal', 'la foca'], ['🐑', 'ovečka', 'sheep', 'la oveja'],
    ['🐐', 'koza', 'goat', 'la cabra'], ['🦌', 'jeleň', 'deer', 'el venado'], ['🐓', 'kohút', 'rooster', 'el gallo'], ['🦃', 'morka', 'turkey', 'el pavo'], ['🐺', 'vlk', 'wolf', 'el lobo'],
    ['🦝', 'medvedík čistotný', 'raccoon', 'el mapache'], ['🐨', 'koala', 'koala', 'el koala'], ['🐼', 'panda', 'panda', 'el panda'], ['🐯', 'tiger', 'tiger', 'el tigre'], ['🦁', 'lev', 'lion', 'el león'], ['🦕', 'dinosaurus', 'dinosaur', 'el dinosaurio']]];
  const SIL_ORDER = shuffle(rng(hash('silorder2')), SIL);
  const silName = (lang, a) => T(lang, a[1], 'the ' + a[2], a[3]);
  // each shadow task takes the next 4 animals of a fixed shuffled order: no animal comes back within the 15 shadow tasks
  function genSil(i, lang, r) {
    const k = i - 35, n = i < 40 ? 3 : 4, grp = [0, 1, 2, 3].slice(0, n).map(j => SIL_ORDER[(k * 4 + j) % SIL_ORDER.length]);
    const a = grp[k % n], opts = shuffle(r, grp);
    return { kind: 'choose', quietWrong: true, prompt: T(lang, 'Čí je to tieň? Ťukni na zvieratko.', 'Whose shadow is this? Tap the animal.', '¿De quién es esta sombra? Toca el animal.', 'Čí je to stín? Ťukni na zvířátko.'),
      hint: T(lang, 'Pozri sa na tvar: uši, nohy, chvost.', 'Look at the shape: ears, legs, tail.', 'Mira la forma: orejas, patas, cola.', 'Podívej se na tvar: uši, nohy, ocas.'),
      display: `<span class="emo huge sil">${a[0]}</span>`, answer: T(lang, `Je to ${a[1]}.`, `It is the ${a[2]}.`, `Es ${a[3]}.`, `Je to ${cz(a[1])}.`),
      options: opts.map(x => ({ html: emo(x[0]), ok: x === a, say: silName(lang, x) })) };
  }
  function genColors3(i, lang, r) { return i < 20 ? genSort(i, lang, r) : i < 35 ? genPaint(i, lang, r) : genSil(i, lang, r); }

  // ---------------- 2) COUNTING ANIMALS: count / more / fewer / add / order groups ----------------
  const AN = (e, sk, g, en, es, eg) => ({ e, sk, g, en, es, eg });
  const ANIM = [AN('🐄', ['krava', 'kravy', 'kráv'], 'f', ['cow', 'cows'], ['vaca', 'vacas'], 'f'), AN('🦆', ['kačka', 'kačky', 'kačiek'], 'f', ['duck', 'ducks'], ['pato', 'patos'], 'm'),
    AN('🐟', ['rybka', 'rybky', 'rybiek'], 'f', ['fish', 'fish'], ['pez', 'peces'], 'm'), AN('🐑', ['ovečka', 'ovečky', 'ovečiek'], 'f', ['sheep', 'sheep'], ['oveja', 'ovejas'], 'f'),
    AN('🐷', ['prasiatko', 'prasiatka', 'prasiatok'], 'n', ['pig', 'pigs'], ['cerdito', 'cerditos'], 'm'), AN('🐔', ['sliepka', 'sliepky', 'sliepok'], 'f', ['hen', 'hens'], ['gallina', 'gallinas'], 'f'),
    AN('🐝', ['včielka', 'včielky', 'včielok'], 'f', ['bee', 'bees'], ['abeja', 'abejas'], 'f'), AN('🐌', ['slimák', 'slimáky', 'slimákov'], 'm', ['snail', 'snails'], ['caracol', 'caracoles'], 'm'),
    AN('🐢', ['korytnačka', 'korytnačky', 'korytnačiek'], 'f', ['turtle', 'turtles'], ['tortuga', 'tortugas'], 'f'), AN('🐭', ['myška', 'myšky', 'myšiek'], 'f', ['mouse', 'mice'], ['ratón', 'ratones'], 'm'),
    AN('🐧', ['tučniak', 'tučniaky', 'tučniakov'], 'm', ['penguin', 'penguins'], ['pingüino', 'pingüinos'], 'm'), AN('🦋', ['motýľ', 'motýle', 'motýľov'], 'm', ['butterfly', 'butterflies'], ['mariposa', 'mariposas'], 'f'),
    AN('🐞', ['lienka', 'lienky', 'lienok'], 'f', ['ladybug', 'ladybugs'], ['mariquita', 'mariquitas'], 'f'), AN('🐱', ['mačička', 'mačičky', 'mačičiek'], 'f', ['cat', 'cats'], ['gato', 'gatos'], 'm'),
    AN('🐶', ['psík', 'psíky', 'psíkov'], 'm', ['dog', 'dogs'], ['perro', 'perros'], 'm'), AN('🐴', ['koník', 'koníky', 'koníkov'], 'm', ['horse', 'horses'], ['caballo', 'caballos'], 'm'),
    AN('🐤', ['kuriatko', 'kuriatka', 'kuriatok'], 'n', ['chick', 'chicks'], ['pollito', 'pollitos'], 'm'), AN('🐸', ['žabka', 'žabky', 'žabiek'], 'f', ['frog', 'frogs'], ['rana', 'ranas'], 'f')];
  const cuant = a => (a.eg === 'f' ? 'Cuántas' : 'Cuántos');
  function numOptsP(r, lang, ans) { const st = new Set([ans]); let g = 0; while (st.size < 4 && g++ < 200) { const v = ans + ri(r, -3, 3); if (v >= 1 && v <= 10) st.add(v); }
    return shuffle(r, [...st]).map(v => ({ html: big(v, 'num'), ok: v === ans, say: num(lang, v) })); }
  function genCountA(i, lang, r) {
    const a = nth('cnt', ANIM, i), n = i < 5 ? ri(r, 2, 5) : i < 10 ? ri(r, 4, 8) : ri(r, 6, 10);
    return { kind: 'choose', prompt: T(lang, `Koľko je tu ${a.sk[2]}?`, `How many ${a.en[1]} are there?`, `¿${cuant(a)} ${a.es[1]} hay?`, `Kolik je tu ${a.cs[2]}?`),
      hint: T(lang, 'Ukazuj prstom a počítaj nahlas.', 'Point with your finger and count out loud.', 'Señala con el dedo y cuenta en voz alta.', 'Ukazuj prstem a počítej nahlas.'),
      display: grid(a.e, n), answer: cap(cnt(lang, a, n)) + '.', options: numOptsP(r, lang, n) };
  }
  function genCompare(i, lang, r, more) {
    const k = more ? i - 15 : i - 22, a = nth(more ? 'more' : 'less', ANIM, k), b = nth(more ? 'more2' : 'less2', ANIM.filter(x => x !== a), k);
    const d = i < 19 ? ri(r, 3, 5) : i < 25 ? ri(r, 2, 3) : 1; const lo = ri(r, 1, 9 - d), hi = lo + d;
    const [x, nx, y, ny] = more ? [a, hi, b, lo] : [a, lo, b, hi];
    const word = more ? T(lang, 'viac ako', 'more than', 'más que', 'víc než') : T(lang, 'menej ako', 'fewer than', 'menos que', 'méně než');
    const verb = T(lang, skBe(nx), nx === 1 ? 'is' : 'are', nx === 1 ? 'es' : 'son');
    const opts = shuffle(r, [[x, nx], [y, ny]]);
    return { kind: 'choose', wide: true, prompt: more ? T(lang, 'Kde je viac zvieratiek?', 'Where are there more animals?', '¿Dónde hay más animales?', 'Kde je víc zvířátek?') : T(lang, 'Kde je menej zvieratiek?', 'Where are there fewer animals?', '¿Dónde hay menos animales?', 'Kde je méně zvířátek?'),
      hint: T(lang, 'Spočítaj zvieratká v každej skupinke.', 'Count the animals in each group.', 'Cuenta los animales de cada grupo.', 'Spočítej zvířátka v každé skupince.'), display: emo('⚖️'),
      answer: `${cap(cnt(lang, x, nx))} ${verb} ${word} ${cnt(lang, y, ny)}.`, options: opts.map(([z, n]) => ({ html: grid(z.e, n), ok: z === x, say: cnt(lang, z, n) })) };
  }
  function genAdd(i, lang, r) {
    const a = nth('add', ANIM, i - 30), s = i < 35 ? ri(r, 3, 5) : i < 40 ? ri(r, 5, 8) : ri(r, 7, 10), x = ri(r, 1, s - 1), y = s - x;
    const skAdd = y >= 5 ? 'Pribudlo' : y === 1 ? (a.g === 'f' ? 'Pribudla' : a.g === 'n' ? 'Pribudlo' : 'Pribudol') : 'Pribudli';
    const say = T(lang, `Na obrázku ${skBe(x)} ${cnt('sk', a, x)}. ${skAdd} ešte ${skNum(y, a.g)}. Koľko ${a.sk[2]} je spolu?`,
      `There ${x === 1 ? 'is' : 'are'} ${cnt('en', a, x)}. ${cap(num('en', y))} more ${y === 1 ? 'comes' : 'come'}. How many ${a.en[1]} are there now?`,
      `Hay ${cnt('es', a, x)}. ${y === 1 ? 'Llega' : 'Llegan'} ${y === 1 ? (a.eg === 'f' ? 'una' : 'uno') : num('es', y)} más. ¿${cuant(a)} ${a.es[1]} hay ahora?`, `Na obrázku ${csBe(x)} ${cnt('cs', a, x)}. ${csAdd(a, y)} ještě ${csNum(y, a.cg)}. Kolik ${a.cs[2]} je dohromady?`);
    return { kind: 'choose', prompt: say, hint: T(lang, 'Spočítaj všetky zvieratká spolu.', 'Count all the animals together.', 'Cuenta todos los animales juntos.', 'Spočítej všechna zvířátka dohromady.'),
      display: `<div class="sum">${grid(a.e, x)}<span class="plus">+</span>${grid(a.e, y)}</div>`,
      answer: T(lang, `Spolu ${skBe(s)} ${cnt('sk', a, s)}.`, `Now there ${s === 1 ? 'is' : 'are'} ${cnt('en', a, s)}.`, `Ahora hay ${cnt('es', a, s)}.`, `Dohromady ${csBe(s)} ${cnt('cs', a, s)}.`), options: numOptsP(r, lang, s) };
  }
  function genOrderGroups(i, lang, r) {
    const n = i < 47 ? 3 : 4, ans = sample(r, ANIM, n), counts = sample(r, [1, 2, 3, 4, 5, 6, 7, 8, 9], n).sort((p, q) => p - q);
    const tiles = ans.map((a, k) => tile(grid(a.e, counts[k]), cap(cnt(lang, a, counts[k])) + '.', k));
    return { kind: 'seq', tilesOnly: true, prompt: T(lang, 'Ťukaj na skupinky od najmenšej po najväčšiu.', 'Tap the groups from the smallest to the biggest.', 'Toca los grupos del más pequeño al más grande.', 'Ťukej na skupinky od nejmenší po největší.'),
      hint: T(lang, 'Najprv nájdi skupinku, kde je najmenej zvieratiek.', 'First find the group with the fewest animals.', 'Primero busca el grupo con menos animales.', 'Nejdřív najdi skupinku, kde je nejméně zvířátek.'),
      tiles: shuffle(r, tiles), slots: n, display: '', answer: cap(joinAnd(lang, ans.map((a, k) => cnt(lang, a, counts[k])))) + '.', phrases: tiles.map(t => t.say) };
  }
  function genCount3(i, lang, r) { return i < 15 ? genCountA(i, lang, r) : i < 22 ? genCompare(i, lang, r, true) : i < 30 ? genCompare(i, lang, r, false) : i < 45 ? genAdd(i, lang, r) : genOrderGroups(i, lang, r); }

  // ---------------- 3) LETTERS: pair big/small / hunt a letter / alphabet order / pictures by first letter ----------------
  const ABC = { sk: 'A B C D E F G H I J K L M N O P R S T U V Y Z'.split(' '), en: 'A B C D E F G H I J K L M N O P R S T U V W Y Z'.split(' '), es: 'A B C D E F G H I J L M N O P R S T U V Y Z'.split(' ') };
  const LOOK = { M: 'NWH', N: 'MHU', E: 'FBL', F: 'EPT', B: 'PRD', P: 'BRF', R: 'PBK', O: 'QCD', C: 'OGU', G: 'COQ', D: 'OBP', K: 'RXH', H: 'NMK', L: 'IJT', T: 'IFL', S: 'ZCG', Z: 'SNX', U: 'VNO', V: 'UYW', A: 'HVR', I: 'LTJ', J: 'IUL', Y: 'VTX', W: 'MVN',
    b: 'dph', d: 'bpq', p: 'qbd', n: 'mhu', m: 'nw', h: 'nbk', a: 'oed', e: 'cao', u: 'nvo', l: 'ijt', t: 'fil', s: 'zc', o: 'ace', r: 'nv', v: 'uyw', k: 'hx', i: 'jl', j: 'ig', g: 'qpy', c: 'oe', f: 'tl', z: 's', y: 'vg' };
  const TIMES = { sk: { 2: 'dvakrát', 3: 'trikrát', 4: 'štyrikrát' }, en: { 2: 'two times', 3: 'three times', 4: 'four times' }, es: { 2: 'dos veces', 3: 'tres veces', 4: 'cuatro veces' } };
  function genPair(i, lang, r) {
    const n = i < 5 ? 3 : i < 10 ? 4 : 5, Ls = sample(r, ABC[lang], n);
    return { kind: 'pair', prompt: T(lang, 'Spoj veľké písmeno s malým. Ťukni na veľké a potom na malé.', 'Match each big letter with its small letter. Tap the big one, then the small one.', 'Une cada mayúscula con su minúscula. Toca la mayúscula y luego la minúscula.', 'Spoj velké písmeno s malým. Ťukni na velké a potom na malé.'),
      hint: T(lang, 'Hľadaj rovnaké písmeno, len malé.', 'Find the same letter, just small.', 'Busca la misma letra, pero minúscula.', 'Hledej stejné písmeno, jen malé.'),
      left: Ls.map(L => ({ id: L, html: big(L, 'let'), say: letterSay(lang, L) })), right: shuffle(r, Ls).map(L => ({ id: L, html: big(L.toLowerCase(), 'let') })),
      answer: T(lang, `Písmená ${joinAnd(lang, Ls)}.`, `The letters ${joinAnd(lang, Ls)}.`, `Las letras ${joinAnd(lang, Ls)}.`, `Písmena ${joinAnd(lang, Ls)}.`), phrases: Ls.map(L => letterSay(lang, L)) };
  }
  function genHunt(i, lang, r) {
    const lower = i >= 24, L0 = nth('hunt', ABC[lang].filter(x => LOOK[x] && LOOK[x.toLowerCase()]), i - 15), L = lower ? L0.toLowerCase() : L0;
    const size = i < 20 ? 9 : i < 24 ? 12 : 15, k = i < 20 ? ri(r, 2, 3) : ri(r, 3, 4);
    const sim = LOOK[L].split(''), cells = [];
    for (let c = 0; c < size - k; c++) cells.push({ html: big(r() < 0.7 ? pick(r, sim) : (lower ? pick(r, ABC[lang]).toLowerCase() : pick(r, ABC[lang])).replace(L, sim[0]), 'let'), ok: false });
    for (let c = 0; c < k; c++) cells.push({ html: big(L, 'let'), ok: true });
    const tw = TIMES[lang][k];
    return { kind: 'hunt', prompt: lower ? T(lang, `Nájdi všetky malé ${L}.`, `Find all the small ${L}.`, `Busca todas las ${L} minúsculas.`, `Najdi všechna malá ${L}.`) : T(lang, `Nájdi všetky písmená ${L}.`, `Find all the letters ${L}.`, `Busca todas las letras ${L}.`, `Najdi všechna písmena ${L}.`),
      hint: lower ? T(lang, `Hľadaj iba malé ${L}.`, `Look only for the small ${L}.`, `Busca solo la ${L} minúscula.`, `Hledej jen malé ${L}.`) : T(lang, `Hľadaj iba písmeno ${L}.`, `Look only for the letter ${L}.`, `Busca solo la letra ${L}.`, `Hledej jen písmeno ${L}.`),
      display: big(L, 'let huge'), cells: shuffle(r, cells),
      answer: lower ? T(lang, `Malé ${L} je tu ${tw}.`, `The small ${L} is here ${tw}.`, `La ${L} minúscula está ${tw}.`, `Malé ${L} je tu ${tw}.`) : T(lang, `Písmeno ${L} je tu ${tw}.`, `The letter ${L} is here ${tw}.`, `La letra ${L} está ${tw}.`, `Písmeno ${L} je tu ${tw}.`) };
  }
  function genAlpha(i, lang, r) {
    const A = ABC[lang]; let Ls;
    if (i < 36) { const n = i < 32 ? 3 : 4, s = nth('alpha' + n, [...Array(A.length - n + 1).keys()], i); Ls = A.slice(s, s + n); }
    else Ls = sample(r, A, 5).sort((p, q) => A.indexOf(p) - A.indexOf(q));
    const tiles = Ls.map((L, k) => tile(big(L, 'let'), letterSay(lang, L), k));
    return { kind: 'seq', prompt: T(lang, 'Zoraď písmená podľa abecedy. Ťukaj od prvého.', 'Put the letters in alphabet order. Tap the first one first.', 'Ordena las letras como en el abecedario. Toca primero la primera.', 'Seřaď písmena podle abecedy. Ťukej od prvního.'),
      hint: T(lang, 'Zaspievaj si abecedu od A.', 'Sing the alphabet from A.', 'Canta el abecedario desde la A.', 'Zazpívej si abecedu od A.'), display: '', tiles: shuffle(r, tiles), slots: Ls.length,
      answer: T(lang, 'Po poriadku: ', 'In order: ', 'En orden: ', 'Po pořádku: ') + Ls.join(', ') + '.', phrases: tiles.map(t => t.say) };
  }
  const SND = { sk: [['I', 'Y'], ['Í', 'Ý']], en: [['C', 'K'], ['C', 'S']], es: SAME_ES };
  const sameSnd = (lang, a, b) => a === b || SND[lang].some(g => g.includes(a) && g.includes(b));

  // ----- Czech data -----
  const CSW = {RYBA:'RYBA',JABLKO:'JABLKO',MAČKA:'KOČKA',DOM:'DŮM',PES:'PES',SLNKO:'SLUNCE',SOVA:'SOVA',AUTO:'AUTO',BANÁN:'BANÁN',LÍŠKA:'LIŠKA',VČELA:'VČELA',HVIEZDA:'HVĚZDA',CITRÓN:'CITRON',KORYTNAČKA:'ŽELVA',BALÓN:'BALÓNEK',TULIPÁN:'TULIPÁN',ŽABA:'ŽÁBA',OVCA:'OVCE',LEV:'LEV',VLAK:'VLAK',SLON:'SLON',MESIAC:'MĚSÍC',HAD:'HAD',RUŽA:'RŮŽE',MELÓN:'MELOUN',KOZA:'KOZA',SYR:'SÝR',KORUNA:'KORUNA',MYŠ:'MYŠ',STROM:'STROM',HROZNO:'HROZNY',KAČKA:'KACHNA',LIENKA:'BERUŠKA',JAHODA:'JAHODA',DARČEK:'DÁREK',ŽIRAFA:'ŽIRAFA',SLIEPKA:'SLEPICE',MUFFIN:'MUFFIN',RAKETA:'RAKETA',PIZZA:'PIZZA',OKO:'OKO',NOS:'NOS',KÔŇ:'KŮŇ',LES:'LES',ZUB:'ZUB',LOĎ:'LOĎ',MAMA:'MÁMA',TATO:'TÁTA',RUKA:'RUKA',NOHA:'NOHA',UCHO:'UCHO',KVET:'KVĚT',DÚHA:'DUHA',LOPTA:'MÍČ',KNIHA:'KNIHA',TORTA:'DORT',BABKA:'BABIČKA',OBLAK:'MRAK',MOTÝĽ:'MOTÝL',KOHÚT:'KOHOUT',HRUŠKA:'HRUŠKA',MEDVEĎ:'MEDVĚD',BICYKEL:'KOLO',DÁŽDNIK:'DEŠTNÍK',PAPAGÁJ:'PAPOUŠEK',ZMRZLINA:'ZMRZLINA',LIETADLO:'LETADLO',SLNEČNICA:'SLUNEČNICE',VEVERIČKA:'VEVERKA',ČOKOLÁDA:'ČOKOLÁDA',JAŠTERICA:'JEŠTĚRKA',RAK:'RAK',VLK:'VLK',MED:'MED',ČAJ:'ČAJ',HRAD:'HRAD',HRIB:'HŘIB',ŠÁL:'ŠÁLA',CHLIEB:'CHLÉB',KĽÚČ:'KLÍČ',LAMA:'LAMA',MAPA:'MAPA',PERO:'PERO',LYŽE:'LYŽE',OROL:'OREL',ZEBRA:'ZEBRA',TIGER:'TYGR',KRAVA:'KRÁVA',MRKVA:'MRKEV',TAŠKA:'TAŠKA',VAJCE:'VEJCE',JEŽKO:'JEŽEK',PAVÚK:'PAVOUK',LABUŤ:'LABUŤ',KOLÁČ:'KOLÁČ',VLAJKA:'VLAJKA',ČIAPKA:'ČEPICE',DELFÍN:'DELFÍN',SLIMÁK:'ŠNEK',MLIEKO:'MLÉKO',BUBON:'BUBEN',KAKTUS:'KAKTUS',GITARA:'KYTARA',HODINY:'HODINY',TRAKTOR:'TRAKTOR',TUČNIAK:'TUČŇÁK',PONOŽKY:'PONOŽKY',TELEFÓN:'TELEFON',OKULIARE:'BRÝLE',KROKODÍL:'KROKODÝL',KUKURICA:'KUKUŘICE',PARADAJKA:'RAJČE',CHOBOTNICA:'CHOBOTNICE',DINOSAURUS:'DINOSAURUS',JELEŇ:'JELEN',ČEREŠNE:'TŘEŠNĚ'};
  const csL = L => L.map(([e, w]) => [e, CSW[w] || w]);
  FIRST.cs = csL(FIRST.sk); WORDS.cs = csL(WORDS.sk); SYL.cs = {RYBA:'ry-ba',JABLKO:'jab-lko',KOČKA:'koč-ka',SLUNCE:'slun-ce',SOVA:'so-va',AUTO:'au-to',BANÁN:'ba-nán',LIŠKA:'liš-ka',VČELA:'vče-la',HVĚZDA:'hvěz-da',CITRON:'ci-tron',ŽELVA:'žel-va',BALÓNEK:'ba-ló-nek',TULIPÁN:'tu-li-pán',ŽÁBA:'žá-ba',OVCE:'ov-ce',MĚSÍC:'mě-síc',RŮŽE:'rů-že',MELOUN:'me-loun',KOZA:'ko-za',KORUNA:'ko-ru-na',HROZNY:'hroz-ny',KACHNA:'kach-na',BERUŠKA:'be-ruš-ka',JAHODA:'ja-ho-da',DÁREK:'dá-rek',ŽIRAFA:'ži-ra-fa',SLEPICE:'sle-pi-ce',MUFFIN:'muf-fin',RAKETA:'ra-ke-ta',PIZZA:'piz-za',OKO:'o-ko',MÁMA:'má-ma',TÁTA:'tá-ta',RUKA:'ru-ka',NOHA:'no-ha',UCHO:'u-cho',DUHA:'du-ha',KNIHA:'kni-ha',BABIČKA:'ba-bič-ka',MOTÝL:'mo-týl',KOHOUT:'ko-hout',HRUŠKA:'hruš-ka',MEDVĚD:'med-věd',KOLO:'ko-lo',DEŠTNÍK:'dešt-ník',PAPOUŠEK:'pa-pou-šek',ZMRZLINA:'zmrz-li-na',LETADLO:'le-tad-lo',SLUNEČNICE:'slu-neč-ni-ce',VEVERKA:'ve-ver-ka',ČOKOLÁDA:'čo-ko-lá-da',JEŠTĚRKA:'ješ-těr-ka',ŠÁLA:'šá-la',LAMA:'la-ma',MAPA:'ma-pa',PERO:'pe-ro',LYŽE:'ly-že',OREL:'o-rel',ZEBRA:'ze-bra',TYGR:'ty-gr',KRÁVA:'krá-va',MRKEV:'mr-kev',TAŠKA:'taš-ka',VEJCE:'vej-ce',JEŽEK:'je-žek',PAVOUK:'pa-vouk',LABUŤ:'la-buť',KOLÁČ:'ko-láč',VLAJKA:'vlaj-ka',ČEPICE:'če-pi-ce',DELFÍN:'del-fín',MLÉKO:'mlé-ko',BUBEN:'bu-ben',KAKTUS:'kak-tus',KYTARA:'ky-ta-ra',HODINY:'ho-di-ny',TRAKTOR:'trak-tor',TUČŇÁK:'tuč-ňák',PONOŽKY:'po-nož-ky',TELEFON:'te-le-fon',BRÝLE:'brý-le',KROKODÝL:'kro-ko-dýl',KUKUŘICE:'ku-ku-ři-ce',RAJČE:'raj-če',CHOBOTNICE:'cho-bot-ni-ce',DINOSAURUS:'di-no-sau-rus',JELEN:'je-len',TŘEŠNĚ:'třeš-ně',CHLÉB:'chléb'};
  LET.cs = { easy: LET.sk.easy, hard: 'Č Š Ž Ř Á É Í Ó Ú Ů Ě Ď Ť Ň Y Ý F G'.split(' ') };
  const CS_CATS = [['ovoce', 'Skoro všechno tady je ovoce.'], ['zvířátka', 'Skoro všechno tady jsou zvířátka.'], ['vozidla', 'Skoro všechno tady jsou vozidla.'], ['oblečení', 'Skoro všechno tady je oblečení.'], ['květiny a stromy', 'Skoro všechno tady jsou květiny a stromy.']];
  CATS.forEach((c, k) => { [c.cs, c.csAll] = CS_CATS[k]; });
  const CS_HOUSE = { '🐰': ['Zajíček', 'jeho'], '🦔': ['Ježek', 'jeho'], '🐭': ['Myška', 'jejího'], '🐱': ['Kočička', 'jejího'] };
  HOUSE_ANIMALS.forEach(h => { [h.cs, h.csPoss] = CS_HOUSE[h.e]; });
  Object.assign(ITEM.beanie, { cs: 'čepice', csAcc: 'čepici', cg: 'f' }); Object.assign(ITEM.tophat, { cs: 'klobouk', cg: 'm' }); Object.assign(ITEM.scarf, { cs: 'šála', csAcc: 'šálu', cg: 'f' });
  Object.assign(ITEM.shirt, { cs: 'tričko', cg: 'n' }); Object.assign(ITEM.shoes, { cs: 'boty', cg: 'pl' });
  SLOT_Q.hat.cs = 'Podívej se, co má zajíček na hlavě.'; SLOT_Q.scarf.cs = 'Podívej se na šálu.'; SLOT_Q.shirt.cs = 'Podívej se na tričko.'; SLOT_Q.shoes.cs = 'Podívej se na boty.';

  const CS3 = { '🐞': ['beruška', 'berušky', 'berušek', 'f'], '🍎': ['jablko', 'jablka', 'jablek', 'n'], '🐸': ['žabka', 'žabky', 'žabek', 'f'], '⭐': ['hvězdička', 'hvězdičky', 'hvězdiček', 'f'],
    '🐤': ['kuřátko', 'kuřátka', 'kuřátek', 'n'], '🍄': ['hříbek', 'hříbky', 'hříbků', 'm'], '🐥': ['kachňátko', 'kachňátka', 'kachňátek', 'n'], '🥕': ['mrkev', 'mrkve', 'mrkví', 'f'],
    '🐄': ['kráva', 'krávy', 'krav', 'f'], '🦆': ['kachna', 'kachny', 'kachen', 'f'], '🐟': ['rybička', 'rybičky', 'rybiček', 'f'], '🐑': ['ovečka', 'ovečky', 'oveček', 'f'],
    '🐷': ['prasátko', 'prasátka', 'prasátek', 'n'], '🐔': ['slepice', 'slepice', 'slepic', 'f'], '🐝': ['včelka', 'včelky', 'včelek', 'f'], '🐌': ['šnek', 'šneci', 'šneků', 'm'],
    '🐢': ['želva', 'želvy', 'želv', 'f'], '🐭': ['myška', 'myšky', 'myšek', 'f'], '🐧': ['tučňák', 'tučňáci', 'tučňáků', 'm'], '🦋': ['motýl', 'motýli', 'motýlů', 'm'],
    '🐱': ['kočička', 'kočičky', 'kočiček', 'f'], '🐶': ['pejsek', 'pejsci', 'pejsků', 'm'], '🐴': ['koník', 'koníci', 'koníků', 'm'] };
  [...CI, DUCK, CARROT, ...ANIM].forEach(it => { const v = CS3[it.e]; it.cs = v.slice(0, 3); it.cg = v[3]; });
  const pl3cs = (it, n) => n === 1 ? it.cs[0] : n >= 2 && n <= 4 ? it.cs[1] : it.cs[2];
  const csAdd = (a, y) => y >= 5 ? 'Přibylo' : y === 1 ? ({ f: 'Přibyla', n: 'Přibylo', m: 'Přibyl' })[a.cg] : ({ f: 'Přibyly', n: 'Přibyla', m: 'Přibyli' })[a.cg];
  SIZES.cs = [['velký', 'velká', 'velké'], ['střední', 'střední', 'střední'], ['malý', 'malá', 'malé'], ['maličký', 'maličká', 'maličké']];
  LAST.cs = csL(LAST.sk); FIRST2.cs = csL(FIRST2.sk); WORDS2.cs = csL(WORDS2.sk);
  VOW.cs = VOW.sk; CONS.cs = CONS.sk; ABC.cs = 'A B C Č D E F G H I J K L M N O P R Ř S Š T U V Y Z Ž'.split(' ');
  TIMES.cs = { 2: 'dvakrát', 3: 'třikrát', 4: 'čtyřikrát' }; SND.cs = [['I', 'Y'], ['Í', 'Ý'], ['Ú', 'Ů']];
  SYLN.cs = ['', 'slabiku', 'slabiky', 'slabiky', 'slabiky', 'slabik']; ORD.cs = ['první', 'druhé', 'třetí', 'čtvrté', 'páté'];
  const CS_CATS2 = [['mořská zvířata', 'Skoro všechno tady žije v moři.'], ['školní věci', 'Skoro všechno tady patří do školy.'], ['obrázky počasí', 'Skoro všechno tady je počasí.'], ['sladkosti', 'Skoro všechno tady jsou sladkosti.'], ['hudební nástroje', 'Skoro všechno tady jsou hudební nástroje.']];
  CATS2.forEach((c, k) => { [c.cs, c.csAll] = CS_CATS2[k]; });
  const PICS = {}; ['sk', 'cs', 'en', 'es'].forEach(L => { const m = new Map(); [...WORDS[L], ...WORDS2[L], ...FIRST2[L]].forEach(([e, w]) => { if (!m.has(w) && !((L === 'sk' || L === 'cs') && /^CH/.test(w))) m.set(w, e); }); PICS[L] = [...m].map(([w, e]) => [e, w]); });
  function genPicHunt(i, lang, r) {
    const P = PICS[lang], letters = [...new Set(P.map(x => x[1][0]))].filter(l => P.filter(x => x[1][0] === l).length >= 3);
    const L = nth('pich', letters, i - 40), k = i < 45 ? 2 : 3, size = i < 45 ? 6 : 8;
    const yes = sample(r, P.filter(x => x[1][0] === L), k), no = sample(r, P.filter(x => !sameSnd(lang, x[1][0], L)), size - k);
    const cells = shuffle(r, [...yes.map(x => ({ html: emo(x[0]), ok: true, say: x[1].toLowerCase() })), ...no.map(x => ({ html: emo(x[0]), ok: false, say: x[1].toLowerCase() }))]);
    const ws = yes.map(x => x[1].toLowerCase());
    return { kind: 'hunt', pics: true, prompt: T(lang, `Ťukni na všetky obrázky, ktoré sa začínajú na ${L}.`, `Tap all the pictures that begin with ${L}.`, `Toca todos los dibujos que empiezan por ${L}.`, `Ťukni na všechny obrázky, které začínají na ${L}.`),
      hint: T(lang, `Povedz si slová nahlas. Počuješ na začiatku ${L}?`, `Say the words out loud. Do you hear ${L} at the start?`, `Di las palabras en voz alta. ¿Oyes la ${L} al principio?`, `Řekni si slova nahlas. Slyšíš na začátku ${L}?`),
      display: big(L, 'let huge'), cells, answer: T(lang, `Na ${L} sa začína: ${joinAnd(lang, ws)}.`, `Beginning with ${L}: ${joinAnd(lang, ws)}.`, `Empiezan por ${L}: ${joinAnd(lang, ws)}.`, `Na ${L} začíná: ${joinAnd(lang, ws)}.`), phrases: cells.map(c => cap(c.say) + '.') };
  }
  function genLetters3(i, lang, r) { return i < 15 ? genPair(i, lang, r) : i < 28 ? genHunt(i, lang, r) : i < 40 ? genAlpha(i, lang, r) : genPicHunt(i, lang, r); }

  // ---------------- 4) WORDS: build the word from letter tiles / from syllable tiles ----------------
  const WPOOL = {}; ['sk', 'cs', 'en', 'es'].forEach(L => { const m = new Map(); [...WORDS[L], ...WORDS2[L]].forEach(([e, w]) => { if (!m.has(w)) m.set(w, e); }); WPOOL[L] = [...m].map(([w, e]) => [e, w]); });
  function genBuildLetters(i, lang, r) {
    const len = i < 10 ? 3 : i < 20 ? 4 : 5;
    const pool = WPOOL[lang].filter(x => [...x[1]].length === len && !(lang === 'sk' && /CH/.test(x[1])));
    const [e, w] = nth('bl' + len, pool, i), letters = [...w];
    const extra = i < 15 ? 0 : i < 20 ? 1 : 2;
    const dis = sample(r, CONS[lang].filter(c => !letters.includes(c)), extra);
    const tiles = [...letters.map((L, k) => tile(big(L, 'let'), letterSay(lang, L), k, { v: L })), ...dis.map(L => tile(big(L, 'let'), letterSay(lang, L), -1, { v: L }))];
    const wl = w.toLowerCase(), as = sylSay(lang, w);
    return { kind: 'seq', prompt: T(lang, 'Poskladaj slovo z písmen. Ťukaj na písmená po poradí.', 'Build the word from the letters. Tap them in order.', 'Forma la palabra con las letras. Tócalas en orden.', 'Poskládej slovo z písmen. Ťukej na písmena po pořadě.'),
      hint: T(lang, `Počúvaj: ${wl}.`, `Listen: ${wl}.`, `Escucha: ${wl}.`, `Poslouchej: ${wl}.`), display: `<button class="word picword" data-say="${wl}">${e}</button>`, tiles: shuffle(r, tiles), slots: letters.length, byValue: true,
      answer: as.text, answerParts: as.parts, phrases: tiles.map(t => t.say) };
  }
  function genBuildSyl(i, lang, r) {
    const three = i >= 37, pool = WPOOL[lang].filter(x => three ? sylOf(lang, x[1]).length >= 3 : sylOf(lang, x[1]).length === 2);
    const [e, w] = nth('bs' + three, pool, i), sy = sylOf(lang, w);
    const extra = i < 31 ? 0 : i < 44 ? 1 : 2;
    const others = [...new Set(WPOOL[lang].flatMap(x => sylOf(lang, x[1])))].filter(s => !sy.includes(s) && s.length <= 4);
    const dis = sample(r, others, extra);
    const tiles = [...sy.map((s, k) => tile(big(s, 'let syl'), sylClip(s), k, { v: s })), ...dis.map(s => tile(big(s, 'let syl'), sylClip(s), -1, { v: s }))];
    const wl = w.toLowerCase(), as = sylSay(lang, w);
    return { kind: 'seq', prompt: T(lang, 'Poskladaj slovo zo slabík.', 'Build the word from the syllables.', 'Forma la palabra con las sílabas.', 'Poskládej slovo ze slabik.'),
      hint: T(lang, `Počúvaj: ${wl}.`, `Listen: ${wl}.`, `Escucha: ${wl}.`, `Poslouchej: ${wl}.`), display: `<button class="word picword" data-say="${wl}">${e}</button>`, tiles: shuffle(r, tiles), slots: sy.length, byValue: true,
      answer: as.text, answerParts: as.parts, phrases: tiles.map(t => t.say) };
  }
  function genWords3(i, lang, r) { return i < 25 ? genBuildLetters(i, lang, r) : genBuildSyl(i, lang, r); }

  // ---------------- 5) RIDDLES & LOGIC: what comes next / who has the most / story order / think of a thing ----------------
  const rowName = (lang, x) => T(lang, x[1], x[3], x[4]);
  function genNext(i, lang, r) {
    let row, ans, units, opts;
    if (i < 10) {
      const pat = i < 5 ? [0, 1] : [0, 1, 2], u = sample(r, ROW, pat.length), len = i < 5 ? 5 : ri(r, 5, 7);
      row = [...Array(len + 1).keys()].map(k => u[pat[k % pat.length]]); ans = row[len]; units = u;
    } else {
      const pat = pick(r, [[0, 0, 1], [0, 1, 1]]), u = sample(r, ROW, 2), len = ri(r, 4, 7);
      row = [...Array(len + 1).keys()].map(k => u[pat[k % 3]]); ans = row[len]; units = u;
    }
    opts = shuffle(r, [...units, ...sample(r, ROW.filter(x => !units.includes(x)), units.length === 2 ? 1 : 1)]);
    const shown = row.slice(0, -1);
    return { kind: 'choose', prompt: T(lang, 'Čo príde ďalej? Ťukni na obrázok, ktorý patrí na otáznik.', 'What comes next? Tap the picture for the question mark.', '¿Qué viene después? Toca el dibujo que va en el signo de interrogación.', 'Co přijde dál? Ťukni na obrázek, který patří na otazník.'),
      hint: T(lang, 'Pozri sa, ako sa obrázky opakujú.', 'Look how the pictures repeat.', 'Mira cómo se repiten los dibujos.', 'Podívej se, jak se obrázky opakují.'),
      display: `<div class="patrow">${shown.map(x => `<span class="emo">${x[0]}</span>`).join('')}<span class="emo q">❓</span></div>`, wide: false,
      answer: cap(row.map(x => rowName(lang, x)).join(', ')) + '.', options: opts.map(x => ({ html: emo(x[0]), ok: x === ans, say: rowName(lang, x) })) };
  }
  const GOODS = [['🥕', 'mrkiev', 'carrots', 'zanahorias'], ['🍎', 'jabĺk', 'apples', 'manzanas'], ['🌰', 'orieškov', 'nuts', 'nueces'], ['🍄', 'hríbikov', 'mushrooms', 'hongos'],
    ['🍬', 'cukríkov', 'candies', 'caramelos'], ['⭐', 'hviezdičiek', 'stars', 'estrellas'], ['🎈', 'balónov', 'balloons', 'globos'], ['🍓', 'jahôd', 'strawberries', 'fresas']];
  const rowTheName = (lang, x) => T(lang, x[1], 'the ' + x[3], x[4]);
  function genMost(i, lang, r) {
    const n = i < 23 ? 3 : 4, ch = sample(r, ROW, n), gd = nth('goods', GOODS, i), most = i % 2 === 0;
    const st = [];
    for (let k = 0; k < n - 1; k++) {
      const [a, b] = [ch[k], ch[k + 1]];
      st.push(r() < 0.5 ? T(lang, `${cap(a[1])} má viac ${gd[1]} ako ${b[1]}.`, `${cap(rowTheName('en', a))} has more ${gd[2]} than ${rowTheName('en', b)}.`, `${cap(a[4])} tiene más ${gd[3]} que ${b[4]}.`, `${cap(cz(a[1]))} má víc ${cz(gd[1])} než ${cz(b[1])}.`)
        : T(lang, `${cap(b[1])} má menej ${gd[1]} ako ${a[1]}.`, `${cap(rowTheName('en', b))} has fewer ${gd[2]} than ${rowTheName('en', a)}.`, `${cap(b[4])} tiene menos ${gd[3]} que ${a[4]}.`, `${cap(cz(b[1]))} má méně ${cz(gd[1])} než ${cz(a[1])}.`));
    }
    const stmts = i >= 26 ? shuffle(r, st) : st, ans = most ? ch[0] : ch[n - 1];
    const q = most ? T(lang, `Kto má najviac ${gd[1]}?`, `Who has the most ${gd[2]}?`, `¿Quién tiene más ${gd[3]} de todos?`, `Kdo má nejvíc ${cz(gd[1])}?`) : T(lang, `Kto má najmenej ${gd[1]}?`, `Who has the fewest ${gd[2]}?`, `¿Quién tiene menos ${gd[3]} de todos?`, `Kdo má nejméně ${cz(gd[1])}?`);
    const say = [...stmts, q].join(' ');
    return { kind: 'choose', prompt: say, hint: stmts.join(' '), display: `${listen()}${emo(gd[0])}`,
      answer: most ? T(lang, `Najviac ${gd[1]} má ${ans[1]}.`, `${cap(rowTheName('en', ans))} has the most ${gd[2]}.`, `${cap(ans[4])} tiene más ${gd[3]} que todos.`, `Nejvíc ${cz(gd[1])} má ${cz(ans[1])}.`)
        : T(lang, `Najmenej ${gd[1]} má ${ans[1]}.`, `${cap(rowTheName('en', ans))} has the fewest ${gd[2]}.`, `${cap(ans[4])} tiene menos ${gd[3]} que todos.`, `Nejméně ${cz(gd[1])} má ${cz(ans[1])}.`),
      options: shuffle(r, ch).map(x => ({ html: emo(x[0]), ok: x === ans, say: rowTheName(lang, x) })) };
  }
  const ST = (...s) => s;
  const STORIES = [
    ST(['🌰', 'semienko', 'a seed', 'una semilla'], ['🌱', 'klíček', 'a sprout', 'un brote'], ['🌻', 'slnečnica', 'a sunflower', 'un girasol']),
    ST(['🥚', 'vajíčko', 'an egg', 'un huevo'], ['🐣', 'kuriatko v škrupinke', 'a chick in its shell', 'un pollito en el cascarón'], ['🐥', 'kuriatko', 'a little chick', 'un pollito']),
    ST(['🌅', 'ráno', 'morning', 'la mañana'], ['☀️', 'poludnie', 'noon', 'el mediodía'], ['🌙', 'noc', 'night', 'la noche']),
    ST(['👶', 'bábätko', 'a baby', 'un bebé'], ['🧒', 'dieťa', 'a child', 'un niño'], ['👴', 'starý otec', 'a grandpa', 'un abuelo']),
    ST(['☁️', 'mrak', 'a cloud', 'una nube'], ['🌧️', 'dážď', 'rain', 'la lluvia'], ['🌈', 'dúha', 'a rainbow', 'un arcoíris']),
    ST(['🌾', 'obilie', 'wheat', 'el trigo'], ['🍞', 'chlieb', 'bread', 'el pan'], ['🥪', 'sendvič', 'a sandwich', 'un sándwich']),
    ST(['🥚', 'vajíčka', 'eggs', 'los huevos'], ['🥣', 'cesto', 'dough', 'la masa'], ['🎂', 'torta', 'a cake', 'un pastel']),
    ST(['❄️', 'sneh', 'snow', 'la nieve'], ['⛄', 'snehuliak', 'a snowman', 'un muñeco de nieve'], ['💧', 'voda', 'water', 'el agua']),
    ST(['🌸', 'kvet', 'a blossom', 'una flor'], ['🍏', 'zelené jabĺčko', 'a green apple', 'una manzana verde'], ['🍎', 'červené jablko', 'a red apple', 'una manzana roja']),
    ST(['🧦', 'ponožky', 'socks', 'los calcetines'], ['👟', 'topánky', 'shoes', 'los zapatos'], ['🚶', 'prechádzka', 'a walk', 'un paseo'])];
  function genStory(i, lang, r) {
    const s = STORIES[nth('story', [...STORIES.keys()], i - 30)], nm2 = x => T(lang, x[1], x[2], x[3]);
    const tiles = s.map((x, k) => tile(emo(x[0]), cap(nm2(x)) + '.', k));
    return { kind: 'seq', tilesOnly: true, prompt: T(lang, 'Ako to išlo za sebou? Ťukaj na obrázky od prvého po posledný.', 'What happened first, next and last? Tap the pictures in order.', '¿Qué pasó primero, después y al final? Toca los dibujos en orden.', 'Jak to šlo po sobě? Ťukej na obrázky od prvního po poslední.'),
      hint: T(lang, 'Čo bolo úplne na začiatku?', 'What was at the very beginning?', '¿Qué fue lo primero de todo?', 'Co bylo úplně na začátku?'), display: '', tiles: shuffle(r, tiles), slots: 3,
      answer: T(lang, `Najprv ${nm2(s[0])}, potom ${nm2(s[1])} a nakoniec ${nm2(s[2])}.`, `First ${nm2(s[0])}, then ${nm2(s[1])}, and last ${nm2(s[2])}.`, `Primero ${nm2(s[0])}, después ${nm2(s[1])} y al final ${nm2(s[2])}.`, `Nejdřív ${nm2(s[0])}, potom ${nm2(s[1])} a nakonec ${nm2(s[2])}.`), phrases: tiles.map(t => t.say) };
  }
  function genThink(i, lang, r) {
    const n = i < 45 ? 3 : 4, cols = sample(r, [...new Set(SORTABLE.map(o => o[4]))], n);
    const objs = cols.map(c => pick(r, SORTABLE.filter(o => o[4] === c))), ans = objs[0];
    const clues = shuffle(r, objs.slice(1)).map(o => { const c = byId(o[4]); return T(lang, `Nemá ${adj(c, 'accF')} farbu.`, `It is not ${c.en}.`, `No es de color ${c.es.m}.`, `Nemá ${adjC(c, 'accF')} barvu.`); });
    const c = byId(ans[4]); const say = [T(lang, 'Myslím si na jednu vec.', 'I am thinking of one thing.', 'Estoy pensando en una cosa.', 'Myslím si jednu věc.'), ...clues, T(lang, 'Čo to je?', 'What is it?', '¿Qué es?', 'Co to je?')].join(' ');
    return { kind: 'choose', prompt: say, hint: clues.join(' '), display: `${listen()}<span class="emo">🤔</span>`,
      answer: T(lang, `Je to ${ans[1]}. Má ${adj(c, 'accF')} farbu.`, `It is the ${ans[2]}. It is ${c.en}.`, `Es ${ans[3]}. Es de color ${c.es.m}.`, `Je to ${cz(ans[1])}. Má ${adjC(c, 'accF')} barvu.`),
      options: shuffle(r, objs).map(o => ({ html: emo(o[0]), ok: o === ans, say: oName(lang, o) })) };
  }
  function genRiddles3(i, lang, r) { return i < 15 ? genNext(i, lang, r) : i < 30 ? genMost(i, lang, r) : i < 40 ? genStory(i, lang, r) : genThink(i, lang, r); }

  // ---------------- 6) KITCHEN: fruit salad by picture recipe / spoken recipe & soup / decorate the cake ----------------
  const IN = (e, sk, g, en, es, eg) => ({ e, sk, g, en, es, eg });
  const FRUIT = [IN('🍓', ['jahoda', 'jahodu', 'jahody', 'jahôd'], 'f', ['strawberry', 'strawberries'], ['fresa', 'fresas'], 'f'), IN('🍌', ['banán', 'banán', 'banány', 'banánov'], 'm', ['banana', 'bananas'], ['plátano', 'plátanos'], 'm'),
    IN('🍎', ['jablko', 'jablko', 'jablká', 'jabĺk'], 'n', ['apple', 'apples'], ['manzana', 'manzanas'], 'f'), IN('🍐', ['hruška', 'hrušku', 'hrušky', 'hrušiek'], 'f', ['pear', 'pears'], ['pera', 'peras'], 'f'),
    IN('🍒', ['čerešňa', 'čerešňu', 'čerešne', 'čerešní'], 'f', ['cherry', 'cherries'], ['cereza', 'cerezas'], 'f'), IN('🍊', ['pomaranč', 'pomaranč', 'pomaranče', 'pomarančov'], 'm', ['orange', 'oranges'], ['naranja', 'naranjas'], 'f'),
    IN('🫐', ['čučoriedka', 'čučoriedku', 'čučoriedky', 'čučoriedok'], 'f', ['blueberry', 'blueberries'], ['arándano', 'arándanos'], 'm'), IN('🍑', ['broskyňa', 'broskyňu', 'broskyne', 'broskýň'], 'f', ['peach', 'peaches'], ['durazno', 'duraznos'], 'm')];
  const VEG = [IN('🥕', ['mrkva', 'mrkvu', 'mrkvy', 'mrkiev'], 'f', ['carrot', 'carrots'], ['zanahoria', 'zanahorias'], 'f'), IN('🥔', ['zemiak', 'zemiak', 'zemiaky', 'zemiakov'], 'm', ['potato', 'potatoes'], ['papa', 'papas'], 'f'),
    IN('🧅', ['cibuľa', 'cibuľu', 'cibule', 'cibúľ'], 'f', ['onion', 'onions'], ['cebolla', 'cebollas'], 'f'), IN('🍅', ['paradajka', 'paradajku', 'paradajky', 'paradajok'], 'f', ['tomato', 'tomatoes'], ['tomate', 'tomates'], 'm'),
    IN('🌽', ['kukurica', 'kukuricu', 'kukurice', 'kukuríc'], 'f', ['corn cob', 'corn cobs'], ['elote', 'elotes'], 'm'), IN('🫑', ['paprika', 'papriku', 'papriky', 'paprík'], 'f', ['pepper', 'peppers'], ['pimiento', 'pimientos'], 'm'),
    IN('🍄', ['hríbik', 'hríbik', 'hríbiky', 'hríbikov'], 'm', ['mushroom', 'mushrooms'], ['hongo', 'hongos'], 'm')];
  const DECO = [IN('🕯️', ['sviečka', 'sviečku', 'sviečky', 'sviečok'], 'f', ['candle', 'candles'], ['vela', 'velas'], 'f'), FRUIT[0], FRUIT[4], FRUIT[6],
    IN('🍬', ['cukrík', 'cukrík', 'cukríky', 'cukríkov'], 'm', ['candy', 'candies'], ['caramelo', 'caramelos'], 'm'), IN('⭐', ['hviezdička', 'hviezdičku', 'hviezdičky', 'hviezdičiek'], 'f', ['star', 'stars'], ['estrella', 'estrellas'], 'f'),
    IN('🌸', ['kvietok', 'kvietok', 'kvietky', 'kvietkov'], 'm', ['flower', 'flowers'], ['flor', 'flores'], 'f')];

  const CS4 = { '🍓': ['jahoda', 'jahodu', 'jahody', 'jahod', 'f'], '🍌': ['banán', 'banán', 'banány', 'banánů', 'm'], '🍎': ['jablko', 'jablko', 'jablka', 'jablek', 'n'],
    '🍐': ['hruška', 'hrušku', 'hrušky', 'hrušek', 'f'], '🍒': ['třešeň', 'třešeň', 'třešně', 'třešní', 'f'], '🍊': ['pomeranč', 'pomeranč', 'pomeranče', 'pomerančů', 'm'],
    '🫐': ['borůvka', 'borůvku', 'borůvky', 'borůvek', 'f'], '🍑': ['broskev', 'broskev', 'broskve', 'broskví', 'f'], '🥕': ['mrkev', 'mrkev', 'mrkve', 'mrkví', 'f'],
    '🥔': ['brambora', 'bramboru', 'brambory', 'brambor', 'f'], '🧅': ['cibule', 'cibuli', 'cibule', 'cibulí', 'f'], '🍅': ['rajče', 'rajče', 'rajčata', 'rajčat', 'n'],
    '🌽': ['kukuřice', 'kukuřici', 'kukuřice', 'kukuřic', 'f'], '🫑': ['paprika', 'papriku', 'papriky', 'paprik', 'f'], '🍄': ['hříbek', 'hříbek', 'hříbky', 'hříbků', 'm'],
    '🕯️': ['svíčka', 'svíčku', 'svíčky', 'svíček', 'f'], '🍬': ['bonbón', 'bonbón', 'bonbóny', 'bonbónů', 'm'], '⭐': ['hvězdička', 'hvězdičku', 'hvězdičky', 'hvězdiček', 'f'], '🌸': ['kvítek', 'kvítek', 'kvítky', 'kvítků', 'm'] };
  [...FRUIT, ...VEG, ...DECO].forEach(it => { const v = CS4[it.e]; it.cs = v.slice(0, 4); it.cg = v[4]; });
  const csBe2 = h => (/^(dva|dvě|tři|čtyři) /.test(h) ? 'jsou' : 'je');
  const csPl = (it, n) => (n === 1 ? null : n <= 4 ? it.cs[2] : it.cs[3]);
  const skPl = (it, n) => (n === 1 ? null : n <= 4 ? it.sk[2] : it.sk[3]);
  const inAcc = (lang, it, n) => T(lang, n === 1 ? `${({ f: 'jednu', m: 'jeden', n: 'jedno' })[it.g]} ${it.sk[1]}` : `${skNum(n, it.g)} ${skPl(it, n)}`,
    `${num('en', n)} ${n === 1 ? it.en[0] : it.en[1]}`, `${esNum(n, it.eg)} ${n === 1 ? it.es[0] : it.es[1]}`, n === 1 ? `${({ f: 'jednu', m: 'jeden', n: 'jedno' })[it.cg]} ${it.cs[1]}` : `${csNum(n, it.cg)} ${csPl(it, n)}`);
  const inNom = (lang, it, n) => T(lang, n === 1 ? `${skNum(1, it.g)} ${it.sk[0]}` : `${skNum(n, it.g)} ${skPl(it, n)}`,
    `${num('en', n)} ${n === 1 ? it.en[0] : it.en[1]}`, `${esNum(n, it.eg)} ${n === 1 ? it.es[0] : it.es[1]}`, n === 1 ? `${csNum(1, it.cg)} ${it.cs[0]}` : `${csNum(n, it.cg)} ${csPl(it, n)}`);
  const MAXIN = 6;
  function genCook(i, lang, r) {
    const mode = i < 15 ? 'pic' : i < 25 ? 'fruit' : i < 35 ? 'soup' : 'cake';
    const P = mode === 'soup' ? VEG : mode === 'cake' ? DECO : FRUIT;
    const ni = i < 8 ? 2 : i < 35 ? (i < 20 ? 2 : 3) : (i < 42 ? 3 : 4);
    const maxc = i < 5 ? 2 : i < 10 ? 3 : i < 40 ? 4 : 5;
    const need = sample(r, P, ni), extras = sample(r, P.filter(x => !need.includes(x)), i < 5 ? 1 : 2);
    const counts = need.map(() => ri(r, 1, maxc));
    const list = joinAnd(lang, need.map((it, k) => inAcc(lang, it, counts[k]))), have = joinAnd(lang, need.map((it, k) => inNom(lang, it, counts[k])));
    const cont = { pic: '🥣', fruit: '🥣', soup: '🍲', cake: '🎂' }[mode];
    const prompt = mode === 'pic' ? T(lang, 'Urob ovocný šalát podľa receptu. Ťukaj na ovocie a daj ho do misky.', 'Make a fruit salad from the recipe. Tap the fruit to put it in the bowl.', 'Prepara una ensalada de frutas con la receta. Toca la fruta para ponerla en el tazón.', 'Udělej ovocný salát podle receptu. Ťukej na ovoce a dej ho do misky.')
      : mode === 'fruit' ? T(lang, `Do misky daj ${list}.`, `Put ${list} in the bowl.`, `Pon ${list} en el tazón.`, `Do misky dej ${list}.`)
      : mode === 'soup' ? T(lang, `Uvaríme polievku. Do hrnca daj ${list}.`, `Let us cook soup. Put ${list} in the pot.`, `Vamos a hacer sopa. Pon ${list} en la olla.`, `Uvaříme polévku. Do hrnce dej ${list}.`)
      : T(lang, `Ozdob tortu. Daj na ňu ${list}.`, `Decorate the cake. Put ${list} on it.`, `Decora el pastel. Pon ${list} encima.`, `Ozdob dort. Dej na něj ${list}.`);
    const answer = mode === 'soup' ? T(lang, `V hrnci sú ${have}.`, `The pot has ${have}.`, `En la olla hay ${have}.`, `V hrnci ${csBe2(have)} ${have}.`) : mode === 'cake' ? T(lang, `Na torte sú ${have}.`, `The cake has ${have}.`, `En el pastel hay ${have}.`, `Na dortu ${csBe2(have)} ${have}.`) : T(lang, `V miske sú ${have}.`, `The bowl has ${have}.`, `En el tazón hay ${have}.`, `V misce ${csBe2(have)} ${have}.`);
    const pantry = shuffle(r, [...need, ...extras]);
    const id = it => it.en[0].replace(/\s/g, '');
    const needHint = {}, extraHint = {}, countSay = {};
    need.forEach((it, k) => { needHint[id(it)] = T(lang, `Potrebuješ ${inAcc('sk', it, counts[k])}.`, `You need ${inAcc('en', it, counts[k])}.`, `Necesitas ${inAcc('es', it, counts[k])}.`, `Potřebuješ ${inAcc('cs', it, counts[k])}.`); });
    extras.forEach(it => { extraHint[id(it)] = T(lang, `${cap(it.sk[0])} sem nepatrí.`, `The ${it.en[0]} does not belong here.`, `${cap((it.eg === 'f' ? 'la ' : 'el ') + it.es[0])} no va aquí.`, `${cap(it.cs[0])} sem nepatří.`); });
    pantry.forEach(it => { countSay[id(it)] = [...Array(MAXIN).keys()].map(n => cap(inNom(lang, it, n + 1)) + '.'); });
    const recipe = mode === 'pic' ? `<div class="recipe">📋${need.map((it, k) => `<span class="rline">${it.e.repeat(counts[k])}</span>`).join('')}</div>` : listen();
    return { kind: 'collect', prompt, hint: T(lang, 'Pozri sa ešte raz na recept.', 'Look at the recipe again.', 'Mira otra vez la receta.', 'Prohlédni si ještě jednou recept.'), recipeHtml: recipe, container: cont,
      pantry: pantry.map(it => ({ id: id(it), e: it.e, say: cap(T(lang, it.sk[0], it.en[0], it.es[0], it.cs[0])) })), need: Object.fromEntries(need.map((it, k) => [id(it), counts[k]])),
      needHint, extraHint, countSay, answer, phrases: [...Object.values(needHint), ...Object.values(extraHint), ...Object.values(countSay).flat()] };
  }

  const GAMES = [
    { id: 'colors', img: 'chameleon', color: '#f7d6e6', gen: genColors3,
      title: { sk: 'Farby a tiene', en: 'Colors & Shadows', es: 'Colores y sombras' }, helper: { sk: 'Chameleón Kamil', en: 'Kamil the Chameleon', es: 'Kamil el camaleón' },
      intro: { sk: 'Ahoj, to som ja, chameleón Kamil! Dnes budeme triediť veci do košíkov, vyfarbovať tvary a hádať tiene.', en: 'Hi, it is me, Kamil the Chameleon! Today we will sort things into baskets, color shapes and guess shadows.', es: '¡Hola, soy Kamil el camaleón! Hoy vamos a ordenar cosas en canastas, pintar formas y adivinar sombras.' } },
    { id: 'count', img: 'veverica', color: '#fbe0c8', gen: genCount3,
      title: { sk: 'Počítame zvieratká', en: 'Counting Animals', es: 'Contamos animales' }, helper: { sk: 'Veverička Vierka', en: 'Vera the Squirrel', es: 'Vera la ardilla' },
      intro: { sk: 'Ahoj, tu je veverička Vierka! Poďme na farmu počítať kravy, kačky, rybky a ďalšie zvieratká.', en: 'Hi, Vera the Squirrel here! Let us go to the farm and count cows, ducks, fish and more animals.', es: '¡Hola, aquí Vera la ardilla! Vamos a la granja a contar vacas, patos, peces y más animales.' } },
    { id: 'letters', img: 'sovicka', color: '#e6dcf5', gen: genLetters3,
      title: { sk: 'Písmenková hra', en: 'Letter Games', es: 'Juegos de letras' }, helper: { sk: 'Sovička Soňa', en: 'Sonia the Owl', es: 'Sonia la lechuza' },
      intro: { sk: 'Ahoj, sovička Soňa je späť! Budeme spájať veľké a malé písmená, hľadať ich a skladať abecedu.', en: 'Hi, Sonia the Owl is back! We will match big and small letters, hunt for them and put the alphabet in order.', es: '¡Hola, Sonia la lechuza ha vuelto! Vamos a unir mayúsculas y minúsculas, buscarlas y ordenar el abecedario.' } },
    { id: 'words', img: 'papagaj', color: '#d6f0d9', gen: genWords3,
      title: { sk: 'Skladáme slová', en: 'Building Words', es: 'Formamos palabras' }, helper: { sk: 'Papagáj Pepo', en: 'Pepo the Parrot', es: 'Pepo el loro' },
      intro: { sk: 'Ahoj, papagáj Pepo ťa víta! Pozri sa na obrázok a poskladaj slovo z písmen a zo slabík.', en: 'Hi, Pepo the Parrot says hello! Look at the picture and build the word from letters and syllables.', es: '¡Hola, Pepo el loro te saluda! Mira el dibujo y forma la palabra con letras y sílabas.' } },
    { id: 'riddles', img: 'liska', color: '#fde6c6', gen: genRiddles3,
      title: { sk: 'Hlavolamy', en: 'Brain Teasers', es: 'Rompecabezas' }, helper: { sk: 'Líška Lili', en: 'Lili the Fox', es: 'Lili la zorrita' },
      intro: { sk: 'Ahoj, líška Lili tu má hlavolamy! Budeme hádať, čo príde ďalej, a dobre počúvať.', en: 'Hi, Lili the Fox has brain teasers! We will guess what comes next and listen carefully.', es: '¡Hola, Lili la zorrita tiene rompecabezas! Vamos a adivinar qué viene después y a escuchar con atención.' } },
    { id: 'cook', img: 'zajko-kuchar', color: '#d8e9f7', gen: genCook,
      title: { sk: 'Varíme so Zajkom', en: 'Cooking with Zack', es: 'Cocinamos con Coco' }, helper: { sk: 'Zajačik Zajko', en: 'Zack the Bunny', es: 'Coco el conejito' },
      intro: { sk: 'Ahoj, zajačik Zajko dnes varí! Pomôžeš mi pripraviť šalát, polievku a tortu?', en: 'Hi, Zack the Bunny is cooking today! Will you help me make a salad, a soup and a cake?', es: '¡Hola, Coco el conejito cocina hoy! ¿Me ayudas a preparar una ensalada, una sopa y un pastel?' } }
  ];


  const CS_GAMES = {"colors": ["Barvy a stíny", "Chameleon Kamil", "Ahoj, to jsem já, chameleon Kamil! Dnes budeme třídit věci do košíků, vybarvovat tvary a hádat stíny."], "count": ["Počítáme zvířátka", "Veverka Věrka", "Ahoj, tady je veverka Věrka! Pojďme na statek počítat krávy, kachny, rybičky a další zvířátka."], "letters": ["Písmenková hra", "Sovička Soňa", "Ahoj, sovička Soňa je zpátky! Budeme spojovat velká a malá písmena, hledat je a skládat abecedu."], "words": ["Skládáme slova", "Papoušek Pepa", "Ahoj, papoušek Pepa tě vítá! Podívej se na obrázek a poskládej slovo z písmen a ze slabik."], "riddles": ["Hlavolamy", "Liška Lili", "Ahoj, liška Lili tu má hlavolamy! Budeme hádat, co přijde dál, a pozorně poslouchat."], "cook": ["Vaříme se Zajdou", "Zajíček Zajda", "Ahoj, zajíček Zajda dnes vaří! Pomůžeš mi připravit salát, polévku a dort?"]};
  GAMES.forEach(g => { const v = CS_GAMES[g.id]; if (v) { g.title.cs = v[0]; g.helper.cs = v[1]; g.intro.cs = v[2]; } });
  function stageOf(id, i) {
    switch (id) {
      case 'colors': return i < 20 ? ['sort'] : i < 35 ? ['paint', true] : ['shadow'];
      case 'count': return i < 15 ? ['animals'] : i < 22 ? ['more'] : i < 30 ? ['fewer'] : i < 45 ? ['add', true] : ['ordergroups'];
      case 'letters': return i < 15 ? ['pair'] : i < 28 ? ['hunt', true] : i < 40 ? ['alphabet'] : ['firstpics', true];
      case 'words': return i < 25 ? ['buildletters'] : ['buildsyllables'];
      case 'riddles': return i < 15 ? ['next'] : i < 30 ? ['most', true] : i < 40 ? ['story'] : ['think', true];
      default: return i < 15 ? ['recipe'] : ['spokenrecipe', true];
    }
  }
  const sigOf = t => JSON.stringify([t.prompt, t.say || '', t.answer, t.target || null, t.need || null]);
  const SALT = {};
  function saltFor(gameId, index, lang) {
    if (lang === 'cs') return saltCs(gameId, index);
    const g = GAMES.find(x => x.id === gameId), S = SALT[gameId] = SALT[gameId] || { seen: new Set(), salts: [] };
    while (S.salts.length <= index) {
      const i = S.salts.length; let s = 0, sig;
      for (; s < 200; s++) { sig = ['sk', 'en', 'es'].map(L => L + sigOf(g.gen(i, L, rng(hash('zs2b' + gameId) + i * 7919 + s * 104729)))); if (!sig.some(x => S.seen.has(x))) break; }
      sig.forEach(x => S.seen.add(x)); S.salts.push(s);
    }
    return S.salts[index];
  }
  // Czech has its own uniqueness pass (keeps the SK/EN/ES task sets untouched); it prefers the same salt as the other languages
  function saltCs(gameId, index) {
    const g = GAMES.find(x => x.id === gameId), key = gameId + ':cs', S = SALT[key] = SALT[key] || { seen: new Set(), salts: [] };
    while (S.salts.length <= index) {
      const i = S.salts.length, s0 = saltFor(gameId, i); let s = s0, sig;
      for (let t = -1; t < 200; t++) { s = t < 0 ? s0 : t; sig = 'cs' + sigOf(g.gen(i, 'cs', rng(hash('zs2b' + gameId) + i * 7919 + s * 104729))); if (!S.seen.has(sig)) break; }
      S.seen.add(sig); S.salts.push(s);
    }
    return S.salts[index];
  }
  function getTask(gameId, index, lang) {
    const g = GAMES.find(x => x.id === gameId);
    const r = rng(hash('zs2b' + gameId) + index * 7919 + saltFor(gameId, index, lang) * 104729);
    const t = g.gen(index, lang, r); t.index = index;
    const [st, listen] = stageOf(gameId, index); t.type = gameId + ':' + st; t.listenOnly = listen; return t;
  }

  window.ZS_GAMES = { czMiss,  GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG, shapeSVG, num, nutsW, conf, FIRST: FIRST2, LAST, WORDS2, SYL, sigOf };
})();

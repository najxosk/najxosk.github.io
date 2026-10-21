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
  const T = (lang, sk, en, es) => (lang === 'sk' ? sk : lang === 'es' && es !== undefined ? es : en);
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
  const adjAcc = (c, s) => adj(c, s.g === 'm' ? 'm' : s.g === 'f' ? 'accF' : 'n');
  // "modrá hviezda" / "blue star" (nominative)
  const ART = { m: 'el', f: 'la', mp: 'los', fp: 'las' }, UN = { m: 'un', f: 'una', mp: 'unos', fp: 'unas' };
  const esNoun = (c, noun, g, art) => `${(art || ART)[g]} ${noun} ${c.es[g]}`; // "la estrella azul"
  const colShape = (lang, c, s) => T(lang, `${adj(c, s.g)} ${s.sk}`, `${c.en} ${s.en}`, esNoun(c, s.es, s.eg));
  const colShapeAcc = (lang, c, s) => T(lang, `${adjAcc(c, s)} ${s.skAcc}`, `the ${c.en} ${s.en}`, esNoun(c, s.es, s.eg));

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
    en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
    es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte']
  };
  const num = (lang, n) => NUM[lang][n] != null ? NUM[lang][n] : String(n);
  // correct Slovak plural: 1 oriešok, 2–4 oriešky, 0/5+ orieškov
  const nutsW = (lang, n) => lang === 'sk'
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
        kind: 'choose', prompt: T(lang, 'Nájdi rovnakú farbu.', 'Find the same color.', 'Busca el mismo color.'),
        say: T(lang, `Nájdi rovnakú farbu. Hľadáme ${adj(target, 'accF')} farbu.`, `Find the same color. We are looking for ${target.en}.`, `Busca el mismo color. Buscamos el color ${target.es.m}.`),
        hint: T(lang, `Hľadáme ${adj(target, 'accF')} farbu.`, `Look for the color ${target.en}.`, `Buscamos el color ${target.es.m}.`),
        answer: T(lang, `${adj(target, 'f')} farba. ${cap(colShape(lang, target, shp))}.`, `${target.en}. The ${colShape(lang, target, shp)}.`, `El color ${target.es.m}. ${cap(colShape(lang, target, shp))}.`),
        display: `<div class="blob" style="background:${target.hex}"></div>`,
        options: shuffle(r, cols.map((c, k) => ({ html: shapeSVG(shp.id, c.hex), ok: k === 0, say: colShape(lang, c, shp) })))
      };
    }
    if (i < 18) { // same shape, 4 then 5 options, incl. diamond & oval
      const n = i < 13 ? 4 : 5;
      const shs = sample(r, SHAPES, n); const target = shs[0];
      const cs = shs.map(() => pick(r, COLORS));
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi rovnaký tvar.', 'Find the same shape.', 'Busca la misma forma.'),
        say: T(lang, `Nájdi rovnaký tvar. Hľadáme ${target.skAcc}.`, `Find the same shape. We are looking for a ${target.en}.`, `Busca la misma forma. Buscamos ${ART[target.eg]} ${target.es}.`),
        hint: T(lang, `Hľadáme ${target.skAcc}.`, `Look for the ${target.en}.`, `Buscamos ${ART[target.eg]} ${target.es}.`),
        answer: T(lang, `${cap(colShape(lang, cs[0], target))}. To je ${target.sk}.`, `The ${colShape(lang, cs[0], target)}. That is a ${target.en}.`, `${cap(colShape(lang, cs[0], target))}. Es ${UN[target.eg]} ${target.es}.`),
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
      prompt: byVoice ? T(lang, `Ťukni na ${colShapeAcc(lang, tc, ts)}.`, `Tap ${colShapeAcc(lang, tc, ts)}.`, `Toca ${colShapeAcc(lang, tc, ts)}.`)
        : T(lang, 'Nájdi rovnakú farbu aj tvar.', 'Find the same color and the same shape.', 'Busca el mismo color y la misma forma.'),
      say: byVoice ? null : T(lang, `Nájdi rovnakú farbu aj tvar. Hľadáme ${colShapeAcc(lang, tc, ts)}.`, `Find the same color and shape. We are looking for ${colShapeAcc(lang, tc, ts)}.`, `Busca el mismo color y la misma forma. Buscamos ${colShapeAcc(lang, tc, ts)}.`),
      hint: T(lang, `Hľadáme ${colShapeAcc(lang, tc, ts)}. Farba aj tvar musia sedieť.`, `Look for ${colShapeAcc(lang, tc, ts)}. Both the color and the shape must match.`, `Buscamos ${colShapeAcc(lang, tc, ts)}. El color y la forma tienen que coincidir.`),
      answer: T(lang, `${cap(colShape(lang, tc, ts))}.`, `The ${colShape(lang, tc, ts)}.`, `${cap(colShape(lang, tc, ts))}.`),
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
        kind: 'choose', prompt: T(lang, 'Koľko je tu orieškov?', 'How many nuts are there?', '¿Cuántas bellotas hay?'),
        hint: n > 10 ? T(lang, 'Najprv spočítaj jeden riadok: päť. Potom pokračuj: šesť, sedem…', 'Count one row first: five. Then go on: six, seven…', 'Primero cuenta una fila: cinco. Luego sigue: seis, siete…')
          : T(lang, 'Spočítaj oriešky prstom: jeden, dva, tri…', 'Count the nuts with your finger: one, two, three…', 'Cuenta las bellotas con el dedo: uno, dos, tres…'),
        answer: T(lang, `${nutsW(lang, n)}.`, `${nutsW(lang, n)}.`, `${cap(nutsW(lang, n))}.`),
        display: nuts(n), options: numOpts(r, lang, n, 4, n > 10 ? 20 : 10)
      };
    }
    if (i < 20) {
      const n = [3, 5, 6, 7, 8, 10][i - 14];
      return {
        kind: 'give', n, prompt: T(lang, `Daj veveričke presne ${n} do košíka. Potom ťukni na fajku.`, `Put exactly ${n} nuts in the basket. Then tap the check mark.`, `Pon exactamente ${n} ${n === 1 ? 'bellota' : 'bellotas'} en la canasta. Luego toca la palomita.`),
        say: T(lang, `Daj veveričke presne ${nutsW(lang, n)} do košíka. Potom ťukni na fajku.`, `Put exactly ${nutsW(lang, n)} in the basket. Then tap the check mark.`, `Pon exactamente ${nutsW(lang, n)} en la canasta. Luego toca la palomita.`),
        hint: T(lang, `Spočítaj oriešky v košíku. Potrebujeme ${nutsW(lang, n)}.`, `Count the nuts in the basket. We need ${nutsW(lang, n)}.`, `Cuenta las bellotas de la canasta. Necesitamos ${nutsW(lang, n)}.`),
        answer: T(lang, `${nutsW(lang, n)}.`, `${nutsW(lang, n)}.`, `${cap(nutsW(lang, n))}.`),
        display: big(n, 'num huge')
      };
    }
    if (i < 26) {
      let a = ri(r, 3, 10), b;
      b = i >= 23 ? a + (a < 10 && r() < 0.5 ? 1 : -1) : (a > 6 ? a - ri(r, 2, 3) : a + ri(r, 2, 3));
      const mx = Math.max(a, b), mn = Math.min(a, b);
      return {
        kind: 'choose', prompt: T(lang, 'Kde je viac orieškov?', 'Where are more nuts?', '¿Dónde hay más bellotas?'),
        hint: T(lang, 'Spočítaj obe kôpky. Ktorá má viac?', 'Count both piles. Which one has more?', 'Cuenta los dos montones. ¿Cuál tiene más?'),
        answer: T(lang, `${cap(num(lang, mx))} je viac ako ${num(lang, mn)}.`, `${cap(num(lang, mx))} is more than ${num(lang, mn)}.`, `${cap(num(lang, mx))} es más que ${num(lang, mn)}.`),
        display: emo('🐿️'), options: shuffle(r, [{ html: nuts(a), ok: a > b, say: nutsW(lang, a) }, { html: nuts(b), ok: b > a, say: nutsW(lang, b) }]), wide: true
      };
    }
    const opWord = (plus) => plus ? T(lang, 'plus', 'plus', 'más') : T(lang, 'mínus', 'minus', 'menos');
    if (i < 42) {
      let a, b, plus, max = i < 34 ? 10 : 20;
      plus = i < 34 ? i < 30 : r() < 0.5;
      if (plus) { a = ri(r, i < 34 ? 2 : 5, max - 2); b = ri(r, 1, Math.min(max - a, i < 34 ? 5 : 9)); }
      else { a = ri(r, i < 34 ? 4 : 10, max); b = ri(r, 1, Math.min(a - 1, i < 34 ? 5 : 9)); }
      const ans = plus ? a + b : a - b;
      const disp = plus ? `<div class="sum">${nuts(a)}<span class="op">+</span>${nuts(b)}</div>` : `<div class="sum">${nuts(a, b)}</div>`;
      return {
        kind: 'choose',
        prompt: T(lang, `Koľko je ${a} ${opWord(plus)} ${b}?`, `What is ${a} ${opWord(plus)} ${b}?`, `¿Cuánto es ${a} ${opWord(plus)} ${b}?`),
        hint: plus ? T(lang, `Spočítaj všetky oriešky spolu.`, `Count all the nuts together.`, `Cuenta todas las bellotas juntas.`)
          : T(lang, `Veverička zjedla ${nutsW(lang, b)}. Spočítaj tie, čo zostali.`, `The squirrel ate ${nutsW(lang, b)}. Count the nuts that are left.`, `La ardilla se comió ${nutsW(lang, b)}. Cuenta las que quedan.`),
        answer: T(lang, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} je ${num(lang, ans)}.`, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} is ${num(lang, ans)}.`, `${cap(num(lang, a))} ${opWord(plus)} ${num(lang, b)} es ${num(lang, ans)}.`),
        display: disp + `<div class="eq">${a} ${plus ? '+' : '−'} ${b} = ?</div>`,
        options: numOpts(r, lang, ans, 4, max)
      };
    }
    // two-step story: a, found b, ate c
    const a = ri(r, 3, 8), b = ri(r, 2, 6), c = ri(r, 1, Math.min(5, a + b - 1)), ans = a + b - c;
    return {
      kind: 'choose',
      prompt: T(lang, `Veverička mala ${a}. Našla ešte ${b}. Potom ${c} zjedla. Koľko jej zostalo?`, `The squirrel had ${a} nuts. She found ${b} more. Then she ate ${c}. How many are left?`, `La ardilla tenía ${a} bellotas. Encontró ${b} más. Luego se comió ${c}. ¿Cuántas le quedan?`),
      say: T(lang, `Veverička mala ${nutsW(lang, a)}. Našla ešte ${num(lang, b)}. Potom ${num(lang, c)} zjedla. Koľko orieškov jej zostalo?`, `The squirrel had ${nutsW(lang, a)}. She found ${num(lang, b)} more. Then she ate ${num(lang, c)}. How many nuts are left?`, `La ardilla tenía ${nutsW(lang, a)}. Encontró ${numF(lang, b)} más. Luego se comió ${numF(lang, c)}. ¿Cuántas bellotas le quedan?`),
      hint: T(lang, `Najprv ${a} plus ${b}. Potom odober ${c}.`, `First ${a} plus ${b}. Then take away ${c}.`, `Primero ${a} más ${b}. Luego quita ${c}.`),
      answer: T(lang, `${cap(num(lang, a))} plus ${num(lang, b)} je ${num(lang, a + b)}, mínus ${num(lang, c)} je ${num(lang, ans)}.`, `${cap(num(lang, a))} plus ${num(lang, b)} is ${num(lang, a + b)}, minus ${num(lang, c)} is ${num(lang, ans)}.`, `${cap(num(lang, a))} más ${num(lang, b)} es ${num(lang, a + b)}, menos ${num(lang, c)} es ${num(lang, ans)}.`),
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
  const conf = (lang, a, b) => a === b || (lang === 'es' && SAME_ES.some(g => g.includes(a) && g.includes(b)));
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
  const letterName = (lang, L, lower) => T(lang, `${lower ? 'malé' : 'písmeno'} ${lower ? L.toLowerCase() : L}`, `${lower ? 'small' : 'the letter'} ${lower ? L.toLowerCase() : L}`, lower ? `la ${L.toLowerCase()} minúscula` : `la letra ${L}`);
  const letterTeach = (lang, L) => { const w = exampleFor(lang, L); return T(lang, `Písmeno ${L}${w ? ', ako ' + w : ''}.`, `The letter ${L}${w ? ', as in ' + w : ''}.`, `La letra ${L}${w ? ', de ' + w : ''}.`); };
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
        prompt: voice ? T(lang, `Ťukni na písmeno ${t}.`, `Tap the letter ${t}.`, `Toca la letra ${t}.`) : T(lang, 'Nájdi rovnaké písmeno.', 'Find the same letter.', 'Busca la misma letra.'),
        say: voice ? letterTeach(lang, t).replace(/^/, T(lang, 'Ťukni na písmeno ' + t + '. ', 'Tap the letter ' + t + '. ', 'Toca la letra ' + t + '. ')) : T(lang, `Nájdi rovnaké písmeno. ${letterTeach(lang, t)}`, `Find the same letter. ${letterTeach(lang, t)}`, `Busca la misma letra. ${letterTeach(lang, t)}`),
        hint: T(lang, `Pozri sa pozorne. Hľadáme písmeno ${t}.`, `Look carefully. We are looking for the letter ${t}.`, `Mira bien. Buscamos la letra ${t}.`),
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
        kind: 'choose', prompt: T(lang, 'Nájdi malé písmeno k veľkému.', 'Find the small letter for the big one.', 'Busca la minúscula de esta mayúscula.'),
        say: T(lang, `Nájdi malé písmeno ${t}.`, `Find the small letter ${t}.`, `Busca la ${t.toLowerCase()} minúscula.`),
        hint: T(lang, `Veľké ${t} a malé ${t.toLowerCase()} sú to isté písmeno.`, `Big ${t} and small ${t.toLowerCase()} are the same letter.`, `La ${t} mayúscula y la ${t.toLowerCase()} minúscula son la misma letra.`),
        answer: T(lang, `Veľké ${t} a malé ${t.toLowerCase()}.`, `Big ${t} and small ${t.toLowerCase()}.`, `La ${t} mayúscula y la ${t.toLowerCase()} minúscula.`),
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
        kind: 'choose', prompt: T(lang, 'Akým písmenom sa začína toto slovo?', 'Which letter does this word start with?', '¿Con qué letra empieza esta palabra?'),
        say: T(lang, `Akým písmenom sa začína slovo ${wl}?`, `Which letter does the word ${wl} start with?`, `¿Con qué letra empieza la palabra ${wl}?`),
        hint: T(lang, `Počúvaj: ${t}… ${wl}.`, `Listen: ${t}… ${wl}.`, `Escucha: ${t}… ${wl}.`),
        answer: T(lang, `${cap(wl)} sa začína na ${t}.`, `${cap(wl)} starts with ${t}.`, `${cap(wl)} empieza con ${t}.`),
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
      kind: 'choose', prompt: T(lang, `Ktorý obrázok sa začína na písmeno ${t}?`, `Which picture starts with the letter ${t}?`, `¿Qué dibujo empieza con la letra ${t}?`),
      hint: T(lang, `Povedz si každý obrázok nahlas. Ktorý znie na začiatku ${t}?`, `Say each picture out loud. Which one starts with the sound ${t}?`, `Di cada dibujo en voz alta. ¿Cuál empieza con ${t}?`),
      answer: T(lang, `${cap(base[1].toLowerCase())} sa začína na ${t}.`, `${cap(base[1].toLowerCase())} starts with ${t}.`, `${cap(base[1].toLowerCase())} empieza con ${t}.`),
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
      HRUŠKA: 'hruš-ka', MEDVEĎ: 'med-veď', JABLKO: 'ja-bl-ko', MESIAC: 'me-siac', CITRÓN: 'cit-rón', KORUNA: 'ko-ru-na', HVIEZDA: 'hviez-da', BICYKEL: 'bi-cy-kel', DÁŽDNIK: 'dážd-nik', PAPAGÁJ: 'pa-pa-gáj',
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
      const hs = sylSay(lang, w, multi ? T(lang, 'Ťukni na slovo. Počúvaj po slabikách:', 'Tap the word. Listen to the syllables:', 'Toca la palabra. Escucha las sílabas:')
        : T(lang, 'Ťukni na slovo a počúvaj:', 'Tap the word and listen:', 'Toca la palabra y escucha:'));
      const as = sylSay(lang, w);
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      return {
        kind: 'choose', prompt: T(lang, 'Prečítaj slovo a nájdi obrázok.', 'Read the word and find the picture.', 'Lee la palabra y busca el dibujo.'),
        say: T(lang, 'Prečítaj slovo a nájdi obrázok. Ťukni na slovo a vypočuješ si ho.', 'Read the word and find the picture. Tap the word to hear it.', 'Lee la palabra y busca el dibujo. Toca la palabra para escucharla.'),
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
      kind: 'choose', prompt: T(lang, 'Ktoré slovo patrí k obrázku?', 'Which word goes with the picture?', '¿Qué palabra va con el dibujo?'),
      hint: T(lang, `Hľadáme slovo ${wl}. Začína sa na ${w[0]}.`, `We need the word ${wl}. It starts with ${w[0]}.`, `Buscamos la palabra ${wl}. Empieza con ${w[0]}.`),
      answer: T(lang, `${cap(wl)}.`, `${cap(wl)}.`),
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
    `la casita ${c.es.f}${deco === 'tree' ? ' con árbol' : deco === 'flower' ? ' con girasol' : ''}`);
  const livesIn = (lang, who, c) => T(lang, `${who.sk} býva ${vIn(adj(c, 'loc'))} domčeku.`, `${who.en} lives in the ${c.en} house.`, `${who.es} vive en la casita ${c.es.f}.`);
  function genRiddles(i, lang, r) {
    if (i < 10) {
      const [c1, c2] = sample(r, CATS, 2);
      const n = i < 5 ? 5 : 6;
      const same = sample(r, c1.items, n - 1), odd = pick(r, c2.items);
      const nm = it => lang === 'sk' ? it[1] : lang === 'es' ? it[3] : it[2];
      return {
        kind: 'choose', prompt: T(lang, 'Čo sem nepatrí?', 'Which one does not belong?', '¿Cuál no va aquí?'),
        say: T(lang, `Čo sem nepatrí? ${c1.skAll}`, `Which one does not belong? ${c1.enAll}`, `¿Cuál no va aquí? ${c1.esAll}`),
        hint: T(lang, `${c1.skAll} Čo medzi ne nepatrí?`, `${c1.enAll} Which one is different?`, `${c1.esAll} ¿Cuál es diferente?`),
        answer: T(lang, `${cap(nm(odd))} nepatrí medzi ${c1.sk}.`, `The ${nm(odd)} does not belong with the ${c1.en}.`, `${cap(nm(odd))} no va con ${c1.es}.`),
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
        pool = its.map(e => emo(e[0])); names = its.map(e => lang === 'sk' ? e[1] : lang === 'es' ? e[3] : e[2]);
      }
      let unit;
      if (i < 12) unit = [0, 1]; else if (i < 16) unit = r() < 0.5 ? [0, 0, 1] : [0, 1, 1]; else if (i < 21) unit = r() < 0.5 ? [0, 1, 2] : [0, 1, 1, 2]; else unit = [0, 1, 2, 3];
      const shown = n4 ? 7 : 6 + (i % 2); const items = [];
      for (let k = 0; k <= shown; k++) items.push(unit[k % unit.length]);
      const next = items.pop();
      return {
        kind: 'choose', prompt: T(lang, 'Čo príde ďalej?', 'What comes next?', '¿Qué sigue?'),
        say: T(lang, `Čo príde ďalej? ${items.map(k => names[k]).join(', ')}, a potom?`, `What comes next? ${items.map(k => names[k]).join(', ')}, and then?`, `¿Qué sigue? ${items.map(k => names[k]).join(', ')}, ¿y después?`),
        hint: T(lang, `Povedz si to nahlas: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`, `Say it out loud: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`, `Dilo en voz alta: ${items.slice(0, unit.length * 2).map(k => names[k]).join(', ')}…`),
        answer: T(lang, `Potom príde ${names[next]}.`, `Next comes the ${names[next]}.`, `Después viene ${names[next]}.`),
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
        hint: T(lang, `Hľadáme ${adj(cols[0], 'm')} domček.`, `Look for the ${cols[0].en} house.`, `Buscamos la casita ${cols[0].es.f}.`),
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
      const nearW = withTree ? T(lang, 'so stromom', 'with the tree', 'con el árbol') : T(lang, 'so slnečnicou', 'with the sunflower', 'con el girasol');
      return {
        kind: 'choose', houses: true,
        prompt: T(lang, `${who.sk} býva ${vIn(adj(a, 'loc'))} domčeku ${nearW}.`, `${who.en} lives in the ${a.en} house ${nearW}.`, `${who.es} vive en la casita ${a.es.f} ${nearW}.`),
        hint: T(lang, `Sú tu dva ${adj(a, 'pl')} domčeky. Ktorý je ${nearW}?`, `There are two ${a.en} houses. Which one is ${nearW}?`, `Hay dos casitas ${a.es.fp}. ¿Cuál es la casita ${nearW}?`),
        answer: T(lang, `${who.sk} býva ${vIn(adj(a, 'loc'))} domčeku ${nearW}.`, `${who.en} lives in the ${a.en} house ${nearW}.`, `${who.es} vive en la casita ${a.es.f} ${nearW}.`),
        display: emo(who.e) + listen(),
        options: shuffle(r, opts.map(o => ({ html: houseSVG(o.c.hex, o.d), ok: o.ok, say: houseName(lang, o.c, o.d) })))
      };
    }
    if (i < 44) {
      const cols = sample(r, COLORS, 4); const t = ri(r, 1, 2);
      const L = cols[t - 1], R = cols[t + 1];
      return {
        kind: 'choose', houses: true, keepOrder: true,
        prompt: T(lang, `${who.sk} býva v domčeku medzi ${adj(L, 'ins')} a ${adj(R, 'ins')} domčekom.`, `${who.en} lives in the house between the ${L.en} house and the ${R.en} house.`, `${who.es} vive en la casita que está entre la casita ${L.es.f} y la casita ${R.es.f}.`),
        hint: T(lang, `Nájdi ${adj(L, 'm')} a ${adj(R, 'm')} domček. ${who.sk} býva v strede medzi nimi.`, `Find the ${L.en} and the ${R.en} house. ${who.en} lives in the middle.`, `Busca la casita ${L.es.f} y la casita ${R.es.f}. ${who.es} vive en medio de las dos.`),
        answer: livesIn(lang, who, cols[t]),
        display: emo(who.e) + listen(),
        options: cols.map((c, k) => ({ html: houseSVG(c.hex), ok: k === t, say: houseName(lang, c) }))
      };
    }
    // two-step: "not in the X house, and the house has a tree/sunflower"
    const [x, y, z, w] = sample(r, COLORS, 4);
    const withTree = r() < 0.5; const d = withTree ? 'tree' : 'flower', od = withTree ? 'flower' : 'tree';
    const opts = [{ c: y, d, ok: true }, { c: x, d, ok: false }, { c: z, d: od, ok: false }, { c: w, d: null, ok: false }];
    const hasW = withTree ? T(lang, `Pri ${who.poss} domčeku rastie strom.`, 'There is a tree by its house.', 'Junto a su casita hay un árbol.') : T(lang, `Pri ${who.poss} domčeku rastie slnečnica.`, 'There is a sunflower by its house.', 'Junto a su casita hay un girasol.');
    return {
      kind: 'choose', houses: true,
      prompt: T(lang, `${who.sk} nebýva ${vIn(adj(x, 'loc'))} domčeku. ${hasW}`, `${who.en} does not live in the ${x.en} house. ${hasW}`, `${who.es} no vive en la casita ${x.es.f}. ${hasW}`),
      hint: T(lang, `Najprv nájdi domčeky ${withTree ? 'so stromom' : 'so slnečnicou'}. Potom vynechaj ${adj(x, 'm')}.`, `First find the houses ${withTree ? 'with a tree' : 'with a sunflower'}. Then skip the ${x.en} one.`, `Primero busca las casitas ${withTree ? 'con árbol' : 'con girasol'}. Luego descarta la casita ${x.es.f}.`),
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
    if (acc && it.g === 'f') return T(lang, `${adj(c, 'accF')} ${it.sk.replace(/a$/, 'u')}`, `${c.en} ${it.en}`); // červenú čiapku
    return T(lang, `${adj(c, it.g)} ${it.sk}`, `${c.en} ${it.en}`);
  }
  const SLOT_Q = {
    hat: { sk: 'Pozri sa, čo má zajačik na hlave.', en: 'Look at what the bunny wears on its head.', es: 'Mira lo que lleva el conejito en la cabeza.' },
    scarf: { sk: 'Pozri sa na šál.', en: 'Look at the scarf.', es: 'Mira la bufanda.' },
    shirt: { sk: 'Pozri sa na tričko.', en: 'Look at the shirt.', es: 'Mira la camiseta.' },
    shoes: { sk: 'Pozri sa na topánky.', en: 'Look at the shoes.', es: 'Mira los zapatos.' }
  };
  const joinAnd = (lang, arr) => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + T(lang, ' a ', ' and ', ' y ') + arr[arr.length - 1];
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
      prompt: byEar ? T(lang, `Obleč zajačika: ${joinAnd(lang, names)}.`, `Dress the bunny: ${joinAnd(lang, names)}.`, `Viste al conejito: ${joinAnd(lang, namesAcc)}.`)
        : T(lang, 'Obleč zajačika presne ako na obrázku. Potom ťukni na fajku.', 'Dress the bunny just like in the picture. Then tap the check mark.', 'Viste al conejito igual que en el dibujo. Luego toca la palomita.'),
      say: byEar ? T(lang, `Počúvaj. Obleč zajačika: ${joinAnd(lang, names)}. Potom ťukni na fajku.`, `Listen. Dress the bunny: ${joinAnd(lang, names)}. Then tap the check mark.`, `Escucha. Viste al conejito: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`)
        : T(lang, `Obleč zajačika ako na obrázku: ${joinAnd(lang, names)}. Potom ťukni na fajku.`, `Dress the bunny like in the picture: ${joinAnd(lang, names)}. Then tap the check mark.`, `Viste al conejito como en el dibujo: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`),
      hint: T(lang, 'Porovnaj zajačika s obrázkom.', 'Compare the bunny with the picture.', 'Compara al conejito con el dibujo.'),
      answer: T(lang, `Zajačik má ${joinAnd(lang, namesAcc)}.`, `The bunny has a ${joinAnd(lang, names)}.`.replace('a shoes', 'shoes'), `El conejito tiene ${joinAnd(lang, namesAcc)}.`),
      slotHints: Object.fromEntries(slots.map(s => [s, SLOT_Q[s][lang]])),
      slotNames: Object.fromEntries(slots.map(s => [s, T(lang, `Zajačik má mať ${itemName(lang, s, target[s], true)}.`, `The bunny needs the ${itemName(lang, s, target[s])}.`, `El conejito necesita ${itemName(lang, s, target[s], true)}.`)])),
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
    return T(lang, `${skNum(n, it.g)} ${pl3(it, n)}`, `${num('en', n)} ${n === 1 ? it.en[0] : it.en[1]}`, `${esNum(n, it.eg)} ${n === 1 ? it.es[0] : it.es[1]}`);
  }
  const cntD = (lang, it, n) => T(lang, `${n} ${pl3(it, n)}`, `${n} ${n === 1 ? it.en[0] : it.en[1]}`, `${n} ${n === 1 ? it.es[0] : it.es[1]}`);
  function grid(e, n, crossed) {
    let h = '<div class="nuts">';
    for (let k = 0; k < n; k++) h += `<span class="nut${crossed && k >= n - crossed ? ' gone' : ''}">${e}</span>` + ((k + 1) % 5 === 0 && k + 1 < n ? '<i class="br5"></i>' : '');
    return h + '</div>';
  }
  const colorName = (lang, c) => T(lang, `${adj(c, 'f')} farba`, `the color ${c.en}`, `el color ${c.es.m}`);
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
        kind: 'choose', prompt: T(lang, `Akú farbu má ${o[1]}?`, `What color ${plEn ? 'are' : 'is'} the ${o[2]}?`, `¿De qué color ${esPl ? 'son' : 'es'} ${o[3]}?`),
        hint: T(lang, 'Pozri sa na obrázok. Akú farbu vidíš?', 'Look at the picture. Which color do you see?', 'Mira el dibujo. ¿Qué color ves?'),
        answer: T(lang, `${cap(o[1])} má ${adj(c, 'accF')} farbu.`, `The ${o[2]} ${plEn ? 'are' : 'is'} ${c.en}.`, `${cap(o[3])} ${esPl ? 'son' : 'es'} de color ${c.es.m}.`),
        display: emo(o[0], 'huge'),
        options: shuffle(r, cols.map((x, k) => ({ html: shapeSVG('circle', x.hex, null, true), ok: k === 0, say: colorName(lang, x) })))
      };
    }
    if (i < 16) {
      const m = MIX[(i - 10) % 3], sw = i >= 13; const a = byId(sw ? m[1] : m[0]), b = byId(sw ? m[0] : m[1]), c = byId(m[2]);
      const cols = [c, a, b, ...sample(r, COLORS.filter(x => ![a, b, c].includes(x)), 1)];
      return {
        kind: 'choose', prompt: T(lang, `Čo vznikne, keď zmiešame ${adj(a, 'accF')} a ${adj(b, 'accF')} farbu?`, `What do we get when we mix ${a.en} and ${b.en}?`, `¿Qué sale si mezclamos el ${a.es.m} y el ${b.es.m}?`),
        hint: T(lang, `Predstav si, že zmiešaš ${adj(a, 'accF')} a ${adj(b, 'accF')} farbu.`, `Imagine mixing ${a.en} and ${b.en} paint.`, `Imagina que mezclas pintura ${a.es.f} y ${b.es.f}.`),
        answer: T(lang, `${cap(adj(a, 'f'))} a ${adj(b, 'f')} dajú ${adj(c, 'accF')} farbu.`, `${cap(a.en)} and ${b.en} make ${c.en}.`, `El ${a.es.m} y el ${b.es.m} dan el ${c.es.m}.`),
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
        ? T(lang, `Ťukni na ${adj(tc, 'm')} tvar, ktorý ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `Tap the ${tc.en} shape with ${kw}.`, `Toca la forma ${tc.es.f} que ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`)
        : T(lang, `Nájdi tvar, ktorý ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `Find the shape with ${kw}.`, `Busca la forma que ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`);
      return {
        kind: 'choose', prompt,
        hint: byEar ? T(lang, `Najprv nájdi ${adj(tc, 'accF')} farbu, potom spočítaj rohy.`, `First find ${tc.en}, then count the corners.`, `Primero busca el color ${tc.es.m} y luego cuenta las esquinas.`)
          : T(lang, 'Spočítaj rohy na každom tvare.', 'Count the corners of each shape.', 'Cuenta las esquinas de cada forma.'),
        answer: T(lang, `${cap(colShape(lang, tc, ts))} ${k === 0 ? 'nemá žiadny roh' : 'má ' + kw}.`, `The ${colShape(lang, tc, ts)} has ${kw}.`, `${cap(colShape(lang, tc, ts))} ${k === 0 ? 'no tiene esquinas' : 'tiene ' + kw}.`),
        display: byEar ? listen() : emo('📐'),
        options: shuffle(r, opts.map((o, j) => ({ html: shapeSVG(o.s.id, o.c.hex), ok: j === 0, say: colShape(lang, o.c, o.s) })))
      };
    }
    // sizes (28..39): biggest / smallest
    const s = pick(r, SHAPES), c = pick(r, COLORS), n = i < 32 ? 3 : 4, big1 = i % 2 === 0;
    const sizeIdx = n === 3 ? [0, 1, 2] : [0, 1, 2, 3], scale = [1, .78, .58, .4];
    const sz = (lang2, k) => T(lang2, `${SIZES.sk[k][gi(s.g)]} ${s.sk}`, `the ${SIZES.en[k]} ${s.en}`, `${ART[s.eg]} ${s.es} ${SIZES.es[k][s.eg === 'f' ? 1 : 0]}`);
    const target = big1 ? 0 : sizeIdx[sizeIdx.length - 1];
    const supAcc = big1 ? ['najväčší', 'najväčšiu', 'najväčšie'] : ['najmenší', 'najmenšiu', 'najmenšie'];
    const supNom = big1 ? ['najväčší', 'najväčšia', 'najväčšie'] : ['najmenší', 'najmenšia', 'najmenšie'];
    const esSup = big1 ? 'más grande' : (s.eg === 'f' ? 'más pequeña' : 'más pequeño');
    return {
      kind: 'choose',
      prompt: T(lang, `Ťukni na ${supAcc[gi(s.g)]} ${s.skAcc}.`, `Tap the ${big1 ? 'biggest' : 'smallest'} ${s.en}.`, `Toca ${ART[s.eg]} ${s.es} ${esSup}.`),
      hint: T(lang, 'Porovnaj veľkosť všetkých tvarov.', 'Compare the size of all the shapes.', 'Compara el tamaño de todas las formas.'),
      answer: T(lang, `${cap(supNom[gi(s.g)])} ${adj(c, s.g)} ${s.sk}.`, `The ${big1 ? 'biggest' : 'smallest'} ${c.en} ${s.en}.`, `${cap(ART[s.eg])} ${s.es} ${c.es[s.eg]} ${esSup}.`),
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
        kind: 'choose', prompt: T(lang, `Koľko je tu ${it.sk[2]}?`, `How many ${it.en[1]} are there?`, `¿${it.eg === 'f' ? 'Cuántas' : 'Cuántos'} ${it.es[1]} hay?`),
        hint: n > 10 ? T(lang, 'Najprv spočítaj prvý riadok. Potom pokračuj ďalej.', 'Count the first row, then keep going.', 'Cuenta la primera fila y luego sigue.')
          : T(lang, 'Dotkni sa každého obrázka a počítaj nahlas.', 'Touch each picture and count out loud.', 'Toca cada dibujo y cuenta en voz alta.'),
        answer: `${cap(cnt(lang, it, n))}.`, display: grid(it.e, n), options: numOpts(r, lang, n, 4, n > 10 ? 20 : 10)
      };
    }
    if (i < 22) {
      const after = i % 2 === 0, n = i < 17 ? ri(r, 2, 9) : ri(r, 10, 19), ans = after ? n + 1 : n - 1;
      return {
        kind: 'choose',
        prompt: after ? T(lang, `Ktoré číslo príde po čísle ${n}?`, `Which number comes after ${n}?`, `¿Qué número va después del ${n}?`)
          : T(lang, `Ktoré číslo je pred číslom ${n}?`, `Which number comes before ${n}?`, `¿Qué número va antes del ${n}?`),
        hint: after ? T(lang, `Počítaj ďalej od čísla ${num(lang, n)}.`, `Count on from ${num(lang, n)}.`, `Cuenta hacia adelante desde el ${num(lang, n)}.`)
          : T(lang, `Počítaj späť od čísla ${num(lang, n)}.`, `Count back from ${num(lang, n)}.`, `Cuenta hacia atrás desde el ${num(lang, n)}.`),
        answer: after ? T(lang, `Po čísle ${num(lang, n)} príde ${num(lang, ans)}.`, `After ${num(lang, n)} comes ${num(lang, ans)}.`, `Después del ${num(lang, n)} va el ${num(lang, ans)}.`)
          : T(lang, `Pred číslom ${num(lang, n)} je ${num(lang, ans)}.`, `Before ${num(lang, n)} comes ${num(lang, ans)}.`, `Antes del ${num(lang, n)} va el ${num(lang, ans)}.`),
        display: big(after ? `${n} → ?` : `? → ${n}`, 'num huge'), options: numOpts(r, lang, ans, 4, 20)
      };
    }
    if (i < 32) {
      const step = i < 27 ? 1 : 2, len = i < 25 ? 4 : 5, start = ri(r, step === 1 ? 1 : 0, 20 - step * (len - 1));
      const seq = Array.from({ length: len }, (_, k) => start + k * step), mi = ri(r, 1, len - 2), m = seq[mi];
      return {
        kind: 'choose', prompt: T(lang, 'Ktoré číslo chýba?', 'Which number is missing?', '¿Qué número falta?'),
        hint: step === 1 ? T(lang, 'Povedz čísla nahlas po poradí.', 'Say the numbers in order out loud.', 'Di los números en orden en voz alta.')
          : T(lang, 'Čísla rastú vždy o dva.', 'The numbers go up by two each time.', 'Los números suben de dos en dos.'),
        answer: T(lang, `${cap(seq.map(v => num(lang, v)).join(', '))}. Chýba číslo ${num(lang, m)}.`, `${cap(seq.map(v => num(lang, v)).join(', '))}. The missing number is ${num(lang, m)}.`, `${cap(seq.map(v => num(lang, v)).join(', '))}. Falta el ${num(lang, m)}.`),
        display: big(seq.map((v, k) => k === mi ? '?' : v).join(' , '), 'num'), options: numOpts(r, lang, m, 4, 20)
      };
    }
    if (i < 40) {
      const it = pick(r, CI); const a = ri(r, 3, 10); let b = i < 36 ? (a > 5 ? a - ri(r, 2, 3) : a + ri(r, 2, 3)) : a + (a < 10 && r() < 0.5 ? 1 : -1);
      const mn = Math.min(a, b), mx = Math.max(a, b);
      return {
        kind: 'choose', prompt: T(lang, `Kde je menej ${it.sk[2]}?`, `Where are fewer ${it.en[1]}?`, `¿Dónde hay menos ${it.es[1]}?`),
        hint: T(lang, 'Spočítaj obe skupinky. Ktorá má menej?', 'Count both groups. Which one has fewer?', 'Cuenta los dos grupos. ¿Cuál tiene menos?'),
        answer: T(lang, `${cap(num(lang, mn))} je menej ako ${num(lang, mx)}.`, `${cap(num(lang, mn))} is less than ${num(lang, mx)}.`, `${cap(num(lang, mn))} es menos que ${num(lang, mx)}.`),
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
        prompt: T(lang, `Zajko má ${cntD(lang, it, a)}. Zjedol ${b}. Koľko mrkiev mu zostalo?`, `The bunny has ${a} carrots. He eats ${b}. How many carrots are left?`, `El conejito tiene ${a} zanahorias. Se come ${b}. ¿Cuántas zanahorias le quedan?`),
        say: T(lang, `Zajko má ${cnt(lang, it, a)}. Zjedol ${skAccF(b)}. Koľko mrkiev mu zostalo?`, `The bunny has ${cnt(lang, it, a)}. He eats ${num(lang, b)}. How many carrots are left?`, `El conejito tiene ${cnt(lang, it, a)}. Se come ${esNum(b, 'f')}. ¿Cuántas zanahorias le quedan?`),
        hint: T(lang, 'Spočítaj, koľko mrkiev zostalo.', 'Count the carrots that are left.', 'Cuenta las zanahorias que quedan.'),
        answer: T(lang, `${ans === 1 ? 'Zostala' : ans <= 4 ? 'Zostali' : 'Zostalo'} mu ${cnt(lang, it, ans)}.`, ans === 1 ? 'One carrot is left.' : `${cap(cnt(lang, it, ans))} are left.`, ans === 1 ? 'Le queda una zanahoria.' : `Le quedan ${cnt(lang, it, ans)}.`),
        display: grid(it.e, a, b) + `<div class="eq">${a} − ${b} = ?</div>`, options: numOpts(r, lang, ans, 4, 12)
      };
    }
    const duck = kind === 0, it = duck ? DUCK : APPLE, a = ri(r, 3, 9), b = ri(r, 2, 4), ans = a + b;
    const pr = duck
      ? [`Mama kačica má ${cntD('sk', it, a)}. Priplávali ešte ${b}. Koľko kačiatok má teraz?`, `Mother Duck has ${a} ducklings. ${b} more swim over. How many ducklings does she have now?`, `Mamá pata tiene ${a} patitos. Llegan nadando ${b} más. ¿Cuántos patitos tiene ahora?`]
      : [`Vierka má ${cntD('sk', it, a)}. Dostala ešte ${b}. Koľko jabĺk má teraz?`, `Vera has ${a} apples. She gets ${b} more. How many apples does she have now?`, `Vera tiene ${a} manzanas. Le dan ${b} más. ¿Cuántas manzanas tiene ahora?`];
    const sy = duck
      ? [`Mama kačica má ${cnt('sk', it, a)}. Priplávali ešte ${skNum(b, 'n')}. Koľko kačiatok má teraz?`, `Mother Duck has ${cnt('en', it, a)}. ${cap(num('en', b))} more swim over. How many ducklings does she have now?`, `Mamá pata tiene ${cnt('es', it, a)}. Llegan nadando ${num('es', b)} más. ¿Cuántos patitos tiene ahora?`]
      : [`Vierka má ${cnt('sk', it, a)}. Dostala ešte ${skNum(b, 'n')}. Koľko jabĺk má teraz?`, `Vera has ${cnt('en', it, a)}. She gets ${num('en', b)} more. How many apples does she have now?`, `Vera tiene ${cnt('es', it, a)}. Le dan ${num('es', b)} más. ¿Cuántas manzanas tiene ahora?`];
    return {
      kind: 'choose', prompt: T(lang, ...pr), say: T(lang, ...sy),
      hint: T(lang, 'Spočítaj všetko spolu.', 'Count them all together.', 'Cuéntalos todos juntos.'),
      answer: T(lang, `Teraz má ${cnt('sk', it, ans)}.`, `Now she has ${cnt('en', it, ans)}.`, `Ahora tiene ${cnt('es', it, ans)}.`),
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
        kind: 'choose', prompt: T(lang, 'Nájdi veľké písmeno k malému.', 'Find the big letter for the small one.', 'Busca la mayúscula de esta minúscula.'),
        say: T(lang, `Nájdi veľké písmeno ${t}.`, `Find the big letter ${t}.`, `Busca la ${t} mayúscula.`),
        hint: T(lang, `Malé ${tl} a veľké ${t} sú to isté písmeno.`, `Small ${tl} and big ${t} are the same letter.`, `La ${tl} minúscula y la ${t} mayúscula son la misma letra.`),
        answer: T(lang, `Malé ${tl} a veľké ${t}.`, `Small ${tl} and big ${t}.`, `La ${tl} minúscula y la ${t} mayúscula.`),
        hintShow: big(tl + ' ' + t, 'let'), display: big(tl, 'let huge'),
        options: letterOpts(r, lang, t, i < 5 ? L.easy : all, i < 3 ? 3 : 4, false)
      };
    }
    if (i < 34) {
      const lastMode = i < 22;
      const [e, w] = pick(r, lastMode ? LAST[lang] : FIRST2[lang]); const wl = w.toLowerCase(), t = lastMode ? w[w.length - 1] : w[0];
      const pool = all.filter(l => !conf(lang, l, t));
      const o = lastMode
        ? { prompt: T(lang, 'Na aké písmeno sa končí toto slovo?', 'Which letter does this word end with?', '¿Con qué letra termina esta palabra?'),
          say: T(lang, `Na aké písmeno sa končí slovo ${wl}?`, `Which letter does the word ${wl} end with?`, `¿Con qué letra termina la palabra ${wl}?`),
          hint: T(lang, `Povedz slovo pomaly: ${wl}. Počúvaj posledný zvuk.`, `Say it slowly: ${wl}. Listen to the last sound.`, `Dilo despacio: ${wl}. Escucha el último sonido.`),
          answer: T(lang, `Slovo ${wl} sa končí na ${t}.`, `The word ${wl} ends with ${t}.`, `La palabra ${wl} termina con ${t}.`) }
        : { prompt: T(lang, 'Na aké písmeno sa začína toto slovo?', 'Which letter does this word begin with?', '¿Por qué letra empieza esta palabra?'),
          say: T(lang, `Počúvaj: ${wl}. Na aké písmeno sa začína?`, `Listen: ${wl}. Which letter does it begin with?`, `Escucha: ${wl}. ¿Por qué letra empieza?`),
          hint: T(lang, `Povedz slovo pomaly: ${wl}. Počúvaj prvý zvuk.`, `Say it slowly: ${wl}. Listen to the first sound.`, `Dilo despacio: ${wl}. Escucha el primer sonido.`),
          answer: T(lang, `Slovo ${wl} sa začína na ${t}.`, `The word ${wl} begins with ${t}.`, `La palabra ${wl} empieza por ${t}.`) };
      return Object.assign({ kind: 'choose', hintShow: big(t, 'let'), display: `<button class="word picword" data-say="${wl}">${e}</button>`,
        options: letterOpts(r, lang, t, [t, ...pool], i < 16 || (i >= 22 && i < 28) ? 3 : 4, false) }, o);
    }
    if (i < 42) {
      const v = pick(r, VOW[lang]), cs = sample(r, CONS[lang], i < 38 ? 2 : 3), list = shuffle(r, [v, ...cs]);
      const others = list.filter(x => x !== v);
      return {
        kind: 'choose', prompt: T(lang, 'Ktoré písmeno je samohláska?', 'Which letter is a vowel?', '¿Qué letra es una vocal?'),
        hint: T(lang, 'Samohlásky sú A, E, I, O, U.', 'The vowels are A, E, I, O, U.', 'Las vocales son A, E, I, O, U.'),
        answer: T(lang, `${v} je samohláska. ${joinAnd('sk', others)} sú spoluhlásky.`, `${v} is a vowel. ${joinAnd('en', others)} are consonants.`, `La ${v} es una vocal. ${cap(joinAnd('es', others.map(x => 'la ' + x)))} son consonantes.`),
        display: emo('🔤'),
        options: list.map(l => ({ html: big(l, 'let'), ok: l === v, say: letterName(lang, l, false) }))
      };
    }
    const words = FIRST2[lang].concat(LAST[lang]);
    const base = pick(r, words), t = base[1][0];
    const has = w => [...w].some(ch => conf(lang, ch, t) || ch === t);
    const others = sample(r, words.filter(x => x !== base && !has(x[1])), i < 46 ? 2 : 3);
    return {
      kind: 'choose', prompt: T(lang, `V ktorom slove počuješ písmeno ${t}?`, `In which word do you hear the letter ${t}?`, `¿En qué palabra oyes la letra ${t}?`),
      hint: T(lang, 'Povedz každý obrázok nahlas a počúvaj.', 'Say each picture out loud and listen.', 'Di cada dibujo en voz alta y escucha.'),
      answer: T(lang, `Slovo ${base[1].toLowerCase()} má písmeno ${t}.`, `The word ${base[1].toLowerCase()} has the letter ${t}.`, `La palabra ${base[1].toLowerCase()} tiene la letra ${t}.`),
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
  const VOWELS_ANY = /[AEIOUYÁÉÍÓÚÝÄÔ]/;
  function genWords2(i, lang, r) {
    const W = WORDS2[lang];
    const band = (lo, hi) => W.slice(Math.floor(lo * W.length), Math.max(Math.floor(lo * W.length) + 3, Math.floor(hi * W.length)));
    if (i < 20) {
      const [e, w] = pick(r, band(i / 25, (i + 6) / 25)); const n = i < 3 ? 3 : 4;
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      const multi = sylOf(lang, w).length > 1;
      const hs = sylSay(lang, w, multi ? T(lang, 'Čítaj po slabikách:', 'Read it in syllables:', 'Lee por sílabas:') : T(lang, 'Ťukni na slovo a počúvaj:', 'Tap the word and listen:', 'Toca la palabra y escucha:'));
      const as = sylSay(lang, w);
      return {
        kind: 'choose', prompt: T(lang, 'Čo je tu napísané? Ťukni na obrázok.', 'What does it say? Tap the picture.', '¿Qué dice aquí? Toca el dibujo.'),
        hint: hs.text, hintParts: hs.parts, answer: as.text, answerParts: as.parts,
        display: `<button class="word" data-say="${w.toLowerCase()}">${w}</button>`,
        options: shuffle(r, [[e, w], ...others].map(([ee, ww]) => ({ html: emo(ee), ok: ee === e, say: ww.toLowerCase() })))
      };
    }
    if (i < 30) {
      const pool = W.filter(x => sylOf(lang, x[1]).length >= (i < 24 ? 1 : 2));
      const [e, w] = pick(r, pool); const sy = sylOf(lang, w), k = sy.length;
      const cntTxt = T(lang, `${k === 1 ? 'Jednu' : cap(skNum(k, 'f'))} ${SYLN.sk[Math.min(k, 5)]}.`, `${cap(num('en', k))} ${SYLN.en[Math.min(k, 5)]}.`, `${k === 1 ? 'Una' : cap(num('es', k))} ${SYLN.es[Math.min(k, 5)]}.`);
      const wl = cap(w.toLowerCase());
      return {
        kind: 'choose', prompt: T(lang, 'Koľko slabík má toto slovo? Tlieskaj pri každej slabike.', 'How many syllables does this word have? Clap for each one.', '¿Cuántas sílabas tiene esta palabra? Da una palmada por cada una.'),
        hint: T(lang, `Povedz slovo pomaly a tlieskaj: ${w.toLowerCase()}.`, `Say the word slowly and clap: ${w.toLowerCase()}.`, `Di la palabra despacio y da palmadas: ${w.toLowerCase()}.`),
        answer: `${k > 1 ? cap(sy.join(' – ')) + '. ' : wl + '. '}${T(lang, 'Má', 'It has', 'Tiene')} ${cntTxt.charAt(0).toLowerCase() + cntTxt.slice(1)}`,
        answerParts: [...(k > 1 ? sy.map(sylClip) : [wl + '.']), `${T(lang, 'Má', 'It has', 'Tiene')} ${cntTxt.charAt(0).toLowerCase() + cntTxt.slice(1)}`],
        display: `${emo(e)}<button class="word" data-say="${w.toLowerCase()}">${w}</button>`,
        options: [1, 2, 3, 4].map(v => ({ html: big(v, 'num'), ok: v === k, say: num(lang, v) }))
      };
    }
    if (i < 40) {
      const [e, w] = pick(r, band((i - 30) / 12, (i - 27) / 12));
      const near = W.filter(x => x[1] !== w).sort((a, b) => (Math.abs(a[1].length - w.length) - (a[1][0] === w[0] ? 2 : 0)) - (Math.abs(b[1].length - w.length) - (b[1][0] === w[0] ? 2 : 0)) || (r() - 0.5));
      const others = sample(r, near.slice(0, 7), i < 35 ? 2 : 3); const as = sylSay(lang, w);
      return {
        kind: 'choose', prompt: T(lang, 'Nájdi slovo, ktoré patrí k obrázku.', 'Find the word for this picture.', 'Busca la palabra de este dibujo.'),
        hint: T(lang, 'Čítaj každé slovo po slabikách.', 'Read each word in syllables.', 'Lee cada palabra por sílabas.'),
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
      kind: 'choose', prompt: T(lang, 'Ktoré písmeno chýba v slove?', 'Which letter is missing?', '¿Qué letra falta?'),
      hint: T(lang, `Počúvaj: ${wl}.`, `Listen: ${wl}.`, `Escucha: ${wl}.`),
      answer: T(lang, `${cap(wl)}. Chýba písmeno ${Lm}.`, `${cap(wl)}. The missing letter is ${Lm}.`, `${cap(wl)}. Falta la letra ${Lm}.`),
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
  const L3 = (lang, a, b, c) => lang === 'sk' ? a : lang === 'es' ? c : b;
  function genRiddles2(i, lang, r) {
    const nm = it => L3(lang, it[1], it[2], it[3]);
    if (i < 10) {
      const [c1, c2] = sample(r, CATS2, 2); const n = i < 5 ? 4 : 5;
      const same = sample(r, c1.items, n - 1), odd = pick(r, c2.items), pl = !!odd[4];
      return {
        kind: 'choose', prompt: T(lang, 'Čo je tu iné ako ostatné?', 'Which one is different from the others?', '¿Cuál es distinto a los demás?'),
        say: T(lang, `Čo je tu iné ako ostatné? ${c1.skAll}`, `Which one is different from the others? ${c1.enAll}`, `¿Cuál es distinto a los demás? ${c1.esAll}`),
        hint: T(lang, `${c1.skAll} Ktorý obrázok sem nepatrí?`, `${c1.enAll} Which picture does not fit?`, `${c1.esAll} ¿Qué dibujo no va aquí?`),
        answer: T(lang, `${cap(odd[1])} sem ${pl ? 'nepatria' : 'nepatrí'}. Ostatné sú ${c1.sk}.`, `The odd one out: the ${odd[2]}. The others are ${c1.en}.`, `${cap(odd[3])} no ${pl ? 'van' : 'va'} con los demás. Los demás son ${c1.es}.`),
        display: emo('🧐'),
        options: shuffle(r, [...same.map(e => ({ html: emo(e[0]), ok: false, say: L3(lang, e[1], 'the ' + e[2], e[3]) })), { html: emo(odd[0]), ok: true, say: L3(lang, odd[1], 'the ' + odd[2], odd[3]) }])
      };
    }
    if (i < 20) {
      const w = pick(r, WHO), others = sample(r, WHO.filter(x => x !== w && !(['🐢', '🦔'].includes(x[0]) && ['🐢', '🦔'].includes(w[0]))), i < 15 ? 2 : 3);
      return {
        kind: 'choose', prompt: L3(lang, w[1], w[2], w[3]),
        hint: T(lang, 'Počúvaj ešte raz a pozri sa na všetky obrázky.', 'Listen again and look at all the pictures.', 'Escucha otra vez y mira todos los dibujos.'),
        answer: T(lang, `Som ${w[4]}.`, `I am ${w[5]}.`, `Soy ${w[6]}.`),
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
          prompt: T(lang, `Ktoré zvieratko je v rade ${ORD.sk[p]}? Počítaj zľava.`, `Which animal is ${ORD.en[p]} in the row? Count from the left.`, `¿Qué animal está en el ${ORD.es[p]} lugar? Cuenta desde la izquierda.`),
          hint: T(lang, 'Ukáž prstom na prvé zvieratko vľavo a počítaj.', 'Point at the first animal on the left and count.', 'Señala el primer animal de la izquierda y cuenta.'),
          answer: T(lang, `${cap(ORD.sk[p])} zvieratko je ${a[1]}.`, `The ${ORD.en[p]} animal is the ${a[3]}.`, `En el ${ORD.es[p]} lugar está ${a[4]}.`),
          display: rowHtml + listen(),
          options: shuffle(r, row.slice(0, Math.min(len, 4)).concat(p >= 4 ? [] : []).filter((x, k, arr) => arr.indexOf(x) === k).concat(p >= 4 ? [a] : []).slice(-4).map(x => ({ html: emo(x[0]), ok: x === a, say: L3(lang, x[1], 'the ' + x[3], x[4]) })))
        };
      }
      const p = ri(r, 1, len - 2), Lx = row[p - 1], M = row[p], Rx = row[p + 1];
      const opts = [M, Lx, Rx, ...row.filter(x => ![M, Lx, Rx].includes(x)).slice(0, 1)];
      return {
        kind: 'choose',
        prompt: T(lang, `Kto stojí medzi ${Lx[2]} a ${Rx[2]}?`, `Who is standing between the ${Lx[3]} and the ${Rx[3]}?`, `¿Quién está entre ${Lx[4]} y ${Rx[4]}?`),
        hint: T(lang, `Nájdi ${Lx[1]} a ${Rx[1]}. Kto je v strede?`.replace(/^Nájdi (\S+)a /, 'Nájdi $1a '), `Find the ${Lx[3]} and the ${Rx[3]}. Who is in the middle?`, `Busca ${Lx[4]} y ${Rx[4]}. ¿Quién está en medio?`),
        answer: T(lang, `Medzi ${Lx[2]} a ${Rx[2]} stojí ${M[1]}.`, `The ${M[3]} is between the ${Lx[3]} and the ${Rx[3]}.`, `${cap(M[4])} está entre ${Lx[4]} y ${Rx[4]}.`),
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
        kind: 'choose', prompt: T(lang, 'Čo chýba v rade?', 'What is missing in the row?', '¿Qué falta en la fila?'),
        hint: T(lang, 'Povedz si rad nahlas a nájdi, čo sa opakuje.', 'Say the row out loud and find what repeats.', 'Di la fila en voz alta y busca lo que se repite.'),
        answer: T(lang, `Chýba ${its[miss][1]}. ${cap(seq.map(k => its[k][1]).join(', '))}.`, `The ${its[miss][2]} is missing. ${cap(seq.map(k => its[k][2]).join(', '))}.`, `Falta ${its[miss][3]}. ${cap(seq.map(k => its[k][3]).join(', '))}.`),
        display: `<div class="seq">${seq.map((k, j) => j === mi ? '<span class="cell q">?</span>' : `<span class="cell">${emo(its[k][0])}</span>`).join('')}</div>`,
        options: optIdx.map(k => ({ html: emo(its[k][0]), ok: k === miss, say: L3(lang, its[k][1], 'the ' + its[k][2], its[k][3]) }))
      };
    }
    const s = pick(r, SIT), others = sample(r, SIT.filter(x => x !== s), i < 46 ? 2 : 3);
    return {
      kind: 'choose', prompt: L3(lang, s[1], s[2], s[3]),
      hint: T(lang, 'Čo by si naozaj potreboval? Pozri sa na všetky obrázky.', 'What would you really need? Look at all the pictures.', '¿Qué necesitarías de verdad? Mira todos los dibujos.'),
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
    return T(lang, `${cap(it.sk)} ${pl ? 'sú' : 'je'} ${adj(c, it.g)}.`, `The ${it.en} ${pl ? 'are' : 'is'} ${c.en}.`, `${cap(ART[it.eg])} ${it.es} ${pl ? 'son' : 'es'} ${c.es[it.eg]}.`);
  }
  function ruleSame(lang, slot, val, refSlot, refVal) {
    const it = SLOT_IT(slot, val), rf = SLOT_IT(refSlot, refVal), pl = it.g === 'pl';
    return T(lang, `${cap(it.sk)} ${pl ? 'majú' : 'má'} rovnakú farbu ako ${rf.sk}.`, `The ${it.en} ${pl ? 'are' : 'is'} the same color as the ${rf.en}.`, `${cap(ART[it.eg])} ${it.es} ${pl ? 'son' : 'es'} del mismo color que ${ART[rf.eg]} ${rf.es}.`);
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
    const prompt = rules ? T(lang, `Počúvaj. ${text.join(' ')} Potom ťukni na fajku.`, `Listen. ${text.join(' ')} Then tap the check mark.`, `Escucha. ${text.join(' ')} Luego toca la palomita.`)
      : T(lang, 'Zajko ide na výlet. Obleč ho rovnako ako na obrázku a ťukni na fajku.', 'Zack is going on a trip. Dress him just like the picture, then tap the check mark.', 'Coco se va de excursión. Vístelo igual que en el dibujo y toca la palomita.');
    return {
      kind: 'dress', slots, target, choices, byEar: rules, prompt,
      say: rules ? prompt : T(lang, `Zajko ide na výlet. Obleč ho rovnako ako na obrázku: ${joinAnd(lang, namesAcc)}. Potom ťukni na fajku.`, `Zack is going on a trip. Dress him just like the picture: ${joinAnd(lang, enA)}. Then tap the check mark.`, `Coco se va de excursión. Vístelo igual que en el dibujo: ${joinAnd(lang, namesAcc)}. Luego toca la palomita.`),
      hint: rules ? T(lang, 'Počúvaj pozorne, akú farbu má mať každá vec.', 'Listen carefully to which color each thing should be.', 'Escucha bien de qué color tiene que ser cada cosa.') : T(lang, 'Porovnaj Zajka s obrázkom.', 'Compare Zack with the picture.', 'Compara a Coco con el dibujo.'),
      answer: T(lang, `Zajko má ${joinAnd(lang, namesAcc)}.`, `Zack has ${joinAnd('en', enA)}.`, `Coco tiene ${joinAnd(lang, namesAcc)}.`),
      slotHints: Object.fromEntries(slots.map(s => [s, SLOT_Q[s][lang]])),
      slotNames: Object.fromEntries(slots.map(s => [s, T(lang, `Zajko má mať ${itemName(lang, s, target[s], true)}.`, `Zack needs the ${itemName(lang, s, target[s])}.`, `Coco necesita ${itemName(lang, s, target[s], true)}.`)])),
      itemSay: Object.fromEntries(slots.map(s => [s, Object.fromEntries(choices[s].map(v => [v, itemName(lang, s, v)]))]))
    };
  }

  const GAMES = [
    { id: 'colors', img: 'chameleon', color: '#f7d6e6', gen: genColors2,
      title: { sk: 'Farby a tvary', en: 'Colors & Shapes', es: 'Colores y formas' }, helper: { sk: 'Chameleón Kamil', en: 'Kamil the Chameleon', es: 'Kamil el camaleón' },
      intro: { sk: 'Ahoj, to som zase ja, chameleón Kamil! Dnes budeme miešať farby a počítať rohy.', en: 'Hi, it is me again, Kamil the Chameleon! Today we will mix colors and count corners.', es: '¡Hola, soy yo otra vez, Kamil el camaleón! Hoy vamos a mezclar colores y contar esquinas.' } },
    { id: 'count', img: 'veverica', color: '#fbe0c8', gen: genCount2,
      title: { sk: 'Počítanie', en: 'Counting', es: 'Contar' }, helper: { sk: 'Veverička Vierka', en: 'Vera the Squirrel', es: 'Vera la ardilla' },
      intro: { sk: 'Ahoj, tu je veverička Vierka! Mám pre teba nové počty s lienkami, žabkami a kačiatkami.', en: 'Hi, Vera the Squirrel here! I have new counting games with ladybugs, frogs and ducklings.', es: '¡Hola, aquí Vera la ardilla! Tengo cuentas nuevas con mariquitas, ranas y patitos.' } },
    { id: 'letters', img: 'sovicka', color: '#e6dcf5', gen: genLetters2,
      title: { sk: 'Písmenká', en: 'Letters', es: 'Letras' }, helper: { sk: 'Sovička Soňa', en: 'Sonia the Owl', es: 'Sonia la lechuza' },
      intro: { sk: 'Ahoj, sovička Soňa je späť! Budeme hľadať písmenká na začiatku aj na konci slov.', en: 'Hi, Sonia the Owl is back! We will find letters at the start and at the end of words.', es: '¡Hola, Sonia la lechuza ha vuelto! Vamos a buscar letras al principio y al final de las palabras.' } },
    { id: 'words', img: 'papagaj', color: '#d6f0d9', gen: genWords2,
      title: { sk: 'Prvé slová', en: 'First Words', es: 'Primeras palabras' }, helper: { sk: 'Papagáj Pepo', en: 'Pepo the Parrot', es: 'Pepo el loro' },
      intro: { sk: 'Ahoj, papagáj Pepo ťa víta! Mám nové slová a budeme spolu tlieskať slabiky.', en: 'Hi, Pepo the Parrot says hello! I have new words and we will clap the syllables together.', es: '¡Hola, Pepo el loro te saluda! Tengo palabras nuevas y vamos a dar palmadas con las sílabas.' } },
    { id: 'riddles', img: 'liska', color: '#fde6c6', gen: genRiddles2,
      title: { sk: 'Hádanky', en: 'Riddles', es: 'Adivinanzas' }, helper: { sk: 'Líška Lili', en: 'Lili the Fox', es: 'Lili la zorrita' },
      intro: { sk: 'Ahoj, líška Lili tu má nové hádanky! Uhádneš, kto som?', en: 'Hi, Lili the Fox has new riddles! Can you guess who I am?', es: '¡Hola, Lili la zorrita tiene adivinanzas nuevas! ¿Adivinas quién soy?' } },
    { id: 'dress', img: 'zajacik', color: '#d8e9f7', gen: genDress2,
      title: { sk: 'Obliekanie', en: 'Dressing Up', es: 'Vestirse' }, helper: { sk: 'Zajačik Zajko', en: 'Zack the Bunny', es: 'Coco el conejito' },
      intro: { sk: 'Ahoj, zajačik Zajko ide na výlet! Pomôžeš mi vybrať oblečenie?', en: 'Hi, Zack the Bunny is going on a trip! Will you help me choose my clothes?', es: '¡Hola, Coco el conejito se va de excursión! ¿Me ayudas a elegir la ropa?' } }
  ];

  function stageOf(id, i) {
    switch (id) {
      case 'colors': return i < 10 ? ['objcolor'] : i < 16 ? ['mix'] : i < 28 ? ['corners', true] : i < 40 ? ['size', true] : ['byear', true];
      case 'count': return i < 12 ? ['count'] : i < 22 ? ['nextprev'] : i < 32 ? ['missing'] : i < 40 ? ['fewer'] : ['story', true];
      case 'letters': return i < 10 ? ['upper'] : i < 22 ? ['lastsound', true] : i < 34 ? ['firstsound', true] : i < 42 ? ['vowel'] : ['hasletter'];
      case 'words': return i < 20 ? ['read'] : i < 30 ? ['syllables'] : i < 40 ? ['picword'] : ['missingletter'];
      case 'riddles': return i < 10 ? ['odd'] : i < 20 ? ['whoami', true] : i < 26 ? ['ordinal', true] : i < 32 ? ['between', true] : i < 42 ? ['missing'] : ['situation', true];
      default: return i < 16 ? ['dress'] : ['rules', true];
    }
  }
  // every task is unique inside a game: retry with another seed if the content repeats an earlier task
  const sigOf = t => JSON.stringify([t.prompt, t.say || '', t.answer, t.kind === 'dress' ? t.target : null]);
  const SALT = {};
  function saltFor(gameId, index) {
    const g = GAMES.find(x => x.id === gameId), S = SALT[gameId] = SALT[gameId] || { seen: new Set(), salts: [] };
    while (S.salts.length <= index) {
      const i = S.salts.length; let s = 0, sig;
      for (; s < 120; s++) { sig = ['sk', 'en', 'es'].map(L => L + sigOf(g.gen(i, L, rng(hash('zs2' + gameId) + i * 7919 + s * 104729)))); if (!sig.some(x => S.seen.has(x))) break; }
      sig.forEach(x => S.seen.add(x)); S.salts.push(s);
    }
    return S.salts[index];
  }
  function getTask(gameId, index, lang) {
    const g = GAMES.find(x => x.id === gameId);
    const r = rng(hash('zs2' + gameId) + index * 7919 + saltFor(gameId, index) * 104729);
    const t = g.gen(index, lang, r); t.index = index;
    const [st, listen] = stageOf(gameId, index); t.type = gameId + ':' + st; t.listenOnly = listen; return t;
  }

  window.ZS_GAMES = { GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG, num, nutsW, conf, FIRST: FIRST2, LAST, WORDS2, SYL, sigOf };
})();

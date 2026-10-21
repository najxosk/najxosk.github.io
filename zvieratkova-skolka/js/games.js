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
  function genWords(i, lang, r) {
    const W = WORDS[lang];
    // start a bit further into the list (skip the most trivial words), end with the longest ones
    const idx = Math.min(W.length - 1, Math.floor((i + 6) * W.length / (TASKS_PER_GAME + 6)));
    const [e, w] = W[idx];
    const wl = w.toLowerCase();
    const n = i < 3 ? 3 : i < 40 ? 4 : 5;
    if (i < 28) {
      const others = sample(r, W.filter(x => x[0] !== e), n - 1);
      return {
        kind: 'choose', prompt: T(lang, 'Prečítaj slovo a nájdi obrázok.', 'Read the word and find the picture.', 'Lee la palabra y busca el dibujo.'),
        say: T(lang, 'Prečítaj slovo a nájdi obrázok. Ťukni na slovo a vypočuješ si ho.', 'Read the word and find the picture. Tap the word to hear it.', 'Lee la palabra y busca el dibujo. Toca la palabra para escucharla.'),
        hint: T(lang, `Ťukni na slovo. Počúvaj: ${w.split('').join(', ')}… ${wl}.`, `Tap the word. Listen: ${w.split('').join(', ')}… ${wl}.`, `Toca la palabra. Escucha: ${w.split('').join(', ')}… ${wl}.`),
        answer: T(lang, `${cap(wl)}. ${w.split('').join(', ')}.`, `${cap(wl)}. ${w.split('').join(', ')}.`),
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

  const GAMES = [
    { id: 'colors', img: 'chameleon', color: '#f7d6e6', gen: genColors,
      title: { sk: 'Farby a tvary', en: 'Colors & Shapes', es: 'Colores y formas' }, helper: { sk: 'Chameleón Kamil', en: 'Kamil the Chameleon', es: 'Kamil el camaleón' },
      intro: { sk: 'Ahoj, ja som chameleón Kamil. Ja viem meniť farby! Poď hľadať farby a tvary.', en: 'Hi, I am Kamil the Chameleon. I can change colors! Let us find colors and shapes.', es: '¡Hola! Soy Kamil, el camaleón. ¡Puedo cambiar de color! Vamos a buscar colores y formas.' } },
    { id: 'count', img: 'veverica', color: '#fbe0c8', gen: genCount,
      title: { sk: 'Počítanie', en: 'Counting', es: 'Contar' }, helper: { sk: 'Veverička Vierka', en: 'Vera the Squirrel', es: 'Vera la ardilla' },
      intro: { sk: 'Ahoj, ja som veverička Vierka. Mám plno orieškov. Poď ich so mnou počítať!', en: 'Hi, I am Vera the Squirrel. I have lots of nuts. Let us count them together!', es: '¡Hola! Soy Vera, la ardilla. Tengo muchas bellotas. ¡Vamos a contarlas juntos!' } },
    { id: 'letters', img: 'sovicka', color: '#e6dcf5', gen: genLetters,
      title: { sk: 'Písmenká', en: 'Letters', es: 'Letras' }, helper: { sk: 'Sovička Soňa', en: 'Sonia the Owl', es: 'Sonia la lechuza' },
      intro: { sk: 'Ahoj, ja som sovička Soňa. Rada čítam knižky. Poď spoznávať písmenká!', en: 'Hi, I am Sonia the Owl. I love books. Let us learn the letters!', es: '¡Hola! Soy Sonia, la lechuza. Me encantan los libros. ¡Vamos a conocer las letras!' } },
    { id: 'words', img: 'papagaj', color: '#d6f0d9', gen: genWords,
      title: { sk: 'Prvé slová', en: 'First Words', es: 'Primeras palabras' }, helper: { sk: 'Papagáj Pepo', en: 'Pepo the Parrot', es: 'Pepo el loro' },
      intro: { sk: 'Ahoj, ja som papagáj Pepo. Rád hovorím slová. Poď čítať prvé slová!', en: 'Hi, I am Pepo the Parrot. I love saying words. Let us read our first words!', es: '¡Hola! Soy Pepo, el loro. Me encanta decir palabras. ¡Vamos a leer las primeras palabras!' } },
    { id: 'riddles', img: 'liska', color: '#fde6c6', gen: genRiddles,
      title: { sk: 'Hádanky', en: 'Riddles', es: 'Adivinanzas' }, helper: { sk: 'Líška Lili', en: 'Lili the Fox', es: 'Lili la zorrita' },
      intro: { sk: 'Ahoj, ja som líška Lili. Mám rada hádanky. Poď ich so mnou riešiť!', en: 'Hi, I am Lili the Fox. I love riddles. Let us solve them together!', es: '¡Hola! Soy Lili, la zorrita. Me encantan las adivinanzas. ¡Vamos a resolverlas juntos!' } },
    { id: 'dress', img: 'zajacik', color: '#d8e9f7', gen: genDress,
      title: { sk: 'Obliekanie', en: 'Dressing Up', es: 'Vestirse' }, helper: { sk: 'Zajačik Zajko', en: 'Zack the Bunny', es: 'Coco el conejito' },
      intro: { sk: 'Ahoj, ja som zajačik Zajko. Pomôžeš mi obliecť sa podľa obrázka?', en: 'Hi, I am Zack the Bunny. Will you help me get dressed like in the picture?', es: '¡Hola! Soy Coco, el conejito. ¿Me ayudas a vestirme como en el dibujo?' } }
  ];

  function getTask(gameId, index, lang) {
    const g = GAMES.find(x => x.id === gameId);
    const r = rng(hash(gameId) + index * 7919);
    const t = g.gen(index, lang, r); t.index = index; return t;
  }

  window.ZS_GAMES = { GAMES, TASKS_PER_GAME, getTask, bunnySVG, itemSVG, num, nutsW, conf, FIRST };
})();

// Parser bankových výpisov – beží iba lokálne v prehliadači.
export const DATE_RE_G = /(?<!\d)(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?!\d)/g;
const ISO_DATE_RE_G = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
// suma: voliteľné znamienko, tisícky medzerou/bodkou, desatinná čiarka (alebo bodka), voliteľne EUR, voliteľné znamienko na konci
const AMT_RE_G = /(?<![\d,.\w])([+\-−–]\s?)?(\d{1,3}(?:[ \u00a0\u202f.]\d{3})+|\d+)([,.])(\d{2})(?![\d])(\s?(?:EUR|€))?(\s?[+\-](?![\d]))?/g;
const IBAN_RE_G = /\b[A-Z]{2}\d{2}(?:\s?[0-9A-Z]{4}){3,7}(?:\s?[0-9A-Z]{1,4})?\b/g;

export function normText(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})/);
  let d, mo, y;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000; }
  else if ((m = s.match(/(\d{4})-(\d{2})-(\d{2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseAmount(s) {
  if (s == null) return null;
  if (typeof s === 'number') return isFinite(s) ? s : null;
  let t = String(s).replace(/EUR|€/gi, '').replace(/[\u00a0\u202f ]/g, '').replace(/[−–]/g, '-').trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
  if (t.endsWith('+')) t = t.slice(0, -1);
  if (t.startsWith('-')) { neg = true; t = t.slice(1); }
  if (t.startsWith('+')) t = t.slice(1);
  if (!/^\d[\d.,]*$/.test(t)) return null;
  const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
  if (lc > ld) t = t.replace(/\./g, '').replace(',', '.');
  else if (ld > lc && lc >= 0) t = t.replace(/,/g, '');
  else if (ld >= 0 && t.length - ld - 1 === 3 && (t.match(/\./g) || []).length >= 1 && !/^\d{1,3}\.\d{3}$/.test(t) === false) t = t.replace(/\./g, '');
  const v = parseFloat(t);
  if (!isFinite(v)) return null;
  return Math.round((neg ? -v : v) * 100) / 100;
}

function findDates(text) {
  const out = [];
  for (const re of [DATE_RE_G, ISO_DATE_RE_G]) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(text))) { const iso = parseDate(m[0]); if (iso) out.push({ iso, index: m.index, raw: m[0] }); }
  }
  return out.sort((a, b) => a.index - b.index);
}

function stripNoise(text) {
  return text.replace(DATE_RE_G, ' ').replace(ISO_DATE_RE_G, ' ').replace(IBAN_RE_G, ' ');
}

function findAmounts(text) {
  const clean = stripNoise(text);
  const out = []; AMT_RE_G.lastIndex = 0; let m;
  while ((m = AMT_RE_G.exec(clean))) {
    if (m[3] === '.' && !/[ \u00a0]/.test(m[2]) && m[2].includes('.')) continue;
    const pre = (m[1] || '').replace(/\s/g, ''), post = (m[6] || '').trim();
    const v = parseAmount(m[2] + ',' + m[4]);
    if (v == null) continue;
    let sign = 0;
    if (/[-−–]/.test(pre) || post === '-') sign = -1; else if (pre === '+' || post === '+') sign = 1;
    out.push({ value: v, sign, raw: m[0].trim(), hasCur: !!m[5] });
  }
  return out;
}

// ---- Extrakcia riadkov z PDF podľa y-pozície ----
export async function extractLines(pdf) {
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.filter(i => i.str && i.str.trim()).map(i => ({
      x: i.transform[4], y: i.transform[5], w: i.width || 0,
      h: Math.abs(i.transform[3]) || Math.abs(i.transform[0]) || 10, s: i.str,
    }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const groups = [];
    for (const it of items) {
      const g = groups[groups.length - 1];
      if (g && Math.abs(g.y - it.y) <= Math.max(2, Math.min(g.h, it.h) * 0.45)) g.items.push(it);
      else groups.push({ y: it.y, h: it.h, items: [it] });
    }
    for (const g of groups) {
      g.items.sort((a, b) => a.x - b.x);
      const cells = [];
      for (const it of g.items) {
        const c = cells[cells.length - 1];
        const gap = c ? it.x - (c.x2) : Infinity;
        if (c && gap < g.h * 0.9) { c.text += (gap > g.h * 0.12 ? ' ' : '') + it.s; c.x2 = it.x + it.w; }
        else cells.push({ x: it.x, x2: it.x + it.w, text: it.s });
      }
      cells.forEach(c => { c.text = c.text.replace(/\s+/g, ' ').trim(); });
      const cs = cells.filter(c => c.text);
      if (cs.length) lines.push({ page: p, y: g.y, cells: cs, text: cs.map(c => c.text).join('  ') });
    }
  }
  return lines;
}

const STOP_RE = /(po[cč]iato[cč]n[yý]|kone[cč]n[yý]|zostatok k|celkom|spolu|sum[aá]r|obraty|strana\s*\d|page\s*\d|^\s*d[aá]tum\b|v[yý]pis z [uú][cč]tu|ďakujeme|dakujeme)/i;
const GENERIC_RE = /^(mzda|v[yý]plata|platba kartou|platba|kartov[aá] transakcia|n[aá]kup|trval[yý] pr[ií]kaz|prevod|odchádzaj[uú]ca platba|odchadzajuca platba|prichádzaj[uú]ca platba|prichadzajuca platba|prijat[aá] platba|sepa\b.*|inkaso|[uú]hrada|v[yý]ber z bankomatu|v[yý]ber|poplatok|debet|kredit|transakcia|pohyb|okam[zž]it[aá] platba)\s*:?$/i;
const INCOME_HINT = /(kredit|prijat|prich[aá]dzaj|pripísan|prip[ií]san|mzda|v[yý]plata|vklad|dobropis|refund|\bcr\b)/i;
const REF_RE = /\b(VS|KS|SS|Ref\.?|E2E|Referencia|Variabiln[yý] symbol|Konštantn[yý]|Špecifick[yý])\s*:?\s*[\w\/-]+/gi;

function detectColumns(lines) {
  const cols = {};
  for (const l of lines.slice(0, 200)) {
    for (const c of l.cells) {
      const t = normText(c.text), cx = (c.x + c.x2) / 2;
      if (/^(kredit|prijem|pripisane|prijate|credit|\+)$/.test(t)) cols.credit = cx;
      if (/^(debet|vydavok|vydaj|odpisane|debit|-)$/.test(t)) cols.debit = cx;
      if (/^(zostatok|stav|balance)/.test(t)) cols.balance = cx;
    }
    if (cols.credit != null && cols.debit != null) break;
  }
  return cols;
}

function amountCells(line) {
  const res = [];
  for (const c of line.cells) for (const a of findAmounts(c.text)) res.push({ ...a, cx: (c.x + c.x2) / 2 });
  return res;
}

function buildTx(dateIso, amt, textPieces, rawLines, strategy) {
  let pieces = textPieces.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let refs = [];
  pieces = pieces.map(p => p.replace(REF_RE, m => { refs.push(m.trim()); return ' '; }).replace(IBAN_RE_G, ' ').replace(/\b(EUR|€)\b/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p && !/^[\d\s.,:\/*+-]+$/.test(p));
  const generic = []; let cp = '';
  const rest = [];
  for (const p of pieces) {
    if (!cp && GENERIC_RE.test(p)) { generic.push(p); continue; }
    if (!cp) {
      const m = p.match(/^(platba kartou|n[aá]kup|kartov[aá] transakcia|trval[yý] pr[ií]kaz|inkaso|prevod)\s*:?\s+(.+)$/i);
      if (m) { generic.push(m[1]); cp = m[2]; continue; }
      cp = p; continue;
    }
    rest.push(p);
  }
  const desc = [...generic, ...rest, ...refs].join(' · ');
  return { id: Math.random().toString(36).slice(2, 10), date: dateIso, amount: amt, counterparty: cp || generic.join(' ') || '(neznáme)', description: desc, raw: rawLines.join(' ⏎ '), strategy };
}

function resolveAmount(amts, cols, textAll) {
  if (!amts.length) return null;
  let cand = amts;
  if (cols.balance != null && amts.length > 1) {
    const nb = amts.filter(a => Math.abs(a.cx - cols.balance) > 25);
    if (nb.length) cand = nb;
  }
  const signed = cand.find(a => a.sign !== 0);
  const a = signed || cand[0];
  if (a.sign) return a.sign * Math.abs(a.value);
  if (cols.credit != null && cols.debit != null)
    return Math.abs(a.cx - cols.credit) < Math.abs(a.cx - cols.debit) ? Math.abs(a.value) : -Math.abs(a.value);
  return INCOME_HINT.test(textAll) ? Math.abs(a.value) : -Math.abs(a.value);
}

// Stratégia A: bloky – riadok začínajúci dátumom otvára pohyb, nasledujúce riadky bez dátumu sú jeho pokračovanie
function strategyBlocks(lines, cols) {
  const tx = []; let cur = null;
  const flush = () => {
    if (!cur) return;
    let amts = amountCells(cur.lines[0]);
    if (!amts.length) for (const l of cur.lines.slice(1)) { amts = amountCells(l); if (amts.length) break; }
    const all = cur.lines.map(l => l.text).join(' ');
    const amt = resolveAmount(amts, cols, all);
    if (amt != null && amt !== 0) {
      const pieces = [];
      cur.lines.forEach(l => l.cells.forEach(c => {
        let t = stripNoise(c.text); AMT_RE_G.lastIndex = 0; t = t.replace(AMT_RE_G, ' ');
        pieces.push(t);
      }));
      tx.push(buildTx(cur.date, amt, pieces, cur.lines.map(l => l.text), 'bloky'));
    }
    cur = null;
  };
  for (const l of lines) {
    const ds = findDates(l.text);
    const startsWithDate = ds.length && ds[0].index <= 3;
    if (startsWithDate && !STOP_RE.test(l.text)) { flush(); cur = { date: ds[0].iso, lines: [l] }; continue; }
    if (!cur) continue;
    if (STOP_RE.test(l.text) || cur.lines.length >= 4 || (l.page !== cur.lines[0].page)) { flush(); continue; }
    cur.lines.push(l);
  }
  flush();
  return tx;
}

// Stratégia B: jeden riadok = jeden pohyb (dátum kdekoľvek + suma v tom istom riadku)
function strategySingle(lines, cols) {
  const tx = [];
  for (const l of lines) {
    if (STOP_RE.test(l.text)) continue;
    const ds = findDates(l.text); if (!ds.length) continue;
    const amt = resolveAmount(amountCells(l), cols, l.text);
    if (amt == null || amt === 0) continue;
    const pieces = l.cells.map(c => { let t = stripNoise(c.text); AMT_RE_G.lastIndex = 0; return t.replace(AMT_RE_G, ' '); });
    tx.push(buildTx(ds[0].iso, amt, pieces, [l.text], 'riadky'));
  }
  return tx;
}

export function parseTransactions(lines) {
  const cols = detectColumns(lines);
  const a = strategyBlocks(lines, cols), b = strategySingle(lines, cols);
  const score = t => t.filter(x => x.counterparty && x.counterparty !== '(neznáme)').length + t.length;
  const best = score(a) >= score(b) ? a : b;
  return { tx: best, strategy: best === a ? 'bloky' : 'riadky', cols, candidates: { bloky: a.length, riadky: b.length } };
}

// ---- Manuálne mapovanie stĺpcov (pre PDF riadky aj CSV) ----
export function guessMapping(rows) {
  const n = Math.max(0, ...rows.map(r => r.length));
  const stats = Array.from({ length: n }, () => ({ date: 0, amt: 0, text: 0, len: 0 }));
  for (const r of rows.slice(0, 300)) r.forEach((c, i) => {
    const s = String(c || '').trim(); if (!s) return;
    if (parseDate(s) && s.length <= 12) stats[i].date++;
    else if (parseAmount(s) != null) stats[i].amt++;
    else if (/[a-zá-ž]{3}/i.test(s)) { stats[i].text++; stats[i].len += s.length; }
  });
  const pick = (k, excl) => { let bi = -1, bv = 0; stats.forEach((s, i) => { if (!excl.includes(i) && s[k] > bv) { bv = s[k]; bi = i; } }); return bi; };
  const date = pick('date', []), amount = pick('amt', [date]);
  const counterparty = pick('text', [date, amount]);
  const description = pick('text', [date, amount, counterparty]);
  return { date, amount, counterparty, description, signMode: 'sign' };
}

export function applyMapping(rows, map) {
  const tx = [];
  for (const r of rows) {
    const d = parseDate(r[map.date]); if (!d) continue;
    let a = parseAmount(r[map.amount]); if (a == null || a === 0) continue;
    if (map.signMode === 'expense') a = -Math.abs(a);
    else if (map.signMode === 'invert') a = -a;
    tx.push({ id: Math.random().toString(36).slice(2, 10), date: d, amount: a,
      counterparty: (map.counterparty >= 0 ? String(r[map.counterparty] || '') : '').trim() || '(neznáme)',
      description: (map.description >= 0 ? String(r[map.description] || '') : '').trim(), raw: r.join(' | '), strategy: 'manuálne' });
  }
  return tx;
}

// ---- CSV ----
export function parseCSV(text) {
  text = text.replace(/^\ufeff/, '');
  const first = text.split(/\r?\n/).slice(0, 5).join('\n');
  const delim = [';', '\t', ','].map(d => [d, (first.match(new RegExp(d === '\t' ? '\t' : '\\' + d, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

export function csvHeaderMapping(header) {
  const h = header.map(normText);
  const f = re => h.findIndex(x => re.test(x));
  const m = { date: f(/datum|date|zauctovan/), amount: f(/suma|ciastka|amount|hodnota/), counterparty: f(/protistrana|nazov|prijemca|obchodnik|counterparty|partner|platitel/), description: f(/popis|sprava|poznamka|description|ucel|detail/), signMode: 'sign' };
  return m.date >= 0 && m.amount >= 0 ? m : null;
}

// ---- Maskovanie pre "Nahlás formát" ----
export function maskLine(s) {
  return s.replace(IBAN_RE_G, 'SK## #### #### #### #### ####').replace(/\d/g, '#');
}

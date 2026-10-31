import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';
import { extractLines, parseTransactions, parseCSV, csvHeaderMapping, guessMapping, applyMapping, maskLine, parseDate, parseAmount } from './parser.js';
import { CATEGORIES, CAT, DEFAULT_KEYWORDS, categorize, counterpartyKey } from './categories.js';
import { totals, byCategory, months, monthKey, monthLabel, recurring, tips, eur } from './analysis.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) if (k != null) e.append(k); return e; };
const LS = { rules: 'vydavky_rules', kw: 'vydavky_keywords', set: 'vydavky_settings', tx: 'vydavky_tx' };
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const state = {
  tx: [], sources: [],
  rules: load(LS.rules, {}),
  keywords: load(LS.kw, null) || structuredClone(DEFAULT_KEYWORDS),
  settings: load(LS.set, { rememberTx: false }),
  lastPassword: null,
};

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 3200); }

function recategorize() {
  for (const t of state.tx) if (!t.manual) { const r = categorize(t, state.keywords, state.rules); t.category = r.cat; t.by = r.by; }
}
function persist() {
  if (state.settings.rememberTx) save(LS.tx, state.tx); else localStorage.removeItem(LS.tx);
}
function addTx(list, source) {
  const seen = new Set(state.tx.map(t => `${t.date}|${t.amount}|${counterpartyKey(t.counterparty)}|${t.source}`));
  let added = 0;
  for (const t of list) { t.source = source; const k = `${t.date}|${t.amount}|${counterpartyKey(t.counterparty)}|${t.source}`; if (seen.has(k)) continue; seen.add(k); state.tx.push(t); added++; }
  state.tx.sort((a, b) => b.date.localeCompare(a.date));
  recategorize(); persist(); return added;
}

// ---------- Navigácia ----------
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== view));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'view-dash') renderDash();
  if (view === 'view-tx') renderTx();
  if (view === 'view-settings') renderSettings();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));

// ---------- Import ----------
function status(name, text, cls) {
  let li = [...$('#file-status').children].find(l => l.dataset.name === name);
  if (!li) { li = el('li'); li.dataset.name = name; $('#file-status').append(li); }
  li.className = cls || ''; li.textContent = `${name}: ${text}`;
}

let pwResolver = null;
function askPassword(name, wrong) {
  $('#pw-box').classList.remove('hidden');
  $('#pw-file').textContent = name;
  $('#pw-msg').textContent = wrong ? 'Nesprávne heslo. Skús to znova (pozor na veľké a malé písmená).' : 'Tento výpis je chránený heslom. Zadaj heslo (zvyčajne ho banka posiela zvlášť).';
  $('#pw').value = ''; $('#pw').focus();
  return new Promise(res => { pwResolver = res; });
}
function finishPw(v) { $('#pw-box').classList.add('hidden'); const r = pwResolver; pwResolver = null; r && r(v); }
$('#pw-ok').addEventListener('click', () => finishPw($('#pw').value));
$('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finishPw($('#pw').value); } });
$('#pw-skip').addEventListener('click', () => finishPw(null));

async function openPdf(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let password = state.lastPassword || undefined, triedLast = !!password, wrong = false;
  for (;;) {
    try {
      const doc = await pdfjsLib.getDocument({ data: buf.slice(), password, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: false }).promise;
      if (password) state.lastPassword = password;
      return doc;
    } catch (e) {
      if (e && e.name === 'PasswordException') {
        if (triedLast) { triedLast = false; } else if (password !== undefined) wrong = true;
        status(file.name, 'čaká na heslo…');
        const pw = await askPassword(file.name, wrong);
        if (pw == null) throw new Error('SKIP');
        password = pw; continue;
      }
      throw e;
    }
  }
}

async function handleFiles(files) {
  let total = 0;
  for (const f of files) {
    try {
      status(f.name, 'načítavam…');
      if (/\.csv$/i.test(f.name) || f.type === 'text/csv') {
        const rows = parseCSV(await f.text());
        const hm = rows.length ? csvHeaderMapping(rows[0]) : null;
        const map = hm || guessMapping(rows);
        const tx = applyMapping(hm ? rows.slice(1) : rows, map);
        state.sources.push({ name: f.name, rows, map });
        const n = addTx(tx, f.name); total += n;
        status(f.name, n ? `✔ ${n} pohybov (CSV)` : '⚠ nenašiel som pohyby – nastav stĺpce nižšie', n ? 'ok' : 'bad');
        continue;
      }
      const doc = await openPdf(f);
      const lines = await extractLines(doc);
      const res = parseTransactions(lines);
      const rows = lines.map(l => l.cells.map(c => c.text));
      state.sources.push({ name: f.name, rows, lines, map: guessMapping(rows) });
      const n = addTx(res.tx, f.name); total += n;
      if (!lines.length) status(f.name, '⚠ PDF neobsahuje text (možno je to sken). Skús CSV z internetbankingu.', 'bad');
      else status(f.name, n ? `✔ ${n} pohybov (${doc.numPages} str.)` : '⚠ nenašiel som pohyby – nastav stĺpce nižšie alebo nahlás formát', n ? 'ok' : 'bad');
    } catch (e) {
      if (e.message === 'SKIP') status(f.name, 'preskočené', 'bad');
      else { console.warn(e); status(f.name, '✖ súbor sa nepodarilo prečítať (je to naozaj PDF výpis?)', 'bad'); }
    }
  }
  renderRaw();
  if (total) { toast(`Načítaných ${total} pohybov`); setTimeout(() => show('view-dash'), 600); }
}
$('#file').addEventListener('change', e => { const fs = [...e.target.files]; e.target.value = ''; handleFiles(fs); });

$('#remember-tx').addEventListener('change', e => {
  state.settings.rememberTx = e.target.checked; save(LS.set, state.settings); persist();
  toast(e.target.checked ? 'Pohyby sa budú pamätať v tomto prehliadači' : 'Pohyby sa už nepamätajú');
});

// ---------- Ručné mapovanie ----------
function renderRaw() {
  if (!state.sources.length) return $('#raw-card').classList.add('hidden');
  $('#raw-card').classList.remove('hidden');
  const sel = $('#map-src'), prev = sel.value;
  sel.replaceChildren(...state.sources.map((s, i) => el('option', { value: i, textContent: s.name })));
  sel.value = prev && state.sources[prev] ? prev : state.sources.length - 1;
  renderMapTable();
}
function colOptions(n, withNone) {
  const o = withNone ? [el('option', { value: -1, textContent: '— nič —' })] : [];
  for (let i = 0; i < n; i++) o.push(el('option', { value: i, textContent: `${i + 1}` }));
  return o;
}
function renderMapTable() {
  const src = state.sources[$('#map-src').value]; if (!src) return;
  const n = Math.max(1, ...src.rows.map(r => r.length));
  const m = src.map;
  [['#map-date', 'date', 0], ['#map-amount', 'amount', 0], ['#map-cp', 'counterparty', 1], ['#map-desc', 'description', 1]].forEach(([id, k, none]) => { $(id).replaceChildren(...colOptions(n, none)); $(id).value = m[k] ?? -1; });
  $('#map-sign').value = m.signMode || 'sign';
  const t = $('#raw-table');
  const head = el('tr', {}, el('th', { textContent: '' }), el('th', { textContent: '#' }), ...Array.from({ length: n }, (_, i) => el('th', { textContent: `Stĺpec ${i + 1}` })));
  const rows = src.rows.slice(0, 400).map((r, ri) => {
    const btn = el('button', { className: 'btn small', textContent: '➕', title: 'Pridať tento riadok ako pohyb' });
    btn.addEventListener('click', () => openEdit(null, rowToDraft(r)));
    const hit = parseDate(r[m.date]) && parseAmount(r[m.amount]) != null;
    return el('tr', { className: hit ? 'hit' : '' }, el('td', {}, btn), el('td', { textContent: ri + 1 }), ...Array.from({ length: n }, (_, i) => el('td', { textContent: r[i] ?? '' })));
  });
  t.replaceChildren(head, ...rows);
}
function rowToDraft(r) {
  const s = r.join('  ');
  let date = null, amount = null;
  for (const c of r) { if (!date) date = parseDate(c); else if (amount == null) amount = parseAmount(c); }
  const texts = r.filter(c => !parseDate(c) && parseAmount(c) == null);
  return { date: date || new Date().toISOString().slice(0, 10), amount: amount ?? '', counterparty: texts[0] || '', description: texts.slice(1).join(' ') || s };
}
$('#map-src').addEventListener('change', renderMapTable);
['#map-date', '#map-amount', '#map-cp', '#map-desc', '#map-sign'].forEach(id => $(id).addEventListener('change', () => {
  const src = state.sources[$('#map-src').value];
  src.map = { date: +$('#map-date').value, amount: +$('#map-amount').value, counterparty: +$('#map-cp').value, description: +$('#map-desc').value, signMode: $('#map-sign').value };
  renderMapTable();
}));
$('#map-apply').addEventListener('click', () => {
  const src = state.sources[$('#map-src').value];
  const tx = applyMapping(src.rows, src.map);
  if (!tx.length) return toast('S týmto nastavením som nenašiel žiadny pohyb. Skús iné stĺpce.');
  if (!confirm(`Nahradiť pohyby zo súboru ${src.name} (${tx.length} nájdených)?`)) return;
  state.tx = state.tx.filter(t => t.source !== src.name);
  const n = addTx(tx, src.name); toast(`Použité: ${n} pohybov`);
});

// ---------- Nahlásiť formát ----------
$('#report-btn').addEventListener('click', () => {
  const ta = $('#report-text');
  if (!state.sources.length) { toast('Najprv načítaj výpis.'); return; }
  const src = state.sources[state.sources.length - 1];
  const txt = src.rows.slice(0, 15).map(r => r.map(maskLine).join(' | ')).join('\n');
  ta.value = `Formát výpisu (čísla skryté), súbor: ${maskLine(src.name)}\n` + txt;
  ta.classList.remove('hidden'); $('#report-copy').classList.remove('hidden');
});
$('#report-copy').addEventListener('click', async () => {
  const ta = $('#report-text'); ta.select();
  try { await navigator.clipboard.writeText(ta.value); } catch { document.execCommand('copy'); }
  toast('Skopírované. Nič sa neodoslalo.');
});

// ---------- Prehľad ----------
function fillMonthSelect(sel, withAll = 'Všetky mesiace') {
  const prev = sel.value;
  sel.replaceChildren(el('option', { value: '', textContent: withAll }), ...months(state.tx).reverse().map(m => el('option', { value: m, textContent: monthLabel(m) })));
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}
function emptyLi(text) { return el('li', { className: 'muted', textContent: text }); }

function renderDash() {
  const ms = months(state.tx);
  const sel = $('#dash-month');
  const hadValue = sel.options.length > 0;
  fillMonthSelect(sel);
  if (!hadValue && ms.length) sel.value = ms[ms.length - 1];
  const mk = sel.value;
  const tx = mk ? state.tx.filter(t => monthKey(t.date) === mk) : state.tx;
  const t = totals(tx);
  $('#k-inc').textContent = eur(t.inc); $('#k-exp').textContent = eur(t.exp); $('#k-bal').textContent = eur(t.bal);
  const bc = byCategory(tx);
  drawDonut(bc, t.exp);
  $('#legend').replaceChildren(...(bc.length ? bc.map(c => {
    const dot = el('span', { className: 'dot' }); dot.style.background = CAT[c.cat]?.color || '#888';
    const a = el('a', { href: '#', textContent: CAT[c.cat]?.label || c.cat });
    a.addEventListener('click', e => { e.preventDefault(); $('#f-cat').value = c.cat; $('#f-month').value = mk; show('view-tx'); });
    return el('li', {}, el('span', {}, dot, a), el('b', { textContent: `${eur(c.v)} · ${Math.round(c.v / t.exp * 100)} %` }));
  }) : [emptyLi('Zatiaľ žiadne výdavky. Načítaj výpis.')]));

  const tp = tips(state.tx);
  $('#tips').replaceChildren(...(tp.length ? tp.map(s => el('li', { textContent: s })) : [emptyLi('Na tipy je zatiaľ málo údajov.')]));

  const big = tx.filter(x => x.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5);
  $('#biggest').replaceChildren(...(big.length ? big.map(x => el('li', {}, el('span', { textContent: `${fmtDate(x.date)} · ${x.counterparty}` }), el('b', { textContent: eur(x.amount) }))) : [emptyLi('—')]));

  const rec = recurring(state.tx);
  const subsOnly = state.tx.filter(x => x.amount < 0 && x.category === 'predplatne' && !rec.some(r => r.key === counterpartyKey(x.counterparty)));
  const recItems = rec.map(r => el('li', {}, el('span', { textContent: `${r.name} (${CAT[r.category]?.label || ''}, ${r.months}× mesačne)` }), el('b', { textContent: `≈ ${eur(r.monthly)}/mes.` })));
  const subItems = ms.length < 2 ? [...new Map(subsOnly.map(x => [counterpartyKey(x.counterparty), x])).values()].map(x => el('li', {}, el('span', { textContent: `${x.counterparty} (predplatné)` }), el('b', { textContent: eur(x.amount) }))) : [];
  const items = [...recItems, ...subItems];
  $('#recurring').replaceChildren(...(items.length ? items : [emptyLi(ms.length < 2 ? 'Na rozpoznanie pravidelných platieb načítaj výpisy aspoň za 2 mesiace.' : 'Nenašiel som pravidelné platby.')]));
  if (rec.length) $('#recurring').append(el('li', {}, el('span', { textContent: 'Spolu pravidelne' }), el('b', { textContent: `≈ ${eur(rec.reduce((s, r) => s + r.monthly, 0))}/mes.` })));

  renderCompare(ms);
}
function fmtDate(d) { const [y, m, dd] = d.split('-'); return `${+dd}.${+m}.${y}`; }

function renderCompare(ms) {
  const box = $('#compare');
  if (ms.length < 2) { box.replaceChildren(el('p', { className: 'muted', textContent: 'Načítaj výpisy aspoň za 2 mesiace a uvidíš porovnanie.' })); return; }
  const last = ms.slice(-4);
  const head = el('tr', {}, el('th', { textContent: '' }), ...last.map(m => el('th', { textContent: monthLabel(m).replace(/ \d{4}$/, '') })));
  const tt = last.map(m => totals(state.tx.filter(t => monthKey(t.date) === m)));
  const row = (label, vals, cls) => el('tr', {}, el('td', { textContent: label }), ...vals.map((v, i) => el('td', { textContent: v, className: cls ? cls(i) : '' })));
  const rows = [row('Príjmy', tt.map(t => eur(t.inc))), row('Výdavky', tt.map(t => eur(t.exp)), i => i && tt[i].exp > tt[i - 1].exp ? 'up' : i ? 'down' : ''), row('Rozdiel', tt.map(t => eur(t.bal)))];
  const cats = CATEGORIES.filter(c => c.id !== 'prijem');
  const a = last[last.length - 2], b = last[last.length - 1];
  const ca = Object.fromEntries(byCategory(state.tx.filter(t => monthKey(t.date) === a)).map(x => [x.cat, x.v]));
  const cb = Object.fromEntries(byCategory(state.tx.filter(t => monthKey(t.date) === b)).map(x => [x.cat, x.v]));
  const diffs = cats.map(c => ({ c, d: (cb[c.id] || 0) - (ca[c.id] || 0) })).filter(x => Math.abs(x.d) >= 1).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 5);
  const dl = el('ul', { className: 'list' }, ...diffs.map(x => el('li', {}, el('span', { textContent: x.c.label }), el('b', { className: x.d > 0 ? 'up' : 'down', textContent: (x.d > 0 ? '+' : '') + eur(x.d) }))));
  box.replaceChildren(el('table', { className: 'cmp' }, head, ...rows), el('p', { className: 'muted small', textContent: `Zmena podľa kategórií: ${monthLabel(b)} oproti ${monthLabel(a)}` }), dl);
}

function drawDonut(bc, total) {
  const c = $('#donut'), dpr = window.devicePixelRatio || 1, size = 240;
  c.width = size * dpr; c.height = size * dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = 110, ir = 68;
  if (!total) { g.strokeStyle = '#2a2f3a'; g.lineWidth = r - ir; g.beginPath(); g.arc(cx, cy, (r + ir) / 2, 0, Math.PI * 2); g.stroke(); }
  let a0 = -Math.PI / 2;
  for (const x of bc) {
    const a1 = a0 + (x.v / total) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a0) * ir, cy + Math.sin(a0) * ir); g.arc(cx, cy, r, a0, a1); g.arc(cx, cy, ir, a1, a0, true); g.closePath();
    g.fillStyle = CAT[x.cat]?.color || '#888'; g.fill(); g.strokeStyle = '#181b22'; g.lineWidth = 2; g.stroke();
    a0 = a1;
  }
  g.fillStyle = '#e8eaf0'; g.textAlign = 'center'; g.font = 'bold 18px system-ui,sans-serif'; g.fillText(eur(total), cx, cy + 2);
  g.fillStyle = '#9aa3b2'; g.font = '12px system-ui,sans-serif'; g.fillText('výdavky', cx, cy + 20);
}

// ---------- Pohyby ----------
function catOptions(withAll) {
  return [...(withAll ? [el('option', { value: '', textContent: 'Všetky kategórie' })] : []), ...CATEGORIES.map(c => el('option', { value: c.id, textContent: c.label }))];
}
$('#f-cat').replaceChildren(...catOptions(true));
['#f-text', '#f-cat', '#f-month', '#f-type'].forEach(id => $(id).addEventListener('input', renderTx));

function renderTx() {
  fillMonthSelect($('#f-month'));
  const q = $('#f-text').value.trim().toLowerCase(), cat = $('#f-cat').value, mk = $('#f-month').value, ty = $('#f-type').value;
  const list = state.tx.filter(t => (!cat || t.category === cat) && (!mk || monthKey(t.date) === mk) && (!ty || (ty === 'exp' ? t.amount < 0 : t.amount > 0)) && (!q || `${t.counterparty} ${t.description}`.toLowerCase().includes(q)));
  const s = list.reduce((a, t) => a + t.amount, 0);
  $('#tx-count').textContent = state.tx.length ? `${list.length} pohybov · spolu ${eur(s)} · ťukni na pohyb pre úpravu` : 'Zatiaľ žiadne pohyby. Načítaj výpis v záložke Načítať.';
  $('#tx-list').replaceChildren(...list.slice(0, 500).map(t => {
    const sel = el('select', { 'aria-label': 'Kategória' }, ...catOptions(false)); sel.value = t.category;
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => setCategory(t, sel.value, true));
    const li = el('li', { className: 'tx' },
      el('span', { className: 'cp', textContent: t.counterparty }),
      el('span', { className: 'amt ' + (t.amount < 0 ? 'neg' : 'pos'), textContent: eur(t.amount) }),
      el('span', { className: 'meta', textContent: `${fmtDate(t.date)}${t.description ? ' · ' + t.description : ''}${t.by === 'pravidlo' ? ' · 📌 pravidlo' : ''}` }), el('span'), sel);
    li.dataset.id = t.id;
    li.addEventListener('click', () => openEdit(t));
    return li;
  }));
}

function setCategory(t, cat, remember) {
  t.category = cat; t.manual = true;
  if (remember) {
    const k = counterpartyKey(t.counterparty);
    if (k) { state.rules[k] = cat; save(LS.rules, state.rules); recategorize(); toast(`Zapamätané: „${t.counterparty}“ → ${CAT[cat].label}`); }
  }
  persist(); if (!$('#view-tx').classList.contains('hidden')) renderTx();
}

// ---------- Úprava pohybu ----------
let editing = null;
$('#e-cat').replaceChildren(...catOptions(false));
function openEdit(t, draft) {
  editing = t; const d = t || draft;
  $('#edit-title').textContent = t ? 'Upraviť pohyb' : 'Pridať pohyb';
  $('#e-date').value = d.date; $('#e-amount').value = d.amount === '' ? '' : String(d.amount).replace('.', ',');
  $('#e-cp').value = d.counterparty || ''; $('#e-desc').value = d.description || '';
  $('#e-cat').value = t ? t.category : (Number(d.amount) > 0 ? 'prijem' : 'ine');
  $('#e-rule').checked = true; $('#e-del').classList.toggle('hidden', !t); $('#e-msg').textContent = '';
  $('#edit').showModal();
}
$('#edit-form').addEventListener('submit', e => {
  const action = e.submitter?.value;
  if (action === 'cancel') return;
  if (action === 'delete') { if (confirm('Naozaj zmazať tento pohyb?')) { state.tx = state.tx.filter(x => x !== editing); persist(); renderTx(); } return; }
  const amount = parseAmount($('#e-amount').value), date = $('#e-date').value;
  if (amount == null || !date) { e.preventDefault(); $('#e-msg').textContent = 'Skontroluj dátum a sumu (napr. -12,50).'; return; }
  const catChanged = !editing || editing.category !== $('#e-cat').value;
  const t = editing || { id: Math.random().toString(36).slice(2, 10), source: 'ručne', strategy: 'ručne' };
  Object.assign(t, { date, amount, counterparty: $('#e-cp').value.trim() || '(neznáme)', description: $('#e-desc').value.trim() });
  if (!editing) { state.tx.push(t); state.tx.sort((a, b) => b.date.localeCompare(a.date)); }
  if (catChanged || $('#e-rule').checked) setCategory(t, $('#e-cat').value, $('#e-rule').checked);
  persist(); renderTx(); toast('Uložené');
});
$('#tx-add').addEventListener('click', () => openEdit(null, { date: new Date().toISOString().slice(0, 10), amount: '', counterparty: '', description: '' }));

// ---------- Nastavenia ----------
function renderSettings() {
  const entries = Object.entries(state.rules);
  $('#rules').replaceChildren(...(entries.length ? entries.map(([k, c]) => {
    const sel = el('select', {}, ...catOptions(false)); sel.value = c;
    sel.addEventListener('change', () => { state.rules[k] = sel.value; save(LS.rules, state.rules); recategorize(); persist(); toast('Pravidlo upravené'); });
    const del = el('button', { className: 'btn small ghost', textContent: '✖', title: 'Zmazať pravidlo' });
    del.addEventListener('click', () => { delete state.rules[k]; save(LS.rules, state.rules); state.tx.forEach(t => { if (counterpartyKey(t.counterparty) === k) t.manual = false; }); recategorize(); persist(); renderSettings(); });
    return el('li', {}, el('span', { textContent: k }), el('span', {}, sel, del));
  }) : [emptyLi('Zatiaľ žiadne. Zmeň kategóriu niektorého pohybu a pravidlo sa objaví tu.')]));
  $('#kw').replaceChildren(...CATEGORIES.filter(c => c.id !== 'ine').map(c => el('label', { textContent: c.label }, el('textarea', { rows: 2, value: (state.keywords[c.id] || []).join(', '), name: c.id }))));
}
$('#kw-save').addEventListener('click', () => {
  const kw = {};
  for (const id of Object.keys(DEFAULT_KEYWORDS)) { const ta = $(`#kw textarea[name="${id}"]`); kw[id] = ta ? ta.value.split(',').map(s => s.trim()).filter(Boolean) : state.keywords[id] || []; }
  state.keywords = kw; save(LS.kw, kw); recategorize(); persist(); toast('Kľúčové slová uložené');
});
$('#kw-reset').addEventListener('click', () => { if (!confirm('Obnoviť pôvodné kľúčové slová?')) return; state.keywords = structuredClone(DEFAULT_KEYWORDS); localStorage.removeItem(LS.kw); recategorize(); renderSettings(); });
$('#wipe').addEventListener('click', () => {
  if (!confirm('Naozaj vymazať všetky dáta? Zmažú sa pohyby, pravidlá aj nastavenia v tomto prehliadači.')) return;
  Object.values(LS).forEach(k => localStorage.removeItem(k));
  state.tx = []; state.sources = []; state.rules = {}; state.keywords = structuredClone(DEFAULT_KEYWORDS); state.settings = { rememberTx: false }; state.lastPassword = null;
  $('#remember-tx').checked = false; $('#file-status').replaceChildren(); $('#report-text').value = ''; renderRaw(); renderSettings();
  toast('Všetko vymazané');
});

// ---------- Štart ----------
$('#remember-tx').checked = !!state.settings.rememberTx;
if (state.settings.rememberTx) { state.tx = load(LS.tx, []); recategorize(); }
show(state.tx.length ? 'view-dash' : 'view-import');
window.__vydavky = state; // pre testy (len lokálne)

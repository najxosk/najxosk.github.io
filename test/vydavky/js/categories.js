import { normText } from './parser.js?v=2';

// Hierarchia: skupina -> podkategória. Poradie skupín = priorita pri hľadaní kľúčových slov.
// kind: exp = výdavok, inc = príjem, transfer = presun medzi vlastnými účtami (nepočíta sa do súčtov)
export const GROUPS = [
  { id: 'prevody', label: 'Prevody medzi vlastnými účtami', color: '#64748b', kind: 'transfer', subs: [
    { id: 'vlastne', label: 'Vlastné účty a sporenie', kw: ['vlastny ucet', 'vlastne ucty', 'medzi uctami', 'vlastny prevod', 'prevod na sporenie', 'sporiaci ucet', 'sporenie', 'presun prostriedkov'] }] },
  { id: 'uvery', label: 'Úvery a splátky', color: '#ef4444', kind: 'exp', subs: [
    { id: 'splatky', label: 'Splátky úverov', kw: ['splatka uveru', 'splatka', 'uver', 'hypotek', 'leasing', 'home credit', 'cofidis', 'quatro', 'pozicka', 'essox', 'splatky'] }] },
  { id: 'poistenie', label: 'Poistenie', color: '#0ea5e9', kind: 'exp', subs: [
    { id: 'zdravotne', label: 'Zdravotná poisťovňa', kw: ['dovera', 'vszp', 'vseobecna zdravotna', 'union zdravotna'] },
    { id: 'ostatne', label: 'Poistky', kw: ['allianz', 'kooperativa', 'generali', 'uniqa', 'wustenrot poistovna', 'groupama', 'komunalna poistovna', 'nn zivotna', 'metlife', 'poistov', 'poistenie', 'poistne', 'pzp', 'havarijn'] }] },
  { id: 'hotovost', label: 'Hotovosť / bankomat', color: '#a3a3a3', kind: 'exp', subs: [
    { id: 'atm', label: 'Výbery z bankomatu', kw: ['vyber z bankomatu', 'vyber hotovosti', 'bankomat', 'atm', 'cash'] }] },
  { id: 'poplatky', label: 'Poplatky banke', color: '#f87171', kind: 'exp', subs: [
    { id: 'karta', label: 'Poplatok za kartu', kw: ['poplatok za kartu', 'poplatok karta', 'vydanie karty', 'rocny poplatok za kartu'] },
    { id: 'sms', label: 'SMS a notifikácie', kw: ['sms notifik', 'sms sluzba', 'notifikac', 'sms'] },
    { id: 'ucet', label: 'Vedenie účtu', kw: ['vedenie uctu', 'poplatok za ucet', 'mesacny poplatok', 'balik sluzieb', 'poplatok za vedenie'] },
    { id: 'ine', label: 'Iné poplatky a úroky', kw: ['poplatok', 'sankc', 'urok z precerpania', 'upomien', 'debetny urok'] }] },
  { id: 'predplatne', label: 'Predplatné', color: '#22d3ee', kind: 'exp', subs: [
    { id: 'tv', label: 'TV', kw: ['orange tv', 'o2 tv', 'magio', 'skylink', 'antik tv', 'telekom tv', 'voyo', 'skyshowtime'] },
    { id: 'streaming', label: 'Filmy a hudba', kw: ['netflix', 'spotify', 'youtube', 'disney', 'hbo', 'max.com', 'apple music', 'itunes', 'deezer', 'tidal', 'audible', 'amazon prime', 'prime video'] },
    { id: 'apky', label: 'Apky a cloud', kw: ['apple.com', 'icloud', 'apple', 'google play', 'google one', 'google', 'microsoft', 'office 365', 'adobe', 'openai', 'chatgpt', 'dropbox', 'canva'] }] },
  { id: 'komunikacie', label: 'Komunikácie', color: '#818cf8', kind: 'exp', subs: [
    { id: 'mobil', label: 'Mobil a internet', kw: ['slovak telekom', 'telekom', 'o2 slovakia', 'o2', 'orange slovensko', 'orange', '4ka', 'swan', 'tesco mobile', 'juro', 'radost', 'upc', 'antik', 'digi slovakia', 'internet'] }] },
  { id: 'byvanie', label: 'Bývanie', color: '#60a5fa', kind: 'exp', subs: [
    { id: 'energie', label: 'Energie', kw: ['spp', 'zse', 'vse', 'sse', 'slovenske elektrarne', 'elektrarne', 'stredoslovenska energetika', 'zapadoslovenska energetika', 'vychodoslovenska energetika', 'energie', 'elektrin', 'plyn', 'teplaren', 'mvm', 'innogy'] },
    { id: 'voda', label: 'Voda', kw: ['bratislavska vodarenska', 'vodarensk', 'vodaren', 'vodarne', 'bvs', 'stvps', 'zsvs', 'vvs'] },
    { id: 'najom', label: 'Nájom a správa domu', kw: ['najomne', 'najom', 'sprava domu', 'spolocenstvo vlastnikov', 'spolocenstvo', 'fond oprav', 'zaloha byt', 'bytove druzstvo'] }] },
  { id: 'zabava', label: 'Zábava a jedlo vonku', color: '#c084fc', kind: 'exp', subs: [
    { id: 'donaska', label: 'Donáška jedla', kw: ['wolt', 'foodora', 'bolt food', 'bistro.sk'] },
    { id: 'restauracie', label: 'Reštaurácie a kaviarne', kw: ['restaurac', 'restaurant', 'pizz', 'bistro', 'kaviaren', 'cafe', 'coffee', 'mcdonald', 'kfc', 'burger', 'starbucks', 'kebab', 'pub', 'bar', 'pivaren', 'cukraren', 'jedalen'] },
    { id: 'kultura', label: 'Kultúra a voľný čas', kw: ['kino', 'cinema', 'divadlo', 'ticketportal', 'predpredaj', 'steam', 'playstation', 'xbox', 'nintendo', 'koncert', 'muzeum', 'aquapark', 'wellness', 'fitness'] }] },
  { id: 'doprava', label: 'Doprava', color: '#fbbf24', kind: 'exp', subs: [
    { id: 'palivo', label: 'Palivo', kw: ['shell', 'slovnaft', 'omv', 'benzinol', 'orlen', 'mol', 'lukoil', 'jurki', 'tankovanie', 'cerpacia'] },
    { id: 'mhd', label: 'MHD, vlak, autobus', kw: ['mhd', 'dpb', 'dpmk', 'dpmz', 'dopravny podnik', 'imhd', 'zssk', 'regiojet', 'leo express', 'flixbus', 'arriva', 'slovak lines', 'cestovny listok'] },
    { id: 'taxi', label: 'Taxi', kw: ['bolt', 'uber', 'hopin', 'taxi', 'liftago'] },
    { id: 'parkovanie', label: 'Parkovanie a diaľnica', kw: ['parkov', 'parking', 'paas', 'eznamka', 'dialnicna', 'myto'] }] },
  { id: 'deti', label: 'Deti', color: '#f472b6', kind: 'exp', subs: [
    { id: 'skolka', label: 'Škôlka', kw: ['skolka', 'skolky', 'materska skola'] },
    { id: 'skola', label: 'Škola', kw: ['zakladna skola', 'skolsky', 'skolske', 'skola', 'gymnazium', 'skolne', 'skolska jedalen'] },
    { id: 'kruzky', label: 'Krúžky a tábory', kw: ['kruzok', 'kruzky', 'zus', 'tabor', 'plavanie', 'trening'] },
    { id: 'veci', label: 'Detské veci', kw: ['pepco', 'kik', 'hamleys', 'detsky svet', 'dracik', 'pompo', 'hracky', 'plienky', 'bambino', 'baby', 'detsk'] }] },
  { id: 'zdravie', label: 'Zdravie', color: '#2dd4bf', kind: 'exp', subs: [
    { id: 'lekaren', label: 'Lekáreň', kw: ['lekaren', 'dr.max', 'dr max', 'drmax', 'benu', 'pilulka', 'pharm', 'apotheke'] },
    { id: 'lekar', label: 'Lekár', kw: ['lekar', 'ambulanc', 'nemocnic', 'zubn', 'poliklinik', 'optika', 'klinika', 'fyzio', 'medical'] }] },
  { id: 'potraviny', label: 'Potraviny a drogéria', color: '#4ade80', kind: 'exp', subs: [
    { id: 'supermarket', label: 'Supermarkety', kw: ['lidl', 'tesco', 'kaufland', 'billa', 'coop jednota', 'coop', 'jednota', 'fresh', 'terno', 'yeme', 'hypernova', 'albert', 'metro cash', 'potraviny', 'labas'] },
    { id: 'drogeria', label: 'Drogéria', kw: ['dm drogerie', 'dm-drogerie', 'dm drogeriemarkt', 'teta drogerie', 'teta', 'rossmann', 'drogeri'] }] },
  { id: 'nakupy', label: 'Nákupy', color: '#fb923c', kind: 'exp', subs: [
    { id: 'eshopy', label: 'E-shopy a elektro', kw: ['alza', 'mall', 'datart', 'eshop', 'e-shop', 'amazon', 'aliexpress', 'temu', 'shein', 'notino', 'zalando', 'about you', 'nay', 'okay', 'planeo', 'andrea'] },
    { id: 'domacnost', label: 'Domácnosť a nábytok', kw: ['ikea', 'jysk', 'mr.price', 'mr price', 'hornbach', 'obi', 'merkury', 'asko', 'mobelix', 'xxxlutz', 'action'] },
    { id: 'oblecenie', label: 'Oblečenie a šport', kw: ['h&m', 'reserved', 'c&a', 'new yorker', 'sinsay', 'deichmann', 'ccc', 'primark', 'decathlon', 'sportisimo', 'takko'] },
    { id: 'posta', label: 'Pošta a balíky', kw: ['slovenska posta', 'posta', 'packeta', 'zasielkovna', 'dpd', 'gls'] },
    { id: 'obchody', label: 'Iné obchody', kw: [] }] },
  { id: 'ludia', label: 'Platby ľuďom', color: '#e879f9', kind: 'exp', subs: [] },
  { id: 'prijem', label: 'Príjmy', color: '#86efac', kind: 'inc', subs: [
    { id: 'mzda', label: 'Mzda', kw: ['mzda', 'vyplata', 'vyplata mzdy', 'odmena', 'premia', 'plat za'] },
    { id: 'davky', label: 'Dávky a dôchodok', kw: ['socialna poistovna', 'dochodok', 'pridavok', 'rodicovsky', 'urad prace', 'davka', 'materske'] },
    { id: 'vratene', label: 'Vrátené peniaze', kw: ['vratenie', 'refund', 'dobropis', 'preplatok', 'reklamac', 'storno'] },
    { id: 'ludia', label: 'Od ľudí', kw: [] },
    { id: 'ine', label: 'Iné príjmy', kw: [] }] },
  { id: 'ine', label: 'Nezaradené', color: '#94a3b8', kind: 'exp', subs: [] },
];

// ---- vlastné kategórie (len nastavenia, v localStorage) ----
let custom = [];
export function setCustom(list) { custom = Array.isArray(list) ? list : []; }
export function getCustom() { return custom; }
export function allGroups() {
  const gs = GROUPS.map(g => ({ ...g, subs: [...g.subs] }));
  for (const c of custom) {
    if (c.parent) { const g = gs.find(x => x.id === c.parent); if (g && !g.subs.some(s => s.id === c.sub)) g.subs.push({ id: c.sub, label: c.label, kw: [], custom: true }); }
    else if (!gs.some(x => x.id === c.id)) gs.splice(gs.length - 1, 0, { id: c.id, label: c.label, color: c.color || '#facc15', kind: c.kind || 'exp', subs: [], custom: true });
  }
  return gs;
}
export const groupOf = id => String(id || 'ine').split('/')[0];
export function groupInfo(id) { return allGroups().find(g => g.id === groupOf(id)) || GROUPS[GROUPS.length - 1]; }
export function catLabel(id, short) {
  const g = groupInfo(id), sid = String(id).split('/')[1];
  const s = sid && g.subs.find(x => x.id === sid);
  return s ? (short ? s.label : `${g.label} › ${s.label}`) : g.label;
}
export const catColor = id => groupInfo(id).color;
export const isTransfer = id => groupInfo(id).kind === 'transfer';
export const isUnsorted = t => groupOf(t.category) === 'ine';
export function leafIds() {
  const out = [];
  for (const g of allGroups()) { if (!g.subs.length) out.push(g.id); else g.subs.forEach(s => out.push(`${g.id}/${s.id}`)); }
  return out;
}
export function defaultKeywords() {
  const k = {}; for (const g of GROUPS) for (const s of g.subs) if (s.kw.length) k[`${g.id}/${s.id}`] = [...s.kw];
  return k;
}

// ---- normalizácia protistrany: jedno pravidlo chytí varianty ----
const PREFIX_RE = /^(platba kartou|platba|kartova transakcia|nakup|nakup kartou|pos|card|karta|apple pay|google pay|trvaly prikaz|inkaso|sepa inkaso|prevod|uhrada|okamzita platba|prijata platba|odchadzajuca platba|prichadzajuca platba)\b[\s:-]*/;
const CITIES = ['bratislava', 'kosice', 'zilina', 'nitra', 'presov', 'trnava', 'trencin', 'banska bystrica', 'martin', 'poprad', 'prievidza', 'piestany', 'zvolen', 'michalovce', 'levice', 'komarno', 'senec', 'pezinok', 'malacky', 'dunajska streda', 'nove zamky', 'praha', 'brno', 'wien', 'vienna', 'dublin', 'luxembourg', 'amsterdam', 'london'];
const SUFFIX_TOKENS = new Set(['sk', 'svk', 'cz', 'cze', 'at', 'aut', 'de', 'ie', 'irl', 'nl', 'lu', 'gb', 'us', 'usa', 'eu', 'slovakia', 'slovensko', 'slovenska republika', 'sro', 'as', 'spol', 'gmbh', 'ltd', 'inc', 'bv', 'sa', 'ag', 'kft', 'com', 'www', 'web', 'pos', 'eur']);
export function counterpartyKey(cp) {
  let s = normText(cp);
  for (let i = 0; i < 3; i++) s = s.replace(PREFIX_RE, '');
  s = s.replace(/\b(s\.\s?r\.\s?o\.?|a\.\s?s\.?|spol\.|k\.\s?s\.)/g, ' ')
    .replace(/\bwww\./g, ' ').replace(/\.(com|eu|sk|cz|net|org|io)\b/g, ' ')
    .replace(/[*#]{2,}/g, ' ').replace(/\bx{4,}\b/g, ' ')
    .replace(/\S*\d\S*/g, ' ')
    .replace(/[^a-z&.' -]/g, ' ').replace(/[.'-]+/g, ' ');
  for (const c of CITIES) s = s.replace(new RegExp('\\b' + c + '\\b', 'g'), ' ');
  let toks = s.split(/\s+/).filter(Boolean);
  while (toks.length > 1 && (SUFFIX_TOKENS.has(toks[toks.length - 1]) || toks[toks.length - 1].length === 1)) toks.pop();
  toks = toks.filter((t, i) => i === 0 || !SUFFIX_TOKENS.has(t));
  return toks.join(' ').trim();
}

export function findRule(key, rules) {
  if (!key) return null;
  if (rules[key]) return rules[key];
  let best = null;
  for (const rk of Object.keys(rules)) if (key.startsWith(rk + ' ') && (!best || rk.length > best.length)) best = rk;
  return best ? rules[best] : null;
}

const kwCache = new Map();
function kwMatch(text, kw) {
  const k = normText(kw); if (!k) return false;
  if (k.length <= 5) {
    let re = kwCache.get(k);
    if (!re) { re = new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (k.length <= 3 ? '($|[^a-z0-9])' : '')); kwCache.set(k, re); }
    return re.test(text);
  }
  return text.includes(k);
}
export function matchText(t) {
  return ' ' + normText(`${t.counterparty} ${t.description}`).replace(/\b(apple|google) ?pay\b/g, ' ') + ' ';
}

// ---- typ platby a typ protistrany ----
export const PTYPES = { karta: 'Platba kartou', prevod: 'Prevod', trvaly: 'Trvalý príkaz', inkaso: 'Inkaso', atm: 'Výber z bankomatu', poplatok: 'Poplatok banky', ine: 'Iné' };
export const CTYPES = { obchod: 'Obchody', firma: 'Firmy a úrady', clovek: 'Ľudia', poplatok: 'Poplatky banke', atm: 'Výbery z bankomatu', vlastne: 'Vlastné účty', nezname: 'Neurčené' };
export function paymentType(t) {
  const s = ' ' + normText(`${t.counterparty} ${t.description} ${t.raw || ''}`) + ' ';
  if (/bankomat|\batm\b|vyber hotovost/.test(s)) return 'atm';
  if (/poplatok|vedenie uctu/.test(s)) return 'poplatok';
  if (/trvaly prikaz/.test(s)) return 'trvaly';
  if (/inkaso|direct debit|sepa dd/.test(s)) return 'inkaso';
  if (/platba kartou|kartou|kartova|\bpos\b|\bcard\b|apple pay|google pay|\*{2,}|nakup/.test(s)) return 'karta';
  if (/prevod|uhrada|sepa|okamzit|prijata|odchadzaj|prichadzaj|platba|mzda|vyplata/.test(s)) return 'prevod';
  return 'ine';
}
const COMPANY_RE = /(s\.?\s?r\.?\s?o|\ba\.?\s?s\b|spol|banka|bank|poistov|vodaren|elektrar|energet|telekom|slovakia|slovensko|urad|mesto|obec|skola|nemocnic|druzstvo|spolocenstvo|\bsro\b|gmbh|ltd|inc\b|\.com|\.sk|\.eu|fake|company|services|group|zamestnav)/;
export function counterpartyType(t, ptype) {
  const g = groupOf(t.category);
  if (ptype === 'atm' || g === 'hotovost') return 'atm';
  if (ptype === 'poplatok' || g === 'poplatky') return 'poplatok';
  if (g === 'prevody') return 'vlastne';
  if (g === 'ludia' || t.category === 'prijem/ludia') return 'clovek';
  const n = normText(t.counterparty);
  if (ptype === 'karta') return 'obchod';
  if (COMPANY_RE.test(n)) return 'firma';
  if ((ptype === 'prevod' || ptype === 'trvaly') && /^[a-z]{2,}( [a-z]{2,}){1,2}$/.test(n.replace(/[.,]/g, '')) && g === 'ine') return 'clovek';
  if (ptype === 'inkaso' || ptype === 'trvaly' || g !== 'ine') return 'firma';
  return 'nezname';
}

// ---- kategorizácia ----
export function categorize(t, keywords, rules) {
  const key = counterpartyKey(t.counterparty);
  const r = findRule(key, rules);
  if (r) return { cat: r, by: 'pravidlo' };
  const text = matchText(t);
  if (t.amount > 0) {
    if ((keywords['prevody/vlastne'] || []).some(k => kwMatch(text, k))) return { cat: 'prevody/vlastne', by: 'auto' };
    for (const sub of ['mzda', 'davky', 'vratene']) if ((keywords[`prijem/${sub}`] || []).some(k => kwMatch(text, k))) return { cat: `prijem/${sub}`, by: 'auto' };
    return { cat: 'prijem/ine', by: 'auto' };
  }
  for (const [cat, kws] of Object.entries(keywords)) {
    if (cat.startsWith('prijem')) continue;
    if (kws.some(k => kwMatch(text, k))) return { cat, by: 'auto' };
  }
  return { cat: 'ine', by: 'auto' };
}

// ---- návrhy pre nezaradené ----
export function suggest(key, sample, keywords, allTx) {
  const out = [];
  const add = c => { if (c && c !== 'ine' && !out.includes(c) && !c.startsWith('prijem')) out.push(c); };
  const toks = key.split(' ').filter(x => x.length >= 3);
  // 1) podobné protistrany, ktoré už sú zaradené (rovnaké prvé slovo)
  if (toks[0]) for (const t of allTx) if (!isUnsorted(t) && t.amount < 0) { const k = counterpartyKey(t.counterparty); if (k !== key && k.split(' ')[0] === toks[0]) add(t.category); }
  // 2) voľná zhoda kľúčových slov (začiatok slova)
  for (const [cat, kws] of Object.entries(keywords)) for (const kw of kws) {
    const k = normText(kw); if (k.length < 4) continue;
    if (toks.some(tk => tk.length >= 4 && (k.startsWith(tk.slice(0, 5)) || tk.startsWith(k.slice(0, 5))))) add(cat);
  }
  // 3) podľa typu platby
  const pt = paymentType(sample);
  const ct = counterpartyType({ ...sample, category: 'ine' }, pt);
  if (ct === 'clovek') add('ludia');
  if (pt === 'karta') add('nakupy/obchody');
  if (pt === 'inkaso' || pt === 'trvaly') { add('byvanie/najom'); add('poistenie/ostatne'); add('uvery/splatky'); }
  if (pt === 'prevod') { add('ludia'); add('prevody/vlastne'); }
  add('potraviny/supermarket'); add('nakupy/obchody');
  return out.slice(0, 5);
}

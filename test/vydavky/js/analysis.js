import { counterpartyKey, CAT } from './categories.js';
export const MONTHS = ['január','február','marec','apríl','máj','jún','júl','august','september','október','november','december'];
export const monthKey = d => d.slice(0, 7);
export const monthLabel = k => { const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
export const eur = v => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(v);
const sum = a => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;

export function totals(tx) {
  const inc = sum(tx.filter(t => t.amount > 0).map(t => t.amount));
  const exp = sum(tx.filter(t => t.amount < 0).map(t => -t.amount));
  return { inc, exp, bal: Math.round((inc - exp) * 100) / 100 };
}
export function byCategory(tx) {
  const m = {};
  for (const t of tx) if (t.amount < 0) m[t.category] = (m[t.category] || 0) + -t.amount;
  return Object.entries(m).map(([cat, v]) => ({ cat, v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v);
}
export function months(tx) { return [...new Set(tx.map(t => monthKey(t.date)))].sort(); }

export function recurring(tx) {
  const groups = {};
  for (const t of tx) if (t.amount < 0) { const k = counterpartyKey(t.counterparty); if (k) (groups[k] ||= []).push(t); }
  const res = [];
  for (const [k, list] of Object.entries(groups)) {
    const ms = new Set(list.map(t => monthKey(t.date)));
    if (ms.size < 2) continue;
    const amts = list.map(t => -t.amount).sort((a, b) => a - b);
    const med = amts[Math.floor(amts.length / 2)];
    const similar = amts.filter(a => Math.abs(a - med) <= Math.max(1, med * 0.15)).length;
    if (similar < 2 || list.length > ms.size * 2) continue;
    res.push({ key: k, name: list[0].counterparty, monthly: Math.round(med * 100) / 100, months: ms.size, category: list[list.length - 1].category });
  }
  return res.sort((a, b) => b.monthly - a.monthly);
}

export function tips(tx) {
  const out = [];
  const ms = months(tx); if (tx.length < 5 || !ms.length) return out;
  const n = ms.length, exp = tx.filter(t => t.amount < 0);
  const tot = sum(exp.map(t => -t.amount)); if (tot <= 0) return out;
  const cat = id => sum(exp.filter(t => t.category === id).map(t => -t.amount));
  const fees = cat('poplatky');
  if (fees > 0) out.push(`Poplatky banke spolu ${eur(fees)}${n > 1 ? ` za ${n} mes. (≈ ${eur(fees / n)}/mes.)` : ''}. Za rok to je asi ${eur(fees / n * 12)} – zváž lacnejší alebo bezplatný účet.`);
  const rec = recurring(tx);
  const subsRec = rec.filter(r => r.category === 'predplatne');
  const subs = subsRec.length ? sum(subsRec.map(r => r.monthly)) : cat('predplatne') / n;
  if (subs > 0) out.push(`Predplatné spolu ≈ ${eur(subs)}/mes. (${eur(subs * 12)} ročne)${subsRec.length ? ': ' + subsRec.map(r => r.name).join(', ') : ''}. Skontroluj, ktoré naozaj používaš.`);
  const cash = cat('hotovost');
  if (cash > 0) out.push(`Výbery hotovosti ${eur(cash)} (${Math.round(cash / tot * 100)} % výdavkov) – pri hotovosti nevidíš, na čo peniaze išli. Skús viac platiť kartou.`);
  const bc = byCategory(tx).filter(c => c.cat !== 'ine');
  if (bc.length) { const top = bc[0]; out.push(`Najväčšia kategória: ${CAT[top.cat]?.label || top.cat} – ${eur(top.v)}, t.j. ${Math.round(top.v / tot * 100)} % všetkých výdavkov.`); }
  if (n >= 2) {
    const a = ms[n - 2], b = ms[n - 1];
    const ea = sum(exp.filter(t => monthKey(t.date) === a).map(t => -t.amount)), eb = sum(exp.filter(t => monthKey(t.date) === b).map(t => -t.amount));
    if (ea > 0) { const g = (eb - ea) / ea * 100;
      if (g > 5) out.push(`Výdavky v mesiaci ${monthLabel(b)} stúpli o ${Math.round(g)} % oproti ${monthLabel(a)} (${eur(ea)} → ${eur(eb)}).`);
      else if (g < -5) out.push(`Dobrá správa: výdavky v mesiaci ${monthLabel(b)} klesli o ${Math.round(-g)} % oproti ${monthLabel(a)}.`); }
  }
  for (const m of ms) { const t = totals(tx.filter(x => monthKey(x.date) === m)); if (t.inc > 0 && t.exp > t.inc) { out.push(`V mesiaci ${monthLabel(m)} si minul o ${eur(t.exp - t.inc)} viac, než prišlo na účet.`); break; } }
  return out.slice(0, 5);
}

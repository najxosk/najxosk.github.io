import { counterpartyKey, catLabel, groupOf, groupInfo, isTransfer, isUnsorted } from './categories.js?v=2';
export const MONTHS = ['január','február','marec','apríl','máj','jún','júl','august','september','október','november','december'];
export const monthKey = d => d.slice(0, 7);
export const monthLabel = k => { const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
export const eur = v => new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(v);
const r2 = v => Math.round(v * 100) / 100;
const sum = a => r2(a.reduce((s, x) => s + x, 0));
export const real = tx => tx.filter(t => !isTransfer(t.category));

export function totals(tx) {
  const r = real(tx);
  const inc = sum(r.filter(t => t.amount > 0).map(t => t.amount));
  const exp = sum(r.filter(t => t.amount < 0).map(t => -t.amount));
  const tr = sum(tx.filter(t => isTransfer(t.category)).map(t => t.amount));
  return { inc, exp, bal: r2(inc - exp), transfers: tr };
}
export function byCategory(tx) {
  const m = {};
  for (const t of real(tx)) if (t.amount < 0) { const g = groupOf(t.category); m[g] = (m[g] || 0) + -t.amount; }
  return Object.entries(m).map(([cat, v]) => ({ cat, v: r2(v) })).sort((a, b) => b.v - a.v);
}
export function months(tx) { return [...new Set(tx.map(t => monthKey(t.date)))].sort(); }
export function unsortedStats(tx) {
  const exp = real(tx).filter(t => t.amount < 0);
  const tot = sum(exp.map(t => -t.amount)), u = exp.filter(isUnsorted);
  const us = sum(u.map(t => -t.amount));
  return { sum: us, count: u.length, pct: tot ? Math.round(us / tot * 100) : 0, keys: new Set(u.map(t => counterpartyKey(t.counterparty))).size };
}

// Strom: levels = [fn(t) -> [key, label]]
export function buildTree(tx, levels) {
  const root = { key: '', label: '', count: 0, sum: 0, children: new Map(), tx: [] };
  for (const t of tx) {
    let n = root; n.count++; n.sum += t.amount;
    for (const f of levels) {
      const [k, label] = f(t);
      if (!n.children.has(k)) n.children.set(k, { key: k, label, count: 0, sum: 0, children: new Map(), tx: [] });
      n = n.children.get(k); n.count++; n.sum += t.amount;
    }
    n.tx.push(t);
  }
  const fin = n => ({ ...n, sum: r2(n.sum), children: [...n.children.values()].map(fin).sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum)) });
  return fin(root);
}

export function recurring(tx) {
  const groups = {};
  for (const t of real(tx)) if (t.amount < 0) { const k = counterpartyKey(t.counterparty); if (k) (groups[k] ||= []).push(t); }
  const res = [];
  for (const [k, list] of Object.entries(groups)) {
    const ms = new Set(list.map(t => monthKey(t.date)));
    if (ms.size < 2) continue;
    const amts = list.map(t => -t.amount).sort((a, b) => a - b);
    const med = amts[Math.floor(amts.length / 2)];
    const similar = amts.filter(a => Math.abs(a - med) <= Math.max(1, med * 0.15)).length;
    if (similar < 2 || list.length > ms.size * 2) continue;
    res.push({ key: k, name: list[0].counterparty, monthly: r2(med), months: ms.size, category: list[list.length - 1].category });
  }
  return res.sort((a, b) => b.monthly - a.monthly);
}

export function tips(tx) {
  const out = [];
  const ms = months(tx); if (tx.length < 5 || !ms.length) return out;
  const n = ms.length, exp = real(tx).filter(t => t.amount < 0);
  const tot = sum(exp.map(t => -t.amount)); if (tot <= 0) return out;
  const grp = id => sum(exp.filter(t => groupOf(t.category) === id).map(t => -t.amount));
  const fees = grp('poplatky');
  if (fees > 0) out.push(`Poplatky banke spolu ${eur(fees)}${n > 1 ? ` za ${n} mes. (≈ ${eur(fees / n)}/mes.)` : ''}. Za rok to je asi ${eur(fees / n * 12)} – zváž lacnejší alebo bezplatný účet.`);
  const subsRec = recurring(tx).filter(r => groupOf(r.category) === 'predplatne');
  const subs = subsRec.length ? sum(subsRec.map(r => r.monthly)) : grp('predplatne') / n;
  if (subs > 0) out.push(`Predplatné spolu ≈ ${eur(subs)}/mes. (${eur(subs * 12)} ročne)${subsRec.length ? ': ' + subsRec.map(r => r.name).join(', ') : ''}. Skontroluj, ktoré naozaj používaš.`);
  const cash = grp('hotovost');
  if (cash > 0) out.push(`Výbery hotovosti ${eur(cash)} (${Math.round(cash / tot * 100)} % výdavkov) – pri hotovosti nevidíš, na čo peniaze išli. Skús viac platiť kartou.`);
  const bc = byCategory(tx).filter(c => c.cat !== 'ine');
  if (bc.length) { const top = bc[0]; out.push(`Najväčšia skupina: ${groupInfo(top.cat).label} – ${eur(top.v)}, t.j. ${Math.round(top.v / tot * 100)} % všetkých výdavkov.`); }
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

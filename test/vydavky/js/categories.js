import { normText } from './parser.js';

export const CATEGORIES = [
  { id: 'potraviny', label: 'Potraviny a nákupy', color: '#4ade80' },
  { id: 'deti', label: 'Deti', color: '#f472b6' },
  { id: 'poplatky', label: 'Poplatky banke', color: '#f87171' },
  { id: 'byvanie', label: 'Bývanie a energie', color: '#60a5fa' },
  { id: 'doprava', label: 'Doprava', color: '#fbbf24' },
  { id: 'zabava', label: 'Zábava a reštaurácie', color: '#c084fc' },
  { id: 'predplatne', label: 'Predplatné', color: '#22d3ee' },
  { id: 'hotovost', label: 'Hotovosť', color: '#a3a3a3' },
  { id: 'zdravie', label: 'Zdravie a lekáreň', color: '#2dd4bf' },
  { id: 'prijem', label: 'Príjem', color: '#86efac' },
  { id: 'ine', label: 'Iné', color: '#94a3b8' },
];
export const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// Poradie = priorita pri zhode
export const DEFAULT_KEYWORDS = {
  prijem: ['mzda', 'vyplata', 'vyplata mzdy', 'dochodok', 'pridavok', 'socialna poistovna', 'preplatok'],
  hotovost: ['vyber z bankomatu', 'bankomat', 'atm', 'vyber hotovosti', 'hotovost'],
  poplatky: ['poplatok', 'vedenie uctu', 'sms notifikac', 'urok z precerpania', 'sankcn'],
  predplatne: ['netflix', 'spotify', 'youtube', 'apple.com', 'apple', 'google', 'disney', 'o2 tv', 'hbo', 'max.com', 'voyo', 'skylink', 'amazon prime', 'microsoft', 'openai', 'chatgpt'],
  potraviny: ['lidl', 'tesco', 'billa', 'kaufland', 'coop jednota', 'coop', 'jednota', 'fresh', 'terno', 'dm drogerie', 'dm-drogerie', 'albert', 'rossmann', 'teta drogerie', 'potraviny', 'metro'],
  doprava: ['omv', 'slovnaft', 'shell', 'mhd', 'dpb', 'zssk', 'regiojet', 'leo express', 'parkov', 'bolt', 'uber', 'hopin', 'dialnicna', 'eznamka', 'arriva', 'slovak lines', 'cerpacia'],
  byvanie: ['spp', 'zse', 'vse', 'sse', 'vodarne', 'bvs', 'najom', 'najomne', 'sprava domu', 'spolocenstvo', 'internet', 'telekom', 'orange', 'o2 slovakia', 'o2', '4ka', 'swan', 'upc', 'antik', 'energie', 'elektrin', 'plyn'],
  zdravie: ['lekaren', 'dr.max', 'dr max', 'benu', 'pharm', 'lekar', 'ambulanc', 'nemocnic', 'zubn', 'poliklinik', 'optika'],
  deti: ['detsk', 'skolka', 'skolsk', 'kruzok', 'hracky', 'pompo', 'dracik', 'plienky', 'skola', 'tabor'],
  zabava: ['restaurac', 'restaurant', 'pizz', 'bistro', 'kaviaren', 'cafe', 'coffee', 'mcdonald', 'kfc', 'burger', 'wolt', 'foodora', 'kino', 'cinema', 'divadlo', 'ticketportal', 'steam', 'playstation', 'bar '],
};

export function counterpartyKey(cp) {
  return normText(cp).replace(/[0-9*#]+/g, ' ').replace(/[^a-z .&-]/g, ' ').replace(/\b(sk|s\.r\.o|sro|a\.s|as|bratislava|kosice|zilina|nitra|presov|trnava|banska bystrica)\b\.?/g, ' ').replace(/\s+/g, ' ').trim();
}

function kwMatch(text, kw) {
  const k = normText(kw); if (!k) return false;
  if (k.length <= 4) return new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])').test(text);
  return text.includes(k);
}

export function categorize(tx, keywords, rules) {
  const key = counterpartyKey(tx.counterparty);
  if (key && rules[key]) return { cat: rules[key], by: 'pravidlo' };
  const text = ' ' + normText(tx.counterparty + ' ' + tx.description) + ' ';
  if (tx.amount > 0) return { cat: 'prijem', by: 'auto' };
  for (const [cat, kws] of Object.entries(keywords)) {
    if (cat === 'prijem') continue;
    if (kws.some(k => kwMatch(text, k))) return { cat, by: 'auto' };
  }
  return { cat: 'ine', by: 'auto' };
}

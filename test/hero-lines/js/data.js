// Všetky herné dáta – pridávaj nové jednotky/hrdinov/schopnosti/predmety sem.
const CONFIG = {
  world: { w: 360, h: 640 },
  baseLives: 50,
  firstWave: 12,      // s do prvej vlny
  waveTime: 30,       // s medzi vlnami (~20 vĺn = 10 min)
  startGold: 60,
  baseIncome: 10,
  lanes: { 1: [180], 2: [105, 255] },
  heroAggro: 55,      // dosah, na ktorý jednotky zaútočia na hrdinu
};

const SIDES = {
  player: { name: 'Aliancia', color: '#4da3ff', dark: '#1d4f86', hero: 'rytier' },
  ai:     { name: 'Horda',    color: '#ff5a4d', dark: '#862a22', hero: 'berserker' },
};

// Jednotky, ktoré sa dajú poslať na súpera
const UNITS = {
  pesiak:      { name: 'Pešiak',      cost: 15, income: 1, hp: 110, dmg: 8,  range: 14, atkCd: 1.0, speed: 38, armor: 0, lives: 1, bounty: 6,  xp: 10, shape: 'square',   size: 7, key: '1' },
  lukostrelec: { name: 'Lukostrelec', cost: 25, income: 2, hp: 85,  dmg: 13, range: 70, atkCd: 1.2, speed: 36, armor: 0, lives: 1, bounty: 9,  xp: 13, shape: 'triangle', size: 7, key: '2' },
  tank:        { name: 'Tank',        cost: 50, income: 4, hp: 480, dmg: 11, range: 16, atkCd: 1.3, speed: 26, armor: 4, lives: 2, bounty: 16, xp: 24, shape: 'hex',      size: 11, key: '3' },
  mag:         { name: 'Mág',         cost: 70, income: 5, hp: 170, dmg: 28, range: 80, atkCd: 1.6, speed: 32, armor: 1, lives: 2, bounty: 20, xp: 28, shape: 'star',     size: 8, key: '4' },
};

// Automatická vlna príšer (každá strana dostane rovnakú)
const WAVE_CREEP = { name: 'Príšera', hp: 55, dmg: 6, range: 14, atkCd: 1.1, speed: 34, armor: 0, lives: 1, bounty: 4, xp: 8, shape: 'circle', size: 6 };

const HEROES = {
  rytier:    { name: 'Rytier',    hp: 320, dmg: 20, armor: 2, speed: 78, range: 24, atkCd: 0.85, regen: 1.5, acquire: 90, size: 11, perLevel: { hp: 35, dmg: 4, armor: 0.4 }, abilities: ['hrom', 'liecenie'] },
  berserker: { name: 'Berserker', hp: 320, dmg: 20, armor: 2, speed: 78, range: 24, atkCd: 0.85, regen: 1.5, acquire: 90, size: 11, perLevel: { hp: 35, dmg: 4, armor: 0.4 }, abilities: ['hrom', 'liecenie'] },
};

const ABILITIES = {
  hrom:     { name: 'Úder hromu', icon: '⚡', key: 'Q', cd: 10, type: 'nova', radius: 78, dmg: 45, dmgPerLevel: 12, stun: 1.6 },
  liecenie: { name: 'Liečenie',   icon: '✚', key: 'W', cd: 20, type: 'heal', pct: 0.45 },
};

const UPGRADES = {
  sila:     { name: 'Sila',     desc: '+6 poškodenie',            baseCost: 40, step: 25, apply: h => { h.bonus.dmg += 6; } },
  zdravie:  { name: 'Zdravie',  desc: '+70 max. zdravia',         baseCost: 40, step: 25, apply: h => { h.bonus.hp += 70; h.hp += 70; } },
  rychlost: { name: 'Rýchlosť', desc: '+12 % útok aj pohyb',      baseCost: 50, step: 30, apply: h => { h.bonus.as += 0.12; h.bonus.speed += 6; } },
};

const ITEMS = {
  mec:     { name: 'Meč',      desc: '+12 poškodenie',  cost: 130, max: 2, apply: h => { h.bonus.dmg += 12; } },
  stit:    { name: 'Štít',     desc: '+3 brnenie',      cost: 100, max: 2, apply: h => { h.bonus.armor += 3; } },
  amulet:  { name: 'Amulet',   desc: '+4 regenerácia/s', cost: 140, max: 2, apply: h => { h.bonus.regen += 4; } },
  topanky: { name: 'Čižmy',    desc: '+20 rýchlosť pohybu', cost: 70, max: 1, apply: h => { h.bonus.speed += 20; } },
};

// Zvieratková škôlka – offline service worker (scope = this game folder only)
const V = 'v13', P = 'zs1-';
const SHELL = P + 'shell-' + V, VOICE = P + 'voice-' + V;
const FILES = ["./", "assets/animals/chameleon.webp", "assets/animals/liska.webp", "assets/animals/papagaj.webp", "assets/animals/sovicka.webp", "assets/animals/ucitelka-a.webp", "assets/animals/veverica.webp", "assets/animals/zajacik.webp", "assets/audio/music.mp3", "assets/audio/music.ogg", "assets/diplomy/chameleon.webp", "assets/diplomy/liska.webp", "assets/diplomy/papagaj.webp", "assets/diplomy/sovicka.webp", "assets/diplomy/veverica.webp", "assets/diplomy/zajacik.webp", "assets/fonts/nunito.woff2", "assets/fonts/playwrite-sk.woff2", "css/style.css", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-192.png", "icons/icon-maskable-512.png", "index.html", "js/app.js", "js/cs.js", "js/games.js", "js/unlock.js", "manifest.webmanifest"];
const busy = new Set();
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(P) && k !== SHELL && k !== VOICE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const scopePath = () => new URL(self.registration.scope).pathname;
async function fromCache(req, name) {
  const hit = await caches.match(req.url, { ignoreSearch: name === SHELL });
  if (hit) return hit;
  const res = await fetch(new Request(req.url, { credentials: 'same-origin' })); // full (non-range) response, so it can be cached
  if (res.ok && res.status === 200) { const c = await caches.open(name); c.put(req.url, res.clone()); }
  return res;
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin || !u.pathname.startsWith(scopePath())) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(SHELL).then(c => c.put('index.html', res.clone())); return res; })
      .catch(() => caches.match('index.html', { ignoreSearch: true })));
    return;
  }
  e.respondWith(fromCache(r, u.pathname.includes('/assets/voice/') ? VOICE : SHELL));
});
// the app asks for all clips of the chosen language (works offline after the first play)
async function prefetch(lang) {
  if (busy.has(lang) || !/^[a-z]{2}$/.test(lang)) return; busy.add(lang);
  try {
    const base = new URL('assets/voice/' + lang + '/', self.registration.scope).href, c = await caches.open(VOICE);
    const mu = base + 'manifest.json?' + V; let mr = await c.match(mu);
    if (!mr) { mr = await fetch(mu); if (!mr.ok) return; await c.put(mu, mr.clone()); }
    const urls = [...new Set(Object.values(await mr.json()))].map(f => base + f + '?' + V);
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async x => { if (await c.match(x)) return; try { const res = await fetch(x); if (res.ok && res.status === 200) await c.put(x, res); } catch (err) { /* offline: next time */ } }));
    }
    const cl = await self.clients.matchAll(); cl.forEach(w => w.postMessage({ type: 'voiceCached', lang, n: urls.length }));
  } finally { busy.delete(lang); }
}
self.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'voice') e.waitUntil(prefetch(d.lang)); });

/* Zvieratková škôlka – free demo + full-version unlock (offline, code-based). Shared by both games. */
(function () {
  const CFG = {
    PRODUCT: (document.querySelector('meta[name="zs-product"]') || {}).content || 'g1',
    FREE: ['colors', 'count'],
    // Shop URL for parents (shown as plain text after the parent check). Empty = generic line.
    SHOP_URL: '',
    // SHA-256 of normalized code (uppercase, no spaces/dashes) -> products it unlocks. Generate with final/kody/make_codes.py
    HASHES: {
      '3110c8482bbb7254237a9279855e0e5478d3c7f41a71d900874288908a462e98': ['g1'],
      '3873cef5643f79b7ff18b905749999764cde0a050e9842e2e6c18918817e9305': ['g2'],
      'e832b7380eb8e7dc21d43e405d7516ee2e39de91c729bee5e1822ce3edb6185b': ['g1','g2']
    }
  };
  const KEY = 'zs-unlock';
  // tiny sync SHA-256 (works on file:// and http too)
  function sha256(str) {
    const b = new TextEncoder().encode(str), K = [], H = [];
    let n = 2, c = 0;
    const frac = x => (x - Math.floor(x)) * 4294967296 | 0;
    while (c < 64) { let p = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
      if (p) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c] = frac(Math.pow(n, 1 / 3)); c++; } n++; }
    const l = b.length, m = new Uint8Array(((l + 9 + 63) >> 6) << 6); m.set(b); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(m.length - 4, l * 8); dv.setUint32(m.length - 8, Math.floor(l / 536870912));
    const r = (x, y) => (x >>> y) | (x << (32 - y)), w = new Array(64);
    for (let o = 0; o < m.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = r(w[i-15], 7) ^ r(w[i-15], 18) ^ (w[i-15] >>> 3), s1 = r(w[i-2], 17) ^ r(w[i-2], 19) ^ (w[i-2] >>> 10); w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0; }
      let [a, bb, cc, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & cc) ^ (bb & cc))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = bb; bb = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const norm = s => String(s || '').toUpperCase().replace(/[\s\-–—_]/g, '');
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const put = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  if (/[?&#]unlockreset\b/.test(location.search + location.hash)) { try { localStorage.removeItem(KEY); } catch (e) {} }
  const unlocked = (p = CFG.PRODUCT) => !!get()[p];
  const locked = id => !CFG.FREE.includes(id) && !unlocked();
  function tryCode(code) {
    const prods = CFG.HASHES[sha256(norm(code))];
    if (!prods) return null;
    const o = get(); prods.forEach(p => o[p] = true); put(o); return prods;
  }
  const T = {
    sk: { title: 'Táto hra je v plnej verzii', kid: 'Túto hru ti môže odomknúť mama alebo ocko. 🙂', parents: 'Pre rodičov', back: 'Späť', q: (a, b) => `Otázka pre dospelého: koľko je ${a} × ${b}?`, ok: 'OK', notAdult: 'Skúsme to inak. Požiadaj o pomoc dospelého. 🙂',
      ptitle: 'Odomkni plnú verziu', ptext: 'Ďakujeme, že hráte! Bezplatne sú k dispozícii prvé 2 hry. Plná verzia odomkne všetkých 6 hier – bez reklám, bez časomiery, navždy na tomto zariadení. Kúpou podporíte vznik ďalších hier pre deti.', price: 'Škôlka 1 alebo Škôlka 2: 3,99 € · obe spolu: 6 €', shop: 'Plnú verziu nájdete v našom obchode', shopSoon: 'Odkaz na obchod pribudne čoskoro.', codeL: 'Máte kód? Zadajte ho sem:', unlock: 'Odomknúť', bad: 'Tento kód nepoznáme. Skontrolujte ho, prosím, a skúste znova. 🙂', okMsg: 'Hotovo! Plná verzia je odomknutá. 🎉', other: 'Kód platí pre Škôlku 2 – odomkne sa tam. Pre túto hru potrebujete kód Škôlky 1 alebo balík.', other2: 'Kód platí pre Škôlku 1 – odomkne sa tam. Pre túto hru potrebujete kód Škôlky 2 alebo balík.' },
    cs: { title: 'Tato hra je v plné verzi', kid: 'Tuhle hru ti může odemknout máma nebo táta. 🙂', parents: 'Pro rodiče', back: 'Zpět', q: (a, b) => `Otázka pro dospělého: kolik je ${a} × ${b}?`, ok: 'OK', notAdult: 'Zkusme to jinak. Požádej o pomoc dospělého. 🙂',
      ptitle: 'Odemkni plnou verzi', ptext: 'Děkujeme, že hrajete! Zdarma jsou první 2 hry. Plná verze odemkne všech 6 her – bez reklam, bez časomíry, navždy na tomto zařízení. Nákupem podpoříte vznik dalších her pro děti.', price: 'Školka 1 nebo Školka 2: 3,99 € · obě spolu: 6 €', shop: 'Plnou verzi najdete v našem obchodě', shopSoon: 'Odkaz na obchod brzy přibude.', codeL: 'Máte kód? Zadejte ho sem:', unlock: 'Odemknout', bad: 'Tento kód neznáme. Zkontrolujte ho prosím a zkuste to znovu. 🙂', okMsg: 'Hotovo! Plná verze je odemčená. 🎉', other: 'Kód platí pro Školku 2 – odemkne se tam. Pro tuto hru potřebujete kód Školky 1 nebo balíček.', other2: 'Kód platí pro Školku 1 – odemkne se tam. Pro tuto hru potřebujete kód Školky 2 nebo balíček.' },
    en: { title: 'This game is in the full version', kid: 'Mom or Dad can unlock this game for you. 🙂', parents: 'For parents', back: 'Back', q: (a, b) => `Question for a grown-up: what is ${a} × ${b}?`, ok: 'OK', notAdult: "Let's try another way. Ask a grown-up for help. 🙂",
      ptitle: 'Unlock the full version', ptext: 'Thank you for playing! The first 2 games are free. The full version unlocks all 6 games – no ads, no timers, forever on this device. Your purchase helps us make more games for kids.', price: 'Škôlka 1 or Škôlka 2: €3.99 · both together: €6', shop: 'You can get the full version in our shop', shopSoon: 'The shop link is coming soon.', codeL: 'Have a code? Enter it here:', unlock: 'Unlock', bad: "We don't recognise this code. Please check it and try again. 🙂", okMsg: 'Done! The full version is unlocked. 🎉', other: 'This code is for Škôlka 2 – it unlocks there. For this game you need a Škôlka 1 or bundle code.', other2: 'This code is for Škôlka 1 – it unlocks there. For this game you need a Škôlka 2 or bundle code.' },
    es: { title: 'Este juego es de la versión completa', kid: 'Mamá o papá pueden desbloquearte este juego. 🙂', parents: 'Para padres', back: 'Volver', q: (a, b) => `Pregunta para un adulto: ¿cuánto es ${a} × ${b}?`, ok: 'OK', notAdult: 'Probemos de otra forma. Pide ayuda a un adulto. 🙂',
      ptitle: 'Desbloquea la versión completa', ptext: '¡Gracias por jugar! Los 2 primeros juegos son gratis. La versión completa desbloquea los 6 juegos: sin anuncios, sin temporizador, para siempre en este dispositivo. Con tu compra nos ayudas a crear más juegos para niños.', price: 'Škôlka 1 o Škôlka 2: 3,99 € · los dos juntos: 6 €', shop: 'Puedes conseguir la versión completa en nuestra tienda', shopSoon: 'El enlace a la tienda llegará pronto.', codeL: '¿Tienes un código? Escríbelo aquí:', unlock: 'Desbloquear', bad: 'No reconocemos este código. Revísalo y vuelve a intentarlo, por favor. 🙂', okMsg: '¡Listo! La versión completa está desbloqueada. 🎉', other: 'Este código es para Škôlka 2 y se desbloquea allí. Para este juego necesitas un código de Škôlka 1 o del paquete.', other2: 'Este código es para Škôlka 1 y se desbloquea allí. Para este juego necesitas un código de Škôlka 2 o del paquete.' }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function open(lang, onDone, gameImg) {
    close(); const t = T[lang] || T.sk;
    box = document.createElement('div'); box.id = 'zsLock'; box.className = 'zslock'; box.setAttribute('role', 'dialog');
    const kidView = () => {
      box.innerHTML = `<div class="zl-card"><div class="zl-pic">${gameImg ? `<img src="${esc(gameImg)}" alt="">` : ''}<span class="zl-lock">🔒</span></div>
        <h2 class="zl-title">${esc(t.title)}</h2><p class="zl-kid">${esc(t.kid)}</p>
        <div class="zl-row"><button class="zl-btn zl-back" id="zlBack">🏠 ${esc(t.back)}</button><button class="zl-btn zl-par" id="zlPar">👨‍👩‍👧 ${esc(t.parents)}</button></div></div>`;
      box.querySelector('#zlBack').onclick = () => { close(); onDone && onDone(false); };
      box.querySelector('#zlPar').onclick = gateView;
    };
    const gateView = () => {
      const a = 6 + Math.floor(Math.random() * 4), b = 7 + Math.floor(Math.random() * 3);
      box.innerHTML = `<div class="zl-card"><h2 class="zl-title">👨‍👩‍👧 ${esc(t.parents)}</h2><p class="zl-q">${esc(t.q(a, b))}</p>
        <input id="zlAns" class="zl-in" inputmode="numeric" autocomplete="off" maxlength="3"><p class="zl-msg" id="zlMsg"></p>
        <div class="zl-row"><button class="zl-btn zl-back" id="zlBack">${esc(t.back)}</button><button class="zl-btn zl-par" id="zlOk">${esc(t.ok)}</button></div></div>`;
      const go = () => { if (parseInt(box.querySelector('#zlAns').value, 10) === a * b) parentView(); else { box.querySelector('#zlMsg').textContent = t.notAdult; setTimeout(kidView, 1800); } };
      box.querySelector('#zlOk').onclick = go; box.querySelector('#zlAns').onkeydown = e => { if (e.key === 'Enter') go(); };
      box.querySelector('#zlBack').onclick = kidView;
    };
    const parentView = () => {
      box.innerHTML = `<div class="zl-card zl-wide"><h2 class="zl-title">🔓 ${esc(t.ptitle)}</h2><p class="zl-text">${esc(t.ptext)}</p><p class="zl-price">${esc(t.price)}</p>
        <p class="zl-shop">🛍️ ${CFG.SHOP_URL ? esc(t.shop) + ': <b>' + esc(CFG.SHOP_URL) + '</b>' : esc(t.shopSoon)}</p>
        <label class="zl-l" for="zlCode">${esc(t.codeL)}</label><input id="zlCode" class="zl-in zl-code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MEDVED-7K3P" maxlength="40">
        <p class="zl-msg" id="zlMsg" aria-live="polite"></p>
        <div class="zl-row"><button class="zl-btn zl-back" id="zlBack">🏠 ${esc(t.back)}</button><button class="zl-btn zl-par" id="zlUn">${esc(t.unlock)}</button></div></div>`;
      const msg = box.querySelector('#zlMsg');
      const go = () => {
        const p = tryCode(box.querySelector('#zlCode').value);
        if (!p) { msg.className = 'zl-msg bad'; msg.textContent = t.bad; return; }
        if (!p.includes(CFG.PRODUCT)) { msg.className = 'zl-msg'; msg.textContent = CFG.PRODUCT === 'g1' ? t.other : t.other2; return; }
        msg.className = 'zl-msg good'; msg.textContent = t.okMsg;
        setTimeout(() => { close(); onDone && onDone(true); }, 1400);
      };
      box.querySelector('#zlUn').onclick = go; box.querySelector('#zlCode').onkeydown = e => { if (e.key === 'Enter') go(); };
      box.querySelector('#zlBack').onclick = () => { close(); onDone && onDone(false); };
    };
    kidView(); document.body.appendChild(box);
  }
  window.ZSU = { locked, unlocked, open, close, tryCode, sha256, norm, reset: () => { try { localStorage.removeItem(KEY); } catch (e) {} }, CFG };
})();

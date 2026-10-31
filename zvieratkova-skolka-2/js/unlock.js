/* Zvieratková škôlka – all 6 games are free for everyone (no lock, no code, no shop). Shared by both games. */
(function () {
  try { localStorage.removeItem('zs-unlock'); } catch (e) {}
  const CFG = { PRODUCT: (document.querySelector('meta[name="zs-product"]') || {}).content || 'g1', FREE: 'all' };
  const no = () => {};
  window.ZSU = { locked: () => false, unlocked: () => true, open: (lang, onDone) => { onDone && onDone(true); }, close: no, tryCode: () => null, reset: no, CFG };
})();

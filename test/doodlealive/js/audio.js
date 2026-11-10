/* DoodleAlive — WebAudio synth: funny sounds + music loop. No audio files. window.Sfx */
(function () {
'use strict';
let ac = null, master = null, muted = false, pitch = 1, noiseBuf = null;
let musicOn = false, musicTimer = null, nextT = 0, step = 0;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.7;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function env(g, t, a, peak, d, end) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function osc(type, f0, t, dur, dest) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function vib(o, t, rate, depth, dur) { const l = ac.createOscillator(), g = ac.createGain(); l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
function noise(t, dur, dest, rate) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; if (rate) s.playbackRate.value = rate; s.connect(dest); s.start(t); s.stop(t + dur + 0.05); return s; }
const P = f => f * pitch;

const sounds = {
  boing() { const t = ac.currentTime, g = ac.createGain(), o = osc('sine', P(160), t, 0.7, g); g.connect(master);
    o.frequency.exponentialRampToValueAtTime(P(620), t + 0.07); o.frequency.exponentialRampToValueAtTime(P(210), t + 0.65); vib(o, t + 0.07, 17, P(55), 0.6); env(g, t, 0.01, 0.8, 0.65); },
  pop() { const t = ac.currentTime, g = ac.createGain(), o = osc('sine', P(900), t, 0.15, g); g.connect(master);
    o.frequency.exponentialRampToValueAtTime(P(120), t + 0.1); env(g, t, 0.002, 0.9, 0.12);
    const ng = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; noise(t, 0.03, f); f.connect(ng); ng.connect(master); env(ng, t, 0.001, 0.3, 0.03); },
  slide() { const t = ac.currentTime, g = ac.createGain(), up = Math.random() < 0.5, o = osc('sine', P(up ? 380 : 1500), t, 0.8, g); g.connect(master);
    o.frequency.exponentialRampToValueAtTime(P(up ? 1700 : 330), t + 0.65); vib(o, t, 9, P(25), 0.8); env(g, t, 0.03, 0.55, 0.75); },
  giggle() { const t = ac.currentTime; const n = 7 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) { const tt = t + i * 0.085, g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = P(1400); f.Q.value = 2.5;
      const o = osc('sawtooth', P(520 + (i % 2) * 140 + Math.sin(i) * 40 + (i > n / 2 ? -i * 12 : i * 12)), tt, 0.08, f); o.frequency.exponentialRampToValueAtTime(P(700 + (i % 2) * 120), tt + 0.06);
      f.connect(g); g.connect(master); env(g, tt, 0.008, 0.5 - i * 0.02, 0.07); } },
  raspberry() { const t = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650; f.connect(g); g.connect(master);
    const o = osc('sawtooth', P(95), t, 0.65, f); o.frequency.exponentialRampToValueAtTime(P(55), t + 0.6);
    const am = ac.createGain(); am.gain.value = 0; const l = ac.createOscillator(); l.type = 'square'; l.frequency.setValueAtTime(34, t); l.frequency.linearRampToValueAtTime(18, t + 0.6);
    const lg = ac.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + 0.7);
    env(g, t, 0.02, 0.9, 0.62); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6, t + 0.03); g.gain.setValueAtTime(0.6, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; const ng = ac.createGain(); ng.gain.value = 0.25; noise(t, 0.6, nf); nf.connect(ng); ng.connect(g); },
  squeak() { const t = ac.currentTime, g = ac.createGain(), o = osc('triangle', P(900), t, 0.25, g); g.connect(master);
    o.frequency.exponentialRampToValueAtTime(P(2100), t + 0.08); o.frequency.exponentialRampToValueAtTime(P(1500), t + 0.2); env(g, t, 0.005, 0.6, 0.2); },
  wow() { const t = ac.currentTime, f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(1700, t + 0.28); f.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    const o = osc('sawtooth', P(190), t, 0.65, f); o.frequency.exponentialRampToValueAtTime(P(300), t + 0.25); o.frequency.exponentialRampToValueAtTime(P(170), t + 0.6); vib(o, t, 6, P(8), 0.6); f.connect(g); g.connect(master); env(g, t, 0.03, 1.4, 0.6); },
  yay() { const t = ac.currentTime; [523, 659, 784, 1047].forEach((fr, i) => { const tt = t + i * 0.09, g = ac.createGain(); osc('triangle', P(fr), tt, 0.3, g); osc('sine', P(fr * 2), tt, 0.3, g); g.connect(master); env(g, tt, 0.01, 0.35, 0.28); }); },
  woo() { const t = ac.currentTime, g = ac.createGain(), o = osc('square', P(300), t, 0.5, g); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; o.disconnect(); o.connect(f); f.connect(g); g.connect(master);
    o.frequency.exponentialRampToValueAtTime(P(900), t + 0.18); o.frequency.exponentialRampToValueAtTime(P(420), t + 0.45); vib(o, t + 0.15, 12, P(30), 0.4); env(g, t, 0.01, 0.35, 0.45); }
};
const names = Object.keys(sounds);
const byAction = { jump: ['boing', 'woo', 'slide'], spin: ['slide', 'wow', 'squeak'], dance: ['yay', 'giggle', 'woo'], wobble: ['raspberry', 'giggle', 'squeak', 'pop'], tap: ['pop', 'squeak', 'boing', 'giggle'] };

function play(name) { if (muted) return; if (!ctx()) return; try { sounds[name](); } catch (e) { } }
function playFor(action) { const l = byAction[action] || names; play(l[(Math.random() * l.length) | 0]); }
function random() { play(names[(Math.random() * names.length) | 0]); }
function land() { play('pop'); }

// ---- music: bouncy C major loop, 124 bpm
const BPM = 124, SP = 60 / BPM / 2;
const bass = [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 53, 55, 57, 55];
const mel = [72, 0, 76, 0, 79, 76, 0, 74, 72, 0, 74, 76, 79, 0, 77, 0, 76, 0, 79, 0, 84, 81, 0, 79, 77, 76, 74, 0, 72, 0, 0, 0];
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
function tick() {
  if (!musicOn || !ac) return;
  while (nextT < ac.currentTime + 0.25) {
    const t = nextT, s = step % 32;
    const b = bass[(s >> 1) % 16];
    if (s % 2 === 0) { const g = ac.createGain(), o = osc('triangle', mf(b), t, SP * 1.6, g); g.connect(master); env(g, t, 0.01, 0.32, SP * 1.5); }
    const m = mel[s]; if (m) { const g = ac.createGain(), o = osc('square', mf(m), t, SP * 0.9, g); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; o.disconnect(); o.connect(f); f.connect(g); g.connect(master); env(g, t, 0.008, 0.11, SP * 0.85); }
    if (s % 2 === 1) { const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; noise(t, 0.04, f); f.connect(g); g.connect(master); env(g, t, 0.001, 0.12, 0.04); }
    if (s % 8 === 0) { const g = ac.createGain(), o = osc('sine', 130, t, 0.15, g); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.connect(master); env(g, t, 0.002, 0.7, 0.14); }
    nextT += SP; step++;
  }
  musicTimer = setTimeout(tick, 60);
}
function music(on) {
  if (on && !muted) { if (musicOn || !ctx()) return; musicOn = true; nextT = ac.currentTime + 0.05; step = 0; tick(); }
  else { musicOn = false; clearTimeout(musicTimer); }
}
function setMuted(m) { muted = m; if (m) music(false); }

window.Sfx = { _sounds: sounds, play, playFor, random, land, music, setMuted, isMuted: () => muted, setPitch: p => pitch = p, unlock: ctx, names, isMusic: () => musicOn };
})();

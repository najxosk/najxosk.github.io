/* DoodleAlive — grid-mesh rig (WebGL) + procedural animation. window.Rig.create(canvas) */
(function () {
'use strict';
const NX = 16, NY = 20;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pot = n => { let p = 64; while (p < n) p *= 2; return p; };

function create(canvas) {
  let gl = null, c2 = null;
  try { gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true }); } catch (e) { }
  if (!gl) c2 = canvas.getContext('2d');
  const R = { hasGL: !!gl, events: {} };
  let W = 300, H = 400, dpr = 1, tex = null, texCanvas = null, aspect = 1;
  let prog, buf, uvBuf, idxBuf, nIdx, uRes, pos = new Float32Array((NX + 1) * (NY + 1) * 2);

  if (gl) {
    const vs = 'attribute vec2 aPos;attribute vec2 aUV;uniform vec2 uRes;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aPos.x/uRes.x*2.0-1.0,1.0-aPos.y/uRes.y*2.0,0.0,1.0);}';
    const fs = 'precision mediump float;varying vec2 vUV;uniform sampler2D uTex;void main(){gl_FragColor=texture2D(uTex,vUV);}';
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
    const uv = new Float32Array((NX + 1) * (NY + 1) * 2), idx = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const k = (j * (NX + 1) + i) * 2; uv[k] = i / NX; uv[k + 1] = j / NY; }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    nIdx = idx.length;
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, pos.byteLength, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const aUV = gl.getAttribLocation(prog, 'aUV'); gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    uRes = gl.getUniformLocation(prog, 'uRes'); gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
  }

  // ---- animation state
  let T = 0, danceOn = false, danceW = 0, danceT = 0, jump = null, spin = null, wob = null, spinCount = 0;
  let armK = 1, cw = 100, ch = 100, cx = 0, gy = 0, jumpH = 100;
  const pose = { oy: 0, sx: 1, sy: 1, tilt: 0, roll: 0, flip: 1, shift: 0, armL: 0, armR: 0, legL: 0, legR: 0, tuck: 0, wobA: 0, wobT: 0, sway: 0, rollOn: false };

  function layout() {
    if (!tex && !texCanvas) return;
    const maxW = W * 0.8, maxH = H * 0.46;
    let s = Math.min(maxW / texCanvas.width, maxH / texCanvas.height);
    cw = texCanvas.width * s; ch = texCanvas.height * s; cx = W / 2; gy = H * 0.8;
    jumpH = clamp(gy - ch - H * 0.15, ch * 0.25, H * 0.4);
  }
  R.resize = (w, h, d) => { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; if (gl) gl.viewport(0, 0, canvas.width, canvas.height); layout(); };
  R.setCharacter = (cv) => {
    texCanvas = cv; aspect = cv.width / cv.height;
    { const t = document.createElement('canvas'); t.width = t.height = 24; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(cv, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; R.solid = n / 576; armK = clamp(1.4 - 1.6 * R.solid, 0.3, 1); }
    if (gl) {
      const p = document.createElement('canvas'); p.width = pot(cv.width); p.height = pot(cv.height);
      const x = p.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, p.width, p.height);
      if (tex) gl.deleteTexture(tex); tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    tex = tex || true; jump = spin = wob = null; layout();
  };
  const emit = (n, a) => R.events[n] && R.events[n](a);

  R.setDance = on => { if (on && !danceOn) danceT = 0; danceOn = on; };
  R.isDancing = () => danceOn;
  R.trigger = name => {
    if (name === 'dance') { R.setDance(!danceOn); return danceOn; }
    if (name === 'jump') { if (!jump || jump.t > 0.5) { jump = { t: 0, took: false, landed: false }; } }
    if (name === 'spin') { if (!spin) { spin = { t: 0, roll: (spinCount++ % 2) === 1 }; emit('spin', R.where()); } }
    if (name === 'wobble') { wob = { t: 0 }; }
  };
  R.busy = () => !!(jump || spin);
  R.where = () => ({ x: cx, y: gy - ch / 2 + pose.oy, feetY: gy, w: cw, h: ch });
  R.hit = (x, y) => { const sw = Math.max(cw, ch * 0.45) * 0.6 + 12; return Math.abs(x - cx) < sw && y > gy - ch * 1.15 + pose.oy && y < gy + 24; };
  R.groundInfo = () => { const h = clamp(-pose.oy / (jumpH * 1.1), 0, 1); return { x: cx + pose.shift, y: gy, rx: Math.max(cw * 0.36, ch * 0.2) * (1 - 0.5 * h) * Math.max(0.35, Math.abs(pose.flip)), alpha: 0.28 * (1 - 0.6 * h) }; };

  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

  R.update = dt => {
    dt = Math.min(dt, 0.05); T += dt;
    const p = pose; Object.assign(p, { oy: 0, sx: 1, sy: 1, tilt: 0, roll: 0, flip: 1, shift: 0, armL: 0, armR: 0, legL: 0, legR: 0, tuck: 0, wobA: 0, wobT: 0, sway: 0 });
    // idle
    const br = Math.sin(T * 2.7); p.sy *= 1 + 0.018 * br; p.sx *= 1 - 0.01 * br; p.tilt += 0.025 * Math.sin(T * 1.25); p.sway += 0.7 + 0.3 * Math.sin(T * 0.9);
    p.armL += 0.12 + 0.1 * Math.sin(T * 1.7); p.armR += 0.12 + 0.1 * Math.sin(T * 1.7 + 2);
    // dance
    danceW += ((danceOn ? 1 : 0) - danceW) * Math.min(1, dt * 6);
    if (danceOn) danceT += dt;
    if (danceW > 0.001) {
      const b = danceT * 2, sb = Math.abs(Math.sin(Math.PI * b)), w = danceW;
      p.oy += -sb * 0.09 * ch * w; const sq = Math.pow(1 - sb, 5);
      const sy = 1 - 0.10 * sq + 0.04 * sb; p.sy *= 1 + (sy - 1) * w; p.sx *= 1 + (1 / Math.pow(sy, 0.7) - 1) * w;
      p.tilt += 0.14 * Math.sin(Math.PI * b) * w; p.shift += Math.sin(Math.PI * b * 0.5) * cw * 0.08 * w;
      const s1 = Math.sin(Math.PI * b); p.legL += Math.max(0, s1) * w; p.legR += Math.max(0, -s1) * w;
      const a1 = Math.sin(Math.PI * 2 * b * 0.5 * 2);
      p.armL += (0.55 + 0.45 * a1) * w; p.armR += (0.55 - 0.45 * a1) * w; p.sway += 1.2 * w;
    }
    // jump
    if (jump) {
      jump.t += dt; const t = jump.t, D = 1.15; let h = 0, sx = 1, sy = 1;
      if (t < 0.2) { const k = ease(t / 0.2); sy = 1 - 0.3 * k; sx = 1 + 0.22 * k; p.armL += -0.2 * k; p.armR += -0.2 * k; }
      else if (t < 0.78) {
        if (!jump.took) { jump.took = true; emit('jump', R.where()); }
        const k = (t - 0.2) / 0.58; h = Math.sin(Math.PI * k); const st = 1 - Math.abs(k - 0.5) * 2 * 0.3;
        sy = 1 + 0.22 * Math.sin(Math.PI * Math.min(1, k * 1.5)) * 0.9 + (1 - Math.min(1, k * 4)) * -0.2; sx = 1 / Math.pow(sy, 0.8); p.armL += 0.9 * Math.sin(Math.PI * k); p.armR += 0.9 * Math.sin(Math.PI * k); p.tuck += Math.sin(Math.PI * k) * 0.8;
        p.tilt += 0.1 * Math.sin(k * 6.28);
      } else {
        if (!jump.landed) { jump.landed = true; emit('land', R.where()); }
        const k = (t - 0.78) / (D - 0.78), e = Math.exp(-4 * k) * Math.cos(k * 14); sy = 1 - 0.27 * e; sx = 1 + 0.2 * e; p.armL += 0.3 * (1 - k); p.armR += 0.3 * (1 - k);
      }
      p.oy += -h * jumpH; p.sy *= sy; p.sx *= sx; if (t > D) jump = null;
    }
    // spin
    if (spin) {
      spin.t += dt; const D = 1.25, k = clamp(spin.t / D, 0, 1), e = ease(k), hop = Math.sin(Math.PI * k);
      p.oy += -hop * ch * 0.22;
      if (spin.roll) { p.roll += e * Math.PI * 2 * 2; p.sy *= 1 + 0.06 * hop; p.oy += -hop * ch * 0.12; } else { p.flip *= Math.cos(e * Math.PI * 2 * 2); p.sy *= 1 + 0.08 * hop; }
      p.armL += 0.8 * hop; p.armR += 0.8 * hop; p.tuck += 0.5 * hop;
      if (k >= 1) { spin = null; wob = { t: 0 }; }
    }
    // wobble (jelly)
    if (wob) { wob.t += dt; const e = Math.exp(-3.0 * wob.t); p.wobA = e; p.wobT = wob.t; p.sx *= 1 + 0.1 * e * Math.sin(wob.t * 20); p.sy *= 1 - 0.07 * e * Math.sin(wob.t * 20); if (e < 0.02) wob = null; }
  };

  const tmp = [0, 0];
  function deform(u, v, out) { // local coords relative to feet, y up negative
    const p = pose; let x = (u - 0.5) * cw, y = (v - 1) * ch;
    const s = (u - 0.5) * 2, g = Math.tanh(s * 3);
    // wobble wave
    if (p.wobA > 0.001) x += 0.14 * cw * p.wobA * Math.sin(p.wobT * 16 - 6 * (1 - v)) * Math.pow(1 - v, 1.3);
    // idle/dance sway bend (lean top)
    x += Math.sin(T * 2 + v * 2.5) * 0.012 * cw * p.sway * (1 - v);
    // arms rotate about shoulders
    const aw = armK * sstep(0.24, 0.4, v) * (1 - sstep(0.6, 0.76, v)) * sstep(0.2, 0.5, Math.abs(s));
    if (aw > 0) {
      const lift = s < 0 ? p.armL : p.armR; const ang = -Math.sign(s) * (lift * 0.8 - 0.2) * aw;
      const px = 0, py = -ch * 0.62; const dx = x - px, dy = y - py, ca = Math.cos(ang), sa = Math.sin(ang);
      x = px + dx * ca - dy * sa; y = py + dx * sa + dy * ca;
    }
    // legs lift (lower part), alternate sides
    const lw = sstep(0.5, 0.92, v), lift = (p.legL * (1 - g) + p.legR * (1 + g)) * 0.5;
    y -= lw * (lift * 0.11 * ch + p.tuck * 0.12 * ch * (0.6 + 0.4 * Math.abs(g)));
    x += lw * (-g) * lift * 0.0; out[0] = x; out[1] = y;
  }

  R.draw = () => {
    if (!texCanvas) return;
    const p = pose, cr = Math.cos(p.tilt), sr = Math.sin(p.tilt), cro = Math.cos(p.roll), sro = Math.sin(p.roll);
    const ox = cx + p.shift, oy = gy + p.oy, pvy = -ch * 0.5 * p.sy;
    if (gl) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      let k = 0;
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
        deform(i / NX, j / NY, tmp);
        let x = tmp[0] * p.sx * p.flip, y = tmp[1] * p.sy;
        let xr = x * cr - y * sr, yr = x * sr + y * cr; x = xr; y = yr;
        if (p.roll) { const dy = y - pvy; xr = x * cro - dy * sro; yr = x * sro + dy * cro + pvy; x = xr; y = yr; }
        pos[k++] = (ox + x) * dpr * (1 / dpr) ; pos[k++] = oy + y;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.uniform2f(uRes, W, H); gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    } else {
      c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H);
      c2.translate(ox, oy); c2.rotate(p.tilt); c2.translate(0, pvy); c2.rotate(p.roll); c2.translate(0, -pvy); c2.scale(p.sx * p.flip, p.sy);
      c2.drawImage(texCanvas, -cw / 2, -ch, cw, ch);
    }
  };
  R.reset = () => { jump = spin = wob = null; danceOn = false; danceW = 0; };
  return R;
}
window.Rig = { create };
})();

/* Copyright (c) 2026 Bruder Motion. All rights reserved. See LICENSE. */
/* Bruder Motion: page background
   Cinematic film look behind all content: moving film grain, droplets left on the glass after rain, slow silver light leaks
   drifting like a projector beam, a faint flicker, and a soft glow that follows the cursor.
   The light is a WebGL shader; the grain is a tiled noise layer stepped like film frames. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Film grain: one noise tile, jumped around a few times a second ── */
  const tile = document.createElement('canvas');
  tile.width = tile.height = 180;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  const grain = document.createElement('div');
  grain.id = 'bg-grain';
  grain.setAttribute('aria-hidden', 'true');
  grain.style.backgroundImage = `url(${tile.toDataURL()})`;
  if (reduce) grain.style.animation = 'none';
  document.body.prepend(grain);

  /* ── Just after rain: droplets left on the glass ─────────────────
     Mostly still beads of every size, a few heavier drops slowly sliding down and
     leaving a faint wet trail. Drops near the cursor catch its glow. */
  const rain = document.createElement('canvas');
  rain.id = 'bg-rain';
  rain.setAttribute('aria-hidden', 'true');
  document.body.prepend(rain);
  const rc = rain.getContext('2d');
  const small = innerWidth < 760;

  // one droplet drawn once, then stamped at any size: dark lensing edge, soft body, bright highlight
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sc2 = sprite.getContext('2d');
  let g = sc2.createRadialGradient(34, 36, 6, 32, 32, 30);
  g.addColorStop(0, 'rgba(200,205,215,.10)');
  g.addColorStop(.72, 'rgba(160,165,175,.16)');
  g.addColorStop(.9, 'rgba(0,0,0,.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  sc2.fillStyle = g; sc2.beginPath(); sc2.arc(32, 32, 30, 0, 6.283); sc2.fill();
  sc2.strokeStyle = 'rgba(235,240,250,.45)'; sc2.lineWidth = 1.6;          // rim light on the lower edge
  sc2.beginPath(); sc2.arc(32, 32, 26, .35, 2.8); sc2.stroke();
  g = sc2.createRadialGradient(23, 22, 0, 23, 22, 9);                       // specular highlight
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  sc2.fillStyle = g; sc2.beginPath(); sc2.arc(23, 22, 9, 0, 6.283); sc2.fill();

  let RW = 0, RH = 0, DPR = 1, beads = [], sliders = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bead = born => ({ x: rnd(0, RW), y: rnd(0, RH), r: 1 + 7 * Math.random() ** 2.4, a: rnd(.45, .8), age: born ? rnd(0, 40) : 0, life: rnd(25, 60) });
  const slider = top => ({ x: rnd(0, RW), y: top ? rnd(-40, -10) : rnd(0, RH), r: rnd(6, 10), a: rnd(.6, .85), v: 0, rest: rnd(0, 4), trail: [] });
  const rsize = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    RW = innerWidth; RH = innerHeight;
    rain.width = Math.round(RW * DPR); rain.height = Math.round(RH * DPR);
    rc.setTransform(DPR, 0, 0, DPR, 0, 0);
    beads = Array.from({ length: Math.min(small ? 45 : 110, Math.round(RW * RH / 11000)) }, () => bead(true));
    sliders = Array.from({ length: small ? 3 : 6 }, () => slider(false));
  };
  rsize();
  addEventListener('resize', rsize);
  let rmx = -999, rmy = -999;
  addEventListener('pointermove', e => { rmx = e.clientX; rmy = e.clientY; }, { passive: true });
  const glow = (x, y) => 1 + 2.2 * Math.exp(-((x - rmx) ** 2 + (y - rmy) ** 2) / (2 * 180 * 180));
  const stamp = (x, y, r, a) => { rc.globalAlpha = Math.min(a, 1); rc.drawImage(sprite, x - r, y - r, r * 2, r * 2); };

  let rlast = performance.now();
  const rainFrame = now => {
    const dt = Math.min((now - rlast) / 1000, .05); rlast = now;
    rc.clearRect(0, 0, RW, RH);
    for (const b of beads) {
      b.age += dt;
      if (b.age > b.life) Object.assign(b, bead(false));
      const fade = Math.min(1, b.age / 3, (b.life - b.age) / 3);           // ease in and out
      stamp(b.x, b.y, b.r, b.a * fade * .75 * glow(b.x, b.y));
    }
    for (const s of sliders) {
      // heavy drops stick, then slip a little, then stick again
      if (s.rest > 0) { s.rest -= dt; s.v *= .9; }
      else { s.v = Math.min(s.v + 40 * dt, rnd(18, 46)); if (Math.random() < dt * .5) s.rest = rnd(1.5, 6); }
      s.y += s.v * dt; s.x += Math.sin(s.y * .02) * s.v * dt * .08;   // drift only while moving
      if (s.v > 2) s.trail.push({ x: s.x, y: s.y - s.r * .6, a: 1 });
      for (const t of s.trail) t.a -= dt * .08;
      s.trail = s.trail.filter(t => t.a > 0).slice(-260);
      rc.fillStyle = 'rgb(225,230,240)';
      for (const t of s.trail) { rc.globalAlpha = t.a * .06 * glow(t.x, t.y); rc.fillRect(t.x - s.r * .2, t.y, s.r * .4, 1.2); }
      stamp(s.x, s.y, s.r, s.a * .8 * glow(s.x, s.y));
      if (s.y - s.r > RH && !s.trail.length) Object.assign(s, slider(true));
    }
    rc.globalAlpha = 1;
    if (!reduce && !document.hidden) requestAnimationFrame(rainFrame);
  };
  requestAnimationFrame(rainFrame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) { rlast = performance.now(); requestAnimationFrame(rainFrame); } });

  /* ── Light leaks ───────────────────────────────────────────────── */
  const cvs = document.createElement('canvas');
  cvs.id = 'bg-film';
  cvs.setAttribute('aria-hidden', 'true');
  document.body.prepend(cvs);

  const gl = cvs.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { cvs.remove(); return; }

  const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `
    precision mediump float;
    uniform vec2 res; uniform float t; uniform vec2 mouse; uniform float scroll;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    // soft elongated light: centre c, size s, angle a
    float leak(vec2 p, vec2 c, vec2 s, float a){
      vec2 d = p - c;
      d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d / s;
      return exp(-dot(d, d));
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / res;
      vec2 p = (gl_FragCoord.xy - .5 * res) / min(res.x, res.y);
      float k = res.x / min(res.x, res.y);          // half-width in p units is .5 * k
      float sy = scroll * .22;

      // warm-silver leak drifting near the top right
      vec2 c1 = vec2(.42 * k + .10 * sin(t * .061), .38 + .07 * cos(t * .047) + sy);
      float l1 = leak(p, c1, vec2(.62, .30), .55 + .12 * sin(t * .05)) * (.75 + .25 * sin(t * .19));
      // anamorphic streak through it
      vec2 d1 = p - c1;
      float streak = exp(-abs(d1.y) * 70.) * exp(-abs(d1.x) * 1.1) * .55;
      // cooler leak low on the left
      vec2 c2 = vec2(-.46 * k + .09 * sin(t * .043 + 1.3), -.30 + .12 * sin(t * .035) + sy * .6);
      float l2 = leak(p, c2, vec2(.55, .34), -.4 + .1 * cos(t * .04)) * (.7 + .3 * sin(t * .13 + 2.));
      // a faint beam sweeping across now and then, like a projector shutter
      float ph = fract(t / 21.);
      float pos = mix(-1.2 * k, 1.2 * k, ph);
      float beam = exp(-pow(dot(p, normalize(vec2(1., .35))) - pos, 2.) * 9.) * smoothstep(0., .15, ph) * smoothstep(1., .8, ph) * .5;

      // cursor glow
      vec2 m = (vec2(mouse.x, res.y - mouse.y) - .5 * res) / min(res.x, res.y);
      float g = exp(-3.6 * length(p - m));

      vec3 warm = vec3(.80, .78, .75), cool = vec3(.68, .71, .76);
      vec3 col = vec3(.034);
      col += warm * (l1 * .40 + streak * .16);
      col += cool * l2 * .27;
      col += vec3(.75) * beam * .10;
      col += vec3(.70) * g * .085;
      // projector flicker
      col *= 1. + .035 * (hash(vec2(floor(t * 14.), 3.1)) - .5);
      // vignette keeps the edges black
      col *= smoothstep(1.3, .2, length(uv - .5) * 1.45);
      col += .012 * (hash(gl_FragCoord.xy + fract(t)) - .5);
      gl_FragColor = vec4(col, 1.);
    }`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cvs.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U('res'), uT = U('t'), uMouse = U('mouse'), uScroll = U('scroll');

  // Render at reduced resolution; the light is soft so it upscales cleanly
  const SCALE = innerWidth < 760 ? .35 : .5;
  const size = () => {
    cvs.width = Math.max(2, Math.round(innerWidth * SCALE));
    cvs.height = Math.max(2, Math.round(innerHeight * SCALE));
    gl.viewport(0, 0, cvs.width, cvs.height);
    gl.uniform2f(uRes, cvs.width, cvs.height);
  };
  size();
  addEventListener('resize', size);

  let mx = innerWidth * .7, my = innerHeight * .3, smx = mx, smy = my, sc = 0;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  const t0 = performance.now();
  const frame = now => {
    smx += (mx - smx) * .05; smy += (my - smy) * .05;
    sc += (scrollY / innerHeight - sc) * .08;
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform2f(uMouse, smx * SCALE, smy * SCALE);
    gl.uniform1f(uScroll, sc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(frame); });
})();

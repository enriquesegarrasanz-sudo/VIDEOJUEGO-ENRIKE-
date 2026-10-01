// game.js — ¡ACCIÓN! · motor del juego
// Auto-runner de un botón: el personaje corre solo, el jugador salta.
// Mantener pulsado = salto más alto. Vidas = corazones de Ilusión.
'use strict';

(() => {
  const B = Brush, CH = Chars, L = Level1;
  const VH = 540, VW_MIN = 720, VW_MAX = 1200, GROUND = L.GROUND;
  const SPEED = 290, GRAV = 2100, JUMP_V = -760, HOLD_T = 0.26, HOLD_G = 0.42, MAX_FALL = 1500;
  const MAX_HEARTS = 5, START_HEARTS = 3;
  const PLAYER_W = 28, PLAYER_H = 100;
  const SAVE_KEY = 'accion_mundo1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const loadingEl = document.getElementById('loading');

  // ---------------- viewport ----------------
  const view = { w: 960, h: VH, scale: 1, ox: 0, oy: 0, dpr: 1 };
  function resize() {
    const cw = window.innerWidth, chh = window.innerHeight;
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * view.dpr); canvas.height = Math.round(chh * view.dpr);
    canvas.style.width = cw + 'px'; canvas.style.height = chh + 'px';
    view.w = Math.max(VW_MIN, Math.min(VW_MAX, cw / chh * VH));
    view.scale = Math.min(cw / view.w, chh / VH);
    view.ox = (cw - view.w * view.scale) / 2; view.oy = (chh - VH * view.scale) / 2;
  }
  window.addEventListener('resize', resize); resize();

  // ---------------- input ----------------
  const input = { held: false, pressed: false, tap: false };
  function press(e) {
    if (e && e.cancelable && e.type !== 'keydown') e.preventDefault();
    if (!input.held) { input.pressed = true; input.tap = true; }
    input.held = true; Sfx.unlock();
  }
  function release() { input.held = false; }
  window.addEventListener('pointerdown', press, { passive: false });
  window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') { e.preventDefault(); press(e); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') release(); });
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ---------------- audio (sintetizado, sin archivos) ----------------
  const Sfx = (() => {
    let ac = null, master = null;
    function unlock() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination); } catch (e) { ac = null; }
    }
    function tone(type, f0, f1, dur, vol = 0.5, delay = 0) {
      if (!ac) return;
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol = 0.4, delay = 0) {
      if (!ac) return;
      const n = ac.sampleRate * dur | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(master); s.start(ac.currentTime + delay);
    }
    const play = {
      jump: () => tone('square', 320, 620, 0.14, 0.25),
      land: () => noise(0.05, 0.12),
      hit: () => { noise(0.25, 0.5); tone('sawtooth', 220, 60, 0.3, 0.3); },
      coffee: () => { tone('sine', 660, 660, 0.08, 0.3); tone('sine', 990, 990, 0.14, 0.3, 0.08); },
      claqueta: () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.18, 0.35, i * 0.08)); },
      scream: () => { tone('sawtooth', 700, 180, 0.6, 0.35); noise(0.3, 0.2); },
      tremble: () => tone('square', 90, 70, 0.5, 0.12),
      fall: () => tone('sine', 500, 90, 0.5, 0.3),
      word: () => tone('triangle', 180, 120, 0.2, 0.25),
      splash: () => { noise(0.2, 0.3); tone('sine', 300, 120, 0.25, 0.2); },
      start: () => { [392, 523, 659].forEach((f, i) => tone('triangle', f, f, 0.15, 0.3, i * 0.1)); },
      gameover: () => { [330, 294, 262, 196].forEach((f, i) => tone('triangle', f, f, 0.35, 0.3, i * 0.3)); },
      win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.35, i * 0.14)); noise(0.6, 0.15, 0.9); },
      boss: () => { [110, 110, 98, 110].forEach((f, i) => tone('sawtooth', f, f * 0.8, 0.35, 0.25, i * 0.35)); }
    };
    return { unlock, play: n => { try { play[n] && play[n](); } catch (e) { } } };
  })();

  // ---------------- guardado ----------------
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
  function saveGame(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { } }
  let save = loadSave();
  if (!save.claquetas) save.claquetas = [false, false, false];

  // ---------------- estado ----------------
  const S = { mode: 'loading', t: 0, modeT: 0, shake: 0, flash: 0 };
  let paper, grainTex, bgSprites = null;
  let player, cam, ents, plats, boss, water, particles, run;

  function newRun() {
    player = { x: 120, y: GROUND, vy: 0, onGround: true, hold: 0, inv: 0, hearts: START_HEARTS, kb: 0, phase: 0, hitT: 0, dead: false, lastY: GROUND, cp: 0 };
    cam = { x: 0 };
    particles = [];
    water = { level: 0, target: 0, zone: null };
    run = { claquetas: [false, false, false], t: 0, done: false, hints: {} };
    plats = L.platforms.map(p => Object.assign({}, p));
    ents = L.entities.map(e => Object.assign({ state: 'idle', t: 0, used: false, triggered: false }, e));
    boss = null;
    for (const e of ents) {
      if (e.type === 'tears') water.zone = e;
      if (e.type === 'trust') { e.angle = 0; e.state = 'stand'; }
      if (e.type === 'boss') boss = e;
    }
    boss.active = false; boss.words = []; boss.spawned = 0; boss.timer = 0; boss.x0 = boss.x; boss.y = GROUND - 220; boss.mouth = 0; boss.dead = false; boss.vy = 0;
  }

  function setMode(m) { S.mode = m; S.modeT = 0; input.tap = false; input.pressed = false; }

  // ---------------- carga ----------------
  async function boot() {
    try { await Promise.race([document.fonts.load("20px 'Caveat'").then(() => document.fonts.load("20px 'Permanent Marker'")), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
    await new Promise(r => setTimeout(r, 30));
    paper = B.paper(1200, 540, 3);
    grainTex = B.grain(256, 256, 11);
    CH.build();
    // pre-pintar textos del nivel
    for (const e of L.entities) {
      if (e.type === 'sign') CH.sign(e.lines);
      if (e.bubble) CH.bubble(e.bubble);
    }
    for (const p of L.platforms) { if (p.kind === 'mat') CH.mat(p.w); if (p.kind === 'syllable') CH.syllable(p.text, p.w); }
    for (const w of L.monologue) CH.word(w[0], w[1]);
    CH.bubble('...'); CH.bubble('(se ha quedado sin texto)', 18); CH.bubble('¡Y una más de confianza!', 18);
    newRun();
    loadingEl.classList.add('hidden');
    setMode('title');
    requestAnimationFrame(frame);
  }

  // ---------------- física del jugador ----------------
  function damage(src) {
    if (player.inv > 0 || player.dead || window.ACCION.ghost) return false;
    if (window.ACCION.log) window.ACCION.log.push({ src, x: Math.round(player.x), y: Math.round(player.y), t: Math.round(run.t * 100) / 100 });
    player.hearts--; player.inv = 1.5; player.hitT = 0.5; S.shake = 0.35; S.flash = 0.25;
    Sfx.play('hit');
    for (let i = 0; i < 10; i++) particles.push({ x: player.x, y: player.y - 50, vx: (Math.random() - 0.5) * 400, vy: -Math.random() * 400, life: 0.6, color: CH.C.red, size: 4 + Math.random() * 5 });
    if (player.hearts <= 0) { player.dead = true; player.vy = -500; Sfx.play('gameover'); }
    return true;
  }
  function respawn() {
    player.x = player.cp + 40; player.y = GROUND; player.vy = 0; player.onGround = true; player.kb = 0;
  }

  function updatePlayer(dt) {
    if (player.dead) { player.deadT = (player.deadT || 0) + dt; player.vy += GRAV * dt; player.y += player.vy * dt; return; }
    for (const cp of L.checkpoints) if (player.x >= cp) player.cp = cp;
    // avance
    let vx = SPEED;
    if (player.kb > 0) { vx = -220; player.kb -= dt; }
    player.x += vx * dt;
    // salto
    if (input.pressed && player.onGround) {
      player.vy = JUMP_V; player.onGround = false; player.hold = HOLD_T; Sfx.play('jump');
      for (let i = 0; i < 5; i++) particles.push({ x: player.x - 10 + Math.random() * 20, y: player.y, vx: -80 - Math.random() * 100, vy: -Math.random() * 60, life: 0.4, color: '#b9a98a', size: 3 });
    }
    let g = GRAV;
    if (!player.onGround && player.vy < 0 && input.held && player.hold > 0) { g *= HOLD_G; player.hold -= dt; }
    else player.hold = 0;
    player.vy = Math.min(MAX_FALL, player.vy + g * dt);
    player.lastY = player.y;
    player.y += player.vy * dt;
    // colisiones con plataformas (solo desde arriba)
    player.onGround = false;
    if (player.vy >= 0) {
      const land = (top, x0, x1) => {
        if (player.x + PLAYER_W / 2 - 4 > x0 && player.x - PLAYER_W / 2 + 4 < x1 && player.lastY <= top + 2 && player.y >= top) {
          player.y = top; player.vy = 0; player.onGround = true; return true;
        }
        return false;
      };
      for (const f of L.floors) if (land(GROUND, f.x, f.x + f.w)) break;
      if (!player.onGround) for (const p of plats) { if (land(p.y + (p.dy || 0), p.x, p.x + p.w)) break; }
      if (!player.onGround) for (const e of ents) { if (e.type === 'trust' && e.state === 'down' && land(GROUND - 24, e.x - 100, e.x)) break; }
    }
    if (player.onGround && player.lastY < player.y - 0.5) Sfx.play('land');
    // caída al vacío
    if (player.y > VH + 80) { Sfx.play('fall'); if (damage('pit') || player.hearts > 0) respawn(); }
    // lágrimas
    if (water.zone && water.level > 20 && player.x > water.zone.x && player.x < water.zone.x + water.zone.w && player.y >= GROUND - 2 && player.onGround) {
      if (damage('tears')) { player.vy = -520; player.onGround = false; Sfx.play('splash'); }
    }
    if (player.inv > 0) player.inv -= dt;
    if (player.hitT > 0) player.hitT -= dt;
    player.phase = (player.phase + dt * SPEED / 46) % 1;
  }

  // ---------------- entidades ----------------
  const pbox = () => ({ x0: player.x - PLAYER_W / 2, x1: player.x + PLAYER_W / 2, y0: player.y - PLAYER_H, y1: player.y });
  function overlap(a, bx0, by0, bx1, by1) { return a.x0 < bx1 && a.x1 > bx0 && a.y0 < by1 && a.y1 > by0; }

  function updateEntities(dt) {
    const pb = pbox();
    for (const p of plats) {
      if (p.kind === 'syllable') p.dy = Math.sin(S.t * 1.6 + p.bob) * 9;
      if (p.float) p.dy = water.level > 10 ? Math.sin(S.t * 2 + p.x * 0.01) * 4 : 0;
    }
    for (const e of ents) {
      e.t += dt;
      const dist = e.x - player.x;
      switch (e.type) {
        case 'coffee':
          if (!e.used && overlap(pb, e.x - 16, e.y - 44, e.x + 16, e.y)) {
            e.used = true; Sfx.play('coffee');
            if (player.hearts < MAX_HEARTS) player.hearts++;
            burst(e.x, e.y - 20, '#f4efe3', 8);
            toast('+1 Ilusión ☕');
          }
          break;
        case 'claqueta':
          e.dy = Math.sin(S.t * 3 + e.x) * 5;
          if (!e.used && overlap(pb, e.x - 22, e.y - 36 + e.dy, e.x + 22, e.y + 16 + e.dy)) {
            e.used = true; run.claquetas[e.id] = true; Sfx.play('claqueta');
            burst(e.x, e.y, CH.C.gold, 16); toast('¡Claqueta dorada!');
          }
          break;
        case 'trust':
          if (e.state === 'stand' && dist < 470 && dist > 0) { e.state = 'wobble'; e.t = 0; }
          if (e.state === 'wobble') { e.angle = Math.sin(e.t * 30) * 0.06; if (e.t > 0.45) { e.state = 'fall'; e.t = 0; } }
          if (e.state === 'fall') {
            e.angle = -Math.min(Math.PI / 2, e.t * e.t * 11);
            if (e.angle <= -Math.PI / 2 + 0.01) { e.state = 'down'; e.t = 0; Sfx.play('land'); S.shake = Math.max(S.shake, 0.15); burst(e.x - 60, GROUND, '#b9a98a', 6); }
            // cuerpo girando = peligro (segmento desde los pies)
            const bx0 = e.x + Math.min(0, Math.sin(e.angle) * 100) - 10, bx1 = e.x + 10;
            const by0 = GROUND - Math.max(20, Math.cos(e.angle) * 100);
            if (overlap(pb, bx0, by0, bx1, GROUND)) damage('trust');
          }
          if (e.state === 'down') {
            // tumbado en el suelo: se salta o se pisa (plataforma baja); chocar de lado duele
            if (player.y > GROUND - 20 && overlap(pb, e.x - 96, GROUND - 22, e.x - 4, GROUND)) { if (damage('trustdown')) player.kb = 0.2; }
          }
          break;
        case 'knight':
          // tiembla (aviso) → grita (onda) → descansa. Saltar cuando empieza a temblar.
          if (e.state === 'idle' && dist < 380 && dist > 0) { e.state = 'tremble'; e.t = 0; Sfx.play('tremble'); }
          if (e.state === 'tremble' && e.t > 0.45) { e.state = 'scream'; e.t = 0; e.waveX = e.x - 30; Sfx.play('scream'); S.shake = 0.3; }
          if (e.state === 'scream') {
            e.waveX -= 260 * dt;
            if (e.t > 1.8) { e.state = 'cool'; e.t = 0; }
            // la onda: pared baja que hay que saltar
            if (overlap(pb, e.waveX - 24, GROUND - 60, e.waveX + 10, GROUND)) { if (damage('wave')) player.kb = 0.35; }
          }
          if (e.state === 'cool' && e.t > 1.2 && dist > 0) { e.state = 'idle'; }
          break;
        case 'napoleon':
          if (!e.used && overlap(pb, e.x - 16, GROUND - 80, e.x + 16, GROUND)) { e.used = true; if (damage('napoleon')) player.kb = 0.25; }
          if (e.used && dist < -60) e.used = false;
          break;
        case 'teacher':
          if (!e.triggered && dist < 520) { e.triggered = true; e.t = 0; water.target = 44; Sfx.play('splash'); S.shake = 0.2; for (const c of ents) if (c.type === 'crier') c.triggered = true; }
          break;
        case 'teacherVoice':
          if (!e.triggered && dist < 500) { e.triggered = true; e.t = 0; }
          break;
        case 'boss':
          updateBoss(e, dt, pb);
          break;
      }
    }
    // nivel del agua de lágrimas
    water.level += (water.target - water.level) * Math.min(1, dt * 2.5);
  }

  function updateBoss(bs, dt, pb) {
    if (!bs.active) { if (player.x > L.bossX - 700) { bs.active = true; bs.timer = 2.2; Sfx.play('boss'); toast('JEFE: La Calavera de Hamlet'); } return; }
    if (bs.dead) { bs.vy += GRAV * dt; bs.y = Math.min(GROUND - 60, bs.y + bs.vy * dt); return; }
    bs.x = player.x + view.w * 0.52;
    bs.y = GROUND - 230 + Math.sin(S.t * 2.2) * 18;
    bs.mouth = Math.max(0, bs.mouth - dt);
    bs.timer -= dt;
    const total = L.monologue.length;
    if (bs.spawned < total && bs.timer <= 0) {
      const w = L.monologue[bs.spawned++];
      const spr = CH.word(w[0], w[1]);
      const high = w[2] === 'alta';
      bs.words.push({ txt: w[0], spr, x: bs.x + 20, y: bs.y + 60, vy: 0, w: spr.bw, h: spr.bh, high, vx: -(110 + bs.spawned * 3), hit: false });
      bs.mouth = 0.35; Sfx.play('word');
      bs.timer = Math.max(1.2, 1.8 - bs.spawned * 0.04);
    }
    for (const w of bs.words) {
      w.x += w.vx * dt;
      if (w.high) { const ty = GROUND - 118 + Math.sin(S.t * 5 + w.x * 0.01) * 6; w.y += (ty - w.y) * Math.min(1, dt * 5); }
      else { w.vy += GRAV * dt; w.y = Math.min(GROUND, w.y + w.vy * dt); }
      // hitbox algo más pequeña que la mancha: el pincel perdona
      if (!w.hit && overlap(pb, w.x - w.w / 2 + 14, w.y - w.h + 10, w.x + w.w / 2 - 14, w.y - 2)) { w.hit = true; damage('word:' + w.txt + (w.high ? '(alta)' : '')); }
    }
    bs.words = bs.words.filter(w => w.x > player.x - 600);
    if (bs.spawned >= total && bs.words.every(w => w.x < player.x - 80)) {
      bs.dead = true; bs.vy = -200; bs.t = 0; run.done = true;
      Sfx.play('win'); toast('(se ha quedado sin texto)');
      S.endTimer = 2.4;
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 360, vy: -Math.random() * 360 - 60, life: 0.5 + Math.random() * 0.4, color, size: 3 + Math.random() * 5 });
  }
  function confetti(n) {
    const cols = [CH.C.red, CH.C.gold, '#3f7fb8', '#5d8a4a', '#f4efe3'];
    for (let i = 0; i < n; i++) particles.push({ x: cam.x + Math.random() * view.w, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 120, life: 4 + Math.random() * 3, color: cols[i % cols.length], size: 5 + Math.random() * 6, spin: Math.random() * 6, screen: true });
  }
  let toasts = [];
  function toast(txt) { toasts.push({ txt, t: 0 }); }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.screen) p.vy += 900 * dt; else p.vx += Math.sin(S.t * 3 + p.spin) * 30 * dt;
    }
    particles = particles.filter(p => p.life > 0 && p.y < VH + 40);
    for (const t of toasts) t.t += dt;
    toasts = toasts.filter(t => t.t < 2.2);
  }

  // ---------------- bucle ----------------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    S.t += dt; S.modeT += dt;
    update(dt); draw();
    input.pressed = false; input.tap = false;
    requestAnimationFrame(frame);
  }

  function update(dt) {
    switch (S.mode) {
      case 'title':
        if (input.tap && S.modeT > 0.4) { Sfx.play('start'); newRun(); setMode('intro'); }
        break;
      case 'intro':
        if (S.modeT > 2.2 || (input.tap && S.modeT > 0.6)) setMode('play');
        break;
      case 'play':
        run.t += dt;
        updatePlayer(dt); updateEntities(dt); updateParticles(dt);
        cam.x = player.x - view.w * 0.3;
        if (S.shake > 0) S.shake -= dt; if (S.flash > 0) S.flash -= dt;
        if (player.dead && player.y > VH + 200) setMode('gameover');
        if (run.done) { S.endTimer -= dt; if (S.endTimer <= 0) { finishLevel(); } }
        break;
      case 'gameover':
        updateParticles(dt);
        if (input.tap && S.modeT > 0.8) { Sfx.play('start'); newRun(); setMode('intro'); }
        break;
      case 'ascenso':
        updateParticles(dt);
        if (particles.length < 80 && S.modeT < 4) confetti(6);
        if (input.tap && S.modeT > 1.2) setMode('fin');
        break;
      case 'fin':
        updateParticles(dt);
        if (input.tap && S.modeT > 0.6) { newRun(); setMode('title'); }
        break;
    }
  }
  function finishLevel() {
    save.cleared = true;
    save.claquetas = save.claquetas.map((v, i) => v || run.claquetas[i]);
    save.best = Math.max(save.best || 0, run.claquetas.filter(Boolean).length);
    saveGame(save);
    setMode('ascenso'); confetti(60); Sfx.play('win');
  }

  // ---------------- dibujo ----------------
  function draw() {
    const s = view.scale * view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#15110f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, view.ox * view.dpr, view.oy * view.dpr);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, view.w, VH); ctx.clip();
    // papel
    ctx.drawImage(paper, 0, 0, view.w, VH);
    if (S.mode === 'title') drawTitle();
    else if (S.mode === 'fin') drawFin();
    else { drawWorld(); if (S.mode === 'intro') drawIntro(); if (S.mode === 'gameover') drawGameOver(); if (S.mode === 'ascenso') drawAscenso(); }
    // grano
    ctx.save(); ctx.globalAlpha = 0.16; ctx.globalCompositeOperation = 'multiply';
    for (let y = 0; y < VH; y += 256) for (let x = 0; x < view.w; x += 256) ctx.drawImage(grainTex, x, y);
    ctx.restore();
    ctx.restore();
  }

  const boil = () => Math.floor(S.t * 7);

  function drawWorld() {
    const SP = CH.SPR;
    let shx = 0, shy = 0;
    if (S.shake > 0) { shx = (Math.random() - 0.5) * 10 * S.shake; shy = (Math.random() - 0.5) * 10 * S.shake; }
    ctx.save(); ctx.translate(shx, shy);
    // --- fondo lejano: telón ---
    const cw = SP.curtain.w;
    let off = -((cam.x * 0.25) % cw);
    for (let x = off - cw; x < view.w + cw; x += cw) B.drawSprite(ctx, SP.curtain, x, 40);
    // pared bajo el telón
    ctx.fillStyle = 'rgba(214,198,170,0.55)'; ctx.fillRect(0, 340, view.w, GROUND - 340);
    // --- capa media: ventanas, pósters, focos ---
    for (const d of L.decor) {
      const sx = d.x - cam.x;
      if (sx < -200 || sx > view.w + 200) continue;
      if (d.type === 'window') B.drawSprite(ctx, SP.window, sx, d.y, d.i || 0);
      if (d.type === 'poster') B.drawSprite(ctx, SP.poster[d.i % SP.poster.length], sx, d.y);
      if (d.type === 'spotlight') B.drawSprite(ctx, SP.spotlight, sx, d.y, boil());
    }
    // --- suelo ---
    const fw = SP.floor.w;
    ctx.save(); ctx.fillStyle = '#1f1612'; ctx.fillRect(0, GROUND + 6, view.w, VH - GROUND);
    ctx.restore();
    for (const f of L.floors) {
      const x0 = f.x - cam.x, x1 = x0 + f.w;
      if (x1 < 0 || x0 > view.w) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(Math.max(-2, x0 - 2), GROUND - 4, Math.min(view.w + 2, x1 + 2) - Math.max(-2, x0 - 2), VH - GROUND + 4); ctx.clip();
      const start = Math.floor(Math.max(0, -x0) / fw) * fw;
      for (let x = x0 + start; x < Math.min(view.w, x1) + fw; x += fw) B.drawSprite(ctx, SP.floor, x, GROUND);
      ctx.restore();
      // bordes del hueco (pinceladas oscuras)
      ctx.fillStyle = 'rgba(26,23,21,0.7)';
      if (x0 > -20) ctx.fillRect(x0 - 6, GROUND - 2, 6, VH - GROUND);
      if (x1 < view.w + 20) ctx.fillRect(x1, GROUND - 2, 6, VH - GROUND);
    }
    // --- plataformas ---
    for (const p of plats) {
      const sx = p.x - cam.x; if (sx + p.w < -20 || sx > view.w + 20) continue;
      if (p.kind === 'mat') B.drawSprite(ctx, CH.mat(p.w), sx, p.y + (p.dy || 0), boil());
      else if (p.kind === 'syllable') B.drawSprite(ctx, CH.syllable(p.text, p.w), sx, p.y + (p.dy || 0) + 4, boil());
      else if (p.kind === 'chair') {
        // silla flotando en las lágrimas (el asiento es la plataforma)
        const bobY = water.level > 10 ? Math.sin(S.t * 2 + p.x) * 3 : 0; p.dy = bobY;
        B.drawSprite(ctx, SP.chair, sx + 24, p.y + bobY + 44, boil());
      }
    }
    // --- entidades ---
    for (const e of ents) {
      const sx = e.x - cam.x; if (sx < -300 || sx > view.w + 300) continue;
      const v = boil();
      switch (e.type) {
        case 'sign': B.drawSprite(ctx, CH.sign(e.lines), sx - 115, e.y, v); break;
        case 'coffee': if (!e.used) B.drawSprite(ctx, SP.coffee, sx, e.y + Math.sin(S.t * 3 + e.x) * 3, v); break;
        case 'claqueta': if (!e.used) { B.drawSprite(ctx, SP.claqueta, sx, e.y + (e.dy || 0), v, false, 1 + Math.sin(S.t * 4) * 0.04); } break;
        case 'trust': B.drawSprite(ctx, SP.classmate[e.i % SP.classmate.length], sx, GROUND, e.state === 'stand' ? v : v + 1, false, 1, e.angle); break;
        case 'crier': {
          const spr = e.triggered ? SP.crier[e.i % SP.crier.length] : SP.classmate[(e.i + 2) % SP.classmate.length];
          B.drawSprite(ctx, spr, sx, GROUND, v); break;
        }
        case 'knight': {
          const spr = e.state === 'tremble' ? SP.knight.tremble : (e.state === 'scream' ? SP.knight.scream : SP.knight.idle);
          B.drawSprite(ctx, spr, sx, GROUND, e.state === 'tremble' ? Math.floor(S.t * 24) : v);
          if (e.state === 'scream') B.drawSprite(ctx, SP.wave, e.waveX - cam.x, GROUND, Math.floor(S.t * 12));
          break;
        }
        case 'napoleon': B.drawSprite(ctx, SP.napoleon, sx, GROUND, v); drawBubble(e.bubble, sx + 10, GROUND - 118, true); break;
        case 'floatchair': if (water.level > 5) B.drawSprite(ctx, SP.chair, sx, GROUND - water.level + 30 + Math.sin(S.t * 2.3 + e.x) * 4, v, false, 0.9, Math.sin(S.t * 1.7 + e.x) * 0.25); break;
        case 'teacher': B.drawSprite(ctx, SP.teacher, sx, GROUND, v); if (e.triggered && e.t < 3) drawBubble(e.bubble, sx + 20, GROUND - 130, false, 1 + Math.min(0.6, e.t)); break;
        case 'teacherVoice': B.drawSprite(ctx, SP.teacherVoice, sx, GROUND, v); if (e.triggered) drawBubble(e.bubble, sx + 20, GROUND - 130); break;
        case 'boss': drawBoss(e); break;
      }
    }
    // --- lágrimas ---
    if (water.zone && water.level > 1) {
      const z = water.zone, x0 = Math.max(0, z.x - cam.x), x1 = Math.min(view.w, z.x + z.w - cam.x);
      if (x1 > x0) {
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = CH.C.tear; ctx.beginPath();
        ctx.moveTo(x0, GROUND + 8);
        for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, GROUND - water.level + Math.sin(x * 0.05 + S.t * 4) * 4);
        ctx.lineTo(x1, GROUND + 8); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = x0; x <= x1; x += 16) { const y = GROUND - water.level + Math.sin(x * 0.05 + S.t * 4) * 4 - 2; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore();
      }
    }
    // --- jugador ---
    drawPlayer();
    // --- partículas ---
    for (const p of particles) {
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
      const px = p.screen ? p.x - cam.x : p.x - cam.x;
      ctx.translate(px, p.y); if (p.spin) ctx.rotate(S.t * 4 + p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7); ctx.restore();
    }
    ctx.restore();
    if (S.flash > 0) { ctx.fillStyle = `rgba(179,32,42,${S.flash * 0.8})`; ctx.fillRect(0, 0, view.w, VH); }
    drawHUD();
  }

  function drawBubble(txt, x, y, always, scale = 1) {
    const spr = CH.bubble(txt);
    B.drawSprite(ctx, spr, x - spr.bw / 2, y - spr.bh - 12, boil(), false, scale);
  }

  function drawPlayer() {
    const SP = CH.SPR, sx = player.x - cam.x;
    if (player.inv > 0 && !player.dead && Math.floor(S.t * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    let spr;
    if (player.dead || player.hitT > 0) spr = SP.enrikeHit;
    else if (!player.onGround) spr = player.vy < 0 ? SP.enrikeJump : SP.enrikeFall;
    else spr = SP.enrikeRun[Math.floor(player.phase * 8) % 8];
    // sombra
    ctx.save(); ctx.globalAlpha *= 0.25; ctx.fillStyle = '#1a1715'; ctx.beginPath();
    ctx.ellipse(sx, GROUND + 4, 26 * Math.max(0.4, 1 - (GROUND - player.y) / 400), 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    B.drawSprite(ctx, spr, sx, player.y, boil(), false, 1, player.dead ? (player.deadT || 0) * 2 : 0);
    ctx.globalAlpha = 1;
  }

  function drawBoss(bs) {
    if (!bs.active) return;
    const SP = CH.SPR, sx = bs.x - cam.x;
    for (const w of bs.words) {
      const wx = w.x - cam.x;
      B.drawSprite(ctx, w.spr, wx - w.w / 2, w.y - w.h, boil(), false, 1, 0);
    }
    const spr = bs.dead ? SP.skull.sad : (bs.mouth > 0 ? SP.skull.open : SP.skull.closed);
    // sombra ligera
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#1a1715'; ctx.beginPath(); ctx.ellipse(sx, GROUND + 4, 40, 8, 0, 0, 7); ctx.fill(); ctx.restore();
    B.drawSprite(ctx, spr, sx, bs.y, boil(), false, 1, bs.dead ? Math.min(0.5, bs.t * 0.3) : Math.sin(S.t * 1.5) * 0.08);
    if (bs.dead) drawBubble('(se ha quedado sin texto)', sx - 40, bs.y - 70);
    else {
      // contador del monólogo
      const total = L.monologue.length, left = total - bs.spawned;
      B.text(ctx, `MONÓLOGO: ${left} palabras`, view.w / 2, 46, { size: 24, font: B.FONT_MARKER, color: CH.C.red, wobble: 0.6, layers: 2 });
    }
  }

  function drawHUD() {
    const SP = CH.SPR;
    // panel de papel detrás del HUD (pre-pintado)
    if (!SP.hudPanel) SP.hudPanel = B.makeSprite(230, 80, 0, 0, (g, r) => { B.blob(g, 110, 40, 118, 42, { color: '#f7f1e3', rng: r, texture: false, noise: 0.08, n: 18, alpha: 0.85 }); }, { seed: 1500, variants: 2 });
    B.drawSprite(ctx, SP.hudPanel, -12, -6, boil());
    B.drawSprite(ctx, SP.hudPanel, view.w - 190, -14, boil(), false, 0.8);
    // Ilusión
    B.text(ctx, 'Ilusión', 24, 24, { size: 22, align: 'left', color: CH.C.ink, wobble: 0.5, layers: 2, weight: 'bold' });
    for (let i = 0; i < Math.max(player.hearts, START_HEARTS); i++) {
      const full = i < player.hearts;
      const pulse = full && player.hitT > 0 ? 1 + Math.sin(S.t * 30) * 0.1 : 1;
      B.drawSprite(ctx, full ? SP.heartFull : SP.heartEmpty, 36 + i * 36, 56, boil(), false, 0.85 * pulse);
    }
    // claquetas
    for (let i = 0; i < 3; i++) {
      ctx.save(); if (!run.claquetas[i]) ctx.globalAlpha = 0.25;
      B.drawSprite(ctx, SP.claqueta, view.w - 36 - i * 44, 46, boil(), false, 0.7); ctx.restore();
    }
    // tutorial contextual
    if (S.mode === 'play' && run.t < 6 && player.x < 1400) {
      const a = Math.min(1, run.t) * (run.t > 5 ? 6 - run.t : 1);
      ctx.save(); ctx.globalAlpha = a;
      B.text(ctx, 'Enrike corre solo. Tú solo saltas.', view.w / 2, VH - 44, { size: 26, color: CH.C.ink, wobble: 0.5, layers: 2 });
      ctx.restore();
    }
    // toasts
    toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 4) * Math.min(1, (2.2 - t.t) * 2);
      ctx.save(); ctx.globalAlpha = a;
      B.text(ctx, t.txt, view.w / 2, 110 + i * 34 - t.t * 10, { size: 30, font: B.FONT_MARKER, color: CH.C.gold, shadow: CH.C.ink, wobble: 0.6, layers: 2 });
      ctx.restore();
    });
  }

  // ---------------- pantallas ----------------
  function card(alpha = 0.9) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(paper, 0, 0, view.w, VH); ctx.restore();
  }
  function drawTitle() {
    const SP = CH.SPR, cx = view.w / 2;
    // telón detrás
    const cw = SP.curtain.w; for (let x = -((S.t * 8) % cw) - cw; x < view.w + cw; x += cw) B.drawSprite(ctx, SP.curtain, x, 0, 0, false, 1);
    ctx.fillStyle = 'rgba(241,233,216,0.9)'; ctx.fillRect(0, 175, view.w, VH - 175);
    B.drawSprite(ctx, SP.floor, 0, 460); for (let x = 400; x < view.w; x += 400) B.drawSprite(ctx, SP.floor, x, 460);
    // cartel de papel con el título
    if (!SP.titleCard) SP.titleCard = B.makeSprite(620, 170, 310, 85, (g, r) => { B.blob(g, 0, 0, 300, 76, { color: '#f7f1e3', rng: r, spacing: 16, light: 0.3, dark: -0.04, noise: 0.1, n: 20, outline: '#9c917a', outlineW: 3 }); }, { seed: 1600, variants: 2 });
    B.drawSprite(ctx, SP.titleCard, cx, 100, boil(), false, 1, -0.02);
    B.text(ctx, '¡ACCIÓN!', cx, 98, { size: 112, font: B.FONT_MARKER, color: CH.C.red, shadow: CH.C.ink, wobble: 1.2, layers: 3 });
    B.text(ctx, 'un plataformas sobre sobrevivir al cine', cx, 208, { size: 26, color: CH.C.ink, wobble: 0.5, layers: 2 });
    B.text(ctx, 'Mundo 1 · La Escuela de Interpretación', cx, 250, { size: 32, font: B.FONT_MARKER, color: CH.C.gold, shadow: CH.C.ink, wobble: 0.6, layers: 2 });
    const blink = (Math.sin(S.t * 3) + 1) / 2;
    ctx.save(); ctx.globalAlpha = 0.5 + blink * 0.5;
    B.text(ctx, 'TOCA o pulsa ESPACIO para empezar', cx, 318, { size: 30, color: CH.C.ink, wobble: 0.5, layers: 2, weight: 'bold' });
    ctx.restore();
    B.text(ctx, 'un botón: saltar · mantén pulsado para saltar más alto', cx, 356, { size: 20, color: '#5a4d3c', wobble: 0.4, layers: 1 });
    // Enrike y el reparto, a los lados
    B.drawSprite(ctx, SP.enrikeIdle, cx - 330, 460, boil(), false, 1.3);
    B.drawSprite(ctx, SP.knight.idle, cx + 330, 460, boil(), false, 1.05);
    B.drawSprite(ctx, SP.skull.closed, cx, 430 + Math.sin(S.t * 2) * 6, boil(), false, 0.5, Math.sin(S.t) * 0.1);
    const got = save.claquetas.filter(Boolean).length;
    if (save.cleared) B.text(ctx, `Mundo superado · claquetas doradas: ${got}/3`, cx, 512, { size: 20, color: CH.C.gold, shadow: CH.C.ink, wobble: 0.4, layers: 2 });
    B.text(ctx, 'un juego de Enrike', view.w - 20, VH - 14, { size: 18, align: 'right', color: '#5a4d3c', wobble: 0.3, layers: 1 });
  }
  function drawIntro() {
    const a = Math.min(1, S.modeT * 3) * (S.modeT > 1.7 ? Math.max(0, (2.2 - S.modeT) * 2) : 1);
    ctx.save(); ctx.globalAlpha = a; card(0.75);
    B.text(ctx, 'MUNDO 1', view.w / 2, 190, { size: 40, font: B.FONT_MARKER, color: CH.C.gold, shadow: CH.C.ink, wobble: 0.6, layers: 2 });
    B.text(ctx, 'La Escuela de Interpretación', view.w / 2, 260, { size: 62, font: B.FONT_MARKER, color: CH.C.red, shadow: CH.C.ink, wobble: 1, layers: 3 });
    B.text(ctx, 'Tarjeta de artista: ESTUDIANTE', view.w / 2, 330, { size: 28, color: CH.C.ink, wobble: 0.5, layers: 2 });
    ctx.restore();
  }
  function drawGameOver() {
    const a = Math.min(1, S.modeT * 2);
    ctx.save(); ctx.globalAlpha = a; card(0.85);
    B.text(ctx, 'Has perdido la ilusión.', view.w / 2, 200, { size: 60, font: B.FONT_MARKER, color: CH.C.red, shadow: CH.C.ink, wobble: 1, layers: 3 });
    B.text(ctx, '¿Lo intentas otra vez? (Como siempre.)', view.w / 2, 270, { size: 34, color: CH.C.ink, wobble: 0.5, layers: 2 });
    B.drawSprite(ctx, CH.SPR.enrikeHit, view.w / 2, 440, boil(), false, 1, 0);
    if (S.modeT > 0.8) {
      ctx.globalAlpha = a * (0.5 + 0.5 * (Math.sin(S.t * 3) + 1) / 2);
      B.text(ctx, 'TOCA para volver a intentarlo', view.w / 2, 500, { size: 26, color: CH.C.ink, wobble: 0.5, layers: 2, weight: 'bold' });
    }
    ctx.restore();
  }
  function drawAscenso() {
    const a = Math.min(1, S.modeT * 2);
    ctx.save(); ctx.globalAlpha = a; card(0.86);
    const cx = view.w / 2;
    B.text(ctx, '¡CONTRATADO!', cx, 110, { size: 84, font: B.FONT_MARKER, color: CH.C.red, shadow: CH.C.ink, wobble: 1.2, layers: 3 });
    // tarjeta de artista
    ctx.save(); ctx.translate(cx, 300); ctx.rotate(-0.03);
    if (!CH.SPR.card) CH.SPR.card = B.makeSprite(560, 220, 280, 110, (g, r) => B.rect(g, -270, -100, 540, 200, { color: '#fffaf0', spacing: 14, light: 0.3, dark: -0.04, outline: '#9c917a', outlineW: 3, rng: r }), { seed: 1700, variants: 2 });
    B.drawSprite(ctx, CH.SPR.card, 0, 0, boil());
    B.text(ctx, 'TARJETA DE ARTISTA', 0, -66, { size: 22, color: '#5a4d3c', wobble: 0.4, layers: 2 });
    B.text(ctx, 'Estudiante  →  ACTOR EN FORMACIÓN', 0, -24, { size: 27, font: B.FONT_MARKER, color: CH.C.gold, shadow: CH.C.ink, wobble: 0.6, layers: 2 });
    B.text(ctx, '"Enhorabuena: ya puedes decir que estás en proceso."', 0, 24, { size: 23, color: CH.C.ink, wobble: 0.4, layers: 2 });
    const got = run.claquetas.filter(Boolean).length;
    B.text(ctx, `Claquetas doradas: ${got}/3`, 0, 66, { size: 26, color: got === 3 ? CH.C.gold : CH.C.ink, shadow: got === 3 ? CH.C.ink : null, wobble: 0.4, layers: 2 });
    ctx.restore();
    B.drawSprite(ctx, CH.SPR.enrikeCelebrate, Math.max(70, cx - 330), 470 + Math.sin(S.t * 6) * 6, boil(), false, 1.1);
    if (S.modeT > 1.2) {
      ctx.globalAlpha = a * (0.5 + 0.5 * (Math.sin(S.t * 3) + 1) / 2);
      B.text(ctx, 'TOCA para continuar', cx, 480, { size: 26, color: CH.C.ink, wobble: 0.5, layers: 2, weight: 'bold' });
    }
    ctx.restore();
    // confeti por encima de la tarjeta
    for (const p of particles) {
      if (!p.screen) continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.color;
      ctx.translate(p.x - cam.x, p.y); ctx.rotate(S.t * 4 + p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7); ctx.restore();
    }
  }
  function drawFin() {
    const cx = view.w / 2;
    B.text(ctx, 'MUNDO 2 · Los Castings', cx, 150, { size: 54, font: B.FONT_MARKER, color: CH.C.red, shadow: CH.C.ink, wobble: 1, layers: 3 });
    B.text(ctx, 'próximamente', cx, 210, { size: 34, color: CH.C.ink, wobble: 0.5, layers: 2 });
    B.text(ctx, '"Ya te llamamos."', cx, 270, { size: 30, color: '#5a4d3c', wobble: 0.5, layers: 2 });
    B.drawSprite(ctx, CH.SPR.enrikeIdle, cx, 450, boil(), false, 1.2);
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * (Math.sin(S.t * 3) + 1) / 2;
    B.text(ctx, 'TOCA para volver al principio', cx, 505, { size: 24, color: CH.C.ink, wobble: 0.5, layers: 2, weight: 'bold' });
    ctx.restore();
  }

  // API de depuración (consola): ACCION.teleport(x), ACCION.ghost = true, ACCION.player
  window.ACCION = {
    get player() { return player; }, get state() { return S; }, get level() { return L; }, get boss() { return boss; },
    ghost: false,
    teleport(x) { if (S.mode !== 'play') { newRun(); setMode('play'); } player.x = x; player.y = GROUND; player.vy = 0; cam.x = player.x - view.w * 0.3; },
    start() { if (S.mode === 'title') { newRun(); setMode('play'); } },
    jump(holdMs = 0) { press(); if (holdMs > 0) setTimeout(release, holdMs); else setTimeout(release, 30); },
    // bot de pruebas: decide cuándo saltar leyendo el mundo (ACCION.autoplay(90))
    bot() {
      let holdLeft = 0;
      const jump = (hold) => { holdLeft = hold; return 'hold'; };
      return (t, p) => {
        if (holdLeft > 0) { holdLeft -= 1 / 60; return 'hold'; }
        if (!p.onGround) return 'release';
        const ahead = (x0, x1) => x0 - p.x > 0 && x0 - p.x < x1;
        // hueco en el suelo o borde de plataforma
        let onFloor = null;
        for (const f of L.floors) if (p.x >= f.x && p.x <= f.x + f.w) onFloor = f;
        if (p.y >= GROUND - 1 && onFloor && ahead(onFloor.x + onFloor.w, 46)) {
          let gapW = Infinity; for (const f of L.floors) if (f.x > onFloor.x) { gapW = f.x - (onFloor.x + onFloor.w); break; }
          for (const q of plats) if (q.x > onFloor.x + onFloor.w - 10 && q.x - (onFloor.x + onFloor.w) < gapW) gapW = q.x - (onFloor.x + onFloor.w);
          return jump(gapW > 200 ? 0.3 : 0.05);
        }
        if (p.y < GROUND - 1) for (const q of plats) { if (p.x >= q.x - 10 && p.x <= q.x + q.w + 10 && Math.abs(p.y - (q.y + (q.dy || 0))) < 2 && ahead(q.x + q.w, 40)) return jump(q.kind === 'syllable' ? 0.05 : 0.2); }
        // obstáculos
        for (const e of ents) {
          if (e.type === 'knight' && e.state === 'scream' && e.waveX - p.x > 0 && e.waveX - p.x < 150) return jump(0.05);
          if (e.type === 'trust' && (e.state === 'fall' || e.state === 'down') && ahead(e.x - 100, 110)) return jump(0.08);
          if (e.type === 'napoleon' && ahead(e.x - 16, 120)) return jump(0.1);
        }
        // lágrimas: desde el suelo seco, saltar a la primera colchoneta
        if (water.zone && water.level > 20 && p.y >= GROUND - 1 && p.x > water.zone.x - 200 && p.x < water.zone.x + water.zone.w) {
          for (const q of plats) if (q.float && ahead(q.x, 120) && q.x - p.x > 40) return jump(0.05);
        }
        // palabras del jefe: las bajas se saltan, las altas se pasan por debajo
        if (boss && boss.active) for (const w of boss.words) {
          const d = w.x - w.w / 2 - p.x;
          if (!w.high && w.y >= GROUND - 1 && d > 70 && d < 115) return jump(0.15);
        }
        return 'release';
      };
    },
    autoplay(seconds) { return this.step(seconds, this.bot()); },
    // avanza la simulación de forma determinista (pruebas): fn(t) puede devolver 'press'|'hold'|'release'
    step(seconds, fn, dt = 1 / 60) {
      let t = 0;
      while (t < seconds) {
        const a = fn ? fn(t, player, ents, boss) : null;
        if (a === 'press' || a === 'hold') { if (!input.held) input.pressed = true; input.held = true; }
        else if (a === 'release') input.held = false;
        S.t += dt; S.modeT += dt; update(dt); input.pressed = false; input.tap = false; t += dt;
      }
      draw();
      return { x: player.x, y: player.y, hearts: player.hearts, mode: S.mode };
    }
  };

  boot();
})();

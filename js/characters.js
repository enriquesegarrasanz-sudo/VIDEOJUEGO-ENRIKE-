// characters.js — reparto del Mundo 1 pintado a pinceladas
// Todas las figuras se pintan con el origen en los pies (0,0) y la cabeza
// hacia -y, mirando a la derecha. Se pre-pintan en sprites con 3 variantes
// para que "hiervan" como animación hecha a mano.
'use strict';

const Chars = (() => {
  const B = Brush;
  const C = {
    skin: '#dcab8c', skinDark: '#b57d5c', hair: '#241b17', hairLight: '#4d3b31',
    shirt: '#f4efe3', shirtShade: '#cfc6b2', denim: '#36568c', denimLight: '#7392c4', denimDark: '#213a60',
    belt: '#6a4120', buckle: '#d9a441', boot: '#2b211b',
    ink: '#1a1715', red: '#b3202a', gold: '#d9a441', paper: '#f1e9d8', wood: '#8a5a32', woodDark: '#5a3717',
    metal: '#9aa3ad', metalDark: '#5c6670', blue: '#3f7fb8', tear: '#6fb3e0', green: '#5d8a4a', cream: '#efe6cf'
  };
  const SPR = {};

  // ======================= ENRIKE =======================
  // pose: {mode:'run'|'jump'|'fall'|'idle'|'celebrate'|'hit', phase, face}
  function drawEnrike(g, r, pose) {
    const mode = pose.mode || 'run', p = pose.phase || 0, face = pose.face || 'normal';
    const s = Math.sin(p * Math.PI * 2);
    const bob = mode === 'run' ? -3 * Math.abs(s) : (mode === 'jump' ? -2 : 0);
    let legs;
    if (mode === 'run') legs = [
      { a: 0.8 * s, k: Math.max(0, 1.1 * Math.sin(p * Math.PI * 2 - 1.2)) },
      { a: -0.8 * s, k: Math.max(0, 1.1 * Math.sin(p * Math.PI * 2 + Math.PI - 1.2)) }];
    else if (mode === 'jump') legs = [{ a: 0.55, k: 1.1 }, { a: -0.4, k: 0.35 }];
    else if (mode === 'fall') legs = [{ a: 0.3, k: 0.6 }, { a: -0.25, k: 0.25 }];
    else if (mode === 'hit') legs = [{ a: 0.45, k: 0.2 }, { a: -0.5, k: 0.1 }];
    else legs = [{ a: 0.1, k: 0 }, { a: -0.1, k: 0 }];
    const hipY = -44 + bob, L1 = 21, L2 = 22;
    const leg = (l, side) => {
      const hx = side * 3, hy = hipY;
      const kx = hx + Math.sin(l.a) * L1, ky = hy + Math.cos(l.a) * L1;
      const a2 = l.a - l.k;
      const ax = kx + Math.sin(a2) * L2, ay = ky + Math.cos(a2) * L2;
      return { hx, hy, kx, ky, ax, ay, a2 };
    };
    const drawLeg = (l, side, back) => {
      const q = leg(l, side), den = back ? B.shade(C.denim, -0.25) : C.denim;
      // muslo
      B.stroke(g, [{ x: q.hx, y: q.hy - 4 }, { x: q.kx, y: q.ky }], { w: 14, color: den, rng: r, taper: false, bristles: 5 });
      // pantalón de campana: polígono que se abre hacia el tobillo
      const nx = Math.cos(q.a2), ny = -Math.sin(q.a2); // perpendicular a la espinilla
      const kw = 6, aw = 13;
      B.fillShape(g, [
        { x: q.kx - nx * kw, y: q.ky - ny * kw }, { x: q.kx + nx * kw, y: q.ky + ny * kw },
        { x: q.ax + nx * aw, y: q.ay + ny * aw + 2 }, { x: q.ax - nx * aw, y: q.ay - ny * aw + 2 }
      ], { color: den, rng: r, spacing: 5, outline: back ? false : C.denimDark, outlineW: 1.6 });
      // lavado claro del vaquero
      B.stroke(g, [{ x: q.hx + 1, y: q.hy + 2 }, { x: q.kx + 1, y: q.ky - 3 }], { w: 5, color: C.denimLight, alpha: 0.35, rng: r, bristles: 2 });
      // bota
      B.blob(g, q.ax + 2, q.ay + 1, 10, 5, { color: C.boot, rng: r, texture: false, noise: 0.2 });
    };
    // brazos
    let armF, armB;
    if (mode === 'run') { armF = { a: -0.9 * s, e: 1.3 }; armB = { a: 0.9 * s, e: 1.3 }; }
    else if (mode === 'jump') { armF = { a: -2.3, e: 0.6 }; armB = { a: 1.1, e: 0.8 }; }
    else if (mode === 'fall') { armF = { a: -1.6, e: 0.9 }; armB = { a: 0.6, e: 0.8 }; }
    else if (mode === 'celebrate') { armF = { a: -2.6, e: -0.4 }; armB = { a: -2.6, e: -0.4 }; }
    else if (mode === 'hit') { armF = { a: 0.9, e: 1.6 }; armB = { a: -0.9, e: 1.6 }; }
    else { armF = { a: 0.15, e: 0.35 }; armB = { a: -0.1, e: 0.3 }; }
    const shoulderY = -78 + bob, U = 19, F = 18;
    const arm = (a, side) => {
      const sx = side * 11, sy = shoulderY;
      const ex = sx + Math.sin(a.a) * U, ey = sy + Math.cos(a.a) * U;
      const a2 = a.a + a.e;
      const hx = ex + Math.sin(a2) * F, hy = ey + Math.cos(a2) * F;
      return { sx, sy, ex, ey, hx, hy };
    };
    const drawArm = (a, side, back) => {
      const q = arm(a, side);
      B.stroke(g, [{ x: q.sx, y: q.sy }, { x: q.ex, y: q.ey }], { w: 12, color: back ? C.shirtShade : C.shirt, rng: r, taper: false, bristles: 4 });
      B.stroke(g, [{ x: q.ex, y: q.ey }, { x: q.hx, y: q.hy }], { w: 8, color: back ? C.skinDark : C.skin, rng: r, taper: false, bristles: 3 });
      B.blob(g, q.hx, q.hy, 5, 4.5, { color: back ? C.skinDark : C.skin, rng: r, texture: false });
      return q;
    };
    // --- orden de pintado ---
    const qb = drawArm(armB, -1, true);
    // maleta llena de sueños (en la mano de atrás, salvo celebrando)
    if (mode !== 'celebrate') {
      const mx = qb.hx, my = qb.hy + 2;
      B.line(g, mx - 4, my - 1, mx + 4, my - 1, { w: 2.5, color: C.woodDark, rng: r });
      B.rect(g, mx - 13, my + 1, 26, 18, { color: '#7a4b2b', rng: r, outline: C.woodDark, spacing: 5 });
      B.line(g, mx - 11, my + 7, mx + 11, my + 7, { w: 1.5, color: C.woodDark, alpha: 0.6, rng: r, bristles: 1 });
      B.blob(g, mx, my + 7, 2.5, 2, { color: C.gold, rng: r, texture: false });
      B.blob(g, mx - 8, my + 13, 3, 2.2, { color: C.red, rng: r, texture: false }); // pegatina
    }
    drawLeg(legs[1], -1, true);
    drawLeg(legs[0], 1, false);
    // cinturón
    B.rect(g, -15, hipY - 3, 30, 6, { color: C.belt, rng: r, texture: false });
    // camisa de lino, suelta
    B.fillShape(g, [
      { x: -18, y: shoulderY - 5 }, { x: 18, y: shoulderY - 5 }, { x: 21, y: shoulderY + 14 },
      { x: 17, y: hipY - 2 }, { x: -17, y: hipY - 2 }, { x: -21, y: shoulderY + 14 }
    ], { color: C.shirt, rng: r, spacing: 7, outline: '#b9b09c', outlineW: 1.8, light: 0.5, dark: -0.1 });
    // pliegues
    B.line(g, -6, shoulderY + 8, -9, hipY - 6, { w: 2, color: C.shirtShade, alpha: 0.6, rng: r, bristles: 1 });
    B.line(g, 9, shoulderY + 12, 11, hipY - 8, { w: 2, color: C.shirtShade, alpha: 0.5, rng: r, bristles: 1 });
    // bolsillo
    B.rect(g, 6, shoulderY + 4, 8, 8, { color: C.shirt, rng: r, texture: false, outline: '#b9b09c', outlineW: 1.2 });
    // hebilla
    B.blob(g, 3, hipY, 4.5, 3.2, { color: C.buckle, rng: r, texture: false, outline: '#8a6520', outlineW: 1 });
    // cuello abierto en V
    B.fillShape(g, [{ x: -7, y: shoulderY - 5 }, { x: 7, y: shoulderY - 5 }, { x: 2, y: shoulderY + 9 }], { color: C.skin, rng: r, texture: false });
    B.line(g, -8, shoulderY - 6, -1, shoulderY + 6, { w: 3, color: C.shirt, rng: r, bristles: 2 });
    B.line(g, 8, shoulderY - 6, 3, shoulderY + 7, { w: 3, color: C.shirt, rng: r, bristles: 2 });
    // cuello
    B.stroke(g, [{ x: 2, y: shoulderY - 2 }, { x: 3, y: shoulderY - 12 }], { w: 10, color: C.skin, rng: r, taper: false, bristles: 3 });
    // cabeza
    const hx = 3, hy = -98 + bob;
    B.blob(g, hx, hy, 13.5, 15.5, { color: C.skin, rng: r, spacing: 6, light: 0.25, dark: -0.08, noise: 0.06 });
    // barba de tres días
    B.blob(g, hx + 2, hy + 8, 11, 8, { color: C.ink, alpha: 0.2, rng: r, texture: false, noise: 0.15 });
    B.dots(g, hx + 2, hy + 8, 10, 7, 26, { color: C.ink, alpha: 0.35, size: 0.9, rng: r });
    // oreja
    B.blob(g, hx - 11, hy + 1, 3, 4, { color: C.skinDark, rng: r, texture: false });
    // pelo rizado, revuelto
    B.blob(g, hx - 7, hy - 6, 10, 12, { color: C.hair, rng: r, texture: false, noise: 0.2 });
    B.blob(g, hx + 1, hy - 13, 16, 9, { color: C.hair, rng: r, texture: false, noise: 0.22 });
    B.blob(g, hx + 9, hy - 9, 8, 6, { color: C.hair, rng: r, texture: false, noise: 0.25 });
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.05 + 0.9 * r()), rad = 14 + r() * 5;
      const cx = hx + 1 + Math.cos(a) * rad, cy = hy - 6 + Math.sin(a) * rad * 0.8;
      B.stroke(g, B.arcPts(cx, cy, 3 + r() * 2.5, r() * 6, r() * 6 + 3.5, 7), { w: 3, color: C.hair, rng: r, bristles: 2 });
    }
    B.stroke(g, B.arcPts(hx - 2, hy - 8, 9, -2.6, -1.2, 6), { w: 2.5, color: C.hairLight, alpha: 0.6, rng: r, bristles: 1 });
    // cejas (fuertes)
    const browUp = face === 'scared' ? -3 : (face === 'hit' ? 1 : 0);
    B.line(g, hx + 5, hy - 5 + browUp, hx + 14, hy - 6 + browUp * 0.5, { w: 3.2, color: C.hair, rng: r, bristles: 2 });
    B.line(g, hx - 4, hy - 5 + browUp, hx + 1, hy - 5.5, { w: 2.6, color: C.hair, rng: r, bristles: 2 });
    // ojos
    if (face === 'hit') {
      B.line(g, hx + 8, hy - 3, hx + 12, hy + 1, { w: 1.8, color: C.ink, rng: r, bristles: 1 });
      B.line(g, hx + 12, hy - 3, hx + 8, hy + 1, { w: 1.8, color: C.ink, rng: r, bristles: 1 });
      B.line(g, hx - 1, hy - 3, hx + 2, hy + 1, { w: 1.5, color: C.ink, rng: r, bristles: 1 });
      B.line(g, hx + 2, hy - 3, hx - 1, hy + 1, { w: 1.5, color: C.ink, rng: r, bristles: 1 });
    } else {
      B.blob(g, hx + 10, hy - 1, 2.4, 2.1, { color: '#3a2a22', rng: r, texture: false });
      B.blob(g, hx + 1, hy - 1, 1.9, 1.8, { color: '#3a2a22', rng: r, texture: false });
      g.save(); g.globalAlpha = 0.8; g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + 11, hy - 2, 0.7, 0, 7); g.fill(); g.restore();
    }
    // nariz
    B.line(g, hx + 13, hy - 1, hx + 15, hy + 5, { w: 2, color: C.skinDark, alpha: 0.7, rng: r, bristles: 1 });
    // boca
    if (face === 'happy') B.stroke(g, B.arcPts(hx + 9, hy + 6, 5, 0.3, 2.6, 6), { w: 2, color: C.ink, alpha: 0.75, rng: r, bristles: 1 });
    else if (face === 'hit' || face === 'scared') B.blob(g, hx + 10, hy + 9, 3, 3.5, { color: C.ink, alpha: 0.8, rng: r, texture: false });
    else B.line(g, hx + 7, hy + 9, hx + 13, hy + 8.5, { w: 2, color: C.ink, alpha: 0.65, rng: r, bristles: 1 });
    drawArm(armF, 1, false);
  }

  // ======================= FIGURA GENÉRICA =======================
  // o: {h, shirt, pants, hair, hairStyle:'short'|'bun'|'bald'|'long', arms:'down'|'crossed'|'up', face:'calm'|'cry'|'shout'|'closed', glasses, hat:'bicorne', skin}
  function drawPerson(g, r, o = {}) {
    const H = o.h || 95, k = H / 95;
    const skin = o.skin || '#e0b79a', shirt = o.shirt || '#8aa36b', pants = o.pants || '#4a4a55', hair = o.hair || '#3b2a22';
    const hipY = -40 * k, shY = -72 * k;
    // piernas
    for (const side of [-1, 1]) {
      B.stroke(g, [{ x: side * 5 * k, y: hipY }, { x: side * 6 * k, y: -4 * k }], { w: 11 * k, color: side < 0 ? B.shade(pants, -0.2) : pants, rng: r, taper: false, bristles: 4 });
      B.blob(g, side * 7 * k, -2 * k, 8 * k, 4 * k, { color: '#2b211b', rng: r, texture: false });
    }
    // torso
    B.fillShape(g, [{ x: -15 * k, y: shY }, { x: 15 * k, y: shY }, { x: 14 * k, y: hipY + 2 }, { x: -14 * k, y: hipY + 2 }], { color: shirt, rng: r, spacing: 6, outline: true, outlineW: 1.5 });
    if (o.coat) { // chaqueta de Napoleón
      B.fillShape(g, [{ x: -16 * k, y: shY }, { x: 16 * k, y: shY }, { x: 15 * k, y: hipY + 6 }, { x: 0, y: hipY - 4 }, { x: -15 * k, y: hipY + 6 }], { color: o.coat, rng: r, spacing: 5, outline: true });
      for (let i = 0; i < 3; i++) B.blob(g, 6 * k, shY + (8 + i * 8) * k, 2, 2, { color: C.gold, rng: r, texture: false });
      B.blob(g, -3 * k, shY + 14 * k, 2.5, 2.5, { color: C.gold, rng: r, texture: false });
    }
    // brazos
    const arms = o.arms || 'down';
    for (const side of [-1, 1]) {
      const sx = side * 13 * k, sy = shY + 3 * k;
      let ex, ey, hx, hy;
      if (arms === 'crossed') { ex = side * 16 * k; ey = shY + 20 * k; hx = -side * 6 * k; hy = shY + 22 * k; }
      else if (arms === 'up') { ex = side * 20 * k; ey = shY - 10 * k; hx = side * 18 * k; hy = shY - 30 * k; }
      else if (arms === 'hidden' && side === 1) { ex = 14 * k; ey = shY + 18 * k; hx = 2 * k; hy = shY + 20 * k; }
      else if (arms === 'point' && side === 1) { ex = 22 * k; ey = shY - 2 * k; hx = 38 * k; hy = shY - 12 * k; }
      else { ex = side * 17 * k; ey = shY + 20 * k; hx = side * 16 * k; hy = shY + 36 * k; }
      B.stroke(g, [{ x: sx, y: sy }, { x: ex, y: ey }, { x: hx, y: hy }], { w: 9 * k, color: o.coat || shirt, rng: r, taper: false, bristles: 3 });
      B.blob(g, hx, hy, 4.5 * k, 4 * k, { color: skin, rng: r, texture: false });
    }
    // cabeza
    const hx = 2 * k, hy = (-72 - 16) * k;
    B.stroke(g, [{ x: 0, y: shY + 2 }, { x: 1, y: shY - 8 * k }], { w: 9 * k, color: skin, rng: r, taper: false, bristles: 2 });
    B.blob(g, hx, hy, 12 * k, 13.5 * k, { color: skin, rng: r, spacing: 6, noise: 0.07 });
    const hs = o.hairStyle || 'short';
    if (hs === 'short') B.blob(g, hx - 1, hy - 9 * k, 13 * k, 7 * k, { color: hair, rng: r, texture: false, noise: 0.2 });
    else if (hs === 'bun') { B.blob(g, hx - 1, hy - 8 * k, 13 * k, 7 * k, { color: hair, rng: r, texture: false }); B.blob(g, hx - 10 * k, hy - 12 * k, 6 * k, 6 * k, { color: hair, rng: r, texture: false }); }
    else if (hs === 'long') { B.blob(g, hx - 1, hy - 9 * k, 13 * k, 7 * k, { color: hair, rng: r, texture: false }); B.blob(g, hx - 10 * k, hy + 2, 5 * k, 16 * k, { color: hair, rng: r, texture: false }); }
    else if (hs === 'curly') { for (let i = 0; i < 7; i++) B.blob(g, hx - 10 * k + i * 3.5 * k, hy - 10 * k - Math.sin(i) * 3, 5 * k, 5 * k, { color: hair, rng: r, texture: false, noise: 0.3 }); }
    if (o.hat === 'bicorne') {
      B.fillShape(g, [{ x: hx - 24 * k, y: hy - 8 * k }, { x: hx - 4 * k, y: hy - 26 * k }, { x: hx + 12 * k, y: hy - 26 * k }, { x: hx + 24 * k, y: hy - 10 * k }, { x: hx + 2, y: hy - 13 * k }], { color: C.ink, rng: r, spacing: 5, texture: false });
      B.blob(g, hx + 7 * k, hy - 16 * k, 3.5, 3.5, { color: C.red, rng: r, texture: false });
      B.blob(g, hx + 7 * k, hy - 16 * k, 1.5, 1.5, { color: '#fff', rng: r, texture: false });
    }
    if (o.hat === 'beret') {
      B.blob(g, hx - 2, hy - 12 * k, 15 * k, 6 * k, { color: o.hatColor || C.ink, rng: r, texture: false, noise: 0.15 });
    }
    // cara
    const face = o.face || 'calm';
    if (face === 'closed' || face === 'cry') {
      B.stroke(g, B.arcPts(hx + 8 * k, hy - 1, 3, 0.2, 2.9, 5), { w: 1.6, color: C.ink, rng: r, bristles: 1 });
      B.stroke(g, B.arcPts(hx - 1 * k, hy - 1, 2.5, 0.2, 2.9, 5), { w: 1.4, color: C.ink, rng: r, bristles: 1 });
    } else {
      B.blob(g, hx + 8 * k, hy - 1, 2, 2, { color: C.ink, rng: r, texture: false });
      B.blob(g, hx - 1 * k, hy - 1, 1.7, 1.7, { color: C.ink, rng: r, texture: false });
    }
    if (o.glasses) {
      B.stroke(g, B.arcPts(hx + 8 * k, hy - 1, 4.5, 0, 6.3, 10), { w: 1.4, color: C.ink, rng: r, bristles: 1, taper: false });
      B.stroke(g, B.arcPts(hx - 1 * k, hy - 1, 4.5, 0, 6.3, 10), { w: 1.4, color: C.ink, rng: r, bristles: 1, taper: false });
    }
    if (face === 'shout') B.blob(g, hx + 6 * k, hy + 7 * k, 4 * k, 5 * k, { color: C.ink, rng: r, texture: false });
    else if (face === 'cry') {
      B.blob(g, hx + 6 * k, hy + 7 * k, 4 * k, 3 * k, { color: C.ink, rng: r, texture: false });
      B.stroke(g, [{ x: hx + 10 * k, y: hy + 2 }, { x: hx + 12 * k, y: hy + 20 * k }], { w: 2.5, color: C.tear, rng: r, bristles: 2 });
      B.stroke(g, [{ x: hx - 2 * k, y: hy + 2 }, { x: hx - 4 * k, y: hy + 18 * k }], { w: 2.5, color: C.tear, rng: r, bristles: 2 });
    } else B.line(g, hx + 3 * k, hy + 7 * k, hx + 9 * k, hy + 7 * k, { w: 1.8, color: C.ink, alpha: 0.7, rng: r, bristles: 1 });
    if (o.beard) B.blob(g, hx + 3 * k, hy + 9 * k, 9 * k, 6 * k, { color: o.beard, rng: r, texture: false, noise: 0.25 });
  }

  // ======================= EL DE LA SILLA =======================
  function drawChair(g, r, o = {}) {
    const col = o.color || C.wood, dark = B.shade(col, -0.4);
    B.line(g, -16, -2, -14, -40, { w: 4, color: col, rng: r, taper: false });
    B.line(g, 14, -2, 12, -40, { w: 4, color: col, rng: r, taper: false });
    B.rect(g, -18, -44, 36, 7, { color: col, rng: r, spacing: 4, outline: dark });
    B.line(g, -16, -44, -18, -88, { w: 4.5, color: col, rng: r, taper: false });
    B.line(g, -8, -44, -9, -86, { w: 3, color: col, rng: r, taper: false, alpha: 0.8 });
    B.rect(g, -20, -92, 14, 8, { color: col, rng: r, texture: false, outline: dark });
    B.line(g, -19, -70, -7, -70, { w: 3, color: dark, rng: r, alpha: 0.6 });
  }
  function drawKnight(g, r, state) {
    // sentado en la silla, armadura gris, penacho rojo
    const tremble = state === 'tremble', scream = state === 'scream';
    const m = C.metal, md = C.metalDark;
    drawChair(g, r);
    const j = () => tremble ? (r() - 0.5) * 4 : 0;
    g.save(); g.translate(j(), j());
    // piernas dobladas hacia delante
    B.stroke(g, [{ x: 0, y: -46 }, { x: 22, y: -44 }, { x: 24, y: -4 }], { w: 13, color: m, rng: r, taper: false, bristles: 4 });
    B.stroke(g, [{ x: -6, y: -46 }, { x: 14, y: -44 }, { x: 15, y: -4 }], { w: 12, color: md, rng: r, taper: false, bristles: 4 });
    B.blob(g, 27, -2, 10, 5, { color: md, rng: r, texture: false });
    B.blob(g, 18, -2, 9, 4.5, { color: md, rng: r, texture: false });
    // coraza
    B.fillShape(g, [{ x: -14, y: -92 }, { x: 16, y: -92 }, { x: 19, y: -70 }, { x: 15, y: -46 }, { x: -11, y: -46 }, { x: -16, y: -70 }], { color: m, rng: r, spacing: 6, outline: md, light: 0.4, dark: -0.3 });
    B.line(g, 0, -88, 2, -50, { w: 2, color: md, alpha: 0.6, rng: r, bristles: 1 });
    B.stroke(g, B.arcPts(2, -74, 9, 3.4, 6.1, 7), { w: 2.5, color: '#dfe5ea', alpha: 0.6, rng: r, bristles: 1 });
    // brazos apoyados en las rodillas
    B.stroke(g, [{ x: 12, y: -84 }, { x: 24, y: -66 }, { x: 22, y: -48 }], { w: 9, color: m, rng: r, taper: false });
    B.blob(g, 22, -46, 5, 4, { color: md, rng: r, texture: false });
    B.stroke(g, [{ x: -10, y: -84 }, { x: -16, y: -66 }, { x: -2, y: -50 }], { w: 8, color: md, rng: r, taper: false });
    // yelmo
    const hy = -108;
    B.blob(g, 2, hy, 14, 15, { color: m, rng: r, spacing: 5, light: 0.45, dark: -0.3, noise: 0.05 });
    if (scream) {
      B.fillShape(g, [{ x: -8, y: hy - 2 }, { x: 16, y: hy - 2 }, { x: 15, y: hy + 10 }, { x: -7, y: hy + 10 }], { color: C.ink, rng: r, texture: false });
      B.blob(g, 6, hy + 5, 4, 4.5, { color: '#f3d7c0', rng: r, texture: false }); // boca abierta dentro
      B.blob(g, 6, hy + 6, 2.2, 2.5, { color: '#5a1a1a', rng: r, texture: false });
    } else {
      B.rect(g, -8, hy - 3, 24, 5, { color: C.ink, rng: r, texture: false }); // visera (rendija)
      for (let i = 0; i < 4; i++) B.line(g, -2 + i * 5, hy + 4, -2 + i * 5, hy + 10, { w: 1.5, color: md, rng: r, bristles: 1, alpha: 0.7 });
    }
    // penacho
    B.stroke(g, [{ x: -2, y: hy - 14 }, { x: -12, y: hy - 26 }, { x: -24, y: hy - 22 }], { w: 7, color: C.red, rng: r, bristles: 4 });
    g.restore();
  }

  // ======================= CALAVERA DE HAMLET =======================
  function drawSkull(g, r, o = {}) {
    const open = o.mouth === 'open', sad = o.sad;
    // gorguera isabelina
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (0.15 + 0.7 * i / 13);
      B.blob(g, Math.cos(a) * 44, 30 + Math.sin(a) * 14, 9, 7, { color: C.cream, rng: r, texture: false, outline: '#bfb39c', outlineW: 1 });
    }
    // cráneo
    B.blob(g, 0, -8, 40, 38, { color: '#f3eddc', rng: r, spacing: 8, light: 0.5, dark: -0.12, noise: 0.05, outline: '#9c917a', outlineW: 2 });
    B.fillShape(g, [{ x: -26, y: 14 }, { x: 26, y: 14 }, { x: 20, y: 40 }, { x: -20, y: 40 }], { color: '#ece4cf', rng: r, spacing: 6, outline: '#9c917a' });
    // cuencas
    B.blob(g, -15, -6, 12, 13, { color: C.ink, rng: r, texture: false, noise: 0.1 });
    B.blob(g, 15, -6, 12, 13, { color: C.ink, rng: r, texture: false, noise: 0.1 });
    if (!sad) { B.blob(g, -13, -4, 3, 3, { color: C.gold, rng: r, texture: false }); B.blob(g, 17, -4, 3, 3, { color: C.gold, rng: r, texture: false }); }
    else { B.line(g, -22, -14, -8, -8, { w: 3, color: '#9c917a', rng: r }); B.line(g, 22, -14, 8, -8, { w: 3, color: '#9c917a', rng: r }); }
    // nariz
    B.fillShape(g, [{ x: 0, y: 6 }, { x: -5, y: 18 }, { x: 5, y: 18 }], { color: C.ink, rng: r, texture: false });
    // dientes
    if (open) {
      B.rect(g, -18, 26, 36, 18, { color: C.ink, rng: r, texture: false });
      for (let i = 0; i < 6; i++) B.rect(g, -16 + i * 5.6, 24, 4.5, 6, { color: '#f3eddc', rng: r, texture: false });
    } else {
      for (let i = 0; i < 7; i++) B.line(g, -18 + i * 6, 26, -18 + i * 6, 38, { w: 1.6, color: '#9c917a', rng: r, bristles: 1 });
      B.line(g, -20, 26, 20, 26, { w: 2, color: '#9c917a', rng: r, bristles: 1 });
    }
    // laurel de "clásico" + pluma
    B.stroke(g, B.arcPts(0, -8, 44, 3.5, 5.0, 8), { w: 6, color: C.green, rng: r, bristles: 3 });
    B.stroke(g, B.arcPts(0, -8, 44, 4.4, 5.9, 8), { w: 6, color: C.green, rng: r, bristles: 3 });
    B.stroke(g, [{ x: 34, y: -36 }, { x: 54, y: -72 }], { w: 7, color: C.cream, rng: r, bristles: 3 });
    B.stroke(g, [{ x: 34, y: -36 }, { x: 54, y: -72 }], { w: 2, color: '#9c917a', rng: r, bristles: 1 });
  }

  // ======================= OBJETOS =======================
  function drawCoffee(g, r) {
    B.rect(g, -11, -22, 22, 22, { color: '#f4efe3', rng: r, spacing: 5, outline: '#9c917a' });
    B.stroke(g, B.arcPts(13, -12, 6, -1.5, 1.5, 7), { w: 3.5, color: '#9c917a', rng: r, taper: false });
    B.blob(g, 0, -20, 10, 3, { color: '#5a3717', rng: r, texture: false });
    B.rect(g, -10, -4, 20, 4, { color: C.red, rng: r, texture: false });
    for (let i = 0; i < 2; i++) B.stroke(g, B.curvePts({ x: -4 + i * 8, y: -26 }, { x: 2 + i * 8, y: -34 }, { x: -4 + i * 8, y: -42 }, 8), { w: 2.5, color: '#9c917a', alpha: 0.6, rng: r, bristles: 1 });
  }
  function drawClaqueta(g, r) {
    B.rect(g, -18, -14, 36, 26, { color: C.gold, rng: r, spacing: 5, outline: '#8a6520', light: 0.5, dark: -0.2 });
    g.save(); g.translate(-18, -14); g.rotate(-0.35);
    B.rect(g, 0, -9, 38, 9, { color: C.gold, rng: r, texture: false, outline: '#8a6520' });
    for (let i = 0; i < 4; i++) B.fillShape(g, [{ x: 2 + i * 9, y: -9 }, { x: 7 + i * 9, y: -9 }, { x: 4 + i * 9, y: 0 }, { x: -1 + i * 9, y: 0 }], { color: '#8a6520', rng: r, texture: false });
    g.restore();
    for (let i = 0; i < 4; i++) B.fillShape(g, [{ x: -16 + i * 9, y: -14 }, { x: -11 + i * 9, y: -14 }, { x: -13 + i * 9, y: -6 }, { x: -18 + i * 9, y: -6 }], { color: '#8a6520', rng: r, texture: false });
    B.line(g, -13, 0, 10, 0, { w: 1.5, color: '#8a6520', alpha: 0.6, rng: r, bristles: 1 });
    B.line(g, -13, 6, 4, 6, { w: 1.5, color: '#8a6520', alpha: 0.6, rng: r, bristles: 1 });
  }
  function drawHeart(g, r, full = true) {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 24 * Math.PI * 2;
      pts.push({ x: 16 * Math.pow(Math.sin(t), 3) * 0.9, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.9 });
    }
    B.fillShape(g, pts, full ? { color: C.red, rng: r, spacing: 5, light: 0.35, dark: -0.2, outline: '#6e1118' } : { color: '#d9cdb8', rng: r, texture: false, alpha: 0.6, outline: '#9c917a' });
  }
  function drawMat(g, r, w) {
    B.rect(g, 0, 0, w, 18, { color: '#3f7fb8', rng: r, spacing: 7, outline: '#234a70', light: 0.35, dark: -0.25 });
    B.line(g, 4, 9, w - 4, 9, { w: 2, color: '#234a70', alpha: 0.4, rng: r, bristles: 1 });
  }
  function drawSyllable(g, r, txt, w) {
    B.blob(g, w / 2, 14, w / 2 + 4, 22, { color: '#fff8e8', rng: r, spacing: 7, light: 0.4, dark: -0.1, noise: 0.15, n: 16, outline: '#b9b09c', outlineW: 2 });
    B.text(g, txt, w / 2, 14, { size: 34, font: B.FONT_MARKER, color: C.red, rng: r, wobble: 2 });
  }
  function drawSign(g, r, lines, w) {
    const h = 26 + lines.length * 26;
    B.line(g, w * 0.3, -40, w * 0.3, 0, { w: 2.5, color: '#6a5a45', rng: r, bristles: 1 });
    B.line(g, w * 0.7, -40, w * 0.7, 0, { w: 2.5, color: '#6a5a45', rng: r, bristles: 1 });
    B.rect(g, 0, 0, w, h, { color: '#f7f1e3', rng: r, spacing: 10, light: 0.3, dark: -0.05, outline: '#9c917a', outlineW: 2.5 });
    B.rect(g, 4, 4, w - 8, h - 8, { color: C.red, rng: r, texture: false, alpha: 0.08 });
    lines.forEach((l, i) => B.text(g, l, w / 2, 20 + i * 26, { size: i === 0 ? 24 : 21, font: i === 0 ? B.FONT_MARKER : B.FONT_HAND, color: i === 0 ? C.red : C.ink, rng: r, weight: i === 0 ? '' : 'bold' }));
  }
  function drawBubble(g, r, txt, w, size = 20) {
    const h = size + 22;
    B.blob(g, w / 2, h / 2, w / 2 + 6, h / 2 + 6, { color: '#fffdf6', rng: r, texture: false, noise: 0.08, n: 18, outline: C.ink, outlineW: 1.8 });
    B.fillShape(g, [{ x: w / 2 - 10, y: h - 2 }, { x: w / 2 + 6, y: h - 2 }, { x: w / 2 - 6, y: h + 14 }], { color: '#fffdf6', rng: r, texture: false, outline: C.ink, outlineW: 1.6 });
    B.text(g, txt, w / 2, h / 2, { size, color: C.ink, rng: r, wobble: 1 });
  }
  function drawWord(g, r, txt, w, h) {
    B.blob(g, w / 2, h / 2, w / 2 + 6, h / 2 + 4, { color: C.ink, rng: r, texture: false, noise: 0.18, n: 14 });
    B.dots(g, w / 2, h / 2, w / 2 + 10, h / 2 + 8, 8, { color: C.ink, alpha: 0.6, size: 2, rng: r });
    B.text(g, txt, w / 2, h / 2 + 1, { size: Math.min(h * 0.62, 34), font: B.FONT_MARKER, color: '#f7f1e3', rng: r, wobble: 1.5, layers: 2 });
  }
  function drawWave(g, r) {
    // onda de grito: tres arcos que se abren hacia la izquierda
    for (let i = 0; i < 3; i++) {
      B.stroke(g, B.arcPts(30 + i * 14, -32, 36 + i * 10, Math.PI * 0.62, Math.PI * 1.38, 10), { w: 7 - i, color: i === 1 ? C.red : C.ink, alpha: 0.85 - i * 0.15, rng: r, bristles: 4 });
    }
    B.text(g, 'AAAH', 26, -36, { size: 16, font: B.FONT_MARKER, color: C.red, rng: r, wobble: 2, layers: 2 });
  }
  function drawCurtainTile(g, r, w, h) {
    // telón rojo del fondo del aula
    B.rect(g, 0, 0, w, h, { color: '#8f1b22', rng: r, texture: false });
    for (let x = 0; x < w; x += 46) {
      const xx = x + (r() - 0.5) * 8;
      B.stroke(g, [{ x: xx, y: -10 }, { x: xx + (r() - 0.5) * 20, y: h / 2 }, { x: xx + (r() - 0.5) * 10, y: h + 10 }], { w: 26, color: r() < 0.5 ? '#b3202a' : '#a01b25', alpha: 0.7, rng: r, bristles: 5, taper: false });
      B.stroke(g, [{ x: xx + 14, y: -10 }, { x: xx + 10 + (r() - 0.5) * 20, y: h + 10 }], { w: 7, color: '#5e0f14', alpha: 0.45, rng: r, bristles: 3, taper: false });
    }
    B.rect(g, 0, 0, w, 26, { color: '#5e0f14', rng: r, texture: false, alpha: 0.9 });
    for (let x = 20; x < w; x += 60) B.blob(g, x, 30, 6, 4, { color: C.gold, rng: r, texture: false, alpha: 0.9 });
  }
  function drawFloorTile(g, r, w, h) {
    B.rect(g, 0, 0, w, h, { color: '#3a2a1e', rng: r, texture: false });
    // tablones de madera
    for (let x = 0; x < w; x += 100) {
      const xx = x + (r() - 0.5) * 10;
      B.rect(g, xx, 0, 104, 22, { color: r() < 0.5 ? '#a4713f' : '#9a6838', rng: r, spacing: 5, light: 0.25, dark: -0.25, angle: 0, outline: '#5a3717', outlineW: 1.4 });
    }
    B.line(g, -5, 0, w + 5, 0, { w: 4, color: '#3a2a1e', alpha: 0.8, rng: r, bristles: 3, taper: false });
    for (let i = 0; i < 6; i++) B.line(g, r() * w, 26 + r() * (h - 30), r() * w, 26 + r() * (h - 30), { w: 3, color: '#2a1d14', alpha: 0.4, rng: r, bristles: 2 });
  }
  function drawWindow(g, r) {
    B.rect(g, 0, 0, 90, 120, { color: '#e9e2cf', rng: r, spacing: 12, light: 0.3, dark: -0.05, outline: '#6a5a45', outlineW: 3 });
    B.line(g, 45, 4, 45, 116, { w: 4, color: '#6a5a45', rng: r, taper: false });
    B.line(g, 4, 60, 86, 60, { w: 4, color: '#6a5a45', rng: r, taper: false });
    B.blob(g, 60, 36, 18, 10, { color: '#fff', alpha: 0.5, rng: r, texture: false, noise: 0.3 });
  }
  function drawPoster(g, r, title) {
    B.rect(g, 0, 0, 70, 90, { color: '#f7f1e3', rng: r, spacing: 10, outline: '#9c917a', outlineW: 2 });
    B.blob(g, 35, 36, 20, 24, { color: C.red, rng: r, texture: false, noise: 0.25 });
    B.text(g, title, 35, 76, { size: 16, font: B.FONT_MARKER, color: C.ink, rng: r });
  }
  function drawSpotlight(g, r) {
    B.line(g, 0, 0, 0, 30, { w: 4, color: C.ink, rng: r, taper: false });
    B.fillShape(g, [{ x: -14, y: 30 }, { x: 14, y: 30 }, { x: 10, y: 58 }, { x: -10, y: 58 }], { color: '#333', rng: r, spacing: 5, outline: true });
    B.blob(g, 0, 58, 9, 3, { color: C.gold, rng: r, texture: false, alpha: 0.9 });
  }
  function drawConfettiCanvas() { /* el confeti se pinta en runtime */ }

  // ======================= CONSTRUCCIÓN DE SPRITES =======================
  function build() {
    const mk = B.makeSprite;
    // Enrike: ciclo de carrera 8 frames
    SPR.enrikeRun = [];
    for (let i = 0; i < 8; i++) SPR.enrikeRun.push(mk(110, 150, 55, 138, (g, r) => drawEnrike(g, r, { mode: 'run', phase: i / 8 }), { seed: 100 + i, variants: 2 }));
    SPR.enrikeJump = mk(110, 150, 55, 138, (g, r) => drawEnrike(g, r, { mode: 'jump', face: 'scared' }), { seed: 120 });
    SPR.enrikeFall = mk(110, 150, 55, 138, (g, r) => drawEnrike(g, r, { mode: 'fall' }), { seed: 121 });
    SPR.enrikeHit = mk(110, 150, 55, 138, (g, r) => drawEnrike(g, r, { mode: 'hit', face: 'hit' }), { seed: 122 });
    SPR.enrikeIdle = mk(110, 150, 55, 138, (g, r) => drawEnrike(g, r, { mode: 'idle' }), { seed: 123 });
    SPR.enrikeCelebrate = mk(130, 160, 65, 148, (g, r) => drawEnrike(g, r, { mode: 'celebrate', face: 'happy' }), { seed: 124 });
    // compañeros
    const shirts = ['#8aa36b', '#c9793a', '#6b6fa8', '#b5584f', '#d2b14c'];
    SPR.classmate = shirts.map((s, i) => mk(80, 110, 40, 104, (g, r) => drawPerson(g, r, { shirt: s, arms: 'crossed', face: 'closed', hairStyle: ['short', 'long', 'curly', 'bun', 'short'][i], hair: ['#3b2a22', '#c88a3e', '#1a1715', '#5a3b2a', '#8a8a8a'][i] }), { seed: 200 + i }));
    SPR.crier = shirts.map((s, i) => mk(80, 110, 40, 104, (g, r) => drawPerson(g, r, { shirt: s, arms: 'down', face: 'cry', hairStyle: ['long', 'short', 'bun', 'curly', 'short'][i], hair: ['#c88a3e', '#3b2a22', '#1a1715', '#5a3b2a', '#8a8a8a'][i] }), { seed: 300 + i }));
    SPR.napoleon = mk(90, 125, 45, 104, (g, r) => drawPerson(g, r, { h: 82, shirt: '#f4efe3', pants: '#f4efe3', coat: '#2f3f7a', arms: 'hidden', hat: 'bicorne', face: 'calm', hairStyle: 'short' }), { seed: 400 });
    SPR.teacher = mk(90, 130, 45, 122, (g, r) => drawPerson(g, r, { h: 112, shirt: '#1a1715', pants: '#2b2b2b', arms: 'point', hairStyle: 'bun', hair: '#9a9a9a', glasses: true, face: 'shout', beard: null }), { seed: 500 });
    SPR.teacherVoice = mk(90, 130, 45, 122, (g, r) => drawPerson(g, r, { h: 108, shirt: '#5c3b6e', pants: '#2b2b2b', arms: 'up', hairStyle: 'long', hair: '#c88a3e', face: 'shout' }), { seed: 501 });
    // caballero y silla
    SPR.knight = { idle: mk(120, 160, 60, 150, (g, r) => drawKnight(g, r, 'idle'), { seed: 600 }), tremble: mk(120, 160, 60, 150, (g, r) => drawKnight(g, r, 'tremble'), { seed: 601, variants: 4 }), scream: mk(120, 160, 60, 150, (g, r) => drawKnight(g, r, 'scream'), { seed: 602 }) };
    SPR.wave = mk(130, 110, 100, 100, (g, r) => drawWave(g, r), { seed: 610, variants: 4 });
    SPR.chair = mk(60, 100, 30, 96, (g, r) => drawChair(g, r, { color: '#9a6838' }), { seed: 620 });
    // calavera
    SPR.skull = { closed: mk(150, 160, 75, 90, (g, r) => drawSkull(g, r, {}), { seed: 700 }), open: mk(150, 160, 75, 90, (g, r) => drawSkull(g, r, { mouth: 'open' }), { seed: 701 }), sad: mk(150, 160, 75, 90, (g, r) => drawSkull(g, r, { sad: true }), { seed: 702 }) };
    // objetos
    SPR.coffee = mk(44, 52, 22, 46, (g, r) => drawCoffee(g, r), { seed: 800 });
    SPR.claqueta = mk(56, 56, 28, 36, (g, r) => drawClaqueta(g, r), { seed: 801 });
    SPR.heartFull = mk(40, 40, 20, 22, (g, r) => drawHeart(g, r, true), { seed: 802 });
    SPR.heartEmpty = mk(40, 40, 20, 22, (g, r) => drawHeart(g, r, false), { seed: 803 });
    SPR.window = mk(96, 126, 3, 3, (g, r) => drawWindow(g, r), { seed: 804, variants: 2 });
    SPR.poster = ['¡ACCIÓN!', 'CHÉJOV', 'NO', 'DIVA'].map((t, i) => mk(76, 96, 3, 3, (g, r) => drawPoster(g, r, t), { seed: 810 + i, variants: 1 }));
    SPR.spotlight = mk(40, 70, 20, 0, (g, r) => drawSpotlight(g, r), { seed: 820, variants: 2 });
    SPR.curtain = mk(600, 300, 0, 0, (g, r) => drawCurtainTile(g, r, 600, 300), { seed: 830, variants: 1, scale: 1 });
    SPR.floor = mk(400, 80, 0, 0, (g, r) => drawFloorTile(g, r, 400, 80), { seed: 831, variants: 1, scale: 1 });
    SPR.mats = {};
    SPR.words = {};
    SPR.bubbles = {};
    SPR.signs = {};
    SPR.syllables = {};
  }
  function mat(w) {
    const key = w | 0;
    if (!SPR.mats[key]) SPR.mats[key] = B.makeSprite(w + 8, 24, 4, 2, (g, r) => drawMat(g, r, w), { seed: 900 + key, variants: 2 });
    return SPR.mats[key];
  }
  function syllable(txt, w) {
    if (!SPR.syllables[txt]) SPR.syllables[txt] = B.makeSprite(w + 16, 56, 8, 8, (g, r) => drawSyllable(g, r, txt, w), { seed: 1000 + txt.length * 7 + txt.charCodeAt(1), variants: 2 });
    return SPR.syllables[txt];
  }
  function word(txt, h) {
    const key = txt + h;
    if (!SPR.words[key]) {
      const c = document.createElement('canvas').getContext('2d');
      const w = Math.max(60, B.measure(c, txt, { size: Math.min(h * 0.62, 34), font: B.FONT_MARKER }) + 26);
      SPR.words[key] = B.makeSprite(w + 24, h + 20, 12, 10, (g, r) => drawWord(g, r, txt, w, h), { seed: 1100 + txt.charCodeAt(0) * 3 + txt.length, variants: 2 });
      SPR.words[key].bw = w; SPR.words[key].bh = h;
    }
    return SPR.words[key];
  }
  function bubble(txt, size = 20) {
    if (!SPR.bubbles[txt]) {
      const c = document.createElement('canvas').getContext('2d');
      const w = B.measure(c, txt, { size }) + 28;
      SPR.bubbles[txt] = B.makeSprite(w + 16, size + 44, 8, 8, (g, r) => drawBubble(g, r, txt, w, size), { seed: 1200 + txt.length, variants: 2 });
      SPR.bubbles[txt].bw = w; SPR.bubbles[txt].bh = size + 22;
    }
    return SPR.bubbles[txt];
  }
  function sign(lines, w = 230) {
    const key = lines.join('|');
    if (!SPR.signs[key]) SPR.signs[key] = B.makeSprite(w + 8, 60 + lines.length * 26, 4, 44, (g, r) => drawSign(g, r, lines, w), { seed: 1300 + key.length, variants: 2 });
    return SPR.signs[key];
  }

  return { C, SPR, build, mat, syllable, word, bubble, sign, drawEnrike, drawPerson };
})();

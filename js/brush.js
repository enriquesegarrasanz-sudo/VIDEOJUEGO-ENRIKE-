// brush.js — motor de pinceladas
// Todo lo que se ve en el juego pasa por aquí: trazos con cerdas, manchas,
// relleno con hachurado y texto "entintado". Los sprites se pre-pintan en
// canvases fuera de pantalla con un RNG con semilla, de modo que cada
// variante "hierve" (boil) ligeramente como una animación pintada a mano.
'use strict';

const Brush = (() => {
  const FONT_HAND = "'Caveat', 'Segoe Print', 'Bradley Hand', cursive";
  const FONT_MARKER = "'Permanent Marker', 'Caveat', 'Segoe Print', cursive";
  const SPRITE_SCALE = 2;

  // ---------- RNG con semilla ----------
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- color ----------
  function parse(c) {
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      const n = parseInt(h, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255, 1];
    }
    const m = c.match(/[\d.]+/g).map(Number);
    return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  }
  function rgba(c, a) {
    const p = parse(c);
    return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a === undefined ? p[3] : a})`;
  }
  // k > 0 aclara hacia blanco, k < 0 oscurece
  function shade(c, k) {
    const p = parse(c);
    const f = v => Math.max(0, Math.min(255, k > 0 ? v + (255 - v) * k : v * (1 + k)));
    return `rgba(${f(p[0]) | 0},${f(p[1]) | 0},${f(p[2]) | 0},${p[3]})`;
  }

  // ---------- geometría ----------
  function resample(pts, step) {
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      segs.push(l); total += l;
    }
    if (total === 0 || pts.length < 2) return [];
    const n = Math.max(2, Math.ceil(total / step));
    const out = []; let si = 0, acc = 0;
    for (let k = 0; k <= n; k++) {
      const d = total * k / n;
      while (si < segs.length - 1 && acc + segs[si] < d) { acc += segs[si]; si++; }
      const u = segs[si] === 0 ? 0 : Math.min(1, (d - acc) / segs[si]);
      const a = pts[si], b = pts[si + 1];
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, t: k / n });
    }
    for (let i = 0; i < out.length; i++) {
      const p0 = out[Math.max(0, i - 1)], p1 = out[Math.min(out.length - 1, i + 1)];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
      out[i].nx = -dy / l; out[i].ny = dx / l;
    }
    return out;
  }
  function arcPts(cx, cy, r, a0, a1, n = 10) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
    return pts;
  }
  function curvePts(p0, c, p1, n = 10) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push({ x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y });
    }
    return pts;
  }
  function rectPts(x, y, w, h) { return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]; }
  function blobPts(cx, cy, rx, ry, r, n = 14, noise = 0.12) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * noise;
      pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
    }
    return pts;
  }
  function bounds(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // ---------- trazo de pincel ----------
  // pts: polilínea. o: {w, color, alpha, bristles, jitter, taper, rng, dry}
  function stroke(ctx, pts, o = {}) {
    const r = o.rng || Math.random;
    const w = o.w || 6, color = o.color || '#1a1715', alpha = o.alpha === undefined ? 0.9 : o.alpha;
    const path = resample(pts, Math.max(2.5, w * 0.7));
    if (path.length < 2) return;
    const n = o.bristles || Math.max(3, Math.min(9, Math.round(w / 2)));
    const jit = o.jitter === undefined ? w * 0.12 : o.jitter;
    const taper = o.taper !== false;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // cuerpo del trazo: polígono con perfil de anchura
    const left = [], right = [];
    for (const p of path) {
      const prof = taper ? (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * p.t), 0.45)) : 1;
      const ww = w * prof * (0.88 + 0.24 * r());
      const j1 = (r() - 0.5) * jit, j2 = (r() - 0.5) * jit;
      left.push({ x: p.x + p.nx * (ww / 2 + j1), y: p.y + p.ny * (ww / 2 + j1) });
      right.push({ x: p.x - p.nx * (ww / 2 + j2), y: p.y - p.ny * (ww / 2 + j2) });
    }
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = color;
    ctx.beginPath();
    left.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath(); ctx.fill();
    // cerdas
    ctx.strokeStyle = color;
    for (let i = 0; i < n; i++) {
      const off = ((i + 0.5) / n - 0.5) * w * 0.9;
      ctx.globalAlpha = alpha * (0.25 + 0.55 * r());
      ctx.lineWidth = Math.max(0.6, w / n * (0.5 + 1.0 * r()));
      ctx.beginPath();
      const skip = o.dry ? r() * 0.35 : 0; // pincel seco: la cerda no llega al final
      for (let k = 0; k < path.length; k++) {
        const p = path[k];
        if (skip && p.t > 1 - skip) break;
        const q = (r() - 0.5) * jit;
        const x = p.x + p.nx * (off + q), y = p.y + p.ny * (off + q);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2, o) { stroke(ctx, [{ x: x1, y: y1 }, { x: x2, y: y2 }], o); }

  // ---------- relleno pintado ----------
  // o: {color, alpha, jitter, texture, angle, spacing, outline, outlineW, rng, light, dark}
  function fillShape(ctx, pts, o = {}) {
    const r = o.rng || Math.random;
    const color = o.color || '#1a1715', jit = o.jitter === undefined ? 1.5 : o.jitter;
    const alpha = o.alpha === undefined ? 0.95 : o.alpha;
    const poly = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(l / 10));
      for (let k = 0; k < n; k++) {
        const u = k / n;
        poly.push({ x: a.x + (b.x - a.x) * u + (r() - 0.5) * jit * 2, y: a.y + (b.y - a.y) * u + (r() - 0.5) * jit * 2 });
      }
    }
    ctx.save();
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath(); ctx.fill();
    if (o.texture !== false) {
      ctx.clip();
      const bb = bounds(poly), ang = o.angle === undefined ? -0.45 : o.angle;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const diag = Math.hypot(bb.w, bb.h) + 6, cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
      const sp = o.spacing || Math.max(5, Math.min(12, diag / 6));
      for (let d = -diag / 2; d < diag / 2; d += sp * (0.7 + 0.6 * r())) {
        const px = cx - sin * d, py = cy + cos * d;
        const half = diag / 2 * (0.5 + 0.6 * r()), shift = (r() - 0.5) * diag * 0.3;
        const p1 = { x: px + cos * (-half + shift), y: py + sin * (-half + shift) };
        const p2 = { x: px + cos * (half + shift), y: py + sin * (half + shift) };
        const light = r() < 0.5;
        stroke(ctx, [p1, p2], {
          w: sp * 0.95, color: shade(color, light ? (o.light || 0.2) : (o.dark || -0.2)),
          alpha: 0.14 + 0.16 * r(), rng: r, bristles: 3, jitter: 1
        });
      }
    }
    ctx.restore();
    if (o.outline) {
      const oc = o.outline === true ? shade(color, -0.55) : o.outline;
      const n = poly.length; let i = Math.floor(r() * n), done = 0;
      while (done < n) {
        const len = Math.max(2, Math.floor(n * (0.12 + 0.3 * r())));
        const seg = [];
        for (let k = 0; k <= len; k++) seg.push(poly[(i + k) % n]);
        if (r() < 0.7) stroke(ctx, seg, { w: o.outlineW || 2.2, color: oc, alpha: 0.55, rng: r, bristles: 2, jitter: 0.8 });
        const gap = Math.floor(n * 0.08 * r());
        i = (i + len + gap) % n; done += len + gap;
      }
    }
  }
  function blob(ctx, cx, cy, rx, ry, o = {}) {
    const r = o.rng || Math.random;
    fillShape(ctx, blobPts(cx, cy, rx, ry, r, o.n || 14, o.noise === undefined ? 0.12 : o.noise), Object.assign({ jitter: 0.8 }, o));
  }
  function rect(ctx, x, y, w, h, o = {}) { fillShape(ctx, rectPts(x, y, w, h), o); }
  function dots(ctx, cx, cy, rx, ry, count, o = {}) {
    const r = o.rng || Math.random;
    ctx.save(); ctx.fillStyle = o.color || '#1a1715';
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      ctx.globalAlpha = (o.alpha === undefined ? 0.5 : o.alpha) * (0.5 + 0.5 * r());
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (o.size || 1.2) * (0.5 + r()), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function splat(ctx, x, y, rad, o = {}) {
    const r = o.rng || Math.random;
    blob(ctx, x, y, rad, rad * 0.8, Object.assign({ noise: 0.35, n: 9, texture: false }, o));
    dots(ctx, x, y, rad * 2.2, rad * 1.6, 6 + (r() * 6 | 0), { color: o.color, alpha: 0.8, size: rad * 0.25, rng: r });
  }

  // ---------- texto entintado ----------
  function text(ctx, str, x, y, o = {}) {
    const r = o.rng || Math.random;
    ctx.save();
    ctx.font = `${o.weight || ''} ${o.size || 24}px ${o.font || FONT_HAND}`.trim();
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
    if (o.shadow) { ctx.globalAlpha = 0.3; ctx.fillStyle = o.shadow; ctx.fillText(str, x + 2, y + 3); }
    const layers = o.layers || 3, wob = o.wobble === undefined ? 1.4 : o.wobble;
    for (let i = 0; i < layers; i++) {
      ctx.globalAlpha = (o.alpha === undefined ? 0.9 : o.alpha) * (0.45 + 0.55 / (i + 1));
      ctx.fillStyle = o.color || '#1a1715';
      ctx.fillText(str, x + (r() - 0.5) * wob, y + (r() - 0.5) * wob);
    }
    ctx.restore();
  }
  function measure(ctx, str, o = {}) {
    ctx.save(); ctx.font = `${o.weight || ''} ${o.size || 24}px ${o.font || FONT_HAND}`.trim();
    const w = ctx.measureText(str).width; ctx.restore(); return w;
  }

  // ---------- papel y grano ----------
  function paper(w, h, seed = 3, base = '#f1e9d8') {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); const r = mulberry(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // manchas suaves de acuarela
    for (let i = 0; i < 18; i++) {
      blob(g, r() * w, r() * h, 80 + r() * 220, 60 + r() * 160, { color: r() < 0.5 ? '#e6dcc3' : '#f7f1e3', alpha: 0.35, texture: false, noise: 0.3, n: 12, rng: r });
    }
    // fibras
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, l = 20 + r() * 60, a = (r() - 0.5) * 0.6;
      line(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, { w: 1, color: '#bfb39c', alpha: 0.18, bristles: 1, rng: r, jitter: 0.3 });
    }
    // grano
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 18;
      d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function grain(w, h, seed = 11) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); const r = mulberry(seed);
    const img = g.createImageData(w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 200 + r() * 55; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------- sprites pre-pintados ----------
  // draw(g, rng) pinta con el origen en el ancla (ax, ay)
  function makeSprite(w, h, ax, ay, draw, opts = {}) {
    const scale = opts.scale || SPRITE_SCALE, variants = opts.variants || 3, frames = [];
    for (let v = 0; v < variants; v++) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
      const g = c.getContext('2d');
      g.scale(scale, scale); g.translate(ax, ay);
      draw(g, mulberry(((opts.seed || 1) * 7919 + v * 131) >>> 0), v);
      frames.push(c);
    }
    return { frames, w, h, ax, ay };
  }
  function drawSprite(ctx, spr, x, y, v = 0, flip = false, scale = 1, rot = 0) {
    const c = spr.frames[Math.abs(v | 0) % spr.frames.length];
    ctx.save(); ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.drawImage(c, -spr.ax, -spr.ay, spr.w, spr.h);
    ctx.restore();
  }

  return {
    FONT_HAND, FONT_MARKER, SPRITE_SCALE, mulberry, parse, rgba, shade,
    resample, arcPts, curvePts, rectPts, blobPts, bounds,
    stroke, line, fillShape, blob, rect, dots, splat, text, measure,
    paper, grain, makeSprite, drawSprite
  };
})();

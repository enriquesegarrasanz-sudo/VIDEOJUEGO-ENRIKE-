// level1.js — Mundo 1 · La Escuela de Interpretación (tutorial)
// Coordenadas en píxeles del mundo. GROUND es la línea del suelo.
// Secciones, en orden: aprender a saltar → ejercicio de confianza →
// calentamiento de voz → El de la Silla → el Actor de Método →
// llorar a la de tres → jefe: La Calavera de Hamlet.
'use strict';

const Level1 = (() => {
  const GROUND = 470;
  const G = y => GROUND - y; // altura sobre el suelo → coordenada y

  const floors = [];   // tramos de suelo {x, w}
  const platforms = []; // {x, y, w, h, kind, text}
  const entities = [];  // {type, x, ...}
  const decor = [];     // {type, x, y, i}
  const checkpoints = [0];

  // --- helpers ---
  let cursor = 0;
  function floor(w) { floors.push({ x: cursor, w }); cursor += w; }
  function gap(w) { cursor += w; }
  function sign(x, lines, h = 215) { entities.push({ type: 'sign', x, y: G(h), lines }); }
  function mat(x, h, w) { platforms.push({ x, y: G(h), w, h: 18, kind: 'mat' }); }
  function chair(x, h) { platforms.push({ x: x - 24, y: G(h), w: 48, h: 12, kind: 'chair' }); }
  function coffee(x, h = 40) { entities.push({ type: 'coffee', x, y: G(h) }); }
  function claqueta(x, h, id) { entities.push({ type: 'claqueta', x, y: G(h), id }); }

  // ============ 1. Aprender a saltar ============
  floor(1500);
  sign(620, ['SALTA', 'toca la pantalla / barra']);
  decor.push({ type: 'poster', x: 300, y: G(230), i: 0 }, { type: 'spotlight', x: 900, y: 40 });
  gap(150);                                  // 1500-1650: primer hueco pequeño
  floor(900);                                 // 1650-2550
  coffee(1900);
  sign(2150, ['MANTÉN PULSADO', '= salto más alto'], 225);
  gap(250);                                   // 2550-2800: hace falta mantener
  checkpoints.push(2850);
  floor(2400);                                // 2800-5200

  // ============ 2. Ejercicio de confianza ============
  sign(3050, ['EJERCICIO DE CONFIANZA', 'se dejan caer sin avisar'], 230);
  entities.push({ type: 'trust', x: 3350, i: 0 }, { type: 'trust', x: 3850, i: 1 }, { type: 'trust', x: 4350, i: 2 });
  decor.push({ type: 'window', x: 3600, y: 120 }, { type: 'poster', x: 4100, y: G(240), i: 1 });
  // claqueta 1: escalera de colchonetas hasta arriba
  mat(4650, 80, 110); mat(4860, 170, 100);
  claqueta(5000, 290, 0);
  coffee(5120);
  checkpoints.push(5050);

  // ============ 3. Calentamiento de voz ============
  entities.push({ type: 'teacherVoice', x: 5130, bubble: '¡Mi-me-ma-mo-mu!' });
  gap(1240);                                  // 5200-6440: el vacío (silencio)
  const syl = ['MI', 'ME', 'MA', 'MO', 'MU'];
  syl.forEach((t, i) => platforms.push({ x: 5300 + i * 230, y: G(110 + (i % 2) * 40), w: 110, h: 44, kind: 'syllable', text: t, bob: i * 1.3 }));
  claqueta(5300 + 2 * 230 + 55, 330, 1);     // sobre MA
  floor(2200);                                // 6440-8640
  checkpoints.push(6500);

  // ============ 4. El de la Silla ============
  sign(6760, ['EL DE LA SILLA', 'salta cuando empiece a temblar'], 235);
  decor.push({ type: 'spotlight', x: 6700, y: 40 }, { type: 'spotlight', x: 7600, y: 40 });
  entities.push({ type: 'knight', x: 7250 }, { type: 'knight', x: 8150 });
  coffee(7700, 160); mat(7650, 110, 100);
  gap(190);                                   // 8640-8830
  floor(1000);                                // 8830-9830
  entities.push({ type: 'knight', x: 9300 });
  checkpoints.push(8900);

  // ============ 5. El Actor de Método ============
  gap(200);                                   // 9830-10030
  floor(1900);                                // 10030-11930
  sign(10180, ['EL ACTOR DE MÉTODO', 'lleva 3 semanas siendo Napoleón'], 235);
  entities.push({ type: 'napoleon', x: 10500, bubble: 'Mi personaje no se movería.' });
  entities.push({ type: 'napoleon', x: 11150, bubble: 'Sigo siendo Napoleón.' });
  decor.push({ type: 'window', x: 10800, y: 120 }, { type: 'poster', x: 11500, y: G(235), i: 2 });
  coffee(11750);
  checkpoints.push(11400);

  // ============ 6. Llorar a la de tres ============
  floor(2600);                                // 11930-14530
  sign(12050, ['LLORAR A LA DE TRES', 'las lágrimas inundan el suelo'], 240);
  entities.push({ type: 'teacher', x: 12300, bubble: '¡EMOCIÓN!' });
  // el agua empieza justo pasada la primera colchoneta: desde suelo seco se salta a ella.
  // Colchonetas flotando (anchas, perdonan) y sillas a la deriva de decoración.
  const zone = { type: 'tears', x: 12680, w: 1240 };
  entities.push(zone);
  for (let i = 0; i < 6; i++) entities.push({ type: 'crier', x: 12760 + i * 220, i });
  for (let i = 0; i < 6; i++) platforms.push({ x: 12600 + i * 240, y: G(70 + (i % 3) * 15), w: 130, h: 18, kind: 'mat', float: true });
  for (let i = 0; i < 3; i++) entities.push({ type: 'floatchair', x: 12790 + i * 480 });
  claqueta(12600 + 3 * 240 + 65, 280, 2);
  decor.push({ type: 'poster', x: 13900, y: G(235), i: 3 });
  coffee(14400);
  checkpoints.push(14350);

  // ============ 7. Jefe: La Calavera de Hamlet ============
  gap(180);                                   // 14530-14710
  floor(14000);                               // 14710 → final (el suelo sigue hasta el telón)
  sign(14850, ['JEFE', 'La Calavera de Hamlet'], 235);
  decor.push({ type: 'spotlight', x: 15000, y: 40 }, { type: 'spotlight', x: 15400, y: 40 });
  const bossX = 15300;
  entities.push({ type: 'boss', x: bossX });
  checkpoints.push(14800);

  // monólogo: [texto, altura de la palabra (px), 'alta' = pasa por encima (NO saltar)]
  const monologue = [
    ['SER', 46], ['O NO', 48], ['SER', 46], ['ESA ES', 44, 'alta'], ['LA', 40], ['CUESTIÓN', 50],
    ['PALABRAS', 54, 'alta'], ['PALABRAS', 54], ['PALABRAS', 54, 'alta'],
    ['¡AY!', 44], ['POBRE', 48, 'alta'], ['YORICK', 52],
    ['DUDA', 46], ['DE TODO', 48, 'alta'], ['MENOS', 46], ['DE MI', 44, 'alta'], ['AMOR', 56],
    ['EL RESTO', 50, 'alta'], ['ES', 40], ['SILENCIO', 60]
  ];

  return { GROUND, floors, platforms, entities, decor, checkpoints, bossX, monologue, length: cursor };
})();

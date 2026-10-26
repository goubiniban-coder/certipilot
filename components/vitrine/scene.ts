/* eslint-disable */
// @ts-nocheck
// Scène 3D de la page d'accueil : chantier + entrepôt, pilotée par le défilement.
import * as THREE from "three";

export function startScene(canvas) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  } catch (err) { return function () {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var SKY = 0xbfe6fb;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 190);
  var camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a98a, 0.85));
  var sun = new THREE.DirectionalLight(0xfff1cf, 0.95);
  sun.position.set(-40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 200;
  scene.add(sun);

  /* ---------- helpers ---------- */
  var mats = {};
  function mat(c) { return mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true })); }
  function box(w, h, d, c, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m); return m;
  }
  function cyl(rt, rb, h, c, x, y, z, parent, seg) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat(c));
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m); return m;
  }
  function wheel(r, w, x, y, z, parent) {
    var m = cyl(r, r, w, 0x1f2937, x, y, z, parent, 12); m.rotation.z = Math.PI / 2; return m;
  }
  function group(x, y, z, parent) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); (parent || scene).add(g); return g; }
  var C = { jaune: 0xfacc15, marine: 0x1e3a8a, beton: 0xcbd5e1, noir: 0x1f2937, blanc: 0xf8fafc, rouge: 0xb91c1c, orange: 0xea580c, vert: 0x15803d, violet: 0x7c3aed, ambre: 0xd97706, bleu: 0x1d4ed8, or: 0xca8a04, terre: 0x9a7b4f, herbe: 0x84b56a };

  /* ---------- sol ---------- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(C.herbe));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  function patch(w, d, c, x, z, y) { var p = box(w, 0.3, d, c, x, (y || 0.15), z); p.castShadow = false; return p; }
  patch(150, 46, 0xd6c7a1, 0, -2);               // terre battue du site
  patch(170, 11, 0x475569, 0, -33);              // route derrière l'entrepôt
  for (var i = -7; i <= 7; i++) box(5, 0.05, 0.5, 0xfef08a, i * 10, 0.34, -33).castShadow = false;
  patch(26, 20, 0xe2e8f0, 0, 3, 0.2);            // dalle devant l'entrepôt

  /* ---------- entrepôt ---------- */
  var wh = group(0, 0, -4);
  box(34, 0.5, 22, 0xe2e8f0, 0, 0.25, 0, wh);                      // radier
  box(34, 9, 1, 0xe5e7eb, 0, 4.5, -10.5, wh);                       // fond
  box(1, 9, 22, 0xe5e7eb, -16.5, 4.5, 0, wh);                       // côté gauche
  box(1, 9, 22, 0xe5e7eb, 16.5, 4.5, 0, wh);                        // côté droit
  box(10, 9, 1, 0xe5e7eb, -12, 4.5, 10.5, wh);                      // façade (2 pans + linteau : grande ouverture)
  box(10, 9, 1, 0xe5e7eb, 12, 4.5, 10.5, wh);
  box(14, 2.4, 1, 0xe5e7eb, 0, 7.8, 10.5, wh);
  box(35, 0.7, 23, C.marine, 0, 9.4, 0, wh);                        // toit marine
  box(35.4, 0.4, 23.4, C.jaune, 0, 8.95, 0, wh);                    // bandeau jaune
  box(12, 1.6, 0.4, C.jaune, 0, 7.6, 11.1, wh);                     // enseigne
  box(7, 6.6, 0.4, 0x94a3b8, -9.4, 3.3, 10.7, wh);                  // portail ouvert, coulissé
  box(7, 6.6, 0.4, 0x94a3b8, 9.4, 3.3, 10.7, wh);
  // étagères + palettes
  var rackCols = [0xf97316, 0x2563eb, 0x16a34a, 0xeab308];
  for (var r = 0; r < 3; r++) {
    var rx = -12 + r * 12;
    for (var lv = 0; lv < 3; lv++) {
      box(8, 0.2, 2.2, 0x475569, rx, 1.2 + lv * 2.2, -8.2, wh);
      for (var k = 0; k < 3; k++) box(2, 1.4, 1.6, rackCols[(r + lv + k) % 4], rx - 2.6 + k * 2.6, 2 + lv * 2.2, -8.2, wh);
    }
    box(0.3, 6.6, 0.3, 0x475569, rx - 4, 3.5, -9.1, wh); box(0.3, 6.6, 0.3, 0x475569, rx + 4, 3.5, -9.1, wh);
  }
  // pont roulant (R.484)
  box(0.5, 0.5, 20, 0x334155, -14, 8, 0, wh); box(0.5, 0.5, 20, 0x334155, 14, 8, 0, wh);
  var bridge = group(0, 8, 0, wh);
  box(28.5, 0.7, 1, C.orange, 0, 0, 0, bridge);
  var trolleyWh = group(0, -0.3, 0, bridge);
  box(2, 0.8, 1.6, 0x1f2937, 0, 0, 0, trolleyWh);
  var cableWh = box(0.12, 4, 0.12, 0x1f2937, 0, -2.4, 0, trolleyWh);
  box(1.1, 0.7, 0.9, C.jaune, 0, -4.5, 0, trolleyWh);

  /* ---------- engins ---------- */
  // chariot élévateur R.489
  function makeForklift(col) {
    var g = group();
    box(2, 1.3, 3.4, col, 0, 1.2, 0, g);
    box(1.8, 0.9, 1.2, 0x111827, 0, 0.9, -1.6, g);                  // contrepoids
    box(1.9, 0.12, 1.8, 0x111827, 0, 2.7, -0.3, g);                 // toit cabine
    [[-0.85, -1.0], [0.85, -1.0], [-0.85, 0.3], [0.85, 0.3]].forEach(function (p) { box(0.12, 1.5, 0.12, 0x111827, p[0], 2, p[1], g); });
    box(1.3, 0.35, 1, 0x1f2937, 0, 2, -0.4, g);                      // siège
    var mast = group(0, 0, 1.9, g);
    box(0.18, 4.2, 0.2, 0x374151, -0.6, 2.1, 0, mast); box(0.18, 4.2, 0.2, 0x374151, 0.6, 2.1, 0, mast);
    var carriage = group(0, 0.6, 0.25, mast);
    box(1.8, 0.8, 0.15, 0x374151, 0, 0.3, 0, carriage);
    box(0.22, 0.12, 1.6, 0x9ca3af, -0.5, 0, 0.9, carriage); box(0.22, 0.12, 1.6, 0x9ca3af, 0.5, 0, 0.9, carriage);
    var pal = group(0, 0.15, 1, carriage);
    box(1.4, 0.18, 1.2, 0xd6a45c, 0, 0.1, 0, pal);
    box(1.2, 0.9, 1, 0x38bdf8, 0, 0.65, 0, pal);
    g.userData.carriage = carriage;
    wheel(0.5, 0.5, -1.05, 0.5, 1.0, g); wheel(0.5, 0.5, 1.05, 0.5, 1.0, g);
    wheel(0.42, 0.4, -1.05, 0.42, -1.2, g); wheel(0.42, 0.4, 1.05, 0.42, -1.2, g);
    return g;
  }
  // gerbeur R.485
  function makeStacker(col) {
    var g = group();
    box(1.4, 1.1, 1.8, col, 0, 0.8, -0.6, g);
    box(0.2, 3.6, 0.2, 0x374151, -0.5, 1.8, 0.4, g); box(0.2, 3.6, 0.2, 0x374151, 0.5, 1.8, 0.4, g);
    var carriage = group(0, 0.9, 0.5, g);
    box(0.2, 0.1, 1.3, 0x9ca3af, -0.4, 0, 0.6, carriage); box(0.2, 0.1, 1.3, 0x9ca3af, 0.4, 0, 0.6, carriage);
    box(1.0, 0.7, 0.9, 0xfbbf24, 0, 0.45, 0.6, carriage);
    g.userData.carriage = carriage;
    wheel(0.25, 0.25, -0.6, 0.25, 1.1, g); wheel(0.25, 0.25, 0.6, 0.25, 1.1, g); wheel(0.3, 0.3, 0, 0.3, -1.0, g);
    return g;
  }
  // pelle R.482
  function makeExcavator() {
    var g = group();
    box(1, 0.9, 5, 0x1f2937, -1.5, 0.45, 0, g); box(1, 0.9, 5, 0x1f2937, 1.5, 0.45, 0, g);
    box(3.6, 0.5, 4.6, 0x374151, 0, 1.1, 0, g);
    var turret = group(0, 1.35, 0, g);
    box(3.4, 1.3, 3.8, C.jaune, 0, 0.65, -0.3, turret);
    box(1.8, 1.6, 1.6, C.jaune, -0.6, 1.9, 0.6, turret);
    box(1.5, 1.2, 0.1, 0x7dd3fc, -0.6, 1.95, 1.42, turret);
    box(3.4, 0.9, 1.3, 0x111827, 0, 1.0, -2.3, turret);
    var boom = group(0.5, 1.0, 1.7, turret);
    box(0.7, 0.8, 5.2, C.jaune, 0, 0, 2.4, boom);
    var stick = group(0, 0, 5, boom);
    box(0.5, 0.6, 3.4, C.jaune, 0, 0, 1.5, stick);
    var bucket = group(0, 0, 3.2, stick);
    box(1.4, 0.3, 1.3, 0x111827, 0, -0.4, 0.4, bucket); box(1.4, 0.9, 0.2, 0x111827, 0, 0, -0.1, bucket);
    box(0.15, 0.9, 1.3, 0x111827, -0.7, 0, 0.4, bucket); box(0.15, 0.9, 1.3, 0x111827, 0.7, 0, 0.4, bucket);
    g.userData = { turret: turret, boom: boom, stick: stick, bucket: bucket };
    return g;
  }
  // grue à tour R.487
  function makeTowerCrane() {
    var g = group();
    box(5, 1, 5, 0x64748b, 0, 0.5, 0, g);
    for (var i = 0; i < 12; i++) box(1.4, 2, 1.4, i % 2 ? C.ambre : 0xfbbf24, 0, 2 + i * 2, 0, g);
    var top = group(0, 25, 0, g);
    box(2, 2, 2, 0x374151, 0, 0.8, 0, top);
    box(1.4, 3, 1.4, C.ambre, 0, 3, 0, top);
    var jib = group(0, 4.2, 0, top);
    box(1, 1, 30, C.ambre, 0, 0, 7, jib);
    box(1, 1, 9, C.ambre, 0, 0, -9, jib);
    box(2.4, 2, 2, 0x9ca3af, 0, -0.2, -12, jib);
    box(0.2, 5, 0.2, 0x374151, 0, 2.4, 0.5, jib);
    var trolley = group(0, -0.8, 12, jib);
    box(1.2, 0.5, 1.2, 0x1f2937, 0, 0, 0, trolley);
    var hook = group(0, 0, 0, trolley);
    box(0.1, 11, 0.1, 0x1f2937, 0, -5.5, 0, hook);
    box(1.4, 0.8, 1.4, C.jaune, 0, -11, 0, hook);
    box(4, 1.3, 1.6, 0x94a3b8, 0, -12, 0, hook);
    g.userData = { jib: jib, trolley: trolley, hook: hook };
    return g;
  }
  // grue mobile R.483
  function makeMobileCrane() {
    var g = group();
    box(3.4, 1, 11, C.vert, 0, 1.2, 0, g);
    box(3.1, 2.1, 2.6, C.vert, 0, 2.3, 4.2, g);
    box(2.8, 0.9, 0.1, 0x7dd3fc, 0, 2.7, 5.52, g);
    [-4.2, -1.8, 1.6, 4.0].forEach(function (z) { wheel(0.9, 0.7, -1.7, 0.9, z, g); wheel(0.9, 0.7, 1.7, 0.9, z, g); });
    box(6.2, 0.35, 0.5, 0x374151, 0, 0.7, -2.5, g);
    var turn = group(0, 1.9, -2.2, g);
    box(2.8, 1.6, 3.2, C.vert, 0, 0.9, 0, turn);
    var boom = group(0, 1.4, -0.5, turn);
    box(1.1, 1.1, 10, 0xf8fafc, 0, 0, 5, boom);
    box(0.9, 0.9, 5, 0xe2e8f0, 0, 0, 11, boom);
    box(0.12, 6, 0.12, 0x1f2937, 0, -3, 12.5, boom);
    box(1, 0.9, 1, C.jaune, 0, -6.3, 12.5, boom);
    g.userData = { turn: turn, boom: boom };
    return g;
  }
  // PEMP R.486
  function makeScissor() {
    var g = group();
    box(2.8, 0.8, 5, C.violet, 0, 0.7, 0, g);
    wheel(0.5, 0.5, -1.3, 0.5, 1.7, g); wheel(0.5, 0.5, 1.3, 0.5, 1.7, g); wheel(0.5, 0.5, -1.3, 0.5, -1.7, g); wheel(0.5, 0.5, 1.3, 0.5, -1.7, g);
    var lift = group(0, 1.1, 0, g);
    var bars = [];
    for (var s = 0; s < 3; s++) {
      var a = box(0.25, 0.25, 3.6, 0x6d28d9, -0.9, 0, 0, lift), b = box(0.25, 0.25, 3.6, 0x6d28d9, 0.9, 0, 0, lift);
      var c = box(0.25, 0.25, 3.6, 0x7c3aed, -0.9, 0, 0, lift), d = box(0.25, 0.25, 3.6, 0x7c3aed, 0.9, 0, 0, lift);
      bars.push([a, b, c, d]);
    }
    var plat = group(0, 3, 0, lift);
    box(3, 0.3, 4.4, 0x94a3b8, 0, 0, 0, plat);
    box(3, 0.9, 0.12, 0xfacc15, 0, 0.6, 2.1, plat); box(3, 0.9, 0.12, 0xfacc15, 0, 0.6, -2.1, plat);
    box(0.12, 0.9, 4.3, 0xfacc15, -1.45, 0.6, 0, plat); box(0.12, 0.9, 4.3, 0xfacc15, 1.45, 0.6, 0, plat);
    g.userData = { plat: plat, bars: bars };
    return g;
  }
  // camion-grue R.490
  function makeLoaderTruck() {
    var g = group();
    box(2.8, 0.6, 9, 0x374151, 0, 0.9, 0, g);
    box(2.8, 2.4, 2.6, C.bleu, 0, 2.2, 3.4, g);
    box(2.5, 1, 0.1, 0x7dd3fc, 0, 2.7, 4.72, g);
    box(2.8, 0.3, 5.2, 0x94a3b8, 0, 1.4, -1.5, g);
    box(2.2, 1.2, 2.2, 0xd6a45c, 0, 2.1, -3, g); box(2.2, 1.2, 2.2, 0x38bdf8, 0, 3.3, -3, g);
    [-3.5, -1.4, 3.4].forEach(function (z) { wheel(0.8, 0.6, -1.4, 0.8, z, g); wheel(0.8, 0.6, 1.4, 0.8, z, g); });
    var base = group(0, 1.7, 0.6, g);
    box(1, 1.8, 1, C.bleu, 0, 0.9, 0, base);
    var arm = group(0, 1.8, 0, base);
    box(0.6, 0.6, 4, C.bleu, 0, 0, 2, arm);
    var arm2 = group(0, 0, 4, arm);
    box(0.45, 0.45, 3.4, 0x2563eb, 0, 0, 1.7, arm2);
    box(0.12, 2, 0.12, 0x1f2937, 0, -1, 3.4, arm2); box(0.7, 0.5, 0.7, C.jaune, 0, -2.2, 3.4, arm2);
    g.userData = { base: base, arm: arm, arm2: arm2 };
    return g;
  }
  // camion benne
  function makeDumpTruck(col) {
    var g = group();
    box(2.8, 0.6, 8, 0x374151, 0, 0.9, 0, g);
    box(2.8, 2.2, 2.4, col, 0, 2.1, 2.8, g); box(2.5, 0.9, 0.1, 0x7dd3fc, 0, 2.5, 4.02, g);
    box(2.8, 1.8, 4.8, col, 0, 2.1, -1.6, g);
    [-3, -1.2, 3].forEach(function (z) { wheel(0.8, 0.6, -1.4, 0.8, z, g); wheel(0.8, 0.6, 1.4, 0.8, z, g); });
    return g;
  }

  // placement
  var excavator = makeExcavator(); excavator.position.set(-26, 0.3, -8); excavator.rotation.y = 0.5;
  var tower = makeTowerCrane(); tower.position.set(-36, 0.3, 10);
  var crane = makeMobileCrane(); crane.position.set(30, 0.3, -6); crane.rotation.y = -Math.PI / 2 + 0.3;
  var scissor = makeScissor(); scissor.position.set(22, 0.3, 11); scissor.rotation.y = 0.4;
  var loader = makeLoaderTruck(); loader.position.set(34, 0.3, 14); loader.rotation.y = -0.7;
  var forklift = makeForklift(C.or);
  var stacker = makeStacker(C.rouge);
  var truck = makeDumpTruck(C.orange);
  var truck2 = makeDumpTruck(C.jaune);

  // chantier : ossature, tas de terre, conteneurs, plots
  var bld = group(-26, 0.3, 14);
  for (var fx = 0; fx < 3; fx++) for (var fz = 0; fz < 2; fz++) for (var fy = 0; fy < 3; fy++) box(0.9, 3, 0.9, 0x94a3b8, fx * 5 - 5, 1.5 + fy * 3, fz * 5, bld);
  for (var sl = 0; sl < 3; sl++) box(11.5, 0.5, 6.5, 0xcbd5e1, 0, 3 + sl * 3, 2.5, bld);
  var dirt = new THREE.Mesh(new THREE.ConeGeometry(5, 4, 7), mat(0x8b6b3f)); dirt.position.set(-33, 2.1, -8); dirt.castShadow = true; scene.add(dirt);
  [[-48, 14, 0xdc2626], [-48, 17.5, 0x2563eb], [44, -16, 0x16a34a], [44, -19.5, 0xeab308]].forEach(function (p) { box(6, 2.6, 2.4, p[2], p[0], 1.6, p[1], scene); });
  for (var cc = 0; cc < 14; cc++) {
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 8), mat(0xf97316)); cone.position.set(-16 + cc * 2.2, 0.8, 18.5); cone.castShadow = true; scene.add(cone);
    box(0.8, 0.12, 0.8, 0x1f2937, -16 + cc * 2.2, 0.36, 18.5, scene);
  }
  // arbres + nuages
  function tree(x, z, s) {
    var t = group(x, 0, z); cyl(0.4 * s, 0.5 * s, 2 * s, 0x7c5a3a, 0, s, 0, t, 6);
    var c1 = new THREE.Mesh(new THREE.ConeGeometry(2.4 * s, 4 * s, 7), mat(0x3f8f4f)); c1.position.y = 3.6 * s; c1.castShadow = true; t.add(c1);
    var c2 = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 3.4 * s, 7), mat(0x4aa35c)); c2.position.y = 5.6 * s; c2.castShadow = true; t.add(c2);
  }
  [[-62, -46], [-54, -48], [-44, -44], [-20, -46], [10, -46], [40, -46], [58, -44], [62, -8], [56, 4], [-60, 4], [-62, 18], [60, 14], [-8, 40], [24, 42], [52, 40], [-40, 42]].forEach(function (p, i) { tree(p[0], p[1], 0.9 + (i % 3) * 0.2); });
  var clouds = [];
  for (var cl = 0; cl < 7; cl++) {
    var cg = group(-90 + cl * 32, 38 + (cl % 3) * 6, -60 + (cl % 4) * 24);
    for (var q = 0; q < 4; q++) { var puff = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + (q % 2) * 2, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })); puff.position.set(q * 5 - 7, (q % 2) * 1.3, 0); cg.add(puff); }
    clouds.push(cg);
  }


  /* ---------- vie : ouvriers, drapeau, poussière, étincelles ---------- */
  function makeWorker(vest) {
    var w = group();
    var legL = box(0.28, 0.9, 0.3, 0x1e3a8a, -0.2, 0.45, 0, w), legR = box(0.28, 0.9, 0.3, 0x1e3a8a, 0.2, 0.45, 0, w);
    box(0.8, 0.9, 0.45, vest, 0, 1.35, 0, w);
    box(0.84, 0.12, 0.49, 0xf8fafc, 0, 1.45, 0, w);
    var armL = group(-0.55, 1.7, 0, w), armR = group(0.55, 1.7, 0, w);
    box(0.22, 0.8, 0.25, 0xf2c9a0, 0, -0.35, 0, armL); box(0.22, 0.8, 0.25, 0xf2c9a0, 0, -0.35, 0, armR);
    box(0.5, 0.5, 0.5, 0xf2c9a0, 0, 2.05, 0, w);
    cyl(0.34, 0.34, 0.22, C.jaune, 0, 2.42, 0, w, 10);
    w.userData = { legL: legL, legR: legR, armL: armL, armR: armR };
    return w;
  }
  var workers = [];
  function addWorker(x, z, ry, mode, vest) { var w = makeWorker(vest || 0xf97316); w.position.set(x, 0.3, z); w.rotation.y = ry || 0; w.userData.mode = mode; w.userData.x0 = x; w.userData.z0 = z; w.userData.ph = Math.random() * 6; workers.push(w); return w; }
  addWorker(-20, 6, 0.8, 'wave'); addWorker(-31, -1, -0.4, 'walk'); addWorker(-18, 16, 1.4, 'walk'); addWorker(7, 13, 3.1, 'wave', 0xfacc15);
  addWorker(-6, 11, 0.2, 'walk', 0xfacc15); addWorker(16, 6, -0.9, 'walk'); addWorker(26, 3, 2.4, 'wave');

  // drapeau sur l'entrepôt
  cyl(0.12, 0.12, 6, 0xe5e7eb, 16, 12.5, 7, scene, 6);
  var flag = group(16, 14.6, 7, scene), flagParts = [];
  for (var fi = 0; fi < 6; fi++) { var fp = box(0.6, 1.6, 0.08, fi % 2 ? C.jaune : C.marine, 0.35 + fi * 0.6, 0, 0, flag); flagParts.push(fp); }

  // particules (pool)
  var parts = [];
  for (var pi = 0; pi < 140; pi++) {
    var pm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0, flatShading: true }));
    pm.visible = false; scene.add(pm); parts.push({ m: pm, life: 0, max: 1, v: new THREE.Vector3(), g: 0, size: 1, grow: 0 });
  }
  var pcur = 0;
  function emit(x, y, z, vx, vy, vz, life, size, color, g, grow) {
    var q = parts[pcur]; pcur = (pcur + 1) % parts.length;
    q.m.position.set(x, y, z); q.v.set(vx, vy, vz); q.life = q.max = life; q.size = size; q.g = g || 0; q.grow = grow || 0;
    q.m.material.color.setHex(color); q.m.visible = true; q.m.scale.setScalar(size);
  }
  function updateParticles(dt) {
    parts.forEach(function (q) {
      if (q.life <= 0) return;
      q.life -= dt; if (q.life <= 0) { q.m.visible = false; return; }
      q.v.y -= q.g * dt; q.m.position.addScaledVector(q.v, dt);
      var k = q.life / q.max; q.m.material.opacity = Math.min(1, k * 1.6) * 0.85; q.m.scale.setScalar(q.size * (1 + q.grow * (1 - k)));
    });
  }
  var lastP = { fork: new THREE.Vector3(), truck: new THREE.Vector3(), truck2: new THREE.Vector3() };
  var sparkLight = new THREE.PointLight(0xfff2a8, 0, 14); sparkLight.position.set(-26, 9.5, 17); scene.add(sparkLight);
  var emitT = 0;

  /* ---------- chemins ---------- */
  function loop(pts) { return new THREE.CatmullRomCurve3(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }), true, 'catmullrom', 0.5); }
  var forkPath = loop([[-14, 0.5, 12], [-4, 0.5, 18], [10, 0.5, 15], [9, 0.5, 8], [3, 0.5, 2], [0, 0.5, -3], [-5, 0.5, 2], [-9, 0.5, 8]]);
  var stackPath = loop([[-10, 0.5, -3], [0, 0.5, 2], [10, 0.5, -3], [0, 0.5, -6]]);
  var roadPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-95, 0.3, -35.5), new THREE.Vector3(95, 0.3, -35.5)]);
  var roadPath2 = new THREE.CatmullRomCurve3([new THREE.Vector3(95, 0.3, -30.5), new THREE.Vector3(-95, 0.3, -30.5)]);
  var tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  function follow(obj, curve, u) {
    u = ((u % 1) + 1) % 1;
    curve.getPointAt(u, tmp); curve.getTangentAt(u, tan);
    obj.position.copy(tmp);
    obj.rotation.y = Math.atan2(tan.x, tan.z);
  }

  /* ---------- caméra : une prise de vue par chapitre ---------- */
  var camCurve = new THREE.CatmullRomCurve3([[8, 30, 72], [-8, 23, 46], [3, 5.5, 34], [46, 13, 36], [0, 26, 66]].map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }), false, 'catmullrom', 0.4);
  var lookCurve = new THREE.CatmullRomCurve3([[0, 3, 0], [-30, 3, 0], [0, 4, -2], [26, 4, 4], [0, 3, 6]].map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }), false, 'catmullrom', 0.4);

  /* ---------- défilement ---------- */
  var target = 0, prog = 0;
  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 58 : 42; camera.updateProjectionMatrix();
    readScroll();
  }
  window.addEventListener('resize', resize); resize();
  prog = target;

  var clock = new THREE.Clock(), tt = 0;
  var sCam = new THREE.Vector3(), sLook = new THREE.Vector3();
  function wave(x) { return Math.sin(x) * 0.5 + 0.5; }
  function frame() {
    if (stopped) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    tt += reduce ? 0 : dt;
    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 4));
    var s = prog;
    var run = s * 6 + tt * 0.012;             // les engins avancent avec le défilement, et un peu tout seuls

    camCurve.getPoint(s, sCam); lookCurve.getPoint(s, sLook);
    camera.position.copy(sCam);
    if (!reduce) camera.position.y += Math.sin(tt * 0.5) * 0.25;
    camera.lookAt(sLook);

    follow(forklift, forkPath, run * 0.5);
    forklift.userData.carriage.position.y = 0.6 + wave(run * 10) * 2.4;
    follow(stacker, stackPath, run * 0.4);
    stacker.userData.carriage.position.y = 0.9 + wave(run * 8 + 1) * 2.6;
    follow(truck, roadPath, run * 0.55);
    follow(truck2, roadPath2, run * 0.45 + 0.3);

    var ex = excavator.userData;
    ex.turret.rotation.y = Math.sin(run * 4) * 0.7;
    ex.boom.rotation.x = -0.35 + Math.sin(run * 6) * 0.3;
    ex.stick.rotation.x = 0.9 + Math.sin(run * 6 + 1.2) * 0.5;
    ex.bucket.rotation.x = 0.7 + Math.sin(run * 6 + 2.4) * 0.5;

    var tw = tower.userData;
    tw.jib.rotation.y = s * 6.5 + tt * 0.05;
    tw.trolley.position.z = 9 + wave(run * 5) * 14;
    tw.hook.position.y = -Math.sin(run * 5) * 1.2;

    var mc = crane.userData;
    mc.turn.rotation.y = Math.sin(run * 3.5) * 1.1;
    mc.boom.rotation.x = -(0.25 + wave(run * 4) * 0.7);

    var sl = scissor.userData, hgt = 0.2 + wave(run * 5) * 0.7;
    sl.plat.position.y = 0.6 + hgt * 5;
    sl.bars.forEach(function (stage, i) {
      var a = Math.asin(Math.min(0.95, hgt * 0.9)), y = 0.4 + i * (hgt * 1.7);
      stage[0].rotation.x = a; stage[1].rotation.x = a; stage[2].rotation.x = -a; stage[3].rotation.x = -a;
      stage.forEach(function (b) { b.position.y = y; });
    });

    var lt = loader.userData;
    lt.base.rotation.y = Math.sin(run * 3) * 0.9; lt.arm.rotation.x = -0.4 + Math.sin(run * 4) * 0.25; lt.arm2.rotation.x = 0.5 + Math.sin(run * 4 + 1) * 0.3;

    bridge.position.z = Math.sin(run * 2.2) * 8;
    trolleyWh.position.x = Math.sin(run * 3.1) * 10;
    cableWh.position.y = -2.4 - Math.sin(run * 4) * 0.4;


    // ouvriers : marchent sur une petite boucle ou font coucou
    workers.forEach(function (w) {
      var u = w.userData, a = tt * 2 + u.ph + run * 3;
      if (u.mode === 'walk') {
        var r = 3.5, ang = a * 0.25;
        w.position.set(u.x0 + Math.cos(ang) * r, 0.3, u.z0 + Math.sin(ang) * r);
        w.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang)) + 0;
        u.legL.rotation.x = Math.sin(a * 4) * 0.7; u.legR.rotation.x = -Math.sin(a * 4) * 0.7;
        u.armL.rotation.x = -Math.sin(a * 4) * 0.6; u.armR.rotation.x = Math.sin(a * 4) * 0.6;
      } else {
        u.armR.rotation.z = -2.6 + Math.sin(a * 4) * 0.35; u.armL.rotation.x = 0;
      }
    });
    flagParts.forEach(function (fp, i) { fp.position.y = Math.sin(tt * 4 - i * 0.7) * 0.18; fp.rotation.y = Math.sin(tt * 4 - i * 0.7) * 0.25; });

    // poussière derrière les engins en mouvement, fumée de pelle, étincelles de soudure
    if (!reduce) {
      emitT += dt;
      while (emitT > 0.06) {
        emitT -= 0.06;
        [[forklift, 'fork', 0.9, 0xd9c9a3, -1.9], [truck, 'truck', 1.6, 0xcbbd9a, -4], [truck2, 'truck2', 1.6, 0xcbbd9a, -4]].forEach(function (e) {
          var o = e[0], k = lastP[e[1]];
          if (o.position.distanceTo(k) > 0.02) {
            var back = new THREE.Vector3(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y)).multiplyScalar(e[4]);
            emit(o.position.x + back.x, 0.6, o.position.z + back.z, (Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8, 1.1, e[2], e[3], -0.2, 1.4);
          }
          k.copy(o.position);
        });
        emit(excavator.position.x - 1.6, 4.4, excavator.position.z - 2.2, (Math.random() - 0.5) * 0.4, 1.4, (Math.random() - 0.5) * 0.4, 1.8, 0.5, 0x4b5563, -0.1, 3);
        emit(-26 + (Math.random() - 0.5) * 3, 9.6, 17 + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.45, 0.13, 0xfde047, 14, 0);
      }
      sparkLight.intensity = Math.random() > 0.5 ? 1.6 : 0.2;
      updateParticles(dt);
    }

    clouds.forEach(function (c, i) { c.position.x += (reduce ? 0 : dt * (1.2 + i * 0.15)); if (c.position.x > 110) c.position.x = -110; });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  var raf = 0, stopped = false;
  frame();
  return function () {
    stopped = true; cancelAnimationFrame(raf);
    window.removeEventListener('scroll', readScroll); window.removeEventListener('resize', resize);
    scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    renderer.dispose();
  };
}

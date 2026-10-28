/* Стъкленият знак на Здраве и Сила — сърцето с ръката като стъклен обект.
 *
 * Същият подход като стъклената верига на Чийт Код (public/cheatcode/
 * glass-chain.js): three.js r128, огледално стъкло, люлее се и следи мишката.
 * Своето: при докосване сърцето удря веднъж, а ръката се стяга.
 *
 * Чертежът е пътят на знака (src/shop/markPaths.js → public/shop/brand/mark.svg):
 * първият контур е сърцето, останалите четири — ръката.
 *
 *   var gm = GlassMark(canvas, { d, viewBox, tone: 'light' | 'dark' })
 *   gm.idle(stageEl)   — люлеене, следене на мишката, удар при докосване
 *   gm.beat()          — един удар отвън (напр. при „Добави“)
 *   gm.draw(ms)        — един кадър (за неподвижни картинки)
 *
 * Иска THREE (r128). Без WebGL връща null — мястото пази плоския SVG. */
(function () {
  'use strict';

  /* Пътят е от проследяването: само M, C, L и Z, числата с интервал. */
  function shapes(THREE, d) {
    var out = [], sh = null, cur = [0, 0];
    (d.match(/[MCLZ][^MCLZ]*/g) || []).forEach(function (seg) {
      var c = seg[0], n = seg.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (c === 'M') { sh = new THREE.Shape(); sh.moveTo(n[0], -n[1]); cur = [n[0], n[1]]; out.push(sh); }
      else if (c === 'L') { for (var i = 0; i < n.length; i += 2) { sh.lineTo(n[i], -n[i + 1]); cur = [n[i], n[i + 1]]; } }
      else if (c === 'C') { for (var j = 0; j < n.length; j += 6) { sh.bezierCurveTo(n[j], -n[j + 1], n[j + 2], -n[j + 3], n[j + 4], -n[j + 5]); cur = [n[j + 4], n[j + 5]]; } }
      else if (c === 'Z' && sh) sh.closePath();
    });
    return out;
  }

  function GlassMark(canvas, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    if (!THREE || !canvas || !opts.d) return null;
    var dark = opts.tone === 'dark';

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.still });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 0.9 : 1.05;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 13);

    /* Околната светлина за отраженията — светли плоскости; зеленото на марката
       идва отстрани, затова стъклото е с лек зелен отблясък. */
    var env = new THREE.Scene();
    env.background = new THREE.Color(dark ? 0x0f1c15 : 0x3e5a4b);
    [[0, 6, 0, 0xffffff, dark ? 9 : 14], [-6, 1, 3, dark ? 0x2c6a4c : 0xdcefe3, 6], [6, -2, 2, 0xffffff, dark ? 3 : 5],
     [0, -6, 0, dark ? 0x173f2e : 0xc7d6cc, 4]].forEach(function (p) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(p[4], p[4]), new THREE.MeshBasicMaterial({ color: p[3], side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m);
    });
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x173f2e : 0xdfe8e1, dark ? 0.35 : 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 6); scene.add(key);
    var rim = new THREE.PointLight(dark ? 0x4fbf8e : 0x2f8f5c, dark ? 2.4 : 1.5, 20); rim.position.set(-3, -2, 3); scene.add(rim);

    var glass = new THREE.MeshPhysicalMaterial(dark
      ? { color: 0xa9c2b4, metalness: 0.6, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.4, transparent: true, opacity: 0.92 }
      : { color: 0x2c6a4c, metalness: 0.3, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5, transparent: true, opacity: 0.96 });
    /* На овес светлото стъкло изчезва — там е по-тъмно, зелено стъкло с ярки ръбове. */
    glass.color.convertSRGBToLinear();
    /* Сърцето е малко по-топло стъкло — да се чете като отделна половина. */
    var heartGlass = glass.clone();
    heartGlass.color = new THREE.Color(dark ? 0xd6c3b8 : 0x3f7d5c).convertSRGBToLinear();

    var list = shapes(THREE, opts.d);
    var extrude = { depth: 42, bevelEnabled: true, bevelThickness: 12, bevelSize: 5, bevelSegments: 5, curveSegments: 14 };
    var mark = new THREE.Group();
    var heart = new THREE.Mesh(new THREE.ExtrudeGeometry(list[0], extrude), heartGlass);
    var arm = new THREE.Group();
    list.slice(1).forEach(function (s) { arm.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, extrude), glass)); });
    mark.add(heart); mark.add(arm);

    /* Център и мащаб: знакът влиза в ~4 единици. */
    var box = new THREE.Box3().setFromObject(mark), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    var k = 3.7 / Math.max(sz.x, sz.y) * (opts.scale || 1);
    var holder = new THREE.Group();
    mark.position.set(-c.x, -c.y, -c.z);
    holder.add(mark); holder.scale.setScalar(k);
    /* Сърцето удря около собствения си център, ръката се стяга около рамото. */
    var hb = new THREE.Box3().setFromObject(heart).getCenter(new THREE.Vector3());
    var ab = new THREE.Box3().setFromObject(arm);
    var pivotH = new THREE.Group(), pivotA = new THREE.Group();
    pivotH.position.copy(hb); heart.position.sub(hb); pivotH.add(heart);
    var shoulder = new THREE.Vector3(ab.min.x, (ab.min.y + ab.max.y) / 2 - (ab.max.y - ab.min.y) * 0.15, (ab.min.z + ab.max.z) / 2);
    pivotA.position.copy(shoulder); arm.position.sub(shoulder); pivotA.add(arm);
    mark.add(pivotH); mark.add(pivotA);
    scene.add(holder);

    var BASE = { x: -0.12, y: 0.32 };
    var state = { mx: 0, my: 0, beatAt: -1e9, swing: true };
    var clock = 0;

    function beat() { state.beatAt = clock; }

    function size() {
      var el = opts.sizeFrom || canvas.parentElement || canvas;
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    /* Удар като на сърце: две тупвания за 0,9 s. */
    function pulse(t) {
      if (t < 0 || t > 0.9) return 0;
      var a = Math.exp(-Math.pow((t - 0.12) / 0.07, 2)), b = Math.exp(-Math.pow((t - 0.38) / 0.09, 2)) * 0.6;
      return a + b;
    }

    function draw(ms) {
      clock = (ms || 0) / 1000;
      var s = clock;
      var swingY = state.swing ? Math.sin(s * 0.45) * 0.22 : 0, swingX = state.swing ? Math.sin(s * 0.33) * 0.07 : 0;
      holder.rotation.y = BASE.y + swingY + state.mx * 0.5;
      holder.rotation.x = BASE.x + swingX + state.my * 0.35;
      holder.position.y = (opts.lift || 0) + (state.swing ? Math.sin(s * 0.8) * 0.06 : 0);
      var p = pulse(s - state.beatAt);
      pivotH.scale.setScalar(1 + p * 0.12);
      pivotA.rotation.z = p * 0.07;            // ръката се стяга
      pivotA.scale.setScalar(1 + p * 0.03);
      renderer.render(scene, camera);
    }

    function idle(stage) {
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var last = 0;
      if (stage) {
        stage.addEventListener('pointermove', function (e) {
          var r = stage.getBoundingClientRect();
          state.mx = (e.clientX - r.left) / r.width - 0.5; state.my = (e.clientY - r.top) / r.height - 0.5;
        });
        stage.addEventListener('pointerdown', beat);
      }
      if (window.ResizeObserver) new ResizeObserver(function () { size(); draw(last); }).observe(opts.sizeFrom || canvas.parentElement || canvas);
      draw(0);
      if (!still) (function loop(t) { last = t; draw(t); requestAnimationFrame(loop); })(0);
      else draw(0);
      /* Един удар при отваряне — знакът се представя. */
      setTimeout(beat, 500);
    }

    size();
    return { draw: draw, beat: beat, size: size, idle: idle, renderer: renderer, state: state };
  }

  window.GlassMark = GlassMark;
})();

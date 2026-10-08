/* Стъклената верига — знакът на Чийт Код като стъклен обект.
 *
 * Една рисунка, три места: представянето за CoKitchen (люлее се и следва
 * мишката), сплашът на Чийт Код (затваря се, напъва се и се къса) и
 * неподвижните картинки — шапката на писмата и картинката за споделяне
 * (scripts/build-mail-art.mjs). Правилата за употреба са в
 * cheatcode/brand/RULES.md, „Стъклената верига“.
 *
 * Иска THREE (r128, /cheatcode/vendor/three-r128.min.js). Без WebGL връща
 * null — мястото си държи своя плосък SVG.
 *
 *   var gc = GlassChain(canvas, { tone: 'light' | 'dark' })
 *   gc.pose({ apart, shake, broken, burst }); gc.draw(ms)
 *   gc.idle(stageEl)   — люлеене и следене на мишката, както в CoKitchen
 *
 * Две звена-капсули под прав ъгъл. Скъсването е МЕЖДУ тях: второто звено
 * се къса на дъгата, която минава през първото, и звената се разделят —
 * първото излиза през пролуката. (До 08.10 пролуката беше на външната дъга
 * на второто — `gap: 'end'` я връща.) Отломките са в зеленото на марката. */
(function () {
  'use strict';

  function GlassChain(canvas, opts) {
    var THREE = window.THREE;
    if (!THREE || !canvas) return null;
    opts = opts || {};
    var dark = opts.tone === 'dark';

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
        // Неподвижните картинки се снимат от екрана — буферът трябва да оцелее.
        preserveDrawingBuffer: !!opts.still
      });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 0.85 : 1.05;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0, 12.5);

    /* Околна светлина за отраженията: малка сцена от светли плоскости. На
       тъмен фон стъклото отразява тъмна стая — иначе свети като на бяло и
       изпада от страницата. */
    var envScene = new THREE.Scene();
    envScene.background = new THREE.Color(dark ? 0x101814 : 0x9aa69f);
    [[0, 6, 0, 0xffffff, dark ? 9 : 14], [-6, 1, 3, dark ? 0x4fbf8e : 0xdff5ea, 6], [6, -2, 2, 0xffffff, dark ? 3 : 5],
     [0, -6, 0, dark ? 0x1b251f : 0xc9d3cc, 4]].forEach(function (p) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(p[4], p[4]),
        new THREE.MeshBasicMaterial({ color: p[3], side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); envScene.add(m);
    });
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x22302a : 0xdfe6df, dark ? 0.35 : 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 6); scene.add(key);
    var rim = new THREE.PointLight(dark ? 0x4fbf8e : 0x2fb377, dark ? 2.2 : 1.4, 20); rim.position.set(-3, -2, 3); scene.add(rim);

    /* Капсула (стадион): две прави и две дъги. u ∈ [a, b] е частта от обиколката. */
    // Клас, не прототип: в r128 THREE.Curve е клас и не се вика без `new`.
    class Stadium extends THREE.Curve {
      constructor(half, r, a, b) { super(); this.h = half; this.r = r; this.a = a; this.b = b; }
      getPoint(t, target) {
        var h = this.h, r = this.r, L = 4 * h + 2 * Math.PI * r;
        var s = (this.a + (this.b - this.a) * t) * L, v = target || new THREE.Vector3();
        s = ((s % L) + L) % L;
        if (s < 2 * h) return v.set(-h + s, r, 0);
        s -= 2 * h;
        if (s < Math.PI * r) { var q = Math.PI / 2 - s / r; return v.set(h + r * Math.cos(q), r * Math.sin(q), 0); }
        s -= Math.PI * r;
        if (s < 2 * h) return v.set(h - s, -r, 0);
        s -= 2 * h;
        var w = -Math.PI / 2 - s / r; return v.set(-h + r * Math.cos(w), r * Math.sin(w), 0);
      }
    }

    /* На тъмно стъклото е по-тъмно и по-огледално: светлото тяло от CoKitchen
       върху #141C18 се чете като порцелан — стъклото там живее от отраженията. */
    var glass = new THREE.MeshPhysicalMaterial(dark
      ? { color: 0x9fb4a9, metalness: 0.62, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.4 }
      : { color: 0xdde7e1, metalness: 0.35, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.7 });
    var H = 0.95, R = 0.62, T = 0.2;
    var chain = new THREE.Group();

    var link1 = new THREE.Mesh(new THREE.TubeGeometry(new Stadium(H, R, 0, 1), 220, T, 28, true), glass);
    link1.position.x = -0.95;
    chain.add(link1);

    /* Второто звено: цяло (преди скъсването) и скъсано. Пролуката е част от
       обиколката: 0.82–0.93 е средата на лявата дъга — тази, която минава
       през първото звено; 0.30–0.43 е външната дъга. */
    var GAP = opts.gap === 'end' ? [0.30, 0.43] : [0.82, 0.93];
    var link2 = new THREE.Group();
    link2.rotation.x = Math.PI / 2;
    link2.position.x = 0.95;
    var whole = new THREE.Mesh(new THREE.TubeGeometry(new Stadium(H, R, 0, 1), 220, T, 28, true), glass);
    var torn = new THREE.Group();
    torn.add(new THREE.Mesh(new THREE.TubeGeometry(new Stadium(H, R, GAP[1], 1 + GAP[0]), 220, T, 28, false), glass));
    var capGeo = new THREE.IcosahedronGeometry(T * 1.02, 0);
    [GAP[1], GAP[0]].forEach(function (u) {
      var m = new THREE.Mesh(capGeo, glass); m.position.copy(new Stadium(H, R, 0, 1).getPoint(u)); torn.add(m);
    });
    link2.add(whole); link2.add(torn);
    chain.add(link2);

    /* Отломките: къде са, колко са големи, какви са — по знака. */
    var green = new THREE.MeshStandardMaterial(dark
      ? { color: 0x4fbf8e, roughness: 0.3, metalness: 0.05, emissive: 0x1f6b4e, emissiveIntensity: 0.9 }
      : { color: 0x2fb377, roughness: 0.35, metalness: 0.1, emissive: 0x0d3b26, emissiveIntensity: 0.25 });
    /* r128 чете цвета на материала като линеен; на тъмно ментата и стъклото
       трябва да са цветовете на страницата, а не избелелите им линейни двойници. */
    if (dark) { glass.color.convertSRGBToLinear(); green.color.convertSRGBToLinear(); green.emissive.convertSRGBToLinear(); }
    var shards = [];
    var gapAt = new THREE.Vector3().copy(new Stadium(H, R, 0, 1).getPoint((GAP[0] + GAP[1]) / 2))
      .applyEuler(new THREE.Euler(Math.PI / 2, 0, 0)).add(new THREE.Vector3(0.95, 0, 0));
    [['tet', 0.16, [-0.2, 0.9, 0.5]], ['box', 0.12, [0.35, 1.15, -0.2]], ['oct', 0.14, [-0.65, 0.6, 0.85]],
     ['tet', 0.1, [0.15, -0.95, 0.6]], ['box', 0.09, [-0.5, -0.8, -0.4]], ['oct', 0.11, [0.55, -0.7, 0.3]],
     ['sph', 0.07, [-0.1, 1.45, 0.1]], ['tet', 0.08, [0.7, 0.4, 0.75]], ['box', 0.07, [-0.85, 0.1, -0.7]], ['sph', 0.06, [0.25, -1.35, -0.3]]]
      .forEach(function (d, i) {
        var g = d[0] === 'tet' ? new THREE.TetrahedronGeometry(d[1]) : d[0] === 'box' ? new THREE.BoxGeometry(d[1], d[1], d[1])
              : d[0] === 'oct' ? new THREE.OctahedronGeometry(d[1]) : new THREE.SphereGeometry(d[1], 16, 12);
        var m = new THREE.Mesh(g, green);
        m.userData = {
          base: new THREE.Vector3(gapAt.x + d[2][0], gapAt.y + d[2][1], gapAt.z + d[2][2]),
          // Между звената: по-тясно по оста на веригата, широко встрани.
          off: new THREE.Vector3(d[2][0] * 0.45, d[2][1] * 1.05, d[2][2] * 1.1),
          seed: i * 1.7 + 0.3
        };
        m.position.copy(m.userData.base);
        m.rotation.set(i, i * 0.7, i * 1.3);
        chain.add(m); shards.push(m);
      });

    /* Наклонът обръща скъсаното звено към гледащия. */
    var BASE = { x: -0.8, y: -0.35, z: -0.85 };
    chain.rotation.set(BASE.x, BASE.y, BASE.z);
    if (opts.scale) chain.scale.setScalar(opts.scale);
    scene.add(chain);

    /* Положението на веригата — за сплаша, където тя се затваря и къса.
       apart: звената раздалечени (1 — влизат отвън); shake: напъване, в
       радиани; broken: цялото звено става скъсано; burst ∈ [0, 1]: колко са
       излетели отломките; open: колко са се разделили звената след
       скъсването (расте заедно с burst). По подразбиране — скъсана и в покой. */
    var state = { apart: 0, shake: 0, broken: true, burst: 1, open: opts.gap === 'end' ? 0 : 0.85, mx: 0, my: 0, swing: true };
    function pose(p) { for (var k in p) state[k] = p[k]; }

    function size() {
      var el = opts.sizeFrom || canvas.parentElement || canvas;
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    function draw(t) {
      var s = (t || 0) / 1000;
      var swingY = state.swing ? Math.sin(s * 0.35) * 0.14 : 0;
      var swingX = state.swing ? Math.sin(s * 0.27) * 0.06 : 0;
      chain.rotation.y = BASE.y + swingY + state.mx * 0.22;
      chain.rotation.x = BASE.x + swingX + state.my * 0.16;
      chain.rotation.z = BASE.z + state.shake;
      var sep = state.apart + (state.broken ? state.open * state.burst : 0);
      link1.position.x = -0.95 - sep * 1.3;
      link2.position.x = 0.95 + sep * 1.3;
      whole.visible = !state.broken;
      torn.visible = state.broken;
      var b = state.broken ? state.burst : 0;
      /* При скъсване между звената отломките са в празното между тях:
         средата между дъгата на първото и пролуката на второто, която се
         мести, докато звената се разделят. */
      var from = gapAt, to = null;
      if (opts.gap !== 'end') {
        from = new THREE.Vector3((link1.position.x + H + R + link2.position.x - H - R) / 2, 0, 0);
      }
      shards.forEach(function (m) {
        var u = m.userData;
        m.visible = b > 0.01;
        to = opts.gap === 'end' ? u.base : from.clone().add(u.off);
        m.position.lerpVectors(from, to, b);
        m.position.y += Math.sin(s * 0.9 + u.seed) * 0.06 * b;
        m.scale.setScalar(0.4 + 0.6 * b);
        if (state.swing) { m.rotation.x += 0.004; m.rotation.y += 0.006; }
      });
      renderer.render(scene, camera);
    }

    /* Люлеенето от CoKitchen: малко, за да не завърта пролуката настрани;
       мишката го побутва. Без движение (prefers-reduced-motion) — един кадър. */
    function idle(stage) {
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var last = 0;
      if (stage) stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        state.mx = (e.clientX - r.left) / r.width - 0.5; state.my = (e.clientY - r.top) / r.height - 0.5;
      });
      if (window.ResizeObserver) new ResizeObserver(function () { size(); draw(last); }).observe(opts.sizeFrom || canvas.parentElement || canvas);
      draw(0);
      if (!still) (function loop(t) { last = t; draw(t); requestAnimationFrame(loop); })(0);
    }

    size();
    return { pose: pose, draw: draw, size: size, idle: idle, renderer: renderer };
  }

  window.GlassChain = GlassChain;
})();

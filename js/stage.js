/* =========================================================
   3D-СЦЕНА (three.js): атакующий → веб-приложение → база → внешний сервер
   Шаги атаки вызывают методы: focus, glow, say, packet, stream,
   dbState, shield, role, alarm, gather, bundle, at.
   ========================================================= */
(function () {
  'use strict';
  const T = window.THREE;
  const COL = { fire: 0xff6a1a, gold: 0xffb347, red: 0xff2a2a, ok: 0x35f0a0, grey: 0xc8b0a0, purple: 0xc77dff };
  const DEF_TINT = { attacker: COL.red, app: COL.fire, db: COL.fire, ext: COL.purple };
  const LAYOUT = {
    attacker: new T.Vector3(-4.3, 0, 0.4),
    app: new T.Vector3(0, 0, 0),
    db: new T.Vector3(4.3, 0, 0.4),
    ext: new T.Vector3(2.0, 0, -5.4)
  };
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  /* ---------- текстовая табличка-спрайт ---------- */
  class Label {
    constructor(text, color, h) {
      this.h = h || 0.4; this.canvas = document.createElement('canvas');
      this.sprite = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
      this.sprite.renderOrder = 20; this.set(text, color);
    }
    set(text, color) {
      this.text = text; this.color = color || '#ffd2b0';
      if (!text) { this.sprite.visible = false; return; }
      this.sprite.visible = true;
      const c = this.canvas, ctx = c.getContext('2d'), fs = 46, pad = 28;
      const font = `700 ${fs}px "JetBrains Mono", "Fira Code", monospace`;
      ctx.font = font;
      const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.round(fs * 1.75);
      c.width = w; c.height = h; ctx.font = font;
      roundRect(ctx, 3, 3, w - 6, h - 6, 18); ctx.fillStyle = 'rgba(24,12,8,0.88)'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = this.color; ctx.stroke();
      ctx.fillStyle = this.color; ctx.textBaseline = 'middle'; ctx.fillText(text, pad, h / 2 + 2);
      const old = this.sprite.material.map;
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearFilter;
      this.sprite.material.map = tex; this.sprite.material.needsUpdate = true; if (old) old.dispose();
      this.sprite.scale.set(this.h * w / h, this.h, 1);
    }
    refresh() { if (this.text) this.set(this.text, this.color); }
  }

  class Stage {
    constructor() {
      const r = this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.2;
      r.setClearColor(0x000000, 0);
      this.canvas = r.domElement; this.canvas.className = 'gl';
      this.scene = new T.Scene(); this.scene.fog = new T.Fog(0x1e100b, 14, 32);
      this.camera = new T.PerspectiveCamera(40, 1.6, 0.1, 100);
      this.cam = { pos: new T.Vector3(0, 4.6, 12.5), look: new T.Vector3(0, 0.8, -0.4), tPos: new T.Vector3(0, 4.6, 12.5), tLook: new T.Vector3(0, 0.8, -0.4) };
      this.aspect = 1.6; this.mouse = { x: 0, y: 0 }; this.t = 0;
      this.tweens = []; this.timers = []; this.labels = []; this.inst = false; this.mode = 'lab';
      this.alarmOn = false; this.shieldT = 0; this.roleLevel = 0; this.bundleState = null; this.running = false;
      this.GLOW = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
      this.G = { sphere: new T.SphereGeometry(0.13, 16, 12), box: new T.BoxGeometry(0.2, 0.2, 0.2) };

      this._lights(); this._world();
      this.root = new T.Group(); this.scene.add(this.root);
      this.fx = new T.Group(); this.scene.add(this.fx);
      this.nodes = {};
      this._attacker(); this._app(); this._db(); this._ext(); this._shield(); this._roleRings(); this._links();

      this.clock = new T.Clock();
      const loop = () => { requestAnimationFrame(loop); if (this.running) this.update(); };
      requestAnimationFrame(loop);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.labels.forEach(l => l.refresh()));
      this.ro = new ResizeObserver(() => this.resize());
    }

    /* ---------- монтирование в слайд ---------- */
    mount(host) {
      if (this.host) this.ro.unobserve(this.host);
      this.host = host; host.appendChild(this.canvas); this.ro.observe(host);
      host.onpointermove = e => { const b = host.getBoundingClientRect(); this.mouse.x = (e.clientX - b.left) / b.width - 0.5; this.mouse.y = (e.clientY - b.top) / b.height - 0.5; };
      host.onpointerleave = () => { this.mouse.x = 0; this.mouse.y = 0; };
      this.running = true; this.resize(); this.clock.getDelta();
    }
    unmount() { this.running = false; this.clearTimers(); }
    resize() {
      if (!this.host) return;
      const w = this.host.offsetWidth, h = this.host.offsetHeight; if (!w || !h) return;
      const scale = this.host.getBoundingClientRect().width / w || 1;
      this.renderer.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * scale));
      this.renderer.setSize(w, h, false);
      this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
      this.aspect = w / h; this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix();
      this.focus(this._focusName || 'all', true);
    }

    /* ---------- мир ---------- */
    _lights() {
      const s = this.scene;
      s.add(new T.HemisphereLight(0xffd2b0, 0x3a160a, 1.3));
      const key = new T.DirectionalLight(0xffe0c0, 1.6); key.position.set(4, 9, 7); s.add(key);
      this.fireLight = new T.PointLight(0xff6a1a, 40, 22, 1.4); this.fireLight.position.set(0, 3.2, 3.5); s.add(this.fireLight);
      this.alarmLight = new T.PointLight(0xff1a1a, 0, 24, 1.3); this.alarmLight.position.set(2, 4.5, 2); s.add(this.alarmLight);
      this.okLight = new T.PointLight(0x35f0a0, 0, 16, 1.4); this.okLight.position.set(2, 3, 2.5); s.add(this.okLight);
    }
    _world() {
      const grid = new T.GridHelper(70, 70, 0xff6a1a, 0x6a2c16);
      grid.material.transparent = true; grid.material.opacity = 0.32; grid.material.depthWrite = false; this.scene.add(grid);
      this.grid = grid;
      const glow = new T.Mesh(new T.PlaneGeometry(34, 22), new T.MeshBasicMaterial({
        map: radialTex([[0, 'rgba(255,110,40,.55)'], [0.45, 'rgba(255,70,20,.18)'], [1, 'rgba(0,0,0,0)']]),
        transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.005; this.scene.add(glow);
      // искры
      const N = 280, pos = new Float32Array(N * 3); this.emberV = new Float32Array(N);
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = -10 + Math.random() * 14; this.emberV[i] = 0.25 + Math.random() * 0.8; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.embers = new T.Points(g, new T.PointsMaterial({ size: 0.13, map: this.GLOW, color: 0xff8a3a, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
      this.scene.add(this.embers);
    }
    _metal(c, rough) { return new T.MeshStandardMaterial({ color: c || 0x2c1e18, metalness: 0.75, roughness: rough || 0.38 }); }
    _glowMat(c, k) { return new T.MeshStandardMaterial({ color: 0x1a0a06, emissive: c, emissiveIntensity: k || 2.2, metalness: 0.2, roughness: 0.5 }); }

    _node(name, label, color, anchorY) {
      const g = new T.Group(); g.name = name; g.position.copy(LAYOUT[name]);
      const ringMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const ring = new T.Mesh(new T.RingGeometry(1.08, 1.26, 6), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
      const discMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false });
      const disc = new T.Mesh(new T.CircleGeometry(1.08, 6), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.015; g.add(disc);
      const body = new T.Group(); g.add(body);
      const lab = new Label(label, '#ffd9bf', 0.34); lab.sprite.position.y = anchorY + 0.75; g.add(lab.sprite); this.labels.push(lab);
      const bub = new Label(null, '#ffb347', 0.4); bub.sprite.position.y = anchorY + 1.4; g.add(bub.sprite); this.labels.push(bub);
      g.userData = { body, ring, disc, label: lab, bubble: bub, glow: [], tint: new T.Color(color), tintT: new T.Color(color), anchorY, shake: 0, pulse: 0, visT: 1, vis: 1 };
      this.root.add(g); this.nodes[name] = g; return g;
    }
    _addGlow(node, mesh, prop) { node.userData.glow.push({ m: mesh.material, p: prop || 'emissive' }); }

    _attacker() {
      const n = this._node('attacker', 'АТАКУЮЩИЙ', COL.red, 1.45), b = n.userData.body;
      const ped = new T.Mesh(new T.CylinderGeometry(0.7, 0.85, 0.5, 6), this._metal(0x2a1a14)); ped.position.y = 0.25; b.add(ped);
      const base = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 1.0), this._metal(0x3b2a22)); base.position.y = 0.54; b.add(base);
      const kb = new T.Mesh(new T.PlaneGeometry(1.25, 0.55), this._glowMat(COL.red, 1.2)); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.585, 0.08); b.add(kb); this._addGlow(n, kb);
      const scr = new T.Group(); scr.position.set(0, 0.58, -0.46); scr.rotation.x = -0.22; b.add(scr);
      const lid = new T.Mesh(new T.BoxGeometry(1.5, 1.0, 0.06), this._metal(0x3b2a22)); lid.position.y = 0.5; scr.add(lid);
      this.termCanvas = document.createElement('canvas'); this.termCanvas.width = 512; this.termCanvas.height = 320;
      this.termTex = new T.CanvasTexture(this.termCanvas); this.termTex.colorSpace = T.SRGBColorSpace;
      const disp = new T.Mesh(new T.PlaneGeometry(1.36, 0.86), new T.MeshBasicMaterial({ map: this.termTex, toneMapped: false }));
      disp.position.set(0, 0.5, 0.035); scr.add(disp); this._drawTerm(0);
      // "капюшон" — светящийся ореол за ноутбуком
      const halo = new T.Sprite(new T.SpriteMaterial({ map: this.GLOW, color: COL.red, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }));
      halo.scale.set(3, 2.2, 1); halo.position.set(0, 1.1, -0.7); b.add(halo); n.userData.halo = halo;
    }
    _drawTerm(t) {
      const c = this.termCanvas.getContext('2d');
      c.fillStyle = '#140806'; c.fillRect(0, 0, 512, 320);
      c.font = '700 26px monospace';
      const lines = ['user@h4x:~$ scan shop.local', '> поиск уязвимостей…', '> form: /login  [OK]', '> 0x4F 0x52 0x20 0x31', '▓▓▓▓▓▓▓▓▓░░░ ' + (60 + (t % 40)) + '%', 'user@h4x:~$ _'];
      lines.forEach((l, i) => { c.fillStyle = i === 4 ? '#ffb347' : i % 2 ? '#ff6a1a' : '#ff9a6a'; c.fillText(l, 18, 42 + i * 46); });
      if (this.termTex) this.termTex.needsUpdate = true;
    }
    _app() {
      const n = this._node('app', 'ВЕБ-ПРИЛОЖЕНИЕ', COL.fire, 2.35), b = n.userData.body;
      const rack = new T.Mesh(new T.BoxGeometry(1.3, 2.3, 1.1), this._metal(0x241712)); rack.position.y = 1.15; b.add(rack);
      this.leds = [];
      for (let i = 0; i < 6; i++) {
        const y = 0.3 + i * 0.34;
        const u = new T.Mesh(new T.BoxGeometry(1.16, 0.26, 0.04), this._metal(0x3a2820, 0.3)); u.position.set(0, y, 0.56); b.add(u);
        const slit = new T.Mesh(new T.BoxGeometry(0.62, 0.035, 0.02), this._glowMat(COL.fire, 1.6)); slit.position.set(-0.18, y, 0.585); b.add(slit); this._addGlow(n, slit);
        const led = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.03), this._glowMat(i % 2 ? COL.gold : COL.fire, 3)); led.position.set(0.42, y, 0.585); b.add(led); this.leds.push(led);
      }
      const top = new T.Mesh(new T.BoxGeometry(1.32, 0.05, 1.12), this._glowMat(COL.fire, 1.4)); top.position.y = 2.32; b.add(top); this._addGlow(n, top);
    }
    _db() {
      const n = this._node('db', 'БАЗА ДАННЫХ', COL.fire, 1.95), b = n.userData.body;
      for (let i = 0; i < 3; i++) {
        const y = 0.32 + i * 0.62;
        const cyl = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 0.5, 48), this._metal(0x2a1c16)); cyl.position.y = y; b.add(cyl);
        const ring = new T.Mesh(new T.TorusGeometry(0.965, 0.04, 8, 64), this._glowMat(COL.fire, 2.6)); ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.27; b.add(ring); this._addGlow(n, ring);
        const ring2 = new T.Mesh(new T.TorusGeometry(0.965, 0.025, 8, 64), this._glowMat(COL.fire, 1.6)); ring2.rotation.x = Math.PI / 2; ring2.position.y = y - 0.2; b.add(ring2); this._addGlow(n, ring2);
      }
      const cap = new T.Mesh(new T.CircleGeometry(0.8, 48), this._glowMat(COL.fire, 1.2)); cap.rotation.x = -Math.PI / 2; cap.position.y = 1.83; b.add(cap); this._addGlow(n, cap);
      const core = new T.Sprite(new T.SpriteMaterial({ map: this.GLOW, color: COL.fire, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
      core.scale.set(3.4, 3.4, 1); core.position.y = 1.0; b.add(core); this._addGlow(n, core, 'color');
    }
    _ext() {
      const n = this._node('ext', 'ВНЕШНИЙ СЕРВЕР', COL.purple, 2.2), b = n.userData.body;
      const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.12, 1.0, 8), this._metal()); pole.position.y = 0.5; b.add(pole);
      const wire = new T.Mesh(new T.IcosahedronGeometry(0.85, 1), new T.MeshBasicMaterial({ color: COL.purple, wireframe: true, transparent: true, opacity: 0.85 }));
      wire.position.y = 1.55; b.add(wire); this._addGlow(n, wire, 'color'); this.globe = wire;
      const inner = new T.Mesh(new T.SphereGeometry(0.5, 24, 16), this._glowMat(COL.purple, 1.6)); inner.position.y = 1.55; b.add(inner); this._addGlow(n, inner);
    }
    _shield() {
      const g = this.shieldG = new T.Group();
      const m = new T.MeshBasicMaterial({ color: COL.ok, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false });
      const hex = new T.Mesh(new T.TorusGeometry(1.3, 0.06, 8, 6), m); g.add(hex);
      const hex2 = new T.Mesh(new T.TorusGeometry(0.85, 0.03, 6, 6), m); g.add(hex2); this.hexInner = hex2;
      const disc = new T.Mesh(new T.CircleGeometry(1.3, 6), new T.MeshBasicMaterial({ color: COL.ok, transparent: true, opacity: 0.16, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); g.add(disc);
      this.shieldLabel = new Label('ЗАЩИТА', '#35f0a0', 0.34); this.labels.push(this.shieldLabel);
      this.shieldLabel.sprite.position.y = -1.6; g.add(this.shieldLabel.sprite);
      g.scale.setScalar(0.001); g.visible = false; this.scene.add(g);
    }
    _roleRings() {
      this.roleRings = [];
      [COL.gold, COL.fire, COL.red].forEach((c, i) => {
        const r = new T.Mesh(new T.TorusGeometry(1.0 + i * 0.14, 0.035, 8, 64), this._glowMat(c, 3));
        r.rotation.x = Math.PI / 2; r.position.y = 0.3 + i * 0.5; r.scale.setScalar(0.001); r.visible = false;
        this.nodes.attacker.add(r); this.roleRings.push(r);
      });
      this.roleBadge = new Label(null, '#ffb347', 0.36); this.labels.push(this.roleBadge);
      this.roleBadge.sprite.position.y = 1.45 + 2.05; this.nodes.attacker.add(this.roleBadge.sprite);
    }
    _links() {
      this.links = [];
      const mk = (a, b, arc) => {
        const pa = this.anchor(a), pb = this.anchor(b), mid = pa.clone().lerp(pb, 0.5); mid.y += arc;
        const pts = new T.QuadraticBezierCurve3(pa, mid, pb).getPoints(48);
        const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: COL.fire, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false }));
        this.scene.add(line); const L = { a, b, line, act: 0 }; this.links.push(L); return L;
      };
      mk('attacker', 'app', 1.2); mk('app', 'db', 1.2); mk('db', 'ext', 1.4); mk('ext', 'attacker', 1.4);
    }
    anchor(name) { const n = this.nodes[name]; return LAYOUT[name].clone().add(new T.Vector3(0, n ? n.userData.anchorY * 0.62 : 1, 0)); }
    _act(a, b) { this.links.forEach(L => { if ((L.a === a && L.b === b) || (L.a === b && L.b === a)) L.act = 1; }); }

    /* ---------- время ---------- */
    tween(dur, fn, done) { const tw = { t: 0, dur: Math.max(0.0001, dur), fn, done }; this.tweens.push(tw); return tw; }
    later(ms, fn) { const id = setTimeout(() => { this.timers = this.timers.filter(x => x !== id); fn(); }, ms); this.timers.push(id); }
    clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
    at(ms, fn) { if (this.inst) fn(); else this.later(ms, fn); }

    /* ---------- API для шагов ---------- */
    focus(name, keep) {
      this._focusName = name;
      const k = Math.max(1, 1.78 / this.aspect);
      const allPos = new T.Vector3(0, 3.5 * k, 10.4 * k), allLook = new T.Vector3(0, 1.05, -0.4);
      if (name === 'all' || !this.nodes[name]) { this.cam.tPos.copy(allPos); this.cam.tLook.copy(allLook); }
      else {
        const p = LAYOUT[name];
        const near = p.clone().add(new T.Vector3(p.x * 0.1, 2.8, 7.5));
        this.cam.tPos.copy(allPos.clone().lerp(near, 0.28));
        this.cam.tLook.copy(allLook.clone().lerp(p.clone().add(new T.Vector3(0, 1, 0)), 0.4));
      }
      if (this.inst && !keep) { this.cam.pos.copy(this.cam.tPos); this.cam.look.copy(this.cam.tLook); }
    }
    glow(name, color) { const u = this.nodes[name].userData; u.tintT.set(color); if (this.inst) u.tint.set(color); }
    say(name, text, color) { this.nodes[name].userData.bubble.set(text, color); }
    show(name, on) { const u = this.nodes[name].userData; u.visT = on ? 1 : 0; if (this.inst) u.vis = u.visT; }
    pulse(name) { if (!this.inst) this.nodes[name].userData.pulse = 1; }
    shake(name) { if (!this.inst) this.nodes[name].userData.shake = 1; }
    alarm(on) { this.alarmOn = !!on; }
    dbState(st) {
      const c = st === 'hacked' ? COL.red : st === 'safe' ? COL.ok : COL.fire;
      this.glow('db', c); if (st === 'hacked') this.shake('db');
      this.dbSafe = st === 'safe';
    }
    role(level) {
      this.roleLevel = level;
      const names = [['роль: user', '#ffb347'], ['роль: admin', '#ff6a1a'], ['роль: DBA / superuser', '#ff2a2a']];
      this.roleBadge.set(names[level][0], names[level][1]);
      this.roleRings.forEach((r, i) => { r.userData.t = i < level ? 1 : 0; if (this.inst) r.scale.setScalar(Math.max(0.001, r.userData.t)); });
      if (!this.inst && level > 0) { this.pulse('attacker'); this.burst(this.anchor('attacker').add(new T.Vector3(0, 1, 0)), level > 1 ? COL.red : COL.fire, 50); }
    }
    shield(on, a, b, f) {
      this.shieldT = on ? 1 : 0;
      if (on) {
        const pa = this.anchor(a), pb = this.anchor(b);
        const p = pa.clone().lerp(pb, f || 0.62); p.y = Math.max(p.y, 1.25) + 0.25;
        this.shieldG.position.copy(p);
        const dir = pb.clone().sub(pa).setY(0).normalize();
        this.shieldG.lookAt(p.x + dir.x, p.y, p.z + dir.z + 1.3);   // повёрнут к зрителю
        this.shieldPos = p; this.shieldPair = [a, b];
        if (this.inst) this.shieldG.scale.setScalar(1);
        else this.burst(p, COL.ok, 60);
      }
      if (this.inst && !on) this.shieldG.scale.setScalar(0.001);
    }
    burst(pos, color, n) {
      if (this.inst) return;
      n = n || 36; const g = new T.BufferGeometry(), p = new Float32Array(n * 3), v = [];
      for (let i = 0; i < n; i++) { p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z; v.push(new T.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(1.5 + Math.random() * 2.5)); }
      g.setAttribute('position', new T.BufferAttribute(p, 3));
      const m = new T.PointsMaterial({ size: 0.22, map: this.GLOW, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      const pts = new T.Points(g, m); this.fx.add(pts);
      this.tween(0.9, k => {
        const a = g.attributes.position.array;
        for (let i = 0; i < n; i++) { a[i * 3] = pos.x + v[i].x * k; a[i * 3 + 1] = pos.y + v[i].y * k - k * k * 0.8; a[i * 3 + 2] = pos.z + v[i].z * k; }
        g.attributes.position.needsUpdate = true; m.opacity = 1 - k;
      }, () => { this.fx.remove(pts); g.dispose(); m.dispose(); });
    }
    packet(from, to, o) {
      if (this.inst) return; o = o || {};
      const count = o.count || 1, gap = o.gap || 200;
      for (let i = 0; i < count; i++) this.later((o.delay || 0) + i * gap, () => this._fly(from, to, o));
    }
    stream(from, to, o) { o = Object.assign({ count: 14, gap: 120, cube: true, size: 0.9, dur: 1.5 }, o || {}); this.packet(from, to, o); }
    _fly(from, to, o) {
      const a = this.anchor(from), b = this.anchor(to), mid = a.clone().lerp(b, 0.5);
      mid.y += o.arc || 1.4; mid.x += (Math.random() - 0.5) * 0.4; mid.z += (Math.random() - 0.5) * 0.6;
      const curve = new T.QuadraticBezierCurve3(a, mid, b);
      const color = o.color || COL.fire, size = o.size || 1;
      const mat = new T.MeshBasicMaterial({ color, toneMapped: false });
      const head = new T.Mesh(o.cube ? this.G.box : this.G.sphere, mat); head.scale.setScalar(size);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: this.GLOW, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      halo.scale.setScalar(0.9 * size); head.add(halo);
      const trail = [];
      for (let i = 0; i < 6; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: this.GLOW, color, transparent: true, opacity: 0.6 - i * 0.09, depthWrite: false, blending: T.AdditiveBlending })); s.scale.setScalar((0.45 - i * 0.05) * size); trail.push(s); this.fx.add(s); }
      this.fx.add(head); this._act(from, to);
      let end = 1;
      if (o.block && this.shieldPos) {   // найти точку пересечения со щитом
        let best = 1, bd = 1e9; for (let k = 0; k <= 1; k += 0.01) { const d = curve.getPoint(k).distanceTo(this.shieldPos); if (d < bd) { bd = d; best = k; } }
        end = best;
      }
      const dur = (o.dur || 1.25) * end;
      this.tween(dur, k => {
        const e = ease(k) * end; head.position.copy(curve.getPoint(e)); head.rotation.x += 0.1; head.rotation.y += 0.13;
        trail.forEach((s, i) => s.position.copy(curve.getPoint(Math.max(0, e - (i + 1) * 0.022))));
      }, () => {
        const p = head.position.clone();
        this.fx.remove(head); trail.forEach(s => { this.fx.remove(s); s.material.dispose(); }); halo.material.dispose(); mat.dispose();
        if (o.block) { this.burst(p, COL.ok, 40); this.shieldHit = 1; }
        else if (o.hit) { this.burst(p, color, 28); this.pulse(to); }
      });
    }
    gather(name) {
      const c = this.anchor(name).add(new T.Vector3(0, 1.4, 0));
      this.bundle('raw');
      if (this.inst) return;
      this.bundleG.scale.setScalar(0.001);
      for (let i = 0; i < 18; i++) this.later(i * 70, () => {
        const ang = Math.random() * Math.PI * 2, r = 2 + Math.random() * 1.2;
        const st = c.clone().add(new T.Vector3(Math.cos(ang) * r, -1.2 + Math.random() * 2, Math.sin(ang) * r));
        const m = new T.MeshBasicMaterial({ color: [COL.gold, COL.fire, COL.red][i % 3], toneMapped: false });
        const cube = new T.Mesh(this.G.box, m); cube.position.copy(st); this.fx.add(cube);
        this.tween(0.9, k => { cube.position.lerpVectors(st, c, ease(k)); cube.rotation.x += 0.15; cube.scale.setScalar(1 - k * 0.6); },
          () => { this.fx.remove(cube); m.dispose(); });
      });
      this.later(1300, () => { this.bundleScaleT = 1; this.burst(c, COL.gold, 30); });
    }
    bundle(state) {
      this.bundleState = state;
      if (!this.bundleG) {
        const g = this.bundleG = new T.Group();
        const wire = new T.Mesh(new T.BoxGeometry(0.75, 0.75, 0.75), new T.MeshBasicMaterial({ color: COL.gold, wireframe: true, toneMapped: false }));
        const core = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.5), new T.MeshBasicMaterial({ color: COL.fire, transparent: true, opacity: 0.85, toneMapped: false }));
        const halo = new T.Sprite(new T.SpriteMaterial({ map: this.GLOW, color: COL.gold, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); halo.scale.setScalar(2.2);
        g.add(wire, core, halo); g.userData = { wire, core, halo }; this.scene.add(g);
      }
      const g = this.bundleG, u = g.userData;
      g.position.copy(this.anchor('db').add(new T.Vector3(0, 1.4, 0)));
      if (!state) { this.bundleScaleT = 0; if (this.inst) g.scale.setScalar(0.001); return; }
      const packed = state === 'packed';
      u.wire.material.color.set(packed ? COL.purple : COL.gold); u.core.material.color.set(packed ? 0x6a2aa0 : COL.fire); u.halo.material.color.set(packed ? COL.purple : COL.gold);
      this.bundleScaleT = packed ? 0.6 : 1;
      if (this.inst) g.scale.setScalar(this.bundleScaleT);
      else if (packed) this.burst(g.position, COL.purple, 30);
    }

    /* ---------- сброс и запуск шагов ---------- */
    reset(topic) {
      this.clearTimers(); this.tweens = [];
      while (this.fx.children.length) this.fx.remove(this.fx.children[0]);
      this.inst = true;
      Object.keys(this.nodes).forEach(k => { this.glow(k, DEF_TINT[k]); this.say(k, null); });
      this.show('ext', !!(topic && topic.id === 'exfil') || this.mode === 'hero');
      this.alarm(false); this.shield(false); this.dbSafe = false;
      this.roleRings.forEach(r => { r.userData.t = 0; r.scale.setScalar(0.001); });
      if (topic && topic.id === 'privesc') this.role(0); else this.roleBadge.set(null);
      this.bundle(null);
      this.focus('all');
      this.inst = false;
    }
    run(topic, i, instantAll) {
      this.mode = 'lab'; this.topic = topic; this.reset(topic);
      this.inst = true;
      const last = instantAll ? i : i - 1;
      for (let j = 0; j <= last; j++) topic.steps[j].do(this);
      this.inst = false;
      if (!instantAll && i >= 0) topic.steps[i].do(this);
    }
    hero() {
      this.mode = 'hero'; this.topic = null; this.reset(null);
      this.say('attacker', 'SQLi · NoSQLi', '#ffb347'); this.say('db', 'Privilege Escalation', '#ff6a1a'); this.say('ext', 'Data Exfiltration', '#c77dff');
      const loop = () => {
        if (this.mode !== 'hero') return;
        this.packet('attacker', 'app', { color: COL.fire, hit: true });
        this.later(900, () => this.packet('app', 'db', { color: COL.red, hit: true }));
        this.later(2000, () => this.stream('db', 'ext', { color: COL.purple, count: 6, size: 0.6 }));
        this.later(3000, () => this.stream('ext', 'attacker', { color: COL.purple, count: 4, size: 0.6 }));
        this.later(4200, loop);
      };
      loop();
    }

    /* ---------- кадр ---------- */
    update() {
      const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt; const t = this.t;
      // твины
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
        if (k >= 1) { this.tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      // узлы
      Object.values(this.nodes).forEach(n => {
        const u = n.userData;
        u.tint.lerp(u.tintT, Math.min(1, dt * 4));
        u.glow.forEach(g => g.m[g.p].copy(u.tint));
        u.ring.material.color.copy(u.tint); u.disc.material.color.copy(u.tint);
        u.ring.rotation.z += dt * 0.25;
        if (u.halo) u.halo.material.color.copy(u.tint);
        u.vis += (u.visT - u.vis) * Math.min(1, dt * 5); n.scale.setScalar(Math.max(0.001, u.vis)); n.visible = u.vis > 0.02;
        u.shake = Math.max(0, u.shake - dt * 1.2); u.body.position.x = Math.sin(t * 55) * 0.09 * u.shake;
        u.pulse = Math.max(0, u.pulse - dt * 2.5); const s = 1 + Math.sin(u.pulse * Math.PI) * 0.12; u.body.scale.setScalar(s);
        u.body.position.y = n.name === 'ext' ? Math.sin(t * 1.5) * 0.08 : 0;
      });
      this.leds.forEach((l, i) => { l.material.emissiveIntensity = (Math.sin(t * (3 + i) + i * 7) > 0.2 ? 3.2 : 0.4); });
      if (Math.floor(t * 2) !== this._termTick) { this._termTick = Math.floor(t * 2); this._drawTerm(this._termTick); }
      this.globe.rotation.y += dt * 0.6; this.globe.rotation.x += dt * 0.15;
      // щит
      const sg = this.shieldG, ts = Math.max(0.001, this.shieldT), cur = sg.scale.x;
      sg.scale.setScalar(cur + (ts - cur) * Math.min(1, dt * 5)); sg.visible = sg.scale.x > 0.02;
      this.hexInner.rotation.z -= dt * 0.8;
      this.shieldHit = Math.max(0, (this.shieldHit || 0) - dt * 3);
      sg.children[0].scale.setScalar(1 + this.shieldHit * 0.15);
      // кольца ролей
      this.roleRings.forEach((r, i) => { const tt = Math.max(0.001, r.userData.t || 0); const c = r.scale.x; r.scale.setScalar(c + (tt - c) * Math.min(1, dt * 4)); r.visible = r.scale.x > 0.02; r.rotation.z += dt * (1 + i); r.position.y = 0.3 + i * 0.5 + Math.sin(t * 2 + i) * 0.05; });
      // пакет данных
      if (this.bundleG) { const g = this.bundleG, bt = Math.max(0.001, this.bundleScaleT || 0), c = g.scale.x; g.scale.setScalar(c + (bt - c) * Math.min(1, dt * 5)); g.visible = g.scale.x > 0.02; g.rotation.y += dt * (this.bundleState === 'packed' ? 2.4 : 0.8); g.rotation.x += dt * 0.4; }
      // связи
      this.links.forEach(L => {
        L.act = Math.max(0, L.act - dt * 0.8);
        const vis = this.nodes[L.a].visible && this.nodes[L.b].visible;
        L.line.visible = vis; L.line.material.opacity = 0.16 + L.act * 0.7;
      });
      // искры
      const a = this.embers.geometry.attributes.position.array;
      for (let i = 0; i < this.emberV.length; i++) {
        a[i * 3 + 1] += this.emberV[i] * dt; a[i * 3] += Math.sin(t * 1.3 + i) * dt * 0.15;
        if (a[i * 3 + 1] > 9) a[i * 3 + 1] = 0;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
      // свет
      this.fireLight.intensity = 38 + Math.sin(t * 7) * 4 + Math.sin(t * 17) * 2;
      const al = this.alarmOn ? (Math.sin(t * 9) > 0 ? 90 : 12) : 0;
      this.alarmLight.intensity += (al - this.alarmLight.intensity) * Math.min(1, dt * 12);
      const okT = this.dbSafe ? 30 : 0; this.okLight.intensity += (okT - this.okLight.intensity) * Math.min(1, dt * 3);
      // камера
      const c = this.cam; c.pos.lerp(c.tPos, Math.min(1, dt * 2.2)); c.look.lerp(c.tLook, Math.min(1, dt * 2.2));
      const p = c.pos.clone();
      if (this.mode === 'hero') { const ang = Math.sin(t * 0.18) * 0.35; const r = Math.hypot(p.x, p.z); p.x = Math.sin(ang) * r; p.z = Math.cos(ang) * r; }
      else { p.x += Math.sin(t * 0.3) * 0.35; }
      p.x += this.mouse.x * 1.6; p.y -= this.mouse.y * 1.0;
      this.camera.position.copy(p); this.camera.lookAt(c.look);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.Stage = Stage;
})();

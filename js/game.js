/* =========================================================
   ИГРА «ВЗЛОМАЙ БАЗУ»
   ========================================================= */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const deck = $('deck');
  const TCOL = ['#ff6a1a', '#58c8ff', '#35f0a0', '#c77dff'];
  const TDEF = ['Red Team', 'Blue Team', 'Green Team', 'Purple Team'];
  const TOPIC_NAME = { sqli: 'SQL Injection', nosql: 'NoSQL Injection', privesc: 'Privilege Escalation', exfil: 'Data Exfiltration', all: 'Общий вопрос' };
  const TOPIC_COL = { sqli: '#ff6a1a', nosql: '#ffb347', privesc: '#ff3d2e', exfil: '#c77dff', all: '#35f0a0' };

  /* ---------- масштаб ---------- */
  function fit() { const s = Math.min(innerWidth / 1600, innerHeight / 900); deck.style.position = 'absolute'; deck.style.left = '50%'; deck.style.top = '50%'; deck.style.transform = `translate(-50%,-50%) scale(${s})`; if (vault) vault.resize(); }

  /* ---------- звук (WebAudio, без файлов) ---------- */
  let AC = null, muted = false;
  try { muted = localStorage.getItem('dbsec-mute') === '1'; } catch (e) { /* ignore */ }
  function tone(f, d, type, vol, slide) {
    if (muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* ignore */ }
  }
  const sfx = {
    ok: () => { tone(523, 0.12, 'square'); setTimeout(() => tone(784, 0.12, 'square'), 110); setTimeout(() => tone(1046, 0.25, 'square'), 220); },
    bad: () => { tone(220, 0.35, 'sawtooth', 0.07, 90); },
    tick: () => tone(1200, 0.04, 'square', 0.03),
    start: () => { [262, 330, 392, 523].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.08), i * 90)); },
    win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.08), i * 140)); }
  };
  const SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
  const SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/></svg>';
  const setSnd = () => { $('bSound').innerHTML = muted ? SND_OFF : SND_ON; };
  $('bSound').onclick = () => { muted = !muted; try { localStorage.setItem('dbsec-mute', muted ? '1' : '0'); } catch (e) { /* ignore */ } setSnd(); };
  setSnd();
  $('bFull').onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); };

  /* =========================================================
     3D-ХРАНИЛИЩЕ: база в центре, вокруг — слои защиты
     ========================================================= */
  class Vault {
    constructor(host) {
      const T = THREE; this.T = T; this.host = host;
      const r = this.r = new T.WebGLRenderer({ antialias: true, alpha: true });
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.2;
      host.appendChild(r.domElement);
      this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(38, 1, 0.1, 100);
      this.scene.add(new T.HemisphereLight(0xffd2b0, 0x3a160a, 1.2));
      const d = new T.DirectionalLight(0xffe0c0, 1.5); d.position.set(3, 6, 5); this.scene.add(d);
      this.light = new T.PointLight(0xff6a1a, 40, 20, 1.4); this.light.position.set(0, 2, 3); this.scene.add(this.light);
      // свечение-текстура
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this.glowTex = new T.CanvasTexture(c);
      // база
      this.db = new T.Group(); this.scene.add(this.db); this.dbGlow = [];
      for (let i = 0; i < 3; i++) {
        const y = -0.7 + i * 0.62;
        const cyl = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 0.5, 48), new T.MeshStandardMaterial({ color: 0x5a3426, metalness: 0.45, roughness: 0.4 }));
        cyl.position.y = y; this.db.add(cyl);
        const m = new T.MeshStandardMaterial({ color: 0x1a0a06, emissive: 0x35f0a0, emissiveIntensity: 2.4 });
        const ring = new T.Mesh(new T.TorusGeometry(0.815, 0.035, 8, 64), m); ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.27; this.db.add(ring); this.dbGlow.push(m);
      }
      const core = new T.Sprite(new T.SpriteMaterial({ map: this.glowTex, color: 0x35f0a0, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending }));
      core.scale.set(3.2, 3.2, 1); this.db.add(core); this.coreMat = core.material;
      // пол
      const grid = new T.GridHelper(30, 30, 0xff6a1a, 0x6a2c16); grid.position.y = -1.2; grid.material.transparent = true; grid.material.opacity = 0.3; this.scene.add(grid);
      // искры
      const N = 160, pos = new Float32Array(N * 3); this.ev = [];
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = -1.2 + Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 8; this.ev.push(0.2 + Math.random() * 0.7); }
      const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.embers = new T.Points(eg, new T.PointsMaterial({ size: 0.1, map: this.glowTex, color: 0xff8a3a, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.scene.add(this.embers);
      this.shields = []; this.fx = []; this.t = 0; this.hack = 0; this.flash = 0; this.flashCol = new T.Color(0x35f0a0);
      this.clock = new T.Clock(); this.setLayers(8);
      const loop = () => { requestAnimationFrame(loop); this.update(); }; loop();
      this.resize();
    }
    setLayers(n) {
      const T = this.T; this.shields.forEach(s => this.scene.remove(s)); this.shields = [];
      this.total = n;
      const vis = Math.min(n, 10);
      for (let i = 0; i < vis; i++) {
        const k = i / Math.max(1, vis - 1);
        const col = new T.Color().setHSL(0.42 - k * 0.42, 0.95, 0.55);   // зелёный → оранжевый снаружи
        const m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
        const hex = new T.Mesh(new T.TorusGeometry(1.15 + i * 0.2, 0.03, 6, 6), m);
        hex.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4; hex.rotation.y = (Math.random() - 0.5) * 0.4;
        hex.userData = { sp: (i % 2 ? 1 : -1) * (0.2 + Math.random() * 0.4), y: Math.sin(i) * 0.1 };
        this.scene.add(hex); this.shields.push(hex);
      }
      this.alive = this.shields.length; this.hack = 0; this.setHack(0);
    }
    setHack(p) { this.hack = p; const c = new this.T.Color(0x35f0a0).lerp(new this.T.Color(0xff2a2a), p); this.dbGlow.forEach(m => m.emissive.copy(c)); this.coreMat.color.copy(c); }
    breakLayer(p) {
      const want = Math.round(this.shields.length * (1 - p));
      while (this.alive > want) {
        const s = this.shields[this.alive - 1]; this.alive--;
        this.burst(s.material.color, 1.15 + this.alive * 0.2); s.visible = false;
      }
      this.setHack(p); this.flash = 1; this.flashCol.set(0xff6a1a);
    }
    defend() { this.flash = 1; this.flashCol.set(0x35f0a0); this.shields.forEach(s => s.userData.kick = 1); }
    burst(color, rad) {
      const T = this.T, n = 80, g = new T.BufferGeometry(), p = new Float32Array(n * 3), v = [];
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; p[i * 3] = Math.cos(a) * rad; p[i * 3 + 1] = 0; p[i * 3 + 2] = Math.sin(a) * rad; v.push(new T.Vector3(Math.cos(a) * 2.5, (Math.random() - 0.3) * 3, Math.sin(a) * 2.5)); }
      g.setAttribute('position', new T.BufferAttribute(p, 3));
      const m = new T.PointsMaterial({ size: 0.16, map: this.glowTex, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
      const pts = new T.Points(g, m); this.scene.add(pts); this.fx.push({ pts, v, base: p.slice(), t: 0 });
    }
    resize() { const w = this.host.offsetWidth, h = this.host.offsetHeight; if (!w || !h) return; const sc = this.host.getBoundingClientRect().width / w || 1; this.r.setPixelRatio(Math.min(2, devicePixelRatio * sc)); this.r.setSize(w, h, false); this.r.domElement.style.width = '100%'; this.r.domElement.style.height = '100%'; this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    update() {
      const dt = Math.min(0.05, this.clock.getDelta()); this.t += dt; const t = this.t;
      this.db.rotation.y += dt * 0.4;
      this.shields.forEach((s, i) => { s.rotation.z += dt * s.userData.sp; s.userData.kick = Math.max(0, (s.userData.kick || 0) - dt * 2); s.scale.setScalar(1 + s.userData.kick * 0.08); s.position.y = s.userData.y + Math.sin(t + i) * 0.05; });
      for (let i = this.fx.length - 1; i >= 0; i--) {
        const f = this.fx[i]; f.t += dt; const a = f.pts.geometry.attributes.position.array;
        for (let j = 0; j < f.v.length; j++) { a[j * 3] = f.base[j * 3] + f.v[j].x * f.t; a[j * 3 + 1] = f.base[j * 3 + 1] + f.v[j].y * f.t - f.t * f.t * 1.5; a[j * 3 + 2] = f.base[j * 3 + 2] + f.v[j].z * f.t; }
        f.pts.geometry.attributes.position.needsUpdate = true; f.pts.material.opacity = Math.max(0, 1 - f.t);
        if (f.t > 1) { this.scene.remove(f.pts); f.pts.geometry.dispose(); f.pts.material.dispose(); this.fx.splice(i, 1); }
      }
      const a = this.embers.geometry.attributes.position.array;
      for (let i = 0; i < this.ev.length; i++) { a[i * 3 + 1] += this.ev[i] * dt; if (a[i * 3 + 1] > 5) a[i * 3 + 1] = -1.2; }
      this.embers.geometry.attributes.position.needsUpdate = true;
      this.flash = Math.max(0, this.flash - dt * 1.5);
      this.light.color.set(0xff6a1a).lerp(this.flashCol, this.flash);
      this.light.intensity = 38 + Math.sin(t * 7) * 4 + this.flash * 60;
      const ang = t * 0.15;
      const R = 7.4 * Math.max(1, 1.15 / this.cam.aspect);
      this.cam.position.set(Math.sin(ang) * R, R * 0.42 + Math.sin(t * 0.4) * 0.3, Math.cos(ang) * R); this.cam.lookAt(0, 0.15, 0);
      this.r.render(this.scene, this.cam);
    }
  }
  let vault = null;
  try { vault = new Vault(document.querySelector('.vault-host')); } catch (e) { console.warn('WebGL недоступен', e); }
  addEventListener('resize', fit); fit();

  /* =========================================================
     НАСТРОЙКА
     ========================================================= */
  const cfg = { mode: 'teams', teams: 2, names: TDEF.slice(), topics: new Set(['sqli', 'nosql', 'privesc', 'exfil', 'all']), qn: 15, timer: 20 };
  function seg(id, key, cast, after) {
    $(id).querySelectorAll('button').forEach(b => b.onclick = () => {
      $(id).querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      cfg[key] = cast(b.dataset.v); if (after) after();
    });
  }
  seg('mode', 'mode', String, () => { $('teamsBox').style.display = cfg.mode === 'teams' ? '' : 'none'; });
  seg('tcount', 'teams', Number, renderNames);
  seg('qn', 'qn', Number); seg('timer', 'timer', Number);
  function renderNames() {
    $('tnames').innerHTML = Array.from({ length: cfg.teams }, (_, i) => `<input data-i="${i}" style="--c:${TCOL[i]}" value="${cfg.names[i].replace(/"/g, '&quot;')}" maxlength="18">`).join('');
    $('tnames').querySelectorAll('input').forEach(inp => inp.oninput = () => { cfg.names[+inp.dataset.i] = inp.value || TDEF[+inp.dataset.i]; });
  }
  renderNames();
  $('topics').innerHTML = Object.keys(TOPIC_NAME).map(k => `<button data-k="${k}" class="on" style="--c:${TOPIC_COL[k]}">${TOPIC_NAME[k]}</button>`).join('');
  $('topics').querySelectorAll('button').forEach(b => b.onclick = () => {
    const k = b.dataset.k; if (cfg.topics.has(k)) { if (cfg.topics.size > 1) cfg.topics.delete(k); } else cfg.topics.add(k);
    b.classList.toggle('on', cfg.topics.has(k));
  });

  /* =========================================================
     ИГРА
     ========================================================= */
  const G = { qs: [], i: 0, teams: [], turn: 0, answered: false, correct: 0, tLeft: 0, timerId: null };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function show(id) { ['scSetup', 'scQ', 'scEnd'].forEach(s => { $(s).hidden = s !== id; }); }

  function start() {
    const pool = window.QUESTIONS.filter(q => cfg.topics.has(q.tp));
    G.qs = shuffle(pool.slice()).slice(0, Math.min(cfg.qn, pool.length)).map(q => {
      // перемешиваем варианты, сохраняя правильный
      const order = shuffle([0, 1, 2, 3]);
      return { tp: q.tp, q: q.q, why: q.why, a: order.map(k => q.a[k]), c: order.indexOf(q.c) };
    });
    G.i = 0; G.correct = 0; G.turn = 0;
    G.teams = cfg.mode === 'teams' ? Array.from({ length: cfg.teams }, (_, i) => ({ name: cfg.names[i], c: TCOL[i], score: 0, right: 0 })) : [];
    if (vault) vault.setLayers(G.qs.length);
    $('hackPct').textContent = '0%';
    sfx.start(); show('scQ'); renderTeams(); ask();
  }

  function renderTeams() {
    const box = $('teams'); box.className = 'teams' + (cfg.mode === 'group' ? ' group' : '');
    if (cfg.mode === 'group') {
      box.innerHTML = `<div class="team-c" style="--c:var(--fire)"><div class="nm">Вся группа<small>ПРАВИЛЬНЫХ ОТВЕТОВ</small></div><div class="sc">${G.correct} / ${G.qs.length}</div><div class="bar" style="width:${G.correct / Math.max(1, G.qs.length) * 100}%"></div></div>`;
      return;
    }
    const max = Math.max(100, ...G.teams.map(t => t.score));
    box.innerHTML = G.teams.map((t, i) => `<div class="team-c ${i === G.turn && !$('scQ').hidden ? 'cur' : ''}" data-i="${i}" style="--c:${t.c}"><div class="nm">${escapeHtml(t.name)}<small>${t.right} верных</small></div><div class="sc">${t.score}</div><div class="bar" style="width:${t.score / max * 100}%"></div></div>`).join('');
    box.querySelectorAll('.team-c').forEach(el => el.onclick = () => { if (G.answered || $('scQ').hidden) return; G.turn = +el.dataset.i; renderTeams(); renderTurn(); });
  }
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderTurn() {
    if (cfg.mode === 'group') { $('qturn').innerHTML = 'Отвечает <b style="--c:var(--fire)">вся группа</b>'; return; }
    const t = G.teams[G.turn]; $('qturn').innerHTML = `Отвечает: <b style="--c:${t.c}">${escapeHtml(t.name)}</b> <span style="color:var(--dim);font-size:13px">(клик по команде — сменить)</span>`;
  }

  function ask() {
    const q = G.qs[G.i]; G.answered = false;
    $('qcount').innerHTML = `Вопрос <b>${G.i + 1}</b> / ${G.qs.length}`;
    const chip = $('qtopic'); chip.textContent = TOPIC_NAME[q.tp]; chip.style.setProperty('--c', TOPIC_COL[q.tp]);
    $('qtext').textContent = q.q;
    $('qans').innerHTML = q.a.map((a, k) => `<button class="ans" data-k="${k}"><span class="l">${'ABCD'[k]}</span><span>${escapeHtml(a)}</span></button>`).join('');
    $('qans').querySelectorAll('.ans').forEach(b => b.onclick = () => answer(+b.dataset.k));
    $('qexp').hidden = true; $('bNext').hidden = true; $('bReveal').hidden = false;
    renderTurn(); renderTeams();
    $('qtext').animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'ease-out' });
    startTimer();
  }

  function startTimer() {
    clearInterval(G.timerId); const tm = $('qtimer');
    if (!cfg.timer) { tm.classList.add('off'); return; }
    tm.classList.remove('off', 'low'); G.tLeft = cfg.timer; drawTimer();
    G.timerId = setInterval(() => {
      G.tLeft -= 0.25; drawTimer();
      if (G.tLeft <= 5 && Math.abs(G.tLeft - Math.round(G.tLeft)) < 0.01 && G.tLeft > 0) sfx.tick();
      if (G.tLeft <= 0) { clearInterval(G.timerId); answer(-1); }
    }, 250);
  }
  function drawTimer() {
    const k = Math.max(0, G.tLeft / cfg.timer);
    $('tval').style.strokeDashoffset = 276.5 * (1 - k);
    $('tnum').textContent = Math.ceil(Math.max(0, G.tLeft));
    $('qtimer').classList.toggle('low', G.tLeft <= 5);
  }

  function answer(k) {
    if (G.answered) return; G.answered = true; clearInterval(G.timerId);
    const q = G.qs[G.i], ok = k === q.c;
    $('qans').querySelectorAll('.ans').forEach((b, j) => {
      b.disabled = true;
      if (j === q.c) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); else b.classList.add('dim');
    });
    let pts = 0;
    if (ok) {
      G.correct++;
      pts = 100 + (cfg.timer ? Math.round(50 * Math.max(0, G.tLeft) / cfg.timer) : 0);
      if (cfg.mode === 'teams') { const t = G.teams[G.turn]; t.score += pts; t.right++; }
      sfx.ok(); floatText(cfg.mode === 'teams' ? `+${pts}` : '✓ ВЕРНО', '#35f0a0');
    } else {
      if (k === -2) floatText('ОТВЕТ', '#ffb347'); else { sfx.bad(); floatText(k === -1 ? 'ВРЕМЯ!' : '✗ МИМО', '#ff3d2e'); }
    }
    const p = G.correct / G.qs.length;
    if (vault) { if (ok) vault.breakLayer(p); else vault.defend(); }
    $('hackPct').textContent = Math.round(p * 100) + '%';
    const ex = $('qexp'); ex.hidden = false; ex.className = 'explain' + (ok ? '' : ' bad');
    ex.innerHTML = `<b>${ok ? 'Верно!' : k === -1 ? 'Время вышло.' : k === -2 ? 'Ответ раскрыт.' : 'Неверно.'}</b> Правильный ответ: <b>${'ABCD'[q.c]}</b>. ${escapeHtml(q.why)}`;
    $('bReveal').hidden = true; $('bNext').hidden = false;
    $('bNext').textContent = G.i < G.qs.length - 1 ? 'Дальше →' : 'Итоги →';
    renderTeams();
  }

  function nextQ() {
    if (!G.answered) return;
    if (G.i >= G.qs.length - 1) { finish(); return; }
    G.i++; if (cfg.mode === 'teams') G.turn = (G.turn + 1) % G.teams.length; ask();
  }

  function finish() {
    clearInterval(G.timerId); show('scEnd'); sfx.win();
    const p = Math.round(G.correct / G.qs.length * 100);
    $('endTitle').innerHTML = p >= 50 ? `База <em>взломана на ${p}%!</em>` : `Защита <em>устояла</em> (${p}%)`;
    if (cfg.mode === 'teams') {
      const r = G.teams.slice().sort((a, b) => b.score - a.score);
      $('podium').innerHTML = r.map((t, i) => `<div class="pd ${i === 0 ? 'first' : ''}" style="--c:${t.c}"><div class="pl">${i === 0 ? '🏆' : i + 1}</div><div class="nm">${escapeHtml(t.name)}</div><div style="font:600 16px var(--mono);color:var(--dim)">${t.right} верных</div><div class="sc">${t.score}</div></div>`).join('');
    } else {
      $('podium').innerHTML = `<div class="pd first" style="--c:var(--fire2)"><div class="pl">🔥</div><div class="nm">Вся группа</div><div class="sc">${G.correct} / ${G.qs.length}</div></div>`;
    }
    $('qcount').textContent = ''; renderTeams();
    $('teams').innerHTML = '';
  }
  function floatText(txt, col) { const f = $('float'); f.textContent = txt; f.style.color = col; f.style.textShadow = `0 0 40px ${col}`; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }

  $('bStart').onclick = start;
  $('bReveal').onclick = () => answer(-2);
  $('bNext').onclick = nextQ;
  $('bAgain').onclick = () => { show('scSetup'); $('teams').innerHTML = ''; if (vault) vault.setLayers(8); $('hackPct').textContent = '0%'; };

  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (!$('scQ').hidden) {
      const map = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3, 'ф': 0, 'и': 1, 'с': 2, 'в': 3 };
      if (k in map && !G.answered) { answer(map[k]); return; }
      if ((k === ' ' || k === 'enter' || k === 'arrowright') && G.answered) { e.preventDefault(); nextQ(); return; }
    } else if (!$('scSetup').hidden && k === 'enter') { start(); return; }
    if (k === 'f' || k === 'а') $('bFull').click();
    if (k === 'm' || k === 'ь') $('bSound').click();
  });

  window.__game = { G, cfg, start, answer, nextQ, vault: () => vault };
})();

/* =========================================================
   ПРЕЗЕНТАЦИЯ: сборка слайдов, навигация, пошаговые 3D-циклы
   ========================================================= */
(function () {
  'use strict';
  const deck = document.getElementById('deck');
  const S = window.SPEAKERS, TP = window.TOPICS;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let stage = null;
  try { stage = new window.Stage(); } catch (e) { console.warn('WebGL недоступен — 3D отключено', e); }

  const slides = [];
  const add = o => slides.push(o);
  const SHORT = {
    sqli: 'Ввод пользователя превращается в команду для SQL-базы.',
    nosql: 'Та же идея для MongoDB и других NoSQL: подмена логики запроса.',
    privesc: 'Из обычного пользователя — в администратора базы данных.',
    exfil: 'Как украденные данные незаметно выносят наружу.'
  };
  const PHASE = ['ПРОНИКНОВЕНИЕ', 'ПРОНИКНОВЕНИЕ', 'ЗАХВАТ', 'ВЫНОС'];
  const TICONS = ['code', 'schema', 'crown', 'out'];

  /* ---------------- СЛАЙДЫ ---------------- */
  add({
    title: 'Титул', cls: 's-title', stage: 'hero',
    notes: 'Поздоровайтесь, назовите тему и представьте команду: каждый из нас разбирает одну атаку на базы данных. В конце — игра для всей группы.',
    html: `
      <div class="stage-host"></div>
      <div class="tcontent">
        <div class="kicker" data-a>Защита проекта · Кибербезопасность</div>
        <h1 data-a><span class="glitch" data-text="Database Security">Database Security</span><br><em>Attacks</em></h1>
        <div class="sub" data-a>Techniques, Exploitation &amp; Data Protection<span class="cursor"></span></div>
        <div class="team" data-a>${TP.map((t, i) => `<div><span style="--c:${t.hue}">${t.num}</span><div>${esc(S[i])}<small>${t.title}</small></div></div>`).join('')}</div>
        <div class="group" data-a>${esc(window.GROUP)}</div>
      </div>
      <div class="press-hint"><kbd>→</kbd> или <kbd>Пробел</kbd> — дальше · <kbd>N</kbd> — подсказка докладчику · <kbd>H</kbd> — справка</div>`
  });

  add({
    title: 'Команда и темы', cls: '',
    notes: 'Покажите, кто о чём рассказывает. Карточки кликабельны — можно сразу перейти к теме.',
    html: `
      <div class="kicker" data-a>План защиты</div>
      <h2 data-a>4 докладчика — <em>4 атаки</em> на базы данных</h2>
      <div class="agenda">${TP.map((t, i) => `
        <div class="card ag" data-a data-jump="${t.id}" style="--c:${t.hue}">
          <div class="n">${t.num}</div>
          <h3>${t.title}</h3>
          <p>${SHORT[t.id]}</p>
          <div class="who"><span class="ico" style="--c:${t.hue}">${icon('user')}</span>${esc(S[i])}</div>
        </div>`).join('')}
      </div>`
  });

  add({
    title: 'Зачем защищать БД', cls: '',
    notes: 'База данных — самое ценное в компании. Безопасность держится на трёх буквах CIA: конфиденциальность, целостность, доступность. Каждая из наших атак бьёт по одной из них.',
    html: `
      <div class="kicker" data-a>Почему это важно</div>
      <h2 data-a>База данных — это <em>сейф</em> компании</h2>
      <div class="cia">
        <div class="card" data-a style="--c:var(--fire)"><div class="big">C</div><h4>Конфиденциальность</h4><p>Чужой не должен прочитать данные.</p><div class="tags"><span class="tag">SQL Injection</span><span class="tag">Exfiltration</span></div></div>
        <div class="card" data-a style="--c:var(--fire2)"><div class="big">I</div><h4>Целостность</h4><p>Никто не должен незаметно изменить данные.</p><div class="tags"><span class="tag">NoSQL Injection</span><span class="tag">Privilege Escalation</span></div></div>
        <div class="card" data-a style="--c:var(--ember)"><div class="big">A</div><h4>Доступность</h4><p>Данные доступны тогда, когда нужны.</p><div class="tags"><span class="tag">Удаление</span><span class="tag">Шифровальщики</span></div></div>
      </div>
      <div class="factbar">
        <div class="card" data-a><div class="num">A01</div><p><b>Broken Access Control</b> — первое место в OWASP Top 10 (2021). Это и есть лишние права.</p></div>
        <div class="card" data-a><div class="num">A03</div><p><b>Injection</b> — третье место в OWASP Top 10 (2021): SQL, NoSQL и другие инъекции.</p></div>
      </div>`
  });

  add({
    title: 'Цепочка атаки', cls: '',
    notes: 'Главная мысль всей презентации: эти 4 атаки — одна цепочка. Сначала злоумышленник проникает через инъекцию, потом повышает права, потом выносит данные. Разорвите любое звено — и атака не удастся.',
    html: `
      <div class="kicker" data-a>Как всё связано</div>
      <h2 data-a>4 темы — это <em>одна цепочка</em> атаки</h2>
      <div class="chain">${TP.map((t, i) => `
        ${i ? '<div class="arrow" data-a></div>' : ''}
        <div class="card lk" data-a style="--c:${t.hue}">
          <div class="ph">${PHASE[i]}</div>
          <div class="ico" style="--c:${t.hue}">${icon(TICONS[i])}</div>
          <h4>${t.title}</h4>
          <p>${t.ru}</p>
          <div class="sd">${SHORT[t.id]}</div>
          <div class="who">${esc(S[i])}</div>
        </div>`).join('')}
      </div>
      <p class="chain-note" data-a>Разорвите <b>любое</b> звено — и атака не дойдёт до цели.</p>`
  });

  TP.forEach((t, ti) => {
    // --- вводный слайд
    add({
      title: `${t.num} · ${t.title}`, cls: '', topic: t.id, speaker: S[ti],
      notes: t.notesIntro,
      html: `
      <div class="intro" style="--c:${t.hue}">
        <div class="intro-left">
          <div class="topic-head" data-a><div class="n">${t.num}</div><div><div class="ru">${t.ru}</div><h2 class="glitch" data-text="${t.title}">${t.title}</h2></div></div>
          <div class="speaker" data-a><span class="dot"></span>Докладчик: ${esc(S[ti])}</div>
          <div class="defbox" data-a>${t.def}</div>
          <div class="card simple" data-a><h4><span class="ico">${icon('flame')}</span>Простыми словами</h4><p>${t.simple}</p></div>
        </div>
        <div class="intro-right">
          <div class="card" data-a style="--c:${t.hue}"><h4><span class="ico">${icon('bug')}</span>Почему возникает</h4><ul>${t.why.map(x => `<li>${x}</li>`).join('')}</ul></div>
          <div class="card" data-a style="--c:${t.hue}"><h4><span class="ico">${icon('alert')}</span>Что получает атакующий</h4><ul>${t.impact.map(x => `<li>${x}</li>`).join('')}</ul></div>
          ${t.types ? `<div class="types" data-a>${t.types.map(x => `<div><b>${x[0]}</b>${x[1]}</div>`).join('')}</div>` : ''}
          <div class="card case" data-a><h4><span class="yr">РЕАЛЬНЫЙ СЛУЧАЙ</span>${t.caseT}</h4><p>${t.caseD}</p></div>
        </div>
      </div>`
    });

    // --- интерактивный 3D-цикл
    add({
      title: `${t.num} · Цикл атаки (3D)`, cls: 's-lab', topic: t.id, speaker: S[ti], lab: t, stage: 'lab',
      notes: 'Нажимайте → / Пробел или кликайте по сцене — каждый клик показывает следующий шаг. Читайте крупный текст шага слева — этого достаточно. Последний, зелёный шаг — защита.',
      html: `
      <div class="lab" style="--c:${t.hue}">
        <div class="lab-left">
          <div class="lab-title" data-a><div class="n">${t.num}</div><div><h3>${t.title}</h3><small>ЦИКЛ АТАКИ · ${t.steps.length} ШАГОВ</small></div></div>
          <div class="steps" data-a>${t.steps.map((s, i) => `<button data-step="${i}" class="${s.defense ? 'def' : ''}" title="${esc(s.t)}">${s.defense ? '🛡' : i + 1}</button>`).join('')}</div>
          <div class="card stepcard" data-a></div>
          <div class="console" data-a><div class="bar"><i></i><i></i><i></i><span>terminal — ${t.id}.log</span></div><div class="lines"></div></div>
        </div>
        <div class="lab-right" data-a>
          <div class="stage-host">${stage ? '' : '<div class="no3d">3D недоступно в этом браузере — шаги работают</div>'}</div>
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div class="stage-tag"><span class="rec"></span>LIVE · 3D-МОДЕЛЬ АТАКИ</div>
          <div class="status idle">ГОТОВО</div>
          <div class="click-hint"><div class="ring">${icon('flame')}</div>Нажмите, чтобы начать атаку</div>
          <div class="controls">
            <button class="btn" data-act="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg>Шаг назад</button>
            <button class="btn primary" data-act="next">Следующий шаг<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg></button>
            <button class="btn" data-act="reset"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg>Заново</button>
            <button class="btn" data-act="auto"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>Авто</button>
          </div>
        </div>
      </div>`
    });

    // --- защита
    const side = t.side.type === 'code'
      ? `<div class="cmp bad" data-a><small>✗ ТАК НЕЛЬЗЯ</small>${esc(t.side.bad)}</div><div class="cmp good" data-a><small>✓ ТАК ПРАВИЛЬНО</small>${esc(t.side.good)}</div>`
      : `<div class="card signs" data-a style="--c:var(--ember)"><h4><span class="ico">${icon('alert')}</span>${t.side.title}</h4><ul>${t.side.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    add({
      title: `${t.num} · Защита`, cls: '', topic: t.id, speaker: S[ti],
      notes: t.notesDef,
      html: `
      <div class="kicker" data-a>Тема ${t.num} · Защита</div>
      <h2 data-a>Как защититься от <em>${t.title}</em></h2>
      <div class="defense">
        <div class="dgrid">${t.defense.map(d => `<div class="card" data-a><span class="ico">${icon(d.i)}</span><div><h4>${d.t}</h4><p>${d.d}</p></div></div>`).join('')}</div>
        <div class="side">${side}<div class="motto" data-a><small>ГЛАВНАЯ МЫСЛЬ</small>${t.motto}</div></div>
      </div>`
    });
  });

  add({
    title: 'Defense in Depth', cls: '',
    notes: 'Итог: одной защиты мало. Нужны слои — как кольца крепости. Назовите 4 правила, каждое закрывает свою тему.',
    html: `
      <div class="kicker" data-a>Итог</div>
      <h2 data-a>Defense in Depth — <em>защита слоями</em></h2>
      <div class="did">
        <div class="rings" data-a>
          <div style="inset:0;--c:var(--purple)"><span>Мониторинг · DLP · SIEM</span></div>
          <div style="inset:56px;--c:var(--fire2)"><span>Код · параметры · типы</span></div>
          <div style="inset:112px;--c:var(--ember)"><span>Права · RBAC · MFA</span></div>
          <div style="inset:168px;--c:var(--ok)"><span>Шифрование</span></div>
          <div class="core">${icon('db')}</div>
        </div>
        <div class="rules">
          <div class="card" data-a style="--c:var(--fire)"><div class="k">01</div><div><h4>Не склеивай запросы</h4><p>Параметры и проверка типов — против SQL и NoSQL-инъекций.</p></div></div>
          <div class="card" data-a style="--c:var(--fire2)"><div class="k">02</div><div><h4>Проверяй тип данных</h4><p>Пароль — строка, возраст — число. Всё остальное — отказ.</p></div></div>
          <div class="card" data-a style="--c:var(--ember)"><div class="k">03</div><div><h4>Минимум прав</h4><p>Учётке сайта не нужен GRANT ALL. Против повышения привилегий.</p></div></div>
          <div class="card" data-a style="--c:var(--purple)"><div class="k">04</div><div><h4>Шифруй и следи</h4><p>Шифрование, DLP и тревога при аномалиях — против выноса данных.</p></div></div>
        </div>
      </div>`
  });

  add({
    title: 'Игра для группы', cls: 'center',
    notes: 'Предложите группе сыграть: разделитесь на команды. Нажмите кнопку — игра откроется в новой вкладке.',
    html: `
      <div class="kicker" data-a>Интерактив для группы</div>
      <h1 data-a>Игра «<em>Взломай базу</em>»</h1>
      <p class="lead" data-a>Проверим, что запомнилось! Вопросы по всем четырём темам. Каждый правильный ответ ломает слой защиты базы.</p>
      <a class="bigbtn" data-a href="game.html" target="_blank">${icon('flame')}Начать игру</a>
      <div class="feat">
        <div class="card" data-a><h4><span class="ico">${icon('user')}</span>2–4 команды</h4><p>Или режим «вся группа» без счёта.</p></div>
        <div class="card" data-a><h4><span class="ico">${icon('bug')}</span>${window.QUESTIONS.length} вопросов</h4><p>По каждой теме + общие. С объяснениями.</p></div>
        <div class="card" data-a><h4><span class="ico">${icon('chart')}</span>Таймер и очки</h4><p>Быстрее ответ — больше бонус.</p></div>
      </div>`
  });

  add({
    title: 'Спасибо!', cls: 'center',
    notes: 'Поблагодарите и пригласите задавать вопросы. Можно вернуться к любому 3D-циклу клавишами 1–4.',
    html: `
      <div class="kicker" data-a>Конец</div>
      <h1 data-a>Спасибо за <em>внимание!</em></h1>
      <p class="lead" data-a>Ваши вопросы?</p>
      <div class="team" data-a style="margin-top:40px">${TP.map((t, i) => `<div><span style="--c:${t.hue}">${t.num}</span><div>${esc(S[i])}<small>${t.title}</small></div></div>`).join('')}</div>`
  });

  /* ---------------- HUD ---------------- */
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  deck.insertAdjacentHTML('beforeend', `
    <div class="hud">
      <div class="logo">${icon('flame')}DB//SEC<span>_attacks</span></div>
      <div class="hud-topics">${TP.map((t, i) => `<button data-topic="${t.id}" title="${esc(S[i])}">${t.num} ${t.title}</button>`).join('')}</div>
      <div class="hud-right">
        <div class="counter"><b id="cn">1</b> / ${slides.length}</div>
        <button class="ibtn" id="bHelp" title="Справка (H)">${svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17v.5"/>')}</button>
        <button class="ibtn" id="bNotes" title="Подсказка докладчику (N)">${svg('<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"/>')}</button>
        <button class="ibtn" id="bOver" title="Все слайды (O)">${svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')}</button>
        <button class="ibtn" id="bFull" title="Полный экран (F)">${svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>
        <a class="ibtn game" href="game.html" target="_blank" title="Игра (G)">${icon('flame')}ИГРА</a>
      </div>
    </div>
    <div class="foot"><span>Database Security Attacks · Techniques, Exploitation &amp; Data Protection</span><span id="fs"></span></div>
    <div class="progress"><i id="pb"></i></div>`);

  /* ---------------- DOM слайдов ---------------- */
  slides.forEach((s, i) => {
    const el = document.createElement('section');
    el.className = 'slide ' + (s.cls || ''); el.innerHTML = s.html; s.el = el; s.i = i;
    el.querySelectorAll('[data-a]').forEach((e, k) => e.style.setProperty('--i', k));
    deck.insertBefore(el, deck.querySelector('.hud'));
    if (s.lab) wireLab(s);
  });
  deck.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => goTopic(b.dataset.jump));
  deck.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => goTopic(b.dataset.topic));

  /* ---------------- масштаб 1600×900 ---------------- */
  function fit() {
    const s = Math.min(innerWidth / 1600, innerHeight / 900);
    deck.style.position = 'absolute'; deck.style.left = '50%'; deck.style.top = '50%';
    deck.style.transform = `translate(-50%,-50%) scale(${s})`;
    if (stage) stage.resize();
  }
  addEventListener('resize', fit); fit();

  /* ---------------- ЛАБОРАТОРИЯ ---------------- */
  function wireLab(s) {
    s.step = -1;
    s.el.querySelectorAll('[data-step]').forEach(b => b.onclick = e => { e.stopPropagation(); labGo(s, +b.dataset.step); });
    s.el.querySelector('[data-act=prev]').onclick = e => { e.stopPropagation(); labGo(s, s.step - 1); };
    s.el.querySelector('[data-act=next]').onclick = e => { e.stopPropagation(); labNext(s); };
    s.el.querySelector('[data-act=reset]').onclick = e => { e.stopPropagation(); stopAuto(s); labGo(s, -1); };
    s.el.querySelector('[data-act=auto]').onclick = e => { e.stopPropagation(); toggleAuto(s); };
    s.el.querySelector('.stage-host').onclick = () => labNext(s);
    s.el.querySelector('.click-hint').style.pointerEvents = 'none';
  }
  function labNext(s) {
    if (s.step < s.lab.steps.length - 1) { labGo(s, s.step + 1); return true; }
    return false;
  }
  function labGo(s, i, instant) {
    const n = s.lab.steps.length; i = Math.max(-1, Math.min(n - 1, i)); s.step = i;
    if (stage) stage.run(s.lab, i, !!instant);
    renderLab(s, instant);
    renderNotes();
  }
  function renderLab(s, instant) {
    const st = s.lab.steps, i = s.step, el = s.el;
    el.querySelectorAll('[data-step]').forEach((b, k) => { b.classList.toggle('cur', k === i); b.classList.toggle('done', k < i); });
    const card = el.querySelector('.stepcard');
    const status = el.querySelector('.status');
    el.querySelector('.click-hint').classList.toggle('hide', i >= 0);
    if (i < 0) {
      card.className = 'card stepcard start';
      card.innerHTML = `<div class="lbl">СТАРТ</div><h4>Как работает атака?</h4><p>Нажмите <b>«Следующий шаг»</b>, <kbd>→</kbd> или кликните по 3D-сцене — и посмотрите цикл атаки по шагам. Последний шаг — <b style="color:var(--ok)">защита</b>.</p>`;
      status.className = 'status idle'; status.textContent = 'ГОТОВО';
    } else {
      const x = st[i];
      card.className = 'card stepcard' + (x.defense ? ' def' : '');
      card.innerHTML = `<div class="lbl">${x.defense ? '🛡 ЗАЩИТА' : `ШАГ ${i + 1} ИЗ ${st.length - 1}`}</div><h4>${x.t}</h4><p>${x.d}</p>`;
      if (x.defense) { status.className = 'status safe'; status.textContent = '✓ ЗАЩИЩЕНО'; }
      else if (i >= 2) { status.className = 'status attack'; status.textContent = '⚠ АТАКА'; }
      else { status.className = 'status idle'; status.textContent = 'РАЗВЕДКА'; }
    }
    renderConsole(s, instant);
  }
  const lineCls = l => l.startsWith('[ok]') ? 'o' : l.includes('[!!]') ? 'e' : l.includes('[!]') ? 'w' : '';
  function renderConsole(s, instant) {
    const box = s.el.querySelector('.lines'), st = s.lab.steps, i = s.step;
    (s.typeT || []).forEach(clearTimeout); s.typeT = [];
    box.innerHTML = '';
    const mk = (txt, old) => { const d = document.createElement('div'); d.className = 'ln ' + lineCls(txt) + (old ? ' old' : ''); d.textContent = txt; return d; };
    if (i < 0) { box.innerHTML = '<div class="ln">$ ожидание запуска… <span class="caret"></span></div>'; return; }
    const old = []; for (let j = Math.max(0, i - 2); j < i; j++) old.push(...st[j].con);
    old.slice(-4).forEach(l => box.appendChild(mk(l, true)));
    const cur = st[i].con, code = st[i].code;
    const addCode = () => { if (!code) return; const p = document.createElement('pre'); p.className = code.bad ? 'bad' : 'good'; p.textContent = code.text; box.appendChild(p); };
    if (instant) { cur.forEach(l => box.appendChild(mk(l))); addCode(); return; }
    let delay = 150;
    cur.forEach(l => {
      const d = mk(''); const cls = d.className;
      s.typeT.push(setTimeout(() => { box.appendChild(d); d.className = cls + ' ' + lineCls(l); }, delay));
      for (let c = 1; c <= l.length; c++) s.typeT.push(setTimeout(() => { d.textContent = l.slice(0, c); }, delay + c * 16));
      delay += l.length * 16 + 260;
    });
    s.typeT.push(setTimeout(addCode, delay));
  }
  function toggleAuto(s) { if (s.auto) stopAuto(s); else startAuto(s); }
  function startAuto(s) {
    if (s.step >= s.lab.steps.length - 1) labGo(s, -1);
    s.el.querySelector('[data-act=auto]').classList.add('on');
    const tick = () => { if (!labNext(s)) { stopAuto(s); return; } s.auto = setTimeout(tick, 4200); };
    s.auto = setTimeout(tick, 400);
  }
  function stopAuto(s) { clearTimeout(s.auto); s.auto = null; const b = s.el.querySelector('[data-act=auto]'); if (b) b.classList.remove('on'); }

  /* ---------------- НАВИГАЦИЯ ---------------- */
  let cur = -1;
  function go(i, dir) {
    i = Math.max(0, Math.min(slides.length - 1, i)); if (i === cur) return;
    const prev = slides[cur];
    if (prev) { prev.el.classList.remove('active'); if (prev.lab) stopAuto(prev); }
    const back = cur > i; cur = i;
    const s = slides[i]; s.el.classList.add('active');
    if (stage) {
      if (s.stage) {
        stage.mount(s.el.querySelector('.stage-host'));
        if (s.stage === 'hero') stage.hero();
      } else stage.unmount();
    }
    if (s.lab) { if (back || dir === 'end') labGo(s, s.lab.steps.length - 1, true); else labGo(s, -1); }
    document.getElementById('cn').textContent = i + 1;
    document.getElementById('pb').style.width = ((i + 1) / slides.length * 100) + '%';
    document.getElementById('fs').textContent = s.speaker ? 'Докладчик: ' + s.speaker : '';
    deck.querySelectorAll('[data-topic]').forEach(b => b.classList.toggle('on', b.dataset.topic === s.topic));
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { /* file:// */ }
    renderNotes(); renderOverview();
  }
  function next() { const s = slides[cur]; if (s.lab && labNext(s)) return; go(cur + 1); }
  function prev() { const s = slides[cur]; if (s.lab && s.step > -1) { labGo(s, s.step - 1); return; } go(cur - 1); }
  function goTopic(id) { const k = slides.findIndex(s => s.topic === id); if (k >= 0) go(k); }

  /* ---------------- ЗАМЕТКИ / ОБЗОР / СПРАВКА ---------------- */
  const notes = document.getElementById('notes'), over = document.getElementById('overview'), help = document.getElementById('help');
  function renderNotes() {
    if (notes.hidden) return; const s = slides[cur];
    let h = `<h5><span>ПОДСКАЗКА · СЛАЙД ${cur + 1}</span><span>N — скрыть</span></h5><p>${s.notes || ''}</p>`;
    if (s.lab && s.step >= 0) h += `<p class="step">Скажите: «${s.lab.steps[s.step].tell}»</p>`;
    if (s.lab && s.step < s.lab.steps.length - 1) { const nx = s.lab.steps[s.step + 1]; h += `<p class="step" style="color:var(--dim)">Дальше: ${nx.t}</p>`; }
    notes.innerHTML = h;
  }
  function renderOverview() {
    if (over.hidden) return;
    over.innerHTML = `<h3>Все слайды</h3><div class="og">${slides.map((s, i) => `<button data-go="${i}" class="${i === cur ? 'cur' : ''}"><small>${String(i + 1).padStart(2, '0')}</small>${esc(s.title)}</button>`).join('')}</div>`;
    over.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { over.hidden = true; go(+b.dataset.go); });
  }
  const toggleNotes = () => { notes.hidden = !notes.hidden; renderNotes(); };
  const toggleOver = () => { over.hidden = !over.hidden; renderOverview(); };
  const toggleHelp = () => { help.hidden = !help.hidden; };
  const toggleFull = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); };
  document.getElementById('bNotes').onclick = toggleNotes;
  document.getElementById('bOver').onclick = toggleOver;
  document.getElementById('bHelp').onclick = toggleHelp;
  document.getElementById('bFull').onclick = toggleFull;
  help.onclick = toggleHelp;

  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, s = slides[cur];
    if (!over.hidden && k === 'Escape') { over.hidden = true; return; }
    if (!help.hidden && (k === 'Escape' || k === 'h' || k === '?')) { help.hidden = true; return; }
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (/^[1-4]$/.test(k)) goTopic(TP[+k - 1].id);
    else if (k === 'r' || k === 'R' || k === 'к' || k === 'К') { if (s.lab) { stopAuto(s); labGo(s, -1); } }
    else if (k === 'a' || k === 'A' || k === 'ф' || k === 'Ф') { if (s.lab) toggleAuto(s); }
    else if (k === 'n' || k === 'N' || k === 'т' || k === 'Т') toggleNotes();
    else if (k === 'o' || k === 'O' || k === 'щ' || k === 'Щ' || k === 'Escape') toggleOver();
    else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') toggleFull();
    else if (k === 'g' || k === 'G' || k === 'п' || k === 'П') window.open('game.html', '_blank');
    else if (k === 'h' || k === 'H' || k === '?' || k === 'р' || k === 'Р') toggleHelp();
  });

  // старт (с номера в адресе — удобно после перезагрузки)
  const h = parseInt(location.hash.slice(1), 10);
  go(h >= 1 && h <= slides.length ? h - 1 : 0);
  window.__deck = { go, next, prev, slides, stage: () => stage };
})();

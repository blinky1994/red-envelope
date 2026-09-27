(() => {
  const $ = s => document.querySelector(s);
  const el = {
    stage: $('#stage'), scene: $('#scene'), bg: $('#bg'), front: $('#front'), memory: $('#memory'), lurk: $('#lurk'), rain: $('#rain'), item: $('#item'),
    chars: $('#chars'), fx: $('#fx'), flash: $('#flash'), big: $('#big'), sub: $('#sub'),
    textbox: $('#textbox'), speaker: $('#speaker'), text: $('#text'), advance: $('#advance'),
    choices: $('#choices'), countdown: $('#countdown'), sidebar: $('#sidebar'), panel: $('#panel'),
    phone: $('#phone'), contacts: $('#contacts'), phoneBadge: $('#btn-phone .badge'), pocketBadge: $('#btn-pocket .badge'),
    title: $('#title'), titleMem: $('#title-mem'), btnBegin: $('#btn-begin'), btnContinue: $('#btn-continue'),
    end: $('#endscreen'),
  };

  const BASE_TITLE = document.title;
  const NUMERALS = ['〇', '一', '二', '三', '四', '五', '六', '七'];
  const SAVE_KEY = 'redenvelope.save';
  const MEM_KEY = 'redenvelope.mem';

  // localStorage can throw (private mode, blocked storage) — the game must still run.
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // `mem` survives across playthroughs; the game uses it to remember you.
  const mem = Object.assign({ plays: 0, leftEnvelope: false, tabLeaves: 0, finished: 0 }, store.get(MEM_KEY) || {});
  const saveMem = () => store.set(MEM_KEY, mem);

  const newState = () => ({ node: null, day: null, family: ['ama', 'mom', 'wen'], lost: [], refusals: 0, flags: {}, items: [] });

  let S = null;
  let node = null, lineIdx = 0;
  let started = false, typing = false, busy = false, awaitingChoice = false, bigShowing = false, bigLock = false;
  let typeTimer = null, fullText = '';

  const val = v => (typeof v === 'function' ? v(S, mem) : v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------- world renderer
  // One animation loop drives the camera (parallax + slow "breathing" drift),
  // the lighting pass, fog, rain and film damage. The scene art is static SVG;
  // everything that makes it feel alive happens here.
  const World = (() => {
    const lightCv = $('#light'), fogCv = $('#fog'), dustCv = $('#dust');
    const lctx = lightCv.getContext('2d'), fctx = fogCv.getContext('2d'), dctx = dustCv.getContext('2d');
    const rainCv = document.createElement('canvas'), rctx = rainCv.getContext('2d');
    el.rain.appendChild(rainCv);

    let w = 0, h = 0;          // stage size in CSS px
    const LS = 0.5;            // lighting/fog render at half resolution: it's all soft anyway
    let scene = null;           // current ART.scene()
    let layerEls = [];          // [{ el, depth }]
    let dark = 0, darkTarget = 0;
    let rainOn = false, drops = [];
    let fogTex = null, fogKey = '';
    const cam = { x: 0, y: 0, tx: 0, ty: 0 };
    const extraLights = [];     // e.g. the lurker
    let scratch = null;

    function resize() {
      w = el.stage.clientWidth; h = el.stage.clientHeight;
      for (const cv of [lightCv, fogCv]) { cv.width = Math.ceil(w * LS); cv.height = Math.ceil(h * LS); }
      dustCv.width = Math.ceil(w * LS); dustCv.height = Math.ceil(h * LS);
      rainCv.width = w; rainCv.height = h;
      drops = Array.from({ length: Math.round(w * h / 4500) }, () => newDrop(true));
    }
    const newDrop = any => ({ x: Math.random() * w * 1.25, y: any ? Math.random() * h : -30 - Math.random() * h * 0.4, l: 12 + Math.random() * 26, v: 15 + Math.random() * 13 });

    // Scene space (1600×900, "cover"-fitted) -> canvas px.
    function toScreen(x, y, depth, dx, dy) {
      const s = Math.max(w / ART.W, h / ART.H);
      const ox = (w - ART.W * s) / 2, oy = (h - ART.H * s) / 2;
      return [(ox + x * s - dx * depth) * LS, (oy + y * s - dy * depth) * LS, s * LS];
    }

    // Light behaviours.
    function flicker(L, t) {
      const seed = L.seed || (L.seed = Math.random() * 1000);
      switch (L.fl) {
        case 'candle': return 0.82 + 0.1 * Math.sin(t * 0.013 + seed) + 0.06 * Math.sin(t * 0.041 + seed * 2) + Math.random() * 0.04;
        case 'lantern': return 0.88 + 0.1 * Math.sin(t * 0.0021 + seed);
        case 'bulb': // mostly steady; the power in old village houses dips
          if (!L.dipUntil && Math.random() < 0.0015) L.dipUntil = t + 80 + Math.random() * 300;
          if (L.dipUntil && t > L.dipUntil) L.dipUntil = 0;
          return L.dipUntil ? 0.55 : 0.97 + Math.random() * 0.02;
        case 'dying': // a light that keeps almost going out
          if (!L.offUntil && Math.random() < 0.006) L.offUntil = t + 50 + Math.random() * 260;
          if (L.offUntil && t > L.offUntil) L.offUntil = 0;
          return L.offUntil ? 0.15 : 0.9 + Math.random() * 0.08;
        default: return 1;
      }
    }

    function drawLight(t, dx, dy) {
      const cw = lightCv.width, ch = lightCv.height;
      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, cw, ch);
      if (!scene) return;
      dark += (darkTarget - dark) * 0.05;
      const exposure = (Math.random() - 0.5) * 0.02; // old film never holds still
      if (dark <= 0.01) return;
      lctx.fillStyle = `rgba(2,2,4,${Math.min(1, dark + exposure)})`;
      lctx.fillRect(0, 0, cw, ch);
      const lights = scene.lights.concat(extraLights);
      // 1) cut holes in the dark
      lctx.globalCompositeOperation = 'destination-out';
      for (const L of lights) {
        const k = L.i * flicker(L, t);
        const [x, y, s] = toScreen(L.x, L.y, L.depth || 0, dx, dy);
        const r = L.r * ART.W * s;
        const g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${k})`);
        g.addColorStop(0.45, `rgba(0,0,0,${k * 0.6})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // 2) tint what the light touches
      lctx.globalCompositeOperation = 'lighter';
      for (const L of lights) {
        const k = L.i * flicker(L, t);
        const [x, y, s] = toScreen(L.x, L.y, L.depth || 0, dx, dy);
        const r = L.r * ART.W * s * 0.8;
        const g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${L.c},${0.07 * k})`);
        g.addColorStop(1, `rgba(${L.c},0)`);
        lctx.fillStyle = g;
        lctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    // A tileable-ish fog texture: lots of soft blobs, tinted to the scene.
    function makeFog(c) {
      const t = document.createElement('canvas');
      t.width = 1024; t.height = 256;
      const x = t.getContext('2d');
      for (let i = 0; i < 90; i++) {
        const px = Math.random() * 1024, py = 70 + Math.random() * 116, r = 40 + Math.random() * 110;
        for (const off of [-1024, 0, 1024]) {
          const g = x.createRadialGradient(px + off, py, 0, px + off, py, r);
          g.addColorStop(0, `rgba(${c},0.09)`);
          g.addColorStop(1, `rgba(${c},0)`);
          x.fillStyle = g;
          x.fillRect(px + off - r, py - r, r * 2, r * 2);
        }
      }
      return t;
    }

    function drawFog(t, dx) {
      const cw = fogCv.width, ch = fogCv.height;
      fctx.clearRect(0, 0, cw, ch);
      const fog = scene && scene.fog;
      if (!fog) return;
      if (fogKey !== fog.c) { fogTex = makeFog(fog.c); fogKey = fog.c; }
      const [, y0] = toScreen(0, fog.y0, 0.3, 0, 0);
      const [, y1] = toScreen(0, fog.y1, 0.3, 0, 0);
      const bandH = y1 - y0;
      const tileW = cw * 1.2;
      for (const [speed, alpha, par] of [[0.006, fog.a, 0.2], [-0.004, fog.a * 0.7, 0.45]]) {
        const off = ((t * speed * LS - dx * par * LS) % tileW + tileW) % tileW;
        fctx.globalAlpha = alpha;
        fctx.drawImage(fogTex, -off, y0, tileW, bandH);
        fctx.drawImage(fogTex, tileW - off, y0, tileW, bandH);
      }
      fctx.globalAlpha = 1;
    }

    function drawRain() {
      rctx.clearRect(0, 0, w, h);
      if (!rainOn) return;
      rctx.strokeStyle = 'rgba(190,205,220,.38)';
      rctx.lineWidth = 1;
      rctx.beginPath();
      for (const d of drops) {
        rctx.moveTo(d.x, d.y);
        rctx.lineTo(d.x - d.l * 0.18, d.y + d.l);
        d.y += d.v; d.x -= d.v * 0.18;
        if (d.y > h) Object.assign(d, newDrop(false));
      }
      rctx.stroke();
    }

    // Film damage: dust specks, hairs, the occasional running scratch.
    function drawDust() {
      const cw = dustCv.width, ch = dustCv.height;
      dctx.clearRect(0, 0, cw, ch);
      if (!started) return;
      const n = Math.random() < 0.35 ? 1 + Math.floor(Math.random() * 3) : 0;
      for (let i = 0; i < n; i++) {
        dctx.fillStyle = Math.random() < 0.7 ? 'rgba(0,0,0,.55)' : 'rgba(255,245,230,.35)';
        const x = Math.random() * cw, y = Math.random() * ch;
        if (Math.random() < 0.8) { dctx.beginPath(); dctx.arc(x, y, 0.5 + Math.random() * 1.5, 0, 7); dctx.fill(); }
        else { dctx.strokeStyle = dctx.fillStyle; dctx.beginPath(); dctx.moveTo(x, y); dctx.quadraticCurveTo(x + 6, y + 4, x + 3, y + 12); dctx.stroke(); }
      }
      if (!scratch && Math.random() < 0.01) scratch = { x: Math.random() * cw, life: 8 + Math.random() * 30 };
      if (scratch) {
        scratch.x += (Math.random() - 0.5) * 1.5;
        dctx.fillStyle = 'rgba(255,245,230,.12)';
        dctx.fillRect(scratch.x, 0, 0.7, ch);
        if (--scratch.life <= 0) scratch = null;
      }
    }

    function frame(t) {
      cam.x += (cam.tx - cam.x) * 0.035;
      cam.y += (cam.ty - cam.y) * 0.035;
      // the camera never quite holds still — like someone holding their breath
      const dx = cam.x * 26 + Math.sin(t * 0.00021) * 12 + Math.sin(t * 0.00053) * 4;
      const dy = cam.y * 14 + Math.sin(t * 0.00017) * 7;
      for (const L of layerEls) {
        L.el.style.transform = `translate3d(${(-dx * L.depth).toFixed(2)}px,${(-dy * L.depth).toFixed(2)}px,0) scale(${1.05 + L.depth * 0.05})`;
      }
      el.chars.style.transform = `translate3d(${(-dx * 0.35).toFixed(2)}px,${(-dy * 0.35).toFixed(2)}px,0)`;
      el.lurk.style.transform = `translate3d(${(-dx * 0.15).toFixed(2)}px,0,0)`;
      drawLight(t, dx, dy);
      drawFog(t, dx);
      drawRain();
      drawDust();
      requestAnimationFrame(frame);
    }

    let token = 0, curName = null;
    function setScene(name) {
      if (name === curName) return;
      const firstLoad = curName === null;
      curName = name;
      const my = ++token;
      el.bg.classList.add('fading'); el.front.classList.add('fading');
      setTimeout(() => {
        if (my !== token) return;
        scene = ART.scene(name, S);
        el.bg.innerHTML = ''; el.front.innerHTML = ''; layerEls = [];
        for (const L of scene.layers) {
          const d = document.createElement('div');
          d.className = 'plx';
          d.innerHTML = L.svg;
          (L.front ? el.front : el.bg).appendChild(d);
          layerEls.push({ el: d, depth: L.depth });
        }
        // characters get a key light so they emerge from the dark rather than vanish in it
        if (scene.charLight !== 0) scene.lights = scene.lights.concat([{ x: 800, y: 400, r: 0.32, c: '150,155,150', i: scene.charLight || 0.45, fl: 'steady', depth: 0.35, forChars: true }]);
        darkTarget = scene.dark;
        if (firstLoad) dark = scene.dark;
        el.bg.classList.remove('fading'); el.front.classList.remove('fading');
      }, firstLoad ? 0 : 420);
    }

    addEventListener('resize', resize);
    addEventListener('pointermove', e => {
      cam.tx = (e.clientX / innerWidth - 0.5) * 2;
      cam.ty = (e.clientY / innerHeight - 0.5) * 2;
    });
    resize();
    requestAnimationFrame(frame);

    return {
      setScene,
      reset() { curName = null; },
      setRain(v) { rainOn = !!v; el.rain.classList.toggle('on', rainOn); },
      extraLights,
    };
  })();

  function setChars(list) {
    const keys = (list || []).map(c => (typeof c === 'string' ? c : c.k));
    [...el.chars.children].forEach(ch => {
      if (keys.includes(ch.dataset.k) || ch.classList.contains('leaving')) return;
      ch.classList.add('leaving');
      setTimeout(() => ch.remove(), 420);
    });
    keys.forEach((k, i) => {
      let ch = [...el.chars.children].find(c => c.dataset.k === k && !c.classList.contains('leaving'));
      if (!ch) {
        ch = document.createElement('div');
        ch.className = 'char';
        ch.dataset.k = k;
        ch.innerHTML = ART.char(k);
        el.chars.appendChild(ch);
      }
      ch.style.order = i;
    });
  }

  function setItem(name) {
    if (!name) { el.item.classList.remove('show'); return; }
    el.item.innerHTML = ART.item(name);
    el.item.classList.remove('show');
    void el.item.offsetWidth;
    el.item.classList.add('show');
  }

  function pulseClass(target, cls, ms) {
    target.classList.remove(cls);
    void target.offsetWidth;
    target.classList.add(cls);
    setTimeout(() => target.classList.remove(cls), ms);
  }

  function doFx(list) {
    [].concat(list || []).forEach(fx => {
      switch (fx) {
        case 'shake': pulseClass(el.stage, 'shake', 600); break;
        case 'flicker': pulseClass(el.stage, 'flicker', 1250); break;
        case 'glitch': pulseClass(el.stage, 'glitch', 850); Sound.sfx('glitch'); break;
        case 'flash': pulseClass(el.flash, 'go', 450); break;
        case 'red': el.fx.classList.add('red'); break;
        case 'red-off': el.fx.classList.remove('red'); break;
        case 'dark': el.stage.classList.add('dark'); break;
        case 'darker': el.stage.classList.add('dark', 'darker'); break;
        case 'dark-off': el.stage.classList.remove('dark', 'darker'); break;
        case 'subliminal': subliminal(); break;
        case 'chroma': pulseClass(el.scene, 'chroma', 700); break;
        case 'memory': pulseClass(el.scene, 'memory', 2000); pulseClass(el.memory, 'go', 2000); break;
      }
    });
  }

  function applyScene(o) {
    if ('bg' in o) World.setScene(val(o.bg));
    if ('rain' in o) World.setRain(val(o.rain));
    if ('chars' in o) setChars(val(o.chars));
    if ('item' in o) setItem(val(o.item));
    if ('ambient' in o) Sound.ambient(val(o.ambient));
    if ('fx' in o) doFx(val(o.fx));
    if ('sfx' in o) Sound.sfx(val(o.sfx));
  }

  let lastDay = null;
  function updateHud() {
    const show = S && S.day != null;
    el.countdown.hidden = !show;
    if (show) {
      el.countdown.querySelector('.num').textContent = NUMERALS[S.day] || S.day;
      if (lastDay !== null && lastDay !== S.day) pulseClass(el.countdown, 'pulse', 1700);
      if (lastDay === null) pulseClass(el.countdown, 'pulse', 1700);
    }
    lastDay = show ? S.day : null;
    // Phone: new contact after the envelope, missed call after 3:33.
    const phoneNew = !!S && ((S.flags.envelope && !S.flags.seenContact) || (S.flags.night && !S.flags.seenCall));
    if (phoneNew && el.phoneBadge.hidden) {
      pulseClass($('#btn-phone'), 'buzz', 1000);
      Sound.sfx('ring');
    }
    el.phoneBadge.hidden = !phoneNew;
    el.pocketBadge.hidden = !(S && pocketItems().length > (S.pocketSeen || 0));
  }

  // ---------------------------------------------------------------- flow
  function goto(id) {
    node = STORY[id];
    if (!node) { console.error('Missing story node:', id); return; }
    S.node = id;
    store.set(SAVE_KEY, S);
    hideBig();
    el.fx.classList.remove('red');
    el.stage.classList.remove('dark', 'darker');
    applyScene(node);
    updateHud();
    lineIdx = 0;
    next();
  }

  function next() {
    clearChoices();
    const lines = node.lines || [];
    while (lineIdx < lines.length) {
      let line = lines[lineIdx++];
      if (typeof line === 'string') line = { t: line };
      if (line.if && !line.if(S, mem)) continue;
      if (line.do) { line.do(S, mem); saveMem(); }
      applyScene(line);
      updateHud();
      if (line.big) { showBig(val(line.big), val(line.sub)); return; }
      const text = val(line.t);
      if (text) { showText(line.who, text, line.style, line.slow); return; }
      if (line.beat) { // a held breath: text gone, only the sound of the room
        el.textbox.hidden = true;
        hideBig();
        busy = true;
        setTimeout(() => { busy = false; next(); }, line.beat);
        return;
      }
      if (line.wait) { busy = true; setTimeout(() => { busy = false; next(); }, line.wait); return; }
    }
    endNode();
  }

  function endNode() {
    const choices = (val(node.choices) || []).filter(c => !c.if || c.if(S, mem));
    if (choices.length) { showChoices(choices); return; }
    if (node.end) { showEnd(); return; }
    const go = val(node.go);
    if (go) goto(go);
  }

  // ---------------------------------------------------------------- text
  function showText(who, text, style, slow) {
    hideBig();
    el.textbox.hidden = false;
    const sp = who ? SPEAKERS[who] : null;
    el.speaker.textContent = sp ? val(sp.name) : '';
    el.text.className = sp ? (sp.cls || '') : 'narr';
    if (style) el.text.classList.add(style);
    backlog.push({ whoKey: who, who: el.speaker.textContent, text: resolveText(text), cls: style || (sp ? sp.cls || '' : 'narr') });
    if (backlog.length > 120) backlog.shift();
    // Slow lines are for dread, not for waiting: long ones speed up to finish in ~4s.
    typeOut(text, slow ? Math.max(30, Math.min(70, 4200 / resolveText(text).length)) : 24);
  }

  // [[wrong|right]] in a line: the narrator types the wrong thing, hesitates,
  // and quietly rewrites it. History correcting itself in front of you.
  const CORRECTION = /\[\[([^|\]]*)\|([^\]]*)\]\]/g;
  const resolveText = t => t.replace(CORRECTION, '$2');
  let unskippable = false;

  function typeOut(raw, speed = 24) {
    clearTimeout(typeTimer);
    fullText = resolveText(raw);
    unskippable = CORRECTION.test(raw);
    CORRECTION.lastIndex = 0;
    const ops = [];
    raw.split(/(\[\[[^\]]*\]\])/).forEach(part => {
      const m = part.match(/^\[\[([^|\]]*)\|([^\]]*)\]\]$/);
      if (!m) { for (const ch of part) ops.push(['c', ch]); return; }
      for (const ch of m[1]) ops.push(['c', ch]);
      ops.push(['p', 900]);
      for (let k = 0; k < m[1].length; k++) ops.push(['d']);
      ops.push(['p', 350]);
      for (const ch of m[2]) ops.push(['c', ch]);
    });
    el.text.textContent = '';
    el.advance.classList.remove('show');
    typing = true;
    let shown = '', i = 0;
    const step = () => {
      const op = ops[i++];
      if (!op) { finishTyping(); return; }
      let delay = speed;
      if (op[0] === 'c') {
        shown += op[1];
        delay = '.!?'.includes(op[1]) ? speed * 10 : ',;—'.includes(op[1]) ? speed * 5 : speed;
      } else if (op[0] === 'd') { shown = shown.slice(0, -1); delay = 60; }
      else delay = op[1];
      el.text.textContent = shown;
      typeTimer = setTimeout(step, delay);
    };
    typeTimer = setTimeout(step, speed);
  }

  function finishTyping() {
    clearTimeout(typeTimer);
    unskippable = false;
    el.text.textContent = fullText;
    typing = false;
    el.advance.classList.add('show');
  }

  function showBig(text, sub) {
    el.textbox.hidden = true;
    el.big.innerHTML = `<div class="big-main">${esc(text)}</div>` + (sub ? `<div class="big-sub">${esc(sub)}</div>` : '');
    el.big.classList.add('show');
    bigShowing = true;
    bigLock = true;
    setTimeout(() => { bigLock = false; }, 700);
  }
  function hideBig() {
    if (!bigShowing) return;
    bigShowing = false;
    el.big.classList.remove('show');
  }

  // Timed choices: hesitate and the choice is made for you (node.timer = { ms, go, do }).
  let choiceTimer = null;
  function showChoices(list) {
    awaitingChoice = true;
    el.advance.classList.remove('show');
    el.choices.innerHTML = '';
    const timer = val(node.timer);
    if (timer) {
      const bar = document.createElement('div');
      bar.className = 'choice-timer';
      bar.innerHTML = '<span></span>';
      el.choices.appendChild(bar);
      const fill = bar.firstElementChild;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transitionDuration = `${timer.ms}ms`;
        fill.style.transform = 'scaleX(0)';
      }));
      choiceTimer = setTimeout(() => pick({ go: timer.go, do: timer.do }), timer.ms);
      Sound.ambient([...Sound.current().filter(a => a !== 'heart'), 'heart_fast']);
    }
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = val(c.t);
      b.style.animationDelay = `${i * 140}ms`;
      b.addEventListener('click', e => {
        e.stopPropagation();
        pick(c);
      });
      el.choices.appendChild(b);
    });
  }
  function pick(c) {
    if (!awaitingChoice) return;
    awaitingChoice = false;
    clearTimeout(choiceTimer);
    clearChoices();
    Sound.sfx('click');
    if (c.do) c.do(S, mem);
    saveMem();
    goto(val(c.go));
  }
  function clearChoices() { el.choices.innerHTML = ''; }

  function advance() {
    if (!started || busy || awaitingChoice || overlayOpen()) return;
    if (typing) { if (!unskippable) finishTyping(); return; }
    if (bigShowing) {
      if (bigLock) return;
      hideBig();
    }
    next();
  }

  // ---------------------------------------------------------------- screens
  function showTitle() {
    started = false;
    Sound.ambient([]);
    el.end.hidden = true;
    el.title.hidden = false;
    el.sidebar.hidden = true;
    el.textbox.hidden = true;
    el.countdown.hidden = true;
    const save = store.get(SAVE_KEY);
    el.btnContinue.hidden = !(save && save.node && STORY[save.node]);
    let line = '';
    if (mem.plays > 0) line = 'You came back.';
    if (mem.leftEnvelope) line = 'You tried to leave it on the road. It remembers.';
    // After Day One, the wedding is on the real calendar and keeps counting down.
    if (mem.weddingAt) {
      const d = daysLeft();
      line = d > 1 ? `${d} days until the wedding. She counts them even when you aren't here.`
        : d === 1 ? 'The wedding is tomorrow night.'
        : 'The wedding was supposed to be tonight. She is still waiting at the water.';
    }
    el.titleMem.textContent = line;
  }

  function begin(state) {
    Sound.init();
    S = state;
    started = true;
    lastDay = null;
    World.reset();
    el.title.hidden = true;
    el.end.hidden = true;
    el.sidebar.hidden = false;
    el.chars.innerHTML = '';
    setItem(null);
    goto(S.node || 'intro');
  }

  const DAY_MS = 86400000;
  const daysLeft = () => Math.max(0, Math.ceil((mem.weddingAt - Date.now()) / DAY_MS));

  // The chapter ends with a wedding invitation, dated on the player's real
  // calendar: six days from tonight, which falls on 七夕, the lovers' night.
  function showEnd() {
    started = false;
    mem.finished++;
    if (!mem.weddingAt) mem.weddingAt = Date.now() + 6 * DAY_MS;
    saveMem();
    store.del(SAVE_KEY);
    el.textbox.hidden = true;
    closeOverlays();
    const date = new Date(mem.weddingAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const guests = ['ama', 'mom', 'wen'].filter(k => S.family.includes(k)).map(k => NAME_OF[k]);
    const d = daysLeft();
    $('#end-card').innerHTML = `
      <div class="inv-xi">囍</div>
      <div class="inv-cn">謹訂於七月初七 七夕<br>林秋月 小姐 與 阿偉 先生 結婚</div>
      <div class="inv-en">The family of <b>Lin Qiu-Yue</b><br>requests the honour of your presence<br>at her marriage to <b>A-Wei</b>.</div>
      <div class="inv-date">${esc(date)} · 3:33 AM</div>
      <div class="inv-venue">At the reservoir, two kilometres past the shrine.</div>
      <div class="inv-guests">Family of the groom attending: ${guests.length ? esc(guests.join(' · ')) : 'none'}</div>
      <div class="inv-note">You needn't bring anything. We will send someone for you.</div>`;
    $('#end-note').textContent = d > 1 ? `${d} days.` : d === 1 ? 'Tomorrow.' : 'Tonight.';
    Sound.ambient(['drone', 'suona']);
    setTimeout(() => { el.end.hidden = false; }, 1400);
  }

  // ---------------------------------------------------------------- phone
  const FAMILY_CONTACTS = { ama: '阿嬤 Ama', mom: '媽 Mom', wen: '小雯 Xiao-Wen' };
  function openPhone() {
    if (!S) return;
    $('#phone-list-view').hidden = false;
    $('#phone-call-view').hidden = true;
    const list = [
      { n: FAMILY_CONTACTS.ama, k: 'ama' },
      { n: 'Boss Huang' },
      { n: 'Dr. Liao (dentist)' },
      { n: 'Kevin' },
      { n: FAMILY_CONTACTS.mom, k: 'mom' },
      { n: FAMILY_CONTACTS.wen, k: 'wen' },
    ].filter(c => !c.k || S.family.includes(c.k));
    let html = '';
    if (S.flags.envelope) {
      html += `<li class="section">Favorites</li><li><button class="fav" data-bride="1">♥ 秋月<span class="c-sub">${S.flags.night ? 'Missed call · 3:33 AM' : 'wife'}</span></button></li>`;
      html += `<li class="section">All contacts</li>`;
    }
    html += list.map(c => `<li><button data-name="${esc(c.n)}">${esc(c.n)}</button></li>`).join('');
    el.contacts.innerHTML = html;
    el.phone.hidden = false;
    if (S.flags.envelope) S.flags.seenContact = true;
    if (S.flags.night) S.flags.seenCall = true;
    updateHud();
  }

  function call(name, isBride) {
    $('#phone-list-view').hidden = true;
    $('#phone-call-view').hidden = false;
    $('#call-name').textContent = name;
    $('#call-status').textContent = 'Calling…';
    $('#call-line').textContent = '';
    setTimeout(() => {
      if (el.phone.hidden) return;
      if (isBride) {
        $('#call-status').textContent = 'Connected · 00:00';
        Sound.sfx('whisper');
        setTimeout(() => { if (!el.phone.hidden) $('#call-line').textContent = '…you called me.'; }, 1200);
        setTimeout(() => { if (!el.phone.hidden) $('#call-line').textContent = '…you never call anyone else.'; }, 3200);
      } else {
        $('#call-status').textContent = 'No signal.';
      }
    }, 1800);
  }

  el.contacts.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    call(b.dataset.bride ? '♥ 秋月' : b.dataset.name, !!b.dataset.bride);
  });
  $('#btn-phone').addEventListener('click', e => { e.stopPropagation(); openPhone(); });
  $('#phone-close').addEventListener('click', e => { e.stopPropagation(); el.phone.hidden = true; });
  el.phone.addEventListener('click', e => { e.stopPropagation(); if (e.target === el.phone) el.phone.hidden = true; });
  // Sound: the sidebar button opens a volume slider; M still mutes.
  const volPop = $('#vol-pop'), volRange = $('#vol-range'), volPct = $('#vol-pct');
  const savedVol = store.get('redenvelope.vol');
  const syncVol = () => {
    const v = Sound.getVolume(), muted = Sound.isMuted();
    volRange.value = Math.round(v * 100);
    volPct.textContent = muted ? 'Muted' : `${Math.round(v * 100)}%`;
    $('#btn-mute').classList.toggle('muted', muted || v === 0);
    $('#vol-mute').textContent = muted ? 'Unmute' : 'Mute';
  };
  if (typeof savedVol === 'number') Sound.setVolume(savedVol);
  syncVol();
  $('#btn-mute').addEventListener('click', e => { e.stopPropagation(); volPop.hidden = !volPop.hidden; });
  volRange.addEventListener('input', () => {
    Sound.setVolume(volRange.value / 100);
    if (Sound.isMuted()) Sound.toggleMute();
    store.set('redenvelope.vol', volRange.value / 100);
    syncVol();
  });
  $('#vol-mute').addEventListener('click', e => { e.stopPropagation(); Sound.toggleMute(); syncVol(); });
  volPop.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', e => { if (!e.target.closest('#vol-pop, #btn-mute')) volPop.hidden = true; });

  // ---------------------------------------------------------------- panels
  const backlog = [];
  const overlayOpen = () => !el.phone.hidden || !el.panel.hidden;
  function openPanel(title, html) {
    $('#panel-title').textContent = title;
    $('#panel-content').innerHTML = html;
    el.panel.hidden = false;
  }
  const closeOverlays = () => { el.phone.hidden = true; el.panel.hidden = true; };

  // What's in your pocket. Descriptions change as the story changes them.
  function pocketItems() {
    if (!S) return [];
    const after = S.day != null && S.day <= 6; // the morning after
    const list = [];
    if (S.flags.envelope) list.push({ art: 'envelope', name: '紅包 · The red envelope',
      text: S.flags.night ? 'Still warm. It keeps coming back to your pocket, no matter what you do with it.' : 'Warm, as if someone has just been holding it. The hair inside is wet.' });
    if (S.items.includes('ingot')) list.push({ art: 'ingot', name: 'Gold paper ingot',
      text: S.family.includes('wen') ? 'Xiao-Wen folded it for you. "If a good brother comes for you, give him this instead."' : 'Careful folds, a little crooked. A child made this. You don\'t know who.' });
    if (S.items.includes('charm')) list.push({ art: 'charm', name: '平安符 · Temple charm',
      text: after ? 'The yellow paper has gone black and soft, as if it spent the night underwater.' : (S.family.includes('ama') ? 'From Ama. "Whatever knocks, you do not open it."' : 'From the temple. You can\'t remember who gave it to you.') });
    if (S.items.includes('photo')) list.push({ art: after ? 'photo_red' : 'photo', name: 'Photograph',
      text: after ? 'Where the girl was cut away, there is a small red handprint. It hasn\'t dried.' : 'You at six, at the reservoir, holding a hand. The rest of her has been cut out.' });
    return list;
  }
  function openPocket() {
    if (!S) return;
    const items = pocketItems();
    S.pocketSeen = items.length;
    updateHud();
    openPanel('Pocket', items.length
      ? items.map(i => `<div class="pocket-item">${ART.item(i.art)}<div><h4>${esc(i.name)}</h4><p>${esc(i.text)}</p></div></div>`).join('')
      : '<p class="empty">Car keys. A receipt from a 7-Eleven in Taipei. Nothing else.</p>');
  }
  // Once someone is gone, the record forgets them too: their lines lose their
  // name, and every mention of them becomes "someone". Nothing announces it.
  const NAME_OF = { ama: 'Ama', mom: 'Mom', wen: 'Xiao-Wen' };
  function remembered(l) {
    let { who, text } = l;
    for (const k of S.lost) {
      if (l.whoKey === k) who = '';
      text = text.replace(new RegExp(`\\b${NAME_OF[k]}(['’]s)?\\b`, 'g'), (m, poss) => (poss ? `someone${poss}` : 'someone'));
    }
    text = text.replace(/(^|[.!?]\s+|—\s*|"\s*)someone/g, (m, pre) => `${pre}Someone`);
    return { ...l, who, text };
  }
  function openLog() {
    openPanel('Log', backlog.length
      ? backlog.map(remembered).map(l => `<div class="log-line ${esc(l.cls)}">${l.who ? `<b>${esc(l.who)}</b>` : ''}${esc(l.text)}</div>`).join('')
      : '<p class="empty">Nothing yet.</p>');
    const c = $('#panel-content');
    c.scrollTop = c.scrollHeight;
  }
  function openMenu() {
    openPanel('Menu', `<div class="menu-panel">
      <button class="menu-btn" data-act="resume">Resume</button>
      <button class="menu-btn" data-act="title">Return to title</button>
      <p class="empty">Progress is saved at the start of every scene.</p></div>`);
  }
  $('#panel-content').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    closeOverlays();
    if (b.dataset.act === 'title') showTitle();
  });
  $('#btn-pocket').addEventListener('click', e => { e.stopPropagation(); openPocket(); });
  $('#btn-log').addEventListener('click', e => { e.stopPropagation(); openLog(); });
  $('#btn-menu').addEventListener('click', e => { e.stopPropagation(); openMenu(); });
  $('#panel-close').addEventListener('click', e => { e.stopPropagation(); closeOverlays(); });
  el.panel.addEventListener('click', e => { e.stopPropagation(); if (e.target === el.panel) closeOverlays(); });

  // ---------------------------------------------------------------- horror tricks
  // 1) The tab title and icon change when you look away.
  const svgIcon = body => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`);
  const ICON_ENVELOPE = svgIcon('<rect x="6" y="14" width="52" height="36" rx="3" fill="#b3121b"/><path d="M6 16 L32 34 L58 16" fill="none" stroke="#6e070c" stroke-width="3"/><circle cx="32" cy="34" r="5" fill="#d8b454"/>');
  const ICON_EFFIGY = svgIcon('<ellipse cx="32" cy="34" rx="24" ry="27" fill="#ece6d6"/><path d="M8 30 C8 4 56 4 56 30 C46 18 18 18 8 30Z" fill="#0b0b0e"/><circle cx="19" cy="42" r="6" fill="#e0506a" opacity=".7"/><circle cx="45" cy="42" r="6" fill="#e0506a" opacity=".7"/><ellipse cx="24" cy="33" rx="3" ry="4" fill="#15100d"/><ellipse cx="40" cy="33" rx="3" ry="4" fill="#15100d"/><path d="M25 50 Q32 55 39 50" stroke="#b3102a" stroke-width="3" fill="none"/>');
  const setIcon = href => { const l = $('#favicon'); if (l) l.href = href; };
  setIcon(ICON_ENVELOPE);
  const AWAY_TITLES = ['她在等你 · she is waiting', '回來 · come back', '...husband?', '七日 · seven days'];
  document.addEventListener('visibilitychange', () => {
    const haunted = started && S && S.flags.envelope;
    if (document.hidden) {
      if (!haunted) return;
      document.title = AWAY_TITLES[Math.floor(Math.random() * AWAY_TITLES.length)];
      mem.tabLeaves++;
      saveMem();
      setIcon(ICON_EFFIGY);
    } else {
      document.title = BASE_TITLE;
      // her face stays in your tab bar a little longer than it should
      setTimeout(() => setIcon(ICON_ENVELOPE), 2500 + Math.random() * 4000);
    }
  });

  // 2) A single-frame face.
  function subliminal() {
    el.sub.innerHTML = ART.face();
    el.sub.classList.add('show');
    setTimeout(() => el.sub.classList.remove('show'), 90);
  }

  // 3) Sit still too long and she comes closer. Any input and she's gone.
  let idle = 0, lurkLevel = 0;
  setInterval(() => {
    if (!started || !S || !S.flags.envelope || overlayOpen()) return;
    idle++;
    const level = idle < 25 ? 0 : Math.min(5, 1 + Math.floor((idle - 25) / 7));
    if (level !== lurkLevel) {
      if (lurkLevel === 0) {
        el.lurk.innerHTML = ART.char('bride');
        el.lurk.firstElementChild.style.opacity = '0';
      }
      lurkLevel = level;
      const svg = el.lurk.firstElementChild;
      requestAnimationFrame(() => {
        svg.style.opacity = String(0.12 + level * 0.14);
        svg.style.transform = `translateX(${-level * 6}vw) scale(${1 + level * 0.35})`;
      });
      // just enough light to see her by — never enough to see her clearly
      World.extraLights.length = 0;
      World.extraLights.push({ x: 1130 - level * 90, y: 560 - level * 30, r: 0.1 + level * 0.03, c: '170,180,190', i: 0.25 + level * 0.08, fl: 'dying', depth: 0.15 });
      if (level === 3) Sound.sfx('whisper');
    }
  }, 1000);
  function resetIdle() {
    idle = 0;
    if (lurkLevel) { lurkLevel = 0; el.lurk.innerHTML = ''; World.extraLights.length = 0; }
  }

  // ---------------------------------------------------------------- input
  el.stage.addEventListener('click', e => {
    resetIdle();
    if (e.target.closest('button, #phone, #panel, #sidebar, .screen')) return;
    advance();
  });
  document.addEventListener('keydown', e => {
    resetIdle();
    if (!started) return;
    if (overlayOpen()) { if (e.key === 'Escape') closeOverlays(); return; }
    const key = e.key.toLowerCase();
    if (key === 'escape') { openMenu(); return; }
    if (key === 'p') { openPhone(); return; }
    if (key === 'i') { openPocket(); return; }
    if (key === 'l') { openLog(); return; }
    if (key === 'm') { Sound.toggleMute(); syncVol(); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement && document.activeElement.classList.contains('choice')) return;
      e.preventDefault();
      advance();
    } else if (awaitingChoice && /^[1-9]$/.test(e.key)) {
      const b = el.choices.children[Number(e.key) - 1];
      if (b) b.click();
    }
  });

  el.btnBegin.addEventListener('click', () => {
    mem.plays++;
    saveMem();
    store.del(SAVE_KEY);
    begin(newState());
  });
  el.btnContinue.addEventListener('click', () => {
    const save = store.get(SAVE_KEY);
    if (!save) return;
    begin(Object.assign(newState(), save));
  });
  $('#btn-totitle').addEventListener('click', showTitle);

  showTitle();
})();

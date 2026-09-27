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
  const QUICK_KEY = 'redenvelope.quick';
  const SETTINGS_KEY = 'redenvelope.settings';
  const MEM_KEY = 'redenvelope.mem';

  // localStorage can throw (private mode, blocked storage) — the game must still run.
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // `mem` survives across playthroughs; the game uses it to remember you.
  const mem = Object.assign({ plays: 0, leftEnvelope: false, tabLeaves: 0, finished: 0, seen: {} }, store.get(MEM_KEY) || {});

  // Player settings. Text speed is ms per character (0 = instant); pace
  // speeds up the silent beats and pauses between lines.
  const TEXT_SPEED = { slow: 38, normal: 24, fast: 11, instant: 0 };
  const settings = Object.assign({ textSpeed: 'normal', pace: 1 }, store.get(SETTINGS_KEY) || {});
  const saveSettings = () => store.set(SETTINGS_KEY, settings);
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
        build(name);
        if (firstLoad) dark = scene.dark;
        el.bg.classList.remove('fading'); el.front.classList.remove('fading');
      }, firstLoad ? 0 : 420);
    }

    function build(name) {
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
    }
    // Rebuild the current scene from the current state, with no fade:
    // the photo on the wall is simply different now.
    function redraw() { if (curName) build(curName); }

    addEventListener('resize', resize);
    addEventListener('pointermove', e => {
      cam.tx = (e.clientX / innerWidth - 0.5) * 2;
      cam.ty = (e.clientY / innerHeight - 0.5) * 2;
    });
    resize();
    requestAnimationFrame(frame);

    // Scene space (1600×900) -> CSS px rect on the stage.
    function sceneRect(x, y, rw, rh) {
      const sc = Math.max(w / ART.W, h / ART.H);
      const ox = (w - ART.W * sc) / 2, oy = (h - ART.H * sc) / 2;
      return { left: ox + x * sc, top: oy + y * sc, width: rw * sc, height: rh * sc };
    }
    // A dark figure where one shouldn't be. mode 'appear' fades in and out in
    // place; 'pass' slides across (e.g. behind a window). Always under the lights.
    function apparition({ x, y, w: rw, h: rh, mode = 'appear', ms = 6000, tint = '#050506' }) {
      const d = document.createElement('div');
      d.className = `apparition ${mode}`;
      Object.assign(d.style, Object.fromEntries(Object.entries(sceneRect(x, y, rw, rh)).map(([k, v]) => [k, v + 'px'])));
      d.style.animationDuration = ms + 'ms';
      d.innerHTML = `<svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet"><circle cx="50" cy="40" r="22" fill="${tint}"/><path d="M8 200 C10 110 26 72 50 70 C74 72 90 110 92 200Z" fill="${tint}"/></svg>`;
      el.bg.after(d);
      setTimeout(() => d.remove(), ms + 100);
    }
    // The power in an old village house sags, then comes back slowly.
    function sag() {
      if (!scene) return;
      const was = darkTarget, sc = scene;
      darkTarget = Math.min(0.97, was + 0.14);
      setTimeout(() => { if (scene === sc) darkTarget = was; }, 1800);
    }

    return {
      setScene,
      apparition,
      sag,
      redraw,
      current: () => curName,
      reset() { curName = null; },
      setRain(v) { rainOn = !!v; el.rain.classList.toggle('on', rainOn); },
      extraLights,
    };
  })();

  function setChars(list, instant = false) {
    const keys = (list || []).map(c => (typeof c === 'string' ? c : c.k));
    [...el.chars.children].forEach(ch => {
      if (keys.includes(ch.dataset.k)) return;
      if (instant) { ch.remove(); return; }
      if (ch.classList.contains('leaving')) return;
      ch.classList.add('leaving');
      setTimeout(() => ch.remove(), 420);
    });
    keys.forEach((k, i) => {
      let ch = [...el.chars.children].find(c => c.dataset.k === k && !c.classList.contains('leaving'));
      if (!ch) {
        ch = document.createElement('div');
        ch.className = instant ? 'char instant' : 'char';
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

  const LASTING_FX = ['red', 'red-off', 'dark', 'darker', 'dark-off'];
  function applyScene(o, silent = false) {
    if ('bg' in o) World.setScene(val(o.bg));
    if ('rain' in o) World.setRain(val(o.rain));
    if ('chars' in o) setChars(val(o.chars), silent || !!o.cut);
    if (o.redraw) World.redraw();
    if ('item' in o) setItem(val(o.item));
    if ('ambient' in o) Sound.ambient(val(o.ambient));
    if ('fx' in o) doFx(silent ? [].concat(val(o.fx)).filter(f => LASTING_FX.includes(f)) : val(o.fx));
    if ('sfx' in o && !silent) Sound.sfx(val(o.sfx));
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
    const herN = typeof Her !== 'undefined' ? Her.unread() : 0;
    const phoneNew = !!S && ((S.flags.envelope && !S.flags.seenContact) || (S.flags.night && !S.flags.seenCall) || herN > 0);
    if (phoneNew && el.phoneBadge.hidden) {
      pulseClass($('#btn-phone'), 'buzz', 1000);
      Sound.sfx('ring');
    }
    el.phoneBadge.hidden = !phoneNew;
    el.phoneBadge.textContent = herN ? (herN > 99 ? '99+' : herN) : '';
    el.phoneBadge.classList.toggle('count', herN > 0);
    el.pocketBadge.hidden = !(S && pocketItems().length > (S.pocketSeen || 0));
  }

  // ---------------------------------------------------------------- flow
  let nodeSnap = null;   // the state as this scene began: quick saves replay from here
  let fastTo = null;     // when restoring, silently replay lines up to this index
  let lastShown = 0;     // index of the line currently on screen
  function goto(id, resumeAt = null) {
    node = STORY[id];
    if (!node) { console.error('Missing story node:', id); return; }
    S.node = id;
    store.set(SAVE_KEY, S);
    nodeSnap = JSON.stringify(S);
    fastTo = resumeAt;
    saveMem();
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
      if (fastTo !== null && lineIdx - 1 < fastTo) {   // restoring a quick save: replay silently
        if (line.do) line.do(S, mem);
        applyScene(line, true);
        continue;
      }
      fastTo = null;
      lastShown = lineIdx - 1;
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
        setTimeout(() => { busy = false; next(); }, pause(line.beat));
        return;
      }
      if (line.wait) { busy = true; setTimeout(() => { busy = false; next(); }, pause(line.wait)); return; }
    }
    fastTo = null;
    lastShown = lines.length;
    endNode();
  }

  function endNode() {
    const choices = (val(node.choices) || []).filter(c => !c.if || c.if(S, mem));
    if (choices.length) { showChoices(choices); return; }
    if (node.end) { showEnd(node.end); return; }
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
    // Remember which lines have been read, so fast-forward knows where to stop.
    curKey = `${S.node}:${lineIdx - 1}`;
    curSeen = !!mem.seen[curKey];
    mem.seen[curKey] = 1;
    // Slow lines are for dread, not for waiting: long ones speed up to finish in ~4s.
    const base = TEXT_SPEED[settings.textSpeed] ?? 24;
    const speed = base === 0 ? 0 : slow ? Math.max(30, Math.min(70, 4200 / resolveText(text).length)) * base / 24 : base;
    typeOut(text, speed);
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
    if (speed === 0) { finishTyping(); return; }
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
    setTimeout(() => { bigLock = false; }, pause(700));
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
    if (typing) { if (!unskippable || skipping) finishTyping(); return; }
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
    const quick = store.get(QUICK_KEY);
    $('#btn-quickload').hidden = !(quick && quick.snap && STORY[quick.snap.node]);
    setSkip(false);
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
    if (mem.lastEnding === 'wedding') line = 'She has her husband now. The water is very still.';
    if (mem.lastEnding === 'substitute') line = 'Somebody else picked it up.';
    if (mem.lastEnding === 'true') line = 'There is one more bowl on the altar. Somebody always remembers to fill it.';
    el.titleMem.textContent = line;
    const n = mem.her ? mem.her.msgs.filter(m => m.from === 'her' && !m.read).length : 0;
    $('#title-her').textContent = n ? `${n} unread message${n > 1 ? 's' : ''} from ♥ 秋月` : '';
  }

  function begin(state, resumeAt = null) {
    Sound.init();
    closeOverlays();
    setSkip(false);
    S = state;
    started = true;
    lastDay = null;
    World.reset();
    el.title.hidden = true;
    el.end.hidden = true;
    el.sidebar.hidden = false;
    el.chars.innerHTML = '';
    setItem(null);
    el.fx.classList.remove('red');
    goto(S.node || 'intro', resumeAt);
  }

  const DAY_MS = 86400000;
  const daysLeft = () => Math.max(0, Math.ceil((mem.weddingAt - Date.now()) / DAY_MS));

  // The chapter ends with a wedding invitation, dated on the player's real
  // calendar: six days from tonight, which falls on 七夕, the lovers' night.
  // Day One ends on the invitation (and carries on to Day Two); the story's
  // three endings get a final card of their own.
  const ENDINGS = ['wedding', 'substitute', 'true'];
  function showEnd(end = {}) {
    started = false;
    el.textbox.hidden = true;
    closeOverlays();
    setSkip(false);
    if (end.final) { showFinal(end); return; }
    mem.finished++;
    if (!mem.weddingAt) mem.weddingAt = Date.now() + 6 * DAY_MS;
    saveMem();
    if (end.next) { S.node = end.next; store.set(SAVE_KEY, S); } else store.del(SAVE_KEY);
    $('#end-kicker').textContent = '第一日 · Day One';
    $('#end-card').hidden = false;
    $('#end-final').hidden = true;
    $('#btn-nextday').hidden = !end.next;
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

  function showFinal(end) {
    mem.endings = mem.endings || {};
    mem.endings[end.final] = Date.now();
    mem.lastEnding = end.final;
    saveMem();
    store.del(SAVE_KEY);
    const found = ENDINGS.filter(e => mem.endings[e]).length;
    $('#end-kicker').textContent = '終 · The End';
    $('#end-card').hidden = true;
    $('#end-final').hidden = false;
    $('#final-cn').textContent = end.cn;
    $('#final-en').textContent = end.en;
    $('#final-count').textContent = `Endings found: ${found} of ${ENDINGS.length}` + (found < ENDINGS.length ? ' · Some of them need you to remember.' : '');
    $('#end-note').textContent = end.note || '';
    $('#btn-nextday').hidden = true;
    Sound.ambient(end.final === 'true' ? ['morning'] : ['drone']);
    setTimeout(() => { el.end.hidden = false; }, 1600);
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
    if (Her.total()) html += `<li><button class="fav" data-thread="1">Messages · ♥ 秋月<span class="c-sub">${Her.total()} messages</span></button></li>`;
    if (S.flags.envelope) {
      html += `<li class="section">Favorites</li><li><button class="fav" data-bride="1">♥ 秋月<span class="c-sub">${S.flags.night ? 'Missed call · 3:33 AM' : 'wife'}</span></button></li>`;
      html += `<li class="section">All contacts</li>`;
    }
    html += list.map(c => `<li><button data-name="${esc(c.n)}">${esc(c.n)}</button></li>`).join('');
    el.contacts.innerHTML = html;
    el.phone.hidden = false;
    if (Her.total()) Her.openThread(); // it always opens on her
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
    if (b.dataset.thread) { Her.openThread(); return; }
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

  // ---------------------------------------------------------------- her messages
  // Qiu-Yue texts you, from dinner onward. It only goes one way: you can't
  // answer. Paying attention still feeds her: reading makes her write back at
  // once, picking up her calls makes her call more. Ignoring her is the only
  // thing that slowly calms her.
  // Her messages live in `mem`, so they keep arriving between sessions.
  const Her = (() => {
    const st = mem.her = Object.assign({ active: false, msgs: [], attention: 0, lastAt: 0, lastCallAt: 0 }, mem.her || {});
    const fmt = ms => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const has = k => S && S.family.includes(k);
    const lost = k => S && S.lost.includes(k);

    const POOLS = {
      early: ['are you awake', 'the water is warm tonight', 'i can hear the clock in your house', '…', 'you used to hum this',
        'count the bowls', 'i folded one for you too', "don't let go this time", 'you still have my hand in your pocket', 'is it raining where you are', 'six more days'],
      needy: ['why don’t you answer', 'you answered me when we were small', 'i know you have your phone', 'the screen lights up your face',
        'i can see the light from your window', 'are you angry with me', 'please', 'please', 'did i do something wrong', 'you’re reading something else',
        'look at me', 'i waited twenty years. you can’t wait one minute?'],
      seen: ['you read it', 'i saw that', 'you’re here', 'don’t close it', 'stay', 'talk to me', 'i knew you’d look', 'hi', 'hi', 'you always look'],
      late: ['i’m at the window', 'it’s so cold in the water', 'our room is ready', 'i set a bowl for you', 'can you hear the frogs? i made them stop', 'i’m in the hall',
        { t: 'your ama is lying to you', if: () => has('ama') }, { t: 'she folded it crooked. the ingot', if: () => lost('wen') },
        { t: 'your house is so quiet now', if: () => S && S.lost.length >= 2 }],
      away: ['where did you go', 'you closed it', 'i can still see you', 'come back', 'it’s dark here', 'are you sleeping', 'i’m counting',
        'good night husband', 'the water is so still tonight', 'you left me again', 'please come back'],
    };
    function pick(name) {
      const recent = new Set(st.msgs.slice(-8).map(m => m.t));
      const pool = POOLS[name].map(e => (typeof e === 'string' ? { t: e } : e)).filter(e => (!e.if || e.if()) && !recent.has(e.t));
      const list = pool.length ? pool : POOLS[name].filter(e => typeof e === 'string').map(t => ({ t }));
      return list[Math.floor(Math.random() * list.length)].t;
    }

    const unread = () => st.msgs.filter(m => m.from === 'her' && !m.read).length;
    const threadOpen = () => !el.phone.hidden && !$('#phone-thread-view').hidden;

    function receive(t, at = Date.now(), quiet = false) {
      st.msgs.push({ from: 'her', t, at, read: false });
      if (st.msgs.length > 300) st.msgs.splice(0, st.msgs.length - 300);
      st.lastAt = at;
      saveMem();
      if (quiet) return;
      if (threadOpen()) { markRead(false); renderThread(); return; }
      Sound.sfx('buzz');
      pulseClass($('#btn-phone'), 'buzz', 900);
      updateHud();
    }

    // You looked. She knows.
    function markRead(answer = true) {
      const n = unread();
      st.msgs.forEach(m => { if (m.from === 'her' && !m.read) { m.read = true; m.readAt = Date.now(); } });
      if (n) {
        st.attention += 2;
        if (answer) setTimeout(() => receive(pick('seen')), 1800 + Math.random() * 2200);
      }
      saveMem();
      updateHud();
    }

    function renderThread() {
      const box = $('#thread');
      const lastRead = [...st.msgs].reverse().find(m => m.from === 'her' && m.read);
      box.innerHTML = st.msgs.slice(-80).map(m =>
        `<div class="bubble ${m.from}"><span>${esc(m.t)}</span><em>${fmt(m.at)}${m === lastRead ? ' · Seen' : ''}</em></div>`).join('')
        || '<p class="empty">No messages.</p>';
      box.scrollTop = box.scrollHeight;
    }

    // Incoming call: a card slides in while you read. It doesn't stop the story.
    let ringTimer = null, ringEnd = null;
    function incoming() {
      const card = $('#incoming');
      if (!card.hidden || !started) return;
      st.lastCallAt = Date.now();
      card.hidden = false;
      Sound.sfx('buzz');
      ringTimer = setInterval(() => Sound.sfx('buzz'), 1300);
      ringEnd = setTimeout(() => endCall('missed'), 11000);
    }
    function endCall(how) {
      clearInterval(ringTimer); clearTimeout(ringEnd);
      $('#incoming').hidden = true;
      if (how === 'missed') { if (Math.random() < 0.6) setTimeout(() => receive(pick('needy')), 2500); }
      if (how === 'declined') {
        st.attention += 1;
        if (Math.random() < 0.35) setTimeout(incoming, 4000);           // she calls straight back
        else setTimeout(() => receive('why did you do that'), 3000);
      }
      if (how === 'answered') {
        st.attention += 5;
        el.phone.hidden = false;
        $('#phone-list-view').hidden = true; $('#phone-thread-view').hidden = true; $('#phone-call-view').hidden = false;
        $('#call-name').textContent = '♥ 秋月';
        $('#call-status').textContent = 'Connected · 00:00';
        $('#call-line').textContent = '';
        Sound.sfx('whisper');
        const lines = ['…you picked up.', '…say my name.', '…', '…you hung up first. you always let go first.'];
        lines.forEach((l, i) => setTimeout(() => { if (!el.phone.hidden) $('#call-line').textContent = l; }, 1400 + i * 2200));
      }
      saveMem();
    }

    // The heartbeat of it: how often she writes, and when she calls.
    function interval() {
      const base = S && S.flags.night ? 30000 : 50000;
      return Math.max(6000, base / (1 + st.attention * 0.2) * (0.7 + Math.random() * 0.6));
    }
    let nextAt = Date.now() + 25000;
    setInterval(() => {
      if (!started || !S || !S.flags.herAwake || S.node === 'end_true') return;
      if (!st.active) { st.active = true; st.lastAt = Date.now(); saveMem(); }
      if (!S.flags.herFirst) { S.flags.herFirst = true; nextAt = Date.now() + 9000 + Math.random() * 6000; }
      if (Date.now() - (st.decayAt || 0) > 40000) {           // ignoring her, slowly, works
        st.decayAt = Date.now();
        if (!threadOpen() && st.attention > 0) st.attention -= 1;
      }
      if (Date.now() < nextAt) return;
      nextAt = Date.now() + interval();
      const u = unread();
      if (u >= 6 && Math.random() < 0.15) {                  // "A-Wei" "A-Wei" "A-Wei"
        const n = 3 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) setTimeout(() => receive('A-Wei'), k * 900);
        return;
      }
      const tier = u >= 4 && Math.random() < 0.7 ? 'needy' : S.flags.night && Math.random() < 0.5 ? 'late' : 'early';
      receive(pick(tier));
      if (st.attention >= 6 && Date.now() - st.lastCallAt > 90000 && Math.random() < 0.25) setTimeout(incoming, 5000);
    }, 1000);

    // While you were away, she kept writing. One every twenty minutes or so, up to sixty.
    if (st.active && st.lastAt && mem.lastEnding !== 'true') {
      const gap = Date.now() - st.lastAt, every = 20 * 60000;
      const n = Math.min(60, Math.floor(gap / every));
      for (let k = 1; k <= n; k++) {
        const at = st.lastAt + k * every - Math.random() * every * 0.8;
        receive(k % 7 === 0 ? pick('needy') : pick('away'), at, true);
      }
    }

    $('#inc-decline').addEventListener('click', e => { e.stopPropagation(); endCall('declined'); });
    $('#inc-answer').addEventListener('click', e => { e.stopPropagation(); endCall('answered'); });
    $('#thread-back').addEventListener('click', e => {
      e.stopPropagation();
      $('#phone-thread-view').hidden = true;
      $('#phone-list-view').hidden = false;
    });

    return {
      unread, total: () => st.msgs.filter(m => m.from === 'her').length, attention: () => st.attention,
      markRead, renderThread, receive, incoming,
      openThread() {
        $('#phone-list-view').hidden = true; $('#phone-call-view').hidden = true; $('#phone-thread-view').hidden = false;
        renderThread(); markRead();
      },
    };
  })();
  window.Her = Her; // the story asks about her too

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
  const seg = (key, opts) => `<div class="seg" data-set="${key}">${opts.map(([v, label]) =>
    `<button type="button" data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  function openMenu() {
    openPanel('Menu', `<div class="menu-panel">
      <div class="setting"><span>Text speed</span>${seg('textSpeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</div>
      <div class="setting"><span>Game speed</span>${seg('pace', [[1, '1×'], [1.5, '1.5×'], [2, '2×'], [3, '3×']])}</div>
      <button class="menu-btn" data-act="resume">Resume</button>
      <button class="menu-btn" data-act="title">Return to title</button>
      <p class="empty">F fast-forward · Q quick save · R quick load · P phone · I pocket · L log · M mute</p></div>`);
  }
  // Load: your quick save, or the automatic save from the start of the scene.
  function openLoad() {
    const quick = store.get(QUICK_KEY), auto = store.get(SAVE_KEY);
    const when = t => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const slot = (act, title, sub, ok) => `<div class="save-slot"><div><h4>${title}</h4><p>${sub}</p></div>
      <button class="menu-btn" data-act="${act}" ${ok ? '' : 'disabled'}>Load</button></div>`;
    openPanel('Load', slot('loadquick', 'Quick save', quick ? `${esc(when(quick.at))} · “${esc(quick.preview)}”` : 'Empty. Press Save or Q during play.', !!quick)
      + slot('loadauto', 'Start of scene', auto && auto.node ? 'Saved automatically when the current scene began.' : 'Empty.', !!(auto && auto.node)));
  }
  $('#panel-content').addEventListener('click', e => {
    const opt = e.target.closest('.seg button');
    if (opt) {
      const key = opt.parentElement.dataset.set;
      settings[key] = key === 'pace' ? Number(opt.dataset.v) : opt.dataset.v;
      saveSettings();
      opt.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === opt));
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    closeOverlays();
    if (b.dataset.act === 'title') showTitle();
    if (b.dataset.act === 'loadquick') quickLoad();
    if (b.dataset.act === 'loadauto') { const a = store.get(SAVE_KEY); if (a) begin(Object.assign(newState(), a)); }
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
  const ICON_EFFIGY = svgIcon('<ellipse cx="32" cy="34" rx="24" ry="27" fill="#d8d0d8"/><path d="M8 30 C8 4 56 4 56 30 C46 18 18 18 8 30Z" fill="#0b0b0e"/><circle cx="19" cy="42" r="6" fill="#e0506a" opacity=".7"/><circle cx="45" cy="42" r="6" fill="#e0506a" opacity=".7"/><path d="M16 33 Q23 27 30 32 Q23 37 16 33Z M34 32 Q41 27 48 33 Q41 37 34 32Z" fill="#fff" stroke="#15100d" stroke-width="1.6"/><path d="M25 50 Q32 55 39 50" stroke="#b3102a" stroke-width="3" fill="none"/>');
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

  // ---------------------------------------------------------------- unease director
  // Small, quiet, unexplained events while you read. Never loud, never sudden,
  // never acknowledged by the story. Each one fits the scene it happens in;
  // they come more often as the story darkens.
  const Unease = (() => {
    const inScene = (...names) => () => names.includes(World.current());
    const indoors = inScene('house', 'house_watch', 'bedroom', 'hall');
    const has = sel => () => !!el.chars.querySelector(sel);
    const after = flag => () => !!(S && S.flags[flag]);
    const all = (...fs) => () => fs.every(f => f());

    const EVENTS = [
      { id: 'knock', w: 3, ok: indoors, run: () => Sound.sfx('knockFar') },
      { id: 'steps', w: 2, ok: indoors, run: () => Sound.sfx('stepsAbove') },
      { id: 'hum', w: 2, ok: after('envelope'), run: () => Sound.sfx('hum') },
      { id: 'drip', w: 1, ok: all(indoors, after('envelope')), run: () => Sound.sfx('dripNear') },
      { id: 'sag', w: 2, ok: inScene('house', 'house_watch', 'hall', 'bedroom'), run: () => World.sag() },

      // the living, all at once, stop looking at their food and look at you
      { id: 'glance', w: 3, ok: all(has('[data-k="mom"],[data-k="ama"],[data-k="wen"]'), after('envelope')), run() {
        const fam = [...el.chars.querySelectorAll('[data-k="mom"],[data-k="ama"],[data-k="wen"]')];
        fam.forEach(c => c.classList.add('watching'));
        setTimeout(() => fam.forEach(c => c.classList.remove('watching')), 3800);
      } },
      // the effigies' heads tilt while you're reading, then settle
      { id: 'tilt', w: 3, ok: has('[data-k="men"]'), run() {
        const m = el.chars.querySelector('[data-k="men"]');
        m.style.setProperty('--tilt', `${(Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5)}deg`);
        m.classList.add('tilted');
        setTimeout(() => m.classList.remove('tilted'), 9000);
      } },

      // someone standing where no one should be
      { id: 'roadside', w: 2, ok: inScene('road', 'car', 'car_env'), run: () => World.apparition({ x: 1188, y: 470, w: 34, h: 80, ms: 5000 }) },
      { id: 'window', w: 3, ok: inScene('bedroom'), run: () => World.apparition({ x: 900, y: 240, w: 160, h: 300, mode: 'pass', ms: 7000, tint: '#03050a' }) },
      { id: 'doorway', w: 2, ok: inScene('hall'), run: () => World.apparition({ x: 10, y: 360, w: 110, h: 420, ms: 6500, tint: '#0a0d12' }) },
      { id: 'pane', w: 1, ok: inScene('house'), run: () => World.apparition({ x: 290, y: 330, w: 80, h: 160, ms: 6000, tint: '#1b2530' }) },


      // the countdown slips a day ahead, just for a moment
      { id: 'seal', w: 1, ok: () => !!(S && S.day > 1), run() {
        const num = el.countdown.querySelector('.num');
        num.textContent = NUMERALS[S.day - 1];
        setTimeout(() => { num.textContent = NUMERALS[S.day] || S.day; }, 650);
      } },

      // a word in what you just read is, briefly, a different word
      { id: 'word', w: 2, ok: () => !!(S && S.flags.envelope) && !typing && !el.textbox.hidden && el.text.classList.contains('narr'), run() {
        const line = fullText, words = line.split(' ');
        const idx = words.map((w, i) => (w.replace(/\W/g, '').length > 3 ? i : -1)).filter(i => i >= 0);
        if (!idx.length) return;
        const i = idx[Math.floor(Math.random() * idx.length)];
        const swap = ['her', 'cold', 'wife', 'water', 'hers', 'drowned', 'seven'][Math.floor(Math.random() * 7)];
        words[i] = words[i].replace(/[A-Za-z’'-]+/, swap);
        el.text.textContent = words.join(' ');
        setTimeout(() => { if (fullText === line) el.text.textContent = line; }, 450);
      } },
    ];

    let nextAt = Date.now() + 20000, last = null;
    function tension() {
      if (!S) return 1;
      let f = 1;
      if (S.flags.envelope) f *= 0.75;
      if (S.flags.night) f *= 0.7;
      f *= Math.pow(0.9, S.refusals || 0);
      return f;
    }
    setInterval(() => {
      if (!started || !S || document.hidden || overlayOpen() || bigShowing) return;
      if (Date.now() < nextAt) return;
      const pool = EVENTS.filter(e => e.id !== last && e.ok());
      nextAt = Date.now() + (22000 + Math.random() * 30000) * tension();
      if (!pool.length) return;
      let r = Math.random() * pool.reduce((a, e) => a + e.w, 0);
      const ev = pool.find(e => (r -= e.w) < 0) || pool[0];
      last = ev.id;
      ev.run();
    }, 1000);
    return { fire: id => { const e = EVENTS.find(x => x.id === id); if (e) e.run(); } };
  })();
  window.__unease = Unease; // for playtesting: __unease.fire('glance')

  // ---------------------------------------------------------------- saving, fast-forward
  let curKey = '', curSeen = false, skipping = false, toastTimer = null;
  const pause = ms => (skipping ? 40 : ms / (settings.pace || 1));

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  // A quick save is the scene's starting state plus how far into it you were.
  // Loading replays the lines you'd already read silently, so nothing that
  // happened (a refusal, a keepsake) is applied twice.
  function quickSave() {
    if (!started || !nodeSnap) return;
    const preview = awaitingChoice ? 'A choice' : bigShowing ? el.big.innerText.split('\n')[0] : resolveText(fullText || '');
    store.set(QUICK_KEY, { snap: JSON.parse(nodeSnap), idx: awaitingChoice ? Infinity : lastShown, at: Date.now(),
      preview: preview.length > 70 ? preview.slice(0, 67) + '…' : preview });
    toast('Saved');
  }
  function quickLoad() {
    const q = store.get(QUICK_KEY);
    if (!q || !q.snap) return;
    begin(Object.assign(newState(), q.snap), q.idx === null ? Infinity : q.idx);
    toast('Loaded');
  }

  // Fast-forward: races through lines you've already read, stops at anything
  // new and at every choice.
  function setSkip(on) {
    skipping = !!on && started;
    $('#btn-skip').classList.toggle('active', skipping);
  }
  setInterval(() => {
    if (!skipping) return;
    if (!started || awaitingChoice || overlayOpen() || !el.end.hidden) { setSkip(false); return; }
    if (busy) return;
    if (bigShowing) { bigLock = false; advance(); return; }
    if (el.textbox.hidden) return;
    if (!curSeen) { setSkip(false); toast('New text'); return; }
    if (typing) finishTyping();
    advance();
  }, 70);

  $('#btn-skip').addEventListener('click', e => { e.stopPropagation(); setSkip(!skipping); });
  $('#btn-save').addEventListener('click', e => { e.stopPropagation(); quickSave(); });
  $('#btn-load').addEventListener('click', e => { e.stopPropagation(); openLoad(); });
  $('#btn-quickload').addEventListener('click', () => { mem.plays++; saveMem(); quickLoad(); });

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
    if (key === 'f') { setSkip(!skipping); return; }
    if (key === 'q') { quickSave(); return; }
    if (key === 'r') { if (store.get(QUICK_KEY)) quickLoad(); return; }
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
  $('#btn-nextday').addEventListener('click', () => { const a = store.get(SAVE_KEY); if (a) begin(Object.assign(newState(), a)); });

  showTitle();
})();

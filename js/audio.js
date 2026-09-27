// All sound is synthesized with Web Audio — no audio files needed.
// Swap any loop/sfx for a real recording later by replacing its function.
//
// Routing: every source goes to a bus that feeds both the dry master and a
// convolution reverb, so things sound like they are *somewhere* — a room,
// a valley, a courtyard — instead of inside your head.
window.Sound = (() => {
  let ctx = null, master = null, reverb = null, noiseBuf = null, muted = false;
  const active = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(comp);

    reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.2, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // A synthetic room: stereo noise with an exponential tail.
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, len = rate * seconds;
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // A bus: dry to master, plus a send to the reverb.
  function bus(send = 0.3, pan = 0) {
    const g = ctx.createGain();
    let out = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p); out = p;
    }
    out.connect(master);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send; out.connect(s).connect(reverb); }
    return g;
  }

  // ---------- building blocks ----------
  function noise() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }
  function filter(type, freq, q = 1) {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  function tone(f, t, dur, vol, type = 'sine', dest = master) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function burst(t, dur, vol, type, freq, q = 1, dest = master) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const f = filter(type, freq, q);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(dest);
    n.start(t, Math.random() * 2);
    n.stop(t + dur + 0.05);
    return { n, f, g };
  }
  function thump(t, f0, f1, dur, vol, dest = master) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function distCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  // Randomly re-arming timer (for things that shouldn't sound mechanical).
  function scatter(fn, min, max) {
    let id, dead = false;
    const go = () => { if (dead) return; fn(); id = setTimeout(go, min + Math.random() * (max - min)); };
    id = setTimeout(go, Math.random() * min);
    return { clear() { dead = true; clearTimeout(id); } };
  }

  // ---------- ambient loops ----------
  const LOOPS = {
    rain() {
      const out = bus(0.15);
      const a = noise(), b = noise();
      a.connect(filter('highpass', 700)).connect(filter('lowpass', 7000)).connect(out);
      const rg = ctx.createGain(); rg.gain.value = 0.9;
      b.connect(filter('lowpass', 240)).connect(rg).connect(out);
      a.start(); b.start(0.7);
      // individual heavy drops on metal and leaves
      const drops = scatter(() => {
        const t = ctx.currentTime;
        tone(2200 + Math.random() * 3000, t, 0.02, 0.08 + Math.random() * 0.1, 'sine', out);
      }, 40, 220);
      return { out, level: 0.2, nodes: [a, b], timer: drops };
    },
    rain_in() { // rain heard through a tin roof
      const out = bus(0.1);
      const a = noise();
      a.connect(filter('lowpass', 900)).connect(filter('highpass', 120)).connect(out);
      a.start();
      const plinks = scatter(() => tone(900 + Math.random() * 700, ctx.currentTime, 0.03, 0.12, 'triangle', out), 90, 400);
      return { out, level: 0.2, nodes: [a], timer: plinks };
    },
    drone() { // two tones a tritone apart, slowly beating against each other
      const out = bus(0.6);
      const lp = filter('lowpass', 260);
      const oscs = [[55, 'sine', 1], [55.4, 'sine', 0.8], [77.8, 'sawtooth', 0.25], [110.9, 'triangle', 0.12]].map(([f, type, v]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = v;
        o.connect(g).connect(lp); o.start();
        return o;
      });
      const breath = noise();
      const bg = ctx.createGain(); bg.gain.value = 0.25;
      breath.connect(filter('bandpass', 400, 3)).connect(bg).connect(lp);
      breath.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
      const lfoG = ctx.createGain(); lfoG.gain.value = 140;
      lfo.connect(lfoG).connect(lp.frequency); lfo.start();
      lp.connect(out);
      return { out, level: 0.16, nodes: [...oscs, breath, lfo] };
    },
    sub() { // felt more than heard — put headphones on
      const out = bus(0);
      const o1 = ctx.createOscillator(); o1.frequency.value = 31;
      const o2 = ctx.createOscillator(); o2.frequency.value = 46.5;
      const am = ctx.createGain(); am.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18;
      const lg = ctx.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain);
      o1.connect(am); o2.connect(am); am.connect(out);
      o1.start(); o2.start(); lfo.start();
      return { out, level: 0.45, nodes: [o1, o2, lfo] };
    },
    room() {
      const out = bus(0);
      const a = noise();
      a.connect(filter('lowpass', 180)).connect(out);
      const hum = ctx.createOscillator(); hum.frequency.value = 60;
      const hg = ctx.createGain(); hg.gain.value = 0.12;
      hum.connect(hg).connect(out);
      a.start(); hum.start();
      return { out, level: 0.12, nodes: [a, hum] };
    },
    clock() { // an old wall clock in the next room
      const out = bus(0.5, -0.3);
      let tock = false;
      const tick = () => {
        const t = ctx.currentTime + 0.02;
        burst(t, 0.03, 0.5, 'bandpass', tock ? 1800 : 2600, 4, out);
        tone(tock ? 900 : 1300, t, 0.015, 0.15, 'square', out);
        tock = !tock;
      };
      tick();
      return { out, level: 0.35, nodes: [], timer: setInterval(tick, 1000) };
    },
    night() { // paddy-field frogs and crickets. When they stop, something is near.
      const out = bus(0.35);
      const croak = () => {
        const t = ctx.currentTime + 0.02;
        const f = 180 + Math.random() * 260;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const g = ctx.createGain(); g.gain.value = 0.2 + Math.random() * 0.4;
        if (pan) { pan.pan.value = Math.random() * 2 - 1; g.connect(pan).connect(out); } else g.connect(out);
        const n = 2 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) {
          const s = t + k * (0.16 + Math.random() * 0.05);
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const am = ctx.createGain(); am.gain.value = 0;
          const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 30 + Math.random() * 20;
          const lg = ctx.createGain(); lg.gain.value = 0.5;
          lfo.connect(lg).connect(am.gain);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0, s);
          env.gain.linearRampToValueAtTime(0.6, s + 0.02);
          env.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
          o.connect(filter('bandpass', f * 2.2, 2.5)).connect(am).connect(env).connect(g);
          o.start(s); o.stop(s + 0.14); lfo.start(s); lfo.stop(s + 0.14);
        }
      };
      const chirp = () => {
        const t = ctx.currentTime + 0.02;
        for (let k = 0; k < 3; k++) tone(4300 + Math.random() * 200, t + k * 0.04, 0.018, 0.05, 'sine', out);
      };
      const frogs = [scatter(croak, 120, 600), scatter(croak, 200, 900), scatter(croak, 300, 1200)];
      const crickets = scatter(chirp, 350, 700);
      return { out, level: 0.3, nodes: [], timer: { clear() { frogs.forEach(f => f.clear()); crickets.clear(); } } };
    },
    morning() { // birds: the world pretending everything is fine
      const out = bus(0.4);
      const bird = () => {
        const t = ctx.currentTime + 0.02;
        const base = 2400 + Math.random() * 1600;
        const n = 2 + Math.floor(Math.random() * 4);
        for (let k = 0; k < n; k++) {
          const s = t + k * 0.11;
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(base, s);
          o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), s + 0.06);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.12, s + 0.01); g.gain.linearRampToValueAtTime(0, s + 0.08);
          o.connect(g).connect(out); o.start(s); o.stop(s + 0.1);
        }
      };
      return { out, level: 0.5, nodes: [], timer: scatter(bird, 900, 3500) };
    },
    heart() {
      const out = bus(0);
      const beat = () => { const t = ctx.currentTime + 0.05; thump(t, 75, 38, 0.22, 0.9, out); thump(t + 0.27, 70, 36, 0.2, 0.55, out); };
      beat();
      return { out, level: 0.75, nodes: [], timer: setInterval(beat, 1000) };
    },
    heart_fast() {
      const out = bus(0);
      const beat = () => { const t = ctx.currentTime + 0.05; thump(t, 80, 40, 0.18, 1, out); thump(t + 0.2, 75, 38, 0.16, 0.6, out); };
      beat();
      return { out, level: 0.85, nodes: [], timer: setInterval(beat, 560) };
    },
    drip() { // a single drop somewhere in the dark, never quite regular
      const out = bus(0.8, 0.2);
      const drop = () => {
        const t = ctx.currentTime + 0.02;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(900 + Math.random() * 300, t);
        o.frequency.exponentialRampToValueAtTime(2200 + Math.random() * 600, t + 0.04);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.1);
      };
      return { out, level: 0.5, nodes: [], timer: scatter(drop, 1300, 3900) };
    },
    suona() { // a far-off wedding horn, slightly out of tune, bouncing off the valley
      const out = bus(1.2);
      const ws = ctx.createWaveShaper(); ws.curve = distCurve(6);
      ws.connect(filter('lowpass', 1500)).connect(out);
      const notes = [587, 659, 784, 880, 988, 784, 659, 523];
      const reed = (f, t, dur) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 0.94, t);
        o.frequency.linearRampToValueAtTime(f, t + 0.08);
        o.frequency.setValueAtTime(f, t + dur - 0.08);
        o.frequency.linearRampToValueAtTime(f * 0.97, t + dur); // wail down at the end
        const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
        const vg = ctx.createGain(); vg.gain.value = f * 0.014;
        vib.connect(vg).connect(o.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.04);
        g.gain.setValueAtTime(0.3, t + dur - 0.05);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(filter('bandpass', 1800, 1.1)).connect(g).connect(ws);
        o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
      };
      const phrase = () => {
        let t = ctx.currentTime + 0.1;
        const len = 4 + Math.floor(Math.random() * 5);
        for (let i = 0; i < len; i++) {
          const f = notes[Math.floor(Math.random() * notes.length)] * (1 + (Math.random() - 0.5) * 0.035);
          const dur = 0.22 + Math.random() * 0.55;
          reed(f, t, dur);
          t += dur;
        }
      };
      phrase();
      return { out, level: 0.07, nodes: [], timer: setInterval(phrase, 5600) };
    },
  };

  function stopLoop(a) {
    if (a.timer) a.timer.clear ? a.timer.clear() : clearInterval(a.timer);
    a.nodes.forEach(n => { try { n.stop(); } catch (e) {} });
    a.out.disconnect();
  }

  function ambient(names) {
    if (!ctx) return;
    names = [].concat(names || []);
    const t = ctx.currentTime;
    for (const k of Object.keys(active)) {
      if (names.includes(k)) continue;
      const a = active[k];
      delete active[k];
      a.out.gain.cancelScheduledValues(t);
      a.out.gain.setValueAtTime(a.out.gain.value, t);
      a.out.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => stopLoop(a), 1400);
    }
    for (const k of names) {
      if (active[k] || !LOOPS[k]) continue;
      const a = LOOPS[k]();
      a.out.gain.setValueAtTime(0, t);
      a.out.gain.linearRampToValueAtTime(a.level, t + 2);
      active[k] = a;
    }
  }

  // ---------- one-shots ----------
  const SFX = {
    click(t) { tone(700, t, 0.04, 0.04); },
    ring(t) { // phone buzzing in a cup holder
      const lp = filter('lowpass', 380); lp.connect(master);
      for (let k = 0; k < 3; k++) tone(118, t + k * 0.85, 0.45, 0.4, 'square', lp);
    },
    knock(t) { const b = bus(0.7, 0.4); burst(t, 0.18, 0.9, 'lowpass', 420, 1, b); thump(t, 110, 50, 0.18, 0.8, b); },
    step(t) { const b = bus(0.6, (Math.random() - 0.5) * 0.8); burst(t, 0.14, 0.45, 'lowpass', 600, 1, b); burst(t + 0.02, 0.12, 0.12, 'highpass', 2600, 1, b); },
    steps(t) {
      const b = bus(0.4);
      for (let k = 0; k < 5; k++) {
        const s = t + k * 0.48 + Math.random() * 0.06;
        burst(s, 0.12, 0.35, 'lowpass', 650, 1, b);
        burst(s + 0.02, 0.1, 0.07, 'highpass', 2600, 1, b);
      }
    },
    sting(t) {
      const b = bus(0.8);
      const lp = filter('lowpass', 200, 4);
      lp.frequency.setValueAtTime(200, t);
      lp.frequency.exponentialRampToValueAtTime(3500, t + 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      lp.connect(g).connect(b);
      [220, 233, 311, 330, 466].forEach(f => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        o.connect(lp); o.start(t); o.stop(t + 1.9);
      });
      burst(t, 1.2, 0.3, 'bandpass', 1200, 0.5, b);
      SFX.tinnitus(t + 0.3);
    },
    tinnitus(t) { // the ringing left behind after a shock
      const o = ctx.createOscillator(); o.frequency.value = 7200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(master); o.start(t); o.stop(t + 3.6);
    },
    whisper(t) {
      const n = ctx.createBufferSource(); n.buffer = noiseBuf;
      const am = ctx.createGain(); am.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 7 + Math.random() * 5;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
      lfo.connect(lfoG).connect(am.gain);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.5, t + 0.3);
      env.gain.linearRampToValueAtTime(0, t + 1.4);
      let dest = bus(0.5);
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.setValueAtTime(-0.9, t);
        p.pan.linearRampToValueAtTime(0.9, t + 1.4);
        p.connect(dest); dest = p;
      }
      n.connect(filter('bandpass', 2700, 2.5)).connect(am).connect(env).connect(dest);
      n.start(t, Math.random()); n.stop(t + 1.5); lfo.start(t); lfo.stop(t + 1.5);
    },
    water(t) { // going under: muffled rush, then bubbles
      const b = bus(0.9);
      const r = burst(t, 2.2, 0.8, 'lowpass', 900, 1, b);
      r.f.frequency.setValueAtTime(900, t);
      r.f.frequency.exponentialRampToValueAtTime(180, t + 0.5);
      thump(t, 70, 30, 1.4, 0.7, b);
      for (let k = 0; k < 14; k++) {
        const s = t + 0.2 + Math.random() * 1.6;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(250 + Math.random() * 300, s);
        o.frequency.exponentialRampToValueAtTime(700 + Math.random() * 600, s + 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, s); g.gain.exponentialRampToValueAtTime(0.001, s + 0.07);
        o.connect(g).connect(b); o.start(s); o.stop(s + 0.08);
      }
    },
    thunder(t) {
      const b = bus(1);
      const r = burst(t, 4.5, 0.9, 'lowpass', 220, 1, b);
      for (let k = 0; k < 6; k++) r.g.gain.setValueAtTime(0.4 + Math.random() * 0.6, t + 0.2 + k * 0.3);
      r.g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    },
    rustle(t) { const b = bus(0.3); burst(t, 0.3, 0.25, 'highpass', 2500, 1, b); burst(t + 0.18, 0.25, 0.18, 'highpass', 3000, 1, b); },
    glitch(t) { for (let k = 0; k < 7; k++) tone(80 + Math.random() * 1800, t + k * 0.045, 0.035, 0.12, 'square'); },
    radio(t) {
      const b = burst(t, 1.1, 0.4, 'bandpass', 1600, 0.7);
      for (let k = 0; k < 10; k++) b.g.gain.setValueAtTime(Math.random() < 0.5 ? 0.02 : 0.4, t + k * 0.09);
    },
    flame(t) {
      const b = burst(t, 2.2, 0.6, 'lowpass', 300);
      b.f.frequency.setValueAtTime(300, t);
      b.f.frequency.exponentialRampToValueAtTime(2400, t + 0.6);
      thump(t, 60, 30, 0.8, 0.8);
    },
    thud(t) { thump(t, 58, 28, 0.9, 1, bus(0.5)); },
  };

  function sfx(names) {
    if (!ctx) return;
    [].concat(names).forEach(n => SFX[n] && SFX[n](ctx.currentTime + 0.02));
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  const current = () => Object.keys(active);

  return { init, ambient, current, sfx, toggleMute };
})();

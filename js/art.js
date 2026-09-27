// ============================================================================
// ART — placeholder illustration, drawn as layered inline SVG.
//
// Art direction (after Red Candle's *Detention* and lo-fi horror):
//   • Faded photograph: muted, cold, desaturated. Red is the ONLY saturated
//     color in the game (envelope, bride, candles, lanterns).
//   • Darkness is the default. The engine paints a lighting pass over every
//     scene; things exist only where light reaches them.
//   • Depth: each scene is 3–4 parallax layers + drifting fog, so the camera
//     can breathe and the dark has somewhere to hide things.
//   • Show less: faces are half-lit, veiled, or too far to read.
//
// ART.scene(name, state) -> {
//   layers: [{ depth, svg, front? }],   front layers render above characters
//   lights: [{ x, y, r, c:'r,g,b', i, fl, depth }]   in 1600×900 scene space
//   dark:   0..1  how black the unlit parts are
//   fog:    { c:'r,g,b', a, y0, y1 } | null
//   grade:  css class for color grading of the background
// }
// To swap in real paintings later, replace a layer's svg with
// `<img src="art/road_far.png">` — lights, fog and parallax keep working.
// ============================================================================
window.ART = (() => {
  const W = 1600, H = 900;
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const f1 = n => n.toFixed(1);
  let uid = 0;

  // A layer: full-frame SVG with a painterly "ink wobble" filter.
  function layer(depth, inner, { defs = '', wobble = 5, front = false } = {}) {
    const id = `wob${++uid}`;
    const filt = wobble
      ? `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="2" seed="${uid % 9}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${wobble}" xChannelSelector="R" yChannelSelector="G"/></filter>`
      : '';
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${filt}${defs}</defs><g${wobble ? ` filter="url(#${id})"` : ''}>${inner}</g></svg>`;
    return { depth, svg, front };
  }

  // Grass blades. pick(r) -> [x, y, h]. Sorted by y so near blades overlap far ones.
  function blades(r, n, pick, color, width) {
    const list = Array.from({ length: n }, () => pick(r)).sort((a, b) => a[1] - b[1]);
    let d = '';
    for (const [x, y, h] of list) {
      const lean = (r() - 0.5) * h * 0.6;
      d += `M${f1(x)} ${f1(y)}Q${f1(x + lean * 0.2)} ${f1(y - h * 0.55)} ${f1(x + lean)} ${f1(y - h)}`;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
  }

  // ======================================================================
  // SCENES
  // ======================================================================

  // ---------------- the mountain road
  function roadFar() {
    return layer(0.05, `
      <rect width="${W}" height="${H}" fill="url(#rdSky)"/>
      <ellipse cx="1150" cy="170" rx="520" ry="110" fill="#3a4a52" opacity=".22"/>
      <ellipse cx="420" cy="230" rx="600" ry="90" fill="#33434b" opacity=".18"/>
      <path d="M0 440 L120 380 L260 410 L420 320 L560 360 L700 300 L860 360 L1010 330 L1180 380 L1330 300 L1470 350 L1600 320 L1600 900 L0 900Z" fill="#141c20"/>
      <path d="M0 480 L200 440 L380 470 L600 420 L820 470 L1060 440 L1300 480 L1600 430 L1600 900 L0 900Z" fill="#0d1316"/>`,
      { wobble: 3, defs: `<linearGradient id="rdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080a"/><stop offset=".6" stop-color="#1a252b"/><stop offset="1" stop-color="#0b1013"/></linearGradient>` });
  }

  function roadMid() {
    const r = rng(11);
    let dashes = '', posts = '', sheen = '';
    for (let k = 0; k < 14; k += 2) {
      const u0 = (k / 14) ** 2, u1 = ((k + 1) / 14) ** 2;
      const y0 = 505 + 395 * u0, y1 = 505 + 395 * u1, w0 = 1 + 12 * u0, w1 = 1 + 12 * u1;
      dashes += `<path d="M${f1(800 - w0)} ${f1(y0)}L${f1(800 + w0)} ${f1(y0)}L${f1(800 + w1)} ${f1(y1)}L${f1(800 - w1)} ${f1(y1)}Z"/>`;
    }
    for (let u = 0.02; u < 1; u += 0.08) {
      const x = 850 + 750 * u, y = 498 + 320 * u, h = 10 + 70 * u, w = 2 + 9 * u;
      posts += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`;
    }
    for (let i = 0; i < 26; i++) { // wet road catching the headlights
      const u = r(), y = 520 + 380 * u * u, x = 800 + (r() - 0.5) * 900 * u * u;
      sheen += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + (r() - 0.5) * 6)}" y2="${f1(y + 8 + 40 * u)}"/>`;
    }
    const poles = [[1010, 520, 70], [1180, 545, 150], [1460, 590, 330]].map(([x, y, h]) =>
      `<rect x="${x}" y="${y - h * 2.2}" width="${3 + h / 40}" height="${h * 2.2}" fill="#070a0c"/><rect x="${x - h / 7}" y="${y - h * 2.1}" width="${h / 3.5}" height="${2 + h / 90}" fill="#070a0c"/>`).join('');
    const leftGrass = rr => {
      const y = 470 + rr() * 440, t = Math.max(0, (y - 505) / 395);
      return [rr() * (760 - 720 * t), y, 14 + (40 + 190 * t) * (0.45 + rr() * 0.55)];
    };
    const rightGrass = rr => {
      const y = 470 + rr() * 440, t = Math.max(0, (y - 505) / 395), edge = 880 + 740 * t;
      return [edge + rr() * (1600 - edge + 40), y, 14 + (40 + 170 * t) * (0.45 + rr() * 0.55)];
    };
    return layer(0.25, `
      <path d="M760 505 L840 505 L1560 900 L40 900Z" fill="#1b2023"/>
      <g stroke="#c9c2a4" stroke-opacity=".16" stroke-width="3">${sheen}</g>
      <g fill="#8a7d46" opacity=".35">${dashes}</g>
      <path d="M1010 372 Q1095 400 1180 215 M1180 215 Q1320 260 1460 -130" stroke="#070a0c" stroke-width="2" fill="none"/>
      ${poles}
      <path d="M850 497 L1600 812 L1600 846 L850 503Z" fill="#3a4044"/>
      <g fill="#20262a">${posts}</g>
      ${blades(r, 520, leftGrass, '#0c1510', 3)}
      ${blades(r, 380, rightGrass, '#0c1510', 3)}
      ${blades(r, 160, leftGrass, '#1a2a20', 2)}
      ${blades(r, 120, rightGrass, '#1a2a20', 2)}`);
  }

  function roadNear() {
    const r = rng(29);
    const edgeL = rr => [rr() * 260, 900 + rr() * 30, 200 + rr() * 380];
    const edgeR = rr => [1340 + rr() * 280, 900 + rr() * 30, 200 + rr() * 380];
    return layer(0.6, `
      ${blades(r, 90, edgeL, '#030504', 7)}
      ${blades(r, 90, edgeR, '#030504', 7)}
      ${blades(r, 40, edgeL, '#0b120d', 3)}
      ${blades(r, 40, edgeR, '#0b120d', 3)}`, { wobble: 8 });
  }

  function carInterior(withEnvelope) {
    const r = rng(5);
    let drops = '';
    for (let i = 0; i < 110; i++) {
      const x = 220 + r() * 1160, y = 110 + r() * 520, rad = 2 + r() * 7;
      drops += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rad * 0.8)}" ry="${f1(rad)}"/>`;
      if (r() < 0.25) drops += `<path d="M${f1(x)} ${f1(y + rad)} q${f1((r() - 0.5) * 6)} ${f1(20 + r() * 50)} 0 ${f1(30 + r() * 60)}" stroke-width="2" fill="none"/>`;
    }
    const env = withEnvelope ? `
      <g transform="rotate(-7 1040 655)">
        <rect x="975" y="620" width="130" height="78" rx="3" fill="#a3121a"/>
        <rect x="983" y="628" width="114" height="62" fill="none" stroke="#c9a24a" stroke-width="2"/>
        <text x="1040" y="675" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="34" fill="#d8b454">囍</text>
      </g>` : '';
    return layer(0, `
      <g fill="#c8d4df" fill-opacity=".07" stroke="#dfe8ef" stroke-opacity=".14">${drops}</g>
      <path d="M0 0 L1600 0 L1600 130 L1360 95 L240 95 L0 130Z" fill="#050505"/>
      <rect x="720" y="92" width="160" height="46" rx="6" fill="#060606"/>
      <path d="M0 0 L250 95 L140 900 L0 900Z" fill="#040404"/>
      <path d="M1600 0 L1350 95 L1460 900 L1600 900Z" fill="#040404"/>
      <path d="M0 690 C300 628 1300 628 1600 690 L1600 900 L0 900Z" fill="#0a0a0a"/>
      <path d="M0 690 C300 628 1300 628 1600 690" stroke="#232323" stroke-width="3" fill="none"/>
      <rect x="720" y="722" width="160" height="34" rx="4" fill="#0c1a14"/>
      <text x="800" y="745" text-anchor="middle" font-family="monospace" font-size="16" fill="#3f8a66">- - . -  FM</text>
      <path d="M150 900 A270 270 0 0 1 690 900" stroke="#101010" stroke-width="42" fill="none"/>
      <path d="M420 640 L420 700" stroke="#101010" stroke-width="30"/>
      ${env}`, { wobble: 2, front: true });
  }

  // ---------------- Ama's house
  function houseFar(watcher) {
    let grille = '';
    for (let x = 202; x < 490; x += 32) grille += `<line x1="${x}" y1="220" x2="${x}" y2="550"/>`;
    const face = watcher ? `
      <ellipse cx="330" cy="400" rx="34" ry="44" fill="#8f978c" opacity=".55"/>
      <ellipse cx="318" cy="392" rx="7" ry="9" fill="#000"/><ellipse cx="342" cy="392" rx="7" ry="9" fill="#000"/>
      <path d="M300 356 C300 320 360 320 360 356 L372 470 L288 470Z" fill="#050606" opacity=".7"/>` : '';
    return layer(0.05, `
      <rect width="${W}" height="${H}" fill="url(#hsWall)"/>
      <g stroke="#1f140e" stroke-width="3">${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 56}" y1="130" x2="${i * 56}" y2="640"/>`).join('')}</g>
      <rect width="${W}" height="42" fill="#0b0705"/>
      <rect y="112" width="${W}" height="20" fill="#120b07"/>
      <rect x="170" y="220" width="320" height="330" fill="#06090d"/>
      ${face}
      <g stroke="#1a0f0a" stroke-width="5">${grille}<line x1="170" y1="330" x2="490" y2="330"/><line x1="170" y1="440" x2="490" y2="440"/></g>
      <rect x="170" y="220" width="320" height="330" fill="none" stroke="#24150d" stroke-width="16"/>
      <rect x="560" y="200" width="90" height="130" fill="#b9ae96" opacity=".5"/>
      <rect x="570" y="215" width="70" height="20" fill="#8a1a1a" opacity=".6"/>
      <text x="605" y="300" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="48" fill="#3a2a1a" opacity=".7">七</text>
      <g transform="rotate(-4 780 250)"><rect x="700" y="190" width="150" height="110" fill="#1a120c" stroke="#3a2a18" stroke-width="6"/><rect x="714" y="204" width="122" height="82" fill="#4a4034" opacity=".5"/></g>
      <rect x="880" y="200" width="100" height="80" fill="#1a120c" stroke="#3a2a18" stroke-width="6"/>
      <circle cx="1480" cy="240" r="48" fill="#1c140e" stroke="#3a2a18" stroke-width="6"/>
      <circle cx="1480" cy="240" r="36" fill="#b9ae96" opacity=".35"/>
      <line x1="1480" y1="240" x2="1480" y2="212" stroke="#111" stroke-width="3"/><line x1="1480" y1="240" x2="1500" y2="250" stroke="#111" stroke-width="3"/>
      <rect x="1476" y="286" width="8" height="90" fill="#1c140e"/><circle cx="1480" cy="380" r="12" fill="#6a5a2a" opacity=".6"/>`,
      { wobble: 4, defs: `<linearGradient id="hsWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e1d14"/><stop offset="1" stop-color="#140c08"/></linearGradient>` });
  }

  function houseMid() {
    const tablets = [1080, 1140, 1200, 1260, 1320]
      .map(x => `<rect x="${x}" y="290" width="38" height="120" fill="#2e0e09" stroke="#7a5a22" stroke-width="2"/><line x1="${x + 19}" y1="305" x2="${x + 19}" y2="395" stroke="#8a6a2a" stroke-width="3" stroke-dasharray="9 7"/>`).join('');
    return layer(0.2, `
      <rect x="1020" y="230" width="400" height="240" fill="#1d0a06" stroke="#4a2410" stroke-width="5"/>
      ${tablets}
      <rect x="990" y="470" width="460" height="170" fill="#5a0a0c"/>
      <line x1="990" y1="590" x2="1450" y2="590" stroke="#b08a3a" stroke-width="3" stroke-dasharray="6 6"/>
      <g fill="#d8d0c0"><ellipse cx="1150" cy="462" rx="24" ry="8"/><ellipse cx="1220" cy="462" rx="24" ry="8"/><ellipse cx="1290" cy="462" rx="24" ry="8"/></g>
      <rect x="1030" y="410" width="14" height="52" fill="#a01212"/><rect x="1396" y="410" width="14" height="52" fill="#a01212"/>
      <ellipse cx="1037" cy="402" rx="5" ry="10" fill="#ffd27a"/><ellipse cx="1403" cy="402" rx="5" ry="10" fill="#ffd27a"/>
      <path d="M1220 440 C1200 400 1240 380 1215 340 C1195 305 1235 280 1220 240" stroke="#ccc" stroke-opacity=".12" stroke-width="5" fill="none"/>
      <line x1="720" y1="0" x2="720" y2="70" stroke="#140a06" stroke-width="3"/>
      <ellipse cx="720" cy="130" rx="48" ry="62" fill="#8a0e12"/>
      <path d="M680 100 Q720 90 760 100 M674 130 Q720 120 766 130 M680 160 Q720 150 760 160" stroke="#5a0708" stroke-width="3" fill="none"/>
      <rect x="708" y="190" width="24" height="10" fill="#c9a24a"/><line x1="720" y1="200" x2="720" y2="240" stroke="#c9a24a" stroke-width="2"/>`);
  }

  function houseNear() {
    const bowls = [[420, 800], [620, 770], [980, 770], [1180, 800], [800, 830]]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="52" ry="16" fill="#aaa391"/><ellipse cx="${x}" cy="${y - 3}" rx="42" ry="10" fill="#d9d2c2"/><path d="M${x - 50} ${y + 2} q50 28 100 0" fill="#8e877a"/>`).join('');
    return layer(0.45, `
      <ellipse cx="800" cy="930" rx="700" ry="210" fill="#24150c" stroke="#3a2414" stroke-width="5"/>
      <ellipse cx="800" cy="930" rx="640" ry="180" fill="none" stroke="#2c1a0f" stroke-width="3"/>
      ${bowls}
      <ellipse cx="800" cy="740" rx="90" ry="26" fill="#3a332c"/>
      <path d="M770 720 C750 690 790 670 770 640 M820 720 C800 680 845 660 825 620" stroke="#fff" stroke-opacity=".1" stroke-width="7" fill="none"/>`, { wobble: 6, front: true });
  }

  // ---------------- your old bedroom
  function bedroomFar() {
    const r = rng(3);
    let bars = '', streaks = '';
    for (let x = 935; x < 1320; x += 35) bars += `<line x1="${x}" y1="160" x2="${x}" y2="540"/>`;
    for (let i = 0; i < 40; i++) {
      const x = 910 + r() * 400, y = 170 + r() * 340;
      streaks += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - 3)}" y2="${f1(y + 20 + r() * 40)}"/>`;
    }
    return layer(0.05, `
      <rect width="${W}" height="${H}" fill="url(#bdWall)"/>
      <rect x="900" y="160" width="420" height="380" fill="url(#bdPane)"/>
      <ellipse cx="1180" cy="230" rx="60" ry="40" fill="#b8c8d8" opacity=".25"/>
      <g stroke="#a0b4cc" stroke-opacity=".2" stroke-width="1.5">${streaks}</g>
      <g stroke="#030509" stroke-width="7">${bars}<line x1="900" y1="287" x2="1320" y2="287"/><line x1="900" y1="413" x2="1320" y2="413"/></g>
      <path d="M1110 300 L1160 350 L1110 400 L1060 350Z" fill="none" stroke="#030509" stroke-width="7"/>
      <rect x="900" y="160" width="420" height="380" fill="none" stroke="#06080d" stroke-width="18"/>
      <rect x="120" y="180" width="130" height="180" fill="#1a2030" opacity=".6"/>
      <rect x="132" y="192" width="106" height="120" fill="#303a4a" opacity=".5"/>
      <rect y="700" width="${W}" height="200" fill="#04050a"/>`,
      { wobble: 3, defs: `<linearGradient id="bdWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c111c"/><stop offset="1" stop-color="#05070d"/></linearGradient>
        <linearGradient id="bdPane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a50"/><stop offset="1" stop-color="#0e1622"/></linearGradient>` });
  }

  function bedroomMid() {
    return layer(0.2, `
      <rect x="1400" y="330" width="220" height="570" fill="#07090e"/>
      <rect x="1400" y="330" width="220" height="570" fill="none" stroke="#11141c" stroke-width="4"/>
      <rect x="1398" y="340" width="8" height="550" fill="#000"/>
      <circle cx="1420" cy="620" r="5" fill="#3a3a3a"/>
      <rect x="560" y="520" width="300" height="24" fill="#0d1018"/>
      <rect x="575" y="544" width="16" height="200" fill="#0a0c12"/><rect x="830" y="544" width="16" height="200" fill="#0a0c12"/>
      <path d="M760 520 L780 440 L820 440 L800 520Z" fill="#141a26"/>
      <g transform="rotate(-18 700 660)"><rect x="640" y="560" width="120" height="16" fill="#0c0f16"/><rect x="650" y="576" width="10" height="170" fill="#0c0f16"/><rect x="740" y="576" width="10" height="170" fill="#0c0f16"/><rect x="640" y="470" width="14" height="100" fill="#0c0f16"/></g>`);
  }

  function bedroomNear() {
    return layer(0.5, `
      <rect x="-40" y="600" width="760" height="320" fill="#0c111c"/>
      <ellipse cx="120" cy="620" rx="130" ry="42" fill="#161d2b"/>
      <path d="M200 640 C420 590 600 660 760 620 L760 920 L200 920Z" fill="#121a2a"/>
      <path d="M260 700 C400 680 560 720 740 690" stroke="#1c2436" stroke-width="6" fill="none"/>`, { wobble: 7 });
  }

  // ---------------- the courtyard, seen through your window
  function courtyardFar() {
    const r = rng(9);
    let tiles = '', puddles = '';
    for (let x = 0; x < W; x += 26) tiles += `<path d="M${x} 300 q13 -14 26 0"/>`;
    for (let i = 0; i < 14; i++) puddles += `<ellipse cx="${f1(r() * W)}" cy="${f1(660 + r() * 230)}" rx="${f1(40 + r() * 120)}" ry="${f1(5 + r() * 12)}"/>`;
    return layer(0.1, `
      <rect width="${W}" height="${H}" fill="#060a0f"/>
      <path d="M0 260 L300 200 L620 240 L1000 190 L1300 230 L1600 200 L1600 320 L0 320Z" fill="#0b1117"/>
      <rect y="300" width="${W}" height="330" fill="#10161d"/>
      <g stroke="#080b0f" stroke-width="5" fill="none">${tiles}</g>
      <rect y="290" width="${W}" height="14" fill="#090c10"/>
      <rect x="680" y="340" width="240" height="290" fill="#07090c"/>
      <line x1="800" y1="340" x2="800" y2="630" stroke="#141a22" stroke-width="3"/>
      <ellipse cx="620" cy="380" rx="26" ry="34" fill="#3a080b"/>
      <ellipse cx="980" cy="380" rx="26" ry="34" fill="#3a080b"/>
      <rect y="630" width="${W}" height="270" fill="url(#cyGround)"/>
      <g fill="#9ab0c8" opacity=".08">${puddles}</g>`,
      { wobble: 4, defs: `<linearGradient id="cyGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121820"/><stop offset="1" stop-color="#05070a"/></linearGradient>` });
  }

  function windowFront(state) {
    const r = rng(17);
    let streaks = '';
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = r() * H;
      streaks += `<path d="M${f1(x)} ${f1(y)} q${f1((r() - 0.5) * 8)} ${f1(30 + r() * 80)} ${f1((r() - 0.5) * 4)} ${f1(60 + r() * 120)}"/>`;
    }
    let bars = '';
    for (let x = 160; x < W; x += 200) bars += `<rect x="${x}" y="0" width="12" height="${H}"/>`;
    const charm = state && state.items && state.items.includes('charm') ? `
      <line x1="800" y1="120" x2="800" y2="190" stroke="#8a1a1a" stroke-width="2"/>
      <path d="M780 190 L820 190 L814 250 L786 250Z" fill="#7a1014"/><path d="M788 200 L812 200 L800 236Z" fill="#c9a24a" opacity=".8"/>` : '';
    return layer(0, `
      <g stroke="#b0c4d8" stroke-opacity=".12" stroke-width="3" fill="none">${streaks}</g>
      <g fill="#020304">${bars}</g>
      <rect y="0" width="${W}" height="120" fill="#020304"/>
      <rect y="440" width="${W}" height="14" fill="#020304"/>
      <rect y="820" width="${W}" height="80" fill="#020304"/>
      <rect x="0" y="0" width="60" height="${H}" fill="#020304"/><rect x="1540" y="0" width="60" height="${H}" fill="#020304"/>
      ${charm}`, { wobble: 3, front: true });
  }

  // ---------------- the ancestral hall
  function hallFar() {
    const couplet = (x, chars) => `<rect x="${x}" y="120" width="72" height="540" fill="#6a0a0c"/>` +
      chars.split('').map((c, i) => `<text x="${x + 36}" y="${210 + i * 120}" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="50" fill="#b8913a">${c}</text>`).join('');
    return layer(0.05, `
      <rect width="${W}" height="${H}" fill="url(#hlWall)"/>
      <rect x="0" y="120" width="110" height="600" fill="#24303a" opacity=".5"/>
      ${couplet(170, '慎終追遠')}
      ${couplet(1358, '祖德流芳')}
      <rect y="840" width="${W}" height="60" fill="#080303"/>`,
      { wobble: 3, defs: `<linearGradient id="hlWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241009"/><stop offset="1" stop-color="#0c0403"/></linearGradient>` });
  }

  function hallMid() {
    const xs = [470, 565, 660, 755, 850, 945, 1040];
    const tablets = xs.map((x, i) => i === 3
      ? `<rect x="${x}" y="250" width="70" height="230" fill="#e2dac6"/><rect x="${x - 6}" y="480" width="82" height="18" fill="#c4baa2"/>`
      : `<rect x="${x}" y="250" width="70" height="230" fill="#300c08" stroke="#8a6a2a" stroke-width="3"/><line x1="${x + 35}" y1="280" x2="${x + 35}" y2="440" stroke="#9a7a32" stroke-width="4" stroke-dasharray="14 10"/><rect x="${x - 6}" y="480" width="82" height="18" fill="#401810"/>`).join('');
    return layer(0.2, `
      <rect x="420" y="160" width="760" height="370" fill="#170605" stroke="#5a3012" stroke-width="6"/>
      <path d="M440 530 L440 230 Q800 150 1160 230 L1160 530" fill="#0d0403" stroke="#5a3012" stroke-width="3"/>
      ${tablets}
      <rect x="340" y="560" width="920" height="40" fill="#321408"/>
      <rect x="370" y="600" width="860" height="240" fill="#560809"/>
      <line x1="370" y1="830" x2="1230" y2="830" stroke="#b08a3a" stroke-width="3" stroke-dasharray="6 6"/>
      <rect x="430" y="495" width="16" height="65" fill="#a31212"/><rect x="1154" y="495" width="16" height="65" fill="#a31212"/>
      <ellipse cx="438" cy="485" rx="6" ry="12" fill="#ffd27a"/><ellipse cx="1162" cy="485" rx="6" ry="12" fill="#ffd27a"/>
      <path d="M740 560 Q740 520 800 520 Q860 520 860 560Z" fill="#4a3618"/>
      <g stroke="#7b5a32" stroke-width="3"><line x1="785" y1="522" x2="780" y2="470"/><line x1="800" y1="520" x2="800" y2="462"/><line x1="815" y1="522" x2="820" y2="470"/></g>
      <g fill="#ff5a2a"><circle cx="780" cy="470" r="3"/><circle cx="800" cy="462" r="3"/><circle cx="820" cy="470" r="3"/></g>
      <path d="M800 460 C780 420 830 390 800 350 C775 315 820 280 800 240" stroke="#ccc" stroke-opacity=".1" stroke-width="6" fill="none"/>
      ${servant(300, 520, 1.3, '#2a5a8a', false)}
      ${servant(1300, 520, 1.3, '#b8324a', true)}`);
  }

  // 童男童女: the paper boy and girl burned to serve the dead. They flank the
  // altar, and they are always looking at you.
  function servant(x, y, s, robe, girl) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-40 200 L-30 70 Q0 50 30 70 L40 200Z" fill="${robe}" stroke="#15100d" stroke-width="3"/>
      <path d="M-30 70 Q0 50 30 70" stroke="#d8b454" stroke-width="5" fill="none"/>
      <path d="M-40 200 L40 200 L36 214 L-36 214Z" fill="#6a5030" stroke="#15100d" stroke-width="2"/>
      <rect x="-3" y="30" width="6" height="30" fill="#b69a62"/>
      <ellipse cx="0" cy="10" rx="30" ry="34" fill="#ece6d6" stroke="#15100d" stroke-width="2.5"/>
      <circle cx="-15" cy="22" r="8" fill="#e0506a" opacity=".6"/><circle cx="15" cy="22" r="8" fill="#e0506a" opacity=".6"/>
      <ellipse cx="-10" cy="6" rx="3.5" ry="4.5" fill="#15100d"/><ellipse cx="10" cy="6" rx="3.5" ry="4.5" fill="#15100d"/>
      <path d="M-8 32 Q0 38 8 32" stroke="#b3102a" stroke-width="3" fill="none"/>
      ${girl ? '<circle cx="-24" cy="-18" r="11" fill="#0b0b0e"/><circle cx="24" cy="-18" r="11" fill="#0b0b0e"/><path d="M-28 0 C-28 -34 28 -34 28 0 C18 -16 -18 -16 -28 0Z" fill="#0b0b0e"/>'
             : '<path d="M-28 0 C-28 -34 28 -34 28 0 C14 -12 -14 -12 -28 0Z" fill="#0b0b0e"/><circle cx="0" cy="-26" r="7" fill="#0b0b0e"/>'}
    </g>`;
  }

  function hallNear() {
    const prints = [[560, 880], [610, 850], [640, 900], [700, 860], [720, 910], [790, 870]].map(([x, y], i) =>
      `<g transform="translate(${x} ${y}) rotate(${-20 + i * 4}) scale(${0.8 + i * 0.05})"><ellipse rx="11" ry="20" fill="#0c0808" opacity=".8"/><g fill="#0c0808" opacity=".8"><circle cx="-8" cy="-26" r="4"/><circle cx="-2" cy="-29" r="4"/><circle cx="5" cy="-28" r="3.5"/><circle cx="10" cy="-24" r="3"/></g></g>`).join('');
    return layer(0.45, `
      <rect y="820" width="${W}" height="80" fill="#0f0606"/>
      <path d="M0 820 L1600 820" stroke="#24100a" stroke-width="4"/>
      <ellipse cx="700" cy="880" rx="220" ry="30" fill="#1c2632" opacity=".35"/>
      ${prints}`, { wobble: 4 });
  }

  const SCENES = {
    black: () => ({ layers: [layer(0, `<rect width="${W}" height="${H}" fill="#000"/>`, { wobble: 0 })], lights: [], dark: 0, fog: null, grade: 'none', charLight: 0 }),

    road: () => ({
      layers: [roadFar(), roadMid(), roadNear()],
      lights: [
        { x: 800, y: 800, r: 0.36, c: '235,225,190', i: 0.95, fl: 'steady', depth: 0.25 },
        { x: 800, y: 590, r: 0.16, c: '200,205,190', i: 0.55, fl: 'steady', depth: 0.25 },
        { x: 1150, y: 170, r: 0.3, c: '120,140,150', i: 0.14, fl: 'steady', depth: 0.05 },
      ],
      dark: 0.9, grade: 'cold', charLight: 0.55,
      fog: { c: '110,125,135', a: 0.2, y0: 380, y1: 620 },
    }),

    car: () => ({
      layers: [roadFar(), roadMid(), carInterior(false)],
      lights: [
        { x: 800, y: 620, r: 0.3, c: '235,225,190', i: 0.9, fl: 'steady', depth: 0.25 },
        { x: 800, y: 740, r: 0.1, c: '80,200,140', i: 0.45, fl: 'steady', depth: 0 },
      ],
      dark: 0.9, grade: 'cold',
      fog: { c: '110,125,135', a: 0.18, y0: 400, y1: 600 },
    }),

    car_env: () => {
      const s = SCENES.car();
      s.layers[2] = carInterior(true);
      s.lights.push({ x: 1040, y: 660, r: 0.12, c: '255,60,50', i: 0.55, fl: 'lantern', depth: 0 });
      return s;
    },

    house: () => ({
      layers: [houseFar(false), houseMid(), houseNear()],
      lights: [
        { x: 720, y: 130, r: 0.4, c: '255,70,50', i: 0.75, fl: 'lantern', depth: 0.2 },
        { x: 1037, y: 400, r: 0.22, c: '255,170,90', i: 0.8, fl: 'candle', depth: 0.2 },
        { x: 1403, y: 400, r: 0.22, c: '255,170,90', i: 0.8, fl: 'candle', depth: 0.2 },
        { x: 800, y: 620, r: 0.7, c: '255,190,130', i: 0.7, fl: 'bulb', depth: 0.45 },
      ],
      dark: 0.72, grade: 'warm', fog: null, charLight: 0.3,
    }),

    house_watch: () => {
      const s = SCENES.house();
      s.layers[0] = houseFar(true);
      s.lights.push({ x: 330, y: 400, r: 0.1, c: '170,190,180', i: 0.5, fl: 'steady', depth: 0.05 });
      return s;
    },

    bedroom: () => ({
      layers: [bedroomFar(), bedroomMid(), bedroomNear()],
      lights: [
        { x: 1110, y: 350, r: 0.42, c: '150,175,215', i: 0.75, fl: 'steady', depth: 0.05 },
        { x: 960, y: 760, r: 0.35, c: '150,175,215', i: 0.35, fl: 'steady', depth: 0.2 },
      ],
      dark: 0.9, grade: 'night', fog: null, charLight: 0.4,
    }),

    courtyard: state => ({
      layers: [courtyardFar(), windowFront(state)],
      lights: [
        { x: 800, y: 520, r: 0.4, c: '170,190,215', i: 0.6, fl: 'dying', depth: 0.1 },
        { x: 800, y: 150, r: 0.8, c: '90,110,140', i: 0.3, fl: 'steady', depth: 0.1 },
      ],
      dark: 0.88, grade: 'night', charLight: 0,
      fog: { c: '100,115,135', a: 0.2, y0: 600, y1: 900 },
    }),

    hall: () => ({
      layers: [hallFar(), hallMid(), hallNear()],
      lights: [
        { x: 438, y: 480, r: 0.26, c: '255,160,80', i: 0.8, fl: 'candle', depth: 0.2 },
        { x: 1162, y: 480, r: 0.26, c: '255,160,80', i: 0.8, fl: 'candle', depth: 0.2 },
        { x: 790, y: 360, r: 0.16, c: '230,225,210', i: 0.55, fl: 'dying', depth: 0.2 },
        { x: 40, y: 420, r: 0.55, c: '150,165,185', i: 0.55, fl: 'steady', depth: 0.05 },
        { x: 300, y: 540, r: 0.1, c: '255,160,80', i: 0.5, fl: 'candle', depth: 0.2 },
        { x: 1300, y: 540, r: 0.1, c: '255,160,80', i: 0.5, fl: 'candle', depth: 0.2 },
      ],
      dark: 0.84, grade: 'dawn', charLight: 0,
      fog: { c: '90,80,75', a: 0.12, y0: 250, y1: 700 },
    }),
  };

  // ======================================================================
  // CHARACTERS — 紙紮, the paper effigies burned for the dead.
  //
  // Everyone is made of paper: flat cut shapes, ink outlines, fibre grain,
  // hand-painted faces. The difference is who painted them:
  //   • the LIVING are paper cut-outs with gentle, human faces;
  //   • the DEAD are funeral effigies — chalk-white faces, round rouge
  //     cheeks, ink-dot eyes, a small red smile that never changes. Their
  //     paper is rain-soaked and torn, and the bamboo frame shows through.
  // ======================================================================
  const INK = '#15100d';

  // Paper look: slightly ragged cut edges + fibre mottling inside the shape.
  const paperFilter = (k, rough = 3) => `
    <filter id="${k}pp" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="7" result="edge"/>
      <feDisplacementMap in="SourceGraphic" in2="edge" scale="${rough}" xChannelSelector="R" yChannelSelector="G" result="cut"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="fibre"/>
      <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.32 0 0 0 -0.06" result="specks"/>
      <feComposite in="specks" in2="cut" operator="in" result="grain"/>
      <feMerge><feMergeNode in="cut"/><feMergeNode in="grain"/></feMerge>
    </filter>
    <linearGradient id="${k}fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="${k}m"><rect x="-1000" width="3000" height="800" fill="url(#${k}fade)"/></mask>
    <linearGradient id="${k}wet" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>`;

  const svgChar = (k, vb, defs, inner, rough) =>
    `<svg viewBox="${vb}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg"><defs>${paperFilter(k, rough)}${defs}</defs><g filter="url(#${k}pp)" mask="url(#${k}m)">${inner}</g></svg>`;

  // Fold creases and glue seams: the tell that it's paper.
  const creases = (x0, x1) => `<g stroke="#fff" stroke-opacity=".08" stroke-width="2">
    <line x1="${x0 + 30}" y1="470" x2="${x0 + 70}" y2="780"/><line x1="${x1 - 40}" y1="480" x2="${x1 - 80}" y2="790"/><line x1="${x0 + 10}" y1="600" x2="${x1 - 10}" y2="580"/></g>`;

  // A living person: soft brushwork, eyes with lids, a mouth that could move.
  const livingFace = (tone = '#e6cdb4') => `
    <ellipse cx="200" cy="222" rx="56" ry="66" fill="${tone}" stroke="${INK}" stroke-width="3"/>
    <path d="M168 214 q10 -6 20 0 M212 214 q10 -6 20 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M170 220 q8 4 16 0 M214 220 q8 4 16 0" stroke="${INK}" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M200 226 l-4 20 l6 2" stroke="#8a6a52" stroke-width="2" fill="none"/>
    <path d="M186 262 q14 5 28 0" stroke="#8a3a2a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="170" cy="246" rx="12" ry="6" fill="#d8907a" opacity=".2"/><ellipse cx="230" cy="246" rx="12" ry="6" fill="#d8907a" opacity=".2"/>`;

  // An effigy face: chalk paper, rouge coins, ink dots, the painted smile.
  const effigyFace = (smileW = 16, tilt = 0) => `
    <g transform="rotate(${tilt} 200 230)">
      <ellipse cx="200" cy="228" rx="58" ry="64" fill="#ece6d6" stroke="${INK}" stroke-width="3"/>
      <circle cx="166" cy="252" r="17" fill="#e0506a" opacity=".6"/><circle cx="234" cy="252" r="17" fill="#e0506a" opacity=".6"/>
      <path d="M160 204 q14 -9 28 -2 M212 202 q14 -7 28 2" stroke="${INK}" stroke-width="2.5" fill="none"/>
      <ellipse cx="176" cy="222" rx="6" ry="7.5" fill="${INK}"/><ellipse cx="224" cy="222" rx="6" ry="7.5" fill="${INK}"/>
      <path d="M${200 - smileW} 268 Q200 ${270 + smileW * 0.7} ${200 + smileW} 268" stroke="#b3102a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M${200 - smileW * 0.5} 270 Q200 ${272 + smileW * 0.3} ${200 + smileW * 0.5} 270" fill="#b3102a"/>
    </g>`;

  // Bamboo showing through torn paper.
  const tear = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 L14 -8 L26 4 L40 -4 L46 14 L34 30 L40 44 L18 48 L8 34 L-4 38 Z" fill="#0e0907" stroke="${INK}" stroke-width="2"/>
    <g stroke="#b69a62" stroke-width="3"><line x1="4" y1="6" x2="40" y2="30"/><line x1="10" y1="40" x2="34" y2="4"/></g>
    <g fill="#8a7248"><circle cx="22" cy="17" r="2.5"/></g></g>`;

  // The dead stand on a bamboo stick where a neck should be.
  const bambooNeck = `<rect x="193" y="286" width="14" height="70" fill="#b69a62" stroke="${INK}" stroke-width="2"/>
    <line x1="193" y1="310" x2="207" y2="310" stroke="#7a6038" stroke-width="2"/><line x1="193" y1="336" x2="207" y2="336" stroke="#7a6038" stroke-width="2"/>`;
  const livingNeck = tone => `<path d="M180 280 L220 280 L224 356 L176 356Z" fill="${tone}" stroke="${INK}" stroke-width="2"/>`;

  // Boxy robe/torso + flat sleeve panels, the way effigies are built.
  const body = (fill, trim, pattern = '') => `
    <path d="M40 470 L90 430 L118 470 L70 700 L30 690Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>
    <path d="M360 470 L310 430 L282 470 L330 700 L370 690Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>
    <path d="M78 800 L92 436 Q110 360 200 352 Q290 360 308 436 L322 800Z" fill="${fill}" stroke="${INK}" stroke-width="3"/>
    ${pattern}
    <path d="M92 436 Q110 360 200 352 Q290 360 308 436" stroke="${trim}" stroke-width="6" fill="none"/>
    ${creases(92, 308)}`;

  function mom() {
    const tone = '#e2c8ae';
    return svgChar('mo', '0 0 400 800', `
      <pattern id="moP" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="3" fill="#c9b08a" opacity=".35"/><circle cx="30" cy="30" r="3" fill="#c9b08a" opacity=".35"/></pattern>`,
      `<path d="M136 230 C120 140 160 138 200 138 C244 138 282 142 264 230 L272 318 L240 320 L244 236 L156 236 L160 320 L128 318Z" fill="#17110e" stroke="${INK}" stroke-width="3"/>
      ${livingNeck(tone)}
      ${body('#5a4032', '#8a6a4a', `<path d="M92 436 L308 436 L322 800 L78 800Z" fill="url(#moP)"/><path d="M168 360 L200 450 L232 360" stroke="#e8dcc6" stroke-width="10" fill="none"/>`)}
      <ellipse cx="60" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/><ellipse cx="340" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/>
      ${livingFace(tone)}
      <path d="M144 200 C150 150 250 150 256 200 C236 176 164 176 144 200Z" fill="#17110e"/>`);
  }

  function ama() {
    const tone = '#dcc0a4';
    // Ama wears the red peony cloth every Taiwanese grandmother owns.
    return svgChar('am', '0 0 400 800', `
      <pattern id="amP" width="70" height="70" patternUnits="userSpaceOnUse">
        <rect width="70" height="70" fill="#7a1a22"/>
        <g transform="translate(20 20)"><circle r="11" fill="#d85a6a"/><circle r="5" fill="#f2c24a"/><path d="M-14 8 q-6 8 4 12 M12 10 q8 4 2 12" stroke="#2f6a3a" stroke-width="4" fill="none"/></g>
        <g transform="translate(55 52) scale(.7)"><circle r="11" fill="#e89aa6"/><circle r="5" fill="#f2c24a"/></g>
      </pattern>`,
      `<g transform="translate(20 110) scale(.9) rotate(3 200 500)">
        <circle cx="200" cy="146" r="30" fill="#aaa6ae" stroke="${INK}" stroke-width="3"/>
        ${livingNeck(tone)}
        ${body('url(#amP)', '#3a2a2a')}
        <ellipse cx="60" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/><ellipse cx="340" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/>
        ${livingFace(tone)}
        <path d="M160 236 q8 5 16 0 M224 236 q8 5 16 0 M176 190 q24 -6 48 0 M168 276 q32 12 64 0" stroke="#8a6a52" stroke-width="2" fill="none" opacity=".7"/>
        <path d="M144 214 C146 160 254 160 256 214 C240 186 160 186 144 214Z" fill="#bcb8c0" stroke="${INK}" stroke-width="2"/>
        <circle cx="172" cy="220" r="17" fill="none" stroke="${INK}" stroke-width="2" opacity=".6"/><circle cx="228" cy="220" r="17" fill="none" stroke="${INK}" stroke-width="2" opacity=".6"/><line x1="189" y1="220" x2="211" y2="220" stroke="${INK}" stroke-width="2" opacity=".6"/>
      </g>`);
  }

  function wen() {
    const tone = '#ecd2b8';
    return svgChar('wn', '0 0 400 800', '',
      `<g transform="translate(40 150) scale(.8)">
        <path d="M250 180 C340 180 350 280 312 360 C300 300 286 240 246 206Z" fill="#0e0b0a" stroke="${INK}" stroke-width="3"/>
        ${livingNeck(tone)}
        ${body('#e6e2d8', '#1e2a4a', `<path d="M92 436 L308 436 L322 800 L78 800Z" fill="#e6e2d8"/><path d="M78 640 L322 640 L322 800 L78 800Z" fill="#23304e"/>`)}
        <path d="M120 400 L200 470 L280 400 L262 380 L200 440 L138 380Z" fill="#23304e" stroke="${INK}" stroke-width="2"/>
        <path d="M188 452 L212 452 L206 500 L200 506 L194 500Z" fill="#9a1a22"/>
        <ellipse cx="60" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/><ellipse cx="340" cy="705" rx="16" ry="12" fill="${tone}" stroke="${INK}" stroke-width="2"/>
        <g fill="#d8b454"><rect x="46" y="690" width="10" height="10"/><rect x="62" y="700" width="8" height="8"/></g>
        ${livingFace(tone)}
        <path d="M142 214 C132 140 180 140 200 150 C222 140 270 140 258 214 C250 170 222 168 200 176 C178 168 150 170 142 214Z" fill="#0e0b0a"/>
      </g>`);
  }

  // One of the three brothers: a paper servant in a paper suit, rain-soaked.
  function brother(dx, dy, s, tilt, tearAt) {
    return `<g transform="translate(${dx} ${dy}) scale(${s})">
      ${bambooNeck}
      ${body('#1a1d24', '#3a3f4a', `
        <path d="M150 360 L200 520 L250 360" fill="#e4dfd2" stroke="${INK}" stroke-width="2"/>
        <path d="M192 380 L208 380 L212 520 L200 540 L188 520Z" fill="#9a0f1a" stroke="${INK}" stroke-width="2"/>
        <path d="M150 360 L200 560 M250 360 L200 560" stroke="#2c313a" stroke-width="12" fill="none"/>
        <g fill="#c9a24a"><circle cx="200" cy="590" r="7"/><circle cx="200" cy="640" r="7"/></g>
        <g stroke="#2a2f38" stroke-width="2">${[120, 150, 250, 280].map(x => `<line x1="${x}" y1="440" x2="${x - 6}" y2="800"/>`).join('')}</g>
        <rect x="78" y="560" width="244" height="240" fill="url(#mnwet)"/>
        <path d="M110 720 l-2 40 M170 700 l1 60 M260 730 l2 36" stroke="#000" stroke-opacity=".35" stroke-width="4"/>`)}
      ${tear(tearAt[0], tearAt[1])}
      <ellipse cx="60" cy="705" rx="15" ry="12" fill="#ece6d6" stroke="${INK}" stroke-width="2"/><ellipse cx="340" cy="705" rx="15" ry="12" fill="#ece6d6" stroke="${INK}" stroke-width="2"/>
      <g transform="rotate(${tilt} 200 230)">
        ${effigyFace(24, 0)}
        <path d="M142 214 C136 146 264 146 258 214 C246 180 154 180 142 214Z" fill="#0b0b0e" stroke="${INK}" stroke-width="3"/>
        <path d="M200 166 L200 186" stroke="#2a2a30" stroke-width="2"/>
        <path d="M150 196 l-2 30 M252 196 l2 26" stroke="#0b0b0e" stroke-width="5" stroke-linecap="round"/>
        <path d="M176 296 l-1 16 M222 294 l1 12" stroke="#8aa0a8" stroke-opacity=".5" stroke-width="2"/>
      </g></g>`;
  }

  function bride(withHand) {
    const k = withHand ? 'bh' : 'br';
    // Veil: cut paper strips hanging from the crown. Through the gaps —
    // a sliver of chalk-white cheek, a coin of rouge.
    let strips = '';
    for (let x = 136; x <= 256; x += 12) {
      const len = 250 + ((x * 7) % 40);
      strips += `<rect x="${x}" y="190" width="10" height="${len}" fill="#9a0e18" stroke="#5a060c" stroke-width="1"/>`;
    }
    const hand = withHand ? `
      <path d="M296 470 L336 330 L358 250 L376 262 L356 342 L318 480Z" fill="#8a0c14" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="366" cy="240" rx="11" ry="15" fill="#ece6d6" stroke="${INK}" stroke-width="2"/>
      <path d="M368 226 C300 330 60 540 -900 1100" stroke="#ff1a24" stroke-width="2.5" fill="none"/>` : '';
    return svgChar(k, '0 0 400 800', `
      <pattern id="${k}P" width="46" height="46" patternUnits="userSpaceOnUse">
        <path d="M8 30 q8 -14 16 0 q8 14 16 0" stroke="#d8b454" stroke-width="2.5" fill="none" opacity=".55"/>
        <circle cx="23" cy="10" r="2.5" fill="#d8b454" opacity=".55"/>
      </pattern>`,
      `<g class="still">
        <g transform="translate(40 130) scale(.8)">
          <path d="M40 470 L96 426 L124 470 L60 760 L10 740Z" fill="#8e0c16" stroke="${INK}" stroke-width="3"/>
          ${withHand ? '' : '<path d="M360 470 L304 426 L276 470 L340 760 L390 740Z" fill="#8e0c16" stroke="' + INK + '" stroke-width="3"/>'}
          <path d="M60 800 L92 436 Q110 360 200 352 Q290 360 308 436 L340 800Z" fill="#8e0c16" stroke="${INK}" stroke-width="3"/>
          <path d="M60 800 L92 436 Q110 360 200 352 Q290 360 308 436 L340 800Z" fill="url(#${k}P)"/>
          <path d="M150 440 L150 800 M250 440 L250 800" stroke="#d8b454" stroke-width="6" opacity=".6"/>
          <path d="M92 436 Q110 360 200 352 Q290 360 308 436" stroke="#d8b454" stroke-width="7" fill="none"/>
          <rect x="60" y="560" width="280" height="240" fill="url(#${k}wet)"/>
          ${tear(270, 520, 0.9)}
          ${bambooNeck}
          <g class="head">
            ${effigyFace(12, 0)}
            ${strips}
            <path d="M136 190 L144 150 L168 170 L184 128 L200 160 L216 128 L232 170 L256 150 L264 190Z" fill="#d8b454" stroke="${INK}" stroke-width="3"/>
            <g fill="#e0506a"><circle cx="150" cy="176" r="8"/><circle cx="250" cy="176" r="8"/><circle cx="200" cy="140" r="9"/></g>
            <g stroke="#d8b454" stroke-width="2"><line x1="138" y1="192" x2="130" y2="260"/><line x1="262" y1="192" x2="270" y2="260"/></g>
            <g fill="#d8b454"><circle cx="130" cy="264" r="4"/><circle cx="270" cy="264" r="4"/></g>
          </g>
          ${hand}
        </g>
      </g>`, 4);
  }

  const CHARS = {
    mom, ama, wen,
    men: () => svgChar('mn', '0 0 1100 800', '',
      brother(0, 40, 0.95, -4, [100, 480]) + brother(700, 30, 0.97, 12, [250, 560]) + brother(350, 0, 1, -2, [60, 600]), 4),
    bride: () => bride(false),
    bride_hand: () => bride(true),
  };

  // ======================================================================
  // ITEMS — close-ups, held in the light.
  // ======================================================================
  const itemSvg = (vb, inner, defs = '') =>
    `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${inner}</svg>`;

  const photo = withPrint => itemSvg('0 0 520 420', `
    <g transform="rotate(-3 260 210)">
      <rect x="20" y="20" width="480" height="380" fill="#e8dcc0"/>
      <rect x="44" y="44" width="432" height="300" fill="url(#phSky)"/>
      <rect x="44" y="200" width="432" height="144" fill="#6e7a70" opacity=".8"/>
      <path d="M44 200 L476 200" stroke="#b8a888" stroke-width="2" opacity=".6"/>
      <path d="M44 250 Q160 240 260 252 T476 246" stroke="#c8baa0" stroke-width="2" fill="none" opacity=".35"/>
      <g transform="translate(150 150)">
        <ellipse cx="0" cy="40" rx="30" ry="36" fill="#caa080"/>
        <path d="M-32 34 C-30 0 30 0 32 34 C22 16 -22 16 -32 34Z" fill="#2a1a10"/>
        <path d="M-10 44 q10 5 20 0" stroke="#5a3020" stroke-width="2" fill="none"/>
        <path d="M-40 190 L-34 90 C-30 76 30 76 34 90 L40 190Z" fill="#c9c0a8"/>
        <path d="M34 100 C60 120 80 130 100 128" stroke="#caa080" stroke-width="14" fill="none" stroke-linecap="round"/>
      </g>
      <path d="M254 44 L254 270 C256 280 262 282 268 272 L270 262 L270 44Z" fill="#e8dcc0"/>
      <path d="M270 44 L476 44 L476 344 L270 344 L270 280 L262 280 L262 266 L270 262Z" fill="#e8dcc0"/>
      <path d="M258 270 C250 272 246 280 252 286 C262 292 270 282 268 272" fill="#d4a888"/>
      <path d="M270 44 L270 262" stroke="#9a8a6a" stroke-width="1.5" stroke-dasharray="3 3"/>
      ${withPrint ? `<g fill="#9a0a10" opacity=".85"><ellipse cx="370" cy="200" rx="34" ry="42"/><ellipse cx="330" cy="150" rx="8" ry="22" transform="rotate(-20 330 150)"/><ellipse cx="352" cy="138" rx="8" ry="24"/><ellipse cx="376" cy="134" rx="8" ry="25"/><ellipse cx="400" cy="142" rx="7" ry="22" transform="rotate(15 400 142)"/><ellipse cx="410" cy="200" rx="7" ry="18" transform="rotate(50 410 200)"/></g><path d="M360 240 l-3 60 M380 238 l2 40" stroke="#9a0a10" stroke-width="4" opacity=".7"/>` : ''}
      <rect x="20" y="20" width="480" height="380" fill="url(#phAge)"/>
    </g>`, `
    <linearGradient id="phSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0b070"/><stop offset="1" stop-color="#c89a68"/></linearGradient>
    <radialGradient id="phAge" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#6a3a10" stop-opacity="0"/><stop offset="1" stop-color="#6a3a10" stop-opacity=".45"/></radialGradient>`);

  const ITEMS = {
    envelope: () => itemSvg('0 0 500 340', `
      <g transform="rotate(-4 250 170)">
        <rect x="30" y="30" width="440" height="280" rx="6" fill="#a3121a"/>
        <rect x="30" y="30" width="440" height="280" rx="6" fill="url(#evShade)"/>
        <rect x="46" y="46" width="408" height="248" rx="3" fill="none" stroke="#c9a24a" stroke-width="3"/>
        <path d="M30 36 L250 165 L470 36" fill="none" stroke="#6e070c" stroke-width="4"/>
        <circle cx="250" cy="165" r="22" fill="#6a0408"/><ellipse cx="248" cy="163" rx="8" ry="10" fill="#4a0205"/>
        <text x="250" y="262" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="80" fill="#d8b454">囍</text>
      </g>`, `<radialGradient id="evShade" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`),
    contents: () => itemSvg('0 0 600 420', `
      <g transform="rotate(-6 200 220)">
        <rect x="40" y="120" width="300" height="150" fill="#5d7486"/><rect x="52" y="132" width="276" height="126" fill="none" stroke="#8fa3b2" stroke-width="2"/>
        <rect x="60" y="100" width="300" height="150" fill="#6a8294"/><rect x="72" y="112" width="276" height="126" fill="none" stroke="#9ab0bf" stroke-width="2"/>
        <circle cx="290" cy="175" r="34" fill="none" stroke="#9ab0bf" stroke-width="2"/>
      </g>
      <g fill="none" stroke="#050404" stroke-width="3" stroke-linecap="round">
        <path d="M110 300 C60 340 90 400 50 440"/><path d="M118 300 C80 350 120 400 80 450"/><path d="M126 300 C110 360 150 390 120 452"/>
        <path d="M104 300 C40 330 60 380 20 420"/><path d="M132 300 C140 350 170 400 150 440"/>
      </g>
      <g fill="#9ab8c8" opacity=".5"><circle cx="62" cy="428" r="4"/><circle cx="128" cy="446" r="3"/><circle cx="92" cy="400" r="2.5"/></g>
      <rect x="96" y="292" width="44" height="16" fill="#c4141c"/>
      <g transform="rotate(4 480 210)">
        <rect x="430" y="20" width="96" height="380" fill="#e6dcc4"/>
        <text x="478" y="100" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="54" fill="#1a1210">林</text>
        <text x="478" y="170" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="54" fill="#1a1210">秋</text>
        <text x="478" y="240" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="54" fill="#1a1210">月</text>
        <text x="478" y="300" text-anchor="middle" font-family="Noto Serif TC, serif" font-size="18" fill="#6a4a3a">卯年生</text>
        <text x="478" y="330" text-anchor="middle" font-family="Noto Serif TC, serif" font-size="18" fill="#8a1a1a">七月初一卒</text>
      </g>`),
    bowl: () => itemSvg('0 0 400 380', `
      <line x1="185" y1="40" x2="190" y2="210" stroke="#6b3b1f" stroke-width="8" stroke-linecap="round"/>
      <line x1="215" y1="40" x2="210" y2="210" stroke="#6b3b1f" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="200" cy="215" rx="120" ry="36" fill="#efe9dc"/>
      <path d="M80 215 C90 330 310 330 320 215Z" fill="#d9d2c3"/>
      <path d="M90 250 C150 270 250 270 310 250" stroke="#2c4a7a" stroke-width="5" fill="none"/>
      <ellipse cx="200" cy="330" rx="60" ry="10" fill="#b9b2a2"/>`),
    photo: () => photo(false),
    photo_red: () => photo(true),
    charm: () => itemSvg('0 0 400 420', `
      <line x1="200" y1="0" x2="200" y2="70" stroke="#a01818" stroke-width="3"/>
      <path d="M130 70 L270 70 L250 300 L150 300Z" fill="#8a0e14"/>
      <path d="M130 70 L270 70 L250 300 L150 300Z" fill="url(#chShade)"/>
      <path d="M150 90 L250 90 L200 250Z" fill="#e0c050"/>
      <g stroke="#9a1a10" stroke-width="3" fill="none"><path d="M200 110 L200 200 M180 130 L220 130 M184 160 L216 160 M190 185 q10 12 20 0"/></g>
      <text x="200" y="340" text-anchor="middle" font-family="Noto Serif TC, serif" font-weight="900" font-size="34" fill="#c9a24a">平安</text>`,
      `<linearGradient id="chShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`),
    ingot: () => itemSvg('0 0 400 300', `
      <path d="M40 160 C60 110 110 120 140 140 L260 140 C290 120 340 110 360 160 C340 240 60 240 40 160Z" fill="#c9a23a"/>
      <path d="M140 140 C150 90 250 90 260 140Z" fill="#e0bc54"/>
      <path d="M40 160 C60 110 110 120 140 140 L260 140 C290 120 340 110 360 160" stroke="#8a6a1a" stroke-width="3" fill="none"/>
      <path d="M90 150 L110 200 M300 150 L286 204 M200 142 L200 212" stroke="#8a6a1a" stroke-width="2" opacity=".6"/>
      <path d="M150 124 L250 124" stroke="#f0d890" stroke-width="3" opacity=".7"/>`),
  };

  // Full-screen face for single-frame subliminal flashes: an effigy, too close.
  const face = () => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#050000"/>
    <path d="M800 40 C520 40 470 240 480 330 L380 900 L1220 900 L1120 330 C1130 240 1080 40 800 40Z" fill="#0b0909"/>
    <ellipse cx="800" cy="470" rx="250" ry="300" fill="#ece6d6"/>
    <circle cx="660" cy="560" r="70" fill="#e0506a" opacity=".65"/><circle cx="940" cy="560" r="70" fill="#e0506a" opacity=".65"/>
    <path d="M630 360 q60 -34 120 -8 M850 352 q60 -26 120 8" stroke="#15100d" stroke-width="10" fill="none"/>
    <ellipse cx="700" cy="440" rx="26" ry="34" fill="#15100d"/><ellipse cx="900" cy="440" rx="26" ry="34" fill="#15100d"/>
    <path d="M720 650 Q800 700 880 650" stroke="#b3102a" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M760 656 Q800 676 840 656" fill="#b3102a"/>
    <path d="M1010 330 L1060 310 L1090 360 L1050 420 L1080 470 L1020 480Z" fill="#050303"/>
    <g stroke="#b69a62" stroke-width="10"><line x1="1020" y1="340" x2="1070" y2="460"/><line x1="1060" y1="330" x2="1030" y2="470"/></g></svg>`;

  return {
    scene: (name, state) => (SCENES[name] || SCENES.black)(state),
    char: key => (CHARS[key] ? CHARS[key]() : ''),
    item: key => (ITEMS[key] ? ITEMS[key]() : ''),
    face,
    W, H,
  };
})();

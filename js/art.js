// Storybook-style SVG drawings: the kid figure (built from clothing layers),
// clothing item icons and weather icons. Everything is drawn in code so any
// combination of clothes composes automatically.

const O = '#3d2b1f'; // outline colour
const SW = 3; // outline width

export const SKINS = ['#fbd9b8', '#eebf94', '#cf9566', '#8f5c3c'];
export const HAIRS = ['#3b2416', '#7a4a24', '#d9a441', '#1f1a17', '#b5522b'];
export const SHIRT_COLORS = ['#ffcf3f', '#ff8fb1', '#7ec8e3', '#9ad97a', '#c79bf2', '#ff9f5a'];

export const COLORS = {
  sweatshirt: '#f08a4b',
  coat: '#4f86d9',
  pants: '#4a6fa5',
  shorts: '#5fae6e',
  sneakers: '#e5534b',
  boots: '#f6c23e',
  sandals: '#a8703f',
  beanie: '#d94f70',
  gloves: '#d94f70',
  scarf: '#d94f70',
  cap: '#3fa7a0',
  umbrella: '#e5534b',
  bottle: '#8fd0f2',
  sunscreen: '#ffd166',
  backpack: '#e98a3c',
};

const lerp = (a, b, t) => a + (b - a) * t;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// A limb/sleeve: thick round line with a darker outline line underneath.
function limb(x1, y1, x2, y2, w, color) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${O}" stroke-width="${w + SW * 2}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

function partial(x1, y1, x2, y2, frac, w, color) {
  return limb(x1, y1, lerp(x1, x2, frac), lerp(y1, y2, frac), w, color);
}

const shape = (d, fill, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const line = (d, color = O, w = SW, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// Body geometry (viewBox -10 -60 270 470, centre x = 120)
const ARM_L = [92, 172, 70, 262];
const ARM_R = [148, 172, 170, 262];
const LEG_L = [108, 262, 105, 366];
const LEG_R = [132, 262, 135, 366];

const TORSO = {
  shirt: 'M84,168 Q86,152 106,148 L134,148 Q154,152 156,168 L152,270 Q120,278 88,270 Z',
  sweatshirt: 'M81,168 Q83,148 104,144 L136,144 Q157,148 159,168 L156,282 Q120,292 84,282 Z',
  coat: 'M77,168 Q79,145 102,140 L138,140 Q161,145 163,168 L163,302 Q120,312 77,302 Z',
};

function drawShoes(kind, skin) {
  let s = '';
  for (const [x, flip] of [[104, -1], [136, 1]]) {
    const y = 378;
    if (kind === 'sneakers') {
      const c = COLORS.sneakers;
      s += shape(`M${x - 17},${y + 8} Q${x - 17},${y - 12} ${x},${y - 12} Q${x + 17},${y - 12} ${x + 17},${y + 8} Z`, c);
      s += shape(`M${x - 19},${y + 6} L${x + 19},${y + 6} Q${x + 19},${y + 13} ${x + 12},${y + 13} L${x - 12},${y + 13} Q${x - 19},${y + 13} ${x - 19},${y + 6} Z`, '#ffffff');
      s += line(`M${x - 6},${y - 4} L${x + 6},${y - 4} M${x - 6},${y + 1} L${x + 6},${y + 1}`, '#ffffff', 2.5);
    } else if (kind === 'sandals') {
      s += shape(`M${x - 13},${y + 6} Q${x - 13},${y - 12} ${x},${y - 12} Q${x + 13},${y - 12} ${x + 13},${y + 6} Z`, skin);
      s += shape(`M${x - 18},${y + 6} L${x + 18},${y + 6} Q${x + 18},${y + 13} ${x + 11},${y + 13} L${x - 11},${y + 13} Q${x - 18},${y + 13} ${x - 18},${y + 6} Z`, COLORS.sandals);
      s += line(`M${x - 13},${y - 4} L${x + 13},${y - 4} M${x - 12},${y + 2} L${x + 12},${y + 2}`, shade(COLORS.sandals, -0.1), 5);
    } else if (kind === 'boots') {
      const c = COLORS.boots;
      s += shape(`M${x - 15},${y - 46} L${x + 15},${y - 46} L${x + 15},${y - 6} Q${x + 15 + flip * 6},${y - 4} ${x + 18 * 1},${y + 6} L${x + 18},${y + 9} L${x - 18},${y + 9} L${x - 18},${y + 6} Q${x - 18},${y - 4} ${x - 15},${y - 8} Z`, c);
      s += shape(`M${x - 20},${y + 6} L${x + 20},${y + 6} L${x + 20},${y + 13} L${x - 20},${y + 13} Z`, '#5a4636');
      s += line(`M${x - 15},${y - 38} L${x + 15},${y - 38}`, shade(c, -0.15), 4);
    }
  }
  return s;
}

function backHair(look, hair) {
  if (look !== 'girl') return '';
  return shape('M64,98 Q58,34 120,32 Q182,34 176,98 L182,176 Q168,190 152,172 L152,120 L88,120 L88,172 Q72,190 58,176 Z', hair);
}

function frontHair(look, hair, covered) {
  if (covered) {
    // only the bits that peek out under a hat
    return look === 'girl'
      ? shape('M70,84 Q66,112 72,128 L80,128 Q78,104 84,86 Z', hair) + shape('M170,84 Q174,112 168,128 L160,128 Q162,104 156,86 Z', hair)
      : '';
  }
  if (look === 'girl') {
    return shape('M66,100 Q60,36 120,34 Q180,36 174,100 Q168,72 150,62 Q140,80 118,74 Q98,84 82,70 Q70,80 66,100 Z', hair) +
      // little bow
      shape('M150,52 L166,42 L168,62 Z', '#ff6b9a') + shape('M150,52 L136,40 L134,60 Z', '#ff6b9a') +
      `<circle cx="150" cy="52" r="5" fill="#ff6b9a" stroke="${O}" stroke-width="${SW}"/>`;
  }
  return shape('M68,96 Q64,38 120,36 Q176,38 172,96 Q164,74 146,68 Q136,82 118,74 Q100,84 86,72 Q74,80 68,96 Z', hair);
}

function face(skin, mood) {
  let s = '';
  s += `<circle cx="68" cy="106" r="11" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>`;
  s += `<circle cx="172" cy="106" r="11" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>`;
  s += `<circle cx="120" cy="98" r="52" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>`;
  // eyes
  s += `<ellipse cx="102" cy="104" rx="5.5" ry="7.5" fill="${O}"/><ellipse cx="138" cy="104" rx="5.5" ry="7.5" fill="${O}"/>`;
  s += `<circle cx="104" cy="101" r="2" fill="#fff"/><circle cx="140" cy="101" r="2" fill="#fff"/>`;
  // brows
  s += line('M94,90 Q101,86 108,89') + line('M132,89 Q139,86 146,90');
  // cheeks
  const cheek = mood === 'cold' ? '#ff6f7d' : '#ff9a9a';
  const op = mood === 'cold' ? 0.75 : 0.5;
  s += `<ellipse cx="90" cy="120" rx="9" ry="6" fill="${cheek}" opacity="${op}"/><ellipse cx="150" cy="120" rx="9" ry="6" fill="${cheek}" opacity="${op}"/>`;
  // nose + smile
  s += line('M119,110 Q122,114 119,117', shade(skin, -0.3), 2.5);
  s += shape('M106,124 Q120,140 134,124 Q120,130 106,124 Z', '#c2453f');
  if (mood === 'hot') {
    s += shape('M164,66 Q172,78 168,84 Q160,86 160,78 Q160,72 164,66 Z', '#8fd0f2');
  }
  if (mood === 'cold') {
    s += `<g opacity="0.85" fill="#ffffff" stroke="#b9d4ee" stroke-width="2"><circle cx="152" cy="136" r="7"/><circle cx="164" cy="132" r="9"/><circle cx="178" cy="128" r="6"/></g>`;
  }
  return s;
}

function drawTop(kind, color, look) {
  let s = shape(TORSO.shirt, color);
  if (kind === 'longsleeve') {
    // stripes
    for (let y = 172; y < 268; y += 16) {
      const half = lerp(35, 32, (y - 168) / 100);
      s += line(`M${120 - half + 1},${y} L${120 + half - 1},${y}`, shade(color, 0.22), 6);
    }
    s += `<path d="${TORSO.shirt}" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  } else {
    // tee motif
    s += look === 'girl'
      ? shape('M120,224 Q100,206 106,196 Q112,186 120,196 Q128,186 134,196 Q140,206 120,224 Z', '#ffffff')
      : shape('M120,186 L126,200 L141,201 L129,210 L133,225 L120,216 L107,225 L111,210 L99,201 L114,200 Z', '#ffffff');
  }
  return s;
}

function drawSweatshirt() {
  const c = COLORS.sweatshirt;
  return shape(TORSO.sweatshirt, c) +
    line('M86,270 Q120,280 154,270', shade(c, -0.15), 4) +
    shape('M100,232 L140,232 L146,262 L94,262 Z', shade(c, -0.08)) +
    line('M104,146 Q120,160 136,146', shade(c, -0.2), 5);
}

function drawCoat() {
  const c = COLORS.coat;
  return shape(TORSO.coat, c) +
    line('M120,150 L120,306', shade(c, -0.25), 3.5) +
    shape('M86,250 L108,250 L108,262 L86,262 Z', shade(c, -0.1)) +
    shape('M132,250 L154,250 L154,262 L132,262 Z', shade(c, -0.1)) +
    shape('M96,138 Q120,158 144,138 L148,150 Q120,170 92,150 Z', '#f3efe6');
}

function drawScarf() {
  const c = COLORS.scarf;
  return shape('M128,150 L138,196 L124,198 L116,156 Z', c) +
    line('M124,180 L136,178 M126,188 L137,186', '#ffffff', 2.5) +
    shape('M98,142 Q120,156 142,142 L144,156 Q120,172 96,156 Z', c) +
    line('M104,150 L106,160 M116,154 L117,165 M128,154 L127,165 M138,150 L136,160', '#ffffff', 2.5);
}

function drawBeanie() {
  const c = COLORS.beanie;
  return shape('M64,88 Q62,30 120,28 Q178,30 176,88 Z', c) +
    line('M90,44 L88,86 M120,32 L120,86 M150,44 L152,86', shade(c, -0.12), 3) +
    shape('M60,80 Q120,70 180,80 L180,96 Q120,86 60,96 Z', shade(c, -0.12)) +
    `<circle cx="120" cy="24" r="13" fill="#ffffff" stroke="${O}" stroke-width="${SW}"/>`;
}

function drawCap() {
  const c = COLORS.cap;
  return shape('M68,82 Q70,32 120,30 Q170,32 172,82 Z', c) +
    shape('M60,82 Q120,70 180,82 Q186,94 160,96 Q120,90 80,96 Q54,94 60,82 Z', shade(c, -0.12)) +
    `<circle cx="120" cy="30" r="5" fill="${shade(c, -0.2)}" stroke="${O}" stroke-width="2"/>`;
}

function drawUmbrellaShaft() {
  return line('M178,-22 L170,276', O, 7) + line('M178,-22 L170,276', '#8a6a4f', 3.5) +
    line('M170,276 Q170,290 158,288', O, 6) + line('M170,276 Q170,290 158,288', '#8a6a4f', 3);
}

function drawUmbrellaCanopy() {
  const c = COLORS.umbrella;
  const d = 'M98,2 Q178,-84 258,2 Q238,-12 218,2 Q198,-12 178,2 Q158,-12 138,2 Q118,-12 98,2 Z';
  return line('M178,-50 L178,-62', O, 5) +
    shape(d, c) +
    line('M178,-40 Q156,-24 138,2 M178,-40 Q200,-24 218,2', shade(c, -0.15), 3) +
    shape('M178,-42 Q190,-30 198,-12 Q188,-20 178,-14 Z', shade(c, 0.25), 'stroke-width="0"');
}

function drawBottle() {
  return shape('M36,336 L58,336 L60,346 L60,390 Q60,394 56,394 L38,394 Q34,394 34,390 L34,346 Z', '#dff3fb') +
    shape('M35,360 L59,360 L59,390 Q59,393 56,393 L38,393 Q35,393 35,390 Z', COLORS.bottle, 'stroke-width="0"') +
    `<path d="M36,336 L58,336 L60,346 L60,390 Q60,394 56,394 L38,394 Q34,394 34,390 L34,346 Z" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    shape('M40,324 L54,324 L54,336 L40,336 Z', '#3fa7a0');
}

/**
 * Draw the kid wearing an outfit.
 * child: { look: 'boy'|'girl', skin, hair, color }
 * outfit: { shirt, bottom, shoes, layers: [], acc: [] }
 */
export function drawKid(child, outfit, opts = {}) {
  const skin = SKINS[child.skin] ?? SKINS[0];
  const hair = HAIRS[child.hair] ?? HAIRS[0];
  const shirtColor = child.color || SHIRT_COLORS[0];
  const layers = outfit.layers || [];
  const acc = outfit.acc || [];
  const has = (k) => layers.includes(k) || acc.includes(k);
  const mood = opts.mood || 'ok';

  let s = '';
  // ground shadow
  s += `<ellipse cx="120" cy="394" rx="78" ry="10" fill="#000" opacity="0.08"/>`;
  if (opts.bottle) s += drawBottle();

  if (has('umbrella')) s += drawUmbrellaShaft();
  s += backHair(child.look, hair);

  // legs + bottoms
  s += limb(...LEG_L, 24, skin) + limb(...LEG_R, 24, skin);
  const bc = outfit.bottom === 'shorts' ? COLORS.shorts : COLORS.pants;
  const bf = outfit.bottom === 'shorts' ? 0.38 : 0.94;
  s += partial(...LEG_L, bf, 30, bc) + partial(...LEG_R, bf, 30, bc);
  s += shape('M88,252 L152,252 L154,286 Q120,292 86,286 Z', bc);
  s += line('M120,262 L120,290', shade(bc, -0.2), 3);
  s += drawShoes(outfit.shoes, skin);

  // arms: skin, then sleeves from inner to outer layer
  for (const arm of [ARM_L, ARM_R]) {
    s += limb(...arm, 20, skin);
    s += partial(...arm, outfit.shirt === 'tee' ? 0.3 : 0.86, 22, shirtColor);
    if (has('sweatshirt')) s += partial(...arm, 0.88, 25, COLORS.sweatshirt);
    if (has('coat')) s += partial(...arm, 0.9, 29, COLORS.coat);
    const [, , hx, hy] = arm;
    if (has('gloves')) {
      s += `<circle cx="${hx}" cy="${hy + 2}" r="14" fill="${COLORS.gloves}" stroke="${O}" stroke-width="${SW}"/>`;
    } else {
      s += `<circle cx="${hx}" cy="${hy + 2}" r="11.5" fill="${skin}" stroke="${O}" stroke-width="${SW}"/>`;
    }
  }

  // neck + torso layers
  s += shape('M109,128 L131,128 L131,160 L109,160 Z', skin);
  s += drawTop(outfit.shirt, shirtColor, child.look);
  if (!has('sweatshirt') && !has('coat')) s += shape('M106,148 Q120,166 134,148 Z', skin);
  if (has('sweatshirt')) s += drawSweatshirt();
  if (has('coat')) s += drawCoat();
  if (has('scarf')) s += drawScarf();

  // head
  s += face(skin, mood);
  const hat = has('beanie') ? 'beanie' : has('cap') ? 'cap' : null;
  s += frontHair(child.look, hair, !!hat);
  if (hat === 'beanie') s += drawBeanie();
  if (hat === 'cap') s += drawCap();

  if (has('umbrella')) s += drawUmbrellaCanopy();

  // leave room above the head only when an umbrella is drawn (opts.tall keeps
  // all figures of one kid at the same scale)
  const tall = opts.tall ?? has('umbrella');
  const vb = tall ? '-10 -66 270 470' : '-10 14 270 390';
  return `<svg class="kid-svg${tall ? ' tall' : ''}" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" role="img">${s}</svg>`;
}

// ---------- item icons (viewBox 0 0 100 100) ----------

const ICONS = {
  tee: (c) => shape('M30,22 L42,16 Q50,26 58,16 L70,22 L88,38 L77,50 L68,43 L68,86 L32,86 L32,43 L23,50 L12,38 Z', c) +
    shape('M50,44 L53,51 L60,51 L54,56 L56,63 L50,59 L44,63 L46,56 L40,51 L47,51 Z', '#fff'),
  longsleeve: (c) => shape('M32,18 L42,14 Q50,24 58,14 L68,18 L86,66 L75,70 L67,42 L67,88 L33,88 L33,42 L25,70 L14,66 Z', c) +
    line('M35,50 L65,50 M35,62 L65,62 M35,74 L65,74', shade(c, 0.22), 5) +
    `<path d="M32,18 L42,14 Q50,24 58,14 L68,18 L86,66 L75,70 L67,42 L67,88 L33,88 L33,42 L25,70 L14,66 Z" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>`,
  sweatshirt: () => shape('M30,18 L42,13 Q50,22 58,13 L70,18 L88,68 L76,72 L68,44 L68,88 L32,88 L32,44 L24,72 L12,68 Z', COLORS.sweatshirt) +
    shape('M38,60 L62,60 L65,78 L35,78 Z', shade(COLORS.sweatshirt, -0.08)) +
    line('M33,82 L67,82', shade(COLORS.sweatshirt, -0.15), 4),
  coat: () => shape('M28,16 L42,10 Q50,20 58,10 L72,16 L90,72 L77,76 L70,46 L72,94 L28,94 L30,46 L23,76 L10,72 Z', COLORS.coat) +
    line('M50,18 L50,94', shade(COLORS.coat, -0.25), 3) +
    shape('M36,10 Q50,26 64,10 L66,18 Q50,34 34,18 Z', '#f3efe6'),
  shorts: () => shape('M26,28 L74,28 L79,70 L55,70 L50,48 L45,70 L21,70 Z', COLORS.shorts),
  pants: () => shape('M30,10 L70,10 L75,92 L56,92 L50,38 L44,92 L25,92 Z', COLORS.pants) +
    line('M30,20 L70,20', shade(COLORS.pants, -0.2), 3),
  sneakers: () => shape('M12,62 Q12,40 30,40 L46,40 Q52,52 68,53 Q88,55 90,68 L90,70 L12,70 Z', COLORS.sneakers) +
    shape('M10,68 L92,68 L92,74 Q92,80 86,80 L16,80 Q10,80 10,74 Z', '#fff') +
    line('M36,46 L44,52 M32,52 L40,58', '#fff', 3),
  sandals: () => shape('M10,70 Q10,62 20,62 L82,62 Q92,62 92,70 Q92,78 82,78 L20,78 Q10,78 10,70 Z', COLORS.sandals) +
    line('M30,62 Q40,40 54,62 M58,62 Q68,46 78,62', shade(COLORS.sandals, -0.15), 6),
  boots: () => shape('M28,12 L58,12 L58,58 Q82,60 86,74 L86,86 L28,86 Z', COLORS.boots) +
    shape('M26,84 L88,84 L88,92 L26,92 Z', '#5a4636') + line('M28,24 L58,24', shade(COLORS.boots, -0.15), 4),
  umbrella: () => line('M50,22 L50,80 Q50,90 40,88', O, 6) + line('M50,22 L50,80 Q50,90 40,88', '#8a6a4f', 3) +
    shape('M8,52 Q50,-6 92,52 Q81,44 71,52 Q60,44 50,52 Q40,44 29,52 Q19,44 8,52 Z', COLORS.umbrella),
  beanie: () => shape('M18,70 Q16,20 50,18 Q84,20 82,70 Z', COLORS.beanie) +
    shape('M14,64 L86,64 L86,80 L14,80 Z', shade(COLORS.beanie, -0.12)) +
    `<circle cx="50" cy="16" r="10" fill="#fff" stroke="${O}" stroke-width="${SW}"/>`,
  gloves: () => shape('M22,88 L22,44 Q22,28 38,28 Q54,28 54,44 L54,88 Z', COLORS.gloves) +
    shape('M54,56 Q66,46 70,56 Q72,64 56,72 Z', COLORS.gloves) +
    shape('M20,80 L56,80 L56,92 L20,92 Z', '#fff'),
  scarf: () => shape('M14,30 Q50,46 86,30 L88,46 Q50,62 12,46 Z', COLORS.scarf) +
    shape('M58,50 L68,90 L54,92 L46,54 Z', COLORS.scarf) +
    line('M24,38 L24,50 M40,42 L40,54 M60,42 L60,54 M76,38 L76,50', '#fff', 3),
  cap: () => shape('M22,62 Q22,22 52,20 Q82,22 82,62 Z', COLORS.cap) +
    shape('M14,62 L92,62 Q98,72 86,74 L20,74 Q8,72 14,62 Z', shade(COLORS.cap, -0.12)),
  bottle: () => shape('M38,24 L62,24 L66,36 L66,88 Q66,92 62,92 L38,92 Q34,92 34,88 L34,36 Z', '#dff3fb') +
    shape('M35,54 L65,54 L65,88 Q65,91 62,91 L38,91 Q35,91 35,88 Z', COLORS.bottle, 'stroke-width="0"') +
    `<path d="M38,24 L62,24 L66,36 L66,88 Q66,92 62,92 L38,92 Q34,92 34,88 L34,36 Z" fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round"/>` +
    shape('M40,10 L60,10 L60,24 L40,24 Z', '#3fa7a0'),
  sunscreen: () => shape('M30,30 L70,30 L64,90 L36,90 Z', COLORS.sunscreen) +
    shape('M40,14 L60,14 L60,30 L40,30 Z', '#e5534b') +
    `<circle cx="50" cy="58" r="10" fill="#ff9f1c" stroke="${O}" stroke-width="2"/>` +
    line('M50,42 L50,46 M50,70 L50,74 M34,58 L38,58 M62,58 L66,58', '#ff9f1c', 3),
  backpack: () => line('M36,30 Q36,12 50,12 Q64,12 64,30', O, 5) +
    shape('M24,36 Q24,26 34,26 L66,26 Q76,26 76,36 L76,86 Q76,92 70,92 L30,92 Q24,92 24,86 Z', COLORS.backpack) +
    shape('M34,58 L66,58 L66,80 L34,80 Z', shade(COLORS.backpack, -0.1)) +
    line('M24,46 L76,46', shade(COLORS.backpack, -0.2), 3),
};

export function itemIcon(name, color) {
  const fn = ICONS[name];
  if (!fn) return '';
  return `<svg class="item-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${fn(color || SHIRT_COLORS[0])}</svg>`;
}

// ---------- weather icons (viewBox 0 0 100 100) ----------

const sun = (cx, cy, r) => {
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rays += `M${cx + Math.cos(a) * (r + 6)},${cy + Math.sin(a) * (r + 6)} L${cx + Math.cos(a) * (r + 14)},${cy + Math.sin(a) * (r + 14)} `;
  }
  return line(rays, '#f7a928', 5) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffd23f" stroke="#f7a928" stroke-width="3"/>`;
};
const moon = (cx, cy) => `<path d="M${cx + 6},${cy - 24} A24,24 0 1,0 ${cx + 22},${cy + 14} A19,19 0 1,1 ${cx + 6},${cy - 24} Z" fill="#ffe8a3" stroke="#e0b94f" stroke-width="3"/>`;
const cloud = (dx = 0, dy = 0, fill = '#ffffff', stroke = '#8aa0b8') =>
  `<path transform="translate(${dx},${dy})" d="M28,72 Q12,72 12,58 Q12,44 28,44 Q30,28 48,28 Q62,28 68,40 Q88,38 90,56 Q90,72 74,72 Z" fill="${fill}" stroke="${stroke}" stroke-width="3.5" stroke-linejoin="round"/>`;
const drops = (n) => {
  let d = '';
  const xs = n === 2 ? [38, 62] : [30, 50, 70];
  for (const x of xs) d += `M${x},78 L${x - 5},92 `;
  return line(d, '#3d8fe0', 5);
};

export function weatherIcon(kind, night = false) {
  let s = '';
  switch (kind) {
    case 'clear': s = night ? moon(44, 50) : sun(50, 50, 20); break;
    case 'partly': s = (night ? moon(38, 36) : sun(38, 36, 16)) + cloud(8, 12); break;
    case 'cloudy': s = cloud(-8, -6, '#eef2f7') + cloud(6, 6); break;
    case 'fog': s = cloud(0, -8, '#eef2f7') + line('M18,78 L82,78 M26,90 L74,90', '#9aa9b9', 5); break;
    case 'drizzle': s = cloud(0, -10) + drops(2); break;
    case 'rain': s = cloud(0, -10, '#dfe7f0', '#6f86a0') + drops(3); break;
    case 'storm': s = cloud(0, -12, '#c9d3df', '#5c6f86') + `<path d="M52,58 L40,78 L52,78 L44,96 L64,70 L52,70 L60,58 Z" fill="#ffd23f" stroke="#e0a21f" stroke-width="2.5" stroke-linejoin="round"/>`; break;
    case 'snow': s = cloud(0, -10) + `<g fill="#9fc9ef"><circle cx="32" cy="84" r="5"/><circle cx="50" cy="92" r="5"/><circle cx="68" cy="84" r="5"/></g>`; break;
    case 'wind': s = line('M14,38 L60,38 Q74,38 74,28 Q74,18 64,20 M14,54 L78,54 Q90,54 90,64 Q90,74 80,72 M14,70 L52,70', '#7d93ab', 6); break;
    default: s = cloud();
  }
  return `<svg class="wx-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// A little sky arc with the sun placed by hour (right = morning, for RTL reading).
export function skyClock(hour) {
  const t = Math.max(0, Math.min(1, (hour - 6) / 12));
  const a = Math.PI * t; // 0 at right, PI at left
  const cx = 50 + Math.cos(a) * 36, cy = 70 - Math.sin(a) * 40;
  return `<svg class="sky-svg" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">` +
    line('M10,70 Q10,22 50,22 Q90,22 90,70', '#c9b89a', 3, 'stroke-dasharray="4 7"') +
    line('M4,72 L96,72', '#a9d18e', 5) +
    `<circle cx="${cx}" cy="${cy}" r="11" fill="#ffd23f" stroke="#f7a928" stroke-width="3"/></svg>`;
}

export function arrowIcon() {
  return `<svg class="arrow-svg" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M112,30 Q70,6 28,26" fill="none" stroke="#c9a77c" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 13"/>` +
    `<path d="M36,12 L14,30 L40,40 Z" fill="#c9a77c" stroke="#c9a77c" stroke-width="4" stroke-linejoin="round"/></svg>`;
}

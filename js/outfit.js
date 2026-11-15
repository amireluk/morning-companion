// Turns an hourly forecast for the hours the kid is out into an outfit plan.
// All temperatures are "feels like" (apparent) temperatures (an optional offset
// shifts them: positive = runs warm).
//
// The rules are a small table the parent can edit in settings: six feel levels
// (freezing … very hot), each with an upper bound and what to wear in it.

export const LEVEL_NAMES = ['קפוא', 'קר מאוד', 'קר', 'קריר', 'נעים', 'חם', 'חם מאוד'];
export const LEVEL_COLORS = ['#6f8fe8', '#7fb3f0', '#8fd6c8', '#b5df8a', '#f7cf4f', '#f59f4c', '#e8604c'];

// Defaults tuned for Israel. People here are comfortable at about 20–25°C
// (a Tel Aviv outdoor-comfort study), so under ~19° already feels cold and the
// puffer coat starts at 14°; beanie, scarf and gloves only below 10°.
// Bump RULES_VERSION when the defaults change so browsers holding the old
// defaults pick up the new ones.
const RULES_VERSION = 4;
const lvl = (max, shirt, bottom, shoes, extra = {}) => ({
  max, shirt, bottom, shoes, sweatshirt: false, coat: false, winter: false, cap: false, ...extra,
});
export const defaultRules = () => ({
  v: RULES_VERSION,
  levels: [
    lvl(10, 'long', 'pants', 'sneakers', { sweatshirt: true, coat: true, winter: true }), // freezing
    lvl(14, 'long', 'pants', 'sneakers', { sweatshirt: true, coat: true }), // very cold
    // cold: a short-sleeve shirt under the sweatshirt – such mornings usually
    // warm up, and the sweatshirt comes off
    lvl(19, 'tee', 'pants', 'sneakers', { sweatshirt: true }), // cold
    lvl(23, 'long', 'pants', 'sneakers'), // cool: a thin long-sleeve shirt
    lvl(26, 'tee', 'shorts', 'sneakers'), // pleasant
    lvl(29, 'tee', 'shorts', 'sneakers', { cap: true }), // warm
    lvl(null, 'tee', 'shorts', 'sandals', { cap: true }), // hot
  ],
  // boots: 'heavy' (at least bootsMm of rain in the day), 'any' rain, or 'never'
  rain: { chance: 50, boots: 'heavy', bootsMm: 6 },
});

// Make a stored rules object safe to use (missing fields fall back to defaults).
export function normalizeRules(r) {
  const d = defaultRules();
  if (!r || r.v !== d.v || !Array.isArray(r.levels) || r.levels.length !== d.levels.length) return d;
  const levels = r.levels.map((l, i) => ({ ...d.levels[i], ...l }));
  levels[levels.length - 1].max = null;
  // bounds must go up
  for (let i = 1; i < levels.length - 1; i++) {
    if (!(levels[i].max > levels[i - 1].max)) levels[i].max = levels[i - 1].max + 1;
  }
  return { v: d.v, levels, rain: { ...d.rain, ...(r.rain || {}) } };
}

export function levelIndex(t, rules) {
  const i = rules.levels.findIndex((l) => l.max == null || t < l.max);
  return i < 0 ? rules.levels.length - 1 : i;
}

export const isRainy = (h, rules) => h.pop >= rules.rain.chance || h.precip >= 0.3;

// Split hours into up to three consecutive phases (morning / midday / afternoon).
export function phasesOf(hours) {
  const n = hours.length;
  if (n <= 3) return [hours];
  const a = Math.round(n / 3), b = Math.round((2 * n) / 3);
  return [hours.slice(0, a), hours.slice(a, b), hours.slice(b)];
}

const ORDER = ['sweatshirt', 'coat', 'scarf', 'beanie', 'gloves', 'umbrella', 'cap'];
const sortItems = (arr) => [...new Set(arr)].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));

// Every part of the day (morning / noon / afternoon) is dressed by the table
// row for its temperature – the coldest hour of that part, the number on its
// tile. Leaving the house means wearing the morning's outfit; layers and
// accessories a later part needs that the morning doesn't (a cap, an
// umbrella, a sweatshirt for a cold evening) go in the bag.
// The shirt is one for the whole day – nobody changes shirts at school: if
// any part of the day calls for short sleeves, it's a short-sleeve shirt.
// Sweatshirts, coats and the rest come only from the table.
// Trousers and shoes stay on all day: shorts and sandals only if the whole
// day is warm enough for them.
export function planOutfit(hours, offset = 0, rules = defaultRules()) {
  if (!hours.length) return null;
  const L = (t) => rules.levels[levelIndex(t, rules)];
  const rainy = (h) => isRainy(h, rules);
  const f = (h) => h.feels + offset;
  const feels = hours.map(f);
  const peak = Math.max(...feels);
  const low = Math.min(...feels);
  const anyRain = hours.some(rainy);
  const totalMm = hours.reduce((s, h) => s + (h.precip || 0), 0);
  const hottest = rules.levels.length - 1;

  const parts = phasesOf(hours);
  const dayTee = parts.some((ph) => L(Math.min(...ph.map(f))).shirt === 'tee');
  const phases = parts.map((ph) => {
    const pf = ph.map(f);
    const t = Math.min(...pf), tMax = Math.max(...pf);
    const lv = L(t);
    const layers = [], acc = [];
    if (lv.sweatshirt) layers.push('sweatshirt');
    if (lv.coat) layers.push('coat');
    if (lv.winter) acc.push('scarf', 'beanie', 'gloves');
    if (ph.some(rainy)) acc.push('umbrella');
    else if (lv.cap) acc.push('cap');
    return {
      from: ph[0].hour, to: ph[ph.length - 1].hour, tMin: t, tMax, hours: ph,
      shirt: dayTee ? 'tee' : 'longsleeve', bottom: lv.bottom, shoes: lv.shoes,
      layers, acc, cold: lv.winter,
      mood: lv.winter ? 'cold' : levelIndex(t, rules) === hottest ? 'hot' : 'ok',
    };
  });

  const morning = phases[0];
  const bootsOn = rules.rain.boots === 'any' ? anyRain
    : rules.rain.boots === 'never' ? false : totalMm >= rules.rain.bootsMm;
  // trousers and shoes can't change during the day: shorts and sandals only if
  // every part of the day is warm enough for them
  const bottom = phases.every((p) => p.bottom === 'shorts') ? 'shorts' : 'pants';
  const shoes = bootsOn ? 'boots' : !anyRain && phases.every((p) => p.shoes === 'sandals') ? 'sandals' : 'sneakers';
  for (const p of phases) { p.bottom = bottom; p.shoes = shoes; }

  const wornAtStart = new Set([morning.shirt, ...morning.layers, ...morning.acc]);
  const bag = sortItems(phases.slice(1).flatMap((p) => [...p.layers, ...p.acc]).filter((id) => !wornAtStart.has(id)));

  return { peak, low, morning, bag, phases };
}


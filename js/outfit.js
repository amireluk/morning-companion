// Turns an hourly forecast for the hours the kid is out into an outfit plan.
// All temperatures are "feels like" (apparent) temperatures, shifted by the
// kid's personal offset (positive = this kid runs warm).
//
// The rules are a small table the parent can edit in settings: six feel levels
// (very cold … very hot), each with an upper bound and what to wear in it.

export const LEVEL_NAMES = ['קר מאוד', 'קר', 'קריר', 'נעים', 'חם', 'חם מאוד'];

// Defaults tuned for Israel: 12° is very cold, 17° is cold, 24° is pleasant,
// 26° is warm, 30° is hot. Bump RULES_VERSION when the defaults change so
// browsers holding the old defaults pick up the new ones.
const RULES_VERSION = 2;
export const defaultRules = () => ({
  v: RULES_VERSION,
  levels: [
    { max: 14, shirt: 'long', bottom: 'pants', shoes: 'sneakers', sweatshirt: true, coat: true, winter: true, cap: false },
    { max: 19, shirt: 'long', bottom: 'pants', shoes: 'sneakers', sweatshirt: true, coat: true, winter: false, cap: false },
    { max: 23, shirt: 'long', bottom: 'pants', shoes: 'sneakers', sweatshirt: true, coat: false, winter: false, cap: false },
    { max: 26, shirt: 'tee', bottom: 'shorts', shoes: 'sneakers', sweatshirt: false, coat: false, winter: false, cap: false },
    { max: 29, shirt: 'tee', bottom: 'shorts', shoes: 'sneakers', sweatshirt: false, coat: false, winter: false, cap: true },
    { max: null, shirt: 'tee', bottom: 'shorts', shoes: 'sandals', sweatshirt: false, coat: false, winter: false, cap: true },
  ],
  rain: { chance: 50, bootsMm: 6 },
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

export function planOutfit(hours, offset = 0, rules = defaultRules()) {
  if (!hours.length) return null;
  const L = (t) => rules.levels[levelIndex(t, rules)];
  const rainy = (h) => isRainy(h, rules);
  const f = (h) => h.feels + offset;
  const feels = hours.map(f);
  const peak = Math.max(...feels);
  const low = Math.min(...feels);
  const P = L(peak), C = L(low);
  const anyRain = hours.some(rainy);
  const totalMm = hours.reduce((s, h) => s + (h.precip || 0), 0);

  // base clothes are worn all day: chosen by the warmest hour, but shorts and
  // sandals only if the coldest hour doesn't call for a warm layer
  const coldPart = C.sweatshirt || C.coat;
  const shirt = P.shirt === 'tee' ? 'tee' : 'longsleeve';
  const bottom = P.bottom === 'shorts' && !coldPart ? 'shorts' : 'pants';
  const shoes = totalMm >= rules.rain.bootsMm ? 'boots'
    : P.shoes === 'sandals' && !anyRain && C.bottom === 'shorts' ? 'sandals' : 'sneakers';

  const raw = phasesOf(hours).map((ph) => {
    const pf = ph.map(f);
    const t = Math.min(...pf), tMax = Math.max(...pf);
    const lv = L(t), hot = L(tMax);
    const layers = [], acc = [];
    // a sweatshirt when this level asks for one, or when it asks for long
    // sleeves but the kid is in a short-sleeve shirt
    if (lv.sweatshirt || (lv.shirt === 'long' && shirt === 'tee')) layers.push('sweatshirt');
    if (lv.coat) layers.push('coat');
    if (lv.winter) acc.push('scarf', 'beanie', 'gloves');
    const wet = ph.some(rainy);
    if (wet) acc.push('umbrella');
    if (!wet && hot.cap) acc.push('cap');
    return { from: ph[0].hour, to: ph[ph.length - 1].hour, tMin: t, tMax, layers, acc, hours: ph, cold: lv.winter };
  });

  // a sun cap is worn all day if it's needed at any point (not a reason to change)
  if (raw.some((p) => p.acc.includes('cap'))) {
    for (const p of raw) if (!p.acc.includes('umbrella') && !p.acc.includes('cap')) p.acc.push('cap');
  }

  // merge neighbouring phases that need the same clothes
  const segments = [];
  for (const p of raw) {
    const prev = segments[segments.length - 1];
    if (prev && sameWear(prev, p)) {
      prev.to = p.to;
      prev.tMin = Math.min(prev.tMin, p.tMin);
      prev.tMax = Math.max(prev.tMax, p.tMax);
      prev.hours = prev.hours.concat(p.hours);
    } else {
      segments.push({ ...p });
    }
  }
  const hottest = rules.levels.length - 1;
  for (const s of segments) {
    s.shirt = shirt; s.bottom = bottom; s.shoes = shoes;
    s.mood = s.cold ? 'cold' : levelIndex(s.tMax, rules) === hottest ? 'hot' : 'ok';
  }

  // what to wear when leaving, and what goes in the bag for later in the day
  const morning = segments[0];
  const wornAtStart = new Set([...morning.layers, ...morning.acc]);
  const bag = sortItems(segments.slice(1).flatMap((s) => [...s.layers, ...s.acc]).filter((id) => !wornAtStart.has(id)));

  return { peak, low, morning, bag, phases: raw };
}

function sameWear(a, b) {
  return a.layers.join() === b.layers.join() && a.acc.join() === b.acc.join();
}

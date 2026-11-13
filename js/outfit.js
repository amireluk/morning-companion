// Turns an hourly forecast for the hours the kid is out into an outfit plan.
// All temperatures are "feels like" (apparent) temperatures, shifted by the
// kid's personal offset (positive = this kid runs warm).

export const T = {
  shortSleeve: 22, // peak at or above → short-sleeve shirt
  shortsPeak: 23, // shorts only if peak ≥ this ...
  shortsLow: 17, // ... and the coldest hour ≥ this
  sandalsPeak: 27,
  sandalsLow: 21,
  sweatshirt: 17, // coldest hour of a phase below → sweatshirt
  sweatOverTee: 20, // with a short-sleeve shirt, add a sweatshirt below this
  coat: 12,
  winterGear: 7, // beanie + gloves + scarf
  bottle: 29,
  rainChance: 50, // %
  rainMm: 0.3, // mm in an hour
  bootsTotalMm: 6,
  bootsHourMm: 2.5,
  capUv: 6,
  capFeels: 24,
};

export const isRainy = (h) => h.pop >= T.rainChance || h.precip >= T.rainMm;

// Split hours into up to three consecutive phases (morning / midday / afternoon).
export function phasesOf(hours) {
  const n = hours.length;
  if (n <= 3) return [hours];
  const a = Math.round(n / 3), b = Math.round((2 * n) / 3);
  return [hours.slice(0, a), hours.slice(a, b), hours.slice(b)];
}

const ORDER = ['sweatshirt', 'coat', 'scarf', 'beanie', 'gloves', 'umbrella', 'cap'];
const sortItems = (arr) => [...new Set(arr)].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));

export function planOutfit(hours, offset = 0) {
  if (!hours.length) return null;
  const f = (h) => h.feels + offset;
  const feels = hours.map(f);
  const peak = Math.max(...feels);
  const low = Math.min(...feels);
  const anyRain = hours.some(isRainy);
  const totalMm = hours.reduce((s, h) => s + (h.precip || 0), 0);
  const heavy = totalMm >= T.bootsTotalMm || hours.some((h) => h.precip >= T.bootsHourMm);

  const shirt = peak >= T.shortSleeve ? 'tee' : 'longsleeve';
  const bottom = peak >= T.shortsPeak && low >= T.shortsLow ? 'shorts' : 'pants';
  const shoes = heavy ? 'boots' : peak >= T.sandalsPeak && low >= T.sandalsLow && !anyRain ? 'sandals' : 'sneakers';

  const raw = phasesOf(hours).map((ph) => {
    const pf = ph.map(f);
    const t = Math.min(...pf), tMax = Math.max(...pf);
    const layers = [], acc = [];
    if (t < T.sweatshirt || (shirt === 'tee' && t < T.sweatOverTee)) layers.push('sweatshirt');
    if (t < T.coat) layers.push('coat');
    if (t < T.winterGear) acc.push('scarf', 'beanie', 'gloves');
    const rainy = ph.some(isRainy);
    if (rainy) acc.push('umbrella');
    if (!rainy && tMax >= T.capFeels && Math.max(...ph.map((h) => h.uv || 0)) >= T.capUv) acc.push('cap');
    return { from: ph[0].hour, to: ph[ph.length - 1].hour, tMin: t, tMax, layers, acc, hours: ph };
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
  for (const s of segments) {
    s.shirt = shirt; s.bottom = bottom; s.shoes = shoes;
    s.mood = s.tMin < T.winterGear ? 'cold' : s.tMax >= 30 ? 'hot' : 'ok';
  }

  // what to wear when leaving, and what goes in the bag for later in the day
  const morning = segments[0];
  const wornAtStart = new Set([...morning.layers, ...morning.acc]);
  const bag = sortItems(segments.slice(1).flatMap((s) => [...s.layers, ...s.acc]).filter((id) => !wornAtStart.has(id)));
  if (peak >= T.bottle) bag.push('bottle');

  return { peak, low, morning, bag, phases: raw };
}

function sameWear(a, b) {
  return a.layers.join() === b.layers.join() && a.acc.join() === b.acc.join();
}

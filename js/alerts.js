// "שים לב" – short notes about things that are really out of the ordinary in
// the hours the kids are out. Meant to show up about once a week or two, not
// daily: heat, cold and big morning→noon swings are judged against the past
// week (so a normal summer heat or winter cold says nothing), while heavy
// rain, strong wind, storms and snow are rare enough to judge on their own.
// Returns at most three, most important first; usually none.

import { phasesOf, levelIndex, LEVEL_NAMES } from './outfit.js';

export const A = {
  heavyRainDayMm: 15, // total over the window
  heavyRainHourMm: 6, // any single hour
  windKmh: 40,
  gustKmh: 65,
  // compared with the past week's average (same hours of the day)
  hotterBy: 6, // peak feels-like this much above the week's typical peak …
  hotMin: 28, // … and at least this hot
  colderBy: 6, // coldest feels-like this much below the week's typical low …
  coldMax: 16, // … and at most this cold
  swingBy: 5, // morning→later rise this much bigger than the week's usual rise …
  swingMin: 12, // … and at least this big
  strongUv: 8, // mentioned only together with a swing
  // with no past data (offline, demo): only true extremes
  absHot: 38,
  absCold: 3,
  absSwing: 15,
};

const later = (hour) => (hour < 14 ? 'בצהריים' : 'אחר הצהריים');
const word = (t, rules) => LEVEL_NAMES[levelIndex(t, rules)];

// The numbers a day is judged by, for the hours the kids are out.
export function dayStats(win) {
  if (!win.length) return null;
  const feels = win.map((h) => h.feels);
  const ph = phasesOf(win);
  const am = Math.min(...ph[0].map((h) => h.feels));
  const rest = ph.slice(1).flat();
  const warmest = rest.length ? rest.reduce((a, b) => (b.feels > a.feels ? b : a)) : null;
  return {
    low: Math.min(...feels),
    peak: Math.max(...feels),
    am,
    warmest,
    rise: warmest ? warmest.feels - am : 0,
  };
}

// Average stats of the past days (each an array of the window's hours).
export function baselineOf(pastWindows) {
  const stats = pastWindows.map(dayStats).filter(Boolean);
  if (stats.length < 3) return null;
  const avg = (k) => stats.reduce((s, x) => s + x[k], 0) / stats.length;
  return { low: avg('low'), peak: avg('peak'), rise: avg('rise'), days: stats.length };
}

export function computeAlerts(win, rules, base = null) {
  const st = dayStats(win);
  if (!st) return [];
  const out = [];
  const add = (rank, icon, text) => out.push({ rank, icon, text });
  const totalMm = win.reduce((s, h) => s + (h.precip || 0), 0);
  const maxMm = Math.max(...win.map((h) => h.precip || 0));
  const maxWind = Math.max(...win.map((h) => h.wind || 0));
  const maxGust = Math.max(...win.map((h) => h.gust || 0));
  const maxUv = Math.max(...win.map((h) => h.uv || 0));
  const has = (test) => win.some(test);

  // rare on their own
  if (has((h) => h.code >= 95)) add(1, 'storm', 'סופת רעמים צפויה');
  if (has((h) => (h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86)) add(2, 'snow', 'שלג צפוי');
  if (totalMm >= A.heavyRainDayMm || maxMm >= A.heavyRainHourMm) add(3, 'rain', 'גשם חזק במיוחד');
  if (maxWind >= A.windKmh || maxGust >= A.gustKmh) {
    add(4, 'wind', `רוח חזקה${maxGust >= A.gustKmh ? ` – משבים עד ${Math.round(maxGust)} קמ״ש` : ''}`);
  }

  // unusual compared with the past week
  const hot = base ? st.peak - base.peak >= A.hotterBy && st.peak >= A.hotMin : st.peak >= A.absHot;
  const cold = base ? base.low - st.low >= A.colderBy && st.low <= A.coldMax : st.low <= A.absCold;
  const swing = st.warmest && (base ? st.rise - base.rise >= A.swingBy && st.rise >= A.swingMin : st.rise >= A.absSwing);
  if (hot) add(5, 'clear', `חם במיוחד${base ? ' לעומת הימים האחרונים' : ''} – מרגיש כמו ${Math.round(st.peak)}°, לשתות הרבה`);
  if (cold) add(5, 'snow', `קר במיוחד${base ? ' לעומת הימים האחרונים' : ''} – מרגיש כמו ${Math.round(st.low)}°`);
  if (swing) {
    const w = st.warmest;
    const sun = maxUv >= A.strongUv ? ' ושמש חזקה' : '';
    add(6, 'partly', `בבוקר ${word(st.am, rules)} (${Math.round(st.am)}°), ${later(w.hour)} ${word(w.feels, rules)} (${Math.round(w.feels)}°)${sun}`);
  }

  return out.sort((a, b) => a.rank - b.rank).slice(0, 3);
}

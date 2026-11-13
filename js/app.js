import { drawKid, itemIcon, weatherIcon } from './art.js';
import { planOutfit, phasesOf, isRainy } from './outfit.js';
import { resolveLocation, fetchForecast, dateKey, iconKind, demoDay } from './weather.js';
import { load, save, isReader } from './store.js';
import { openSettings } from './settings.js';

const LABELS = {
  tee: 'חולצה קצרה', longsleeve: 'חולצה ארוכה', sweatshirt: 'סווטשירט', coat: 'מעיל',
  shorts: 'מכנס קצר', pants: 'מכנס ארוך', sneakers: 'נעליים', sandals: 'סנדלים', boots: 'מגפיים',
  umbrella: 'מטריה', beanie: 'כובע צמר', gloves: 'כפפות', scarf: 'צעיף', cap: 'כובע',
  bottle: 'בקבוק מים',
};
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo');
const DEMO_HOUR = params.has('hour') ? Number(params.get('hour')) : null;

let settings = load();
const state = { loc: null, forecast: null, error: null, fetchedAt: 0, wakeUntil: 0 };
const app = document.getElementById('app');

const now = () => {
  const d = new Date();
  if (DEMO_HOUR != null) d.setHours(DEMO_HOUR, 0, 0, 0);
  return d;
};

// ---------- helpers ----------
const STOPS = [[0, '#6f8fe8'], [8, '#7fb3f0'], [14, '#8fd6c8'], [19, '#a5dc7c'], [24, '#f7cf4f'], [29, '#f59f4c'], [34, '#e8604c']];
function tempColor(t) {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return STOPS[STOPS.length - 1][1];
}
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const deg = (t) => `${Math.round(t)}°`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PHASES = ['בוקר', 'צהריים', 'ערב'];

// a word for how it feels outside, from the feels-like temperature
function feelWord(t) {
  if (t < 7) return 'קר מאוד';
  if (t < 12) return 'קר';
  if (t < 17) return 'קריר';
  if (t < 22) return 'נעים';
  if (t < 28) return 'חם';
  return 'חם מאוד';
}

// ---------- data ----------
async function refresh() {
  if (DEMO) { render(); return; }
  try {
    state.loc = await resolveLocation(settings.location);
    state.forecast = await fetchForecast(state.loc);
    state.error = null;
  } catch (e) {
    state.error = e;
  }
  state.fetchedAt = Date.now();
  render();
}

function targetDay(n) {
  const tomorrow = n.getHours() >= settings.switchHour;
  const d = new Date(n);
  if (tomorrow) d.setDate(d.getDate() + 1);
  return { tomorrow, date: d, key: dateKey(d) };
}

// ---------- render ----------
function render() {
  const n = now();
  const { tomorrow, date, key } = targetDay(n);
  const hour = n.getHours();
  const night = hour >= settings.nightStart || hour < settings.nightEnd;
  document.body.classList.toggle('tomorrow', tomorrow);
  document.body.classList.toggle('night', night && Date.now() > state.wakeUntil);
  manageWakeLock(night);

  const day = DEMO ? demoDay(DEMO) : state.forecast?.days?.[key];
  const kids = settings.kids.length ? settings.kids : [];
  const readers = kids.some(isReader);

  let body;
  if (!day) {
    body = `<div class="empty">${weatherIcon(state.error ? 'cloudy' : 'partly')}<div class="spinner"></div></div>`;
  } else {
    const win = day.filter((h) => h.hour >= settings.leaveHour && h.hour <= settings.returnHour);
    body = timeline(win, readers) +
      `<main class="kids kids-${kids.length}">${kids.map((k) => kidCard(k, planOutfit(win, k.offset || 0))).join('')}</main>`;
  }
  app.innerHTML = header(tomorrow, date, readers) + body;
  bindGear();
}

function header(tomorrow, date, readers) {
  const badge = tomorrow
    ? `<div class="day-badge moon">${weatherIcon('clear', true)}${readers ? `<span>מחר · יום ${DAYS[date.getDay()]}</span>` : ''}</div>`
    : `<div class="day-badge">${weatherIcon('clear')}${readers ? `<span>היום · יום ${DAYS[date.getDay()]}</span>` : ''}</div>`;
  const locName = DEMO ? `דמו: ${DEMO}` : state.loc?.name || '';
  const stale = state.forecast?.stale || state.error ? '<i class="stale" title="אין חיבור – מציג נתונים שמורים"></i>' : '';
  return `<header class="top">${badge}<div class="where">${stale}<span>${esc(locName)}</span><button class="gear" aria-label="הגדרות (לחיצה ארוכה)">⚙</button></div></header>`;
}

// Three tiles: morning / noon / evening of the hours the kids are out.
function timeline(win, readers) {
  const tiles = phasesOf(win).map((ph, i) => {
    const rainy = ph.filter(isRainy);
    const h = rainy.length ? rainy.reduce((a, b) => (b.precip > a.precip ? b : a)) : ph[Math.floor(ph.length / 2)];
    let kind = iconKind(h);
    if (rainy.length && !['rain', 'drizzle', 'storm', 'snow'].includes(kind)) kind = 'rain';
    // show the coldest (feels-like) hour of this part of the day: that is the
    // hour the clothes are chosen for, so the tile and the outfit agree
    const cold = ph.reduce((a, b) => (b.feels < a.feels ? b : a));
    const temp = Math.round(cold.temp);
    const feels = cold.feels;
    const pop = Math.max(...ph.map((x) => x.pop));
    return `<div class="phase">` +
      weatherIcon(kind, !h.day) +
      `<div class="ptext"><span class="pname">${PHASES[i] || ''}</span>` +
      `<div class="tchip" style="background:${tempColor(feels)}"><bdi dir="ltr">${temp}°</bdi></div>` +
      `<span class="pfeel">${feelWord(feels)}</span>` +
      (rainy.length ? `<div class="pop">💧 ${pop}%</div>` : '') +
      `</div></div>`;
  }).join('');
  return `<section class="timeline">${tiles}</section>`;
}

// One figure dressed for leaving the house + what goes in the bag for later.
function kidCard(kid, plan) {
  if (!plan) return '';
  const reader = isReader(kid);
  const m = plan.morning;
  // size the figure by age so a 4-year-old stands shorter than an 8-year-old
  const h = Math.max(70, Math.min(100, 70 + ((kid.age || 6) - 3) * 6));
  const fig = `<div class="fig" style="--h:${h}">${drawKid(kid, m, { mood: m.mood })}</div>`;
  const worn = [m.shirt, m.bottom, m.shoes, ...m.layers, ...m.acc];
  const items = `<div class="items">${worn.map((id) => `<div class="card">${itemIcon(id, kid.color)}${reader ? `<div class="clabel">${LABELS[id] || ''}</div>` : ''}</div>`).join('')}</div>`;
  const bag = plan.bag.length
    ? `<div class="bag">${reader ? '<div class="bag-title">לשים בתיק</div>' : ''}` +
      `<div class="bag-items">${plan.bag.map((id) => `<div class="card">${itemIcon(id, kid.color)}${reader ? `<div class="clabel">${LABELS[id] || ''}</div>` : ''}</div>`).join('')}</div>` +
      `<div class="bag-arrow">⬇</div><div class="bag-icon">${itemIcon('backpack')}</div></div>`
    : '';
  const name = kid.name ? `<div class="kid-name" style="--c:${kid.color}">${esc(kid.name)}</div>` : '';
  return `<section class="kid${bag ? ' has-bag' : ''}">${name}<div class="kid-body">${fig}${bag}</div>${items}</section>`;
}

// ---------- settings access (long press on the gear) ----------
function bindGear() {
  const g = app.querySelector('.gear');
  if (!g) return;
  let t;
  const start = (e) => { e.preventDefault(); g.classList.add('pressing'); t = setTimeout(() => { g.classList.remove('pressing'); showSettings(); }, 1200); };
  const cancel = () => { clearTimeout(t); g.classList.remove('pressing'); };
  g.addEventListener('pointerdown', start);
  g.addEventListener('pointerup', cancel);
  g.addEventListener('pointerleave', cancel);
  g.addEventListener('contextmenu', (e) => e.preventDefault());
}

function showSettings() {
  openSettings(settings, (next) => {
    settings = { ...next, configured: true };
    save(settings);
    refresh();
  });
}

// ---------- screen: keep awake by day, dim at night ----------
let lock = null;
async function manageWakeLock(night) {
  if (!('wakeLock' in navigator)) return;
  try {
    if (!night && !lock && document.visibilityState === 'visible') {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (night && lock) {
      await lock.release();
      lock = null;
    }
  } catch { /* not allowed right now */ }
}

// a tap at night wakes the screen for a minute
document.addEventListener('pointerdown', () => {
  if (document.body.classList.contains('night')) {
    state.wakeUntil = Date.now() + 60_000;
    render();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - state.fetchedAt > 15 * 60_000) refresh(); else render();
});

setInterval(render, 60_000);
setInterval(refresh, 30 * 60_000);

if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});

render();
refresh();
if (!settings.configured && !DEMO) showSettings();

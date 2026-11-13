import { drawKid, itemIcon, weatherIcon, skyClock, arrowIcon } from './art.js';
import { planOutfit } from './outfit.js';
import { resolveLocation, fetchForecast, dateKey, iconKind, demoDay } from './weather.js';
import { load, save, isReader } from './store.js';
import { openSettings } from './settings.js';

const LABELS = {
  tee: 'חולצה קצרה', longsleeve: 'חולצה ארוכה', sweatshirt: 'סווטשירט', coat: 'מעיל',
  shorts: 'מכנס קצר', pants: 'מכנס ארוך', sneakers: 'נעליים', sandals: 'סנדלים', boots: 'מגפיים',
  umbrella: 'מטריה', beanie: 'כובע צמר', gloves: 'כפפות', scarf: 'צעיף', cap: 'כובע',
  bottle: 'בקבוק מים', sunscreen: 'קרם הגנה',
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

function phaseName(from) {
  if (from < 11) return 'בבוקר';
  if (from < 14) return 'בצהריים';
  return 'אחר הצהריים';
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
      `<main class="kids kids-${kids.length}">${kids.map((k) => kidCard(k, planOutfit(win, k.offset || 0), kids.length)).join('')}</main>`;
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

function timeline(win, readers) {
  const cols = win.map((h) => {
    const rain = h.pop >= 30 ? `<div class="pop">💧${readers ? `<small>${h.pop}%</small>` : ''}</div>` : '<div class="pop"></div>';
    return `<div class="hour">` +
      (readers ? `<div class="hlabel">${h.hour}</div>` : '') +
      weatherIcon(iconKind(h), !h.day) +
      `<div class="tchip" style="background:${tempColor(h.feels)}">${readers ? deg(h.temp) : ''}</div>` +
      rain + `</div>`;
  }).join('');
  const grad = win.map((h, i) => `${tempColor(h.feels)} ${Math.round((i / Math.max(1, win.length - 1)) * 100)}%`).join(',');
  return `<section class="timeline" style="--grad:linear-gradient(to left, ${grad})">${cols}</section>`;
}

function kidCard(kid, plan, count) {
  if (!plan) return '';
  const reader = isReader(kid);
  const multi = plan.segments.length > 1;
  const tall = plan.segments.some((s) => s.acc.includes('umbrella'));
  let figs = '';
  plan.segments.forEach((seg, i) => {
    if (i > 0) figs += transition(plan.transitions[i - 1], kid, reader);
    const temps = seg.hours.map((h) => h.temp);
    const lo = Math.min(...temps), hi = Math.max(...temps);
    const range = `<bdi dir="ltr">${Math.round(lo) === Math.round(hi) ? deg(lo) : `${deg(lo)}–${deg(hi)}`}</bdi>`;
    const cap = multi || reader
      ? `<div class="fig-cap">${multi ? skyClock((seg.from + seg.to) / 2) : ''}${reader ? `<div class="cap-text">${multi ? `<span>${phaseName(seg.from)}</span>` : ''}<b>${range}</b></div>` : ''}</div>`
      : '';
    figs += `<div class="fig">${cap}${drawKid(kid, seg, { mood: seg.mood, bottle: plan.bottle && i === 0, tall })}</div>`;
  });

  const cards = plan.items.map((it) =>
    `<div class="card${it.bag ? ' in-bag' : ''}">${itemIcon(it.id, kid.color)}` +
    (it.bag ? `<div class="bag-badge">${itemIcon('backpack')}</div>` : '') +
    (reader ? `<div class="clabel">${LABELS[it.id] || ''}</div>` : '') + `</div>`).join('');

  const name = kid.name ? `<div class="kid-name" style="--c:${kid.color}">${esc(kid.name)}</div>` : '';
  return `<section class="kid segs-${plan.segments.length}">${name}<div class="figures">${figs}</div><div class="items">${cards}</div></section>`;
}

function transition(tr, kid, reader) {
  const mini = (ids) => ids.map((id) => `<span class="mini">${itemIcon(id, kid.color)}</span>`).join('');
  const word = (w) => (reader ? `<span class="tr-text">${w}</span>` : '');
  let inner = '';
  if (tr.off.length) inner += `<div class="move off">${mini(tr.off)}<span class="dir">⬇</span><span class="mini bag">${itemIcon('backpack')}</span>${word('להוריד לתיק')}</div>`;
  if (tr.on.length) inner += `<div class="move on"><span class="mini bag">${itemIcon('backpack')}</span><span class="dir">⬆</span>${mini(tr.on)}${word('להוציא מהתיק')}</div>`;
  return `<div class="trans">${arrowIcon()}${inner}</div>`;
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

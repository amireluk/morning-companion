import { drawKid, itemIcon, weatherIcon } from './art.js';
import { planOutfit, phasesOf, isRainy, levelIndex, LEVEL_NAMES, LEVEL_COLORS } from './outfit.js';
import { resolveLocation, fetchForecast, dateKey, iconKind, demoDay } from './weather.js';
import { load, save, isReader } from './store.js';
import { openSettings } from './settings.js';
import { computeAlerts, baselineOf } from './alerts.js';

const LABELS = {
  tee: 'חולצה קצרה', longsleeve: 'חולצה ארוכה', sweatshirt: 'סווטשירט', coat: 'מעיל',
  shorts: 'מכנס קצר', pants: 'מכנס ארוך', sneakers: 'נעליים', sandals: 'סנדלים', boots: 'מגפיים',
  umbrella: 'מטריה', beanie: 'כובע צמר', gloves: 'כפפות', scarf: 'צעיף', cap: 'כובע',
};
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo');
const DEMO_HOUR = params.has('hour') ? Number(params.get('hour')) : null;

let settings = load();
// at night the screen dims only after this long without a touch (not on opening)
const AWAKE_MS = 2 * 60_000;
const state = { loc: null, forecast: null, error: null, fetchedAt: 0, wakeUntil: Date.now() + AWAKE_MS, view: 0, viewUntil: 0 };
const VIEW_MS = 30_000; // a tapped tile shows its outfit for this long, then back to morning
const app = document.getElementById('app');

const now = () => {
  const d = new Date();
  if (DEMO_HOUR != null) d.setHours(DEMO_HOUR, 0, 0, 0);
  return d;
};

// ---------- helpers ----------
// one colour per feel level (freezing → very hot), so the chip colour, the word
// and the clothes all follow the same rules table
const levelColor = (t) => {
  const i = levelIndex(t, settings.rules), n = settings.rules.levels.length;
  return LEVEL_COLORS[Math.round((i / Math.max(1, n - 1)) * (LEVEL_COLORS.length - 1))];
};
const deg = (t) => `${Math.round(t)}°`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// name a part of the day by the hours it covers
function phaseName(from, to) {
  const mid = (from + to) / 2;
  if (mid < 11) return 'בוקר';
  if (mid < 14) return 'צהריים';
  if (mid < 18) return 'אחה״צ';
  return 'ערב';
}

// a word for how it feels outside (the level names from the rules table)
const feelWord = (t) => LEVEL_NAMES[levelIndex(t, settings.rules)];

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

// Dark outside right now? Taken from the forecast's day/night flag for this
// hour (it follows sunrise and sunset); falls back to 19:00–06:00.
function isDark(n) {
  const today = DEMO ? demoDay(DEMO) : state.forecast?.days?.[dateKey(n)];
  const h = today?.find((x) => x.hour === n.getHours());
  if (h && h.day != null) return !h.day;
  return n.getHours() >= 19 || n.getHours() < 6;
}

// ---------- render ----------
function render() {
  const n = now();
  const { tomorrow, date, key } = targetDay(n);
  const hour = n.getHours();
  const night = isDark(n);
  document.body.classList.toggle('tomorrow', tomorrow);
  document.body.classList.toggle('night', night && Date.now() > state.wakeUntil);
  manageWakeLock();

  const day = DEMO ? demoDay(DEMO) : state.forecast?.days?.[key];
  const kids = settings.kids.length ? settings.kids : [];
  const readers = kids.some(isReader);

  let body;
  if (!day) {
    body = `<div class="empty">${weatherIcon(state.error ? 'cloudy' : 'partly')}<div class="spinner"></div></div>`;
  } else {
    const win = day.filter((h) => h.hour >= settings.leaveHour && h.hour <= settings.returnHour);
    body = timeline(win, readers) + alertsRow(win, key) +
      scene(kids, planOutfit(win, 0, settings.rules), tomorrow, win);
  }
  app.innerHTML = header(tomorrow, date) + body;
  bindGear();
}

function header(tomorrow, date) {
  // the app's name is the question it answers; in the evening it's about tomorrow.
  // Under it: the day and the place, on one line.
  const locName = DEMO ? `דמו: ${DEMO}` : state.loc?.name || (state.loc ? (state.loc.source === 'default' ? 'תל אביב' : 'המיקום שלך') : '');
  const stale = state.forecast?.stale || state.error ? '<i class="stale" title="אין חיבור – מציג נתונים שמורים"></i>' : '';
  const place = locName ? `<span class="sub-sep">·</span>${stale}<span class="sub-loc">${esc(locName)}</span>` : stale;
  const badge = `<div class="day-badge${tomorrow ? ' moon' : ''}">${weatherIcon(tomorrow ? 'sunrise' : 'clear')}` +
    `<div class="titles"><h1 class="app-title">${tomorrow ? 'מה לובשים מחר?' : 'מה לובשים היום?'}</h1>` +
    `<span class="day-sub"><span>${tomorrow ? 'מחר, ' : ''}יום ${DAYS[date.getDay()]}</span>${place}</span></div></div>`;
  return `<header class="top">${badge}<button class="gear" aria-label="הגדרות"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></header>`;
}

// Three tiles: morning / noon / evening of the hours the kids are out.
function timeline(win, readers) {
  const view = currentView();
  const tiles = phasesOf(win).map((ph, i) => {
    const rainy = ph.filter((x) => isRainy(x, settings.rules));
    const h = rainy.length ? rainy.reduce((a, b) => (b.precip > a.precip ? b : a)) : ph[Math.floor(ph.length / 2)];
    let kind = iconKind(h);
    if (rainy.length) {
      // light rain draws fewer drops than heavy rain
      const mm = ph.reduce((t, x) => t + (x.precip || 0), 0);
      if (!['storm', 'snow'].includes(kind)) kind = mm >= 2 ? 'rain' : 'drizzle';
    }
    // show the coldest feels-like hour of this part of the day: that is the
    // hour the clothes are chosen for, so number, word, colour and outfit agree
    const cold = ph.reduce((a, b) => (b.feels < a.feels ? b : a));
    const feels = cold.feels;
    const pop = Math.max(...ph.map((x) => x.pop));
    const from = ph[0].hour, to = ph[ph.length - 1].hour + 1;
    return `<button type="button" class="phase${i === view ? ' on' : ''}" data-phase="${i}" aria-pressed="${i === view}">` +
      weatherIcon(kind, !h.day) +
      `<div class="ptext"><span class="pname">${phaseName(from, to)}</span>` +
      `<div class="tchip" style="background:${levelColor(feels)}"><bdi dir="ltr">${Math.round(feels)}°</bdi></div>` +
      `<span class="pfeel">${feelWord(feels)}</span>` +
      (rainy.length ? `<div class="pop">💧 ${pop}%</div>` : '') +
      `</div></button>`;
  }).join('');
  return `<section class="timeline">${tiles}</section>`;
}

// Which part of the day the scene shows: 0 = morning (what to wear when
// leaving), or a tapped tile, until it times out.
function currentView() {
  if (state.view && Date.now() > state.viewUntil) state.view = 0;
  return state.view;
}

// "שים לב" – only when there's something unusual to point out
function alertsRow(win, key) {
  // the past week (same hours) is the yardstick for "unusual"
  const days = DEMO ? null : state.forecast?.days;
  const past = days ? Object.keys(days).filter((k) => k < key).sort().slice(-7)
    .map((k) => days[k].filter((h) => h.hour >= settings.leaveHour && h.hour <= settings.returnHour)) : [];
  const alerts = computeAlerts(win, settings.rules, baselineOf(past));
  if (!alerts.length) return '';
  return `<section class="alerts" aria-label="שים לב"><b class="alerts-title">שים לב</b>` +
    alerts.map((a) => `<div class="alert">${weatherIcon(a.icon)}<span>${esc(a.text)}</span></div>`).join('') +
    `</section>`;
}

// All the kids together, dressed alike for leaving the house, with one row of
// clothing cards and one bag for what's needed later.
function scene(kids, plan, tomorrow, win) {
  if (!plan) return '';
  // tapping noon/afternoon dresses the kids for that part of the day; the
  // morning view (default) is what to put on when leaving the house
  const view = Math.min(currentView(), plan.phases.length - 1);
  const ph = view ? plan.phases[view] : null;
  const hottest = settings.rules.levels.length - 1;
  const m = ph ? { ...ph, mood: ph.cold ? 'cold' : levelIndex(ph.tMax, settings.rules) === hottest ? 'hot' : 'ok' } : plan.morning;
  const tint = kids[0]?.color;
  // size figures by age relative to the oldest kid, so siblings differ in
  // height but a kid on their own fills the scene
  const raw = (kid) => Math.max(70, Math.min(100, 70 + ((kid.age || 6) - 3) * 6));
  const tallest = Math.max(...kids.map(raw));
  const figs = kids.map((kid) => {
    const h = Math.round((raw(kid) / tallest) * 100);
    const name = kid.name ? `<div class="fig-name" style="--c:${kid.color}">${esc(kid.name)}</div>` : '';
    return `<div class="fig" style="--h:${h}"><div class="fig-art">${drawKid(kid, m, { mood: m.mood })}</div>${name}</div>`;
  }).join('');
  const card = (id) => `<div class="card">${itemIcon(id, tint)}<div class="clabel">${LABELS[id] || ''}</div></div>`;
  const worn = [m.shirt, m.bottom, m.shoes, ...m.layers, ...m.acc];
  const bag = !ph && plan.bag.length
    ? `<div class="bag"><div class="bag-title">לקחת איתך</div><div class="bag-items">${plan.bag.map(card).join('')}</div>` +
      `<div class="bag-arrow">⬇</div><div class="bag-icon">${itemIcon('backpack')}</div></div>`
    : '';
  return `<main class="scene kids-${kids.length}"><div class="scene-body"><div class="figs">${figs}</div>${bag}</div>` +
    `<div class="items">${worn.map(card).join('')}</div></main>`;
}

// ---------- settings access (long press on the gear) ----------
function bindGear() {
  app.querySelector('.gear')?.addEventListener('click', showSettings);
  app.querySelectorAll('.phase').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.phase;
    state.view = i === state.view ? 0 : i; // tapping again goes back to morning
    state.viewUntil = Date.now() + VIEW_MS;
    render();
    clearTimeout(state.viewTimer);
    if (state.view) state.viewTimer = setTimeout(render, VIEW_MS + 100);
  }));
}

function showSettings() {
  openSettings(settings, (next) => {
    settings = next;
    save(settings);
    refresh();
  });
}

// ---------- screen: always on, dimmed by an overlay at night ----------
// (releasing the wake lock at night would let Android lock the tablet, and a
// tap would then land on the lock screen instead of showing tomorrow)
let lock = null;
async function manageWakeLock() {
  if (!('wakeLock' in navigator) || lock || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch { /* not allowed right now */ }
}

// any touch keeps full brightness for a while; in the dark the screen dims
// again once nobody has touched it for AWAKE_MS
document.addEventListener('pointerdown', () => {
  state.wakeUntil = Date.now() + AWAKE_MS;
  // only lift the dimming; a full redraw here would swallow the tap
  document.body.classList.remove('night');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  state.wakeUntil = Date.now() + AWAKE_MS; // reopened: start bright
  if (Date.now() - state.fetchedAt > 15 * 60_000) refresh(); else render();
});

setInterval(render, 60_000);
setInterval(refresh, 30 * 60_000);

if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});

render();
refresh();

// Location + forecast (Open-Meteo, free, no API key) with an offline cache,
// plus synthetic demo days for trying the app without network.

export const TEL_AVIV = { name: 'תל אביב', lat: 32.0853, lon: 34.7818 };

const CACHE_KEY = 'mc.forecast';
const POS_KEY = 'mc.lastPosition';

export function getPosition(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 6 * 3600 * 1000 },
    );
  });
}

// Resolve where we are: manual choice, detected position, last known, or Tel Aviv.
export async function resolveLocation(loc) {
  if (loc?.mode === 'manual' && loc.lat != null) return { ...loc, source: 'manual' };
  const pos = await getPosition();
  if (pos) {
    const last = readJSON(POS_KEY);
    let name = last && near(last, pos) ? last.name : null;
    if (!name) name = await reverseName(pos).catch(() => null);
    const res = { ...pos, name: name || '', source: 'auto' };
    writeJSON(POS_KEY, res);
    return res;
  }
  const last = readJSON(POS_KEY);
  if (last) return { ...last, source: 'last' };
  return { ...TEL_AVIV, source: 'default' };
}

const near = (a, b) => Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lon - b.lon) < 0.05;

async function reverseName({ lat, lon }) {
  const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=he`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.city || j.locality || null;
}

export async function searchCity(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=he&format=json`);
  if (!r.ok) throw new Error('search failed');
  const j = await r.json();
  return (j.results || []).map((x) => ({
    name: x.name,
    detail: [x.admin1, x.country].filter(Boolean).join(', '),
    lat: x.latitude,
    lon: x.longitude,
  }));
}

const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,is_day';

export async function fetchForecast({ lat, lon }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&hourly=${HOURLY}&timezone=auto&forecast_days=3`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const days = parse(await r.json());
    writeJSON(CACHE_KEY, { lat, lon, at: Date.now(), days });
    return { days, at: Date.now(), stale: false };
  } catch (e) {
    const c = readJSON(CACHE_KEY);
    if (c && near(c, { lat, lon })) return { days: c.days, at: c.at, stale: true };
    throw e;
  }
}

// → { 'YYYY-MM-DD': [ {hour, temp, feels, pop, precip, code, wind, uv, day} ] }
function parse(j) {
  const h = j.hourly, out = {};
  h.time.forEach((t, i) => {
    const [date, hm] = t.split('T');
    (out[date] ||= []).push({
      hour: parseInt(hm, 10),
      temp: h.temperature_2m[i],
      feels: h.apparent_temperature[i] ?? h.temperature_2m[i],
      pop: h.precipitation_probability[i] ?? 0,
      precip: h.precipitation[i] ?? 0,
      code: h.weather_code[i] ?? 0,
      wind: h.wind_speed_10m[i] ?? 0,
      uv: h.uv_index[i] ?? 0,
      day: h.is_day[i] ?? 1,
    });
  });
  return out;
}

export function dateKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// WMO weather code (+wind) → icon name
export function iconKind(h) {
  const c = h.code;
  if (c >= 95) return 'storm';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if (c >= 51 && c <= 57) return 'drizzle';
  if (c === 45 || c === 48) return 'fog';
  if (h.wind >= 35) return 'wind';
  if (c === 3) return 'cloudy';
  if (c === 1 || c === 2) return 'partly';
  return 'clear';
}

// ---------- demo days ----------
// Each scenario: hourly feels-like curve (index = hour) + rain/codes.
const DEMOS = {
  hot: { lo: 25, hi: 33, code: 0, uv: 9 },
  warm: { lo: 19, hi: 26, code: 1, uv: 7 },
  layers: { lo: 9, hi: 22, code: 1, uv: 5 },
  mild: { lo: 16, hi: 21, code: 2, uv: 4 },
  cool: { lo: 11, hi: 16, code: 3, uv: 2 },
  rain: { lo: 10, hi: 14, code: 63, pop: 90, precip: 3, uv: 1 },
  pmrain: { lo: 13, hi: 19, code: 2, uv: 3, rainFrom: 14 },
  cold: { lo: 2, hi: 9, code: 3, uv: 1 },
};
export const DEMO_NAMES = Object.keys(DEMOS);

// rain: optional override – 'none' | 'pm' (from 14:00) | 'all'
export function demoDay(name, rain) {
  const d = { ...(DEMOS[name] || DEMOS.layers) };
  if (rain === 'none') { delete d.pop; delete d.rainFrom; if (d.code >= 51) d.code = 3; }
  if (rain === 'pm') { delete d.pop; d.rainFrom = 14; if (d.code >= 51) d.code = 2; }
  if (rain === 'all') { delete d.rainFrom; d.pop = 90; d.precip = 3; d.code = 63; }
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    // coldest ~6:00, warmest ~14:00
    const x = Math.cos(((hour - 14) / 24) * 2 * Math.PI);
    const k = hour >= 6 && hour <= 14 ? (1 - Math.cos(((hour - 6) / 8) * Math.PI)) / 2 : (x + 1) / 2;
    const feels = Math.round((d.lo + (d.hi - d.lo) * k) * 10) / 10;
    const raining = d.pop || (d.rainFrom && hour >= d.rainFrom);
    hours.push({
      hour, temp: feels, feels,
      pop: raining ? (d.pop || 80) : 5,
      precip: raining ? (d.precip || 1) : 0,
      code: raining ? (d.rainFrom ? 61 : d.code) : d.code,
      wind: 10,
      uv: hour >= 9 && hour <= 15 ? d.uv : 1,
      day: hour >= 6 && hour < 18 ? 1 : 0,
    });
  }
  return hours;
}

function readJSON(k) {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
}
function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

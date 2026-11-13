import { searchCity } from './weather.js';
import { newKid, MAX_KIDS } from './store.js';
import { SKINS, HAIRS, SHIRT_COLORS, drawKid, hairStyleOf, itemIcon } from './art.js';
import { LEVEL_NAMES, LEVEL_COLORS, defaultRules, normalizeRules } from './outfit.js';

const hourOpts = (sel, from, to) => {
  let s = '';
  for (let h = from; h <= to; h++) s += `<option value="${h}"${h === sel ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`;
  return s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PREVIEW = { shirt: 'tee', bottom: 'pants', shoes: 'sneakers', layers: [], acc: [] };

export function openSettings(current, onSave) {
  const s = structuredClone(current);
  s.rules = normalizeRules(s.rules);
  const dlg = document.createElement('div');
  dlg.className = 'settings';
  document.body.appendChild(dlg);

  const close = () => dlg.remove();

  function kidHtml(k, i) {
    const swatches = (arr, sel, field) => arr.map((c, j) =>
      `<button type="button" class="sw${(field === 'color' ? c === sel : j === sel) ? ' on' : ''}" style="background:${c}" data-k="${i}" data-f="${field}" data-v="${field === 'color' ? c : j}"></button>`).join('');
    return `<div class="kid-edit">
      <div class="kid-prev">${drawKid(k, PREVIEW)}</div>
      <div class="kid-fields">
        <label>שם <input data-k="${i}" data-f="name" value="${esc(k.name)}" placeholder="לא חובה"></label>
        <label>גיל <input type="number" min="2" max="14" data-k="${i}" data-f="age" value="${k.age}"></label>
        <div class="row">
          <button type="button" class="pill${k.look === 'boy' ? ' on' : ''}" data-k="${i}" data-f="look" data-v="boy">ילד</button>
          <button type="button" class="pill${k.look === 'girl' ? ' on' : ''}" data-k="${i}" data-f="look" data-v="girl">ילדה</button>
        </div>
        <div class="row"><span>תסרוקת</span>${[['short', 'קצר'], ['curly', 'תלתלים'], ['long', 'ארוך']].map(([v, t]) =>
          `<button type="button" class="pill${hairStyleOf(k) === v ? ' on' : ''}" data-k="${i}" data-f="hairStyle" data-v="${v}">${t}</button>`).join('')}</div>
        <div class="row"><span>עור</span>${swatches(SKINS, k.skin, 'skin')}</div>
        <div class="row"><span>שיער</span>${swatches(HAIRS, k.hair, 'hair')}</div>
        <div class="row"><span>חולצה</span>${swatches(SHIRT_COLORS, k.color, 'color')}</div>
        ${s.kids.length > 1 ? `<button type="button" class="remove" data-remove="${i}">הסרה</button>` : ''}
      </div></div>`;
  }

  // "temperatures and clothes": one row per feel level; tapping a row opens it
  // to edit its upper bound (stepper) and what to wear (icon toggles)
  const TINT = '#7ec8e3';
  const deg = (t) => `<bdi dir="ltr">${t}°</bdi>`;
  const rangeText = (R, i) => {
    const last = R.levels.length - 1, lo = i ? R.levels[i - 1].max : null;
    return i === 0 ? `מתחת ל־${deg(R.levels[0].max)}` : i === last ? `מ־${deg(lo)} ומעלה` : `<bdi dir="ltr">${lo}°–${R.levels[i].max}°</bdi>`;
  };
  const wearIcons = (l) => [l.shirt === 'tee' ? 'tee' : 'longsleeve', l.bottom, l.shoes,
    ...(l.sweatshirt ? ['sweatshirt'] : []), ...(l.coat ? ['coat'] : []), ...(l.winter ? ['beanie'] : []), ...(l.cap ? ['cap'] : [])];
  const seg = (attrs, opts, v) => `<div class="seg">${opts.map(([o, t, ic]) =>
    `<button type="button" class="seg-b${o === v ? ' on' : ''}" aria-pressed="${o === v}" ${attrs} data-v="${o}">${ic ? `<span class="seg-ic">${itemIcon(ic, TINT)}</span>` : ''}<span>${t}</span></button>`).join('')}</div>`;
  const stepper = (attrs, value, min, max, unit) =>
    `<div class="stepper"><button type="button" class="step" ${attrs} data-step="1" aria-label="יותר"${value >= max ? ' disabled' : ''}>+</button>` +
    `<span class="step-v"><bdi dir="ltr">${value}${unit}</bdi></span>` +
    `<button type="button" class="step" ${attrs} data-step="-1" aria-label="פחות"${value <= min ? ' disabled' : ''}>−</button></div>`;
  const boundsOf = (R, i) => ({ min: i ? R.levels[i - 1].max + 1 : -20, max: i < R.levels.length - 2 ? R.levels[i + 1].max - 1 : 50 });

  function levelBody(R, i) {
    const l = R.levels[i], last = R.levels.length - 1;
    const a = `data-lv="${i}"`;
    const bound = i === last
      ? `<div class="lv-line"><span class="lv-lab">טמפרטורה</span><span>${rangeText(R, i)}</span></div>`
      : (() => { const b = boundsOf(R, i); return `<div class="lv-line"><span class="lv-lab">עד</span>${stepper(`${a} data-lf="max"`, l.max, b.min, b.max, '°')}</div>`; })();
    const chip = (f, ic, t) => `<button type="button" class="chip${l[f] ? ' on' : ''}" aria-pressed="${!!l[f]}" ${a} data-lf="${f}" data-toggle="1"><span class="seg-ic">${itemIcon(ic, TINT)}</span><span>${t}</span></button>`;
    return `<div class="lv-body">${bound}
      <div class="lv-line"><span class="lv-lab">חולצה</span>${seg(`${a} data-lf="shirt"`, [['long', 'ארוכה', 'longsleeve'], ['tee', 'קצרה', 'tee']], l.shirt)}</div>
      <div class="lv-line"><span class="lv-lab">מכנס</span>${seg(`${a} data-lf="bottom"`, [['pants', 'ארוך', 'pants'], ['shorts', 'קצר', 'shorts']], l.bottom)}</div>
      <div class="lv-line"><span class="lv-lab">נעליים</span>${seg(`${a} data-lf="shoes"`, [['sneakers', 'נעליים', 'sneakers'], ['sandals', 'סנדלים', 'sandals']], l.shoes)}</div>
      <div class="lv-line lv-top"><span class="lv-lab">גם</span><div class="chips">${chip('sweatshirt', 'sweatshirt', 'סווטשירט')}${chip('coat', 'coat', 'מעיל')}${chip('winter', 'beanie', 'כובע צמר, צעיף וכפפות')}${chip('cap', 'cap', 'כובע שמש')}</div></div>
    </div>`;
  }

  function rulesHtml() {
    const R = s.rules;
    const ruler = R.levels.map((l, i) =>
      `<div class="rl" style="background:${LEVEL_COLORS[i]}" title="${LEVEL_NAMES[i]}"></div>${i < R.levels.length - 1 ? `<div class="rl-b">${deg(l.max)}</div>` : ''}`).join('');
    const rows = R.levels.map((l, i) => {
      const open = openLv === i;
      return `<div class="lv${open ? ' open' : ''}" style="--c:${LEVEL_COLORS[i]}">
        <button type="button" class="lv-head" data-open="${i}" aria-expanded="${open}">
          <span class="lv-dot"></span><span class="lv-name">${LEVEL_NAMES[i]}</span><span class="lv-rng">${rangeText(R, i)}</span>
          <svg class="lv-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="lv-icons">${wearIcons(l).map((ic) => itemIcon(ic, TINT)).join('')}</span>
        </button>${open ? levelBody(R, i) : ''}</div>`;
    }).join('');
    return `<fieldset><legend>טמפרטורות ובגדים</legend>
      <div class="hint">לפי הטמפרטורה המורגשת. לחיצה על שורה פותחת אותה לעריכה.</div>
      <div class="ruler">${ruler}</div>
      <div class="levels">${rows}</div>
      <div class="hint">חולצה, מכנס ונעליים – לפי השעה החמה ביום. סווטשירט, מעיל ובגדי חורף – לפי השעה הקרה. מה שצריך רק בהמשך היום מופיע ב"לקחת איתך".</div>
    </fieldset>
    <fieldset><legend>גשם</legend>
      <div class="lv-line stack"><span class="lv-lab">מטריה כשסיכוי הגשם לפחות</span>${stepper('data-rain="chance"', R.rain.chance, 10, 100, '%')}</div>
      <div class="lv-line stack"><span class="lv-lab">מגפיים</span>${seg('data-rain="boots"', [['never', 'אף פעם'], ['heavy', 'בגשם חזק'], ['any', 'בכל גשם']], R.rain.boots)}</div>
      <button type="button" class="reset-rules">החזרת ברירת המחדל</button>
    </fieldset>`;
  }

  let tab = 'kids';
  let openLv = -1; // which feel level is open for editing
  // names are typed into inputs that a redraw replaces: copy them first
  const syncNames = () => dlg.querySelectorAll('input[data-f="name"]').forEach((el) => { s.kids[+el.dataset.k].name = el.value.trim(); });

  function draw() {
    const L = s.location;
    // redrawing the form must not jump the panel back to the top
    const scroll = dlg.querySelector('.panel')?.scrollTop || 0;
    const kidsTab = `<fieldset><legend>ילדים</legend>
        ${s.kids.map(kidHtml).join('')}
        ${s.kids.length < MAX_KIDS ? '<button type="button" class="add">+ הוספת ילד/ה</button>' : ''}
      </fieldset>`;
    const generalTab = `<fieldset><legend>מיקום</legend>
        <div class="row">
          <button type="button" class="pill${L.mode === 'auto' ? ' on' : ''}" data-loc="auto">זיהוי אוטומטי</button>
          <button type="button" class="pill${L.mode === 'manual' ? ' on' : ''}" data-loc="manual">בחירת עיר</button>
        </div>
        ${L.mode === 'auto'
          ? ''
          : `<div class="hint">נבחר: <b>${esc(L.name)}</b></div>
             <input id="cityq" class="cityq" type="search" enterkeyhint="search" autocomplete="off" placeholder="הקלידו שם של עיר או יישוב…">
             <div id="cityres" class="cityres"></div>`}
      </fieldset>
      <fieldset><legend>שעות</legend>
        <div class="hint">הבגדים מותאמים לשעות שהילדים מחוץ לבית. את הזמן הזה מחלקים לבוקר, צהריים ואחה״צ.</div>
        <label>יוצאים מהבית <select data-f="leaveHour">${hourOpts(s.leaveHour, 5, 12)}</select></label>
        <label>חוזרים הביתה <select data-f="returnHour">${hourOpts(s.returnHour, 10, 20)}</select></label>
        <label>מאיזו שעה להציג את מחר <select data-f="switchHour">${hourOpts(s.switchHour, 12, 23)}</select></label>
      </fieldset>
      ${rulesHtml()}`;
    dlg.innerHTML = `<form class="panel">
      <h2>הגדרות</h2>
      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab${tab === 'kids' ? ' on' : ''}" aria-selected="${tab === 'kids'}" data-tab="kids">ילדים</button>
        <button type="button" role="tab" class="tab${tab === 'general' ? ' on' : ''}" aria-selected="${tab === 'general'}" data-tab="general">מזג אוויר ושעות</button>
      </div>
      ${tab === 'kids' ? kidsTab : generalTab}
      <div class="actions"><button type="submit" class="save">שמירה</button><button type="button" class="cancel">ביטול</button></div>
    </form>`;
    dlg.querySelector('.panel').scrollTop = scroll;
  }

  dlg.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('cancel')) return close();
    if (b.dataset.tab) {
      syncNames();
      tab = b.dataset.tab;
      draw();
      dlg.querySelector('.panel').scrollTop = 0; // a new tab starts at its top
      return;
    }
    if (b.classList.contains('reset-rules')) {
      if (confirm('להחזיר את הטמפרטורות והבגדים לברירת המחדל?')) { s.rules = defaultRules(); openLv = -1; draw(); }
      return;
    }
    if (b.dataset.open != null) { openLv = openLv === +b.dataset.open ? -1 : +b.dataset.open; draw(); return revealOpen(); }
    if (b.dataset.lv != null) {
      const i = +b.dataset.lv, l = s.rules.levels[i], f = b.dataset.lf;
      if (b.dataset.step) {
        const { min, max } = boundsOf(s.rules, i);
        l.max = Math.max(min, Math.min(max, l.max + Number(b.dataset.step)));
      } else if (b.dataset.toggle) l[f] = !l[f];
      else l[f] = b.dataset.v;
      return draw();
    }
    if (b.dataset.rain) {
      const R = s.rules.rain;
      if (b.dataset.step) R.chance = Math.max(10, Math.min(100, R.chance + 10 * Number(b.dataset.step)));
      else R.boots = b.dataset.v;
      return draw();
    }
    if (b.classList.contains('add')) { s.kids.push(newKid(s.kids.length)); return draw(); }
    if (b.dataset.remove != null) { s.kids.splice(+b.dataset.remove, 1); return draw(); }
    if (b.dataset.loc) {
      s.location = b.dataset.loc === 'auto' ? { ...s.location, mode: 'auto' } : { ...s.location, mode: 'manual' };
      return draw();
    }
    if (b.dataset.city) {
      const c = JSON.parse(b.dataset.city);
      s.location = { mode: 'manual', name: c.name, lat: c.lat, lon: c.lon };
      return draw();
    }
    if (b.dataset.k != null && b.dataset.f) {
      const k = s.kids[+b.dataset.k], f = b.dataset.f;
      k[f] = f === 'skin' || f === 'hair' ? +b.dataset.v : b.dataset.v;
      draw();
    }
  });

  dlg.addEventListener('change', (e) => {
    const el = e.target;
    const f = el.dataset.f;
    if (!f) return;
    if (el.dataset.k != null) {
      const k = s.kids[+el.dataset.k];
      k[f] = f === 'name' ? el.value.trim() : Number(el.value);
      if (f === 'age') { // refresh this kid's preview only (see openWelcome)
        const prev = dlg.querySelectorAll('.kid-edit .kid-prev')[+el.dataset.k];
        if (prev) prev.innerHTML = drawKid(k, PREVIEW);
      }
    } else {
      s[f] = Number(el.value);
    }
  });

  // city type-ahead: the list narrows as you type
  let searchTimer = 0;
  dlg.addEventListener('input', (e) => {
    if (e.target.id !== 'cityq') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 250);
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.id === 'cityq' && e.key === 'Enter') {
      e.preventDefault();
      dlg.querySelector('.cityres .city')?.click(); // Enter picks the top match
    }
  });

  dlg.addEventListener('submit', (e) => {
    e.preventDefault();
    syncNames();
    if (s.returnHour <= s.leaveHour) s.returnHour = s.leaveHour + 1;
    s.rules = normalizeRules(s.rules);
    close();
    onSave(s);
  });

  // keep a freshly opened level in view (the footer covers the bottom)
  function revealOpen() {
    const el = dlg.querySelector('.lv.open');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  let searchSeq = 0;
  async function doSearch() {
    const q = dlg.querySelector('#cityq')?.value.trim() || '';
    const out = dlg.querySelector('#cityres');
    if (!out) return;
    const seq = ++searchSeq;
    if (q.length < 2) { out.innerHTML = ''; return; }
    out.innerHTML = '<div class="city-msg">…</div>';
    try {
      const res = await searchCity(q);
      if (seq !== searchSeq) return; // a newer search is on its way
      out.innerHTML = res.length
        ? res.map((c) => `<button type="button" class="city" data-city='${esc(JSON.stringify(c))}'><b>${esc(c.name)}</b> <small>${esc(c.detail)}</small></button>`).join('')
        : `<div class="city-msg">${q.length < 3 ? 'המשיכו להקליד…' : 'לא נמצא'}</div>`;
    } catch {
      if (seq === searchSeq) out.innerHTML = '<div class="city-msg">אין חיבור לאינטרנט</div>';
    }
  }

  draw();
}

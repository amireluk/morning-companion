import { searchCity } from './weather.js';
import { newKid, MAX_KIDS } from './store.js';
import { SKINS, HAIRS, SHIRT_COLORS, drawKid, hairStyleOf, itemIcon } from './art.js';
import { LEVEL_NAMES, defaultRules, normalizeRules } from './outfit.js';

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

  // the editable "temperatures and clothes" table
  function rulesHtml() {
    const R = s.rules, last = R.levels.length - 1;
    const sel = (i, f, opts, v) => `<select data-lv="${i}" data-lf="${f}">${opts.map(([o, t]) => `<option value="${o}"${o === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    const chk = (i, f, v) => `<input type="checkbox" data-lv="${i}" data-lf="${f}"${v ? ' checked' : ''}>`;
    const head = (icon, t) => `<th><span class="th-ic">${itemIcon(icon, '#7ec8e3')}</span>${t}</th>`;
    const rows = R.levels.map((l, i) => {
      const lo = i === 0 ? null : R.levels[i - 1].max;
      const range = i === last
        ? `מ־<bdi dir="ltr">${lo}°</bdi>`
        : `${i === 0 ? 'מתחת ל־' : `<bdi dir="ltr">${lo}°</bdi> עד`} <input type="number" data-lv="${i}" data-lf="max" value="${l.max}">°`;
      return `<tr><th class="lvl">${LEVEL_NAMES[i]}</th><td class="rng">${range}</td>` +
        `<td>${sel(i, 'shirt', [['long', 'ארוכה'], ['tee', 'קצרה']], l.shirt)}</td>` +
        `<td>${sel(i, 'bottom', [['pants', 'ארוך'], ['shorts', 'קצר']], l.bottom)}</td>` +
        `<td>${sel(i, 'shoes', [['sneakers', 'נעליים'], ['sandals', 'סנדלים']], l.shoes)}</td>` +
        `<td>${chk(i, 'sweatshirt', l.sweatshirt)}</td><td>${chk(i, 'coat', l.coat)}</td><td>${chk(i, 'winter', l.winter)}</td>` +
        `<td>${chk(i, 'cap', l.cap)}</td></tr>`;
    }).join('');
    return `<fieldset><legend>טמפרטורות ובגדים</legend>
      <div class="hint">לפי הטמפרטורה המורגשת. אפשר לשנות את הגבולות ואת מה לובשים בכל טווח.</div>
      <div class="rules-wrap"><table class="rules">
        <thead><tr><th>תחושה</th><th>טמפ׳</th>${head('tee', 'חולצה')}${head('pants', 'מכנס')}${head('sneakers', 'נעליים')}${head('sweatshirt', 'סווטשירט')}${head('coat', 'מעיל')}${head('beanie', 'כובע צמר, צעיף, כפפות')}${head('cap', 'כובע שמש')}</tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="hint">חולצה, מכנס ונעליים – לפי השעה החמה ביום. סווטשירט, מעיל ובגדי חורף – לפי השעה הקרה. מה שצריך רק בהמשך היום מופיע ב"לקחת איתך".</div>
      <label>מטריה כשסיכוי הגשם לפחות <span><input type="number" min="0" max="100" data-rain="chance" value="${R.rain.chance}"> %</span></label>
      <label>מגפיי גשם <select data-rain="boots">${[['heavy', 'רק בגשם חזק'], ['any', 'בכל גשם'], ['never', 'אף פעם']].map(([v, t]) => `<option value="${v}"${R.rain.boots === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <button type="button" class="reset-rules">החזרת ברירת המחדל</button>
    </fieldset>`;
  }

  let tab = 'kids';
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
             <div class="row"><input id="cityq" type="search" enterkeyhint="search" autocomplete="off" placeholder="חיפוש עיר…"><button type="button" id="citygo">חיפוש</button></div>
             <div id="cityres"></div>`}
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
    if (b.classList.contains('reset-rules')) { s.rules = defaultRules(); return draw(); }
    if (b.classList.contains('add')) { s.kids.push(newKid(s.kids.length)); return draw(); }
    if (b.dataset.remove != null) { s.kids.splice(+b.dataset.remove, 1); return draw(); }
    if (b.dataset.loc) {
      s.location = b.dataset.loc === 'auto' ? { ...s.location, mode: 'auto' } : { ...s.location, mode: 'manual' };
      return draw();
    }
    if (b.id === 'citygo') return doSearch();
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
    if (el.dataset.lv != null) {
      const lvl = s.rules.levels[+el.dataset.lv], lf = el.dataset.lf;
      lvl[lf] = el.type === 'checkbox' ? el.checked : lf === 'max' ? Number(el.value) : el.value;
      if (lf === 'max') { // the next row's range label follows
        const next = dlg.querySelectorAll('.rules td.rng bdi')[+el.dataset.lv];
        if (next) next.textContent = `${lvl.max}°`;
      }
      return;
    }
    if (el.dataset.rain) { s.rules.rain[el.dataset.rain] = el.dataset.rain === 'boots' ? el.value : Number(el.value); return; }
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

  dlg.addEventListener('keydown', (e) => {
    if (e.target.id === 'cityq' && e.key === 'Enter') { e.preventDefault(); doSearch(); }
  });

  dlg.addEventListener('submit', (e) => {
    e.preventDefault();
    syncNames();
    if (s.returnHour <= s.leaveHour) s.returnHour = s.leaveHour + 1;
    s.rules = normalizeRules(s.rules);
    close();
    onSave(s);
  });

  async function doSearch() {
    const q = dlg.querySelector('#cityq').value.trim();
    const out = dlg.querySelector('#cityres');
    if (!q) return;
    out.textContent = '…';
    try {
      const res = await searchCity(q);
      out.innerHTML = res.length
        ? res.map((c) => `<button type="button" class="city" data-city='${esc(JSON.stringify(c))}'>${esc(c.name)} <small>${esc(c.detail)}</small></button>`).join('')
        : 'לא נמצא';
    } catch {
      out.textContent = 'אין חיבור לאינטרנט';
    }
  }

  draw();
}

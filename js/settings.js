import { searchCity, TEL_AVIV } from './weather.js';
import { newKid } from './store.js';
import { SKINS, HAIRS, SHIRT_COLORS, drawKid, hairStyleOf } from './art.js';

const hourOpts = (sel, from, to) => {
  let s = '';
  for (let h = from; h <= to; h++) s += `<option value="${h}"${h === sel ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`;
  return s;
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PREVIEW = { shirt: 'tee', bottom: 'pants', shoes: 'sneakers', layers: [], acc: [] };
const OFFSETS = [[-4, 'תמיד קר לו ❄️❄️'], [-2, 'קצת קר לו ❄️'], [0, 'רגיל'], [2, 'קצת חם לו 🔥'], [4, 'תמיד חם לו 🔥🔥']];

export function openSettings(current, onSave) {
  const s = structuredClone(current);
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
        <div class="hint">${k.age >= 7 ? 'יוצגו גם מילים ומספרים' : 'רק ציורים, בלי טקסט'}</div>
        <div class="row">
          <button type="button" class="pill${k.look === 'boy' ? ' on' : ''}" data-k="${i}" data-f="look" data-v="boy">ילד</button>
          <button type="button" class="pill${k.look === 'girl' ? ' on' : ''}" data-k="${i}" data-f="look" data-v="girl">ילדה</button>
        </div>
        <div class="row"><span>תסרוקת</span>${[['short', 'קצר'], ['curly', 'תלתלים'], ['long', 'ארוך']].map(([v, t]) =>
          `<button type="button" class="pill${hairStyleOf(k) === v ? ' on' : ''}" data-k="${i}" data-f="hairStyle" data-v="${v}">${t}</button>`).join('')}</div>
        <div class="row"><span>עור</span>${swatches(SKINS, k.skin, 'skin')}</div>
        <div class="row"><span>שיער</span>${swatches(HAIRS, k.hair, 'hair')}</div>
        <div class="row"><span>חולצה</span>${swatches(SHIRT_COLORS, k.color, 'color')}</div>
        <label>מרגיש/ה
          <select data-k="${i}" data-f="offset">${OFFSETS.map(([v, t]) => `<option value="${v}"${v === (k.offset || 0) ? ' selected' : ''}>${t}</option>`).join('')}</select>
        </label>
        ${s.kids.length > 1 ? `<button type="button" class="remove" data-remove="${i}">הסרה</button>` : ''}
      </div></div>`;
  }

  function draw() {
    const L = s.location;
    dlg.innerHTML = `<form class="panel">
      <h2>הגדרות</h2>
      <fieldset><legend>מיקום</legend>
        <div class="row">
          <button type="button" class="pill${L.mode === 'auto' ? ' on' : ''}" data-loc="auto">זיהוי אוטומטי</button>
          <button type="button" class="pill${L.mode === 'manual' ? ' on' : ''}" data-loc="manual">בחירת עיר</button>
        </div>
        ${L.mode === 'auto'
          ? `<div class="hint">אם הזיהוי לא יעבוד – ${esc(TEL_AVIV.name)}</div>`
          : `<div class="hint">נבחר: <b>${esc(L.name)}</b></div>
             <div class="row"><input id="cityq" placeholder="חיפוש עיר…"><button type="button" id="citygo">חיפוש</button></div>
             <div id="cityres"></div>`}
      </fieldset>
      <fieldset><legend>שעות</legend>
        <label>יוצאים מהבית <select data-f="leaveHour">${hourOpts(s.leaveHour, 5, 12)}</select></label>
        <label>חוזרים הביתה <select data-f="returnHour">${hourOpts(s.returnHour, 10, 20)}</select></label>
        <label>מאיזו שעה להציג את מחר <select data-f="switchHour">${hourOpts(s.switchHour, 12, 23)}</select></label>
        <label>מסך כהה בלילה, מ־ <select data-f="nightStart">${hourOpts(s.nightStart, 18, 23)}</select></label>
        <label>עד <select data-f="nightEnd">${hourOpts(s.nightEnd, 3, 8)}</select></label>
      </fieldset>
      <fieldset><legend>ילדים</legend>
        ${s.kids.map(kidHtml).join('')}
        ${s.kids.length < 4 ? '<button type="button" class="add">+ הוספת ילד/ה</button>' : ''}
      </fieldset>
      <div class="actions"><button type="submit" class="save">שמירה</button><button type="button" class="cancel">ביטול</button></div>
    </form>`;
  }

  dlg.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('cancel')) return close();
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
    const el = e.target, f = el.dataset.f;
    if (!f) return;
    if (el.dataset.k != null) {
      const k = s.kids[+el.dataset.k];
      k[f] = f === 'name' ? el.value.trim() : Number(el.value);
      if (f === 'age') draw();
    } else {
      s[f] = Number(el.value);
    }
  });

  dlg.addEventListener('keydown', (e) => {
    if (e.target.id === 'cityq' && e.key === 'Enter') { e.preventDefault(); doSearch(); }
  });

  dlg.addEventListener('submit', (e) => {
    e.preventDefault();
    dlg.querySelectorAll('input[data-f="name"]').forEach((el) => { s.kids[+el.dataset.k].name = el.value.trim(); });
    if (s.returnHour <= s.leaveHour) s.returnHour = s.leaveHour + 1;
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

"""Build a single-file demo of the app with a weather switcher (sample data only).

Usage: python3 tools/build_demo.py [artifact-out.html]
Always writes demo.html (a full page) at the repo root; with an argument it also
writes a body-only copy for publishing as a claude.ai artifact.
The demo keeps its settings under its own storage key, so opening it never
touches the real app's settings on the same site.
"""
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
out = sys.argv[1] if len(sys.argv) > 1 else None
def mod(name, extra=lambda s: s):
    s = open(root + 'js/' + name).read()
    s = re.sub(r"^import .*?;\n", "", s, flags=re.M)
    s = re.sub(r"^export ", "", s, flags=re.M)
    return extra(s)
art = mod('art.js'); outfit = mod('outfit.js'); alerts = mod('alerts.js'); weather = mod('weather.js'); store = mod('store.js', lambda s: s.replace("'mc.settings'", "'mc.demo.settings'"))
settings = mod('settings.js', lambda s: re.sub(r"\besc\(", "escS(", s).replace("const esc = ", "const escS = "))
def app_fix(s):
    s = s.replace("const params = new URLSearchParams(location.search);\nconst DEMO = params.get('demo');\nconst DEMO_HOUR = params.has('hour') ? Number(params.get('hour')) : null;",
                  "let DEMO = 'layers';\nlet DEMO_HOUR = 8;\nlet DEMO_LABEL = '';\nlet DEMO_RAIN = 'none';\nlet DEMO_DAY = null;")
    s = s.replace("const locName = DEMO ? `דמו: ${DEMO}` : state.loc?.name || '';", "const locName = DEMO ? `נתוני דוגמה · ${DEMO_LABEL}` : state.loc?.name || '';")
    s = s.replace("if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});\n", "")
    s = s.replace("render();\nrefresh();", "window.__demo = { set(d, h, label, kids) { DEMO = d; DEMO_HOUR = h; DEMO_LABEL = label; if (kids) settings = { ...settings, kids }; render(); }, get kids() { return settings.kids; } };\n")
    s = s.replace('demoDay(DEMO)', '(DEMO_DAY || demoDay(DEMO, DEMO_RAIN))')
    s = s.replace('set(d, h, label, kids) { DEMO = d;', 'set(d, h, label, kids, rain, day) { DEMO_DAY = day || null; DEMO_RAIN = rain; DEMO = d;')
    return s
app = mod('app.js', app_fix)
css = open(root + 'style.css').read()
css = css.replace("#app {\n  height: 100vh;\n  height: 100dvh;", "#app {\n  flex: 1;\n  min-height: 0;")
js = "\n".join([art, outfit, alerts, weather, store, settings, app])
assert "esc(" not in settings
html = f'''<title>מה לובשים היום?</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&display=swap" rel="stylesheet">
<style>
{css}
/* ---- demo wrapper (single-look storybook page; day = paper, "tomorrow" = night sky) ---- */
:root {{ --bar: #fffaf0; --bar-ink: #5b4634; --chip: #ffffff; --chip-on: #f08a4b; }}
html, body {{ height: 100%; }}
html {{ background: #fff4e0; }}
body {{ display: flex; flex-direction: column; background-color: #fff4e0; color: var(--ink); direction: rtl; }}
.demo-bar {{
  flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px;
  padding-block: 8px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  background: var(--bar); color: var(--bar-ink); border-bottom: 2px solid #ecd9b8; font-size: 14px;
}}
.demo-bar b {{ font-weight: 700; }}
.demo-rows {{ display: flex; flex-direction: column; gap: 6px; min-width: 0; }}
.demo-line {{ display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; }}
.demo-half {{ min-width: 3.2em; }}
.demo-group {{ display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }}
.demo-group span {{ color: #9c8468; margin-inline-end: 2px; }}
.demo-bar button {{
  font: inherit; font-size: 14px; padding: 4px 10px; border-radius: 99px; cursor: pointer;
  border: 2px solid #ecd9b8; background: var(--chip); color: var(--bar-ink);
}}
.demo-bar button[aria-pressed="true"] {{ background: var(--chip-on); border-color: var(--chip-on); color: #fff; }}
.demo-bar button:focus-visible {{ outline: 3px solid #3d8fe0; outline-offset: 2px; }}
#app {{ padding-left: max(1.6vw, env(safe-area-inset-left, 0px)); padding-right: max(1.6vw, env(safe-area-inset-right, 0px)); }}
@media (max-width: 700px) {{ .demo-bar {{ font-size: 13px; }} html, body {{ overflow: auto; height: auto; min-height: 100%; }} #app {{ flex: none; }} }}
</style>
<div class="demo-bar" id="demo-bar">
  <b>תצוגת דמו</b>
  <div class="demo-rows">
    <div class="demo-line"><b class="demo-half">בוקר</b><div class="demo-group" id="g-mt"><span>טמפ׳:</span></div><div class="demo-group" id="g-mr"><span>גשם:</span></div></div>
    <div class="demo-line"><b class="demo-half">אחה״צ</b><div class="demo-group" id="g-at"><span>טמפ׳:</span></div><div class="demo-group" id="g-ar"><span>גשם:</span></div></div>
    <div class="demo-line"><b class="demo-half">רוח</b><div class="demo-group" id="g-wd"></div></div>
  </div>
</div>
<div id="app"></div>
<script>
try {{ if (localStorage.getItem('mc.demoVer') !== '4') {{ localStorage.setItem('mc.demoVer', '4'); localStorage.setItem('mc.demo.settings', JSON.stringify({{ configured: true, kids: [{{ id: 'a', name: 'ראם', age: 8, look: 'boy', skin: 0, hair: 0, hairStyle: 'short', color: '#7ec8e3', offset: 0 }}, {{ id: 'b', name: 'סער', age: 4, look: 'boy', skin: 0, hair: 1, hairStyle: 'curly', color: '#ffcf3f', offset: 0 }}] }})); }} }} catch (e) {{}}
</script>
<script type="module">
{js}
const TEMPS = [10, 13, 16, 19, 22, 25, 28, 31].map((t) => [t, t + '°']);
const RAINS = [[0, 'בלי'], [1, 'קל'], [2, 'חזק']];
const WINDS = [[0, 'רגילה'], [1, 'חזקה']];
const KID1 = {{ id: 'a', name: 'ראם', age: 8, look: 'boy', skin: 0, hair: 0, hairStyle: 'short', color: '#7ec8e3', offset: 0 }};
const KID2 = {{ id: 'b', name: 'סער', age: 4, look: 'boy', skin: 0, hair: 1, hairStyle: 'curly', color: '#ffcf3f', offset: 0 }};
const st = {{ mt: 2, mr: 0, at: 5, ar: 0, wd: 0 }};
function chips(id, list, key) {{
  const g = document.getElementById(id);
  list.forEach(([, label], i) => {{
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.id = id + '-' + i;
    b.addEventListener('click', (e) => {{ e.stopPropagation(); st[key] = i; apply(); }});
    g.appendChild(b);
  }});
}}
chips('g-mt', TEMPS, 'mt'); chips('g-mr', RAINS, 'mr'); chips('g-at', TEMPS, 'at'); chips('g-ar', RAINS, 'ar'); chips('g-wd', WINDS, 'wd');
// morning = until 11:00, afternoon = from 12:00; temperature eases between them over 11–13
function makeDay(mT, aT, mR, aR, windy) {{
  const hours = [];
  for (let h = 0; h < 24; h++) {{
    const k = h <= 10 ? 0 : h >= 13 ? 1 : (h - 10) / 3;
    const t = Math.round((mT + (aT - mT) * k) * 10) / 10;
    const r = h <= 11 ? mR : aR;
    hours.push({{
      hour: h, temp: t, feels: t,
      pop: r === 2 ? 95 : r === 1 ? 70 : 5,
      precip: r === 2 ? 3 : r === 1 ? 0.5 : 0,
      code: r === 2 ? 65 : r === 1 ? 61 : t >= 22 ? 0 : 2,
      wind: windy ? 42 : 10, gust: windy ? 70 : 18, uv: h >= 9 && h <= 15 ? (t >= 24 ? 8 : 3) : 1, day: h >= 6 && h < 18 ? 1 : 0,
    }});
  }}
  return hours;
}}
function apply() {{
  for (const id of ['mt', 'mr', 'at', 'ar', 'wd'])
    document.querySelectorAll('#g-' + id + ' button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === st[id])));
  const cur = window.__demo.kids;
  const kids = cur && cur.length ? cur : [KID1, KID2];
  const mT = TEMPS[st.mt][0], aT = TEMPS[st.at][0];
  const label = 'בוקר ' + mT + '° ' + RAINS[st.mr][1] + ' גשם · אחה״צ ' + aT + '° ' + RAINS[st.ar][1] + ' גשם';
  window.__demo.set('custom', 8, label, kids, 'none', makeDay(mT, aT, RAINS[st.mr][0], RAINS[st.ar][0], WINDS[st.wd][0]));
}}
apply();
</script>
'''
if out:
    open(out, 'w').write(html)
full = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + html + '\n</html>\n')
open(root + 'demo.html', 'w').write(full)

import { TEL_AVIV } from './weather.js';
import { SHIRT_COLORS, SKINS, HAIRS } from './art.js';
import { defaultRules, normalizeRules } from './outfit.js';

const KEY = 'mc.settings';

export const MAX_KIDS = 3;

export const newKid = (i = 0) => ({
  id: Math.random().toString(36).slice(2, 9),
  name: '',
  age: 5,
  look: i % 2 ? 'girl' : 'boy',
  hairStyle: i % 2 ? 'long' : 'short',
  skin: 0,
  hair: i % 2 ? 2 : 1,
  color: SHIRT_COLORS[i % SHIRT_COLORS.length],
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// The kid a brand-new install starts with: random but believable, saved on
// first load so it stays the same on this device until someone changes it.
export function randomKid() {
  const look = pick(['boy', 'girl']);
  return {
    ...newKid(0),
    age: 4 + Math.floor(Math.random() * 6), // 4–9
    look,
    hairStyle: look === 'girl' ? pick(['long', 'curly']) : pick(['short', 'short', 'curly']),
    skin: Math.floor(Math.random() * SKINS.length),
    hair: Math.floor(Math.random() * HAIRS.length),
    color: pick(SHIRT_COLORS),
  };
}

export const defaults = () => ({
  location: { mode: 'auto', ...TEL_AVIV },
  leaveHour: 8,
  returnHour: 17,
  switchHour: 17, // from this hour on, show tomorrow
  kids: [randomKid()],
  rules: defaultRules(),
});

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.kids)) {
      // there used to be four skin tones; the darkest is now the third
      const kids = s.kids.map((k) => ({ ...k, skin: Math.min(k.skin ?? 0, SKINS.length - 1) }));
      return { ...defaults(), ...s, kids, rules: normalizeRules(s.rules) };
    }
  } catch { /* ignore */ }
  // first launch: start straight away with a random kid, and keep it
  const fresh = defaults();
  save(fresh);
  return fresh;
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Words and numbers are shown for every kid (a parent or older sibling can read
// them; the pictures carry the meaning for kids who can't read yet).
export const isReader = () => true;

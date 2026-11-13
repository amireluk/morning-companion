import { TEL_AVIV } from './weather.js';
import { SHIRT_COLORS } from './art.js';
import { defaultRules, normalizeRules } from './outfit.js';

const KEY = 'mc.settings';

export const newKid = (i = 0) => ({
  id: Math.random().toString(36).slice(2, 9),
  name: '',
  age: 5,
  look: i % 2 ? 'girl' : 'boy',
  hairStyle: i % 2 ? 'long' : 'short',
  skin: 0,
  hair: i % 2 ? 2 : 1,
  color: SHIRT_COLORS[i % SHIRT_COLORS.length],
  offset: 0, // + runs warm, - runs cold (degrees)
});

export const defaults = () => ({
  location: { mode: 'auto', ...TEL_AVIV },
  leaveHour: 8,
  returnHour: 17,
  switchHour: 17, // from this hour on, show tomorrow
  nightStart: 21,
  nightEnd: 6,
  kids: [
    { ...newKid(0), name: 'ראם', age: 8, look: 'boy', hair: 0, hairStyle: 'short', color: '#7ec8e3' },
    { ...newKid(1), name: 'סער', age: 4, look: 'boy', hair: 1, hairStyle: 'curly', color: '#ffcf3f' },
  ],
  rules: defaultRules(),
  configured: false,
});

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.kids)) return { ...defaults(), ...s, rules: normalizeRules(s.rules) };
  } catch { /* ignore */ }
  return defaults();
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Words and numbers are shown for every kid (a parent or older sibling can read
// them; the pictures carry the meaning for kids who can't read yet).
export const isReader = () => true;

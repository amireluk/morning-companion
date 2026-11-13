import { TEL_AVIV } from './weather.js';
import { SHIRT_COLORS } from './art.js';

const KEY = 'mc.settings';

export const newKid = (i = 0) => ({
  id: Math.random().toString(36).slice(2, 9),
  name: '',
  age: 5,
  look: i % 2 ? 'girl' : 'boy',
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
    { ...newKid(0), name: 'ראם', age: 8, look: 'boy', hair: 1, color: '#7ec8e3' },
    { ...newKid(1), name: 'סער', age: 4, look: 'boy', hair: 2, color: '#ffcf3f' },
  ],
  configured: false,
});

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.kids)) return { ...defaults(), ...s };
  } catch { /* ignore */ }
  return defaults();
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Kids aged 7+ get numbers and words; younger kids see pictures only.
export const isReader = (kid) => (kid.age || 0) >= 7;

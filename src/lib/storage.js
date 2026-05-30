// Enige module die localStorage aanraakt. Maakt later wisselen naar IndexedDB/backend simpel.
const PREFIX = 'fau:';

const clone = (o) =>
  typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return clone(fallback);
    return JSON.parse(raw);
  } catch (e) {
    return clone(fallback);
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // quota of private mode: stil negeren
  }
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* ignore */
  }
}

export function exportData() {
  const out = {};
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => {
        out[k] = JSON.parse(localStorage.getItem(k));
      });
  } catch (e) {
    /* ignore */
  }
  return out;
}

export function importData(obj) {
  try {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (k.startsWith(PREFIX)) localStorage.setItem(k, JSON.stringify(v));
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Lokaal dagnummer (integer). Tijdzone-stabiel; handig voor due-data en streaks.
export function dayNumber(date = new Date()) {
  const d = new Date(date);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

export function isoDate(date = new Date()) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function todayNumber() {
  return dayNumber();
}

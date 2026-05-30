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

// ISO-achtige weeksleutel "JJJJ-Www" voor de weekbucket (leaderboard later).
export function weekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

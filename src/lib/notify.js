// Best-effort PWA-herinneringen. Echte achtergrond-scheduling kan de webstandaard niet
// garanderen, dus dit werkt vooral als de app (recent) open is/was.
const ICON = '/FAU/favicon.svg';

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return 'denied';
  }
}

export function canNotify() {
  return notificationsSupported() && Notification.permission === 'granted';
}

export function notify(title, body) {
  if (!canNotify()) return;
  try {
    new Notification(title, { body, icon: ICON });
  } catch (e) {
    /* ignore */
  }
}

// Toon een herinnering als er vandaag nog niet geoefend is en het na de ingestelde tijd is.
export function maybeRemind(profile, settings, today) {
  if (!settings?.reminderEnabled || !canNotify()) return;
  if (profile.today?.day === today && (profile.today.xp ?? 0) > 0) return;
  const [h, m] = (settings.reminderTime ?? '19:30').split(':').map(Number);
  const now = new Date();
  if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
    notify('Tijd om te oefenen 📚', 'Houd je streak in leven — doe een korte sessie Financial Auditing.');
  }
}

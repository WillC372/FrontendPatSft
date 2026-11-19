// Which alerts sound the alarm: an alteration of the pH that the person has not seen in this session, created
// in the last 15 minutes (an old unread one does not sound when the app is opened hours later). Pure, for the tests.
export const ALTERATION = "PH_ALTERATION";
export const FRESH_MS = 15 * 60 * 1000;

export function alarmsToSound(alerts, seen, now = Date.now()) {
  return (alerts || []).filter((a) => a && a.kind === ALTERATION && !a.read && !seen.has(a.id)
    && now - Date.parse(a.createdAt) <= FRESH_MS)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** What Aqua says: the title, then the message (it already says whether it is dangerous and what to do). */
export function alarmSpeech(title, message) {
  return `${title}. ${message}`.replace(/\.\s*\./g, ".");
}

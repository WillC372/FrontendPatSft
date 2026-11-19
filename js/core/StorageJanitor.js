// Cleans what the app saved in this browser and no longer needs: keys of old versions and the "tour seen" marks of
// accounts that have not signed in here for a long time. It runs once when the app opens and never touches other sites.

const KEEP = [/^aquasense\.theme$/, /^aquasense\.theme\.pending$/, /^aquasense\.motion$/, /^aquasense\.session$/, /^aquasense\.aqua\.tips$/, /^aquasense\.tour\.v1\.\d+$/,
  /^aquasense\.lang$/, /^aquasense\.lang\.pending$/, /^aquasense\.voice\.(name|rate)$/, /^aquasense\.help\.[a-z-]+$/];
const MAX_TOURS = 10;

/** Returns the keys it removed (for the tests). */
export function cleanStorage(storage = globalThis.localStorage) {
  const removed = [];
  try {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k?.startsWith("aquasense."));
    // Translations are kept only for the language in use (another language's copy is downloaded again if chosen).
    const dictionary = `aquasense.i18n.${storage.getItem("aquasense.lang") || "es"}`;
    for (const key of keys) {
      if (key !== dictionary && !KEEP.some((pattern) => pattern.test(key))) { storage.removeItem(key); removed.push(key); }
    }
    // Only the most recent "tour seen" marks are kept (they hold the date when they were saved, or "done").
    const tours = keys.filter((k) => /^aquasense\.tour\.v1\.\d+$/.test(k))
      .map((k) => [k, Number(storage.getItem(k)) || 0]).sort((a, b) => b[1] - a[1]);
    for (const [key] of tours.slice(MAX_TOURS)) { storage.removeItem(key); removed.push(key); }
  } catch { /* storage unavailable: nothing to clean */ }
  return removed;
}

// Service worker of Aqua Assistant AI: shows the notifications the server sends (alerts and reminders) even when the
// app is closed, and opens the app when one is tapped. It does not cache pages.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Aqua Assistant AI";
  // An alteration of the pH (alarm): the notice stays until it is touched, vibrates and makes the device's sound;
  // an open app also hears about it at once to sound its own alarm and let Aqua speak.
  const alarm = data.alarm === true;
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/assets/img/Icon192.png",
      badge: "/assets/img/Icon192.png",
      data: { url: data.url || "/" },
      tag: alarm ? "ph-alarm" : title,
      renotify: true,
      requireInteraction: alarm,
      silent: false,
      vibrate: alarm ? [400, 200, 400, 200, 800] : [200],
    }),
    alarm ? self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => windows.forEach((w) => w.postMessage({ type: "ph-alarm" }))) : null,
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus();
        return client.navigate(url).catch(() => undefined);
      }
    }
    return self.clients.openWindow(url);
  })());
});

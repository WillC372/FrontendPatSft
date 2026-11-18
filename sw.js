// Service worker of Aqua Assistant AI: shows the notifications the server sends (alerts and reminders) even when the
// app is closed, and opens the app when one is tapped. It does not cache pages.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Aqua Assistant AI";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/assets/img/Icon192.png",
    badge: "/assets/img/Icon192.png",
    data: { url: data.url || "/" },
    tag: title,
    renotify: true,
  }));
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

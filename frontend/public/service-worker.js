self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Town Ruins";
  const options = {
    body: payload.body || "",
    icon: "/logo192.png",
    badge: "/logo192.png",
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const rootUrl = self.location.origin;
      const focusedClient = clients.find((client) => client.url.startsWith(rootUrl));

      if (focusedClient) {
        return focusedClient.focus();
      }

      return self.clients.openWindow("/");
    })
  );
});
